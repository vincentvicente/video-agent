# Design Document: AI Agent Platform

**Date**: 2026-02-12
**Status**: Approved
**Approach**: A — Spring AI primary + LangChain4j for RAG

---

## Overview

A full-stack AI agent platform built with Java Spring Boot and Vue.js. The platform integrates Spring AI (Anthropic Claude, MCP tool calling, streaming) and LangChain4j (RAG pipeline, document processing) to deliver an autonomous developer-assistant agent with 12+ specialized tools, ReAct reasoning, and knowledge base Q&A.

---

## Architecture

```
Vue.js Frontend (Vue 3 + Element Plus)
    │  REST + SSE (streaming)
Spring Boot Backend
    ├── Agent Controller (REST API)
    ├── Spring AI (Anthropic ChatModel, MCP Client, Streaming)
    ├── ReAct Engine (Plan → Act → Observe → Loop)
    ├── LangChain4j (RAG: DocLoader → Splitter → Embedder → PGVector)
    ├── MCP Tool Servers (12 tools, stdio transport)
    └── Databases: MySQL (business) + PGVector (vectors)
```

### Core Layers

1. **Controller Layer**: REST API + SSE streaming endpoints
2. **Agent Layer**: ReAct engine drives Plan→Act→Observe loop
3. **Framework Layer**: Spring AI for LLM/MCP, LangChain4j for RAG
4. **Tool Layer**: MCP Server processes communicate via stdio with Spring AI MCP Client
5. **Data Layer**: MySQL (business data) + PGVector (vector embeddings)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Spring Boot | 3.3.x |
| AI Framework | Spring AI | 1.0.x |
| AI Framework | LangChain4j | 1.0.x |
| LLM | Anthropic Claude Sonnet 4 | via Spring AI |
| MCP | Spring AI MCP Client | stdio transport |
| Vector DB | PostgreSQL + pgvector | 16+ |
| Business DB | MySQL | 8.x |
| ORM | MyBatis-Plus | 3.5.x |
| Frontend | Vue 3 + Vite | 3.5.x |
| UI Components | Element Plus | 2.x |
| State Management | Pinia | 2.x |
| HTTP | Axios + EventSource (SSE) | - |

---

## Backend Module Structure

```
ai-agent-platform/
├── agent-server/                  # Spring Boot main app
│   └── src/main/java/com/vincent/agent/
│       ├── controller/            # REST API controllers
│       │   ├── ChatController     # /api/chat (SSE streaming)
│       │   ├── RagController      # /api/rag (doc upload/query)
│       │   └── ToolController     # /api/tools (tool management)
│       ├── agent/                 # Agent core
│       │   ├── ReActAgent         # ReAct reasoning loop
│       │   ├── AgentMemory        # Conversation memory (MySQL)
│       │   └── AgentContext       # Context management
│       ├── rag/                   # RAG pipeline (LangChain4j)
│       │   ├── DocumentService    # Document upload/parse
│       │   ├── EmbeddingService   # Vectorization
│       │   └── RetrievalService   # Retrieval + reranking
│       ├── tool/                  # MCP tool definitions
│       │   ├── WebSearchTool
│       │   ├── CodeExecutorTool
│       │   ├── GitOperationsTool
│       │   ├── SqlQueryTool
│       │   ├── ApiTesterTool
│       │   ├── LogAnalyzerTool
│       │   ├── DocGeneratorTool
│       │   ├── FileManagerTool
│       │   ├── CiCdTriggerTool
│       │   ├── CodeReviewTool
│       │   ├── CalculatorTool
│       │   └── RagSearchTool
│       ├── config/                # Configuration
│       │   ├── SpringAiConfig     # Anthropic + MCP config
│       │   ├── LangChain4jConfig  # RAG + Embedding config
│       │   └── DatabaseConfig     # MySQL + PGVector
│       └── model/                 # Entity classes
│           ├── Conversation
│           ├── Message
│           ├── Document
│           └── ToolExecution
├── mcp-servers/                   # MCP tool servers (separate processes)
│   ├── web-search-server/
│   ├── code-executor-server/
│   └── ...
└── agent-frontend/                # Vue.js frontend
    └── src/
        ├── views/ChatView.vue
        ├── components/
        │   ├── ChatMessage.vue
        │   ├── ToolCallViewer.vue
        │   ├── ReActStepLog.vue
        │   ├── DocumentUploader.vue
        │   └── StreamingText.vue
        └── stores/chatStore.js
```

