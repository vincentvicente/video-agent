# AI Agent Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack AI agent platform with Spring Boot + Vue.js, integrating Spring AI (Anthropic/MCP) and LangChain4j (RAG) with 12 developer tools and ReAct reasoning.

**Architecture:** Spring AI handles LLM interaction (Anthropic Claude), MCP tool calling, and SSE streaming. LangChain4j handles the RAG pipeline (document ingestion, splitting, embedding, PGVector retrieval). A custom ReAct engine orchestrates Plan→Act→Observe loops. Vue 3 frontend renders streaming tokens, tool call cards, and reasoning steps.

**Tech Stack:** Spring Boot 3.3, Spring AI 1.0.x, LangChain4j 1.0.x (stable), Anthropic Claude, MyBatis-Plus, MySQL 8, PostgreSQL 16 + pgvector, Vue 3, Element Plus, Pinia, Vite.

**Design Doc:** `docs/plans/2026-02-12-ai-agent-platform-design.md`

---

## Phase 1: Project Scaffolding & Database Setup

### Task 1.1: Initialize Spring Boot Project

**Files:**
- Create: `ai-agent-platform/agent-server/pom.xml`
- Create: `ai-agent-platform/agent-server/src/main/java/com/vincent/agent/AgentApplication.java`
- Create: `ai-agent-platform/agent-server/src/main/resources/application.yml`
- Create: `ai-agent-platform/pom.xml` (parent pom)

**Step 1: Create parent pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.vincent</groupId>
    <artifactId>ai-agent-platform</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>
    <name>AI Agent Platform</name>

    <modules>
        <module>agent-server</module>
    </modules>

    <properties>
        <java.version>17</java.version>
        <spring-boot.version>3.3.6</spring-boot.version>
        <spring-ai.version>1.0.0</spring-ai.version>
        <langchain4j.version>1.0.0-beta3</langchain4j.version>
        <mybatis-plus.version>3.5.9</mybatis-plus.version>
    </properties>
</project>
```

**Step 2: Create agent-server/pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.6</version>
        <relativePath/>
    </parent>

    <groupId>com.vincent</groupId>
    <artifactId>agent-server</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <name>Agent Server</name>

    <properties>
        <java.version>17</java.version>
        <spring-ai.version>1.0.0</spring-ai.version>
        <langchain4j.version>1.0.0-beta3</langchain4j.version>
        <mybatis-plus.version>3.5.9</mybatis-plus.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.ai</groupId>
                <artifactId>spring-ai-bom</artifactId>
                <version>${spring-ai.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>
        <!-- Spring Boot -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Spring AI - Anthropic -->
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-starter-model-anthropic</artifactId>
        </dependency>

        <!-- Spring AI - MCP Client -->
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-starter-mcp-client</artifactId>
        </dependency>

        <!-- LangChain4j - Core + RAG -->
        <dependency>
            <groupId>dev.langchain4j</groupId>
            <artifactId>langchain4j-spring-boot-starter</artifactId>
            <version>${langchain4j.version}</version>
        </dependency>
        <dependency>
            <groupId>dev.langchain4j</groupId>
            <artifactId>langchain4j-pgvector</artifactId>
            <version>${langchain4j.version}</version>
        </dependency>
        <dependency>
            <groupId>dev.langchain4j</groupId>
            <artifactId>langchain4j-document-parser-apache-pdfbox</artifactId>
            <version>${langchain4j.version}</version>
        </dependency>
        <dependency>
            <groupId>dev.langchain4j</groupId>
            <artifactId>langchain4j-open-ai-spring-boot-starter</artifactId>
            <version>${langchain4j.version}</version>
        </dependency>

        <!-- MyBatis-Plus + MySQL -->
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
            <version>${mybatis-plus.version}</version>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- PostgreSQL (for PGVector) -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>

    <repositories>
        <repository>
            <id>spring-milestones</id>
            <name>Spring Milestones</name>
            <url>https://repo.spring.io/milestone</url>
            <snapshots><enabled>false</enabled></snapshots>
        </repository>
    </repositories>
</project>
```

**Step 3: Create application entry point**

```java
// AgentApplication.java
package com.vincent.agent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AgentApplication {
    public static void main(String[] args) {
        SpringApplication.run(AgentApplication.class, args);
    }
}
```

**Step 4: Create application.yml**

```yaml
server:
  port: 8080

spring:
  application:
    name: ai-agent-platform

  # MySQL datasource
  datasource:
    url: jdbc:mysql://localhost:3306/ai_agent?useSSL=false&serverTimezone=UTC&characterEncoding=utf8mb4
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver

  # Spring AI - Anthropic
  ai:
    anthropic:
      api-key: ${ANTHROPIC_API_KEY}
      chat:
        options:
          model: claude-sonnet-4-5-20250929
          max-tokens: 4096
          temperature: 0.7

    # MCP Client config
    mcp:
      client:
        stdio:
          servers-configuration: classpath:mcp-servers.json

# MyBatis-Plus
mybatis-plus:
  mapper-locations: classpath:mapper/*.xml
  configuration:
    map-underscore-to-camel-case: true

# PGVector connection (used by LangChain4j directly)
pgvector:
  host: localhost
  port: 5432
  database: ai_agent_vectors
  user: postgres
  password: postgres

# LangChain4j - OpenAI embeddings
langchain4j:
  open-ai:
    embedding-model:
      api-key: ${OPENAI_API_KEY}
      model-name: text-embedding-3-small

logging:
  level:
    com.vincent.agent: DEBUG
    org.springframework.ai: DEBUG
```

