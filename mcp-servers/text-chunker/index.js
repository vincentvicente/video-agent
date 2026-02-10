#!/usr/bin/env node

/**
 * Text Chunker MCP Server
 *
 * Provides tools for:
 * - Text chunking with semantic boundaries
 * - Transcript cleaning (VTT/SRT format)
 * - Keyword extraction
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import natural from 'natural';
import nlp from 'compromise';

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

/**
 * Chunk text into semantic pieces
 * @param {string} text - Input text
 * @param {number} chunkSize - Target chunk size in tokens
 * @param {number} overlap - Overlap size in tokens
 * @param {string} strategy - Chunking strategy: 'fixed', 'semantic', 'sentence'
 * @returns {Array} Array of text chunks with metadata
 */
function chunkText(text, chunkSize = 500, overlap = 50, strategy = 'semantic') {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  const chunks = [];

  if (strategy === 'sentence') {
    // Sentence-based chunking
    const doc = nlp(text);
    const sentences = doc.sentences().out('array');

    let currentChunk = [];
    let currentTokens = 0;

    sentences.forEach((sentence, idx) => {
      const tokens = tokenizer.tokenize(sentence);
      const tokenCount = tokens.length;

      if (currentTokens + tokenCount > chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.join(' '),
          start_index: chunks.length,
          token_count: currentTokens,
          sentence_count: currentChunk.length
        });

        // Keep overlap sentences
        const overlapSentences = Math.ceil(overlap / (currentTokens / currentChunk.length));
        currentChunk = currentChunk.slice(-overlapSentences);
        currentTokens = currentChunk.reduce((sum, s) =>
          sum + tokenizer.tokenize(s).length, 0);
      }

      currentChunk.push(sentence);
      currentTokens += tokenCount;
    });

    // Add last chunk
    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.join(' '),
        start_index: chunks.length,
        token_count: currentTokens,
        sentence_count: currentChunk.length
      });
    }

  } else if (strategy === 'semantic') {
    // Semantic chunking (paragraph-based)
    const paragraphs = text.split(/\n\s*\n/);

    let currentChunk = [];
    let currentTokens = 0;

    paragraphs.forEach(paragraph => {
      if (!paragraph.trim()) return;

      const tokens = tokenizer.tokenize(paragraph);
      const tokenCount = tokens.length;

      if (currentTokens + tokenCount > chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.join('\n\n'),
          start_index: chunks.length,
          token_count: currentTokens,
          paragraph_count: currentChunk.length
        });

        // Reset with overlap
        currentChunk = [];
        currentTokens = 0;
      }

      currentChunk.push(paragraph);
      currentTokens += tokenCount;
    });

    // Add last chunk
    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.join('\n\n'),
        start_index: chunks.length,
        token_count: currentTokens,
        paragraph_count: currentChunk.length
      });
    }

  } else {
    // Fixed-size chunking
    const tokens = tokenizer.tokenize(text);

    for (let i = 0; i < tokens.length; i += (chunkSize - overlap)) {
      const chunkTokens = tokens.slice(i, i + chunkSize);
      chunks.push({
        text: chunkTokens.join(' '),
        start_index: chunks.length,
        token_count: chunkTokens.length,
        start_token: i,
        end_token: i + chunkTokens.length
      });
    }
  }

  return chunks;
}

/**
 * Clean transcript text (VTT/SRT format)
 * @param {string} transcript - Raw transcript
 * @param {boolean} removeTimestamps - Remove timestamp lines
 * @param {boolean} removeSpeakers - Remove speaker labels
 * @returns {string} Cleaned transcript text
 */
function cleanTranscript(transcript, removeTimestamps = true, removeSpeakers = false) {
  if (!transcript) {
    throw new Error('Transcript cannot be empty');
  }

  let cleaned = transcript;

  // Remove WEBVTT header
  cleaned = cleaned.replace(/WEBVTT\s*/g, '');
  cleaned = cleaned.replace(/Kind:\s*\w+\s*/g, '');
  cleaned = cleaned.replace(/Language:\s*\w+\s*/g, '');

  // Remove timestamps (00:00:00.000 --> 00:00:02.000)
  if (removeTimestamps) {
    cleaned = cleaned.replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/g, '');
    // Also remove simple timestamps like [00:32]
    cleaned = cleaned.replace(/\[\d{2}:\d{2}\]/g, '');
  }

  // Remove cue identifiers (numbers or labels before timestamps)
  cleaned = cleaned.replace(/^\d+\s*$/gm, '');

  // Remove speaker labels like "Speaker 1:" or "[SPEAKER]:"
  if (removeSpeakers) {
    cleaned = cleaned.replace(/^[A-Z][a-z]+(\s+\d+)?:\s*/gm, '');
    cleaned = cleaned.replace(/^\[[A-Z\s]+\]:\s*/gm, '');
  }

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Remove extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Extract keywords from text using TF-IDF
 * @param {string} text - Input text
 * @param {number} maxKeywords - Maximum number of keywords to return
 * @returns {Array} Array of keywords with scores
 */
