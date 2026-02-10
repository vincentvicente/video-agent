# Skill: summarize-topic

Generate a comprehensive summary of a topic by aggregating content from multiple videos.

## Usage

```
/summarize-topic topic="AI agents architecture" index_name="my_index" style="detailed"
```

## Parameters

- `topic` (required): Topic to summarize
- `index_name` (required): Name of vector index to search
- `style` (optional): Summary style - "brief", "detailed", "bullet_points" (default: "detailed")
- `max_chunks` (optional): Maximum chunks to analyze (default: 20)
- `video_filter` (optional): Only include specific videos (array of video titles or URLs)

## Workflow

### Step 1: Multi-Query Search
Generate multiple search queries related to the topic, then search for each:

**Example queries for "AI agents architecture"**:
- "What is AI agent architecture?"
- "How do AI agents work?"
- "Components of AI agents"
- "AI agent design patterns"

For each query, call `vector-db.search_similar`:

**Parameters**:
```json
{
  "index_name": "<index_name>",
  "query": "<generated_query>",
  "top_k": 5
}
```

---

### Step 2: Aggregate Results
Combine results from all queries:
- Remove duplicate chunks (same chunk_index from same video)
- Sort by similarity score
- Keep top `max_chunks` results

---

### Step 3: Extract Key Information
Analyze aggregated chunks to extract:
- Main concepts and definitions
- Key points and insights
- Different perspectives from different videos
- Common themes across sources

Use `text-chunker.extract_keywords` on aggregated text to identify key terms.

---

### Step 4: Generate Summary
Based on `style` parameter, generate appropriate summary:

**Brief** (2-3 paragraphs):
- High-level overview
- Key concepts only
- 200-300 words

**Detailed** (5-8 paragraphs):
- Comprehensive explanation
- Multiple perspectives
- Examples and details
- 500-800 words

**Bullet Points**:
- Organized by subtopic
- Key facts and concepts
- Easy to scan format

---

### Step 5: Add Source Attribution
Include sources used in the summary:
- Video titles
- URLs
- Number of chunks used from each video

---

## Output

Return structured summary:

```json
{
  "topic": "AI agents architecture",
  "style": "detailed",
  "summary": {
    "overview": "AI agents are autonomous systems designed to...",
    "key_concepts": [
      {
        "concept": "Perception",
        "explanation": "Agents perceive their environment through sensors...",
        "sources": ["Video 1", "Video 3"]
      },
      {
        "concept": "Decision Making",
        "explanation": "Agents use reasoning algorithms to...",
        "sources": ["Video 2", "Video 4"]
      }
    ],
    "main_points": [
      "Agents consist of perception, reasoning, and action components",
      "Different architectures suit different problem types",
      "Modern agents often use machine learning for decision making"
    ]
  },
  "sources": [
    {
      "video_title": "Introduction to AI Agents",
      "url": "https://youtube.com/watch?v=xxx",
      "chunks_used": 8
    },
    {
      "video_title": "Advanced AI Systems",
      "url": "https://youtube.com/watch?v=yyy",
      "chunks_used": 6
    }
  ],
  "keywords": ["agents", "architecture", "perception", "reasoning", "action"],
  "total_chunks_analyzed": 20,
  "confidence": "high"
}
```

## Response Format

Present summary to user based on style:

### Detailed Format:
```
# Summary: AI Agents Architecture

## Overview
AI agents are autonomous systems designed to perceive their environment,
make decisions, and take actions to achieve goals. The architecture of
an AI agent typically consists of several key components...

## Key Concepts

### 1. Perception
Agents perceive their environment through sensors and input mechanisms.
This allows them to gather information about the current state...

Sources: "Introduction to AI Agents", "Advanced AI Systems"

### 2. Decision Making
The reasoning component processes perceived information to make
decisions about what actions to take...

Sources: "AI Agent Design", "Intelligent Systems"

## Main Points
• Agents consist of perception, reasoning, and action components
• Different architectures suit different problem types
• Modern agents often use machine learning for decision making

---

📚 Sources (4 videos, 20 chunks analyzed):
1. "Introduction to AI Agents" - 8 chunks
   🎬 https://youtube.com/watch?v=xxx

2. "Advanced AI Systems" - 6 chunks
   🎬 https://youtube.com/watch?v=yyy

🏷️ Key Terms: agents, architecture, perception, reasoning, action

💡 Confidence: High (based on consistent information across sources)
```

### Brief Format:
```
# Brief Summary: AI Agents Architecture

AI agents are autonomous systems with three core components: perception,
reasoning, and action. They perceive their environment through sensors,
make decisions using reasoning algorithms, and execute actions to achieve
goals. Different architectural patterns exist, including reactive agents,
deliberative agents, and hybrid approaches. Modern implementations often
incorporate machine learning for adaptive decision-making.

📚 Based on 4 videos (20 chunks analyzed)
🎬 Primary sources: "Introduction to AI Agents", "Advanced AI Systems"
```

### Bullet Points Format:
```
# Summary: AI Agents Architecture

## Core Components
• Perception - Gathering environmental information via sensors
• Reasoning - Processing information and making decisions
• Action - Executing behaviors to achieve goals

## Architecture Types
• Reactive Agents - Simple stimulus-response, no internal state
• Deliberative Agents - Maintain world model, plan ahead
• Hybrid Agents - Combine reactive and deliberative approaches

## Key Principles
• Autonomy - Operate without constant human intervention
• Adaptability - Adjust behavior based on feedback
• Goal-oriented - Actions directed toward specific objectives

📚 4 videos • 20 chunks • High confidence
```

## Error Handling

- If no relevant content found: Suggest checking topic spelling or trying related terms
- If too few sources: Recommend processing more videos on the topic
- If conflicting information: Present multiple perspectives clearly
- If index doesn't exist: Return error with available indices

## Tips

- Broader topics work better than very specific queries
- More videos indexed = better summaries
- "Detailed" style provides most comprehensive view
- "Brief" style good for quick understanding
- "Bullet points" style best for reference
- Use `video_filter` to focus on specific sources
- Check confidence level to gauge summary reliability