**Step 5: Create mcp-servers.json placeholder**

```json
{
  "mcpServers": {}
}
```

Place at: `agent-server/src/main/resources/mcp-servers.json`

**Step 6: Verify build compiles**

Run: `cd ai-agent-platform && mvn clean compile -pl agent-server`
Expected: BUILD SUCCESS

**Step 7: Commit**

```bash
git add ai-agent-platform/
git commit -m "feat: scaffold Spring Boot project with Spring AI + LangChain4j dependencies"
```

---

### Task 1.2: Database Schema Setup

**Files:**
- Create: `ai-agent-platform/agent-server/src/main/resources/db/migration/V1__init_schema.sql`
- Create: `ai-agent-platform/agent-server/src/main/resources/db/pgvector_init.sql`

**Step 1: Create MySQL schema**

```sql
-- V1__init_schema.sql
CREATE DATABASE IF NOT EXISTS ai_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_agent;

-- Conversations
CREATE TABLE conversation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Messages
CREATE TABLE message (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL COMMENT 'user/assistant/system/tool',
    content TEXT,
    tool_calls_json JSON COMMENT 'tool call details if role=assistant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE,
    INDEX idx_conversation_id (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tool execution logs
CREATE TABLE tool_execution (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT,
    tool_name VARCHAR(100) NOT NULL,
    input_json JSON,
    output_json JSON,
    duration_ms INT,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' COMMENT 'SUCCESS/FAILED/TIMEOUT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES message(id) ON DELETE SET NULL,
    INDEX idx_tool_name (tool_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Document management
CREATE TABLE document (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT,
    chunk_count INT DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/PROCESSING/COMPLETED/FAILED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Step 2: Create PGVector init script**

```sql
-- pgvector_init.sql
-- Run against PostgreSQL
CREATE DATABASE ai_agent_vectors;
\c ai_agent_vectors;
CREATE EXTENSION IF NOT EXISTS vector;
```

**Step 3: Run MySQL schema locally**

Run: `mysql -u root -p < ai-agent-platform/agent-server/src/main/resources/db/migration/V1__init_schema.sql`
Expected: No errors

**Step 4: Run PGVector init locally**

Run: `psql -U postgres -f ai-agent-platform/agent-server/src/main/resources/db/pgvector_init.sql`
Expected: CREATE EXTENSION

**Step 5: Commit**

```bash
git add ai-agent-platform/agent-server/src/main/resources/db/
git commit -m "feat: add MySQL and PGVector database schemas"
```

---

### Task 1.3: Entity Classes + MyBatis-Plus Mappers

**Files:**
- Create: `agent-server/src/main/java/com/vincent/agent/model/entity/Conversation.java`
- Create: `agent-server/src/main/java/com/vincent/agent/model/entity/Message.java`
- Create: `agent-server/src/main/java/com/vincent/agent/model/entity/ToolExecution.java`
- Create: `agent-server/src/main/java/com/vincent/agent/model/entity/Document.java`
- Create: `agent-server/src/main/java/com/vincent/agent/mapper/ConversationMapper.java`
- Create: `agent-server/src/main/java/com/vincent/agent/mapper/MessageMapper.java`
- Create: `agent-server/src/main/java/com/vincent/agent/mapper/ToolExecutionMapper.java`
- Create: `agent-server/src/main/java/com/vincent/agent/mapper/DocumentMapper.java`

**Step 1: Create entity classes**

```java
// Conversation.java
package com.vincent.agent.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("conversation")
public class Conversation {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String title;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
```

```java
// Message.java
package com.vincent.agent.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName(value = "message", autoResultMap = true)
public class Message {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long conversationId;
    private String role;
    private String content;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Object toolCallsJson;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
```

```java
// ToolExecution.java
package com.vincent.agent.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName(value = "tool_execution", autoResultMap = true)
public class ToolExecution {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long messageId;
    private String toolName;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Object inputJson;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Object outputJson;
    private Integer durationMs;
    private String status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
```

```java
// Document.java
package com.vincent.agent.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("document")
public class Document {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String filename;
    private String fileType;
    private Long fileSize;
    private Integer chunkCount;
    private String status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
```

**Step 2: Create mapper interfaces**

```java
// ConversationMapper.java
package com.vincent.agent.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.vincent.agent.model.entity.Conversation;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ConversationMapper extends BaseMapper<Conversation> {
}
```

```java
// MessageMapper.java
package com.vincent.agent.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.vincent.agent.model.entity.Message;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MessageMapper extends BaseMapper<Message> {
}
```

```java
// ToolExecutionMapper.java
package com.vincent.agent.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.vincent.agent.model.entity.ToolExecution;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ToolExecutionMapper extends BaseMapper<ToolExecution> {
}
```

```java
// DocumentMapper.java
package com.vincent.agent.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.vincent.agent.model.entity.Document;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface DocumentMapper extends BaseMapper<Document> {
}
```

**Step 3: Verify compile**

Run: `cd ai-agent-platform && mvn clean compile -pl agent-server`
Expected: BUILD SUCCESS

**Step 4: Commit**

```bash
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/model/
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/mapper/
git commit -m "feat: add entity classes and MyBatis-Plus mappers"
```

---

## Phase 2: Spring AI + Anthropic Chat & Streaming

### Task 2.1: Anthropic ChatModel Configuration

**Files:**
- Create: `agent-server/src/main/java/com/vincent/agent/config/SpringAiConfig.java`
- Test: `agent-server/src/test/java/com/vincent/agent/config/SpringAiConfigTest.java`

**Step 1: Write the test**

```java
package com.vincent.agent.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.ai.chat.model.ChatModel;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class SpringAiConfigTest {

    @Autowired
    private ChatModel chatModel;

    @Test
    void chatModelBeanShouldBeLoaded() {
        assertNotNull(chatModel);
    }
}
```

**Step 2: Create config class**

```java
package com.vincent.agent.config;

import org.springframework.context.annotation.Configuration;

@Configuration
public class SpringAiConfig {
    // Spring AI auto-configures ChatModel from application.yml
    // This class is a placeholder for future custom beans
}
```

**Step 3: Run test**

Run: `cd ai-agent-platform && mvn test -pl agent-server -Dtest=SpringAiConfigTest`
Expected: PASS (requires ANTHROPIC_API_KEY env var)

**Step 4: Commit**

```bash
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/config/SpringAiConfig.java
git add ai-agent-platform/agent-server/src/test/
git commit -m "feat: configure Spring AI Anthropic ChatModel"
```

---

### Task 2.2: Chat Controller with SSE Streaming

**Files:**
- Create: `agent-server/src/main/java/com/vincent/agent/controller/ChatController.java`
- Create: `agent-server/src/main/java/com/vincent/agent/model/dto/ChatRequest.java`
- Create: `agent-server/src/main/java/com/vincent/agent/service/ChatService.java`

**Step 1: Create DTO**

```java
package com.vincent.agent.model.dto;

import lombok.Data;

@Data
public class ChatRequest {
    private Long conversationId;
    private String message;
}
```

**Step 2: Create ChatService**

```java
package com.vincent.agent.service;

import com.vincent.agent.mapper.ConversationMapper;
import com.vincent.agent.mapper.MessageMapper;
import com.vincent.agent.model.entity.Conversation;
import com.vincent.agent.model.entity.Message;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatModel chatModel;
    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;

