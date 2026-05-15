# Astro 迁移 — 公开站点重写

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** 将 `packages/site`（Vue SPA）全量迁移到 Astro SSG，部署到 GitHub Pages，管理后台 `packages/admin`（Vue SPA）保持不变。

**Architecture:** Astro SSG 在构建时全量拉取 API 数据生成静态页面，重交互部分（搜索、灯箱、留言墙）使用 Vue islands。输出纯静态文件，与 admin 合并部署到 GitHub Pages 的 `/alumni-book-v2/` 路径下。

**Tech Stack:** Astro 5 + @astrojs/vue + Vue 3 + TypeScript

---

## Phase 1 总览

| # | Task | 类型 |
|---|------|------|
| 1 | 初始化 Astro 项目 | 项目搭建 |
| 2 | 迁移设计令牌和全局样式 | 样式 |
| 3 | 布局组件 (MainLayout) | Astro 组件 |
| 4 | 首页 (index.astro) | SSG 页面 |
| 5 | 前言页 (preface.astro) | SSG 页面 |
| 6 | 同学录名单页 (roster.astro) | SSG + Vue island |
| 7 | 学生详情页 (student/[slug].astro) | SSG 批量生成 |
| 8 | 相册页 (album.astro) | SSG + Vue island |
| 9 | Vue islands (PhotoWall, RosterSearch, AlbumGrid) | Vue 组件 |
| 10 | 留言墙 Vue island (Phase 3 骨架) | Vue 组件 |
| 11 | 构建数据管道 | 构建工具 |
| 12 | CI/CD 更新 | DevOps |
| 13 | 清理旧 site 代码 | 清理 |

---

### Task 1: 初始化 Astro 项目

**Files:**
- Create: `packages/site-astro/package.json`
- Create: `packages/site-astro/astro.config.mjs`
- Create: `packages/site-astro/tsconfig.json`
- Create: `packages/site-astro/env.d.ts`
- Create: `packages/site-astro/.env.development`
- Modify: `pnpm-workspace.yaml` (if needed)
- Modify: `.gitignore` (add `.env.local` — already there)

**Steps:**

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "site-astro",
  "version": "0.2.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "@astrojs/vue": "^5.0.0",
    "astro": "^5.0.0",
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: 创建 astro.config.mjs**

```js
import { defineConfig } from 'astro/config'
import vue from '@astrojs/vue'

export default defineConfig({
  base: '/alumni-book-v2/',
  integrations: [vue()],
  vite: {
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        process.env.VITE_API_BASE_URL || 'https://alumni-book-api.chenyuhao2263.workers.dev'
      ),
    },
  },
  build: {
    assets: 'assets',
  },
})
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@alumni/shared": ["../shared/src/index.ts"],
      "@alumni/shared/*": ["../shared/src/*"]
    }
  }
}
```

- [ ] **Step 4: 创建 env.d.ts**

```ts
/// <reference types="astro/client" />
```

- [ ] **Step 5: 创建 .env.development**

```
VITE_API_BASE_URL=http://localhost:8787
```

- [ ] **Step 6: 安装依赖**

```bash
cd packages/site-astro && pnpm install
```

- [ ] **Step 7: 验证 `astro dev` 启动成功**

```bash
pnpm --filter site-astro dev
```

---

### Task 2: 迁移设计令牌和全局样式

**Files:**
- Create: `packages/site-astro/src/styles/tokens.css` (从 shared 复制)
- Create: `packages/site-astro/src/styles/global.css`

**Steps:**

- [ ] **Step 1: 创建 tokens.css**

直接复制 `packages/shared/src/tokens.css` 到 `packages/site-astro/src/styles/tokens.css`。

- [ ] **Step 2: 创建 global.css**

从 `packages/site/src/styles/global.css` 迁移，加上 Astro 全局样式约定：

```css
/* 全局样式 — 与 tokens.css 配对 */
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  font-family: var(--font-body);
  font-size: var(--type-body-md-size);
  color: var(--color-ink);
  background-color: var(--color-canvas);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body { min-height: 100vh; }

a { color: inherit; }

img { max-width: 100%; height: auto; }

/* 容器 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

/* 卡片 */
.card {
  background-color: var(--color-surface-card);
  border-radius: var(--rounded-lg);
  border: 1px solid var(--color-hairline);
}

/* 按钮 */
.btn-primary, .btn-secondary, .btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  height: 44px;
  padding: 0 var(--spacing-lg);
  font-size: var(--type-button-size);
  font-weight: var(--type-button-weight);
  border-radius: var(--rounded-md);
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}
.btn-primary:hover { background-color: var(--color-primary-active); }

.btn-secondary {
  background-color: var(--color-surface-card);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
}
.btn-secondary:hover { background-color: var(--color-surface-cream-strong); }

.btn-danger {
  background-color: var(--color-error);
  color: var(--color-on-primary);
}

/* 文本输入 */
.text-input {
  width: 100%;
  height: 44px;
  padding: 0 var(--spacing-md);
  font-size: var(--type-body-md-size);
  color: var(--color-ink);
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--rounded-md);
  outline: none;
  transition: border-color 0.15s ease;
}
.text-input:focus { border-color: var(--color-primary); }
.text-input::placeholder { color: var(--color-muted-soft); }

/* 排版工具类 */
.display-xl { font-family: var(--font-display); font-size: var(--type-display-xl-size); font-weight: var(--type-display-xl-weight); line-height: var(--type-display-xl-line-height); letter-spacing: var(--type-display-xl-letter-spacing); }
.display-lg { font-family: var(--font-display); font-size: var(--type-display-lg-size); font-weight: var(--type-display-lg-weight); line-height: var(--type-display-lg-line-height); letter-spacing: var(--type-display-lg-letter-spacing); }
.display-md { font-family: var(--font-display); font-size: var(--type-display-md-size); font-weight: var(--type-display-md-weight); line-height: var(--type-display-md-line-height); letter-spacing: var(--type-display-md-letter-spacing); }
.display-sm { font-family: var(--font-display); font-size: var(--type-display-sm-size); font-weight: var(--type-display-sm-weight); line-height: var(--type-display-sm-line-height); letter-spacing: var(--type-display-sm-letter-spacing); }
.title-lg { font-size: var(--type-title-lg-size); font-weight: var(--type-title-lg-weight); line-height: var(--type-title-lg-line-height); }
.title-md { font-size: var(--type-title-md-size); font-weight: var(--type-title-md-weight); line-height: var(--type-title-md-line-height); }
.title-sm { font-size: var(--type-title-sm-size); font-weight: var(--type-title-sm-weight); line-height: var(--type-title-sm-line-height); }

/* 动画 */
.fade-in { opacity: 0; transform: translateY(16px); transition: opacity 0.6s ease, transform 0.6s ease; }
.fade-in.visible { opacity: 1; transform: translateY(0); }
```

