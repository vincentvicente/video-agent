#!/usr/bin/env node

// Video RAG Agent - Test Script

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 Running Video RAG Agent Tests...\n');

// Test results
let passed = 0;
let failed = 0;

// Helper function
function test(name, condition, errorMsg = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    if (errorMsg) console.log(`   ${errorMsg}`);
    failed++;
  }
}

// Test 1: Directory structure
console.log('📁 Testing directory structure...');
test('data/ exists', existsSync(join(projectRoot, 'data')));
test('data/videos/ exists', existsSync(join(projectRoot, 'data/videos')));
test('data/chunks/ exists', existsSync(join(projectRoot, 'data/chunks')));
test('data/embeddings/ exists', existsSync(join(projectRoot, 'data/embeddings')));
test('data/cache/ exists', existsSync(join(projectRoot, 'data/cache')));
test('mcp-servers/ exists', existsSync(join(projectRoot, 'mcp-servers')));
test('skills/ exists', existsSync(join(projectRoot, 'skills')));
test('config/ exists', existsSync(join(projectRoot, 'config')));
console.log('');

// Test 2: Configuration files
console.log('⚙️  Testing configuration files...');
test('package.json exists', existsSync(join(projectRoot, 'package.json')));
test('README.md exists', existsSync(join(projectRoot, 'README.md')));
test('.env.example exists', existsSync(join(projectRoot, '.env.example')));
test('.gitignore exists', existsSync(join(projectRoot, '.gitignore')));
test('config/mcp-config.json exists', existsSync(join(projectRoot, 'config/mcp-config.json')));
console.log('');

// Test 3: MCP server directories
console.log('🔧 Testing MCP server structure...');
test('text-chunker/ exists', existsSync(join(projectRoot, 'mcp-servers/text-chunker')));
test('vector-db/ exists', existsSync(join(projectRoot, 'mcp-servers/vector-db')));
test('video-processor/ exists', existsSync(join(projectRoot, 'mcp-servers/video-processor')));
console.log('');

// Test 4: Skills directories
console.log('🎯 Testing skills structure...');
test('skills/core/ exists', existsSync(join(projectRoot, 'skills/core')));
test('skills/composite/ exists', existsSync(join(projectRoot, 'skills/composite')));
console.log('');

// Test 5: Environment
console.log('🌍 Testing environment...');
const hasEnv = existsSync(join(projectRoot, '.env'));
test('.env exists', hasEnv, hasEnv ? '' : 'Run: cp .env.example .env');

if (hasEnv) {
  // Test if OPENAI_API_KEY is set
  const { config } = await import('dotenv');
  config({ path: join(projectRoot, '.env') });

  const hasApiKey = process.env.OPENAI_API_KEY &&
                    process.env.OPENAI_API_KEY !== 'sk-your-api-key-here';
  test('OPENAI_API_KEY is set', hasApiKey,
       hasApiKey ? '' : 'Edit .env and add your OpenAI API key');
}
console.log('');

// Test 6: Node modules
console.log('📦 Testing dependencies...');
const hasNodeModules = existsSync(join(projectRoot, 'node_modules'));
test('node_modules/ exists', hasNodeModules,
     hasNodeModules ? '' : 'Run: npm install');
console.log('');

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ All tests passed! System is ready.\n');
  console.log('📋 Next steps:');
  console.log('1. Implement MCP servers (Phase 2)');
  console.log('2. Write Skills configurations (Phase 3)');
  console.log('3. Run end-to-end tests\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please fix the issues above.\n');
  process.exit(1);
}
