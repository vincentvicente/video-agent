# Skill: search-knowledge

Search the video knowledge base using semantic similarity to find relevant content.

## Usage

```
/search-knowledge query="What are AI agents?" index_name="my_index" top_k=5
```

## Parameters

- `query` (required): Question or search query
- `index_name` (required): Name of vector index to search
- `top_k` (optional): Number of results to return (default: 5)
- `filters` (optional): Metadata filters (e.g., {"video_title": "Introduction"})
- `include_context` (optional): Include surrounding chunks for context (default: false)

## Workflow

### Step 1: Verify Index Exists
Call `vector-db.get_index_stats` to verify the index:

**Parameters**:
```json
{
  "index_name": "<index_name>"
}
```

**Output**: Index statistics (vector count, dimension, etc.)

If index doesn't exist, return error with list of available indices.

---

### Step 2: Search Similar Vectors
Call `vector-db.search_similar` to find relevant chunks:

**Parameters**:
```json
{
  "index_name": "<index_name>",
  "query": "<query>",
  "top_k": <top_k>,
  "filters": <filters>
}
```

**Output**: Array of similar chunks with similarity scores

---

### Step 3: Format Results
For each result, format with:
- Similarity score (0-1)
- Text content
- Source metadata (video title, URL, timestamp estimate)
- Relevance ranking

If `include_context=true`, fetch adjacent chunks to provide more context.

---

## Output

Return search results with metadata:

```json
{
  "query": "What are AI agents?",
  "index_name": "my_index",
  "results": [
    {
      "rank": 1,
      "similarity": 0.876,
      "text": "Artificial intelligence agents are autonomous entities...",
      "metadata": {
        "video_title": "Introduction to AI Agents",
        "video_url": "https://youtube.com/watch?v=xxx",
        "chunk_index": 5,
        "keywords": ["ai", "agents", "autonomous"]
      }
    },
    {
      "rank": 2,
      "similarity": 0.842,
      "text": "AI agents can perceive their environment...",
      "metadata": {
        "video_title": "Advanced AI Systems",
        "video_url": "https://youtube.com/watch?v=yyy",
        "chunk_index": 12,
        "keywords": ["ai", "agents", "perception"]
      }
    }
  ],
  "total_searched": 150,
  "top_k": 5,
  "search_time": 245
}
```

## Response Format

Present results to user as:

```
🔍 Search Results for: "What are AI agents?"

Found 5 relevant passages from 150 chunks:

1. ⭐ Similarity: 87.6%
   Source: "Introduction to AI Agents" (Chunk 5)

   Artificial intelligence agents are autonomous entities that can
   perceive their environment, make decisions, and take actions to
   achieve specific goals...

   🎬 Video: https://youtube.com/watch?v=xxx
   🏷️ Keywords: ai, agents, autonomous

2. ⭐ Similarity: 84.2%
   Source: "Advanced AI Systems" (Chunk 12)

   AI agents can perceive their environment and respond to changes...

   🎬 Video: https://youtube.com/watch?v=yyy
   🏷️ Keywords: ai, agents, perception

---

💡 Tip: Use these results to answer questions or generate summaries
```

## Error Handling

- If index doesn't exist: List available indices
- If no results found: Suggest broader query or check index content
- If query is too short: Recommend more specific query
- If API fails: Check OPENAI_API_KEY for embedding generation

## Tips

- More specific queries yield better results
- Similarity scores >0.8 are highly relevant
- Similarity scores 0.6-0.8 are moderately relevant
- Similarity scores <0.6 may not be directly relevant
- Use metadata filters to search within specific videos
- Combine multiple searches to build comprehensive answers
