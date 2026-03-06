#!/usr/bin/env node

/**
 * Video RAG Agent - Multi-user SaaS Server
 */

import express from 'express';
import { readFileSync, existsSync, readdirSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { config } from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { authenticateToken } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import { authLimiter, apiLimiter, processLimiter } from './middleware/rateLimiter.js';
import { validateVideoUrl, validateSearchQuery, validateFileUpload } from './middleware/validation.js';
import pool from './db.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

config({ path: join(PROJECT_ROOT, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Store for active processing jobs (keyed by "userId:videoId")
const processingJobs = new Map();

// LRU cache for knowledge bases (max 10)
const kbCache = new Map();
const KB_CACHE_MAX = 10;

function getCachedKb(userId, videoId) {
  const key = `${userId}:${videoId}`;
  const kb = kbCache.get(key);
  if (kb) {
    // Move to end (most recently used)
    kbCache.delete(key);
    kbCache.set(key, kb);
  }
  return kb || null;
}

function setCachedKb(userId, videoId, kb) {
  const key = `${userId}:${videoId}`;
  if (kbCache.size >= KB_CACHE_MAX) {
    // Delete oldest (first) entry
    const firstKey = kbCache.keys().next().value;
    kbCache.delete(firstKey);
  }
  kbCache.set(key, kb);
}

// Middleware
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Public routes
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'landing.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(join(__dirname, 'login.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});


// Serve only specific static assets (CSS, fonts, etc.) - not source files
app.use('/css', express.static(join(__dirname, 'css')));

// Auth routes (public)
app.use('/api/auth', authLimiter, authRoutes);

// All /api/* routes below require auth
app.use('/api', apiLimiter, authenticateToken);

// Helper: Get user data directory
function getUserDataDir(userId) {
  const dir = join(PROJECT_ROOT, 'data', 'users', String(userId));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Multer config for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = join(getUserDataDir(req.user.id), 'uploads');
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname);
      cb(null, randomUUID() + ext);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed = /^(video|audio)\//;
    cb(null, allowed.test(file.mimetype));
  }
});

// Helper: Load video knowledge base for a user
function loadKnowledgeBase(userId, videoId) {
  // Check cache first
  const cached = getCachedKb(userId, videoId);
  if (cached) return cached;

  const userDir = getUserDataDir(userId);
  const dbPath = join(userDir, 'embeddings', `${videoId}.json`);
  const transcriptVtt = join(userDir, 'transcripts', `${videoId}.vtt`);
  const transcriptTxt = join(userDir, 'transcripts', `${videoId}.txt`);
  const transcriptPath = existsSync(transcriptVtt) ? transcriptVtt : transcriptTxt;

  if (!existsSync(dbPath) || !existsSync(transcriptPath)) {
    return null;
  }

  const kb = {
    vectorDb: JSON.parse(readFileSync(dbPath, 'utf-8')),
    transcript: readFileSync(transcriptPath, 'utf-8'),
    videoId
  };

  setCachedKb(userId, videoId, kb);
  return kb;
}

// Helper: Parse VTT transcript into segments
function parseTranscript(transcriptText) {
  const lines = transcriptText.split('\n');
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

  if (currentSegment && currentSegment.text) {
    segments.push(currentSegment);
  }

  return segments;
}

