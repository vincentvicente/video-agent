#!/usr/bin/env node

/**
 * Process video from URL (for server background processing)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { config } from 'dotenv';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VIDEO_URL = process.argv[2];
const OUTPUT_DIR = process.argv[3]; // Optional: custom output directory for per-user isolation

if (!VIDEO_URL) {
  console.error('Usage: node process-video-from-url.js <video_url> [output_dir]');
  process.exit(1);
}

// Extract video ID
const videoIdMatch = VIDEO_URL.match(/[?&]v=([^&]+)/);
if (!videoIdMatch) {
  console.error('Invalid YouTube URL');
  process.exit(1);
}

const VIDEO_ID = videoIdMatch[1];

async function processVideo() {
  try {
    const baseDir = OUTPUT_DIR || join(__dirname, 'data');
    const videoDir = join(baseDir, 'videos');
    const audioDir = join(baseDir, 'audio');
    const transcriptDir = join(baseDir, 'transcripts');
    const embeddingsDir = join(baseDir, 'embeddings');

    [videoDir, audioDir, transcriptDir, embeddingsDir].forEach(dir => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });

    const videoPath = join(videoDir, `${VIDEO_ID}.mp4`);
    const audioPath = join(audioDir, `${VIDEO_ID}.wav`);

    console.log('[PROGRESS] 10: Downloading video...');

    // Download video
    await execAsync(`yt-dlp -f "best[height<=720]" -o "${videoPath}" "${VIDEO_URL}" 2>&1`);

    console.log('[PROGRESS] 30: Extracting audio...');

    // Extract audio
    await execAsync(`ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "${audioPath}" 2>&1`);

    console.log('[PROGRESS] 50: Transcribing with local Whisper...');

    // Transcribe
    const whisperScript = join(__dirname, 'run-whisper.sh');
    const modelSize = process.env.WHISPER_MODEL_SIZE || 'base';

    const { stdout: whisperOutput } = await execAsync(
      `"${whisperScript}" "${audioPath}" "null" "${modelSize}" "vtt"`,
      { timeout: 1800000 }
    );

    const outputLines = whisperOutput.trim().split('\n');
    const jsonLine = outputLines[outputLines.length - 1];
    const result = JSON.parse(jsonLine);

    if (!result.success) {
      throw new Error(result.error || 'Transcription failed');
    }

    console.log('[PROGRESS] 70: Chunking text...');

    // Read transcript
    const transcriptPath = result.transcript_path;
    const transcriptText = readFileSync(transcriptPath, 'utf-8');

    // Chunk text
    const chunks = chunkText(transcriptText, 300);

    console.log('[PROGRESS] 80: Generating embeddings...');

    // Generate embeddings
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunks[i].text,
      });

      embeddings.push({
        id: i,
        vector: response.data[0].embedding,
        text: chunks[i].text,
        metadata: {
          chunk_index: i,
          tokens: chunks[i].tokens,
          video_id: VIDEO_ID
        }
      });
    }

    console.log('[PROGRESS] 95: Saving to database...');

    // Save vector database
    const dbPath = join(embeddingsDir, `${VIDEO_ID}.json`);
    const vectorDb = {
      name: VIDEO_ID,
      dimension: 1536,
      video_url: VIDEO_URL,
      vectors: embeddings,
      metadata: {
        created_at: Date.now(),
        video_id: VIDEO_ID,
        transcript_path: transcriptPath,
        chunk_count: chunks.length,
        language: result.language,
        duration: result.duration
      }
    };

    writeFileSync(dbPath, JSON.stringify(vectorDb, null, 2), 'utf-8');

    console.log('[PROGRESS] 100: Complete!');
    console.log(JSON.stringify({ success: true, videoId: VIDEO_ID }));

  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  }
}

function chunkText(text, maxTokens = 300) {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = [];
  let currentTokens = 0;

  paragraphs.forEach(paragraph => {
    if (!paragraph.trim()) return;

    const tokens = paragraph.split(/\s+/).length;

    if (currentTokens + tokens > maxTokens && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.join('\n\n'),
        tokens: currentTokens
      });
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(paragraph.trim());
    currentTokens += tokens;
  });

  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join('\n\n'),
      tokens: currentTokens
    });
  }

  return chunks;
}

processVideo();