- [ ] **Step 3: 验证 `astro dev` 样式加载**

---

### Task 3: 布局组件 (MainLayout)

**Files:**
- Create: `packages/site-astro/src/layouts/MainLayout.astro`
- Create: `packages/site-astro/src/components/TopNav.astro`
- Create: `packages/site-astro/src/components/AppFooter.astro`

**Steps:**

- [ ] **Step 1: 创建 TopNav.astro**

从 Vue 组件 `packages/site/src/components/TopNav.vue` 迁移为 Astro 组件。无交互逻辑需要客户端 JS——菜单展开用纯 CSS `<details>` 元素或少量内联 script。

```astro
---
const userName = null // Astro SSG 无 sessionStorage，不展示用户名
---
<nav class="top-nav">
  <div class="nav-inner container">
    <a href="/" class="nav-brand">
      <span class="brand-mark">✦</span>
      <span class="brand-text">同学录</span>
    </a>
    <input type="checkbox" id="menu-toggle" class="menu-toggle-input" />
    <label for="menu-toggle" class="mobile-toggle" aria-label="菜单">
      <span class="toggle-bar"></span>
    </label>
    <div class="nav-links">
      <a href="/preface" class="nav-link">前言</a>
      <a href="/roster" class="nav-link">同学录</a>
      <a href="/album" class="nav-link">相册</a>
    </div>
  </div>
</nav>

<style>
  .top-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
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
  .brand-mark { font-size: 18px; color: var(--color-primary); }
  .brand-text { font-family: var(--font-display); font-size: 20px; font-weight: 500; letter-spacing: -0.3px; }
  .nav-links { display: flex; align-items: center; gap: var(--spacing-sm); margin-left: auto; }
  .nav-link {
    padding: 8px 14px;
    font-size: var(--type-nav-link-size);
    font-weight: var(--type-nav-link-weight);
    color: var(--color-muted);
    border-radius: var(--rounded-md);
    text-decoration: none;
    transition: color 0.15s ease, background-color 0.15s ease;
  }
  .nav-link:hover { color: var(--color-ink); background-color: var(--color-surface-card); }
  .menu-toggle-input { display: none; }
  .mobile-toggle { display: none; width: 36px; height: 36px; align-items: center; justify-content: center; margin-left: auto; cursor: pointer; }
  .toggle-bar, .toggle-bar::before, .toggle-bar::after {
    display: block; width: 20px; height: 2px;
    background-color: var(--color-ink); border-radius: 1px;
    transition: transform 0.2s ease;
  }
  .toggle-bar { position: relative; }
  .toggle-bar::before, .toggle-bar::after { content: ''; position: absolute; left: 0; }
  .toggle-bar::before { top: -6px; }
  .toggle-bar::after { top: 6px; }
  @media (max-width: 768px) {
    .mobile-toggle { display: flex; }
    .nav-links {
      position: fixed;
      top: var(--nav-height);
      left: 0; right: 0; bottom: 0;
      flex-direction: column;
      background-color: var(--color-canvas);
      padding: var(--spacing-xl);
      gap: var(--spacing-xs);
      opacity: 0; visibility: hidden;
      pointer-events: none;
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }
    .menu-toggle-input:checked ~ .nav-links {
      opacity: 1; visibility: visible; pointer-events: auto;
    }
    .nav-link { font-size: 18px; padding: 14px 16px; }
  }
</style>
```

- [ ] **Step 2: 创建 AppFooter.astro**

从 `packages/site/src/components/AppFooter.vue` 迁移：

```astro
<footer class="app-footer">
  <div class="container footer-inner">
    <p class="footer-text">&copy; 同学录 · 青春回忆</p>
  </div>
</footer>

<style>
  .app-footer {
    padding: var(--spacing-xl) 0;
    border-top: 1px solid var(--color-hairline);
    margin-top: auto;
  }
  .footer-inner { text-align: center; }
  .footer-text {
    font-size: var(--type-body-sm-size);
    color: var(--color-muted);
  }
</style>
```

- [ ] **Step 3: 创建 MainLayout.astro**

```astro
---
import TopNav from '../components/TopNav.astro'
import AppFooter from '../components/AppFooter.astro'
import '../styles/global.css'
---

<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>同学录</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div class="app">
      <TopNav />
      <main class="main-content">
        <slot />
      </main>
      <AppFooter />
    </div>
  </body>
</html>

<style is:global>
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  .main-content { flex: 1; }
</style>
```

- [ ] **Step 4: 验证布局**

创建临时测试页 `src/pages/test.astro`，确认导航和页脚正常渲染。

---

### Task 4: 首页 (index.astro)

**Files:**
- Create: `packages/site-astro/src/pages/index.astro`

**Steps:**

- [ ] **Step 1: 创建首页**

从 `packages/site/src/views/HomeView.vue` 迁移逻辑。由于 SSG 无 sessionStorage，姓名验证变为前端 Vue island 行为——提交时 fetch `/api/classmates`，匹配成功后写入 sessionStorage 并导航。

```astro
---
import MainLayout from '../layouts/MainLayout.astro'
---

<MainLayout>
  <div class="home-page">
    <section class="hero-band">
      <div class="hero-inner container">
        <div class="hero-content">
          <p class="hero-label">· CLASS OF MEMORIES ·</p>
          <h1 class="hero-title display-xl">时光荏苒<br>很高兴再次见到你</h1>
          <p class="hero-subtitle">每一段岁月都值得被铭记，让我们一起打开那本尘封的同学录</p>
          <div id="name-gate"></div>
        </div>
      </div>
    </section>
  </div>
</MainLayout>

<script>
  import { createApp } from 'vue'
  import NameGate from '../components/NameGate.vue'

  const el = document.getElementById('name-gate')
  if (el) {
    createApp(NameGate).mount(el)
  }
</script>

<style>
  .home-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    padding-top: var(--nav-height);
  }
  .hero-band { width: 100%; padding: var(--spacing-section) 0; }
  .hero-inner { max-width: 640px; text-align: center; }
  .hero-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-lg);
  }
  .hero-label {
    font-family: var(--font-body);
    font-size: var(--type-caption-uppercase-size);
    font-weight: var(--type-caption-uppercase-weight);
    letter-spacing: var(--type-caption-uppercase-letter-spacing);
    color: var(--color-muted);
  }
  .hero-title { font-size: var(--type-display-xl-size); }
  .hero-subtitle {
    font-family: var(--font-display);
    font-size: 18px;
    color: var(--color-muted);
    letter-spacing: 0.05em;
    max-width: 480px;
    line-height: 1.8;
  }
  @media (max-width: 768px) {
    .hero-title { font-size: 32px; }
    .hero-subtitle { font-size: 15px; }
  }
</style>
```

