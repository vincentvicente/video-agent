#!/usr/bin/env node

/**
 * Demo: Features that don't require API
 * Demonstrates text-chunker and vector-db (non-API) features
 */

import natural from 'natural';
import nlp from 'compromise';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

console.log('🎯 Video RAG Agent - No-API Features Demo\n');
console.log('='.repeat(70));

// Sample text (simulating a video transcript)
const sampleTranscript = `
Introduction to Artificial Intelligence

Artificial intelligence has revolutionized how we interact with technology.
In this video, we'll explore the fundamental concepts of AI and its applications.

What is Artificial Intelligence?

AI refers to the simulation of human intelligence in machines. These systems
can perform tasks that typically require human intelligence, such as visual
perception, speech recognition, decision-making, and language translation.

Types of AI Systems

There are several types of AI systems. Narrow AI, also known as weak AI,
is designed for specific tasks. Examples include voice assistants like Siri
and recommendation algorithms on Netflix.

General AI, or strong AI, would have the ability to understand, learn, and
apply knowledge across a wide range of tasks, similar to human intelligence.
However, this level of AI does not yet exist.

Machine Learning Basics

Machine learning is a subset of AI that enables systems to learn and improve
from experience without being explicitly programmed. It uses algorithms to
parse data, learn from it, and make predictions or decisions.

Deep Learning

Deep learning is a subset of machine learning that uses neural networks with
multiple layers. These networks can learn complex patterns in large amounts
of data, making them particularly effective for image recognition, natural
language processing, and speech recognition.

Applications of AI

AI is being used in various fields including healthcare for disease diagnosis,
finance for fraud detection, transportation for autonomous vehicles, and
entertainment for content recommendation systems.

Conclusion

As AI continues to evolve, it's important to understand both its capabilities
and limitations. The future of AI holds tremendous potential for solving
complex problems and improving our daily lives.
`.trim();

// Demo 1: Text Chunking
console.log('\n📝 Demo 1: Text Chunking');
console.log('='.repeat(70));

function chunkText(text, chunkSize = 500, overlap = 50, strategy = 'semantic') {
  const chunks = [];

  if (strategy === 'semantic') {
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

        currentChunk = [];
        currentTokens = 0;
      }

      currentChunk.push(paragraph);
      currentTokens += tokenCount;
    });

    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.join('\n\n'),
        start_index: chunks.length,
        token_count: currentTokens,
        paragraph_count: currentChunk.length
      });
    }
  }

  return chunks;
}

const chunks = chunkText(sampleTranscript, 150, 20, 'semantic');

console.log(`\nOriginal text: ${sampleTranscript.length} characters`);
console.log(`Chunks created: ${chunks.length} chunks`);
console.log(`Total tokens: ${chunks.reduce((sum, c) => sum + c.token_count, 0)}`);

chunks.forEach((chunk, i) => {
  console.log(`\n--- Chunk ${i + 1} ---`);
  console.log(`Tokens: ${chunk.token_count}`);
  console.log(`Paragraphs: ${chunk.paragraph_count}`);
  console.log(`Text preview: "${chunk.text.substring(0, 100)}..."`);
});

// Demo 2: Transcript Cleaning
console.log('\n\n📝 Demo 2: Transcript Cleaning');
console.log('='.repeat(70));

const dirtyTranscript = `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:03.000
[Speaker 1]: Welcome to this AI tutorial

00:00:03.500 --> 00:00:08.000
Today we'll discuss machine learning basics

00:00:08.500 --> 00:00:12.000
[Speaker 2]: Let's start with definitions
`;

function cleanTranscript(transcript, removeTimestamps = true, removeSpeakers = true) {
  let cleaned = transcript;

  // Remove WEBVTT headers
  cleaned = cleaned.replace(/WEBVTT\s*/g, '');
  cleaned = cleaned.replace(/Kind:\s*\w+\s*/g, '');
  cleaned = cleaned.replace(/Language:\s*\w+\s*/g, '');

  if (removeTimestamps) {
    cleaned = cleaned.replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/g, '');
  }

  // Remove cue numbers
  cleaned = cleaned.replace(/^\d+\s*$/gm, '');

  if (removeSpeakers) {
    cleaned = cleaned.replace(/\[Speaker \d+\]:\s*/g, '');
    cleaned = cleaned.replace(/\[[A-Z\s]+\]:\s*/g, '');
  }

  // Clean up whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.trim();

  return cleaned;
}

const cleaned = cleanTranscript(dirtyTranscript, true, true);

console.log('\nOriginal transcript:');
console.log(dirtyTranscript);
console.log('\n--- After Cleaning ---');
console.log(cleaned);
console.log(`\nOriginal: ${dirtyTranscript.length} chars`);
console.log(`Cleaned: ${cleaned.length} chars`);
console.log(`Reduction: ${((dirtyTranscript.length - cleaned.length) / dirtyTranscript.length * 100).toFixed(1)}%`);

