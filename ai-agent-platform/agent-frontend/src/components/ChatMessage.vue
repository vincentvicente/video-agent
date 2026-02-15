<template>
  <div class="terminal-message" :class="message.role" v-if="message.content || message.role === 'user'">
    <!-- Message Header -->
    <div class="msg-header">
      <span class="msg-prompt" v-if="message.role === 'user'">
        <span class="prompt-user">user</span><span class="prompt-at">@</span><span class="prompt-host">console</span>
        <span class="prompt-separator">~$</span>
      </span>
      <span class="msg-prompt" v-else>
        <span class="prompt-agent">agent</span><span class="prompt-at">@</span><span class="prompt-host">core</span>
        <span class="prompt-separator">~&gt;</span>
      </span>
      <span class="msg-time">{{ formatTime(message.timestamp) }}</span>
    </div>

    <!-- Message Content -->
    <div class="msg-body">
      <div class="msg-content" v-html="renderedContent"></div>
    </div>

    <!-- Inline Tool Calls (only for assistant) -->
    <div v-if="message.role === 'assistant' && toolCalls.length" class="tool-calls-inline">
      <ToolCallViewer
        v-for="(tc, i) in toolCalls"
        :key="i"
        :toolCall="tc"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ToolCallViewer from './ToolCallViewer.vue'

const props = defineProps({
  message: { type: Object, required: true },
  toolCalls: { type: Array, default: () => [] }
})

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const renderedContent = computed(() => {
  let text = props.message.content || ''

  // Escape HTML
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Code blocks (```)
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<div class="code-block"><div class="code-lang">${lang || 'code'}</div><pre><code>${code.trim()}</code></pre></div>`
  })

  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Newlines
  text = text.replace(/\n/g, '<br>')

  return text
})
</script>

<style scoped>
.terminal-message {
  padding: 12px 0;
  animation: slide-up 0.3s var(--ease-out) both;
  border-bottom: 1px solid var(--border-subtle);
}

.terminal-message:last-child {
  border-bottom: none;
}

/* User message styling */
.terminal-message.user .msg-body {
  border-left: 2px solid var(--border-color);
  padding-left: 12px;
  margin-left: 4px;
}

/* Agent message styling */
.terminal-message.assistant .msg-body {
  border-left: 2px solid var(--phosphor-green-dim);
  padding-left: 12px;
  margin-left: 4px;
}

/* Header */
.msg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.msg-prompt {
  font-family: var(--font-mono);
  font-size: 12px;
}

.prompt-user {
  color: var(--cyan);
}

.prompt-agent {
  color: var(--phosphor-green);
}

.prompt-at {
  color: var(--text-ghost);
}

.prompt-host {
  color: var(--text-muted);
}

.prompt-separator {
  color: var(--text-ghost);
  margin-left: 4px;
}

.msg-time {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-ghost);
}

/* Content */
.msg-body {
  margin-top: 4px;
}

.msg-content {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  word-break: break-word;
}

.terminal-message.user .msg-content {
  color: var(--text-secondary);
}

/* Code blocks */
.msg-content :deep(.code-block) {
  margin: 10px 0;
  background: #0d1117;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.msg-content :deep(.code-lang) {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  padding: 4px 12px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.msg-content :deep(pre) {
  padding: 12px;
  overflow-x: auto;
  margin: 0;
}

.msg-content :deep(code) {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.5;
}

.msg-content :deep(.inline-code) {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  padding: 1px 6px;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--amber);
}

.msg-content :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}

/* Tool calls */
.tool-calls-inline {
  margin-top: 8px;
  margin-left: 16px;
}
</style>