---

## MCP Tools (12)

| # | Tool | Function | Input | Output |
|---|------|----------|-------|--------|
| 1 | web_search | Internet search | query, maxResults | Search results |
| 2 | code_executor | Run code snippets | language, code | stdout/stderr |
| 3 | git_operations | Git operations | action, repoPath | Git output |
| 4 | sql_query | Execute SQL | datasource, sql | Query results |
| 5 | api_tester | HTTP request testing | method, url, headers, body | Response |
| 6 | log_analyzer | Log analysis | logPath, pattern, timeRange | Matches + stats |
| 7 | doc_generator | Generate docs | type, sourceCode | Markdown doc |
| 8 | file_manager | File read/write | action, path | File content |
| 9 | cicd_trigger | Trigger CI/CD | pipeline, branch, params | Build status |
| 10 | code_review | Code review | filePath, diffContent | Review comments |
| 11 | calculator | Math calculation | expression | Result |
| 12 | rag_search | Knowledge base search | query, topK | Relevant chunks |

---

## ReAct Reasoning Loop

```
User Query → ReActAgent.execute()
  │
  ├─ Step 1: THINK — LLM analyzes, decides if tools needed
  │   ├─ No tools needed → Direct answer → End
  │   └─ Tools needed → Step 2
  │
  ├─ Step 2: ACT — Call selected tool via MCP
  │   └─ Tool returns result
  │
  ├─ Step 3: OBSERVE — LLM observes tool result
  │   ├─ Sufficient → Generate final answer → End
  │   ├─ Need more info → Back to Step 1 (max N iterations)
  │   └─ Tool failed → Self-correct, try alternative
  │
  └─ MAX_ITERATIONS guard → Force best answer
```

---

## RAG Pipeline (LangChain4j)

```
Document Upload → DocumentParser (PDF/MD/HTML/Code)
                      │
                      ▼
                 DocumentSplitter (Recursive, ~512 tokens)
                      │
                      ▼
                 EmbeddingModel (text-embedding-3-small)
                      │
                      ▼
                 PgVectorEmbeddingStore (persist)
                      │
        Query:   ContentRetriever (similarity Top-K)
                      │
                      ▼
                 Inject into Prompt → LLM generates answer with citations
```

**Supported document sources**: PDF, Markdown, text files, code repositories, web URLs.

---

## Database Design (MySQL)

```sql
-- Conversations & Messages
conversation (id, user_id, title, created_at)
message (id, conversation_id, role, content, tool_calls_json, created_at)

-- Tool execution logs
tool_execution (id, message_id, tool_name, input_json, output_json,
                duration_ms, status, created_at)

-- Document management
document (id, filename, file_type, file_size, chunk_count,
          status, created_at)
document_chunk (id, document_id, content, chunk_index,
                embedding_id, created_at)
```

---

## Frontend Design (Vue 3)

### SSE Event Types

```
event: token        → Streaming text content
event: tool_start   → Tool execution begins (name, input)
event: tool_end     → Tool execution ends (output)
event: react_step   → ReAct step (THINK/ACT/OBSERVE)
event: source       → RAG source citations
event: done         → Stream complete
event: error        → Error message
```

### Layout

```
┌──────────────────────────────────────────────┐
│  Header: AI Agent Platform                    │
├────────┬─────────────────────┬───────────────┤
│ Sidebar │    Main Chat Area    │  Right Panel  │
│         │                     │               │
│ History │  Chat messages with  │  ReAct Steps  │
│ Docs    │  streaming text,     │  THINK/ACT/   │
│ Tools   │  tool call cards,    │  OBSERVE log  │
│         │  source citations    │               │
├────────┴─────────────────────┴───────────────┤
│  Input: [Message box]            [Send] [Upload]│
└──────────────────────────────────────────────┘
```

---

## Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Architecture | Spring AI + LangChain4j (Approach A) | Both frameworks get substantial use, matches resume |
| LLM | Anthropic Claude via Spring AI | Native streaming + MCP support |
| MCP Transport | stdio | Simplest for local tool servers |
| Vector DB | PGVector | Lightweight, no extra infra |
| Business DB | MySQL | User preference |
| ORM | MyBatis-Plus | Common in Java ecosystem, flexible SQL |
| Frontend | Vue 3 + Element Plus | User preference from resume |
| Streaming | SSE (Server-Sent Events) | Simpler than WebSocket for one-way streaming |