// Demo 3: Keyword Extraction
console.log('\n\n📝 Demo 3: Keyword Extraction');
console.log('='.repeat(70));

function extractKeywords(text, maxKeywords = 10) {
  const tfidf = new TfIdf();
  tfidf.addDocument(text);

  const keywords = [];
  tfidf.listTerms(0).slice(0, maxKeywords * 2).forEach(item => {
    if (item.term.length > 2 && item.tfidf > 0) {
      keywords.push({
        keyword: item.term,
        score: item.tfidf,
        frequency: text.toLowerCase().split(item.term.toLowerCase()).length - 1
      });
    }
  });

  const doc = nlp(text);
  const entities = [
    ...doc.people().out('array'),
    ...doc.places().out('array'),
    ...doc.organizations().out('array'),
  ];

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

  return keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, maxKeywords);
}

const keywords = extractKeywords(sampleTranscript, 15);

console.log(`\nExtracted ${keywords.length} keywords from ${sampleTranscript.length} characters\n`);

keywords.forEach((kw, i) => {
  const type = kw.type ? ` [${kw.type}]` : '';
  console.log(`${i + 1}. "${kw.keyword}" - Score: ${kw.score.toFixed(2)}, Frequency: ${kw.frequency}${type}`);
});

// Demo 4: Index Management (No API needed)
console.log('\n\n📝 Demo 4: Index Management (No API)');
console.log('='.repeat(70));

const DB_PATH = join(__dirname, 'data/embeddings');

if (!existsSync(DB_PATH)) {
  mkdirSync(DB_PATH, { recursive: true });
}

function createIndex(indexName, dimension = 1536, metadata = {}) {
  const indexPath = join(DB_PATH, `${indexName}.json`);

  if (existsSync(indexPath)) {
    console.log(`\n⚠️  Index '${indexName}' already exists`);
    return null;
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

  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  return index;
}

function getIndexStats(indexName) {
  const indexPath = join(DB_PATH, `${indexName}.json`);

  if (!existsSync(indexPath)) {
    return null;
  }

  const data = JSON.parse(readFileSync(indexPath, 'utf-8'));
  return {
    index_name: data.name,
    vector_count: data.vectors.length,
    dimension: data.dimension,
    created_at: new Date(data.metadata.created_at).toISOString(),
    file_size: `${(readFileSync(indexPath, 'utf-8').length / 1024).toFixed(2)} KB`,
  };
}

function deleteIndex(indexName) {
  const indexPath = join(DB_PATH, `${indexName}.json`);

  if (existsSync(indexPath)) {
    unlinkSync(indexPath);
    return true;
  }
  return false;
}

// Create a demo index
const demoIndexName = 'demo_index_' + Date.now();
console.log(`\nCreating index: ${demoIndexName}`);

const newIndex = createIndex(demoIndexName, 1536, {
  purpose: 'demonstration',
  content_type: 'video_transcripts'
});

if (newIndex) {
  console.log('✅ Index created successfully');
  console.log(`   Name: ${newIndex.name}`);
  console.log(`   Dimension: ${newIndex.dimension}`);
  console.log(`   Vectors: ${newIndex.vectors.length}`);
}

// Get stats
console.log('\nGetting index statistics:');
const stats = getIndexStats(demoIndexName);
if (stats) {
  console.log(`✅ Stats retrieved`);
  console.log(`   Vector count: ${stats.vector_count}`);
  console.log(`   Dimension: ${stats.dimension}`);
  console.log(`   Created: ${stats.created_at}`);
  console.log(`   File size: ${stats.file_size}`);
}

// Delete index
console.log('\nCleaning up - deleting demo index:');
const deleted = deleteIndex(demoIndexName);
console.log(deleted ? '✅ Index deleted successfully' : '❌ Failed to delete index');

// Summary
console.log('\n' + '='.repeat(70));
console.log('\n🎉 Demo Complete!\n');
console.log('✅ Available Features (No API Required):');
console.log('   1. Text Chunking - Split transcripts into semantic chunks');
console.log('   2. Transcript Cleaning - Remove timestamps and formatting');
console.log('   3. Keyword Extraction - Identify key terms and entities');
console.log('   4. Index Management - Create, view, and delete indices\n');

console.log('⚠️  Features Requiring API (Need OpenAI Credits):');
console.log('   1. Embedding Generation - Convert text to vectors');
console.log('   2. Semantic Search - Find similar content');
console.log('   3. Audio Transcription - Convert speech to text\n');

console.log('💡 Next Steps:');
console.log('   • Add credits to OpenAI account to unlock API features');
console.log('   • Read USER_GUIDE.md for complete usage instructions');
console.log('   • Review TEST_RESULTS.md for testing details\n');