- [ ] **Step 2: 创建 NameGate.vue island**

```vue
<!-- packages/site-astro/src/components/NameGate.vue -->
<template>
  <div class="hero-form">
    <div class="input-group">
      <input
        v-model="name"
        type="text"
        class="text-input hero-input"
        placeholder="请输入你的真实姓名"
        maxlength="20"
        autocomplete="off"
        @keydown.enter="handleEnter"
      />
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
    <button class="btn-primary hero-btn" @click="handleEnter" :disabled="loading">
      {{ loading ? '验证中...' : '开启回忆' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const name = ref('')
const error = ref('')
const loading = ref(false)

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function handleEnter() {
  const trimmed = name.value.trim()
  error.value = ''
  if (!trimmed) { error.value = '请输入你的姓名'; return }
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/classmates`)
    const data = await res.json()
    const found = (data.data || []).find(c => c.name === trimmed)
    if (!found) { error.value = '姓名未在同学录中找到，请确认后重试'; return }
    sessionStorage.setItem('classmate_name', trimmed)
    window.location.href = `${import.meta.env.BASE_URL}preface`
  } catch {
    error.value = '验证失败，请稍后重试'
  } finally { loading.value = false }
}
</script>

<style scoped>
.hero-form {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}
.input-group { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.hero-input { text-align: center; font-size: 16px; height: 48px; }
.hero-btn { height: 48px; font-size: 16px; letter-spacing: 0.15em; width: 100%; }
.error-text { font-size: var(--type-body-sm-size); color: var(--color-error); text-align: center; }
</style>
```

---

### Task 5: 前言页 (preface.astro)

**Files:**
- Create: `packages/site-astro/src/pages/preface.astro`

**Steps:**

- [ ] **Step 1: 创建前言页**

SSG 页面，构建时从 `public/data/config.json` 读取前言内容。首次构建时 JSON 可能不存在，使用默认值。

```astro
---
import MainLayout from '../layouts/MainLayout.astro'

// 尝试加载构建时生成的数据，失败则用默认值
let config: any = {
  preface: { title: '致青春岁月', subtitle: '写在翻开同学录之前', content: '' },
  acknowledgments: [],
}

try {
  const fs = await import('fs')
  const path = await import('path')
  // Astro 构建时路径
} catch {
  // 使用默认值
}

// Astro 直接用 fetch 在构建时获取
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://alumni-book-api.chenyuhao2263.workers.dev'
try {
  const res = await fetch(`${API_BASE}/api/config`)
  const data = await res.json() as any
  if (data.success && data.data) {
    config = data.data
  }
} catch {}
---

<MainLayout>
  <div class="preface-page section">
    <div class="container">
      <div class="preface-header">
        <p class="preface-label">· PREFACE ·</p>
        <h1 class="preface-title display-lg">{config.preface.title}</h1>
        <p class="preface-subtitle">{config.preface.subtitle}</p>
      </div>

      <div class="preface-body">
        <p class="preface-text" set:html={config.preface.content.replace(/\n/g, '<br>')}></p>
      </div>

      <hr class="hairline" style="margin: var(--spacing-xxl) 0;" />

      {
        config.acknowledgments?.length > 0 && (
          <div class="acknowledgment">
            <h2 class="ack-title display-sm">特别致谢</h2>
            <div class="ack-grid">
              {config.acknowledgments.filter((a: any) => a.name?.trim()).map((ack: any) => (
                <div class="ack-person">
                  <div class="ack-avatar">
                    {ack.avatarUrl ? (
                      <img src={ack.avatarUrl} alt={ack.name} />
                    ) : (
                      <span class="avatar-placeholder">{ack.name.charAt(0)}</span>
                    )}
                  </div>
                  <div class="ack-name title-sm">{ack.name}</div>
                  <div class="ack-role">{ack.role}</div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      <div class="bottom-actions">
        <a href="/album" class="btn-primary">进入班级相册</a>
        <a href="/roster" class="btn-secondary">进入同学录主页</a>
      </div>
    </div>
  </div>
</MainLayout>

<style>
  .preface-page { padding-top: calc(var(--nav-height) + var(--spacing-section)); }
  .preface-header { text-align: center; margin-bottom: var(--spacing-xxl); }
  .preface-label {
    font-size: var(--type-caption-uppercase-size);
    font-weight: var(--type-caption-uppercase-weight);
    letter-spacing: var(--type-caption-uppercase-letter-spacing);
    color: var(--color-muted);
    margin-bottom: var(--spacing-md);
  }
  .preface-subtitle {
    font-family: var(--font-display);
    font-size: 16px;
    color: var(--color-muted);
    letter-spacing: 0.1em;
    margin-top: var(--spacing-sm);
  }
  .preface-body { max-width: 680px; margin: 0 auto; }
  .preface-text {
    font-size: 16px;
    color: var(--color-body-strong);
    line-height: 2.2;
    text-indent: 2em;
    text-align: justify;
    padding: var(--spacing-lg);
    background-color: rgba(255,255,255,0.4);
    border-radius: var(--rounded-md);
  }
  .hairline { border: none; border-top: 1px solid var(--color-hairline); }
  .acknowledgment { text-align: center; }
  .ack-title { margin-bottom: var(--spacing-xl); }
  .ack-grid { display: flex; justify-content: center; flex-wrap: wrap; gap: var(--spacing-xl); }
  .ack-person { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-xs); }
  .ack-avatar {
    width: 58px; height: 58px;
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(135deg, var(--color-surface-card), var(--color-surface-cream-strong));
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--color-hairline);
  }
  .ack-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-placeholder { font-family: var(--font-display); font-size: 24px; font-weight: 500; color: var(--color-muted); }
  .ack-name { font-size: var(--type-title-sm-size); }
  .ack-role { font-size: var(--type-body-sm-size); color: var(--color-muted); }
  .bottom-actions {
    display: flex;
    justify-content: center;
    gap: var(--spacing-md);
    margin-top: var(--spacing-xxl);
    padding-top: var(--spacing-xxl);
    border-top: 1px solid var(--color-hairline);
  }
  @media (max-width: 768px) {
    .bottom-actions { flex-direction: column; align-items: center; }
  }
</style>
```

---

### Task 6: 同学录名单页 (roster.astro)

**Files:**
- Create: `packages/site-astro/src/pages/roster.astro`
- Modify: `packages/site-astro/src/components/RosterSearch.vue` (create as Vue island)

**Steps:**

- [ ] **Step 1: 创建 roster.astro**

构建时 fetch `/api/classmates` 获取完整名单。

```astro
---
import MainLayout from '../layouts/MainLayout.astro'

interface Classmate {
  name: string
  slug: string
  hasPage: boolean
  avatarUrl: string | null
  motto: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://alumni-book-api.chenyuhao2263.workers.dev'
let classmates: Classmate[] = []
try {
  const res = await fetch(`${API_BASE}/api/classmates`)
  const data = await res.json() as any
  classmates = data.data || []
} catch {}
---

<MainLayout>
  <div class="roster-page section">
    <div class="container">
      <div class="roster-header">
        <p class="roster-label">· CLASSMATE ROSTER ·</p>
        <h1 class="roster-title display-lg">我们的同学</h1>
        <p class="roster-subtitle">点击同学头像，进入 TA 的专属主页</p>
      </div>

      <div id="roster-search"></div>

      <div class="classmate-grid">
        {classmates.map(mate => (
          <a href={mate.hasPage ? `/student/${mate.slug}` : '#'} class={`classmate-card ${!mate.hasPage ? 'no-page' : ''}`}>
            <div class="card-avatar">
              {mate.avatarUrl ? (
                <img src={mate.avatarUrl} alt={mate.name} loading="lazy" decoding="async" />
              ) : (
                <span class="avatar-char">{mate.name.charAt(0)}</span>
              )}
            </div>
            <div class="card-name title-sm">{mate.name}</div>
            <div class="card-motto">{mate.hasPage ? (mate.motto || '点击查看 TA 的故事') : '页面待建'}</div>
          </a>
        ))}
      </div>
    </div>
  </div>
</MainLayout>

<script>
  import { createApp } from 'vue'
  import RosterSearch from '../components/RosterSearch.vue'

  const el = document.getElementById('roster-search')
  if (el) {
    const app = createApp(RosterSearch, {
      classmates: JSON.parse(document.getElementById('roster-data')?.textContent || '[]'),
    })
    app.mount(el)
  }
</script>

<script id="roster-data" type="application/json" set:html={JSON.stringify(classmates)}></script>

<style>
  .roster-page { padding-top: calc(var(--nav-height) + var(--spacing-section)); }
  .roster-header { text-align: center; margin-bottom: var(--spacing-xl); }
  .roster-label {
    font-size: var(--type-caption-uppercase-size);
    font-weight: var(--type-caption-uppercase-weight);
    letter-spacing: var(--type-caption-uppercase-letter-spacing);
    color: var(--color-muted);
    margin-bottom: var(--spacing-md);
  }
  .roster-subtitle { font-size: var(--type-body-sm-size); color: var(--color-muted); margin-top: var(--spacing-sm); }
  .classmate-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--spacing-lg);
  }
  .classmate-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-lg) var(--spacing-md);
    background-color: var(--color-surface-card);
    border-radius: var(--rounded-lg);
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .classmate-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-subtle); }
  .classmate-card.no-page { opacity: 0.55; pointer-events: none; }
  .card-avatar {
    width: 72px; height: 72px;
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(135deg, var(--color-surface-cream-strong), var(--color-hairline));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-sm);
    border: 2px solid var(--color-hairline);
  }
  .card-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-char { font-family: var(--font-display); font-size: 28px; font-weight: 500; color: var(--color-muted); }
  .card-name { margin-bottom: var(--spacing-xxs); text-align: center; }
  .card-motto { font-size: var(--type-body-sm-size); color: var(--color-muted); text-align: center; font-style: italic; }
  @media (max-width: 768px) {
    .classmate-grid { grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md); }
    .card-avatar { width: 58px; height: 58px; }
  }