    public Flux<String> streamChat(Long conversationId, String userMessage) {
        // Ensure conversation exists
        if (conversationId == null) {
            Conversation conv = new Conversation();
            conv.setTitle(userMessage.length() > 50 ? userMessage.substring(0, 50) : userMessage);
            conversationMapper.insert(conv);
            conversationId = conv.getId();
        }

        // Save user message
        Message userMsg = new Message();
        userMsg.setConversationId(conversationId);
        userMsg.setRole("user");
        userMsg.setContent(userMessage);
        messageMapper.insert(userMsg);

        // Stream response from Anthropic
        Prompt prompt = new Prompt(userMessage);
        final Long convId = conversationId;

        StringBuilder fullResponse = new StringBuilder();

        return chatModel.stream(prompt)
                .map(response -> {
                    String content = response.getResult() != null
                            ? response.getResult().getOutput().getText()
                            : "";
                    if (content != null) {
                        fullResponse.append(content);
                    }
                    return content != null ? content : "";
                })
                .doOnComplete(() -> {
                    // Save assistant message after stream completes
                    Message assistantMsg = new Message();
                    assistantMsg.setConversationId(convId);
                    assistantMsg.setRole("assistant");
                    assistantMsg.setContent(fullResponse.toString());
                    messageMapper.insert(assistantMsg);
                });
    }
}
```

**Step 3: Create ChatController with SSE**

```java
package com.vincent.agent.controller;

import com.vincent.agent.model.dto.ChatRequest;
import com.vincent.agent.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatService chatService;

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamChat(@RequestBody ChatRequest request) {
        return chatService.streamChat(request.getConversationId(), request.getMessage());
    }
}
```

**Step 4: Verify compile**

Run: `cd ai-agent-platform && mvn clean compile -pl agent-server`
Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/controller/ChatController.java
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/model/dto/ChatRequest.java
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/service/ChatService.java
git commit -m "feat: add ChatController with SSE streaming via Anthropic"
```

---

## Phase 3: ReAct Agent Engine

### Task 3.1: ReAct Core Loop

**Files:**
- Create: `agent-server/src/main/java/com/vincent/agent/agent/ReActAgent.java`
- Create: `agent-server/src/main/java/com/vincent/agent/agent/ReActStep.java`
- Create: `agent-server/src/main/java/com/vincent/agent/agent/AgentContext.java`

**Step 1: Create ReActStep model**

```java
package com.vincent.agent.agent;

import lombok.Data;

@Data
public class ReActStep {
    public enum Type { THINK, ACT, OBSERVE }

    private Type type;
    private String content;
    private String toolName;
    private Object toolInput;
    private Object toolOutput;
    private long durationMs;
}
```

**Step 2: Create AgentContext**

```java
package com.vincent.agent.agent;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
public class AgentContext {
    private Long conversationId;
    private String userQuery;
    private List<ReActStep> steps = new ArrayList<>();
    private String finalAnswer;
    private int maxIterations = 5;
    private int currentIteration = 0;
}
```

**Step 3: Create ReActAgent**

```java
package com.vincent.agent.agent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.SystemPromptTemplate;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReActAgent {

    private final ChatModel chatModel;

    private static final String REACT_SYSTEM_PROMPT = """
        You are an AI agent that uses the ReAct (Reasoning + Acting) framework.

        For each user query, follow this loop:
        1. THINK: Analyze what you know and what you need to find out.
        2. ACT: If you need more information, call a tool. Specify the tool name and input.
        3. OBSERVE: Review the tool's output and decide if you have enough information.

        Repeat until you can provide a final answer.

        If no tools are needed, respond directly.

        Available tools: {tools}

        Always explain your reasoning step by step.
        """;

    public Flux<ServerSentEvent> execute(String userQuery, List<ToolCallback> tools) {
        Sinks.Many<ServerSentEvent> sink = Sinks.many().unicast().onBackpressureBuffer();

        AgentContext context = new AgentContext();
        context.setUserQuery(userQuery);

        // Execute in background, emit events to sink
        Flux.defer(() -> {
            return chatModel.stream(new Prompt(userQuery))
                    .doOnNext(response -> {
                        String text = response.getResult() != null
                                ? response.getResult().getOutput().getText()
                                : "";
                        if (text != null && !text.isEmpty()) {
                            sink.tryEmitNext(ServerSentEvent.token(text));
                        }
                    })
                    .doOnComplete(() -> {
                        sink.tryEmitNext(ServerSentEvent.done());
                        sink.tryEmitComplete();
                    })
                    .doOnError(e -> {
                        sink.tryEmitNext(ServerSentEvent.error(e.getMessage()));
                        sink.tryEmitComplete();
                    });
        }).subscribe();

        return sink.asFlux();
    }
}
```

```java
// ServerSentEvent helper
package com.vincent.agent.agent;

import lombok.Data;

@Data
public class ServerSentEvent {
    private String type; // token, tool_start, tool_end, react_step, source, done, error
    private Object data;

    public static ServerSentEvent token(String content) {
        ServerSentEvent e = new ServerSentEvent();
        e.setType("token");
        e.setData(content);
        return e;
    }

    public static ServerSentEvent toolStart(String toolName, Object input) {
        ServerSentEvent e = new ServerSentEvent();
        e.setType("tool_start");
        e.setData(java.util.Map.of("tool", toolName, "input", input));
        return e;
    }

    public static ServerSentEvent toolEnd(String toolName, Object output) {
        ServerSentEvent e = new ServerSentEvent();
        e.setType("tool_end");
        e.setData(java.util.Map.of("tool", toolName, "output", output));
        return e;
    }

    public static ServerSentEvent reactStep(String step, String content) {
        ServerSentEvent e = new ServerSentEvent();
        e.setType("react_step");
        e.setData(java.util.Map.of("step", step, "content", content));
        return e;
    }

    public static ServerSentEvent done() {
        ServerSentEvent e = new ServerSentEvent();
        e.setType("done");
        e.setData(java.util.Map.of());
        return e;
    }

    public static ServerSentEvent error(String message) {
        ServerSentEvent e = new ServerSentEvent();
        e.setType("error");
        e.setData(java.util.Map.of("message", message));
        return e;
    }
}
```

**Step 4: Verify compile**

Run: `cd ai-agent-platform && mvn clean compile -pl agent-server`
Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/agent/
git commit -m "feat: implement ReAct agent engine with SSE event streaming"
```

---

## Phase 4: MCP Tool Integration

### Task 4.1: Define 3 Core MCP Tools (calculator, web_search, file_manager)

**Files:**
- Create: `agent-server/src/main/java/com/vincent/agent/tool/CalculatorTool.java`
- Create: `agent-server/src/main/java/com/vincent/agent/tool/WebSearchTool.java`
- Create: `agent-server/src/main/java/com/vincent/agent/tool/FileManagerTool.java`

**Step 1: Create CalculatorTool**

```java
package com.vincent.agent.tool;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;

@Component
public class CalculatorTool {

