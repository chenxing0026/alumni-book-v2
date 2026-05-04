<template>
  <div class="app">
    <TopNav />
    <main class="main-content">
      <router-view />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import TopNav from './components/TopNav.vue'
import AppFooter from './components/AppFooter.vue'
</script>

<style>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}
</style>
