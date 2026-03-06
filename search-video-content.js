#!/usr/bin/env node

/**
 * Search video content using semantic search
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VIDEO_ID = '_VaEjGnHgOI';

async function searchVideo(query) {
  const dbPath = join(__dirname, 'data/embeddings', `${VIDEO_ID}.json`);
  const vectorDb = JSON.parse(readFileSync(dbPath, 'utf-8'));

  console.log(`\n🔍 Query: "${query}"\n`);

  const queryResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  const queryVector = queryResponse.data[0].embedding;

  const similarities = vectorDb.vectors.map(emb => ({
    id: emb.id,
    similarity: cosineSimilarity(queryVector, emb.vector),
    text: emb.text
  })).sort((a, b) => b.similarity - a.similarity);

  console.log('📊 Top 5 Results:\n');
  similarities.slice(0, 5).forEach((result, idx) => {
    const cleanText = result.text.replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '')
                                 .replace(/\n+/g, ' ')
                                 .trim();
    console.log(`${idx + 1}. [${(result.similarity * 100).toFixed(1)}% match]`);
    console.log(`   ${cleanText.substring(0, 200)}...\n`);
  });
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

// Multiple queries
async function analyzeVideo() {
  const queries = [
    "这个视频的主要内容是什么？",
    "Transformer架构的核心创新",
    "论文作者后来做了什么？",
    "为什么说Attention is all you need？"
  ];

  for (const query of queries) {
    await searchVideo(query);
  }
}

analyzeVideo();