    @Tool(description = "Evaluate a mathematical expression and return the result. Supports +, -, *, /, ^, (), and standard math functions.")
    public String calculate(
            @ToolParam(description = "The mathematical expression to evaluate, e.g. '2 + 3 * 4'") String expression) {
        try {
            ScriptEngine engine = new ScriptEngineManager().getEngineByName("js");
            Object result = engine.eval(expression);
            return "Result: " + result.toString();
        } catch (Exception e) {
            return "Error evaluating expression: " + e.getMessage();
        }
    }
}
```

**Step 2: Create WebSearchTool (mock for now)**

```java
package com.vincent.agent.tool;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class WebSearchTool {

    @Tool(description = "Search the internet for information. Returns a list of relevant search results with titles, URLs, and snippets.")
    public List<Map<String, String>> webSearch(
            @ToolParam(description = "The search query") String query,
            @ToolParam(description = "Maximum number of results to return (default 5)") int maxResults) {
        // TODO: Integrate with real search API (SerpAPI, Tavily, etc.)
        return List.of(
                Map.of("title", "Search result for: " + query,
                       "url", "https://example.com",
                       "snippet", "This is a placeholder search result. Integrate with a real search API.")
        );
    }
}
```

**Step 3: Create FileManagerTool**

```java
package com.vincent.agent.tool;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Collectors;

@Component
public class FileManagerTool {

    private static final Path BASE_DIR = Path.of(System.getProperty("user.dir"), "workspace");

