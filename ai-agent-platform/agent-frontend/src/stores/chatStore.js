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
