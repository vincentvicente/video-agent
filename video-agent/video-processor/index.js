#!/usr/bin/env node

/**
 * Video Processor MCP Server
 *
 * Provides tools for:
 * - Downloading videos from URLs (YouTube, etc.)
 * - Extracting audio from video files
 * - Transcribing audio using OpenAI Whisper
 * - End-to-end video processing pipeline
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import OpenAI from 'openai';
import { config } from 'dotenv';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, createWriteStream, createReadStream, statSync, readFileSync } from 'fs';
import { pipeline } from 'stream/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../../.env') });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
});

// Configuration
const VIDEOS_DIR = process.env.VIDEOS_DIR || join(__dirname, '../../data/videos');
const AUDIO_DIR = process.env.AUDIO_DIR || join(__dirname, '../../data/audio');
const TRANSCRIPTS_DIR = process.env.TRANSCRIPTS_DIR || join(__dirname, '../../data/transcripts');
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'whisper-1';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB Whisper API limit

// Ensure directories exist
[VIDEOS_DIR, AUDIO_DIR, TRANSCRIPTS_DIR].forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

/**
 * Download video from URL
 */
async function downloadVideo(url, outputName = null) {
  if (!url || url.trim().length === 0) {
    throw new Error('URL cannot be empty');
  }

  // Validate URL
  let videoUrl;
  try {
    videoUrl = new URL(url);
  } catch (error) {
    throw new Error('Invalid URL format');
  }

  // Check if it's a supported platform
  if (!ytdl.validateURL(url)) {
    throw new Error('Unsupported video URL. Currently supports YouTube videos.');
  }

  try {
    // Get video info
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const fileName = outputName || `${videoTitle}_${Date.now()}.mp4`;
    const outputPath = join(VIDEOS_DIR, fileName);

    // Download video
    const videoStream = ytdl(url, {
      quality: 'highestvideo',
      filter: 'videoandaudio',
    });

    const fileStream = createWriteStream(outputPath);
    await pipeline(videoStream, fileStream);

    // Get file stats
    const stats = statSync(outputPath);

    return {
      video_id: info.videoDetails.videoId,
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds),
      file_path: outputPath,
      file_size: stats.size,
      format: 'mp4',
      downloaded_at: Date.now(),
    };
  } catch (error) {
    throw new Error(`Failed to download video: ${error.message}`);
  }
}

/**
 * Extract audio from video file
 */
async function extractAudio(videoPath, outputFormat = 'wav') {
  if (!videoPath || !existsSync(videoPath)) {
    throw new Error('Video file does not exist');
  }

  const supportedFormats = ['wav', 'mp3', 'flac', 'm4a'];
  if (!supportedFormats.includes(outputFormat)) {
    throw new Error(`Unsupported format. Supported: ${supportedFormats.join(', ')}`);
  }

  const videoBaseName = basename(videoPath, extname(videoPath));
  const audioFileName = `${videoBaseName}.${outputFormat}`;
  const outputPath = join(AUDIO_DIR, audioFileName);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .toFormat(outputFormat)
      .audioChannels(1) // Mono
      .audioFrequency(16000) // 16kHz (Whisper optimal)
      .on('start', (commandLine) => {
        console.error('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.error(`Audio extraction progress: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('end', () => {
        const stats = statSync(outputPath);

        resolve({
          video_path: videoPath,
          audio_path: outputPath,
          format: outputFormat,
          file_size: stats.size,
          channels: 1,
          sample_rate: 16000,
          extracted_at: Date.now(),
        });
      })
      .on('error', (error) => {
        reject(new Error(`Failed to extract audio: ${error.message}`));
      })
      .save(outputPath);
  });
}

/**
 * Transcribe audio using LOCAL Whisper (FREE - no API needed!)
 */
