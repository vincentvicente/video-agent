#!/usr/bin/env node

/**
 * Vector DB MCP Server (Simplified Version)
 *
 * Provides tools for:
 * - Creating vector indices
 * - Storing embeddings with metadata
 * - Searching for similar vectors
 * - Managing indices
 *
 * Uses JSON files for storage and cosine similarity for search
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../../.env') });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
});

// Database configuration
const DB_PATH = process.env.DB_PATH || join(__dirname, '../../data/embeddings');
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION) || 1536;

// Ensure DB directory exists
if (!existsSync(DB_PATH)) {
  mkdirSync(DB_PATH, { recursive: true });
}

// In-memory cache of indices
const indicesCache = new Map();

/**
 * Load index from file
 */
function loadIndex(indexName) {
  if (indicesCache.has(indexName)) {
    return indicesCache.get(indexName);
  }

  const indexPath = join(DB_PATH, `${indexName}.json`);
  if (existsSync(indexPath)) {
    const data = JSON.parse(readFileSync(indexPath, 'utf-8'));
    indicesCache.set(indexName, data);
    return data;
  }

  return null;
}

/**
 * Save index to file
 */
function saveIndex(indexName, data) {
  const indexPath = join(DB_PATH, `${indexName}.json`);
  writeFileSync(indexPath, JSON.stringify(data, null, 2), 'utf-8');
  indicesCache.set(indexName, data);
}

/**
 * Create a new vector index
 */
function createIndex(indexName, dimension = EMBEDDING_DIMENSION, metadata = {}) {
  if (!indexName || indexName.trim().length === 0) {
    throw new Error('Index name cannot be empty');
  }

  // Check if index already exists
  if (loadIndex(indexName)) {
    throw new Error(`Index '${indexName}' already exists`);
  }

  const index = {
    name: indexName,
    dimension,
    vectors: [],
    metadata: {
      created_at: Date.now(),
      ...metadata,
    },
  };

  saveIndex(indexName, index);

  return {
    index_name: indexName,
    dimension,
    vector_count: 0,
    created_at: index.metadata.created_at,
    metadata,
  };
}

/**
 * Generate embeddings using OpenAI API
 */
async function generateEmbedding(text) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-placeholder') {
    throw new Error('OPENAI_API_KEY not set in environment. Please configure it in .env file.');
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Store embeddings in the index
 */
async function storeEmbeddings(indexName, chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new Error('Chunks must be a non-empty array');
  }

  const index = loadIndex(indexName);
  if (!index) {
    throw new Error(`Index '${indexName}' does not exist. Create it first.`);
  }

  // Add chunks to index
  for (const chunk of chunks) {
    if (!chunk.embedding) {
      throw new Error('Each chunk must have an embedding array');
    }

    if (!Array.isArray(chunk.embedding)) {
      throw new Error('Embedding must be an array');
    }

    index.vectors.push({
      id: index.vectors.length + 1,
      text: chunk.text || '',
      embedding: chunk.embedding,
      metadata: chunk.metadata || {},
      created_at: Date.now(),
    });
  }

  saveIndex(indexName, index);

  return {
    index_name: indexName,
    stored_count: chunks.length,
    total_vectors: index.vectors.length,
  };
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Search for similar vectors
 */
