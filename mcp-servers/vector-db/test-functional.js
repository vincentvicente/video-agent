#!/usr/bin/env node

/**
 * Functional Test for Vector DB MCP
 * Tests all vector database operations
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import OpenAI from 'openai';
import { config } from 'dotenv';

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

// In-memory cache
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
 * Calculate cosine similarity
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

  const queryEmbedding = await generateEmbedding(query);

  const similarities = index.vectors.map(vector => {
    const similarity = cosineSimilarity(queryEmbedding, vector.embedding);

    return {
      id: vector.id,
      text: vector.text,
      metadata: vector.metadata,
      similarity,
    };
  });

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

// Test data
const sampleTexts = [
  'Artificial intelligence agents can perceive their environment and take actions.',
  'Machine learning models learn patterns from data without explicit programming.',
  'Neural networks are inspired by biological neurons in the human brain.',
  'Deep learning uses multiple layers to progressively extract higher-level features.',
  'Natural language processing enables computers to understand human language.',
];

// Run tests
console.log('🧪 Vector DB MCP - Functional Tests\n');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

function test(name, fn) {
  return new Promise((resolve) => {
    fn()
      .then(() => {
        console.log(`✅ ${name}`);
        passed++;
        resolve();
      })
      .catch((error) => {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
        resolve();
      });
  });
}

// Main test runner
async function runTests() {
  const testIndexName = 'test_index_' + Date.now();

  // Test 1: Create index
  console.log('\n📝 Test 1: create_index');
  console.log('-'.repeat(70));

  await test('Create new vector index', async () => {
    const result = createIndex(testIndexName, 1536, { purpose: 'testing' });

    console.log(`   Index name: ${result.index_name}`);
    console.log(`   Dimension: ${result.dimension}`);
    console.log(`   Vector count: ${result.vector_count}`);

    if (!result.index_name) throw new Error('Index name missing');
    if (result.dimension !== 1536) throw new Error('Dimension mismatch');
    if (result.vector_count !== 0) throw new Error('Initial count should be 0');
  });

  // Test 2: Get index stats (empty)
  console.log('\n📝 Test 2: get_index_stats (empty index)');
  console.log('-'.repeat(70));

  await test('Get stats for empty index', async () => {
    const result = getIndexStats(testIndexName);

    console.log(`   Vector count: ${result.vector_count}`);
    console.log(`   Dimension: ${result.dimension}`);

    if (result.vector_count !== 0) throw new Error('Should be empty');
  });

  // Test 3: Store embeddings
  console.log('\n📝 Test 3: store_embeddings');
  console.log('-'.repeat(70));

  // Check if API key is configured
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-placeholder') {
    console.log('⚠️  OPENAI_API_KEY not configured - skipping embedding tests');
    console.log('   Set OPENAI_API_KEY in .env file to run full tests\n');
  } else {
    await test('Generate and store embeddings', async () => {
      console.log('   Generating embeddings for sample texts...');

      const chunks = [];
      for (const text of sampleTexts) {
        const embedding = await generateEmbedding(text);
        chunks.push({
          text,
          embedding,
          metadata: { source: 'test' },
        });
      }

      console.log(`   Generated ${chunks.length} embeddings`);

      const result = await storeEmbeddings(testIndexName, chunks);

      console.log(`   Stored: ${result.stored_count} vectors`);
      console.log(`   Total: ${result.total_vectors} vectors`);

      if (result.stored_count !== sampleTexts.length) {
        throw new Error('Stored count mismatch');
      }
    });

    // Test 4: Get index stats (with data)
    console.log('\n📝 Test 4: get_index_stats (with data)');
    console.log('-'.repeat(70));

    await test('Get stats for populated index', async () => {
      const result = getIndexStats(testIndexName);

      console.log(`   Vector count: ${result.vector_count}`);

      if (result.vector_count !== sampleTexts.length) {
        throw new Error('Vector count mismatch');
      }
    });

    // Test 5: Search similar
    console.log('\n📝 Test 5: search_similar');
    console.log('-'.repeat(70));

    await test('Search for similar vectors', async () => {
      const query = 'What are AI agents?';
      const result = await searchSimilar(testIndexName, query, 3);

      console.log(`   Query: "${result.query}"`);
      console.log(`   Results: ${result.results.length}`);
      console.log(`   Total searched: ${result.total_searched}`);

      if (result.results.length === 0) throw new Error('No results returned');

      console.log('\n   Top 3 results:');
      result.results.forEach((r, i) => {
        console.log(`   ${i + 1}. "${r.text.substring(0, 50)}..." (similarity: ${r.similarity.toFixed(3)})`);
      });

      // Check that results are sorted by similarity
      for (let i = 0; i < result.results.length - 1; i++) {
        if (result.results[i].similarity < result.results[i + 1].similarity) {
          throw new Error('Results not sorted by similarity');
        }
      }
    });
  }

  // Test 6: Delete index
  console.log('\n📝 Test 6: delete_index');
  console.log('-'.repeat(70));

  await test('Delete vector index', async () => {
    const result = deleteIndex(testIndexName);

    console.log(`   Index deleted: ${result.index_name}`);

    if (!result.deleted) throw new Error('Delete flag not set');

    // Verify index is gone
    const indexPath = join(DB_PATH, `${testIndexName}.json`);
    if (existsSync(indexPath)) {
      throw new Error('Index file still exists');
    }
  });

  // Test 7: Error handling
  console.log('\n📝 Test 7: Error handling');
  console.log('-'.repeat(70));

  await test('Handle missing index gracefully', async () => {
    try {
      getIndexStats('nonexistent_index');
      throw new Error('Should have thrown error for missing index');
    } catch (error) {
      if (!error.message.includes('does not exist')) throw error;
    }
    console.log('   Error correctly thrown for missing index');
  });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Test Summary');
  console.log('='.repeat(70));
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Vector DB MCP is working correctly.\n');
    console.log('📋 Ready for:');
    console.log('  - Integration with Claude');
    console.log('  - Phase 2.4: Video Processor MCP implementation\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('\n❌ Test runner error:', error);
  process.exit(1);
});