// API: List user's videos
app.get('/api/videos', async (req, res) => {
  try {
    const userId = req.user.id;
    const userDir = getUserDataDir(userId);
    const embeddingsDir = join(userDir, 'embeddings');

    if (!existsSync(embeddingsDir)) {
      return res.json([]);
    }

    const files = readdirSync(embeddingsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const videoId = f.replace('.json', '');
        const dbPath = join(embeddingsDir, f);
        try {
          const db = JSON.parse(readFileSync(dbPath, 'utf-8'));
          return {
            id: videoId,
            url: db.video_url,
            title: db.metadata.title || videoId,
            language: db.metadata.language,
            duration: db.metadata.duration,
            created_at: db.metadata.created_at,
            chunk_count: db.metadata.chunk_count
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.created_at - a.created_at);

    res.json(files);
  } catch (error) {
    console.error('List videos error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Process new video
app.post('/api/process-video', processLimiter, validateVideoUrl, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url } = req.body;

    // Free tier limit: max 3 videos
    const { rows } = await pool.query('SELECT COUNT(*) FROM videos WHERE user_id = $1', [userId]);
    if (parseInt(rows[0].count) >= 3) {
      return res.status(403).json({ error: 'Free tier limit: maximum 3 videos. Upgrade for more.' });
    }

    // Extract video ID from URL
    const videoIdMatch = url.match(/[?&]v=([^&]+)/);
    if (!videoIdMatch) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const videoId = videoIdMatch[1];
    const jobKey = `${userId}:${videoId}`;

    // Check if already processing
    if (processingJobs.has(jobKey)) {
      return res.json({
        videoId,
        status: 'processing',
        message: 'Video is already being processed'
      });
    }

    // Check if already exists for this user
    const existing = loadKnowledgeBase(userId, videoId);
    if (existing) {
      return res.json({
        videoId,
        status: 'exists',
        message: 'Video already in knowledge base'
      });
    }

    // Record in database
    await pool.query(
      `INSERT INTO videos (user_id, video_id, url, status)
       VALUES ($1, $2, $3, 'processing')
       ON CONFLICT (user_id, video_id) DO UPDATE SET status = 'processing'`,
      [userId, videoId, url]
    );

    // Start processing
    processingJobs.set(jobKey, {
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
    processVideoAsync(url, videoId, userId);

  } catch (error) {
    console.error('Process video error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Upload and process local file
app.post('/api/upload-video', processLimiter, upload.single('file'), validateFileUpload, async (req, res) => {
  try {
    const userId = req.user.id;

    // Free tier limit: max 3 videos
    const { rows } = await pool.query('SELECT COUNT(*) FROM videos WHERE user_id = $1', [userId]);
    if (parseInt(rows[0].count) >= 3) {
      // Clean up uploaded file
      try { unlinkSync(req.file.path); } catch {}
      return res.status(403).json({ error: 'Free tier limit: maximum 3 videos. Upgrade for more.' });
    }

    // Generate fileId (first 11 chars of UUID to match YouTube ID length)
    const fileId = randomUUID().replace(/-/g, '').substring(0, 11);
    const jobKey = `${userId}:${fileId}`;

    // Check if already processing
    if (processingJobs.has(jobKey)) {
      return res.json({
        videoId: fileId,
        status: 'processing',
        message: 'File is already being processed'
      });
    }

    // Record in database
    await pool.query(
      `INSERT INTO videos (user_id, video_id, url, title, status, source, original_filename)
       VALUES ($1, $2, $3, $4, 'processing', 'upload', $5)
       ON CONFLICT (user_id, video_id) DO UPDATE SET status = 'processing'`,
      [userId, fileId, `upload://${req.file.filename}`, req.file.originalname, req.file.originalname]
    );

    // Start processing
    processingJobs.set(jobKey, {
      status: 'started',
      progress: 0,
      message: 'Starting...',
      startTime: Date.now()
    });

    res.json({
      videoId: fileId,
      status: 'started',
      message: 'Processing started'
    });

    // Process in background
    processLocalFileAsync(req.file.path, fileId, userId, req.file.originalname);

  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Background local file processing
async function processLocalFileAsync(filePath, fileId, userId, originalFilename) {
  const jobKey = `${userId}:${fileId}`;

  const updateProgress = (progress, message, status = 'processing') => {
    processingJobs.set(jobKey, {
      status,
      progress,
      message,
      startTime: processingJobs.get(jobKey).startTime
    });
  };

  try {
    const userDataDir = getUserDataDir(userId);
    const isVideo = /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(filePath);

    updateProgress(10, 'Processing uploaded file...');

    // Step 1: Process local file (audio extraction + Whisper + embeddings)
    const scriptPath = join(PROJECT_ROOT, 'process-local-file.js');

    const { stdout, stderr } = await execFileAsync(
      'node',
      [scriptPath, filePath, userDataDir, fileId],
      {
        timeout: 1800000,
        maxBuffer: 10 * 1024 * 1024
      }
    );

    // Parse progress from stdout
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const match = line.match(/\[PROGRESS\] (\d+): (.+)/);
      if (match) {
        const prog = parseInt(match[1]);
        // Scale: process-local-file uses 0-100, but we want 0-65 for pre-OCR
        const scaled = isVideo ? Math.round(prog * 0.65) : Math.round(prog * 0.95);
        updateProgress(scaled, match[2]);
      }
    }

    // Step 2: Run OCR for video files
    if (isVideo) {
      updateProgress(65, 'Extracting visual text (OCR)...');

      const ocrScriptPath = join(PROJECT_ROOT, 'extract-frames-ocr.js');

      // Find the video file (for uploaded video, it's the original file)
      try {
        await execFileAsync(
          'node',
          [ocrScriptPath, filePath, userDataDir, fileId],
          { timeout: 600000, maxBuffer: 10 * 1024 * 1024 }
        );

        // Merge OCR results into embeddings
        await mergeOcrIntoEmbeddings(userDataDir, fileId);
      } catch (ocrErr) {
        console.error('OCR step failed (non-fatal):', ocrErr.message);
        // OCR failure is non-fatal; continue without visual text
      }

      updateProgress(90, 'Finalizing...');
    }

    // Update database record
    const kb = loadKnowledgeBase(userId, fileId);
    if (kb) {
      await pool.query(
        `UPDATE videos SET status = 'completed', title = $1, language = $2, duration = $3, chunk_count = $4
         WHERE user_id = $5 AND video_id = $6`,
        [
          originalFilename,
          kb.vectorDb.metadata.language,
          kb.vectorDb.metadata.duration,
          kb.vectorDb.metadata.chunk_count,
          userId,
          fileId
        ]
      );
    }

    updateProgress(100, 'Done!', 'completed');

    // Clean up uploaded source file
    try { unlinkSync(filePath); } catch {}

    setTimeout(() => {
      processingJobs.delete(jobKey);
    }, 60000);

  } catch (error) {
    console.error('Background local file processing error:', error);
    updateProgress(0, `Processing failed: ${error.message}`, 'failed');

    // Clean up uploaded source file
    try { unlinkSync(filePath); } catch {}

    await pool.query(
      `UPDATE videos SET status = 'failed', error_message = $1
       WHERE user_id = $2 AND video_id = $3`,
      [error.message, userId, fileId]
    ).catch(e => console.error('DB update error:', e));
  }
}

// Helper: Merge OCR text into existing embeddings
async function mergeOcrIntoEmbeddings(userDataDir, fileId) {
  const ocrPath = join(userDataDir, 'ocr', `${fileId}.json`);
  const dbPath = join(userDataDir, 'embeddings', `${fileId}.json`);

  if (!existsSync(ocrPath) || !existsSync(dbPath)) return;

  const ocrSegments = JSON.parse(readFileSync(ocrPath, 'utf-8'));
  if (ocrSegments.length === 0) return;

  const vectorDb = JSON.parse(readFileSync(dbPath, 'utf-8'));

  // Format OCR text as visual segments
  const ocrText = ocrSegments
    .map(seg => `[VISUAL ${seg.timestamp}] ${seg.text}`)
    .join('\n\n');

  // Chunk OCR text
  const ocrChunks = chunkText(ocrText, 300);

  // Generate embeddings for OCR chunks
  for (const chunk of ocrChunks) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk.text,
    });

    vectorDb.vectors.push({
      id: vectorDb.vectors.length,
      vector: response.data[0].embedding,
      text: chunk.text,
      metadata: {
        chunk_index: vectorDb.vectors.length,
        tokens: chunk.tokens,
        video_id: fileId,
        source: 'ocr'
      }
    });
  }

  vectorDb.metadata.chunk_count = vectorDb.vectors.length;
  vectorDb.metadata.has_ocr = true;

  writeFileSync(dbPath, JSON.stringify(vectorDb, null, 2), 'utf-8');
}

// Shared chunking function
function chunkText(text, maxTokens = 300) {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = [];
  let currentTokens = 0;

  paragraphs.forEach(paragraph => {
    if (!paragraph.trim()) return;

    const tokens = paragraph.split(/\s+/).length;

    if (currentTokens + tokens > maxTokens && currentChunk.length > 0) {
      chunks.push({ text: currentChunk.join('\n\n'), tokens: currentTokens });
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(paragraph.trim());
    currentTokens += tokens;
  });

  if (currentChunk.length > 0) {
    chunks.push({ text: currentChunk.join('\n\n'), tokens: currentTokens });
  }

  return chunks;
}

// API: Get processing status
app.get('/api/process-status/:videoId', (req, res) => {
  const userId = req.user.id;
  const { videoId } = req.params;
  const jobKey = `${userId}:${videoId}`;
  const job = processingJobs.get(jobKey);

  if (!job) {
    const kb = loadKnowledgeBase(userId, videoId);
    if (kb) {
      return res.json({ status: 'completed', progress: 100 });
    }
    return res.json({ status: 'not_found', progress: 0 });
  }

  res.json(job);
});

// Background video processing
async function processVideoAsync(url, videoId, userId) {
  const jobKey = `${userId}:${videoId}`;

  const updateProgress = (progress, message, status = 'processing') => {
    processingJobs.set(jobKey, {
      status,
      progress,
      message,
      startTime: processingJobs.get(jobKey).startTime
    });
  };

  try {
    const scriptPath = join(PROJECT_ROOT, 'process-video-from-url.js');
    const userDataDir = getUserDataDir(userId);

    updateProgress(10, 'Downloading video...');

    const { stdout, stderr } = await execFileAsync(
      'node',
      [scriptPath, url, userDataDir],
      {
        timeout: 1800000,
        maxBuffer: 10 * 1024 * 1024
      }
    );

    if (stderr && stderr.includes('Error')) {
      throw new Error(stderr);
    }

    // Parse output for metadata
    const lines = stdout.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    let resultData;
    try {
      resultData = JSON.parse(lastLine);
    } catch {
      resultData = {};
    }

    // Run OCR on the downloaded video
    updateProgress(65, 'Extracting visual text (OCR)...');

    const videoPath = join(userDataDir, 'videos', `${videoId}.mp4`);
    if (existsSync(videoPath)) {
      try {
        const ocrScriptPath = join(PROJECT_ROOT, 'extract-frames-ocr.js');
        await execFileAsync(
          'node',
          [ocrScriptPath, videoPath, userDataDir, videoId],
          { timeout: 600000, maxBuffer: 10 * 1024 * 1024 }
        );

        await mergeOcrIntoEmbeddings(userDataDir, videoId);
      } catch (ocrErr) {
        console.error('OCR step failed (non-fatal):', ocrErr.message);
      }
    }

    updateProgress(90, 'Finalizing...');

    // Update database record
    const kb = loadKnowledgeBase(userId, videoId);
    if (kb) {
      await pool.query(
        `UPDATE videos SET status = 'completed', language = $1, duration = $2, chunk_count = $3
         WHERE user_id = $4 AND video_id = $5`,
        [
          kb.vectorDb.metadata.language,
          kb.vectorDb.metadata.duration,
          kb.vectorDb.metadata.chunk_count,
          userId,
          videoId
        ]
      );
    }

    updateProgress(100, 'Done!', 'completed');

    setTimeout(() => {
      processingJobs.delete(jobKey);
    }, 60000);

  } catch (error) {
    console.error('Background processing error:', error);
    updateProgress(0, `Processing failed: ${error.message}`, 'failed');

    await pool.query(
      `UPDATE videos SET status = 'failed', error_message = $1
       WHERE user_id = $2 AND video_id = $3`,
      [error.message, userId, videoId]
    ).catch(e => console.error('DB update error:', e));
  }
}

// API: Get video info
app.get('/api/video-info', (req, res) => {
  const userId = req.user.id;
  const videoId = req.query.videoId;

  if (!videoId) {
    return res.status(400).json({ error: 'videoId parameter is required' });
  }

  const kb = loadKnowledgeBase(userId, videoId);
  if (!kb) {
    return res.status(404).json({ error: 'Video not found' });
  }

  res.json({
    id: kb.vectorDb.name,
    url: kb.vectorDb.video_url,
    language: kb.vectorDb.metadata.language,
    duration: kb.vectorDb.metadata.duration,
    created_at: kb.vectorDb.metadata.created_at,
    chunk_count: kb.vectorDb.metadata.chunk_count,
    vector_count: kb.vectorDb.vectors.length,
    transcript_length: kb.transcript.length
  });
});

// API: Get transcript
app.get('/api/transcript', (req, res) => {
  const userId = req.user.id;
  const videoId = req.query.videoId;

  if (!videoId) {
    return res.status(400).json({ error: 'videoId parameter is required' });
  }

  const kb = loadKnowledgeBase(userId, videoId);
  if (!kb) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const segments = parseTranscript(kb.transcript);
  res.json(segments);
});

// API: Search
app.post('/api/search', validateSearchQuery, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query, videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    const kb = loadKnowledgeBase(userId, videoId);
    if (!kb) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const queryResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryVector = queryResponse.data[0].embedding;

    const similarities = kb.vectorDb.vectors.map(emb => ({
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
app.post('/api/ask', validateSearchQuery, async (req, res) => {
  try {
    const userId = req.user.id;
    const { question, videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    const kb = loadKnowledgeBase(userId, videoId);
    if (!kb) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const queryResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    });

    const queryVector = queryResponse.data[0].embedding;

    const similarities = kb.vectorDb.vectors.map(emb => ({
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

app.listen(PORT, () => {
  console.log(`\nVideo RAG Agent Server started on port ${PORT}`);
  console.log(`Landing: http://localhost:${PORT}`);
  console.log(`App:     http://localhost:${PORT}/index.html`);
});