async function searchSimilar(indexName, query, topK = 5, filters = {}) {
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  const index = loadIndex(indexName);
  if (!index) {
    throw new Error(`Index '${indexName}' does not exist`);
  }

  if (index.vectors.length === 0) {
    return {
      query,
      results: [],
      total_searched: 0,
    };
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Calculate similarities
  const similarities = index.vectors.map(vector => {
    const similarity = cosineSimilarity(queryEmbedding, vector.embedding);

    return {
      id: vector.id,
      text: vector.text,
      metadata: vector.metadata,
      similarity,
    };
  });

  // Sort by similarity and take top K
  similarities.sort((a, b) => b.similarity - a.similarity);
  const results = similarities.slice(0, topK);

  return {
    query,
    results,
    total_searched: index.vectors.length,
    top_k: topK,
  };
}

/**
 * Delete an index
 */
function deleteIndex(indexName) {
  const indexPath = join(DB_PATH, `${indexName}.json`);

  if (!existsSync(indexPath)) {
    throw new Error(`Index '${indexName}' does not exist`);
  }

  unlinkSync(indexPath);
  indicesCache.delete(indexName);

  return {
    index_name: indexName,
    deleted: true,
  };
}

/**
 * Get index statistics
 */
function getIndexStats(indexName) {
  const index = loadIndex(indexName);

  if (!index) {
    throw new Error(`Index '${indexName}' does not exist`);
  }

  return {
    index_name: indexName,
    vector_count: index.vectors.length,
    dimension: index.dimension,
    created_at: index.metadata.created_at,
    metadata: index.metadata,
  };
}

// Create MCP server
const server = new Server(
  {
    name: 'vector-db',
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
        name: 'create_index',
        description: 'Create a new vector index for storing embeddings. Returns index metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            index_name: {
              type: 'string',
              description: 'Name of the index to create',
            },
            dimension: {
              type: 'number',
              description: 'Vector dimension (default: 1536 for text-embedding-3-small)',
              default: 1536,
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata for the index',
              default: {},
            },
          },
          required: ['index_name'],
        },
      },
      {
        name: 'store_embeddings',
        description: 'Store text chunks with their embeddings in the index. Embeddings should be pre-generated.',
        inputSchema: {
          type: 'object',
          properties: {
            index_name: {
              type: 'string',
              description: 'Name of the index',
            },
            chunks: {
              type: 'array',
              description: 'Array of chunks with text, embedding, and metadata',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                    description: 'The text content',
                  },
                  embedding: {
                    type: 'array',
                    description: 'Pre-generated embedding vector',
                    items: {
                      type: 'number',
                    },
                  },
                  metadata: {
                    type: 'object',
                    description: 'Optional metadata for this chunk',
                  },
                },
                required: ['text', 'embedding'],
              },
            },
          },
          required: ['index_name', 'chunks'],
        },
      },
      {
        name: 'search_similar',
        description: 'Search for similar vectors using cosine similarity. Automatically generates query embedding.',
        inputSchema: {
          type: 'object',
          properties: {
            index_name: {
              type: 'string',
              description: 'Name of the index to search',
            },
            query: {
              type: 'string',
              description: 'Query text (embedding will be generated automatically)',
            },
            top_k: {
              type: 'number',
              description: 'Number of results to return (default: 5)',
              default: 5,
            },
            filters: {
              type: 'object',
              description: 'Optional metadata filters',
              default: {},
            },
          },
          required: ['index_name', 'query'],
        },
      },
      {
        name: 'delete_index',
        description: 'Delete a vector index and all its data. This operation cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            index_name: {
              type: 'string',
              description: 'Name of the index to delete',
            },
          },
          required: ['index_name'],
        },
      },
      {
        name: 'get_index_stats',
        description: 'Get statistics about a vector index (vector count, dimension, metadata).',
        inputSchema: {
          type: 'object',
          properties: {
            index_name: {
              type: 'string',
              description: 'Name of the index',
            },
          },
          required: ['index_name'],
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
      case 'create_index': {
        const result = createIndex(
          args.index_name,
          args.dimension || EMBEDDING_DIMENSION,
          args.metadata || {}
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

      case 'store_embeddings': {
        const result = await storeEmbeddings(
          args.index_name,
          args.chunks
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

      case 'search_similar': {
        const result = await searchSimilar(
          args.index_name,
          args.query,
          args.top_k || 5,
          args.filters || {}
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

      case 'delete_index': {
        const result = deleteIndex(args.index_name);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_index_stats': {
        const result = getIndexStats(args.index_name);

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
  console.error('Vector DB MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