async function transcribeAudio(audioPath, language = null, responseFormat = 'vtt') {
  if (!audioPath || !existsSync(audioPath)) {
    throw new Error('Audio file does not exist');
  }

  const supportedFormats = ['json', 'txt', 'srt', 'vtt'];
  let format = responseFormat === 'text' ? 'txt' : responseFormat;
  format = responseFormat === 'verbose_json' ? 'json' : format;

  if (!supportedFormats.includes(format)) {
    throw new Error(`Unsupported format. Supported: ${supportedFormats.join(', ')}`);
  }

  try {
    // Use local Whisper (FREE!)
    const whisperScript = join(__dirname, '../../run-whisper.sh');
    const modelSize = process.env.WHISPER_MODEL_SIZE || 'base'; // tiny, base, small, medium, large

    console.error(`Transcribing with local Whisper (model: ${modelSize})...`);

    // Call local Whisper script
    const command = `"${whisperScript}" "${audioPath}" "${language || 'null'}" "${modelSize}" "${format}"`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('Whisper output:', stderr);
    }

    // Parse result
    const result = JSON.parse(stdout);

    if (!result.success) {
      throw new Error(result.error || 'Transcription failed');
    }

    // Read the transcript file
    const transcriptContent = readFileSync(result.transcript_path, 'utf-8');

    return {
      audio_path: audioPath,
      transcript_path: result.transcript_path,
      format: result.format,
      language: result.language,
      file_size: transcriptContent.length,
      transcribed_at: Date.now(),
      preview: transcriptContent.substring(0, 200),
      model_used: result.model_used,
      duration: result.duration,
      segments_count: result.segments_count,
      method: 'local_whisper_free'
    };
  } catch (error) {
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Process video end-to-end (download -> extract -> transcribe)
 */
async function processVideo(url, options = {}) {
  const {
    videoName = null,
    audioFormat = 'wav',
    transcriptFormat = 'vtt',
    language = null,
    keepVideo = true,
    keepAudio = true,
  } = options;

  const results = {
    url,
    steps: [],
    start_time: Date.now(),
  };

  try {
    // Step 1: Download video
    console.error('Step 1/3: Downloading video...');
    const downloadResult = await downloadVideo(url, videoName);
    results.video = downloadResult;
    results.steps.push({ step: 'download', status: 'success', timestamp: Date.now() });

    // Step 2: Extract audio
    console.error('Step 2/3: Extracting audio...');
    const extractResult = await extractAudio(downloadResult.file_path, audioFormat);
    results.audio = extractResult;
    results.steps.push({ step: 'extract', status: 'success', timestamp: Date.now() });

    // Step 3: Transcribe
    console.error('Step 3/3: Transcribing audio...');
    const transcribeResult = await transcribeAudio(extractResult.audio_path, language, transcriptFormat);
    results.transcript = transcribeResult;
    results.steps.push({ step: 'transcribe', status: 'success', timestamp: Date.now() });

    // Cleanup if requested
    if (!keepVideo) {
      await import('fs/promises').then(fs => fs.unlink(downloadResult.file_path));
      results.video.file_path = '(deleted)';
    }

    if (!keepAudio) {
      await import('fs/promises').then(fs => fs.unlink(extractResult.audio_path));
      results.audio.audio_path = '(deleted)';
    }

    results.status = 'success';
    results.end_time = Date.now();
    results.duration = results.end_time - results.start_time;

    return results;
  } catch (error) {
    results.status = 'failed';
    results.error = error.message;
    results.end_time = Date.now();
    results.duration = results.end_time - results.start_time;

    throw new Error(`Video processing failed: ${error.message}`);
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'video-processor',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'download_video',
        description: 'Download video from URL (YouTube supported). Returns video metadata and file path.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Video URL to download',
            },
            output_name: {
              type: 'string',
              description: 'Optional output file name',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'extract_audio',
        description: 'Extract audio from video file. Optimized for Whisper transcription.',
        inputSchema: {
          type: 'object',
          properties: {
            video_path: {
              type: 'string',
              description: 'Path to video file',
            },
            output_format: {
              type: 'string',
              description: 'Audio format: wav, mp3, flac, m4a (default: wav)',
              default: 'wav',
            },
          },
          required: ['video_path'],
        },
      },
      {
        name: 'transcribe_audio',
        description: 'Transcribe audio using OpenAI Whisper API. Supports multiple output formats.',
        inputSchema: {
          type: 'object',
          properties: {
            audio_path: {
              type: 'string',
              description: 'Path to audio file',
            },
            language: {
              type: 'string',
              description: 'Language code (e.g., en, es, fr). Auto-detect if not specified.',
            },
            response_format: {
              type: 'string',
              description: 'Output format: json, text, srt, vtt, verbose_json (default: vtt)',
              default: 'vtt',
            },
          },
          required: ['audio_path'],
        },
      },
      {
        name: 'process_video',
        description: 'End-to-end video processing: download, extract audio, and transcribe. Returns complete pipeline results.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Video URL to process',
            },
            options: {
              type: 'object',
              description: 'Processing options',
              properties: {
                video_name: {
                  type: 'string',
                  description: 'Optional output video name',
                },
                audio_format: {
                  type: 'string',
                  description: 'Audio format (default: wav)',
                  default: 'wav',
                },
                transcript_format: {
                  type: 'string',
                  description: 'Transcript format (default: vtt)',
                  default: 'vtt',
                },
                language: {
                  type: 'string',
                  description: 'Transcription language (auto-detect if not specified)',
                },
                keep_video: {
                  type: 'boolean',
                  description: 'Keep video file after processing (default: true)',
                  default: true,
                },
                keep_audio: {
                  type: 'boolean',
                  description: 'Keep audio file after processing (default: true)',
                  default: true,
                },
              },
            },
          },
          required: ['url'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'download_video': {
        const result = await downloadVideo(
          args.url,
          args.output_name
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'extract_audio': {
        const result = await extractAudio(
          args.video_path,
          args.output_format || 'wav'
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'transcribe_audio': {
        const result = await transcribeAudio(
          args.audio_path,
          args.language,
          args.response_format || 'vtt'
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'process_video': {
        const result = await processVideo(
          args.url,
          args.options || {}
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            tool: name,
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Video Processor MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
