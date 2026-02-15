<template>
  <div class="pipeline-log">
    <!-- Empty state -->
    <div v-if="!steps.length" class="pipeline-empty">
      <div class="empty-icon">&#9678;</div>
      <span class="empty-text">Awaiting input...</span>
    </div>

    <!-- Pipeline steps -->
    <div class="pipeline-steps">
      <div
        v-for="(step, idx) in steps"
        :key="idx"
        class="pipeline-step"
        :class="[step.type?.toLowerCase(), { latest: idx === steps.length - 1 }]"
      >
        <!-- Connector line -->
        <div class="step-connector" v-if="idx > 0">
          <div class="connector-line"></div>
        </div>

        <!-- Step node -->
        <div class="step-node">
          <div class="node-dot">
            <span class="dot-inner"></span>
          </div>
          <div class="node-content">
            <div class="node-header">
              <span class="node-type">{{ step.type }}</span>
              <span class="node-time">{{ formatTime(step.timestamp) }}</span>
            </div>
            <div class="node-text">{{ step.content }}</div>
          </div>
        </div>

        <!-- Tool detail (if this is an ACT step with matching tool call) -->
        <div
          v-if="step.type === 'ACT' && getToolForStep(idx)"
          class="step-tool-detail"
        >
          <div class="tool-mini">
            <span class="tool-mini-icon">&#9881;</span>
            <span class="tool-mini-name">{{ getToolForStep(idx).tool }}</span>
            <span class="tool-mini-status" :class="getToolForStep(idx).status">
              {{ getToolForStep(idx).status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  steps: { type: Array, default: () => [] },
  toolCalls: { type: Array, default: () => [] }
})

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getToolForStep(idx) {
  // Find tool calls that correspond to ACT steps
  let actCount = 0
  for (let i = 0; i <= idx; i++) {
    if (props.steps[i].type === 'ACT') actCount++
  }
  return props.toolCalls[actCount - 1] || null
}
</script>

<style scoped>
.pipeline-log {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

/* Empty state */
.pipeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
}

.empty-icon {
  font-size: 24px;
  color: var(--text-ghost);
  animation: pulse-dot 3s ease-in-out infinite;
}

.empty-text {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-ghost);
}

/* Pipeline steps */
.pipeline-steps {
  display: flex;
  flex-direction: column;
}

.pipeline-step {
  animation: slide-in-right 0.4s var(--ease-out) both;
}

.pipeline-step.latest {
  animation-delay: 0.1s;
}

/* Connector */
.step-connector {
  display: flex;
  justify-content: flex-start;
  padding-left: 9px;
  height: 16px;
}

.connector-line {
  width: 2px;
  height: 100%;
  background: var(--border-color);
}

.pipeline-step.think .connector-line { background: var(--cyan); opacity: 0.3; }
.pipeline-step.act .connector-line { background: var(--amber); opacity: 0.3; }
.pipeline-step.observe .connector-line { background: var(--phosphor-green); opacity: 0.3; }

/* Step node */
.step-node {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.node-dot {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid var(--text-muted);
  background: transparent;
  transition: all 0.3s ease;
}

/* Color per step type */
.pipeline-step.think .dot-inner {
  border-color: var(--cyan);
  background: var(--cyan-glow);
  box-shadow: 0 0 6px var(--cyan-glow);
}

.pipeline-step.act .dot-inner {
  border-color: var(--amber);
  background: var(--amber-glow);
  box-shadow: 0 0 6px var(--amber-glow);
}

.pipeline-step.observe .dot-inner {
  border-color: var(--phosphor-green);
  background: var(--phosphor-green-glow);
  box-shadow: 0 0 6px var(--phosphor-green-glow);
}

/* Latest step pulse */
.pipeline-step.latest .dot-inner {
  animation: pulse-green 2s ease-in-out infinite;
}

.pipeline-step.latest.act .dot-inner {
  animation: none;
  box-shadow: 0 0 8px var(--amber-glow);
}

.node-content {
  flex: 1;
  min-width: 0;
}

.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.node-type {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.pipeline-step.think .node-type { color: var(--cyan); }
.pipeline-step.act .node-type { color: var(--amber); }
.pipeline-step.observe .node-type { color: var(--phosphor-green); }

.node-time {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-ghost);
}

.node-text {
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  word-break: break-word;
}

/* Tool mini card */
.step-tool-detail {
  margin: 6px 0 4px 30px;
}

.tool-mini {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 10px;
}

.tool-mini-icon {
  color: var(--amber);
}

.tool-mini-name {
  color: var(--amber);
  flex: 1;
}

.tool-mini-status {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 9px;
}

.tool-mini-status.running {
  color: var(--amber);
}

.tool-mini-status.done {
  color: var(--phosphor-green-dim);
}
</style>
