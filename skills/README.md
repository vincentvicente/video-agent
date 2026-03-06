# Video RAG Agent Skills

> Claude Skills for orchestrating video processing, indexing, search, and knowledge management

## 📋 Available Skills

### 1. process-video
**Process a video through the complete RAG pipeline**

- Download video from URL (YouTube)
- Extract and transcribe audio
- Clean and chunk transcript
- Generate embeddings
- Store in vector database

**Usage**:
```
/process-video url="https://youtube.com/watch?v=xxx" index_name="my_index"
```

**When to use**: Adding new videos to knowledge base

**See**: [process-video.md](./process-video.md)

---

### 2. search-knowledge
**Search the video knowledge base using semantic similarity**

- Query vector database
- Find relevant content across all videos
- Return ranked results with metadata

**Usage**:
```
/search-knowledge query="What are AI agents?" index_name="my_index"
```

**When to use**: Finding specific information or answering questions

**See**: [search-knowledge.md](./search-knowledge.md)

---

### 3. summarize-topic
**Generate comprehensive summaries across multiple videos**

- Multi-query search
- Aggregate results
- Generate coherent summary
- Include source attribution

**Usage**:
```
/summarize-topic topic="AI agents architecture" index_name="my_index" style="detailed"
```

**When to use**: Understanding topics across multiple sources

**See**: [summarize-topic.md](./summarize-topic.md)

---

### 4. export-data
**Export processed data in various formats**

- Export transcripts, chunks, or embeddings
- Multiple format support (JSON, CSV, Markdown, Text)
- Filtering and customization options

**Usage**:
```
/export-data index_name="my_index" format="json" output_path="./export/"
```

**When to use**: Backup, sharing, or data analysis

**See**: [export-data.md](./export-data.md)

---

### 5. manage-index
**Manage vector indices**

- List all indices
- Create new indices
- View statistics
- Delete indices
- Optimize performance

**Usage**:
```
/manage-index action="list"
/manage-index action="stats" index_name="my_index"
```

**When to use**: Index administration and maintenance

**See**: [manage-index.md](./manage-index.md)

---

## 🚀 Quick Start Guide

### Initial Setup
```bash
# 1. Create your first index
/manage-index action="create" index_name="ai_tutorials"

# 2. Process your first video
/process-video url="https://youtube.com/watch?v=xxx" index_name="ai_tutorials"

# 3. Check the index
/manage-index action="stats" index_name="ai_tutorials"
```

### Daily Usage
```bash
# Search for information
/search-knowledge query="How do transformers work?" index_name="ai_tutorials"

# Generate a summary
/summarize-topic topic="transformer architecture" index_name="ai_tutorials"

# Add more videos
/process-video url="https://youtube.com/watch?v=yyy" index_name="ai_tutorials"
```

### Maintenance
```bash
# List all indices
/manage-index action="list"

# Optimize an index
/manage-index action="optimize" index_name="ai_tutorials"

# Export for backup
/export-data index_name="ai_tutorials" format="json"
```

---

## 📊 Skill Comparison

| Skill | Primary Use | Input | Output | Duration |
|-------|------------|-------|--------|----------|
| process-video | Ingest content | Video URL | Indexed chunks | 2-5 min |
| search-knowledge | Find info | Query text | Relevant passages | <1 sec |
| summarize-topic | Understand topics | Topic name | Summary | 5-10 sec |
| export-data | Backup/share | Index name | File export | 1-3 sec |
| manage-index | Administration | Action type | Status/stats | <1 sec |

---

## 🔄 Common Workflows

### Workflow 1: Process New Video Collection
```
1. Create index for the collection
   /manage-index action="create" index_name="python_course"

2. Process all videos
   /process-video url="video1" index_name="python_course"
   /process-video url="video2" index_name="python_course"
   /process-video url="video3" index_name="python_course"

3. Verify content
   /manage-index action="stats" index_name="python_course"

4. Test search
   /search-knowledge query="list comprehensions" index_name="python_course"
```

