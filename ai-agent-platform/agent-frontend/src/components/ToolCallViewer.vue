<template>
  <div class="tool-execution" :class="{ running: toolCall.status === 'running', done: toolCall.status === 'done' }" v-if="toolCall">
    <!-- Tool Header -->
    <div class="tool-header">
      <span class="tool-dollar">$</span>
      <span class="tool-name">{{ toolCall.tool }}</span>
      <span class="tool-status" :class="toolCall.status">
        <span v-if="toolCall.status === 'running'" class="status-running">
          <span class="running-dot"></span>
          executing
        </span>
        <span v-else class="status-done">&#10003; done</span>
      </span>
    </div>

    <!-- Tool Input -->
    <div class="tool-io" v-if="toolCall.input">
      <span class="io-prefix">&gt;</span>
      <pre class="io-content">{{ formatIO(toolCall.input) }}</pre>
    </div>

    <!-- Tool Output -->
    <div class="tool-io output" v-if="toolCall.output">
      <span class="io-prefix">&lt;</span>
      <pre class="io-content">{{ formatIO(toolCall.output) }}</pre>
    </div>
  </div>
</template>

<script setup>
defineProps({
  toolCall: { type: Object, required: true }
})

function formatIO(data) {
  if (typeof data === 'string') return data
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}
</script>

<style scoped>
.tool-execution {
  background: #0d1117;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  margin: 8px 0;
  overflow: hidden;
  animation: slide-up 0.3s var(--ease-out) both;
  transition: border-color 0.3s ease;
}

.tool-execution.running {
  border-color: var(--amber-dim);
  animation: glow-border 2s ease-in-out infinite;
}

.tool-execution.done {
  border-left: 2px solid var(--phosphor-green-dim);
}

/* Header */
.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);
}

.tool-dollar {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--amber);
  font-weight: 600;
}

.tool-name {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--amber);
  font-weight: 500;
  flex: 1;
}

.tool-status {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-running {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--amber);
}

.running-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--amber);
  animation: pulse-dot 1s ease-in-out infinite;
}

.status-done {
  color: var(--phosphor-green-dim);
}

/* IO */
.tool-io {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--border-subtle);
}

.io-prefix {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-ghost);
  flex-shrink: 0;
  line-height: 1.5;
}

.tool-io.output .io-prefix {
  color: var(--phosphor-green-dim);
}

.io-content {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: auto;
}

.tool-io.output .io-content {
  color: var(--text-primary);
}
</style>
