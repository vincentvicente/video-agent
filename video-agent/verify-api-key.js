#!/usr/bin/env node

/**
 * Verify OpenAI API Key Configuration
 */

import OpenAI from 'openai';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env') });

console.log('🔑 Verifying OpenAI API Key...\n');

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey || apiKey === 'sk-your-api-key-here') {
  console.log('❌ API Key not configured properly');
  console.log('   Please set OPENAI_API_KEY in .env file\n');
  process.exit(1);
}

console.log('✅ API Key found in .env');
console.log(`   Format: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`   Length: ${apiKey.length} characters\n`);

// Initialize OpenAI client
const openai = new OpenAI({ apiKey });

console.log('🧪 Testing API connection...\n');

async function testAPI() {
  try {
    // Test 1: List models (simple API call)
    console.log('Test 1: Listing available models...');
    const models = await openai.models.list();
    const modelCount = models.data.length;
    console.log(`✅ Success! Found ${modelCount} available models\n`);

    // Test 2: Generate a simple embedding
    console.log('Test 2: Generating test embedding...');
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'This is a test sentence for embedding generation.',
    });

    const embeddingVector = embedding.data[0].embedding;
    console.log(`✅ Success! Generated ${embeddingVector.length}-dimensional embedding\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('🎉 API Key Verification Complete!\n');
    console.log('✅ All tests passed:');
    console.log('   1. API connection successful');
    console.log('   2. Models accessible');
    console.log('   3. Embeddings API working\n');
    console.log('📋 Your system is ready to:');
    console.log('   • Generate embeddings for text chunks');
    console.log('   • Store vectors in the database');
    console.log('   • Perform semantic search');
    console.log('   • Transcribe audio (Whisper API)\n');
    console.log('🚀 You can now run the full integration tests!\n');

  } catch (error) {
    console.log('❌ API Test Failed\n');
    console.log('Error details:');
    console.log(`   Type: ${error.constructor.name}`);
    console.log(`   Message: ${error.message}\n`);

    if (error.status === 401) {
      console.log('💡 This looks like an authentication error.');
      console.log('   Please check that your API key is correct.\n');
    } else if (error.status === 429) {
      console.log('💡 Rate limit or quota issue.');
      console.log('   Please check your OpenAI account has credits.\n');
    } else {
      console.log('💡 Unexpected error.');
      console.log('   Please check your internet connection and try again.\n');
    }

    process.exit(1);
  }
}

testAPI();
