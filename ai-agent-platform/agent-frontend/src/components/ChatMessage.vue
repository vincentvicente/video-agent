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
