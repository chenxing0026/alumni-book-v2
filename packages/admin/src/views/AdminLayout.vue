<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-mark">✦</span>
        <span class="brand-text">同学录管理</span>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/admin/dashboard" class="nav-item">🏠 控制台</router-link>
        <router-link to="/admin/students" class="nav-item">👥 学生管理</router-link>
        <router-link to="/admin/albums" class="nav-item">📷 相册管理</router-link>
        <router-link to="/admin/settings" class="nav-item">⚙️ 站点设置</router-link>
      </nav>
      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </aside>
    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { adminLogout } from '@/api/client'

function handleLogout() {
  adminLogout()
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  background-color: var(--color-surface-dark);
  color: var(--color-on-dark);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-surface-dark-elevated);
}

.brand-mark {
  color: var(--color-primary);
  font-size: 18px;
}

.brand-text {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 10px 14px;
  border-radius: var(--rounded-md);
  color: var(--color-on-dark-soft);
  font-size: var(--type-body-sm-size);
  text-decoration: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.nav-item:hover {
  background-color: var(--color-surface-dark-elevated);
  color: var(--color-on-dark);
  text-decoration: none;
}

.nav-item.router-link-active {
  background-color: var(--color-surface-dark-elevated);
  color: var(--color-on-dark);
}

.sidebar-footer {
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-surface-dark-elevated);
}

.logout-btn {
  width: 100%;
  padding: 8px;
  color: var(--color-on-dark-soft);
  font-size: var(--type-body-sm-size);
  border-radius: var(--rounded-md);
  transition: background-color 0.15s ease;
}

.logout-btn:hover {
  background-color: var(--color-surface-dark-elevated);
  color: var(--color-on-dark);
}

.admin-main {
  flex: 1;
  padding: var(--spacing-xl);
  overflow-y: auto;
}

@media (max-width: 768px) {
  .sidebar {
    width: 60px;
  }

  .brand-text,
  .nav-item span,
  .logout-btn {
    display: none;
  }

  .nav-item {
    justify-content: center;
    padding: 12px;
  }

  .sidebar-brand {
    justify-content: center;
  }
}
</style>