</style>
```

- [ ] **Step 2: 创建 RosterSearch.vue island**

```vue
<template>
  <div class="search-box">
    <input v-model="keyword" type="text" class="text-input search-input" placeholder="搜索同学姓名…" autocomplete="off" />
    <p v-if="keyword" class="search-count">找到 {{ filtered.length }} 位同学</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps<{
  classmates: Array<{ name: string; slug: string; hasPage: boolean; avatarUrl: string | null; motto: string }>
}>()

const keyword = ref('')

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return props.classmates
  return props.classmates.filter(c => c.name.toLowerCase().includes(kw))
})

// 同步过滤结果到 DOM — 切换卡片可见性
import { watch } from 'vue'
watch(filtered, (list) => {
  const slugs = new Set(list.map(c => c.slug))
  document.querySelectorAll('.classmate-card').forEach(card => {
    const href = card.getAttribute('href') || ''
    const slug = href.replace('/student/', '')
    ;(card as HTMLElement).style.display = slugs.has(slug) ? '' : 'none'
  })
})
</script>

<style scoped>
.search-box { max-width: 480px; margin: 0 auto var(--spacing-xl); text-align: center; }
.search-input { text-align: center; }
.search-count { margin-top: var(--spacing-xs); font-size: var(--type-body-sm-size); color: var(--color-muted); }
</style>
```

---

### Task 7: 学生详情页 (student/[slug].astro)

**Files:**
- Create: `packages/site-astro/src/pages/student/[slug].astro`
- Create: `packages/site-astro/src/components/StudentHero.astro`
- Create: `packages/site-astro/src/components/StudentInfo.astro`
- Create: `packages/site-astro/src/components/PhotoWall.vue`

**Steps:**

- [ ] **Step 1: 创建 [slug].astro**

SSG 批量生成——`getStaticPaths` fetch `/api/students` 获取所有 slug，然后为每个 slug 生成页面。构建时 fetch 单个学生数据。

```astro
---
import MainLayout from '../../../layouts/MainLayout.astro'
import StudentHero from '../../../components/StudentHero.astro'
import StudentInfo from '../../../components/StudentInfo.astro'

