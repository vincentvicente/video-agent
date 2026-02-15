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
