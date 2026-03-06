# Skill: export-data

Export processed video data in various formats for external use or backup.

## Usage

```
/export-data index_name="my_index" format="json" output_path="./export/"
```

## Parameters

- `index_name` (required): Name of vector index to export
- `format` (optional): Export format - "json", "csv", "markdown", "txt" (default: "json")
- `output_path` (optional): Output directory path (default: "./exports/")
- `include_embeddings` (optional): Include embedding vectors (default: false)
- `video_filter` (optional): Export specific videos only (array of titles or URLs)
- `export_type` (optional): What to export - "transcripts", "chunks", "vectors", "all" (default: "all")

## Workflow

### Step 1: Get Index Statistics
Call `vector-db.get_index_stats` to understand what will be exported:

**Parameters**:
```json
{
  "index_name": "<index_name>"
}
```

**Output**: Vector count, dimension, metadata

---

### Step 2: Read Index Data
Load the index JSON file from disk:

**Location**: `~/claude-workspace/data/embeddings/<index_name>.json`

Parse the JSON to access all vectors and metadata.

---

### Step 3: Filter Data (if requested)
If `video_filter` is specified, filter vectors to only include those from specified videos.

---

### Step 4: Prepare Export Data
Based on `export_type`:

**transcripts**:
- Original transcript files
- Cleaned transcript text
- Video metadata

**chunks**:
- Text chunks
- Chunk metadata (index, token count)
- Source video information

**vectors**:
- Embeddings (if `include_embeddings=true`)
- Vector IDs
- Associated text and metadata

**all**:
- Complete dataset with all information

---

### Step 5: Format and Write
Format data according to specified format:

**JSON Format**:
```json
{
  "export_info": {
    "index_name": "my_index",
    "export_date": "2026-02-07T12:00:00Z",
    "total_vectors": 150,
    "export_type": "all"
  },
  "videos": [
    {
      "title": "Introduction to AI Agents",
      "url": "https://youtube.com/watch?v=xxx",
      "duration": 1820,
      "transcript_path": "/path/to/transcript.vtt",
      "chunk_count": 32
    }
  ],
  "chunks": [
    {
      "id": 1,
      "text": "Artificial intelligence agents are...",
      "metadata": {
        "video_title": "Introduction to AI Agents",
        "chunk_index": 0,
        "token_count": 487,
        "keywords": ["ai", "agents"]
      },
      "embedding": [0.123, -0.456, ...]  // if include_embeddings=true
    }
  ]
}
```

**CSV Format**:
```csv
id,text,video_title,video_url,chunk_index,token_count,keywords
1,"Artificial intelligence agents are...","Introduction to AI Agents","https://youtube.com/watch?v=xxx",0,487,"ai,agents"
2,"AI agents can perceive...","Introduction to AI Agents","https://youtube.com/watch?v=xxx",1,495,"ai,perception"
```

**Markdown Format**:
```markdown
# Video Knowledge Base Export
**Index**: my_index
**Date**: 2026-02-07
**Total Vectors**: 150

---

## Videos

### 1. Introduction to AI Agents
- **URL**: https://youtube.com/watch?v=xxx
- **Duration**: 30:20
- **Chunks**: 32

### 2. Advanced AI Systems
- **URL**: https://youtube.com/watch?v=yyy
- **Duration**: 45:15
- **Chunks**: 48

---

## Chunks

### Chunk 1 (Introduction to AI Agents)
Artificial intelligence agents are autonomous entities that can
perceive their environment, make decisions, and take actions...

**Keywords**: ai, agents, autonomous
**Tokens**: 487

### Chunk 2 (Introduction to AI Agents)
AI agents can perceive their environment through various sensors...

**Keywords**: ai, perception, sensors
**Tokens**: 495
```

**Text Format**:
```
=================================================================
VIDEO KNOWLEDGE BASE EXPORT
=================================================================
Index: my_index
Date: 2026-02-07
Total Vectors: 150

-----------------------------------------------------------------
VIDEOS
-----------------------------------------------------------------

[1] Introduction to AI Agents
    URL: https://youtube.com/watch?v=xxx
    Duration: 30:20
    Chunks: 32

[2] Advanced AI Systems
    URL: https://youtube.com/watch?v=yyy
    Duration: 45:15
    Chunks: 48

-----------------------------------------------------------------
CHUNKS
-----------------------------------------------------------------

[Chunk 1] Introduction to AI Agents

Artificial intelligence agents are autonomous entities that can
perceive their environment, make decisions, and take actions...

Keywords: ai, agents, autonomous
Tokens: 487

---

[Chunk 2] Introduction to AI Agents

AI agents can perceive their environment through various sensors...

Keywords: ai, perception, sensors
Tokens: 495
```

---

### Step 6: Write to File
Create output directory if it doesn't exist, then write the formatted data:

**File naming**:
- JSON: `<index_name>_export_<timestamp>.json`
- CSV: `<index_name>_export_<timestamp>.csv`
- Markdown: `<index_name>_export_<timestamp>.md`
- Text: `<index_name>_export_<timestamp>.txt`

---

## Output

Return export summary:

```json
{
  "status": "success",
  "export_info": {
    "index_name": "my_index",
    "format": "json",
    "export_type": "all",
    "output_path": "./exports/my_index_export_20260207_120000.json",
    "file_size": 5242880,
    "include_embeddings": false
  },
  "statistics": {
    "total_videos": 4,
    "total_chunks": 150,
    "videos_exported": [
      "Introduction to AI Agents",
      "Advanced AI Systems",
      "AI Agent Design",
      "Intelligent Systems"
    ]
  },
  "export_time": 1250
}
```

## Response Format

```
✅ Export Complete!

📦 Export Details:
   Index: my_index
   Format: JSON
   Type: All data

📊 Statistics:
   Videos: 4
   Chunks: 150
   Embeddings: Not included

💾 Output:
   Path: ./exports/my_index_export_20260207_120000.json
   Size: 5.0 MB

🎬 Videos Included:
   1. Introduction to AI Agents
   2. Advanced AI Systems
   3. AI Agent Design
   4. Intelligent Systems

⏱️  Export Time: 1.25 seconds

💡 Tip: Use this export for backup, sharing, or importing into other tools
```

## Error Handling

- If index doesn't exist: Return error with available indices
- If output path is invalid: Create directories or suggest valid path
- If disk space insufficient: Check available space and warn user
- If write permissions denied: Suggest alternative path
- If format is invalid: List supported formats

## Tips

- **JSON**: Best for re-importing or programmatic use
- **CSV**: Best for spreadsheet analysis or data processing
- **Markdown**: Best for documentation or sharing
- **Text**: Best for reading or simple archival

- Set `include_embeddings=false` to reduce file size significantly
- Use `video_filter` to export subsets of data
- Regular exports provide backup of processed data
- Exported data can be re-indexed if needed
- CSV format is most compatible across tools
- JSON format preserves all metadata and structure

## Use Cases

1. **Backup**: Export all data regularly for disaster recovery
2. **Sharing**: Export to markdown for documentation
3. **Analysis**: Export to CSV for data analysis in Excel/Python
4. **Migration**: Export to JSON for moving to another system
5. **Archival**: Export to text for long-term storage
