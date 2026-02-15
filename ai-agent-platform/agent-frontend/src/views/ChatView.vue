<template>
  <div class="console-layout">
    <!-- Top Bar -->
    <header class="top-bar">
      <div class="top-bar-left">
        <span class="logo-icon">&#9655;</span>
        <span class="logo-text">AGENT CONSOLE</span>
      </div>
      <div class="top-bar-right">
        <span class="status-label">status:</span>
        <span class="status-value">online</span>
        <span class="status-dot"></span>
      </div>
    </header>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Sidebar -->
      <aside class="sidebar">
        <!-- New Session -->
        <button class="new-session-btn" @click="store.startNewConversation()">
          <span class="btn-bracket">[</span>
          <span class="btn-plus">+</span>
          NEW
          <span class="btn-bracket">]</span>
        </button>

        <!-- Sessions -->
        <div class="sidebar-section">
          <div class="section-header" @click="toggleSection('sessions')">
            <span class="section-arrow">{{ sections.sessions ? '&#9662;' : '&#9656;' }}</span>
            <span class="section-title">SESSIONS</span>
            <span class="section-count">{{ store.conversations.length }}</span>
          </div>
          <div v-show="sections.sessions" class="section-items">
            <div
              v-for="conv in store.conversations"
              :key="conv.id"
              class="session-item"
              :class="{ active: conv.id === store.currentConversationId }"
            >
              <span class="item-indicator"></span>
              <span class="item-text">{{ conv.title || 'Untitled' }}</span>
            </div>
            <div v-if="!store.conversations.length" class="empty-hint">
              no active sessions
            </div>
          </div>
        </div>

        <!-- Documents -->
        <div class="sidebar-section">
          <div class="section-header" @click="toggleSection('docs')">
            <span class="section-arrow">{{ sections.docs ? '&#9662;' : '&#9656;' }}</span>
            <span class="section-title">DOCUMENTS</span>
          </div>
          <div v-show="sections.docs" class="section-items">
            <div class="empty-hint">no documents loaded</div>
          </div>
        </div>

        <!-- Tools -->
        <div class="sidebar-section">
          <div class="section-header" @click="toggleSection('tools')">
            <span class="section-arrow">{{ sections.tools ? '&#9662;' : '&#9656;' }}</span>
            <span class="section-title">TOOLS</span>
            <span class="section-count">12</span>
          </div>
          <div v-show="sections.tools" class="section-items tools-grid">
            <span class="tool-tag" v-for="tool in toolList" :key="tool">{{ tool }}</span>
          </div>
        </div>
      </aside>

      <!-- Chat Area -->
      <main class="chat-area">
        <div class="chat-header">
          <span class="chat-icon">&#9673;</span>
          <span class="chat-title">MAIN TERMINAL</span>
        </div>

        <div class="messages-container" ref="messagesRef">
          <!-- Welcome screen -->
          <div v-if="!store.messages.length" class="welcome-screen">
            <div class="welcome-ascii">
              <pre class="ascii-art">
    _                    _
   / \   __ _  ___ _ __ | |_
  / _ \ / _` |/ _ \ '_ \| __|
 / ___ \ (_| |  __/ | | | |_
/_/   \_\__, |\___|_| |_|\__|
        |___/  CONSOLE v1.0</pre>
            </div>
            <p class="welcome-text">AI Agent Platform with ReAct Reasoning</p>
            <p class="welcome-hint">Type a command to begin...</p>
          </div>

          <!-- Messages -->
          <ChatMessage
            v-for="(msg, idx) in store.messages"
            :key="idx"
            :message="msg"
            :toolCalls="getToolCallsForMessage(idx)"
          />

          <!-- Streaming indicator -->
          <div v-if="store.isStreaming" class="streaming-indicator">
            <span class="stream-dot"></span>
            <span class="stream-text">processing</span>
            <span class="stream-cursor">_</span>
          </div>
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <div class="input-wrapper">
            <span class="input-prompt">$</span>
            <el-input
              v-model="inputText"
              type="textarea"
              :rows="1"
              :autosize="{ minRows: 1, maxRows: 5 }"
              placeholder="Enter command..."
              @keydown.enter.exact.prevent="sendMessage"
              class="terminal-input"
            />
          </div>
          <div class="input-actions">
            <el-upload :before-upload="handleUpload" :show-file-list="false" class="upload-wrapper">
              <button class="action-btn upload-btn">
                <span class="btn-bracket">[</span>&#8679; FILE<span class="btn-bracket">]</span>
              </button>
            </el-upload>
            <button
              class="action-btn exec-btn"
              @click="sendMessage"
              :disabled="store.isStreaming"
            >
              <span class="btn-bracket">[</span>EXEC<span class="btn-bracket">]</span>
            </button>
          </div>
        </div>
      </main>

      <!-- ReAct Panel -->
      <aside class="react-panel">
        <div class="panel-header">
          <span class="panel-icon">&#9655;</span>
          <span class="panel-title">REASONING PIPELINE</span>
        </div>
        <ReActStepLog :steps="store.reactSteps" :toolCalls="store.toolCalls" />
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '../stores/chatStore'
import { streamChat, uploadDocument } from '../api/agent'
import ChatMessage from '../components/ChatMessage.vue'
import ReActStepLog from '../components/ReActStepLog.vue'

const store = useChatStore()
const inputText = ref('')
const messagesRef = ref(null)

const sections = reactive({
  sessions: true,
  docs: false,
  tools: true
})

const toolList = [
  'calculator', 'web_search', 'file_manager', 'sql_query',
  'git_ops', 'api_tester', 'log_analyzer', 'doc_generator',
  'cicd_trigger', 'code_review', 'code_executor', 'rag_search'
]

function toggleSection(name) {
  sections[name] = !sections[name]
}

function getToolCallsForMessage(idx) {
  // Tool calls belong to the assistant message they appear in
  const msg = store.messages[idx]
  if (msg.role !== 'assistant') return []
  return store.toolCalls
}

// Auto-scroll to bottom on new messages
watch(() => store.messages.length, () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
})

watch(() => store.messages[store.messages.length - 1]?.content, () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
})

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
    (data) => {
      store.addReactStep({ type: 'ACT', content: `Calling tool: ${data.tool}` })
      store.addToolCall({ tool: data.tool, input: data.input, status: 'running' })
    },
    (data) => {
      store.addReactStep({ type: 'OBSERVE', content: `${data.tool} returned result` })
      store.updateLastToolCall({ output: data.output, status: 'done' })
    },
    (data) => store.addReactStep({ type: data.step || 'THINK', content: data.content }),
    () => { store.isStreaming = false },
    (err) => {
      store.appendToLastMessage('\n\n[Error: ' + (err.message || err) + ']')
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
/* ============================================
   Layout
   ============================================ */
.console-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-deep);
  animation: fade-in 0.5s ease;
}

/* Top Bar */
.top-bar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  animation: fade-in 0.3s ease;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  color: var(--phosphor-green);
  font-size: 12px;
}

.logo-text {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: var(--text-primary);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
}

.status-label {
  color: var(--text-muted);
}

.status-value {
  color: var(--phosphor-green);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--phosphor-green);
  animation: pulse-dot 2s ease-in-out infinite;
  box-shadow: 0 0 6px var(--phosphor-green-glow-strong);
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ============================================
   Sidebar
   ============================================ */
.sidebar {
  width: 220px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  overflow-y: auto;
  flex-shrink: 0;
  animation: fade-in 0.4s ease 0.1s both;
}

.new-session-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0 12px 12px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--phosphor-green);
  color: var(--phosphor-green);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.new-session-btn:hover {
  background: var(--phosphor-green-glow);
  box-shadow: 0 0 12px var(--phosphor-green-glow);
}

.btn-bracket {
  opacity: 0.5;
}

.btn-plus {
  font-weight: bold;
}

.sidebar-section {
  margin-bottom: 4px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.section-header:hover {
  background: var(--bg-elevated);
}

.section-arrow {
  font-size: 10px;
  color: var(--text-muted);
  width: 12px;
}

.section-title {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--text-secondary);
  flex: 1;
}

.section-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-elevated);
  padding: 1px 6px;
  border-radius: 3px;
}

.section-items {
  padding: 4px 0;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px 6px 28px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 13px;
  color: var(--text-secondary);
}

.session-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.session-item.active {
  color: var(--phosphor-green);
}

.session-item.active .item-indicator {
  background: var(--phosphor-green);
  box-shadow: 0 0 4px var(--phosphor-green-glow);
}

.item-indicator {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-ghost);
  flex-shrink: 0;
}

.item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-hint {
  padding: 6px 28px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-ghost);
  font-style: italic;
}

.tools-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 16px 6px 28px;
}

.tool-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  padding: 2px 6px;
  border-radius: 3px;
  transition: all 0.15s ease;
}

.tool-tag:hover {
  color: var(--amber);
  border-color: var(--amber-dim);
}

/* ============================================
   Chat Area
   ============================================ */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  animation: fade-in 0.5s ease 0.2s both;
}

.chat-header {
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.chat-icon {
  color: var(--phosphor-green);
  font-size: 14px;
}

.chat-title {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* Welcome Screen */
.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  animation: fade-in 0.8s ease;
}

.ascii-art {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--phosphor-green);
  line-height: 1.3;
  text-align: left;
  opacity: 0.7;
  text-shadow: 0 0 20px var(--phosphor-green-glow);
}

.welcome-text {
  margin-top: 20px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-secondary);
}

.welcome-hint {
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-ghost);
}

/* Streaming Indicator */
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--phosphor-green-dim);
}

.stream-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--phosphor-green);
  animation: pulse-dot 1s ease-in-out infinite;
}

.stream-text {
  opacity: 0.8;
}

.stream-cursor {
  animation: blink 1s step-end infinite;
}

/* ============================================
   Input Area
   ============================================ */
.input-area {
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-surface);
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--bg-deep);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: var(--phosphor-green-dim);
  box-shadow: 0 0 0 2px var(--phosphor-green-glow);
}

.input-prompt {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--phosphor-green);
  line-height: 1.6;
  flex-shrink: 0;
  user-select: none;
}

.terminal-input :deep(.el-textarea__inner) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  min-height: unset !important;
}

.terminal-input :deep(.el-textarea__inner:focus) {
  box-shadow: none !important;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.action-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 6px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.03em;
}

.action-btn:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.exec-btn {
  border-color: var(--phosphor-green);
  color: var(--phosphor-green);
}

.exec-btn:hover {
  background: var(--phosphor-green-glow);
  box-shadow: 0 0 8px var(--phosphor-green-glow);
}

.exec-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.upload-wrapper {
  display: inline-block;
}

/* ============================================
   ReAct Panel
   ============================================ */
.react-panel {
  width: 280px;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  animation: fade-in 0.5s ease 0.3s both;
}

.panel-header {
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.panel-icon {
  color: var(--cyan);
  font-size: 10px;
}

.panel-title {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
}
</style>
