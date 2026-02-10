# Phase 4 - Testing & Integration Plan

> Comprehensive testing strategy for Video RAG Agent system

**Version**: 1.0
**Date**: 2026-02-07
**Status**: Ready to Execute

---

## 📋 Testing Overview

### Objectives
1. Verify all MCP servers function correctly
2. Test each skill individually
3. Validate end-to-end workflows
4. Identify and fix issues
5. Optimize performance
6. Create user documentation

### Scope
- 3 MCP servers (12 tools)
- 5 Claude Skills
- Complete workflows
- Error scenarios
- Performance benchmarks

---

## 🔧 Phase 4.1: MCP Server Configuration

### 4.1.1 Install MCP Configuration

**Action**: Copy MCP config to Claude's configuration

**Steps**:
1. Locate Claude config directory (typically `~/.claude/`)
2. Copy `config/mcp-config.json` contents
3. Merge with existing Claude MCP config
4. Restart Claude to load servers

**Verification**:
- [ ] All 3 servers appear in Claude's MCP server list
- [ ] No connection errors in logs
- [ ] Servers respond to list_tools request

---

### 4.1.2 Environment Setup

**Action**: Ensure OPENAI_API_KEY is configured

**Steps**:
1. Check `.env` file has valid API key
2. Verify API key has required permissions
3. Test API connection

**Verification**:
```bash
# Test OpenAI API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

Expected: List of available models

---

### 4.1.3 Server Health Check

**Action**: Verify each MCP server starts correctly

**Test Commands**:
```bash
# Test text-chunker
cd mcp-servers/text-chunker
node index.js

# Test vector-db
cd mcp-servers/vector-db
node index.js

# Test video-processor
cd mcp-servers/video-processor
node index.js
```

**Expected Output**:
- "MCP server running on stdio" message
- No errors
- Server waits for input

**Verification**:
- [ ] text-chunker server starts
- [ ] vector-db server starts
- [ ] video-processor server starts

---

## 🧪 Phase 4.2: Individual Tool Testing

### 4.2.1 Text Chunker Tools

#### Test 1: chunk_text
**Input**:
```json
{
  "text": "AI agents are autonomous systems. They can perceive their environment. They make decisions based on observations.",
  "chunk_size": 50,
  "overlap": 10,
  "strategy": "sentence"
}
```

**Expected Output**:
- Multiple chunks returned
- Each chunk has text, token_count, sentence_count
- Overlap between adjacent chunks

**Pass Criteria**:
- [ ] Returns valid chunks
- [ ] Chunks respect sentence boundaries
- [ ] Overlap is preserved
- [ ] Token counts are accurate

---

#### Test 2: clean_transcript
**Input**:
```json
{
  "transcript": "WEBVTT\n\n00:00:00.000 --> 00:00:03.000\nHello world\n\n00:00:03.500 --> 00:00:06.000\n[Speaker 1]: This is a test",
  "remove_timestamps": true,
  "remove_speakers": true
}
```

**Expected Output**:
```json
{
  "cleaned_text": "Hello world This is a test",
  "original_length": ...,
  "cleaned_length": ...,
  "reduction_percent": "..."
}
```

**Pass Criteria**:
- [ ] WEBVTT header removed
- [ ] Timestamps removed
- [ ] Speaker labels removed
- [ ] Text is clean and readable

---

#### Test 3: extract_keywords
**Input**:
```json
{
  "text": "Artificial intelligence agents are becoming increasingly important in modern AI systems. Machine learning enables agents to learn from experience.",
  "max_keywords": 5
}
```

**Expected Output**:
- List of keywords with scores
- Keywords ranked by relevance
- May include entities

**Pass Criteria**:
- [ ] Returns keywords
- [ ] Keywords are relevant
- [ ] Scores are meaningful
- [ ] Count respects max_keywords

---

### 4.2.2 Vector DB Tools

#### Test 4: create_index
**Input**:
```json
{
  "index_name": "test_index",
  "dimension": 1536,
  "metadata": {
    "purpose": "testing"
  }
}
```

**Expected Output**:
```json
{
  "index_name": "test_index",
  "dimension": 1536,
  "vector_count": 0,
  "created_at": ...,
  "metadata": {...}
}
```

**Pass Criteria**:
- [ ] Index file created
- [ ] Metadata stored correctly
- [ ] Returns success response

---

#### Test 5: store_embeddings
**Preparation**: Generate a sample embedding first

**Input**:
```json
{
  "index_name": "test_index",
  "chunks": [
    {
      "text": "AI agents are autonomous systems",
      "embedding": [0.123, -0.456, ...],
      "metadata": {
        "source": "test"
      }
    }
  ]
}
```

**Expected Output**:
```json
{
  "index_name": "test_index",
  "stored_count": 1,
  "total_vectors": 1
}
```

**Pass Criteria**:
- [ ] Vectors stored in index
- [ ] Metadata preserved
- [ ] Count updated correctly

---

#### Test 6: search_similar
**Requirement**: Index must have vectors from Test 5

**Input**:
```json
{
  "index_name": "test_index",
  "query": "What are autonomous agents?",
  "top_k": 3
}
```

**Expected Output**:
- List of similar vectors
- Similarity scores (0-1 range)
- Results sorted by similarity

**Pass Criteria**:
- [ ] Returns results
- [ ] Similarity scores make sense
- [ ] Results are sorted
- [ ] Top result is most relevant

---

#### Test 7: get_index_stats
**Input**:
```json
{
  "index_name": "test_index"
}
```

**Expected Output**:
```json
{
  "index_name": "test_index",
  "vector_count": 1,
  "dimension": 1536,
  "created_at": ...,
  "metadata": {...}
}
```

**Pass Criteria**:
- [ ] Returns correct statistics
- [ ] Vector count matches stored vectors

---

#### Test 8: delete_index
**Input**:
```json
{
  "index_name": "test_index"
}
```

**Expected Output**:
```json
{
  "index_name": "test_index",
  "deleted": true
}
```

**Pass Criteria**:
- [ ] Index file deleted
- [ ] Returns success
- [ ] Subsequent stats query fails appropriately

---

### 4.2.3 Video Processor Tools

#### Test 9: download_video
**Input**:
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "output_name": "test_video.mp4"
}
```

