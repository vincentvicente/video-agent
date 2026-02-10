# Vector DB MCP Server

> MCP server for vector database operations with embeddings and similarity search

## 🎯 Features

### 1. create_index
Create a new vector index for storing embeddings.

**Parameters**:
- `index_name` (required) - Name of the index to create
- `dimension` (optional) - Vector dimension (default: 1536 for text-embedding-3-small)
- `metadata` (optional) - Optional metadata for the index

**Output**:
```json
{
  "index_name": "my_videos",
  "dimension": 1536,
  "vector_count": 0,
  "created_at": 1706800000000,
  "metadata": {}
}
```

---

### 2. store_embeddings
Store text chunks with their embeddings in the index.

**Parameters**:
- `index_name` (required) - Name of the index
- `chunks` (required) - Array of chunks with text, embedding, and metadata

**Chunk format**:
```json
{
  "text": "Sample text content",
  "embedding": [0.123, -0.456, ...],  // 1536-dimensional vector
  "metadata": {
    "video_id": "abc123",
    "timestamp": "00:05:30"
  }
}
```

**Output**:
```json
{
  "index_name": "my_videos",
  "stored_count": 5,
  "total_vectors": 25
}
```

---

### 3. search_similar
Search for similar vectors using cosine similarity. Automatically generates query embedding.

**Parameters**:
- `index_name` (required) - Name of the index to search
- `query` (required) - Query text (embedding generated automatically)
- `top_k` (optional) - Number of results to return (default: 5)
- `filters` (optional) - Optional metadata filters

**Output**:
```json
{
  "query": "What are AI agents?",
  "results": [
    {
      "id": 1,
      "text": "Artificial intelligence agents...",
      "metadata": {
        "video_id": "abc123",
        "timestamp": "00:05:30"
      },
      "similarity": 0.876
    }
  ],
  "total_searched": 50,
  "top_k": 5
}
```

---

### 4. delete_index
Delete a vector index and all its data. **This operation cannot be undone.**

**Parameters**:
- `index_name` (required) - Name of the index to delete

**Output**:
```json
{
  "index_name": "my_videos",
  "deleted": true
}
```

---

### 5. get_index_stats
Get statistics about a vector index.

**Parameters**:
- `index_name` (required) - Name of the index

**Output**:
```json
{
  "index_name": "my_videos",
  "vector_count": 150,
  "dimension": 1536,
  "created_at": 1706800000000,
  "metadata": {}
}
```

---

## 🚀 Usage

### As MCP Server

Add to your Claude configuration:

```json
{
  "mcpServers": {
    "vector-db": {
      "command": "node",
      "args": ["/path/to/vector-db/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

### Direct Testing

```bash
# Run the server
node index.js

# Run tests
node test-functional.js
```

---

## 📦 Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK
- `openai` - OpenAI API client for embeddings
- `dotenv` - Environment variable management

---

## 🔧 Configuration

Set these environment variables in `/Users/vicentezhu/claude-workspace/.env`:

```bash
# Required
OPENAI_API_KEY=sk-your-api-key-here

# Optional
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
DB_PATH=/path/to/embeddings
```

---

## 🧪 Testing

```bash
npm test
```

**Test Results**:
- ✅ create_index - PASSED
- ✅ get_index_stats (empty) - PASSED
- ⚠️  store_embeddings - Requires OPENAI_API_KEY
- ⚠️  search_similar - Requires OPENAI_API_KEY
- ✅ delete_index - PASSED
- ✅ error handling - PASSED

**Core functionality**: 4/4 tests passed ✅
**API-dependent tests**: Require valid OPENAI_API_KEY

---

## 📝 Technical Details

### Storage
- **Format**: JSON files (pure JavaScript, no native compilation)
- **Location**: `~/claude-workspace/data/embeddings/`
- **Structure**: Each index is stored as `<index_name>.json`

### Search Algorithm
- **Method**: Cosine similarity
- **Performance**: O(n) search (linear scan)
- **Scalability**: Suitable for up to 10,000 vectors

### Embeddings
- **Model**: text-embedding-3-small (default)
- **Dimension**: 1536
- **API**: OpenAI Embeddings API

---

## ✅ Status

- [x] Implementation complete
- [x] Core tests passing (4/4)
- [x] API integration implemented
- [x] Ready for integration
- [ ] User needs to configure OPENAI_API_KEY

---

**Version**: 1.0.0
**Last Updated**: 2026-02-07
