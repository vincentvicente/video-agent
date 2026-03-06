#!/usr/bin/env node

/**
 * Process local video/audio file (for server background processing)
 *
 * Usage: node process-local-file.js <filePath> <outputDir> <fileId>
 *
 * Video files: ffmpeg extract audio -> Whisper -> chunk -> embed
 * Audio files: Whisper directly -> chunk -> embed
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { config } from 'dotenv';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FILE_PATH = process.argv[2];
const OUTPUT_DIR = process.argv[3];
const FILE_ID = process.argv[4];

if (!FILE_PATH || !OUTPUT_DIR || !FILE_ID) {
  console.error('Usage: node process-local-file.js <filePath> <outputDir> <fileId>');
  process.exit(1);
}

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.flac', '.ogg'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];

function isAudioFile(filePath) {
  return AUDIO_EXTENSIONS.includes(extname(filePath).toLowerCase());
}

function isVideoFile(filePath) {
  return VIDEO_EXTENSIONS.includes(extname(filePath).toLowerCase());
}

async function processLocalFile() {
  try {
    const audioDir = join(OUTPUT_DIR, 'audio');
    const transcriptDir = join(OUTPUT_DIR, 'transcripts');
    const embeddingsDir = join(OUTPUT_DIR, 'embeddings');

    [audioDir, transcriptDir, embeddingsDir].forEach(dir => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });

    const audioPath = join(audioDir, `${FILE_ID}.wav`);
    const ext = extname(FILE_PATH).toLowerCase();

    if (isVideoFile(FILE_PATH)) {
      // Video file: extract audio with ffmpeg
      console.log('[PROGRESS] 10: Uploading complete...');
      console.log('[PROGRESS] 30: Extracting audio...');

      await execFileAsync('ffmpeg', [
        '-i', FILE_PATH,
        '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', '-y',
        audioPath
      ], { timeout: 600000 });
    } else if (isAudioFile(FILE_PATH)) {
      // Audio file: convert to WAV if needed
      console.log('[PROGRESS] 10: Uploading complete...');
      console.log('[PROGRESS] 30: Preparing audio...');

      if (ext === '.wav') {
        copyFileSync(FILE_PATH, audioPath);
      } else {
        await execFileAsync('ffmpeg', [
          '-i', FILE_PATH,
          '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', '-y',
          audioPath
        ], { timeout: 600000 });
      }
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    console.log('[PROGRESS] 50: Transcribing with local Whisper...');

    // Transcribe with Whisper
    const whisperScript = join(__dirname, 'run-whisper.sh');
    const modelSize = process.env.WHISPER_MODEL_SIZE || 'base';

    const { stdout: whisperOutput } = await execFileAsync(
      whisperScript,
      [audioPath, 'null', modelSize, 'vtt'],
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
          video_id: FILE_ID
        }
      });
    }

    console.log('[PROGRESS] 95: Saving to database...');

    // Save vector database
    const dbPath = join(embeddingsDir, `${FILE_ID}.json`);
    const vectorDb = {
      name: FILE_ID,
      dimension: 1536,
      video_url: `upload://${FILE_ID}`,
      vectors: embeddings,
      metadata: {
        created_at: Date.now(),
        video_id: FILE_ID,
        transcript_path: transcriptPath,
        chunk_count: chunks.length,
        language: result.language,
        duration: result.duration,
        source: 'upload'
      }
    };

    writeFileSync(dbPath, JSON.stringify(vectorDb, null, 2), 'utf-8');

    console.log('[PROGRESS] 100: Complete!');
    console.log(JSON.stringify({ success: true, videoId: FILE_ID }));

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

processLocalFile();
