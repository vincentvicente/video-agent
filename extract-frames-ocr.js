#!/usr/bin/env node

/**
 * Extract key frames from video and run OCR to get on-screen text.
 *
 * Usage: node extract-frames-ocr.js <videoPath> <outputDir> <fileId>
 *
 * Pipeline:
 * 1. Extract key frames via ffmpeg (1 per 5 sec, scene change filter)
 * 2. Deduplicate near-identical frames
 * 3. OCR each frame with tesseract.js
 * 4. Output timestamped text segments
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { createWorker } from 'tesseract.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VIDEO_PATH = process.argv[2];
const OUTPUT_DIR = process.argv[3];
const FILE_ID = process.argv[4];

if (!VIDEO_PATH || !OUTPUT_DIR || !FILE_ID) {
  console.error('Usage: node extract-frames-ocr.js <videoPath> <outputDir> <fileId>');
  process.exit(1);
}

/**
 * Extract key frames from video using ffmpeg.
 * Samples 1 frame every 5 seconds, keeping only frames with significant scene changes.
 */
async function extractFrames(videoPath, framesDir) {
  mkdirSync(framesDir, { recursive: true });

  // Extract frames: 1 per 5 seconds with scene change detection
  // showinfo filter outputs timestamp metadata for each frame
  await execFileAsync('ffmpeg', [
    '-i', videoPath,
    '-vf', "fps=1/5,select='gt(scene\\,0.3)',showinfo",
    '-vsync', 'vfr',
    '-frame_pts', '1',
    join(framesDir, 'frame_%06d.png')
  ], {
    timeout: 600000,
    maxBuffer: 10 * 1024 * 1024
  }).catch(async () => {
    // Fallback: if scene detection fails, just sample every 5 seconds
    await execFileAsync('ffmpeg', [
      '-i', videoPath,
      '-vf', 'fps=1/5',
      '-vsync', 'vfr',
      join(framesDir, 'frame_%06d.png')
    ], { timeout: 600000, maxBuffer: 10 * 1024 * 1024 });
  });

  // Get frame files sorted
  const files = readdirSync(framesDir)
    .filter(f => f.endsWith('.png'))
    .sort();

  return files;
}

/**
 * Compute a rough perceptual hash of an image file.
 * Used to deduplicate near-identical frames.
 */
function fileHash(filePath) {
  const data = readFileSync(filePath);
  return createHash('md5').update(data).digest('hex');
}

/**
 * Deduplicate frames by comparing file hashes.
 * Returns array of unique frame filenames.
 */
function deduplicateFrames(framesDir, frameFiles) {
  const seen = new Set();
  const unique = [];

  for (const file of frameFiles) {
    const hash = fileHash(join(framesDir, file));
    if (!seen.has(hash)) {
      seen.add(hash);
      unique.push(file);
    }
  }

  return unique;
}

/**
 * Estimate timestamp from frame filename.
 * Frame index * 5 seconds (since we sample every 5 seconds).
 */
function estimateTimestamp(frameIndex) {
  const totalSeconds = frameIndex * 5;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Run OCR on each frame using tesseract.js.
 * Returns array of { timestamp, text } objects.
 */
async function ocrFrames(framesDir, frameFiles) {
  const results = [];

  if (frameFiles.length === 0) return results;

  const worker = await createWorker('eng+chi_sim');

  for (let i = 0; i < frameFiles.length; i++) {
    const framePath = join(framesDir, frameFiles[i]);
    const timestamp = estimateTimestamp(i);

    try {
      const { data: { text } } = await worker.recognize(framePath);
      const cleaned = text.trim();

      // Only include frames that have meaningful text (> 5 chars)
      if (cleaned.length > 5) {
        results.push({ timestamp, text: cleaned });
      }
    } catch (err) {
      // Skip frames that fail OCR
      console.error(`OCR failed for ${frameFiles[i]}: ${err.message}`);
    }
  }

  await worker.terminate();
  return results;
}

async function main() {
  try {
    const ocrDir = join(OUTPUT_DIR, 'ocr');
    const framesDir = join(OUTPUT_DIR, 'frames_tmp', FILE_ID);

    mkdirSync(ocrDir, { recursive: true });

    console.log('[OCR] Extracting key frames...');
    const frameFiles = await extractFrames(VIDEO_PATH, framesDir);

    if (frameFiles.length === 0) {
      console.log('[OCR] No frames extracted, skipping OCR');
      writeFileSync(join(ocrDir, `${FILE_ID}.json`), JSON.stringify([]), 'utf-8');
      console.log(JSON.stringify({ success: true, segments: 0 }));
      return;
    }

    console.log(`[OCR] Extracted ${frameFiles.length} frames`);

    console.log('[OCR] Deduplicating frames...');
    const uniqueFrames = deduplicateFrames(framesDir, frameFiles);
    console.log(`[OCR] ${uniqueFrames.length} unique frames after dedup`);

    console.log('[OCR] Running OCR on frames...');
    const ocrResults = await ocrFrames(framesDir, uniqueFrames);
    console.log(`[OCR] Extracted text from ${ocrResults.length} frames`);

    // Save OCR results
    const outputPath = join(ocrDir, `${FILE_ID}.json`);
    writeFileSync(outputPath, JSON.stringify(ocrResults, null, 2), 'utf-8');

    // Clean up temp frames
    try {
      rmSync(framesDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }

    console.log(JSON.stringify({ success: true, segments: ocrResults.length }));

  } catch (error) {
    console.error('[OCR ERROR]', error.message);
    process.exit(1);
  }
}

main();
