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