export async function getStaticPaths() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://alumni-book-api.chenyuhao2263.workers.dev'
  let students: any[] = []
  try {
    const res = await fetch(`${API_BASE}/api/students`)
    const data = await res.json() as any
    students = data.data || []
  } catch {}
  return students.map(s => ({ params: { slug: s.slug } }))
}

const { slug } = Astro.params

interface Student {
  id: string; name: string; slug: string; isOwner: boolean
  avatarUrl: string | null; musicUrl: string | null; musicTitle: string | null
  musicAutoplay: boolean; backgroundUrl: string | null; backgroundColor: string | null
  customHtml: string | null; info: Record<string, string>; photos: string[]
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://alumni-book-api.chenyuhao2263.workers.dev'

let student: Student | null = null
try {
  const res = await fetch(`${API_BASE}/api/students/${slug}`)
  const data = await res.json() as any
  if (data.success && data.data) student = data.data
} catch {}

if (!student) {
  return new Response(null, { status: 302, headers: { Location: '/roster' } })
}

const bgStyle = student.backgroundUrl
  ? `background-image: url(${student.backgroundUrl}); background-size: cover; background-position: center;`
  : student.backgroundColor
  ? `background-color: ${student.backgroundColor};`
  : ''

// 分区分组
function getFields(info: Record<string, string>, keys: [string, string][]) {
  return keys.filter(([k]) => info[k]?.trim()).map(([k, label]) => ({ key: k, label, value: info[k] }))
}

const basicFields = getFields(student.info, [
  ['name','姓名'],['nickname','昵称'],['gender','性别'],
  ['birthday','出生日期'],['school','学校'],['class','班级'],
  ['graduationYear','毕业年份'],
])

const contactFields = getFields(student.info, [
  ['qq','QQ'],['wechat','微信'],['weibo','微博'],
  ['phone','手机'],['email','邮箱'],['address','常住地'],
])

const personalityFields = getFields(student.info, [
  ['mbti','MBTI'],['bloodType','血型'],['astro','星座'],
  ['strengths','擅长的事'],['weaknesses','不擅长的事'],
  ['bestSubject','最喜欢科目'],['worstSubject','最讨厌科目'],
])

const interestFields = getFields(student.info, [
  ['favoriteIdol','喜欢明星'],['favoriteAnime','喜欢动漫'],
  ['favoriteMovie','喜欢电影'],['favoriteSong','喜欢歌曲'],
  ['favoriteGame','喜欢游戏'],['favoriteFood','喜欢食物'],
  ['favoriteColor','喜欢颜色'],['favoriteSport','喜欢运动'],
])

const memoryFields = getFields(student.info, [
  ['bestMemory','最难忘的一件事'],['bestLesson','最难忘的一节课'],
  ['deskmateFun','同桌趣事'],['classMeme','班级经典梗'],
  ['embarrassingMoment','最社死瞬间'],['proudestAchievement','学生时代最骄傲的事'],
])

const futureFields = getFields(student.info, [
  ['targetUniversity','目标大学'],['targetMajor','目标专业'],
  ['futureCareer','未来职业'],['futureCity','未来城市'],
  ['futureSelf','十年后的自己'],['letterToFuture','给未来自己的话'],
])
---

<MainLayout>
  {student.isOwner && student.customHtml ? (
    <div class="owner-page">
      <iframe srcdoc={student.customHtml
        .replace(/\{\{\s*student\.name\s*\}\}/g, student.name)
        .replace(/\{\{\s*student\.avatarUrl\s*\}\}/g, student.avatarUrl || '')
        .replace(/\{\{\s*student\.musicUrl\s*\}\}/g, student.musicUrl || '')
        .replace(/\{\{\s*student\.backgroundUrl\s*\}\}/g, student.backgroundUrl || '')
        .replace(/\{\{\s*student\.info\.nickname\s*\}\}/g, student.info?.nickname || '')
        .replace(/\{\{\s*student\.info\.motto\s*\}\}/g, student.info?.motto || '')
      } class="owner-iframe" frameborder="0" sandbox="allow-scripts allow-same-origin"></iframe>
    </div>
  ) : (
    <div class="student-page">
      <StudentHero student={student} bgStyle={bgStyle} />
      <div class="student-body container">
        {basicFields.length > 0 && <StudentInfo title="基础信息" fields={basicFields} />}
        {contactFields.length > 0 && <StudentInfo title="联系方式" fields={contactFields} />}
        {personalityFields.length > 0 && <StudentInfo title="个性标签" fields={personalityFields} />}
        {interestFields.length > 0 && <StudentInfo title="兴趣爱好" fields={interestFields} />}
        {memoryFields.length > 0 && <StudentInfo title="校园回忆" fields={memoryFields} isMemory />}
        {futureFields.length > 0 && <StudentInfo title="未来规划" fields={futureFields} />}

        {student.photos?.length > 0 && (
          <section class="profile-section">
            <h2 class="section-title display-sm">照片墙</h2>
            <div id={`photo-wall-${student.slug}`}></div>
          </section>
        )}

        <div class="seal-area"><span class="seal">留念</span></div>
      </div>
    </div>
  )}

  {student.musicUrl && student.musicAutoplay && (
    <audio src={student.musicUrl} loop preload="auto" autoplay></audio>
  )}
</MainLayout>

<script>
  import { createApp } from 'vue'
  import PhotoWall from '../../../components/PhotoWall.vue'

  const mountEl = document.getElementById(`photo-wall-${Astro.params.slug}`)
  if (mountEl) {
    const photos = JSON.parse(document.getElementById(`photo-data-${Astro.params.slug}`)?.textContent || '[]')
    createApp(PhotoWall, { photos }).mount(mountEl)
  }
</script>

<script id={`photo-data-${Astro.params.slug}`} type="application/json" set:html={JSON.stringify(student?.photos || [])}></script>

<style>
  .owner-page { min-height: 100vh; padding-top: var(--nav-height); }
  .owner-iframe { width: 100%; min-height: calc(100vh - var(--nav-height)); border: none; }
  .student-page { padding-top: var(--nav-height); }
  .student-body { max-width: 800px; padding: var(--spacing-section) var(--spacing-lg); }
  .profile-section { margin-bottom: var(--spacing-section); }
  .section-title {
    margin-bottom: var(--spacing-xl);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--color-hairline);
  }
  .seal-area { text-align: right; padding: var(--spacing-lg) 0; opacity: 0.5; }
  .seal {
    font-family: var(--font-display);
    font-size: 24px;
    color: var(--color-primary);
    border: 2px solid var(--color-primary);
    border-radius: var(--rounded-sm);
    padding: 4px 12px;
    transform: rotate(-5deg);
    display: inline-block;
  }
