# Skill: process-video

Process a video from URL through the complete RAG pipeline: download, transcribe, chunk, embed, and index.

## Usage

```
/process-video url="https://youtube.com/watch?v=xxx" index_name="my_index"
```

## Parameters

- `url` (required): Video URL to process (YouTube supported)
- `index_name` (required): Name of vector index to store embeddings
- `video_name` (optional): Custom name for the video
- `chunk_size` (optional): Chunk size in tokens (default: 500)
- `chunk_overlap` (optional): Overlap size in tokens (default: 50)
- `keep_video` (optional): Keep video file after processing (default: false)
- `keep_audio` (optional): Keep audio file after processing (default: false)
- `language` (optional): Transcription language (auto-detect if not specified)

## Workflow

### Step 1: Process Video
Call `video-processor.process_video` to:
- Download video from URL
- Extract audio (16kHz mono WAV)
- Transcribe using Whisper API (VTT format)

**Parameters**:
```json
{
  "url": "<url>",
  "options": {
    "video_name": "<video_name>",
    "audio_format": "wav",
    "transcript_format": "vtt",
    "language": "<language>",
    "keep_video": <keep_video>,
    "keep_audio": <keep_audio>
  }
}
```

**Output**: Video metadata, audio path, transcript path

---

### Step 2: Clean Transcript
Call `text-chunker.clean_transcript` to clean the transcript:

**Parameters**:
```json
{
  "transcript": "<transcript_content>",
  "remove_timestamps": true,
  "remove_speakers": false
}
```

**Output**: Cleaned transcript text

---

### Step 3: Extract Keywords
Call `text-chunker.extract_keywords` to identify key topics:

**Parameters**:
```json
{
  "text": "<cleaned_transcript>",
  "max_keywords": 20
}
```

**Output**: List of keywords with scores

---

### Step 4: Chunk Text
Call `text-chunker.chunk_text` to split transcript:

**Parameters**:
```json
{
  "text": "<cleaned_transcript>",
  "chunk_size": <chunk_size>,
  "overlap": <chunk_overlap>,
  "strategy": "semantic"
}
```

**Output**: Array of text chunks with metadata

---

### Step 5: Create or Verify Index
Check if index exists using `vector-db.get_index_stats`.

If index doesn't exist, create it using `vector-db.create_index`:

**Parameters**:
```json
{
  "index_name": "<index_name>",
  "dimension": 1536,
  "metadata": {
    "created_by": "process-video",
    "purpose": "video_rag"
  }
}
```

---

### Step 6: Generate Embeddings and Store
For each chunk, generate embeddings using OpenAI API, then store using `vector-db.store_embeddings`:

**Note**: Generate embeddings externally using OpenAI SDK, then store.

**Parameters**:
```json
{
  "index_name": "<index_name>",
  "chunks": [
    {
      "text": "<chunk_text>",
      "embedding": [0.123, -0.456, ...],
      "metadata": {
        "video_url": "<url>",
        "video_title": "<title>",
        "chunk_index": 0,
        "keywords": ["ai", "agents"]
      }
    }
  ]
}
```

---

## Output

Return comprehensive processing report:

```json
{
  "status": "success",
  "video": {
    "title": "Introduction to AI Agents",
    "url": "https://youtube.com/watch?v=xxx",
    "duration": 1820
  },
  "transcript": {
    "path": "/path/to/transcript.vtt",
    "cleaned_length": 15420
  },
  "keywords": ["ai", "agents", "automation", ...],
  "chunks": {
    "total": 32,
    "avg_tokens": 485
  },
  "index": {
    "name": "my_index",
    "total_vectors": 150,
    "new_vectors": 32
  },
  "processing_time": 45230,
  "files": {
    "video": "(deleted)",
    "audio": "(deleted)",
    "transcript": "/path/to/transcript.vtt"
  }
}
```

## Error Handling

- If video download fails: Return error with video URL validation info
- If transcription fails: Check OPENAI_API_KEY and file size (<25MB)
- If indexing fails: Verify index exists or can be created
- If embedding fails: Check API key and quota

## Tips

- For long videos (>1 hour), consider splitting audio before transcription
- Use descriptive `index_name` to organize different video collections
- Set `keep_video=false` and `keep_audio=false` to save disk space
- Keywords are useful for metadata filtering in searches