**Expected Output**:
- Video metadata (title, duration, etc.)
- File path to downloaded video
- File size

**Pass Criteria**:
- [ ] Video downloads successfully
- [ ] Metadata is accurate
- [ ] File exists at specified path

**⚠️ Note**: This test requires internet connection and may take time

---

#### Test 10: extract_audio
**Preparation**: Use video from Test 9

**Input**:
```json
{
  "video_path": "/path/to/test_video.mp4",
  "output_format": "wav"
}
```

**Expected Output**:
- Audio file path
- File size
- Format details (channels, sample_rate)

**Pass Criteria**:
- [ ] Audio extracted successfully
- [ ] Format is correct (16kHz mono)
- [ ] File exists and is playable

---

#### Test 11: transcribe_audio
**Preparation**: Use audio from Test 10
**Requirement**: Valid OPENAI_API_KEY

**Input**:
```json
{
  "audio_path": "/path/to/audio.wav",
  "response_format": "vtt"
}
```

**Expected Output**:
- Transcript file path
- Transcript preview
- Language detected

**Pass Criteria**:
- [ ] Transcription completes
- [ ] VTT format is valid
- [ ] Text is accurate

**⚠️ Note**: This test will consume OpenAI API credits

---

#### Test 12: process_video
**Integration test**: Complete pipeline

**Input**:
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "options": {
    "audio_format": "wav",
    "transcript_format": "vtt",
    "keep_video": false,
    "keep_audio": false
  }
}
```

**Expected Output**:
- Complete processing report
- All steps successful
- Files created and optionally cleaned up

**Pass Criteria**:
- [ ] Video downloads
- [ ] Audio extracted
- [ ] Transcription completes
- [ ] Cleanup works as specified
- [ ] All steps tracked

---

## 🎯 Phase 4.3: Skill Testing

### 4.3.1 process-video Skill

**Test**: Complete video processing workflow

**Steps**:
1. Create test index: `test_videos`
2. Process a short video (<5 min)
3. Verify all steps complete
4. Check index has vectors

**Expected Workflow**:
```
Download → Extract → Transcribe → Clean → Chunk → Embed → Index
```

**Verification**:
- [ ] Video processes without errors
- [ ] Transcript is generated
- [ ] Chunks are created
- [ ] Embeddings are stored
- [ ] Index contains new vectors

**Sample Command**:
```
Use process-video skill:
- url: "https://youtube.com/watch?v=..."
- index_name: "test_videos"
- keep_video: false
- keep_audio: false
```

---

### 4.3.2 search-knowledge Skill

**Test**: Search processed video content

**Prerequisites**: Completed 4.3.1

**Steps**:
1. Search for content related to video
2. Verify results are relevant
3. Check similarity scores

**Verification**:
- [ ] Returns search results
- [ ] Results are relevant
- [ ] Similarity scores >0.7
- [ ] Metadata included

**Sample Command**:
```
Use search-knowledge skill:
- query: "What is this video about?"
- index_name: "test_videos"
- top_k: 5
```

---

### 4.3.3 summarize-topic Skill

**Test**: Generate summary from video

**Prerequisites**: Completed 4.3.1

**Steps**:
1. Request summary of video topic
2. Try different styles (brief, detailed, bullets)
3. Verify source attribution

**Verification**:
- [ ] Summary is coherent
- [ ] Content is accurate
- [ ] Sources are cited
- [ ] Different styles work

**Sample Commands**:
```
Use summarize-topic skill:
- topic: "main concepts in the video"
- index_name: "test_videos"
- style: "detailed"