    @Tool(description = "Read, write, or list files in the workspace directory.")
    public String fileOperation(
            @ToolParam(description = "Action to perform: read, write, or list") String action,
            @ToolParam(description = "Relative file path within workspace") String path,
            @ToolParam(description = "Content to write (only for write action)") String content) {
        try {
            Path targetPath = BASE_DIR.resolve(path).normalize();
            if (!targetPath.startsWith(BASE_DIR)) {
                return "Error: Path traversal not allowed";
            }

            return switch (action.toLowerCase()) {
                case "read" -> Files.readString(targetPath);
                case "write" -> {
                    Files.createDirectories(targetPath.getParent());
                    Files.writeString(targetPath, content);
                    yield "File written successfully: " + path;
                }
                case "list" -> {
                    if (!Files.isDirectory(targetPath)) {
                        yield "Error: Not a directory";
                    }
                    yield Files.list(targetPath)
                            .map(p -> p.getFileName().toString())
                            .collect(Collectors.joining("\n"));
                }
                default -> "Error: Unknown action. Use read, write, or list.";
            };
        } catch (IOException e) {
            return "Error: " + e.getMessage();
        }
    }
}
```

**Step 4: Verify compile**

Run: `cd ai-agent-platform && mvn clean compile -pl agent-server`
Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/tool/
git commit -m "feat: add calculator, web search, and file manager tools"
```

---

### Task 4.2: Wire Tools into ChatController

**Files:**
- Modify: `agent-server/src/main/java/com/vincent/agent/controller/ChatController.java`
- Modify: `agent-server/src/main/java/com/vincent/agent/service/ChatService.java`

**Step 1: Update ChatService to use tools**

```java
package com.vincent.agent.service;

import com.vincent.agent.mapper.ConversationMapper;
import com.vincent.agent.mapper.MessageMapper;
import com.vincent.agent.model.entity.Conversation;
import com.vincent.agent.model.entity.Message;
import com.vincent.agent.tool.CalculatorTool;
import com.vincent.agent.tool.FileManagerTool;
import com.vincent.agent.tool.WebSearchTool;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatModel chatModel;
    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final CalculatorTool calculatorTool;
    private final WebSearchTool webSearchTool;
    private final FileManagerTool fileManagerTool;

    public Flux<String> streamChat(Long conversationId, String userMessage) {
        // Ensure conversation exists
        if (conversationId == null) {
            Conversation conv = new Conversation();
            conv.setTitle(userMessage.length() > 50 ? userMessage.substring(0, 50) : userMessage);
            conversationMapper.insert(conv);
            conversationId = conv.getId();
        }

        // Save user message
        Message userMsg = new Message();
        userMsg.setConversationId(conversationId);
        userMsg.setRole("user");
        userMsg.setContent(userMessage);
        messageMapper.insert(userMsg);

        final Long convId = conversationId;
        StringBuilder fullResponse = new StringBuilder();

        return ChatClient.create(chatModel)
                .prompt()
                .user(userMessage)
                .tools(calculatorTool, webSearchTool, fileManagerTool)
                .stream()
                .content()
                .doOnNext(token -> fullResponse.append(token))
                .doOnComplete(() -> {
                    Message assistantMsg = new Message();
                    assistantMsg.setConversationId(convId);
                    assistantMsg.setRole("assistant");
                    assistantMsg.setContent(fullResponse.toString());
                    messageMapper.insert(assistantMsg);
                });
    }
}
```

**Step 2: Verify compile**

Run: `cd ai-agent-platform && mvn clean compile -pl agent-server`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/service/ChatService.java
git commit -m "feat: wire tools into ChatService with Spring AI ChatClient"
```

---

## Phase 5: RAG Pipeline (LangChain4j)

### Task 5.1: RAG Configuration + Document Ingestion Service

**Files:**
- Create: `agent-server/src/main/java/com/vincent/agent/config/LangChain4jConfig.java`
- Create: `agent-server/src/main/java/com/vincent/agent/rag/DocumentService.java`
- Create: `agent-server/src/main/java/com/vincent/agent/rag/RetrievalService.java`
- Create: `agent-server/src/main/java/com/vincent/agent/controller/RagController.java`

**Step 1: Create LangChain4j Config**

```java
package com.vincent.agent.config;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.pgvector.PgVectorEmbeddingStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LangChain4jConfig {

    @Value("${pgvector.host}")
    private String pgHost;

    @Value("${pgvector.port}")
    private int pgPort;

    @Value("${pgvector.database}")
    private String pgDatabase;

    @Value("${pgvector.user}")
    private String pgUser;

    @Value("${pgvector.password}")
    private String pgPassword;

    @Bean
    public EmbeddingStore<TextSegment> embeddingStore() {
        return PgVectorEmbeddingStore.builder()
                .host(pgHost)
                .port(pgPort)
                .database(pgDatabase)
                .user(pgUser)
                .password(pgPassword)
                .table("document_embeddings")
                .dimension(1536)
                .build();
    }
}
```

**Step 2: Create DocumentService**

```java
package com.vincent.agent.rag;

import com.vincent.agent.mapper.DocumentMapper;
import com.vincent.agent.model.entity.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.parser.apache.pdfbox.ApachePdfBoxDocumentParser;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.EmbeddingStoreIngestor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

import static dev.langchain4j.data.document.loader.FileSystemDocumentLoader.loadDocument;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final EmbeddingStore<TextSegment> embeddingStore;
    private final EmbeddingModel embeddingModel;
    private final DocumentMapper documentMapper;

