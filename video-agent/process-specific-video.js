#!/usr/bin/env node

/**
 * Process Specific YouTube Video
 * URL: https://www.youtube.com/watch?v=_VaEjGnHgOI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { config } from 'dotenv';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VIDEO_URL = 'https://www.youtube.com/watch?v=_VaEjGnHgOI';
const VIDEO_ID = '_VaEjGnHgOI';

console.log('🎬 Processing YouTube Video\n');
console.log('='.repeat(80));
console.log(`\n📺 Video: ${VIDEO_URL}\n`);
console.log('='.repeat(80));

async function processVideo() {
  const startTime = Date.now();
  const costs = { transcription: 0, embeddings: 0, total: 0 };

  try {
    const videoDir = join(__dirname, 'data/videos');
    const audioDir = join(__dirname, 'data/audio');
    const transcriptDir = join(__dirname, 'data/transcripts');
    const embeddingsDir = join(__dirname, 'data/embeddings');

    // Ensure directories exist
    [videoDir, audioDir, transcriptDir, embeddingsDir].forEach(dir => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });

    const videoName = VIDEO_ID;
    const videoPath = join(videoDir, `${videoName}.mp4`);
    const audioPath = join(audioDir, `${videoName}.wav`);

    // Step 1: Download video
    console.log('\n📥 Step 1/6: Downloading video...');
    console.log('   This may take a few minutes depending on video length and connection speed...\n');

    try {
      // Try yt-dlp first (more reliable)
      const downloadCmd = `yt-dlp -f "best[height<=720]" -o "${videoPath}" "${VIDEO_URL}" 2>&1`;
      console.log('   Using yt-dlp...');
      const { stdout: dlOutput, stderr: dlError } = await execAsync(downloadCmd, { timeout: 300000 });

      if (dlError) {
        console.log('   Download output:', dlError.substring(0, 500));
      }

      console.log(`✅ Video downloaded: ${videoPath}`);

      // Get file size
      const fs = await import('fs/promises');
      const stats = await fs.stat(videoPath);
      console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    } catch (downloadError) {
      if (downloadError.message.includes('yt-dlp')) {
        console.log('\n⚠️  yt-dlp not found. Installing...');
        console.log('   Please wait, this is a one-time setup...\n');

        try {
          await execAsync('brew install yt-dlp', { timeout: 300000 });
          console.log('✅ yt-dlp installed successfully');
          console.log('   Retrying download...\n');

          const retryCmd = `yt-dlp -f "best[height<=720]" -o "${videoPath}" "${VIDEO_URL}" 2>&1`;
          await execAsync(retryCmd, { timeout: 300000 });
          console.log(`✅ Video downloaded: ${videoPath}`);

        } catch (installError) {
          throw new Error('Failed to install yt-dlp. Please install manually: brew install yt-dlp');
        }
      } else {
        throw downloadError;
      }
    }

    // Step 2: Extract audio
    console.log('\n🎵 Step 2/6: Extracting audio from video...');
    console.log('   Converting to 16kHz mono WAV (optimal for Whisper)...\n');

    const extractCmd = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "${audioPath}" 2>&1`;
    const { stderr: ffmpegOutput } = await execAsync(extractCmd, { timeout: 300000 });

    console.log(`✅ Audio extracted: ${audioPath}`);

    const fs = await import('fs/promises');
    const audioStats = await fs.stat(audioPath);
    console.log(`   Audio size: ${(audioStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Step 3: Transcribe with local Whisper
    console.log('\n🎤 Step 3/6: Transcribing with Local Whisper...');
    console.log('   Model: base');
    console.log('   This may take several minutes depending on audio length...');
    console.log('   (Rule of thumb: ~10% of audio duration for base model)\n');

    const whisperScript = join(__dirname, 'run-whisper.sh');
    const modelSize = process.env.WHISPER_MODEL_SIZE || 'base';
    const format = 'vtt'; // VTT format with timestamps

    const transcribeCmd = `"${whisperScript}" "${audioPath}" "null" "${modelSize}" "${format}"`;
    console.log('   Starting transcription...');

    const transcribeStart = Date.now();
    const { stdout: whisperOutput, stderr: whisperLog } = await execAsync(transcribeCmd, { timeout: 1800000 }); // 30 min timeout

    if (whisperLog) {
      // Show last few lines of Whisper output
      const logLines = whisperLog.split('\n').filter(l => l.trim());
      const progressLine = logLines.find(l => l.includes('%|')) || logLines[logLines.length - 1];
      console.log('   Whisper process:', progressLine);
    }

    // Parse JSON from last line of stdout (first lines might be progress output)
    const outputLines = whisperOutput.trim().split('\n');
    const jsonLine = outputLines[outputLines.length - 1];
    const result = JSON.parse(jsonLine);

    if (!result.success) {
      throw new Error(`Transcription failed: ${result.error}`);
    }

    const transcribeTime = (Date.now() - transcribeStart) / 1000;
    const transcriptPath = result.transcript_path;

    console.log(`✅ Transcription complete!`);
    console.log(`   Output: ${transcriptPath}`);
    console.log(`   Language: ${result.language}`);
    console.log(`   Duration: ${result.duration?.toFixed(1)}s`);
    console.log(`   Segments: ${result.segments_count}`);
    console.log(`   Model: ${result.model_used}`);
    console.log(`   Time taken: ${transcribeTime.toFixed(1)}s`);
    console.log(`   Cost: $0.00 (FREE - Local Whisper!) ⭐`);

    // Step 4: Show transcript preview
    console.log('\n📄 Step 4/6: Transcript Preview');
    const transcriptText = readFileSync(transcriptPath, 'utf-8');
    const preview = transcriptText.substring(0, 500);
    console.log(`\n${preview}${transcriptText.length > 500 ? '...' : ''}\n`);
    console.log(`   Full transcript: ${transcriptPath}`);
    console.log(`   Total length: ${transcriptText.length} characters`);

    // Step 5: Chunk text
    console.log('\n✂️  Step 5/6: Chunking text for embeddings...');
    const chunks = chunkText(transcriptText, 300);
    console.log(`✅ Created ${chunks.length} semantic chunks`);
    console.log(`   Chunk size: ~300 tokens`);
    console.log(`   Total tokens: ~${chunks.reduce((sum, c) => sum + c.tokens, 0)}`);

    // Step 6: Generate embeddings
    console.log('\n🧬 Step 6/6: Generating embeddings with OpenAI...');
    console.log(`   Processing ${chunks.length} chunks...`);
    console.log('   This may take 1-2 minutes...\n');

    const embeddings = [];
    let totalTokens = 0;
    const batchSize = 5;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(chunks.length / batchSize);

      process.stdout.write(`   Batch ${batchNum}/${totalBatches}: Processing chunks ${i + 1}-${Math.min(i + batchSize, chunks.length)}...`);

      for (const chunk of batch) {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk.text,
        });

        embeddings.push({
          id: embeddings.length,
          vector: response.data[0].embedding,
          text: chunk.text,
          metadata: {
            chunk_index: embeddings.length,
            tokens: chunk.tokens,
            video_id: VIDEO_ID
          }
        });

        totalTokens += response.usage.total_tokens;
      }

      console.log(' Done!');
    }

    const embeddingCost = (totalTokens / 1_000_000) * 0.02;
    costs.embeddings = embeddingCost;

    console.log(`\n✅ Generated ${embeddings.length} embeddings`);
    console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`   Cost: $${embeddingCost.toFixed(6)}`);

    // Save to vector database
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

    const fsPromises = await import('fs/promises');
    await fsPromises.writeFile(dbPath, JSON.stringify(vectorDb, null, 2), 'utf-8');
    console.log(`   Saved to: ${dbPath}`);

    // Test semantic search
    console.log('\n🔍 Testing Semantic Search...\n');
    const testQueries = [
      "What is this video about?",
      "What are the main topics discussed?",
      "Can you summarize the key points?"
    ];

    for (const query of testQueries) {
      console.log(`   Query: "${query}"`);

      const queryResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });

      const queryVector = queryResponse.data[0].embedding;
      costs.embeddings += (queryResponse.usage.total_tokens / 1_000_000) * 0.02;

      const similarities = embeddings.map(emb => ({
        id: emb.id,
        similarity: cosineSimilarity(queryVector, emb.vector),
        text: emb.text
      })).sort((a, b) => b.similarity - a.similarity);

      const topResult = similarities[0];
      console.log(`   → Match (${(topResult.similarity * 100).toFixed(1)}% similar):`);
      console.log(`     "${topResult.text.substring(0, 150).replace(/\n/g, ' ')}..."\n`);
    }

    // Final summary
    costs.total = costs.transcription + costs.embeddings;
    const totalTime = (Date.now() - startTime) / 1000;

    console.log('='.repeat(80));
    console.log('\n🎉 VIDEO PROCESSING COMPLETE!\n');
    console.log('='.repeat(80));

    console.log('\n📊 Summary:');
    console.log(`   Video: ${VIDEO_URL}`);
    console.log(`   Language: ${result.language}`);
    console.log(`   Duration: ${result.duration?.toFixed(1)}s`);
    console.log(`   Transcript: ${transcriptText.length} characters`);
    console.log(`   Chunks: ${chunks.length}`);
    console.log(`   Embeddings: ${embeddings.length}`);

    console.log('\n💰 Costs:');
    console.log(`   Transcription: $${costs.transcription.toFixed(6)} (FREE - Local Whisper)`);
    console.log(`   Embeddings:    $${costs.embeddings.toFixed(6)} (OpenAI API)`);
    console.log(`   ────────────────────────────────────`);
    console.log(`   Total:         $${costs.total.toFixed(6)}`);

    console.log('\n⏱️  Performance:');
    console.log(`   Total time: ${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`);
    console.log(`   Transcription: ${transcribeTime.toFixed(1)}s`);

    console.log('\n📁 Output Files:');
    console.log(`   Video:      ${videoPath}`);
    console.log(`   Audio:      ${audioPath}`);
    console.log(`   Transcript: ${transcriptPath}`);
    console.log(`   Database:   ${dbPath}`);

    console.log('\n🎯 Next Steps:');
    console.log('   • View transcript: cat "' + transcriptPath + '"');
    console.log('   • Search content: Use vector database for semantic queries');
    console.log('   • Build Q&A: Ask questions about video content');
    console.log('   • Process more videos: Repeat for your video library\n');

  } catch (error) {
    console.log('\n❌ Processing failed');
    console.log(`   Error: ${error.message}`);
    console.log(`\n   Stack: ${error.stack}`);

    if (error.message.includes('yt-dlp') || error.message.includes('youtube-dl')) {
      console.log('\n💡 Solution: Install yt-dlp');
      console.log('   brew install yt-dlp');
    }

    if (error.message.includes('ffmpeg')) {
      console.log('\n💡 Solution: Install ffmpeg');
      console.log('   brew install ffmpeg');
    }

    process.exit(1);
  }
}

function chunkText(text, maxTokens = 300) {
  // Split by double newlines (paragraphs)
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

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

processVideo();