</style>
```

- [ ] **Step 2: 创建 StudentHero.astro**

```astro
---
interface Student {
  name: string
  avatarUrl: string | null
  isOwner: boolean
}

const { student, bgStyle } = Astro.props as { student: Student; bgStyle: string }
---

<section class="student-hero">
  <div class="hero-bg" style={bgStyle}></div>
  <div class="hero-content container">
    <div class="hero-avatar">
      {student.avatarUrl ? (
        <img src={student.avatarUrl} alt={student.name} loading="lazy" decoding="async" style="aspect-ratio: 1" />
      ) : (
        <span class="avatar-char">{student.name.charAt(0)}</span>
      )}
    </div>
    <h1 class="hero-name display-md">{student.name}</h1>
    {student.isOwner && <span class="owner-badge">专属页面</span>}
  </div>
</section>

<style>
  .student-hero {
    position: relative;
    padding: var(--spacing-xxl) 0;
    text-align: center;
    background-color: var(--color-surface-soft);
    overflow: hidden;
  }
  .hero-bg { position: absolute; inset: 0; z-index: 0; opacity: 0.15; }
  .hero-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm); }
  .hero-avatar {
    width: 96px; height: 96px;
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(135deg, var(--color-surface-card), var(--color-hairline));
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid var(--color-hairline);
    margin-bottom: var(--spacing-sm);
  }
  .hero-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-char { font-family: var(--font-display); font-size: 40px; font-weight: 500; color: var(--color-muted); }
  .owner-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xxs);
    padding: 4px 14px;
    background: linear-gradient(135deg, rgba(201,168,76,0.25), rgba(122,74,30,0.18));
    border: 1px solid rgba(201,168,76,0.35);
    border-radius: var(--rounded-pill);
    font-size: var(--type-caption-size);
    color: var(--color-primary);
    margin-top: var(--spacing-xs);
  }
  .owner-badge::before { content: '★'; }
</style>
```

- [ ] **Step 3: 创建 StudentInfo.astro**

```astro
---
const { title, fields, isMemory } = Astro.props as {
  title: string
  fields: { key: string; label: string; value: string }[]
  isMemory?: boolean
}
---

<section class="profile-section">
  <h2 class="section-title display-sm">{title}</h2>
  <div class={isMemory ? 'memory-list' : 'info-grid'}>
    {fields.map(f => (
      <div class="info-item">
        <span class="info-label">{f.label}</span>
        <span class="info-value">{f.value}</span>
      </div>
    ))}
  </div>
</section>

<style>
  .profile-section { margin-bottom: var(--spacing-section); }
  .section-title {
    margin-bottom: var(--spacing-xl);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--color-hairline);
  }
  .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md); }
  .memory-list { display: flex; flex-direction: column; gap: var(--spacing-md); }
  .info-item { padding: var(--spacing-sm) 0; }
  .info-label { display: block; font-size: var(--type-body-sm-size); font-weight: 500; color: var(--color-muted); margin-bottom: var(--spacing-xxs); }
  .info-value { font-size: var(--type-body-md-size); color: var(--color-ink); }
  @media (max-width: 768px) { .info-grid { grid-template-columns: 1fr; } }
</style>
```

---

### Task 8: 相册页 (album.astro)

**Files:**
- Create: `packages/site-astro/src/pages/album.astro`

**Steps:**

- [ ] **Step 1: 创建 album.astro**

构建时 fetch `/api/albums`，相册网格 + 灯箱用 Vue island：

```astro
---
import MainLayout from '../layouts/MainLayout.astro'

interface Album {
  id: string; title: string; description: string; frameStyle: string
  sortOrder: number; photos: Photo[]; createdAt: string
}
interface Photo {
  id: string; albumId: string; filename: string; caption: string
  r2Key: string; sortOrder: number; createdAt: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://alumni-book-api.chenyuhao2263.workers.dev'
let albums: Album[] = []
try {
  const res = await fetch(`${API_BASE}/api/albums`)
  const data = await res.json() as any
  albums = data.data || []
} catch {}
---

<MainLayout>
  <div class="album-page section">
    <div class="container">
      <div class="album-header">
        <p class="album-label">· CLASS ALBUM ·</p>
        <h1 class="album-title display-lg">我们的时光</h1>
        <p class="album-subtitle">每一张照片，都是一段珍贵的回忆</p>
      </div>

      {albums.length === 0 ? (
        <div class="empty-state">
          <div class="empty-icon">📷</div>
          <p>暂无照片</p>
          <p>请前往管理后台上传</p>
        </div>
      ) : (
        <div id="album-grid-root"></div>
      )}
    </div>
  </div>
</MainLayout>

<script>
  import { createApp } from 'vue'
  import AlbumGrid from '../components/AlbumGrid.vue'