    public Document ingestDocument(MultipartFile file) {
        // Save document metadata
        Document doc = new Document();
        doc.setFilename(file.getOriginalFilename());
        doc.setFileType(file.getContentType());
        doc.setFileSize(file.getSize());
        doc.setStatus("PROCESSING");
        documentMapper.insert(doc);

        try {
            // Parse document
            dev.langchain4j.data.document.Document langchainDoc;
            if (file.getOriginalFilename() != null && file.getOriginalFilename().endsWith(".pdf")) {
                langchainDoc = new ApachePdfBoxDocumentParser().parse(file.getInputStream());
            } else {
                String content = new String(file.getBytes());
                langchainDoc = dev.langchain4j.data.document.Document.from(content);
            }

            // Split and ingest
            DocumentSplitter splitter = DocumentSplitters.recursive(500, 50);
            EmbeddingStoreIngestor ingestor = EmbeddingStoreIngestor.builder()
                    .documentSplitter(splitter)
                    .embeddingModel(embeddingModel)
                    .embeddingStore(embeddingStore)
                    .build();

            ingestor.ingest(langchainDoc);

            doc.setStatus("COMPLETED");
            doc.setChunkCount(splitter.split(langchainDoc).size());
            documentMapper.updateById(doc);

            log.info("Document ingested: {} ({} chunks)", doc.getFilename(), doc.getChunkCount());
        } catch (Exception e) {
            doc.setStatus("FAILED");
            documentMapper.updateById(doc);
            log.error("Failed to ingest document: {}", doc.getFilename(), e);
            throw new RuntimeException("Document ingestion failed", e);
        }

        return doc;
    }
}
```

**Step 3: Create RetrievalService**

```java
package com.vincent.agent.rag;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingSearchResult;
import dev.langchain4j.store.embedding.EmbeddingStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RetrievalService {

    private final EmbeddingStore<TextSegment> embeddingStore;
    private final EmbeddingModel embeddingModel;

    public List<String> retrieve(String query, int topK) {
        var queryEmbedding = embeddingModel.embed(query).content();
        EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                .queryEmbedding(queryEmbedding)
                .maxResults(topK)
                .minScore(0.5)
                .build();

        EmbeddingSearchResult<TextSegment> results = embeddingStore.search(searchRequest);

        return results.matches().stream()
                .map(match -> match.embedded().text())
                .toList();
    }
}
```

**Step 4: Create RagController**

```java
package com.vincent.agent.controller;

import com.vincent.agent.model.entity.Document;
import com.vincent.agent.rag.DocumentService;
import com.vincent.agent.rag.RetrievalService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RagController {

    private final DocumentService documentService;
    private final RetrievalService retrievalService;

    @PostMapping("/upload")
    public Document uploadDocument(@RequestParam("file") MultipartFile file) {
        return documentService.ingestDocument(file);
    }

    @GetMapping("/search")
    public Map<String, Object> search(
            @RequestParam String query,
            @RequestParam(defaultValue = "5") int topK) {
        List<String> results = retrievalService.retrieve(query, topK);
        return Map.of("query", query, "results", results);
    }
}
```

**Step 5: Verify compile**

Run: `cd ai-agent-platform && mvn clean compile -pl agent-server`
Expected: BUILD SUCCESS

**Step 6: Commit**

```bash
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/config/LangChain4jConfig.java
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/rag/
git add ai-agent-platform/agent-server/src/main/java/com/vincent/agent/controller/RagController.java
git commit -m "feat: implement RAG pipeline with LangChain4j and PGVector"
```

---

## Phase 6: Vue.js Frontend

### Task 6.1: Scaffold Vue 3 Project

**Step 1: Create Vue project**

Run: `cd ai-agent-platform && npm create vite@latest agent-frontend -- --template vue`
Expected: Project created

**Step 2: Install dependencies**

Run: `cd ai-agent-platform/agent-frontend && npm install && npm install element-plus pinia axios @element-plus/icons-vue`
Expected: Dependencies installed

**Step 3: Commit**

```bash
git add ai-agent-platform/agent-frontend/
git commit -m "feat: scaffold Vue 3 frontend with Element Plus and Pinia"
```

---

### Task 6.2: Chat UI with SSE Streaming

**Files:**
- Create: `agent-frontend/src/views/ChatView.vue`
- Create: `agent-frontend/src/components/ChatMessage.vue`
- Create: `agent-frontend/src/components/ToolCallViewer.vue`
- Create: `agent-frontend/src/components/ReActStepLog.vue`
- Create: `agent-frontend/src/stores/chatStore.js`
- Create: `agent-frontend/src/api/agent.js`
- Modify: `agent-frontend/src/App.vue`
- Modify: `agent-frontend/src/main.js`

**Step 1: Create API layer**

```javascript
// src/api/agent.js
import axios from 'axios'

const API_BASE = 'http://localhost:8080/api'

export function streamChat(conversationId, message, onToken, onToolStart, onToolEnd, onReactStep, onDone, onError) {
  const response = fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message })
  })

  response.then(async (res) => {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) { onDone(); break }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim()
          if (data) onToken(data)
        }
      }
    }
  }).catch(onError)
}

export async function uploadDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await axios.post(`${API_BASE}/rag/upload`, formData)
  return res.data
}

