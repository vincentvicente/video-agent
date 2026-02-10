# Video RAG Agent - User Guide

> Complete guide to using the Video RAG Agent system

**Version**: 1.0.0
**Last Updated**: 2026-02-07

---

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Quick Start](#quick-start)
5. [Core Concepts](#core-concepts)
6. [Skills Reference](#skills-reference)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [FAQ](#faq)

---

## 🎯 Introduction

### What is Video RAG Agent?

Video RAG Agent is an intelligent system that:
- Processes videos from URLs (YouTube supported)
- Extracts and transcribes audio automatically
- Creates searchable knowledge base from video content
- Enables semantic search across all processed videos
- Generates summaries from multiple video sources

### Key Features

✅ **Automated Processing**: One command to go from video URL to searchable knowledge
✅ **Semantic Search**: Find relevant content using natural language queries
✅ **Cross-Video Summaries**: Generate insights across multiple videos
✅ **Flexible Export**: Export in JSON, CSV, Markdown, or Text formats
✅ **Complete Management**: Full lifecycle management of knowledge bases

### Use Cases

- 📚 **Learning**: Build searchable knowledge base from educational videos
- 🔬 **Research**: Extract and organize information from video sources
- 📝 **Note-Taking**: Automatically generate structured notes from lectures
- 🎓 **Studying**: Create summaries and Q&A from course materials
- 📊 **Analysis**: Analyze themes across video collections

---

## 🚀 Installation

### Prerequisites

Before you begin, ensure you have:

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. **ffmpeg** (for audio extraction)
   ```bash
   # macOS
   brew install ffmpeg

   # Linux
   sudo apt-get install ffmpeg

   # Verify installation
   ffmpeg -version
   ```

3. **OpenAI API Key**
   - Sign up at https://platform.openai.com/
   - Generate API key from dashboard
   - Ensure you have credits for Embeddings and Whisper APIs

### System Installation

1. **Navigate to project directory**
   ```bash
   cd ~/claude-workspace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install MCP server dependencies**
   ```bash
   cd mcp-servers/text-chunker && npm install && cd ../..
   cd mcp-servers/vector-db && npm install && cd ../..
   cd mcp-servers/video-processor && npm install && cd ../..
   ```

4. **Verify installation**
   ```bash
   # Test each MCP server
   node mcp-servers/text-chunker/test-functional.js
   node mcp-servers/vector-db/test-functional.js
   node mcp-servers/video-processor/test.js
   ```

---

## ⚙️ Configuration

### 1. Environment Variables

Edit `~/claude-workspace/.env`:

```bash
# Required
OPENAI_API_KEY=sk-your-actual-api-key-here

# Optional (defaults provided)
VIDEOS_DIR=/Users/vicentezhu/claude-workspace/data/videos
AUDIO_DIR=/Users/vicentezhu/claude-workspace/data/audio
TRANSCRIPTS_DIR=/Users/vicentezhu/claude-workspace/data/transcripts
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
WHISPER_MODEL=whisper-1
```

### 2. Claude MCP Configuration

Add MCP servers to Claude's configuration:

**Location**: `~/.claude/config.json` (or similar)

**Configuration**:
```json
{
  "mcpServers": {
    "text-chunker": {
      "command": "node",
      "args": ["/Users/vicentezhu/claude-workspace/mcp-servers/text-chunker/index.js"]
    },
    "vector-db": {
      "command": "node",
      "args": ["/Users/vicentezhu/claude-workspace/mcp-servers/vector-db/index.js"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    },
    "video-processor": {
      "command": "node",
      "args": ["/Users/vicentezhu/claude-workspace/mcp-servers/video-processor/index.js"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

### 3. Restart Claude

After configuration, restart Claude to load the MCP servers.

---

## 🎓 Quick Start

### Your First Video

Let's process your first video and ask questions about it.

#### Step 1: Create an Index

```
Create index for my first video collection:
- index_name: "my_first_videos"
```

This creates a vector database to store processed video content.

#### Step 2: Process a Video

```
Process this video:
- url: "https://www.youtube.com/watch?v=..."
- index_name: "my_first_videos"
- keep_video: false
- keep_audio: false
```

Wait 2-5 minutes for processing to complete.

#### Step 3: Search Your Video

```
Search the knowledge base:
- query: "What are the main topics discussed?"
- index_name: "my_first_videos"
- top_k: 5
```

You'll get relevant passages from the video!

#### Step 4: Generate Summary

```
Generate summary:
- topic: "main concepts"
- index_name: "my_first_videos"
- style: "detailed"
```

Get a comprehensive summary of the video content.

#### Step 5: Export Your Notes

```
Export data:
- index_name: "my_first_videos"
- format: "markdown"
- output_path: "./my_notes/"
```

Save your processed knowledge base.

**Congratulations!** 🎉 You've completed your first video processing workflow!

---

## 💡 Core Concepts

### Indices

An **index** is a collection of processed videos stored in a vector database.

**Think of it as**: A library shelf for a specific topic

**Example indices**:
- `ai_courses` - All AI/ML courses
- `python_tutorials` - Python programming videos
- `history_lectures` - History course materials

**Why separate indices?**
- Organize content by topic
- Faster searches (smaller search space)
- Easier management

### Chunks

Videos are split into **chunks** - small pieces of text (~500 tokens).

**Why chunking?**
- More precise search results
- Better context extraction
- Manageable embedding sizes

**Chunk strategies**:
- **Semantic**: Respects paragraph boundaries (default)
- **Sentence**: Never breaks sentences
- **Fixed**: Simple token-based splitting

### Embeddings

Each chunk is converted into a **vector embedding** - a list of numbers representing meaning.

**How it works**:
- Text → OpenAI Embeddings API → 1536-dimensional vector
- Similar meanings = similar vectors
- Enables semantic search

**Example**:
- "AI agents" and "autonomous systems" have similar embeddings
- Search finds content even with different words

### Similarity Search

Finding relevant content using **cosine similarity**.

**Process**:
1. Query text → embedding
2. Compare with all stored embeddings
3. Return most similar chunks
4. Sort by similarity score (0-1)

**Scores**:
- **>0.8**: Highly relevant
- **0.6-0.8**: Moderately relevant
- **<0.6**: Less relevant

---

## 🛠️ Skills Reference

### 1. process-video

**Purpose**: Process video end-to-end

**Usage**:
```
Process video:
- url: "https://youtube.com/watch?v=..."
- index_name: "my_index"
- chunk_size: 500
- chunk_overlap: 50
- keep_video: false
- keep_audio: false
```

**Parameters**:
- `url` (required): Video URL
- `index_name` (required): Target index
- `video_name` (optional): Custom name
- `chunk_size` (optional): Chunk size in tokens (default: 500)
- `chunk_overlap` (optional): Overlap in tokens (default: 50)
- `keep_video` (optional): Keep video file (default: false)
- `keep_audio` (optional): Keep audio file (default: false)
- `language` (optional): Transcription language (auto-detect if not specified)

**What it does**:
1. Downloads video from URL
2. Extracts audio (16kHz mono)
3. Transcribes using Whisper
4. Cleans transcript
5. Extracts keywords
6. Creates chunks
7. Generates embeddings
8. Stores in vector DB

**Duration**: 2-5 minutes for typical video

**Cost**: ~$0.40 per hour of video

---

### 2. search-knowledge

**Purpose**: Search knowledge base

**Usage**:
```
Search:
- query: "What are AI agents?"
- index_name: "my_index"
- top_k: 5
```

**Parameters**:
- `query` (required): Search question
- `index_name` (required): Index to search
- `top_k` (optional): Number of results (default: 5)
- `filters` (optional): Metadata filters
- `include_context` (optional): Include surrounding chunks

**Returns**:
- Ranked results with similarity scores
- Source video metadata
- Chunk text content

**Duration**: <1 second

---

### 3. summarize-topic

**Purpose**: Generate multi-video summaries

**Usage**:
```
Summarize:
- topic: "neural networks"
- index_name: "ml_courses"
- style: "detailed"
- max_chunks: 20
```

**Parameters**:
- `topic` (required): Topic to summarize
- `index_name` (required): Index to search
- `style` (optional): "brief", "detailed", "bullet_points" (default: "detailed")
- `max_chunks` (optional): Max chunks to analyze (default: 20)
- `video_filter` (optional): Filter specific videos

**Styles**:
- **brief**: 2-3 paragraphs, high-level overview
- **detailed**: 5-8 paragraphs, comprehensive
- **bullet_points**: Organized list format

**Duration**: 5-10 seconds

---

### 4. export-data

**Purpose**: Export knowledge base

**Usage**:
```
Export:
- index_name: "my_index"
- format: "json"
- output_path: "./exports/"
```

**Parameters**:
- `index_name` (required): Index to export
- `format` (optional): "json", "csv", "markdown", "txt" (default: "json")
- `output_path` (optional): Output directory
- `include_embeddings` (optional): Include vectors (default: false)
- `video_filter` (optional): Export specific videos
- `export_type` (optional): "transcripts", "chunks", "vectors", "all" (default: "all")

**Formats**:
- **JSON**: Best for re-importing
- **CSV**: Best for spreadsheets
- **Markdown**: Best for documentation
- **Text**: Best for reading

**Duration**: 1-3 seconds

---

### 5. manage-index

**Purpose**: Index administration

**Usage**:
```
# List indices
Manage index:
- action: "list"

# Get statistics
Manage index:
- action: "stats"
- index_name: "my_index"

# Create index
Manage index:
- action: "create"
- index_name: "new_index"

# Delete index
Manage index:
- action: "delete"
- index_name: "old_index"
```

**Actions**:
- **list**: Show all indices
- **stats**: Get detailed statistics
- **create**: Create new index
- **delete**: Delete index (⚠️ permanent!)
- **optimize**: Improve performance

**Duration**: <1 second

---

## 🎯 Advanced Usage

### Multi-Video Projects

**Scenario**: Build comprehensive knowledge base

```
# 1. Create dedicated index
Create index: "ai_fundamentals"

# 2. Process multiple videos
Process videos:
1. url: "intro_to_ai_video"
2. url: "ml_basics_video"
3. url: "deep_learning_video"
All to index: "ai_fundamentals"

# 3. Cross-video search
Search: "What is backpropagation?"
in index: "ai_fundamentals"

# 4. Generate comprehensive summary
Summarize topic: "neural network training"
from index: "ai_fundamentals"
style: "detailed"
```

---

### Organizing Content

**Strategy**: One index per course/topic

```
Indices:
├── python_basics          # Python fundamentals
├── python_advanced        # Advanced Python
├── web_dev               # Web development
├── data_science          # Data science
└── machine_learning      # ML/AI content
```

**Benefits**:
- Faster searches
- Better organization
- Easier management
- Clearer results

---

### Filtering and Precision

**Use metadata filters** for precise search:

```
Search with filters:
- query: "data preprocessing"
- index_name: "ml_courses"
- filters: {
    "video_title": "Introduction to Machine Learning"
  }
```

Only searches within specified video.

---

### Batch Processing

**Process multiple videos efficiently**:

```
For each video in list:
1. Process video → index: "batch_index"
2. Wait for completion
3. Continue to next

Then:
- Verify all processed
- Generate overview summary
- Export complete database
```

---

### Export Strategies

**Different formats for different needs**:

**For backup**:
```
Export as JSON with embeddings:
- format: "json"
- include_embeddings: true
```

**For analysis**:
```
Export as CSV:
- format: "csv"
- export_type: "chunks"
```

**For sharing**:
```
Export as Markdown:
- format: "markdown"
- export_type: "transcripts"
```

---

## 🔧 Troubleshooting

### Common Issues

#### Issue: "OPENAI_API_KEY not set"

**Cause**: API key not configured

**Solution**:
1. Check `.env` file has correct key
2. Restart Claude to reload environment
3. Verify key is valid at OpenAI dashboard

---

#### Issue: "Video download failed"

**Causes**:
- Invalid URL
- Network connection issues
- Video is private/restricted
- Geographic restrictions

**Solutions**:
- Verify URL is correct YouTube link
- Check internet connection
- Try different video
- Use VPN if geo-restricted

---

#### Issue: "Audio file too large (>25MB)"

**Cause**: Whisper API has 25MB limit

**Solutions**:
- Process shorter videos
- Split audio file manually
- Use lower quality audio extraction

---

#### Issue: "Search returns no results"

**Causes**:
- Index is empty
- Query too specific
- Wrong index name

**Solutions**:
- Check index stats: `manage-index stats`
- Try broader query
- List indices: `manage-index list`
- Verify correct index name

---

#### Issue: "Processing is slow"

**Factors**:
- Video length (longer = slower)
- Internet speed (for download)
- API response time

**Normal speeds**:
- Download: Varies with connection
- Transcription: ~30 sec per hour
- Total: 2-5 min for 10-min video

---

### Getting Help

**Check logs**:
```bash
# MCP server logs
Check Claude's MCP server logs for errors
```

**Verify configuration**:
```bash
# Check environment
cat ~/claude-workspace/.env

# Test MCP servers
node mcp-servers/text-chunker/index.js
node mcp-servers/vector-db/index.js
node mcp-servers/video-processor/index.js
```

**Test individual tools**:
Run test files to verify functionality:
```bash
node mcp-servers/text-chunker/test-functional.js
node mcp-servers/vector-db/test-functional.js
node mcp-servers/video-processor/test.js
```

---

## ✨ Best Practices

### Naming Conventions

**Good index names**:
- `ml_stanford_course`
- `python_tutorials_2024`
- `history_ww2`

**Bad index names**:
- `index1`
- `test`
- `My Videos!`

**Rules**:
- Lowercase
- Underscores for spaces
- Descriptive
- No special characters

---

### Storage Management

**Disk space considerations**:
- Videos: ~100-200 MB each
- Audio: ~10 MB per hour
- Transcripts: ~10 KB per hour
- Indices: ~5-50 MB

**Tips**:
- Set `keep_video: false` and `keep_audio: false`
- Only keep transcripts
- Export indices regularly
- Delete old indices

---

### API Cost Optimization

**Costs per video hour**:
- Whisper: $0.36
- Embeddings: ~$0.02
- **Total**: ~$0.40

**Optimization strategies**:
- Process shorter clips when possible
- Avoid reprocessing same content
- Use larger chunk sizes (reduces embedding calls)
- Export processed data for reuse

---

### Search Optimization

**Better queries**:
- ✅ "How does backpropagation work?"
- ❌ "backpropagation"

**Why**: Full questions provide better context for embedding.

**Tips**:
- Use natural language
- Be specific but not too narrow
- Include context in query
- Try different phrasings

---

### Regular Maintenance

**Monthly tasks**:
```
1. List all indices
2. Check statistics for each
3. Optimize large indices
4. Export important indices (backup)
5. Delete unused indices
```

**Benefits**:
- Better performance
- Clean organization
- Data safety
- Cost control

---

## ❓ FAQ

### How many videos can I process?

**Unlimited** - but practical limits:
- Index performance degrades >10,000 vectors
- ~20-50 videos per index recommended
- Create multiple indices for large collections

---

### Can I process non-YouTube videos?

Currently **YouTube only** for automatic download.

**Workaround**: Download manually, then use:
- `extract_audio` tool
- `transcribe_audio` tool

---

### Can I reprocess a video?

Yes, but it will:
- Duplicate vectors in index
- Increase costs
- Take same time

**Better**: Delete old index and create new one.

---

### How accurate are transcriptions?

**Very accurate** - using OpenAI Whisper:
- Best-in-class accuracy
- Handles accents well
- Good with technical terms
- May struggle with heavy background noise

---

### Can I use other languages?

Yes! Whisper supports **99 languages**.

**How**:
```
Process video with language:
- url: "..."
- index_name: "french_videos"
- language: "fr"
```

**Supported**: English, Spanish, French, German, Chinese, Japanese, and many more.

---

### Is my data private?

**Data flow**:
- Videos: Stored locally
- Audio: Sent to OpenAI Whisper API
- Text: Sent to OpenAI Embeddings API
- Vectors: Stored locally

**OpenAI**: Data sent to API (see OpenAI privacy policy)
**Local**: All files stored on your machine

---

### Can I share my knowledge base?

Yes! **Export** your index:
```
Export as JSON:
- index_name: "my_index"
- format: "json"
- include_embeddings: true
```

**Recipient can**:
- Import the JSON
- Recreate the index
- Search without reprocessing

---

## 🎉 Next Steps

Now that you know the system:

1. **Process your first video** using the Quick Start guide
2. **Experiment with searches** to see semantic search in action
3. **Try different summary styles** to find what works for you
4. **Build a multi-video collection** for a topic you're learning
5. **Export your work** to keep organized notes

**Happy learning!** 📚

---

**Need help?** Check:
- [README.md](./README.md) - Project overview
- [TEST_PLAN.md](./TEST_PLAN.md) - Testing guide
- [Skills Documentation](./skills/README.md) - Detailed skill docs
- [MCP Server READMEs](./mcp-servers/) - Technical details