  const el = document.getElementById('album-grid-root')
  if (el) {
    const albums = JSON.parse(document.getElementById('album-data')?.textContent || '[]')
    createApp(AlbumGrid, { albums, apiBase: import.meta.env.VITE_API_BASE_URL || '' }).mount(el)
  }
</script>

<script id="album-data" type="application/json" set:html={JSON.stringify(albums)}></script>

<style>
  .album-page { padding-top: calc(var(--nav-height) + var(--spacing-section)); }
  .album-header { text-align: center; margin-bottom: var(--spacing-xl); }
  .album-label {
    font-size: var(--type-caption-uppercase-size);
    font-weight: var(--type-caption-uppercase-weight);
    letter-spacing: var(--type-caption-uppercase-letter-spacing);
    color: var(--color-muted);
    margin-bottom: var(--spacing-md);
  }
  .album-subtitle { font-size: var(--type-body-sm-size); color: var(--color-muted); margin-top: var(--spacing-sm); }
  .empty-state { text-align: center; padding: 80px 20px; color: var(--color-muted); }
  .empty-icon { font-size: 48px; margin-bottom: var(--spacing-md); opacity: 0.3; }
</style>
```

---

### Task 9: Vue islands（核心交互组件）

**Files:**
- Create: `packages/site-astro/src/components/PhotoWall.vue`
- Create: `packages/site-astro/src/components/AlbumGrid.vue`
- Modify: `packages/site-astro/src/components/RosterSearch.vue` (Task 6 已创建)
- Modify: `packages/site-astro/src/components/NameGate.vue` (Task 4 已创建)

**Steps:**

- [ ] **Step 1: 创建 PhotoWall.vue**

```vue
<template>
  <div class="photo-wall">
    <div v-for="photo in photos" :key="photo" class="photo-item">
      <img :src="photoUrl(photo)" alt="" loading="lazy" decoding="async" style="aspect-ratio: 1" />
    </div>
  </div>
</template>

<script setup>
const props = defineProps<{ photos: string[] }>()
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
function photoUrl(p: string) {
  if (p.startsWith('http')) return p
  return `${API_BASE}${p}`
}
</script>

<style scoped>
.photo-wall { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm); }
.photo-item { aspect-ratio: 1; border-radius: var(--rounded-sm); overflow: hidden; cursor: pointer; transition: transform 0.2s ease; }
.photo-item:hover { transform: translateY(-2px); }
.photo-item img { width: 100%; height: 100%; object-fit: cover; }
@media (max-width: 768px) { .photo-wall { grid-template-columns: repeat(2, 1fr); } }
</style>
```

- [ ] **Step 2: 创建 AlbumGrid.vue**（含灯箱）

迁移 `packages/site/src/views/AlbumView.vue` 的相册渲染 + 灯箱逻辑为单文件 Vue island：

```vue
<template>
  <div>
    <div v-for="album in albums" :key="album.id" class="album-section">
      <h2 class="album-name title-lg">{{ album.title }}</h2>
      <p v-if="album.description" class="album-desc">{{ album.description }}</p>
      <div class="photo-grid" :class="'frame-' + album.frameStyle">
        <div v-for="(photo, i) in album.photos" :key="photo.id" class="photo-item" @click="openLightbox(album.photos, i)">
          <img :src="getPhotoUrl(photo.r2Key)" :alt="photo.caption" loading="lazy" decoding="async" style="aspect-ratio: 1" />
          <div v-if="photo.caption" class="photo-caption">{{ photo.caption }}</div>
        </div>
      </div>
    </div>

    <!-- 灯箱 -->
    <Teleport to="body">
      <div v-if="lightbox.open" class="lightbox" @click.self="closeLightbox">
        <button class="lightbox-close" @click="closeLightbox">✕</button>
        <button v-if="lightbox.index > 0" class="lightbox-nav prev" @click="prevPhoto">‹</button>
        <img :src="getPhotoUrl(lightbox.photos[lightbox.index]?.r2Key)" class="lightbox-img" />
        <button v-if="lightbox.index < lightbox.photos.length - 1" class="lightbox-nav next" @click="nextPhoto">›</button>
        <div class="lightbox-caption">{{ lightbox.photos[lightbox.index]?.caption }}</div>
        <div class="lightbox-counter">{{ lightbox.index + 1 }} / {{ lightbox.photos.length }}</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const props = defineProps<{
  albums: Array<{
    id: string; title: string; description: string; frameStyle: string
    photos: Array<{ id: string; r2Key: string; caption: string }>
  }>
  apiBase: string
}>()

function getPhotoUrl(r2Key: string) {
  if (r2Key.startsWith('http')) return r2Key
  return `${props.apiBase}/api/files/${r2Key}`
}

const lightbox = reactive({ open: false, photos: [] as any[], index: 0 })

function openLightbox(photos: any[], index: number) {
  lightbox.photos = photos; lightbox.index = index; lightbox.open = true
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', handleKeydown)
}
function closeLightbox() {
  lightbox.open = false; document.body.style.overflow = ''
  document.removeEventListener('keydown', handleKeydown)
}
function prevPhoto() { if (lightbox.index > 0) lightbox.index-- }
function nextPhoto() { if (lightbox.index < lightbox.photos.length - 1) lightbox.index++ }
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowLeft') prevPhoto()
  if (e.key === 'ArrowRight') nextPhoto()
}
</script>

<style scoped>
.album-section { margin-bottom: var(--spacing-section); }
.album-name { margin-bottom: var(--spacing-xs); }
.album-desc { font-size: var(--type-body-sm-size); color: var(--color-muted); margin-bottom: var(--spacing-lg); }
.photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-sm); }
.photo-item { position: relative; aspect-ratio: 1; border-radius: var(--rounded-sm); overflow: hidden; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.photo-item:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(80,40,10,0.15); }
.photo-item img { width: 100%; height: 100%; object-fit: cover; }
.photo-caption { position: absolute; bottom: 0; left: 0; right: 0; padding: 6px 10px; background: linear-gradient(to top, rgba(0,0,0,0.5), transparent); color: var(--color-on-dark); font-size: var(--type-caption-size); opacity: 0; transition: opacity 0.2s ease; }
.photo-item:hover .photo-caption { opacity: 1; }