export async function searchRag(query, topK = 5) {
  const res = await axios.get(`${API_BASE}/rag/search`, { params: { query, topK } })
  return res.data
}
```

**Step 2: Create chat store**

```javascript
// src/stores/chatStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref([])
  const currentConversationId = ref(null)
  const messages = ref([])
  const isStreaming = ref(false)
  const reactSteps = ref([])

  function addMessage(role, content) {
    messages.value.push({ role, content, timestamp: Date.now() })
  }

  function appendToLastMessage(token) {
    const last = messages.value[messages.value.length - 1]
    if (last && last.role === 'assistant') {
      last.content += token
    }
  }

  function addReactStep(step) {
    reactSteps.value.push(step)
  }

  function clearReactSteps() {
    reactSteps.value = []
  }

  function startNewConversation() {
    currentConversationId.value = null
    messages.value = []
    reactSteps.value = []
  }

  return {
    conversations, currentConversationId, messages, isStreaming, reactSteps,
    addMessage, appendToLastMessage, addReactStep, clearReactSteps, startNewConversation
  }
})
```

**Step 3: Create ChatMessage component**

```vue
<!-- src/components/ChatMessage.vue -->
<template>
  <div class="chat-message" :class="message.role">
    <div class="avatar">
      <el-avatar :size="36">
        {{ message.role === 'user' ? 'U' : 'AI' }}
      </el-avatar>
    </div>
    <div class="content">
      <div class="bubble" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: { type: Object, required: true }
})

const renderedContent = computed(() => {
  return props.message.content.replace(/\n/g, '<br>')
})
</script>

<style scoped>
.chat-message {
  display: flex;
  gap: 12px;
  padding: 16px;
}
.chat-message.user {
  flex-direction: row-reverse;
}
.chat-message.user .bubble {
  background: #409eff;
  color: white;
}
.bubble {
  background: #f4f4f5;
  border-radius: 12px;
  padding: 12px 16px;
  max-width: 70%;
  line-height: 1.6;
}
</style>
```

**Step 4: Create ToolCallViewer component**

```vue
<!-- src/components/ToolCallViewer.vue -->
<template>
  <el-card class="tool-card" shadow="hover" v-if="toolCall">
    <template #header>
      <div class="tool-header">
        <el-icon><Setting /></el-icon>
        <span>{{ toolCall.tool }}</span>
        <el-tag :type="toolCall.status === 'running' ? 'warning' : 'success'" size="small">
          {{ toolCall.status }}
        </el-tag>
      </div>
    </template>
    <div class="tool-body">
      <div class="tool-section" v-if="toolCall.input">
        <strong>Input:</strong>
        <pre>{{ JSON.stringify(toolCall.input, null, 2) }}</pre>
      </div>
      <div class="tool-section" v-if="toolCall.output">
        <strong>Output:</strong>
        <pre>{{ JSON.stringify(toolCall.output, null, 2) }}</pre>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { Setting } from '@element-plus/icons-vue'

defineProps({
  toolCall: { type: Object, required: true }
})
</script>