function extractKeywords(text, maxKeywords = 10) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  const tfidf = new TfIdf();
  tfidf.addDocument(text);

  const keywords = [];
  tfidf.listTerms(0).slice(0, maxKeywords * 2).forEach(item => {
    // Filter out stop words and short terms
    if (item.term.length > 2 && item.tfidf > 0) {
      keywords.push({
        keyword: item.term,
        score: item.tfidf,
        frequency: text.toLowerCase().split(item.term.toLowerCase()).length - 1
      });
    }
  });

  // Also extract named entities using compromise
  const doc = nlp(text);
  const entities = [
    ...doc.people().out('array'),
    ...doc.places().out('array'),
    ...doc.organizations().out('array'),
    ...doc.topics().out('array')
  ];

  // Merge and deduplicate
  entities.forEach(entity => {
    if (!keywords.find(k => k.keyword.toLowerCase() === entity.toLowerCase())) {
      keywords.push({
        keyword: entity,
        score: 1.0,
        type: 'entity',
        frequency: text.toLowerCase().split(entity.toLowerCase()).length - 1
      });
    }
  });

  // Sort by score and return top N
  return keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, maxKeywords);
}

// Create MCP server
const server = new Server(
  {
    name: 'text-chunker',
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
        name: 'chunk_text',
        description: 'Split text into semantic chunks with configurable size and overlap. Supports multiple strategies: fixed (token-based), semantic (paragraph-based), or sentence (sentence-based).',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to chunk',
            },
            chunk_size: {
              type: 'number',
              description: 'Target chunk size in tokens (default: 500)',
              default: 500,
            },
            overlap: {
              type: 'number',
              description: 'Overlap size in tokens (default: 50)',
              default: 50,
            },
            strategy: {
              type: 'string',
              enum: ['fixed', 'semantic', 'sentence'],
              description: 'Chunking strategy (default: semantic)',
              default: 'semantic',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'clean_transcript',
        description: 'Clean transcript text by removing timestamps, speaker labels, and formatting. Supports VTT and SRT formats.',
        inputSchema: {
          type: 'object',
          properties: {
            transcript: {
              type: 'string',
              description: 'The transcript text to clean',
            },
            remove_timestamps: {
              type: 'boolean',
              description: 'Remove timestamp lines (default: true)',
              default: true,
            },
            remove_speakers: {
              type: 'boolean',
              description: 'Remove speaker labels (default: false)',
              default: false,
            },
          },
          required: ['transcript'],
        },
      },
      {
        name: 'extract_keywords',
        description: 'Extract keywords from text using TF-IDF and named entity recognition. Returns keywords with scores and frequencies.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to extract keywords from',
            },
            max_keywords: {
              type: 'number',
              description: 'Maximum number of keywords to return (default: 10)',
              default: 10,
            },
          },
          required: ['text'],
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
      case 'chunk_text': {
        const chunks = chunkText(
          args.text,
          args.chunk_size || 500,
          args.overlap || 50,
          args.strategy || 'semantic'
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                chunks,
                total_chunks: chunks.length,
                total_tokens: chunks.reduce((sum, c) => sum + c.token_count, 0),
                strategy: args.strategy || 'semantic',
              }, null, 2),
            },
          ],
        };
      }

      case 'clean_transcript': {
        const cleaned = cleanTranscript(
          args.transcript,
          args.remove_timestamps !== false,
          args.remove_speakers === true
        );

        const originalLength = args.transcript.length;
        const cleanedLength = cleaned.length;
        const reduction = ((originalLength - cleanedLength) / originalLength * 100).toFixed(1);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                cleaned_text: cleaned,
                original_length: originalLength,
                cleaned_length: cleanedLength,
                reduction_percent: reduction,
              }, null, 2),
            },
          ],
        };
      }

      case 'extract_keywords': {
        const keywords = extractKeywords(
          args.text,
          args.max_keywords || 10
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                keywords,
                total_keywords: keywords.length,
              }, null, 2),
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
  console.error('Text Chunker MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