.frame-retro .photo-item { border: 6px solid #e8d5a8; box-shadow: 0 0 0 2px #b8903a; border-radius: 2px; }
.frame-film .photo-item { border: 5px solid #1c1c1c; box-shadow: inset 0 0 0 2px #2e2e2e; border-radius: 2px; }
.frame-polaroid .photo-item { border: 8px solid #fff; border-bottom: 32px solid #fff; box-shadow: 0 2px 14px rgba(0,0,0,0.12); border-radius: 1px; }

.lightbox { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; }
.lightbox-close { position: absolute; top: 20px; right: 24px; color: rgba(240,210,150,0.6); font-size: 28px; background: none; border: none; cursor: pointer; }
.lightbox-close:hover { color: var(--color-on-dark); }
.lightbox-img { max-width: 90vw; max-height: 85vh; border-radius: 2px; box-shadow: 0 10px 60px rgba(0,0,0,0.5); }
.lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); color: rgba(240,210,150,0.5); font-size: 36px; background: rgba(0,0,0,0.3); border: none; border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.lightbox-nav:hover { background: rgba(0,0,0,0.6); color: var(--color-on-dark); }
.lightbox-nav.prev { left: 16px; }
.lightbox-nav.next { right: 16px; }
.lightbox-caption { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); color: rgba(240,210,150,0.7); font-size: var(--type-body-sm-size); letter-spacing: 0.1em; }
.lightbox-counter { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); color: rgba(240,210,150,0.4); font-size: var(--type-caption-size); }
@media (max-width: 768px) { .photo-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
```

---

### Task 10: 留言墙 Vue island（Phase 3 骨架）

**Files:**
- Create: `packages/site-astro/src/components/MessageWall.vue`

**Steps:**

- [ ] **Step 1: 创建 MessageWall.vue 骨架**

Phase 3 才实现完整功能，这里先写一个可挂载的空壳组件，展示在 student/[slug].astro 页面底部：

```vue
<template>
  <section class="message-wall-section">
    <h2 class="section-title display-sm">同学留言</h2>
    <div v-if="loading" class="msg-loading">加载中...</div>
    <div v-else-if="messages.length === 0" class="msg-empty">
      <p>暂无留言，成为第一个留言的人吧</p>
    </div>
    <div v-else class="msg-list">
      <div v-for="msg in messages" :key="msg.id" class="msg-item">
        <div class="msg-header">
          <span class="msg-author">{{ msg.authorName }}</span>
          <span class="msg-time">{{ formatDate(msg.createdAt) }}</span>
        </div>
        <p class="msg-content">{{ msg.content }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Message {
  id: string; authorName: string; content: string; createdAt: string
}

const props = defineProps<{ studentSlug: string }>()

const messages = ref<Message[]>([])
const loading = ref(true)

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE}/api/messages/${props.studentSlug}`)
    const data = await res.json()
    if (data.success) messages.value = data.data || []
  } catch {} finally { loading.value = false }
})
</script>

<style scoped>
.message-wall-section { margin-bottom: var(--spacing-section); }
.section-title {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-hairline);
}
.msg-loading, .msg-empty { text-align: center; padding: var(--spacing-xl); color: var(--color-muted); font-size: var(--type-body-sm-size); }
.msg-item { padding: var(--spacing-md) 0; border-bottom: 1px solid var(--color-hairline-soft); }
.msg-header { display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs); }
.msg-author { font-weight: 500; font-size: var(--type-body-sm-size); color: var(--color-body-strong); }
.msg-time { font-size: var(--type-caption-size); color: var(--color-muted); }
.msg-content { font-size: var(--type-body-md-size); color: var(--color-body); line-height: 1.6; }
</style>
```

---

### Task 11: 构建数据管道

**Files:**
- Create: `packages/site-astro/scripts/fetch-data.ts`
- Modify: `packages/site-astro/package.json` (add build:data script)

**Steps:**

- [ ] **Step 1: 创建 fetch-data.ts**

```ts
// 构建前拉取 API 数据，写入 public/data/ 目录
// 用法: npx tsx scripts/fetch-data.ts
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const API_BASE = process.env.VITE_API_BASE_URL || 'https://alumni-book-api.chenyuhao2263.workers.dev'

async function fetchJSON(path: string) {
  const res = await fetch(`${API_BASE}${path}`)
  const data = await res.json()
  return (data as any).data || data
}

async function main() {
  const outDir = join(import.meta.dirname, '..', 'public', 'data')
  mkdirSync(outDir, { recursive: true })

  console.log('Fetching API data...')

  const [students, classmates, config, albums] = await Promise.all([
    fetchJSON('/api/students'),
    fetchJSON('/api/classmates'),
    fetchJSON('/api/config'),
    fetchJSON('/api/albums'),
  ])

  writeFileSync(join(outDir, 'students.json'), JSON.stringify(students))
  writeFileSync(join(outDir, 'classmates.json'), JSON.stringify(classmates))
  writeFileSync(join(outDir, 'config.json'), JSON.stringify(config))
  writeFileSync(join(outDir, 'albums.json'), JSON.stringify(albums))

  console.log(`Done: ${students?.length || 0} students, ${albums?.length || 0} albums`)
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: 更新 package.json scripts**

```json
{
  "scripts": {
    "build:data": "tsx scripts/fetch-data.ts",
    "build": "npm run build:data && astro build"
  }
}
```

- [ ] **Step 3: 简化页面数据获取**

所有 Astro 页面统一从 `public/data/` 读取 JSON，不再各页面独立 fetch。将 fetch 逻辑替换为文件读取。

---

### Task 12: CI/CD 更新

**Files:**
- Modify: `.github/workflows/deploy-site.yml`
- Delete: `.github/workflows/deploy-admin.yml`

**Steps:**

- [ ] **Step 1: 简化 deploy-site.yml**

```yaml
name: Deploy Site & Admin

on:
  push:
    branches: [main, master]
    paths:
      - 'packages/**'
  schedule:
    - cron: '3 3 * * *'       # 每天 11:03 (UTC+8) 自动构建
  workflow_dispatch:           # 手动触发（后台"发布更新"按钮）

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      VITE_API_BASE_URL: 'https://alumni-book-api.chenyuhao2263.workers.dev'
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build site (Astro SSG)
        run: pnpm --filter site-astro build

      - name: Build admin (Vue SPA)
        run: pnpm --filter admin build

      - name: Prepare deployment
        run: |
          mkdir -p deploy
          cp -r packages/site-astro/dist/* deploy/
          mkdir -p deploy/admin
          cp -r packages/admin/dist/* deploy/admin/

      - uses: actions/upload-pages-artifact@v3
        with:
          path: deploy

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 删除 deploy-admin.yml**

```bash
rm .github/workflows/deploy-admin.yml
```

---

### Task 13: 清理旧 site 代码

**Files:**
- Delete: `packages/site/` (整个目录)
- Modify: `package.json` (更新根 scripts 引用)

**Steps:**

- [ ] **Step 1: 更新根 package.json scripts**

```json
{
  "scripts": {
    "dev:site": "pnpm --filter site-astro dev",
    "dev:admin": "pnpm --filter admin dev",
    "dev:worker": "pnpm --filter worker dev",
    "build": "pnpm -r build",
    "build:site": "pnpm --filter site-astro build",
    "build:admin": "pnpm --filter admin build",
    "deploy:worker": "pnpm --filter worker deploy"
  }
}
```

- [ ] **Step 2: 删除 packages/site/**

```bash
rm -rf packages/site
```

---

## 完成标准

- [ ] `pnpm --filter site-astro dev` 本地启动正常
- [ ] `pnpm --filter site-astro build` 构建成功，输出静态文件
- [ ] 所有页面的 HTML 首屏秒出（无 JS 依赖）
- [ ] Vue islands（搜索、灯箱、照片墙、留言墙）交互正常
- [ ] GitHub Actions 自动部署成功
- [ ] `/alumni-book-v2/` 路径下所有路由正常访问
- [ ] 管理后台 `/alumni-book-v2/admin/` 不受影响
