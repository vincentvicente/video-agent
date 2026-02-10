#!/usr/bin/env node

/**
 * Enhanced Knowledge Base UI Server
 * With automatic video processing
 */

import express from 'express';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';
import { config } from 'dotenv';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '../.env') });

const app = express();
const PORT = 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Store for active processing jobs
const processingJobs = new Map();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Current video cache
let currentVideoId = null;
let vectorDbCache = null;
let transcriptCache = null;

// Helper: Load video knowledge base
function loadKnowledgeBase(videoId) {
  const dbPath = join(__dirname, '../data/embeddings', `${videoId}.json`);
  const transcriptPath = join(__dirname, '../data/transcripts', `${videoId}.vtt`);

  if (!existsSync(dbPath) || !existsSync(transcriptPath)) {
    return null;
  }

  return {
    vectorDb: JSON.parse(readFileSync(dbPath, 'utf-8')),
    transcript: readFileSync(transcriptPath, 'utf-8'),
    videoId
  };
}

// API: List available videos
app.get('/api/videos', (req, res) => {
  try {
    const embeddingsDir = join(__dirname, '../data/embeddings');

    if (!existsSync(embeddingsDir)) {
      return res.json([]);
    }

    const files = readdirSync(embeddingsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const videoId = f.replace('.json', '');
        const dbPath = join(embeddingsDir, f);
        const db = JSON.parse(readFileSync(dbPath, 'utf-8'));

        return {
          id: videoId,
          url: db.video_url,
          language: db.metadata.language,
          duration: db.metadata.duration,
          created_at: db.metadata.created_at,
          chunk_count: db.metadata.chunk_count
        };
      })
      .sort((a, b) => b.created_at - a.created_at);

    res.json(files);
  } catch (error) {
    console.error('List videos error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Set current video
app.post('/api/set-video', (req, res) => {
  try {
    const { videoId } = req.body;

    const kb = loadKnowledgeBase(videoId);
    if (!kb) {
      return res.status(404).json({ error: 'Video not found' });
    }

    currentVideoId = videoId;
    vectorDbCache = kb.vectorDb;
    transcriptCache = kb.transcript;

    res.json({ success: true, videoId });
  } catch (error) {
    console.error('Set video error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Process new video
app.post('/api/process-video', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Extract video ID from URL
    const videoIdMatch = url.match(/[?&]v=([^&]+)/);
    if (!videoIdMatch) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const videoId = videoIdMatch[1];

    // Check if already processing
    if (processingJobs.has(videoId)) {
      return res.json({
        videoId,
        status: 'processing',
        message: 'Video is already being processed'
      });
    }

    // Check if already exists
    const existing = loadKnowledgeBase(videoId);
    if (existing) {
      currentVideoId = videoId;
      vectorDbCache = existing.vectorDb;
      transcriptCache = existing.transcript;
      return res.json({
        videoId,
        status: 'exists',
        message: 'Video already in knowledge base'
      });
    }

    // Start processing
    processingJobs.set(videoId, {
      status: 'started',
      progress: 0,
      message: '开始处理...',
      startTime: Date.now()
    });

    res.json({
      videoId,
      status: 'started',
      message: 'Processing started'
    });

    // Process in background
    processVideoAsync(url, videoId);

  } catch (error) {
    console.error('Process video error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get processing status
app.get('/api/process-status/:videoId', (req, res) => {
  const { videoId } = req.params;
  const job = processingJobs.get(videoId);

  if (!job) {
    // Check if video exists
    const kb = loadKnowledgeBase(videoId);
    if (kb) {
      return res.json({ status: 'completed', progress: 100 });
    }
    return res.json({ status: 'not_found', progress: 0 });
  }

  res.json(job);
});

// Background video processing
async function processVideoAsync(url, videoId) {
  const updateProgress = (progress, message, status = 'processing') => {
    processingJobs.set(videoId, {
      status,
      progress,
      message,
      startTime: processingJobs.get(videoId).startTime
    });
  };

  try {
    const scriptPath = join(__dirname, '../process-video-from-url.js');

    updateProgress(10, '下载视频中...');

    // Run processing script
    const { stdout, stderr } = await execAsync(
      `node "${scriptPath}" "${url}"`,
      {
        timeout: 1800000, // 30 minutes
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }
    );

    if (stderr && stderr.includes('Error')) {
      throw new Error(stderr);
    }

    updateProgress(100, '处理完成！', 'completed');

    // Load the processed video
    const kb = loadKnowledgeBase(videoId);
    if (kb) {
      currentVideoId = videoId;
      vectorDbCache = kb.vectorDb;
      transcriptCache = kb.transcript;
    }

    // Clean up after 1 minute
    setTimeout(() => {
      processingJobs.delete(videoId);
    }, 60000);

  } catch (error) {
    console.error('Background processing error:', error);
    updateProgress(0, `处理失败: ${error.message}`, 'failed');
  }
}

// API: Get video info
app.get('/api/video-info', (req, res) => {
  if (!vectorDbCache) {
    return res.status(404).json({ error: 'No video loaded' });
  }

  res.json({
    id: vectorDbCache.name,
    url: vectorDbCache.video_url,
    language: vectorDbCache.metadata.language,
    duration: vectorDbCache.metadata.duration,
    created_at: vectorDbCache.metadata.created_at,
    chunk_count: vectorDbCache.metadata.chunk_count,
    vector_count: vectorDbCache.vectors.length,
    transcript_length: transcriptCache.length
  });
});

// API: Get transcript
app.get('/api/transcript', (req, res) => {
  if (!transcriptCache) {
    return res.status(404).json({ error: 'No video loaded' });
  }

  const lines = transcriptCache.split('\n');
  const segments = [];
  let currentSegment = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('-->')) {
      const [start, end] = line.split('-->').map(t => t.trim());
      currentSegment = { start, end, text: '' };
    } else if (line && !line.startsWith('WEBVTT') && !line.match(/^\d+$/)) {
      if (currentSegment) {
        currentSegment.text += (currentSegment.text ? ' ' : '') + line;
      }
    } else if (currentSegment && currentSegment.text) {
      segments.push(currentSegment);
      currentSegment = null;
    }
  }

  res.json(segments);
});

// API: Search
app.post('/api/search', async (req, res) => {
  try {
    if (!vectorDbCache) {
      return res.status(404).json({ error: 'No video loaded' });
    }

    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const queryResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryVector = queryResponse.data[0].embedding;

    const similarities = vectorDbCache.vectors.map(emb => ({
      id: emb.id,
      similarity: cosineSimilarity(queryVector, emb.vector),
      text: emb.text,
      metadata: emb.metadata
    })).sort((a, b) => b.similarity - a.similarity);

    const results = similarities.slice(0, 5).map(result => {
      const timestampMatch = result.text.match(/(\d{2}:\d{2}:\d{2})\.\d{3}/);
      return {
        similarity: result.similarity,
        text: result.text.replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '').replace(/\n+/g, ' ').trim(),
        timestamp: timestampMatch ? timestampMatch[1] : null
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Ask question
app.post('/api/ask', async (req, res) => {
  try {
    if (!vectorDbCache) {
      return res.status(404).json({ error: 'No video loaded' });
    }

    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const queryResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    });

    const queryVector = queryResponse.data[0].embedding;

    const similarities = vectorDbCache.vectors.map(emb => ({
      similarity: cosineSimilarity(queryVector, emb.vector),
      text: emb.text
    })).sort((a, b) => b.similarity - a.similarity);

    const context = similarities.slice(0, 3).map(s => s.text).join('\n\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '你是一个视频内容助手。基于提供的视频转录内容，准确回答用户的问题。如果内容中没有相关信息，请明确说明。回答要简洁准确。'
        },
        {
          role: 'user',
          content: `视频转录内容：\n\n${context}\n\n问题：${question}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    res.json({
      answer: completion.choices[0].message.content,
      sources: similarities.slice(0, 3).map(s => ({
        similarity: s.similarity,
        text: s.text.substring(0, 200)
      }))
    });
  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// Initialize with first available video
const embeddingsDir = join(__dirname, '../data/embeddings');
if (existsSync(embeddingsDir)) {
  const files = readdirSync(embeddingsDir).filter(f => f.endsWith('.json'));
  if (files.length > 0) {
    const firstVideoId = files[0].replace('.json', '');
    const kb = loadKnowledgeBase(firstVideoId);
    if (kb) {
      currentVideoId = firstVideoId;
      vectorDbCache = kb.vectorDb;
      transcriptCache = kb.transcript;
    }
  }
}

app.listen(PORT, () => {
  console.log('\n🚀 Enhanced Knowledge Base UI Server Started!\n');
  console.log('='.repeat(60));
  console.log(`\n🌐 UI: http://localhost:${PORT}`);
  console.log(`📊 Current Video: ${currentVideoId || 'None'}`);
  console.log(`✨ New Feature: Automatic video processing from URL!`);
  console.log('\n='.repeat(60));
  console.log('\n💡 Open http://localhost:3000 in your browser!\n');
});