### Workflow 2: Research Question
```
1. Search for relevant information
   /search-knowledge query="What is gradient descent?" index_name="ml_course"

2. Get broader context
   /summarize-topic topic="optimization algorithms" index_name="ml_course"

3. Export findings
   /export-data index_name="ml_course" format="markdown" video_filter=["relevant_video"]
```

### Workflow 3: Knowledge Base Maintenance
```
1. Review all indices
   /manage-index action="list"

2. Check each index health
   /manage-index action="stats" index_name="index1"
   /manage-index action="stats" index_name="index2"

3. Optimize as needed
   /manage-index action="optimize" index_name="index1"

4. Backup important data
   /export-data index_name="index1" format="json"

5. Clean up old indices
   /manage-index action="delete" index_name="old_index"
```

---

## 💡 Tips and Best Practices

### Video Processing
- Process videos in batches for efficiency
- Use descriptive index names
- Set `keep_video=false` to save disk space
- Monitor API costs for long videos

### Searching
- Be specific in queries for better results
- Use metadata filters to narrow searches
- Check similarity scores (>0.8 = highly relevant)
- Try rephrasing if results aren't good

### Summarizing
- "detailed" style for learning
- "brief" style for quick overview
- "bullet_points" for reference
- Specify `max_chunks` to control depth

### Exporting
- Regular exports for backup
- JSON for re-importing
- CSV for data analysis
- Markdown for documentation

### Index Management
- One index per topic domain
- Optimize monthly
- Monitor statistics regularly
- Delete unused indices

---

## 🔧 Integration with MCP Servers

These skills orchestrate the following MCP servers:

### video-processor
- `download_video` - Download videos
- `extract_audio` - Extract audio
- `transcribe_audio` - Generate transcripts
- `process_video` - End-to-end pipeline

### text-chunker
- `chunk_text` - Split text into chunks
- `clean_transcript` - Clean transcript formatting
- `extract_keywords` - Identify key terms

### vector-db
- `create_index` - Create vector indices
- `store_embeddings` - Store vectors
- `search_similar` - Semantic search
- `get_index_stats` - Index statistics
- `delete_index` - Remove indices

---

## 📝 Skill Invocation

Skills are invoked using the `/skill-name` syntax with parameters:

```
/skill-name param1="value1" param2="value2"
```

### Parameter Types
- **String**: `name="value"`
- **Number**: `size=500`
- **Boolean**: `keep=true`
- **Array**: `videos=["video1", "video2"]`
- **Object**: `options={"key": "value"}`

### Required vs Optional
- Required parameters must be provided
- Optional parameters have defaults
- Check individual skill docs for details

---

## ⚠️ Prerequisites

### Environment Setup
- Node.js 18+ installed
- MCP servers configured
- OpenAI API key set in `.env`
- ffmpeg installed (for video processing)

### Configuration
```bash
# In .env file
OPENAI_API_KEY=sk-your-api-key-here
VIDEOS_DIR=/path/to/videos
AUDIO_DIR=/path/to/audio
TRANSCRIPTS_DIR=/path/to/transcripts
```

### First Time Setup
```bash
# 1. Install dependencies
cd ~/claude-workspace
npm install

# 2. Configure MCP servers
# Edit config/mcp-config.json

# 3. Test setup
npm test
```

---

## 🐛 Troubleshooting

### "Index doesn't exist"
- Use `/manage-index action="list"` to see available indices
- Create index with `/manage-index action="create"`

### "OPENAI_API_KEY not set"
- Check `.env` file has valid API key
- Restart Claude to reload environment

### "Video download failed"
- Verify URL is valid YouTube link
- Check internet connection
- Some videos may have restrictions

### "Transcription too large"
- Audio file exceeds 25MB Whisper limit
- Solution: Process shorter videos or split audio

### "Search returns no results"
- Index may be empty - check with `manage-index stats`
- Try broader query terms
- Verify correct index_name

---

## 📚 Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Project README](../README.md)
- [Phase 2 Summary](../PHASE2_SUMMARY.md)

---

**Version**: 1.0.0
**Skills Count**: 5
**Last Updated**: 2026-02-07
**Status**: ✅ Production Ready
