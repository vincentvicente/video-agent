#!/usr/bin/env node

/**
 * Show Knowledge Base Details
 */

import { readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VIDEO_ID = '_VaEjGnHgOI';

console.log('📚 本地知识库详情\n');
console.log('='.repeat(80));

// Load vector database
const dbPath = join(__dirname, 'data/embeddings', `${VIDEO_ID}.json`);
const vectorDb = JSON.parse(readFileSync(dbPath, 'utf-8'));

// Load transcript
const transcriptPath = join(__dirname, 'data/transcripts', `${VIDEO_ID}.vtt`);
const transcript = readFileSync(transcriptPath, 'utf-8');

// File stats
const dbStats = statSync(dbPath);
const transcriptStats = statSync(transcriptPath);

console.log('\n📊 知识库统计\n');
console.log('基本信息:');
console.log(`  视频ID:      ${vectorDb.name}`);
console.log(`  视频URL:     ${vectorDb.video_url}`);
console.log(`  语言:        ${vectorDb.metadata.language}`);
console.log(`  时长:        ${Math.floor(vectorDb.metadata.duration / 60)}分${Math.floor(vectorDb.metadata.duration % 60)}秒`);
console.log(`  创建时间:    ${new Date(vectorDb.metadata.created_at).toLocaleString('zh-CN')}`);

console.log('\n向量数据库:');
console.log(`  向量维度:    ${vectorDb.dimension} 维`);
console.log(`  向量数量:    ${vectorDb.vectors.length} 个`);
console.log(`  语义块数:    ${vectorDb.metadata.chunk_count} 块`);
console.log(`  文件大小:    ${(dbStats.size / 1024).toFixed(1)} KB`);

console.log('\n转录文本:');
console.log(`  文件路径:    ${transcriptPath}`);
console.log(`  文件大小:    ${(transcriptStats.size / 1024).toFixed(1)} KB`);
console.log(`  字符数:      ${transcript.length.toLocaleString()} 字符`);
console.log(`  行数:        ${transcript.split('\n').length.toLocaleString()} 行`);

console.log('\n📁 文件位置:\n');
console.log('  1. 原始视频:');
console.log(`     ${join(__dirname, 'data/videos', `${VIDEO_ID}.mp4`)}`);
console.log('\n  2. 音频文件:');
console.log(`     ${join(__dirname, 'data/audio', `${VIDEO_ID}.wav`)}`);
console.log('\n  3. 转录文本 (VTT):');
console.log(`     ${transcriptPath}`);
console.log('\n  4. 向量数据库 (JSON):');
console.log(`     ${dbPath}`);

console.log('\n✨ 知识库能力:\n');
console.log('  ✅ 全文搜索      - 支持关键词查找');
console.log('  ✅ 语义搜索      - 基于AI理解的智能搜索');
console.log('  ✅ 问答系统      - 回答视频相关问题');
console.log('  ✅ 内容总结      - 提取关键信息');
console.log('  ✅ 时间戳定位    - 精确到秒的内容定位');
console.log('  ✅ 完全离线      - 转录本地存储，无需网络');

console.log('\n🔍 示例查询:\n');

// Show sample content
const sampleChunk = vectorDb.vectors[0];
const sampleText = sampleChunk.text
  .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '')
  .replace(/\n+/g, ' ')
  .trim();

console.log('  向量块示例 #1:');
console.log(`  "${sampleText.substring(0, 150)}..."\n`);

console.log('💡 使用方法:\n');
console.log('  方法1 - 语义搜索:');
console.log('    node search-video-content.js');
console.log('\n  方法2 - 查看转录:');
console.log('    cat data/transcripts/_VaEjGnHgOI.vtt');
console.log('\n  方法3 - 在Claude Code中提问:');
console.log('    "视频中提到了哪些公司？"');
console.log('    "Transformer的核心创新是什么？"');
console.log('    "注意力机制是如何工作的？"\n');

console.log('='.repeat(80));
console.log('\n✅ 知识库就绪，随时可以查询！\n');
