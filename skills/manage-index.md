# Skill: manage-index

Manage vector indices: create, delete, inspect, and maintain the knowledge base.

## Usage

```
/manage-index action="list"
/manage-index action="create" index_name="new_index"
/manage-index action="stats" index_name="my_index"
/manage-index action="delete" index_name="old_index"
```

## Parameters

- `action` (required): Action to perform - "list", "create", "stats", "delete", "optimize"
- `index_name` (conditional): Required for create, stats, delete, optimize
- `dimension` (optional): Vector dimension for create (default: 1536)
- `metadata` (optional): Index metadata for create

## Actions

### 1. List Indices

List all available vector indices.

**Workflow**:
- Read all JSON files in embeddings directory
- Parse each file to get index metadata
- Return list with statistics

**Output**:
```json
{
  "action": "list",
  "indices": [
    {
      "name": "ai_videos",
      "vector_count": 150,
      "dimension": 1536,
      "created_at": "2026-02-07T10:00:00Z",
      "size_mb": 5.2
    },
    {
      "name": "tutorials",
      "vector_count": 89,
      "dimension": 1536,
      "created_at": "2026-02-06T14:30:00Z",
      "size_mb": 3.1
    }
  ],
  "total_indices": 2,
  "total_vectors": 239,
  "total_size_mb": 8.3
}
```

**Response Format**:
```
📚 Vector Indices

Found 2 indices with 239 total vectors:

1. 🗂️  ai_videos
   Vectors: 150
   Size: 5.2 MB
   Created: 2026-02-07 10:00

2. 🗂️  tutorials
   Vectors: 89
   Size: 3.1 MB
   Created: 2026-02-06 14:30

💾 Total Storage: 8.3 MB
```

---

### 2. Create Index

Create a new vector index.

**Workflow**:
Call `vector-db.create_index`:

**Parameters**:
```json
{
  "index_name": "<index_name>",
  "dimension": <dimension>,
  "metadata": {
    "created_by": "manage-index",
    "purpose": "<metadata.purpose>",
    ...
  }
}
```

**Output**:
```json
{
  "action": "create",
  "index_name": "new_index",
  "dimension": 1536,
  "vector_count": 0,
  "created_at": "2026-02-07T12:00:00Z"
}
```

**Response Format**:
```
✅ Index Created!

📝 Details:
   Name: new_index
   Dimension: 1536
   Vectors: 0 (empty)
   Created: 2026-02-07 12:00

💡 Next steps:
   - Process videos to add content
   - Use /process-video to populate the index
```

---

### 3. Get Statistics

Get detailed statistics about an index.

**Workflow**:
Call `vector-db.get_index_stats`:

**Parameters**:
```json
{
  "index_name": "<index_name>"
}
```

**Additional analysis**:
- Load index JSON file
- Analyze vector distribution
- Calculate average chunk size
- Identify unique videos
- Extract common keywords

**Output**:
```json
{
  "action": "stats",
  "index_name": "ai_videos",
  "vector_count": 150,
  "dimension": 1536,
  "created_at": "2026-02-07T10:00:00Z",
  "size_mb": 5.2,
  "statistics": {
    "unique_videos": 4,
    "avg_chunk_size": 485,
    "total_tokens": 72750,
    "most_common_keywords": [
      {"keyword": "ai", "count": 145},
      {"keyword": "agents", "count": 128},
      {"keyword": "learning", "count": 89}
    ],
    "videos": [
      {
        "title": "Introduction to AI Agents",
        "chunks": 32,
        "percentage": 21.3
      },
      {
        "title": "Advanced AI Systems",
        "chunks": 48,
        "percentage": 32.0
      }
    ]
  }
}
```

**Response Format**:
```
📊 Index Statistics: ai_videos

📈 Overview:
   Vectors: 150
   Dimension: 1536
   Size: 5.2 MB
   Created: 2026-02-07 10:00

📹 Content:
   Unique Videos: 4
   Total Tokens: 72,750
   Avg Chunk Size: 485 tokens

🎬 Video Breakdown:
   1. Advanced AI Systems - 48 chunks (32.0%)
   2. Introduction to AI Agents - 32 chunks (21.3%)
   3. AI Agent Design - 40 chunks (26.7%)
   4. Intelligent Systems - 30 chunks (20.0%)

🏷️  Top Keywords:
   1. ai (145 occurrences)
   2. agents (128 occurrences)
   3. learning (89 occurrences)

💡 Index Health: Good
```

