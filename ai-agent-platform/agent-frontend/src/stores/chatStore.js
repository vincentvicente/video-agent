import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
  const conversations = ref([])
  const currentConversationId = ref(null)
  const messages = ref([])
  const isStreaming = ref(false)
  const reactSteps = ref([])
  const toolCalls = ref([])

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
    reactSteps.value.push({ ...step, timestamp: Date.now() })
  }

  function addToolCall(toolCall) {
    toolCalls.value.push({ ...toolCall, timestamp: Date.now() })
  }

  function updateLastToolCall(update) {
    const last = toolCalls.value[toolCalls.value.length - 1]
    if (last) {
      Object.assign(last, update)
    }
  }

  function clearReactSteps() {
    reactSteps.value = []
    toolCalls.value = []
  }

  function startNewConversation() {
    currentConversationId.value = null
    messages.value = []
    reactSteps.value = []
    toolCalls.value = []
  }

  return {
    conversations, currentConversationId, messages, isStreaming, reactSteps, toolCalls,
    addMessage, appendToLastMessage, addReactStep, addToolCall, updateLastToolCall,
    clearReactSteps, startNewConversation
  }
})
