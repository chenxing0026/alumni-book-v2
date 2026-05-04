<template>
  <nav class="top-nav">
    <div class="nav-inner container">
      <router-link to="/" class="nav-brand">
        <span class="brand-mark">✦</span>
        <span class="brand-text">同学录</span>
      </router-link>

      <button class="mobile-toggle" @click="menuOpen = !menuOpen" aria-label="菜单">
        <span class="toggle-bar" :class="{ open: menuOpen }"></span>
      </button>

      <div class="nav-links" :class="{ open: menuOpen }">
        <router-link to="/preface" class="nav-link" @click="menuOpen = false">前言</router-link>
        <router-link to="/roster" class="nav-link" @click="menuOpen = false">同学录</router-link>
        <router-link to="/album" class="nav-link" @click="menuOpen = false">相册</router-link>
      </div>

      <div class="nav-user" v-if="userName">
        <span class="user-greeting">{{ userName }}，你好</span>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSessionName } from '@alumni/shared'

const userName = ref<string | null>(null)
const menuOpen = ref(false)

onMounted(() => {
  userName.value = getSessionName()
})
</script>

<style scoped>
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--nav-height);
  background-color: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
}

.nav-inner {
  height: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  text-decoration: none;
  color: var(--color-ink);
}

.brand-mark {
  font-size: 18px;
  color: var(--color-primary);
}

.brand-text {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.3px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-left: auto;
}

.nav-link {
  padding: 8px 14px;
  font-size: var(--type-nav-link-size);
  font-weight: var(--type-nav-link-weight);
  line-height: var(--type-nav-link-line-height);
  color: var(--color-muted);
  border-radius: var(--rounded-md);
  text-decoration: none;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--color-ink);
  background-color: var(--color-surface-card);
}

.nav-user {
  margin-left: var(--spacing-sm);
}

.user-greeting {
  font-size: var(--type-body-sm-size);
  color: var(--color-muted);
}

.mobile-toggle {
  display: none;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  margin-left: auto;
}

.toggle-bar,
.toggle-bar::before,
.toggle-bar::after {
  display: block;
  width: 20px;
  height: 2px;
  background-color: var(--color-ink);
  border-radius: 1px;
  transition: transform 0.2s ease;
}

.toggle-bar {
  position: relative;
}

.toggle-bar::before,
.toggle-bar::after {
  content: '';
  position: absolute;
  left: 0;
}

.toggle-bar::before {
  top: -6px;
}

.toggle-bar::after {
  top: 6px;
}

.toggle-bar.open {
  background-color: transparent;
}

.toggle-bar.open::before {
  transform: rotate(45deg);
  top: 0;
}

.toggle-bar.open::after {
  transform: rotate(-45deg);
  top: 0;
}

@media (max-width: 768px) {
  .mobile-toggle {
    display: flex;
  }

  .nav-links {
    position: fixed;
    top: var(--nav-height);
    left: 0;
    right: 0;
    bottom: 0;
    flex-direction: column;
    background-color: var(--color-canvas);
    padding: var(--spacing-xl);
    gap: var(--spacing-xs);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.2s ease, visibility 0.2s ease;
  }

  .nav-links.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .nav-link {
    font-size: 18px;
    padding: 14px 16px;
  }

  .nav-user {
    display: none;
  }
}
</style>