---

### 4. Delete Index

Delete a vector index and all its data.

**⚠️ WARNING**: This action cannot be undone!

**Workflow**:
1. Confirm with user before deletion
2. Call `vector-db.delete_index`:

**Parameters**:
```json
{
  "index_name": "<index_name>"
}
```

3. Remove index file from disk

**Output**:
```json
{
  "action": "delete",
  "index_name": "old_index",
  "deleted": true,
  "vectors_removed": 150,
  "space_freed_mb": 5.2
}
```

**Response Format**:
```
⚠️  Confirm Deletion

You are about to delete index: old_index

This will remove:
   • 150 vectors
   • 5.2 MB of data
   • All associated metadata

This action CANNOT be undone!

Are you sure? (yes/no)

---

✅ Index Deleted

Removed: old_index
Vectors: 150
Space Freed: 5.2 MB

💡 The index has been permanently deleted
```

---

### 5. Optimize Index

Optimize index performance and storage.

**Workflow**:
1. Load index JSON
2. Remove duplicate vectors
3. Reindex vector IDs sequentially
4. Clean up metadata
5. Save optimized index

**Output**:
```json
{
  "action": "optimize",
  "index_name": "my_index",
  "optimization_results": {
    "duplicates_removed": 5,
    "ids_reindexed": true,
    "metadata_cleaned": 8,
    "size_before_mb": 5.5,
    "size_after_mb": 5.2,
    "space_saved_mb": 0.3,
    "optimization_time": 850
  }
}
```

**Response Format**:
```
🔧 Optimizing Index: my_index

Running optimization...

✅ Optimization Complete!

📊 Results:
   Duplicates Removed: 5 vectors
   IDs Reindexed: Yes
   Metadata Cleaned: 8 entries

💾 Storage:
   Before: 5.5 MB
   After: 5.2 MB
   Saved: 0.3 MB (5.5%)

⏱️  Time: 0.85 seconds

💡 Your index is now optimized!
```

---

## Error Handling

### List Action
- If no indices exist: Suggest creating first index
- If directory unreadable: Check permissions

### Create Action
- If index already exists: Suggest different name or use existing
- If invalid name: Suggest valid naming conventions
- If dimension invalid: Recommend standard dimensions (1536, 3072)

### Stats Action
- If index doesn't exist: List available indices
- If index corrupted: Suggest recreation or restoration from backup

### Delete Action
- If index doesn't exist: List available indices
- If index in use: Warn and request confirmation
- If deletion fails: Check file permissions

### Optimize Action
- If index doesn't exist: Return error
- If optimization fails: Attempt recovery from backup

## Tips

### Best Practices
- Use descriptive index names (e.g., "ai_tutorials", "coding_videos")
- Create separate indices for different topics
- Regularly check statistics to monitor growth
- Delete unused indices to free space
- Optimize indices periodically (monthly recommended)

### Naming Conventions
- Use lowercase letters, numbers, underscores
- Avoid spaces and special characters
- Be descriptive: "ml_basics" > "index1"
- Include category: "tutorial_python", "course_ai"

### When to Create New Index
- Different topic domain (AI vs. Web Dev)
- Different content type (tutorials vs. lectures)
- Different language (English vs. Spanish)
- Organizational separation (Project A vs. Project B)

### When to Optimize
- After processing many videos (>50)
- If queries seem slow
- Monthly maintenance
- Before exporting data
- After bulk deletions

## Common Workflows

### Setup New Collection
```
1. /manage-index action="create" index_name="ml_tutorials"
2. /process-video url="..." index_name="ml_tutorials"
3. /manage-index action="stats" index_name="ml_tutorials"
```

### Maintenance
```
1. /manage-index action="list"
2. /manage-index action="stats" index_name="my_index"
3. /manage-index action="optimize" index_name="my_index"
```

### Cleanup
```
1. /manage-index action="list"
2. /manage-index action="delete" index_name="old_index"
3. /manage-index action="list"  # Verify deletion
```