<style scoped>
.tool-card { margin: 8px 0; max-width: 600px; }
.tool-header { display: flex; align-items: center; gap: 8px; }
pre { background: #1e1e1e; color: #d4d4d4; padding: 8px; border-radius: 6px; font-size: 12px; overflow-x: auto; }
</style>
```

**Step 5: Create ReActStepLog component**

```vue
<!-- src/components/ReActStepLog.vue -->
<template>
  <div class="react-log">
    <h4>Reasoning Steps</h4>
    <el-timeline>
      <el-timeline-item
        v-for="(step, idx) in steps"
        :key="idx"
        :type="stepColor(step.type)"
        :timestamp="step.type"
        placement="top"
      >
        <p>{{ step.content }}</p>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup>
defineProps({
  steps: { type: Array, default: () => [] }
})

function stepColor(type) {
  const colors = { THINK: 'primary', ACT: 'warning', OBSERVE: 'success' }
  return colors[type] || 'info'
}
</script>

<style scoped>
.react-log { padding: 16px; }
h4 { margin-bottom: 12px; }
</style>
```

**Step 6: Create main ChatView**

```vue
<!-- src/views/ChatView.vue -->
<template>
  <el-container class="chat-container">
    <!-- Sidebar -->
    <el-aside width="240px" class="sidebar">
      <div class="sidebar-header">
        <el-button type="primary" @click="store.startNewConversation()">
          + New Chat
        </el-button>
      </div>
      <div class="conversation-list">
        <div class="conv-item" v-for="conv in store.conversations" :key="conv.id">
          {{ conv.title }}
        </div>
      </div>
    </el-aside>

    <!-- Main chat -->
    <el-main class="chat-main">
      <div class="messages" ref="messagesRef">
        <ChatMessage
          v-for="(msg, idx) in store.messages"
          :key="idx"
          :message="msg"
        />
        <div v-if="store.isStreaming" class="typing-indicator">
          <span>AI is thinking...</span>
        </div>
      </div>

      <div class="input-area">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="2"
          placeholder="Send a message..."
          @keydown.enter.exact.prevent="sendMessage"
        />
        <div class="input-actions">
          <el-upload :before-upload="handleUpload" :show-file-list="false">
            <el-button :icon="Upload">Upload</el-button>
          </el-upload>
          <el-button type="primary" @click="sendMessage" :loading="store.isStreaming">
            Send
          </el-button>
        </div>
      </div>
    </el-main>

    <!-- Right panel: ReAct steps -->
    <el-aside width="280px" class="react-panel">
      <ReActStepLog :steps="store.reactSteps" />
    </el-aside>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { Upload } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chatStore'
import { streamChat, uploadDocument } from '../api/agent'
import ChatMessage from '../components/ChatMessage.vue'
import ReActStepLog from '../components/ReActStepLog.vue'

const store = useChatStore()
const inputText = ref('')
const messagesRef = ref(null)

async function sendMessage() {
  if (!inputText.value.trim() || store.isStreaming) return

  const message = inputText.value.trim()
  inputText.value = ''

  store.addMessage('user', message)
  store.addMessage('assistant', '')
  store.isStreaming = true
  store.clearReactSteps()

  streamChat(
    store.currentConversationId,
    message,
    (token) => store.appendToLastMessage(token),
    (data) => store.addReactStep({ type: 'ACT', content: `Calling ${data.tool}...` }),
    (data) => store.addReactStep({ type: 'OBSERVE', content: `${data.tool} returned result` }),
    (data) => store.addReactStep(data),
    () => { store.isStreaming = false },
    (err) => {
      store.appendToLastMessage('\n\n[Error: ' + err.message + ']')
      store.isStreaming = false
    }
  )
}

async function handleUpload(file) {
  try {
    await uploadDocument(file)
    ElMessage.success('Document uploaded and indexed!')
  } catch (e) {
    ElMessage.error('Upload failed: ' + e.message)
  }
  return false
}
</script>

<style scoped>
.chat-container { height: 100vh; }
.sidebar { background: #f5f7fa; border-right: 1px solid #e4e7ed; padding: 16px; }
.sidebar-header { margin-bottom: 16px; }
.chat-main { display: flex; flex-direction: column; padding: 0; }
.messages { flex: 1; overflow-y: auto; padding: 16px; }
.input-area { padding: 16px; border-top: 1px solid #e4e7ed; }
.input-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.react-panel { background: #fafafa; border-left: 1px solid #e4e7ed; overflow-y: auto; }
.typing-indicator { padding: 16px; color: #909399; }
</style>
```

**Step 7: Update App.vue and main.js**

```vue
<!-- src/App.vue -->
<template>
  <ChatView />
</template>

<script setup>
import ChatView from './views/ChatView.vue'
</script>
```

```javascript
// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus)
app.mount('#app')
```

**Step 8: Verify frontend builds**

Run: `cd ai-agent-platform/agent-frontend && npm run build`
Expected: Build success

**Step 9: Commit**

```bash
git add ai-agent-platform/agent-frontend/
git commit -m "feat: implement Vue.js chat UI with SSE streaming and ReAct visualization"
```

---

## Phase 7: Remaining MCP Tools

### Task 7.1: Add remaining 9 tools

**Files to create** (one per tool under `agent-server/src/main/java/com/vincent/agent/tool/`):
- `SqlQueryTool.java`
- `GitOperationsTool.java`
- `ApiTesterTool.java`
- `LogAnalyzerTool.java`
- `DocGeneratorTool.java`
- `CiCdTriggerTool.java`
- `CodeReviewTool.java`
- `CodeExecutorTool.java`
- `RagSearchTool.java`

Each tool follows the same `@Tool` annotation pattern from Task 4.1. Implementation details:

- **SqlQueryTool**: Takes `sql` param, executes via `JdbcTemplate`, returns result rows
- **GitOperationsTool**: Takes `action` (log/diff/blame/status) + `repoPath`, runs `ProcessBuilder` git commands
- **ApiTesterTool**: Takes `method/url/headers/body`, executes via `RestTemplate`, returns response
- **LogAnalyzerTool**: Takes `logPath/pattern/timeRange`, reads file and matches regex
- **DocGeneratorTool**: Takes `type/sourceCode`, uses LLM to generate markdown documentation
- **CiCdTriggerTool**: Mock implementation (returns simulated build status)
- **CodeReviewTool**: Takes `filePath/diffContent`, uses LLM to produce review comments
- **CodeExecutorTool**: Takes `language/code`, executes in sandboxed `ProcessBuilder`
- **RagSearchTool**: Delegates to `RetrievalService.retrieve()`

**Commit after each 3 tools:**

```bash
git commit -m "feat: add SQL, Git, and API tester tools"
git commit -m "feat: add log analyzer, doc generator, and CI/CD tools"
git commit -m "feat: add code review, code executor, and RAG search tools"
```

---

## Phase 8: Integration Testing & Polish

### Task 8.1: End-to-end smoke test

**Step 1:** Start MySQL and PostgreSQL locally
**Step 2:** Run schema scripts from Task 1.2
**Step 3:** Set environment variables: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
**Step 4:** Start backend: `cd ai-agent-platform/agent-server && mvn spring-boot:run`
**Step 5:** Start frontend: `cd ai-agent-platform/agent-frontend && npm run dev`
**Step 6:** Open `http://localhost:5173`, send test messages, verify streaming works
**Step 7:** Upload a PDF, verify RAG search returns results
**Step 8:** Test tool calling: "Calculate 2^10" should trigger calculator tool

### Task 8.2: Final commit

```bash
git add -A
git commit -m "feat: complete AI Agent Platform v1.0 - Spring AI + LangChain4j + Vue.js"
```

---

## Summary

| Phase | Description | Tasks |
|-------|-------------|-------|
| 1 | Project scaffolding + DB | 3 tasks |
| 2 | Spring AI + Anthropic streaming | 2 tasks |
| 3 | ReAct agent engine | 1 task |
| 4 | MCP tool integration (3 core) | 2 tasks |
| 5 | RAG pipeline (LangChain4j) | 1 task |
| 6 | Vue.js frontend | 2 tasks |
| 7 | Remaining 9 tools | 1 task |
| 8 | Integration testing | 2 tasks |
| **Total** | | **14 tasks** |