Try again with style: "brief"
Try again with style: "bullet_points"
```

---

### 4.3.4 export-data Skill

**Test**: Export processed data

**Prerequisites**: Completed 4.3.1

**Steps**:
1. Export in JSON format
2. Export in CSV format
3. Export in Markdown format
4. Verify file contents

**Verification**:
- [ ] Files created successfully
- [ ] Data is complete
- [ ] Formats are valid
- [ ] All metadata preserved

**Sample Commands**:
```
Use export-data skill:
- index_name: "test_videos"
- format: "json"
- output_path: "./test_exports/"

Repeat with format: "csv"
Repeat with format: "markdown"
```

---

### 4.3.5 manage-index Skill

**Test**: Index management operations

**Steps**:
1. List all indices
2. Get stats for test_videos
3. Create new index
4. Optimize index (if implemented)
5. Delete test index

**Verification**:
- [ ] List shows all indices
- [ ] Stats are accurate
- [ ] Create works
- [ ] Delete works
- [ ] Cleanup is complete

**Sample Commands**:
```
Use manage-index skill:
- action: "list"

- action: "stats"
- index_name: "test_videos"

- action: "create"
- index_name: "new_test_index"

- action: "delete"
- index_name: "new_test_index"
```

---

## 🔄 Phase 4.4: End-to-End Workflows

### Workflow 1: Complete Video Processing
**Scenario**: Process a video and ask questions

**Steps**:
1. Create index: `demo_index`
2. Process video (5-10 min video)
3. Search for specific information
4. Generate summary
5. Export results
6. Clean up

**Expected Duration**: 5-10 minutes

**Success Criteria**:
- [ ] All steps complete without errors
- [ ] Search returns relevant results
- [ ] Summary is accurate
- [ ] Export files are valid

---

### Workflow 2: Multi-Video Knowledge Base
**Scenario**: Build knowledge base from multiple videos

**Steps**:
1. Create index: `multi_video_index`
2. Process 3 different videos on same topic
3. Search across all videos
4. Generate cross-video summary
5. Export complete knowledge base

**Expected Duration**: 15-30 minutes

**Success Criteria**:
- [ ] All videos process successfully
- [ ] Search finds content from multiple sources
- [ ] Summary integrates information
- [ ] Knowledge base is coherent

---

### Workflow 3: Maintenance Operations
**Scenario**: Manage indices and data

**Steps**:
1. List all indices
2. Check statistics for each
3. Optimize large indices
4. Export for backup
5. Delete old indices

**Expected Duration**: 2-3 minutes

**Success Criteria**:
- [ ] All indices visible
- [ ] Statistics accurate
- [ ] Backups created
- [ ] Cleanup successful

---

## 🐛 Phase 4.5: Error Scenario Testing

### Error Test 1: Invalid URL
**Test**: Try to process invalid video URL

**Input**: Invalid or restricted video URL

**Expected**: Graceful error with helpful message

**Pass Criteria**:
- [ ] Error is caught
- [ ] Message explains the issue
- [ ] No partial files created

---

### Error Test 2: Missing API Key
**Test**: Attempt operations without API key

**Setup**: Temporarily unset OPENAI_API_KEY

**Expected**: Clear error about missing API key

**Pass Criteria**:
- [ ] Error is detected early
- [ ] Message instructs how to fix
- [ ] No charges incurred

---

### Error Test 3: Large File
**Test**: Process video with audio >25MB

**Expected**: Error about Whisper size limit

**Pass Criteria**:
- [ ] Size check happens before API call
- [ ] Helpful error message
- [ ] Suggests solutions (split audio)

---

### Error Test 4: Nonexistent Index
**Test**: Search in index that doesn't exist

**Expected**: Error with list of available indices

**Pass Criteria**:
- [ ] Error is informative
- [ ] Lists available indices
- [ ] Suggests correct names

---

### Error Test 5: Duplicate Index Creation
**Test**: Try to create index that already exists

**Expected**: Error explaining index exists

**Pass Criteria**:
- [ ] Detects duplicate
- [ ] Suggests using existing or choosing new name
- [ ] No data corruption

---

## ⚡ Phase 4.6: Performance Testing

### Performance Test 1: Processing Speed
**Test**: Measure time for each operation

**Metrics to Record**:
- Video download time (per MB)
- Audio extraction time (per minute of video)
- Transcription time (per minute of audio)
- Chunking time (per 1K tokens)
- Embedding time (per chunk)
- Search time (for different index sizes)

**Targets**:
- Download: Depends on connection
- Audio extraction: <2 min per hour of video
- Transcription: <1 min per hour of audio
- Chunking: <1 sec per 10K tokens
- Embedding: <5 sec per chunk
- Search: <1 sec for <10K vectors

---

### Performance Test 2: Scalability
**Test**: Performance with growing index size

**Test Cases**:
- 10 vectors
- 100 vectors
- 1,000 vectors
- 10,000 vectors

**Measure**:
- Search time
- Memory usage
- Index file size

**Expected**:
- Linear time growth (O(n) search)
- Acceptable up to 10K vectors

---

### Performance Test 3: API Cost
**Test**: Track OpenAI API usage

**Metrics**:
- Embedding API calls
- Whisper API calls
- Total cost per video

**Estimate for 1-hour video**:
- Whisper: $0.36
- Embeddings: ~$0.02-0.05
- **Total**: ~$0.40 per hour of video

---

## 📝 Phase 4.7: Documentation

### 4.7.1 User Guide
Create comprehensive user guide covering:
- [ ] Installation
- [ ] Configuration
- [ ] Basic usage
- [ ] Advanced features
- [ ] Troubleshooting

---

### 4.7.2 Quick Start Tutorial
Create step-by-step tutorial:
- [ ] First video processing
- [ ] Searching knowledge base
- [ ] Generating summaries
- [ ] Exporting data

---

### 4.7.3 API Reference
Document all tools:
- [ ] Tool parameters
- [ ] Return values
- [ ] Error codes
- [ ] Examples

---

### 4.7.4 Video Demonstrations
Optional: Create demo videos:
- [ ] System overview
- [ ] Processing first video
- [ ] Search and summarization
- [ ] Advanced workflows

---

## ✅ Acceptance Criteria

### System is ready for production when:

**Functionality** (Must Have):
- [ ] All 12 tools work correctly
- [ ] All 5 skills execute without errors
- [ ] End-to-end workflows complete successfully
- [ ] Error handling is robust

**Performance** (Must Have):
- [ ] Processing completes in reasonable time
- [ ] Search responds in <1 second
- [ ] Memory usage is acceptable
- [ ] No memory leaks

**Documentation** (Must Have):
- [ ] User guide completed
- [ ] Quick start tutorial available
- [ ] README files updated
- [ ] Troubleshooting guide exists

**Quality** (Nice to Have):
- [ ] Performance optimizations applied
- [ ] Edge cases handled
- [ ] User feedback incorporated
- [ ] Code reviewed

---

## 📊 Test Execution Checklist

### Pre-Test Setup
- [ ] OPENAI_API_KEY configured
- [ ] MCP servers configured in Claude
- [ ] All dependencies installed
- [ ] Test data prepared

### Tool Tests (12 tests)
- [ ] chunk_text
- [ ] clean_transcript
- [ ] extract_keywords
- [ ] create_index
- [ ] store_embeddings
- [ ] search_similar
- [ ] get_index_stats
- [ ] delete_index
- [ ] download_video
- [ ] extract_audio
- [ ] transcribe_audio
- [ ] process_video

### Skill Tests (5 skills)
- [ ] process-video
- [ ] search-knowledge
- [ ] summarize-topic
- [ ] export-data
- [ ] manage-index

### Workflow Tests (3 workflows)
- [ ] Complete video processing
- [ ] Multi-video knowledge base
- [ ] Maintenance operations

### Error Tests (5 scenarios)
- [ ] Invalid URL
- [ ] Missing API key
- [ ] Large file
- [ ] Nonexistent index
- [ ] Duplicate index

### Performance Tests (3 tests)
- [ ] Processing speed
- [ ] Scalability
- [ ] API cost tracking

### Documentation (4 items)
- [ ] User guide
- [ ] Quick start
- [ ] API reference
- [ ] Demos (optional)

---

## 🎯 Next Actions

1. **Configure MCP servers** in Claude
2. **Run individual tool tests** (Section 4.2)
3. **Test each skill** (Section 4.3)
4. **Execute workflows** (Section 4.4)
5. **Test error scenarios** (Section 4.5)
6. **Measure performance** (Section 4.6)
7. **Create documentation** (Section 4.7)

---

**Estimated Total Time**: 6-8 hours
**Priority**: High
**Status**: Ready to begin
