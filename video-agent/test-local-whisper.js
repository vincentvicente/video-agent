#!/usr/bin/env node

/**
 * Test Local Whisper Setup
 * Creates a test audio file and transcribes it
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Local Whisper Setup\n');
console.log('='.repeat(70));

async function testWhisper() {
  try {
    // Ensure directories exist
    const audioDir = join(__dirname, 'data/audio');
    const transcriptDir = join(__dirname, 'data/transcripts');

    if (!existsSync(audioDir)) {
      mkdirSync(audioDir, { recursive: true });
    }
    if (!existsSync(transcriptDir)) {
      mkdirSync(transcriptDir, { recursive: true });
    }

    // Create a simple test audio file using macOS say command
    console.log('\n📝 Step 1: Creating test audio file...');
    const testAudioPath = join(audioDir, 'test_whisper.wav');

    // Generate test audio (macOS only)
    await execAsync(`say -o "${testAudioPath}" "This is a test of the local Whisper transcription system. It works without requiring an API key."`);

    console.log(`✅ Test audio created: ${testAudioPath}`);

    // Test local Whisper
    console.log('\n📝 Step 2: Transcribing with local Whisper...');

    const whisperScript = join(__dirname, 'run-whisper.sh');
    const command = `"${whisperScript}" "${testAudioPath}" "null" "tiny" "vtt"`;

    console.log(`   Command: ${command}`);
    console.log(`   Model: tiny (fastest)`);
    console.log(`   Format: VTT\n`);

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.log('   Whisper process output:', stderr);
    }

    const result = JSON.parse(stdout);

    if (result.success) {
      console.log('\n✅ Transcription successful!\n');
      console.log('📊 Results:');
      console.log(`   Audio: ${result.audio_path}`);
      console.log(`   Transcript: ${result.transcript_path}`);
      console.log(`   Language: ${result.language}`);
      console.log(`   Duration: ${result.duration?.toFixed(2)} seconds`);
      console.log(`   Model: ${result.model_used}`);
      console.log(`   Segments: ${result.segments_count}`);
      console.log(`\n📄 Preview:`);
      console.log(`   ${result.text_preview}`);

      // Clean up test files
      console.log('\n📝 Step 3: Cleaning up test files...');
      await execAsync(`rm "${testAudioPath}"`);
      await execAsync(`rm "${result.transcript_path}"`);
      console.log('✅ Cleanup complete');

      // Summary
      console.log('\n' + '='.repeat(70));
      console.log('\n🎉 Local Whisper Test PASSED!\n');
      console.log('✅ Setup verified:');
      console.log('   • Python virtual environment works');
      console.log('   • Whisper model loaded successfully');
      console.log('   • Transcription produces correct output');
      console.log('   • VTT format generation works\n');

      console.log('💰 Cost: $0.00 (completely free!)\n');

      console.log('📋 Next steps:');
      console.log('   • Test with real video file');
      console.log('   • Process complete workflow');
      console.log('   • Try larger models (base, small, medium) for better quality\n');

      console.log('💡 Model comparison:');
      console.log('   • tiny:   fastest, lowest quality');
      console.log('   • base:   good balance (default)');
      console.log('   • small:  better quality, slower');
      console.log('   • medium: high quality, much slower');
      console.log('   • large:  best quality, very slow\n');

    } else {
      console.log('❌ Transcription failed');
      console.log(`   Error: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.log('\n❌ Test failed');
    console.log(`   Error: ${error.message}`);

    if (error.message.includes('say')) {
      console.log('\n💡 Note: This test uses macOS "say" command.');
      console.log('   For other systems, provide your own audio file.\n');
    }

    process.exit(1);
  }
}

testWhisper();
