<template>
  <div class="app-shell dark">
    <ChatView />
  </div>
</template>

<script setup>
import ChatView from './views/ChatView.vue'
</script>

<style scoped>
.app-shell {
  height: 100vh;
  width: 100vw;
  background: var(--bg-deep);
  position: relative;
}
</style>
