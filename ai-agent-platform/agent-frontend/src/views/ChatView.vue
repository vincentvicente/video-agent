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
import { ElMessage } from 'element-plus'
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
