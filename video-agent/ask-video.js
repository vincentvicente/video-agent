#!/usr/bin/env node

/**
 * Interactive Video Q&A System
 * Usage: node ask-video.js "你的问题"
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

async function askVideo(question) {
  console.log('\n🤔 问题:', question);
  console.log('='.repeat(80));

  // Load knowledge base
  const dbPath = join(__dirname, 'data/embeddings', `${VIDEO_ID}.json`);
  const vectorDb = JSON.parse(readFileSync(dbPath, 'utf-8'));

  console.log('\n🔍 搜索知识库...');

  // Get query embedding
  const queryResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });

  const queryVector = queryResponse.data[0].embedding;

  // Find most relevant chunks
  const similarities = vectorDb.vectors.map(emb => ({
    id: emb.id,
    similarity: cosineSimilarity(queryVector, emb.vector),
    text: emb.text
  })).sort((a, b) => b.similarity - a.similarity);

  // Get top 3 most relevant chunks
  const topChunks = similarities.slice(0, 3);

  console.log(`✅ 找到 ${topChunks.length} 个相关片段\n`);

  // Extract timestamps
  topChunks.forEach((chunk, idx) => {
    const timestampMatch = chunk.text.match(/(\d{2}:\d{2}:\d{2}\.\d{3})/);
    const timestamp = timestampMatch ? timestampMatch[1] : '未知';

    const cleanText = chunk.text
      .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '')
      .replace(/\n+/g, ' ')
      .replace(/WEBVTT/g, '')
      .trim();

    console.log(`📍 片段 ${idx + 1} [匹配度: ${(chunk.similarity * 100).toFixed(1)}%] [时间: ${timestamp.substring(0, 8)}]`);
    console.log(`   ${cleanText.substring(0, 300)}${cleanText.length > 300 ? '...' : ''}\n`);
  });

  // Generate answer using GPT
  console.log('💡 AI 回答:\n');

  const context = topChunks.map(c => c.text).join('\n\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: '你是一个视频内容助手。基于提供的视频转录内容，准确回答用户的问题。如果内容中没有相关信息，请明确说明。'
      },
      {
        role: 'user',
        content: `视频转录内容：\n\n${context}\n\n问题：${question}`
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });

  const answer = completion.choices[0].message.content;
  console.log(answer);

  console.log('\n' + '='.repeat(80));
  console.log('\n💰 本次查询成本: ~$0.0001 (约0.01分)');
  console.log('📺 视频链接:', vectorDb.video_url);
  console.log('\n');
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

// Get question from command line
const question = process.argv.slice(2).join(' ');

if (!question) {
  console.log('\n❌ 请提供问题');
  console.log('\n使用方法:');
  console.log('  node ask-video.js "你的问题"\n');
  console.log('示例:');
  console.log('  node ask-video.js "Transformer的核心创新是什么？"');
  console.log('  node ask-video.js "视频中提到了哪些公司？"');
  console.log('  node ask-video.js "什么是注意力机制？"\n');
  process.exit(1);
}

askVideo(question);
