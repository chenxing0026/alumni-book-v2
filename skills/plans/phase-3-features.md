# 功能迭代 — 留言墙、时光轴、info 拆表、测试、缩略图

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** 实现留言墙（审核制 + 实名 + 最新在前）、时光轴（混合方案 + 照片回忆流）、info 保守拆表（高频字段提升为列）、集成测试覆盖、前端 Canvas 缩略图生成。

**Architecture:** 新功能遵循现有模式：D1 迁移建表 → Worker 路由增删改查 → Vue island / Astro 页面渲染。测试层以 vitest + unstable_dev 覆盖核心 API 路径。

**Tech Stack:** Cloudflare Workers (Hono) / D1 / Vitest / Vue 3 / Canvas API

---

## Phase 3 总览

| # | Task | 类型 |
|---|------|------|
| 1 | D1 迁移：messages + timeline_events 表 | 数据库 |
| 2 | 留言墙 Worker API | 后端 |
| 3 | 留言管理审核 API | 后端 |
| 4 | MessageWall.vue island 完善 | 前端 |
| 5 | 管理后台留言审核页 | 前端 |
| 6 | 时光轴 Worker API | 后端 |
| 7 | 时光轴 Astro 页面 | 前端 |
| 8 | 管理后台事件管理 | 前端 |
| 9 | info 保守拆表 | 数据库 + 后端 + 前端 |
| 10 | 集成测试（vitest + unstable_dev） | 测试 |
| 11 | 前端 Canvas 缩略图 | 前端 |

---

### Task 1: D1 迁移：新增 messages + timeline_events 表

**Files:**
- Create: `workers/api/migrations/0003_add_messages.sql`
- Create: `workers/api/migrations/0004_add_timeline.sql`

**Steps:**

- [ ] **Step 1: 创建 0003_add_messages.sql**

```sql
-- Migration 0003: 同学留言墙

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  student_slug TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_hidden INTEGER DEFAULT 0,
  is_approved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_student ON messages(student_slug, is_approved, created_at DESC);
```

- [ ] **Step 2: 创建 0004_add_timeline.sql**

```sql
-- Migration 0004: 时光轴事件

CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_date TEXT NOT NULL,
  photo_r2_key TEXT,
  is_milestone INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_timeline_date ON timeline_events(event_date DESC);
```

- [ ] **Step 3: 执行迁移**

```bash
pnpm --filter worker db:migrate
```

---

### Task 2: 留言墙 Worker API（公开读写）

**Files:**
- Create: `workers/api/src/routes/messages.ts`
- Modify: `workers/api/src/index.ts` (注册路由)

**Steps:**

- [ ] **Step 1: 创建 messages.ts**

```ts
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

export const messagesRoutes = new Hono<{ Bindings: Bindings }>()

// 公开获取留言（仅审核通过的）
messagesRoutes.get('/messages/:slug', async (c) => {
  const slug = c.req.param('slug')
  const db = c.env.DB
  const { results } = await db.prepare(
    'SELECT id, author_name, content, created_at FROM messages WHERE student_slug = ? AND is_approved = 1 AND is_hidden = 0 ORDER BY created_at DESC'
  ).bind(slug).all()

  return c.json({
    success: true,
    data: (results || []).map((r: any) => ({
      id: r.id,
      authorName: r.author_name,
      content: r.content,
      createdAt: r.created_at,
    })),
  })
})

// 公开提交留言
messagesRoutes.post('/messages/:slug', async (c) => {
  const slug = c.req.param('slug')
  const db = c.env.DB
  const body = await c.req.json()

  const { authorName, content } = body
  if (!authorName || !authorName.trim()) {
    return c.json({ success: false, message: '请提供留言者姓名' }, 400)
  }
  if (!content || !content.trim() || content.trim().length > 500) {
    return c.json({ success: false, message: '留言内容必须在 1-500 字之间' }, 400)
  }

  // 验证学生存在
  const student = await db.prepare('SELECT id FROM students WHERE slug = ?').bind(slug).first()
  if (!student) {
    return c.json({ success: false, message: '学生不存在' }, 404)
  }

  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await db.prepare(
    'INSERT INTO messages (id, student_slug, author_name, content, is_approved) VALUES (?, ?, ?, ?, 0)'
  ).bind(id, slug, authorName.trim(), content.trim()).run()

  return c.json({ success: true, message: '留言已提交，等待审核' })
})
```

- [ ] **Step 2: 在 index.ts 中注册路由**

在 `workers/api/src/index.ts` 中添加：

```ts
import { messagesRoutes } from './routes/messages'

// 在公开路由区域（JWT 中间件之前）添加：
app.route('/api', messagesRoutes)

// 管理后台留言审核路由（需要 JWT）：
app.use('/api/admin/messages', async (c, next) => {
  return createJwtMiddleware(c.env.JWT_SECRET)(c, next)
})

app.use('/api/admin/messages/:id', async (c, next) => {
  return createJwtMiddleware(c.env.JWT_SECRET)(c, next)
})
```

---

### Task 3: 留言管理审核 API

**Files:**
- Modify: `workers/api/src/routes/messages.ts` (追加管理路由)

**Steps:**

- [ ] **Step 1: 追加管理路由到 messages.ts**

```ts
// 管理员获取所有留言（含未审核）
messagesRoutes.get('/admin/messages', async (c) => {
  const db = c.env.DB
  const slug = c.req.query('slug')
  const approved = c.req.query('approved') // '0' or '1' or undefined = all

  let sql = 'SELECT * FROM messages WHERE 1=1'
  const binds: any[] = []

  if (slug) { sql += ' AND student_slug = ?'; binds.push(slug) }
  if (approved === '0') { sql += ' AND is_approved = 0' }
  if (approved === '1') { sql += ' AND is_approved = 1' }
  sql += ' ORDER BY created_at DESC LIMIT 100'

  const { results } = await db.prepare(sql).bind(...binds).all()
  return c.json({
    success: true,
    data: (results || []).map((r: any) => ({
      id: r.id,
      studentSlug: r.student_slug,
      authorName: r.author_name,
      content: r.content,
      isApproved: !!r.is_approved,
      isHidden: !!r.is_hidden,
      createdAt: r.created_at,
    })),
  })
})

// 审核通过
messagesRoutes.put('/admin/messages/:id/approve', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  await db.prepare('UPDATE messages SET is_approved = 1 WHERE id = ?').bind(id).run()
  return c.json({ success: true, message: '已审核通过' })
})

// 隐藏/取消隐藏
messagesRoutes.put('/admin/messages/:id/hide', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const { hidden } = await c.req.json()
  await db.prepare('UPDATE messages SET is_hidden = ? WHERE id = ?').bind(hidden ? 1 : 0, id).run()
  return c.json({ success: true, message: hidden ? '已隐藏' : '已取消隐藏' })
})

// 删除
messagesRoutes.delete('/admin/messages/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  await db.prepare('DELETE FROM messages WHERE id = ?').bind(id).run()
  return c.json({ success: true, message: '已删除' })
})
```

---

### Task 4: MessageWall.vue island 完善

**Files:**
- Modify: `packages/site-astro/src/components/MessageWall.vue` (从骨架完善)

**Steps:**

- [ ] **Step 1: 完善 MessageWall.vue**

在 Phase 1 Task 10 的骨架基础上，添加留言提交功能：

```vue
<template>
  <section class="message-wall-section">
    <h2 class="section-title display-sm">同学留言</h2>

    <!-- 留言表单 -->
    <div class="msg-form">
      <textarea v-model="newContent" class="text-input msg-textarea" placeholder="写下一段话，留作彼此的纪念…" maxlength="500" rows="3"></textarea>
      <div class="msg-form-footer">
        <span class="msg-char-count">{{ newContent.length }}/500</span>
        <button class="btn-primary btn-sm" @click="submitMessage" :disabled="submitting || !newContent.trim()">
          {{ submitting ? '提交中...' : '提交留言' }}
        </button>
      </div>
      <p v-if="submitResult" :class="'msg-result ' + submitResult.type">{{ submitResult.message }}</p>
    </div>

    <!-- 留言列表 -->
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
const newContent = ref('')
const submitting = ref(false)
const submitResult = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function getAuthorName() {
  return sessionStorage.getItem('classmate_name') || ''
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

async function fetchMessages() {
  try {
    const res = await fetch(`${API_BASE}/api/messages/${props.studentSlug}`)
    const data = await res.json()
    if (data.success) messages.value = data.data || []
  } catch {} finally { loading.value = false }
}

async function submitMessage() {
  const author = getAuthorName()
  if (!author) {
    submitResult.value = { type: 'error', message: '请先在首页输入姓名' }
    return
  }
  if (!newContent.value.trim()) return

  submitting.value = true
  submitResult.value = null
  try {
    const res = await fetch(`${API_BASE}/api/messages/${props.studentSlug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName: author, content: newContent.value.trim() }),
    })
    const data = await res.json()
    if (data.success) {
      newContent.value = ''
      submitResult.value = { type: 'success', message: '留言已提交，等待审核后显示' }
    } else {
      submitResult.value = { type: 'error', message: data.message || '提交失败' }
    }
  } catch {
    submitResult.value = { type: 'error', message: '网络错误，请稍后重试' }
  } finally { submitting.value = false }
}

onMounted(fetchMessages)
</script>

<style scoped>
.message-wall-section { margin-bottom: var(--spacing-section); }
.section-title {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-hairline);
}
.msg-form { margin-bottom: var(--spacing-xl); }
.msg-textarea {
  width: 100%;
  min-height: 80px;
  padding: var(--spacing-md);
  font-size: var(--type-body-md-size);
  font-family: var(--font-body);
  color: var(--color-ink);
  background-color: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--rounded-md);
  resize: vertical;
  outline: none;
}
.msg-textarea:focus { border-color: var(--color-primary); }
.msg-form-footer { display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacing-xs); }
.msg-char-count { font-size: var(--type-caption-size); color: var(--color-muted); }
.msg-result { margin-top: var(--spacing-xs); font-size: var(--type-body-sm-size); }
.msg-result.success { color: var(--color-success); }
.msg-result.error { color: var(--color-error); }
.btn-sm { height: 32px; padding: 0 12px; font-size: 13px; }
.msg-loading, .msg-empty { text-align: center; padding: var(--spacing-xl); color: var(--color-muted); font-size: var(--type-body-sm-size); }
.msg-item { padding: var(--spacing-md) 0; border-bottom: 1px solid var(--color-hairline-soft); }
.msg-header { display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs); }
.msg-author { font-weight: 500; font-size: var(--type-body-sm-size); color: var(--color-body-strong); }
.msg-time { font-size: var(--type-caption-size); color: var(--color-muted); }
.msg-content { font-size: var(--type-body-md-size); color: var(--color-body); line-height: 1.6; }
</style>
```

- [ ] **Step 2: 在 student/[slug].astro 中挂载**

在学生详情页底部（`</div>` 闭合前）挂载 MessageWall：

```astro
<div id={`message-wall-${student.slug}`}></div>
```

相应的 script 部分追加：

```js
import MessageWall from '../../../components/MessageWall.vue'
const msgEl = document.getElementById(`message-wall-${Astro.params.slug}`)
if (msgEl) createApp(MessageWall, { studentSlug: Astro.params.slug }).mount(msgEl)
```

---

### Task 5: 管理后台留言审核页

**Files:**
- Create: `packages/admin/src/views/MessagesView.vue`
- Modify: `packages/admin/src/main.ts` (添加路由)

**Steps:**

- [ ] **Step 1: 创建 MessagesView.vue**

```vue
<template>
  <div class="messages-page">
    <div class="page-header">
      <h1 class="page-title">留言管理</h1>
      <div class="filter-tabs">
        <button :class="['tab-btn', { active: filter === 'all' }]" @click="filter = 'all'">全部</button>
        <button :class="['tab-btn', { active: filter === 'pending' }]" @click="filter = 'pending'">待审核</button>
        <button :class="['tab-btn', { active: filter === 'approved' }]" @click="filter = 'approved'">已通过</button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="msg-list">
      <div v-for="msg in filteredMessages" :key="msg.id" class="msg-card card">
        <div class="msg-meta">
          <span class="msg-student">学生: {{ msg.studentSlug }}</span>
          <span class="msg-author">留言者: {{ msg.authorName }}</span>
          <span class="msg-time">{{ msg.createdAt }}</span>
          <span v-if="!msg.isApproved" class="badge badge-pending">待审核</span>
          <span v-if="msg.isHidden" class="badge badge-hidden">已隐藏</span>
        </div>
        <p class="msg-content">{{ msg.content }}</p>
        <div class="msg-actions">
          <button v-if="!msg.isApproved" class="btn-primary btn-sm" @click="approve(msg.id)">审核通过</button>
          <button v-if="!msg.isHidden" class="btn-secondary btn-sm" @click="toggleHide(msg.id, true)">隐藏</button>
          <button v-else class="btn-secondary btn-sm" @click="toggleHide(msg.id, false)">取消隐藏</button>
          <button class="btn-danger btn-sm" @click="remove(msg.id)">删除</button>
        </div>
      </div>
    </div>

    <div v-if="toast" :class="'toast toast-' + toast.type">{{ toast.message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { adminFetch } from '@/api/client'

interface Message {
  id: string; studentSlug: string; authorName: string; content: string
  isApproved: boolean; isHidden: boolean; createdAt: string
}

const messages = ref<Message[]>([])
const filter = ref('pending')
const loading = ref(true)
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const filteredMessages = computed(() => {
  if (filter.value === 'pending') return messages.value.filter(m => !m.isApproved)
  if (filter.value === 'approved') return messages.value.filter(m => m.isApproved)
  return messages.value
})

async function load() {
  try {
    const res = await adminFetch<{ success: boolean; data: Message[] }>('/api/admin/messages')
    if (res.data) messages.value = res.data
  } catch (e: any) {
    toast.value = { type: 'error', message: e.message }
  } finally { loading.value = false }
}

async function approve(id: string) {
  try {
    await adminFetch(`/api/admin/messages/${id}/approve`, { method: 'PUT' })
    const msg = messages.value.find(m => m.id === id)
    if (msg) msg.isApproved = true
    toast.value = { type: 'success', message: '已审核通过' }
  } catch (e: any) {
    toast.value = { type: 'error', message: e.message }
  }
}

async function toggleHide(id: string, hidden: boolean) {
  try {
    await adminFetch(`/api/admin/messages/${id}/hide`, {
      method: 'PUT',
      body: JSON.stringify({ hidden }),
    })
    const msg = messages.value.find(m => m.id === id)
    if (msg) msg.isHidden = hidden
    toast.value = { type: 'success', message: hidden ? '已隐藏' : '已取消隐藏' }
  } catch (e: any) {
    toast.value = { type: 'error', message: e.message }
  }
}

async function remove(id: string) {
  if (!confirm('确定删除？')) return
  try {
    await adminFetch(`/api/admin/messages/${id}`, { method: 'DELETE' })
    messages.value = messages.value.filter(m => m.id !== id)
    toast.value = { type: 'success', message: '已删除' }
  } catch (e: any) {
    toast.value = { type: 'error', message: e.message }
  }
}

onMounted(load)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-md); }
.filter-tabs { display: flex; gap: var(--spacing-xs); }
.tab-btn {
  padding: 6px 16px;
  font-size: var(--type-body-sm-size);
  border: 1px solid var(--color-hairline);
  border-radius: var(--rounded-pill);
  background: transparent;
  cursor: pointer;
  color: var(--color-muted);
}
.tab-btn.active { background: var(--color-primary); color: var(--color-on-primary); border-color: var(--color-primary); }
.msg-list { display: flex; flex-direction: column; gap: var(--spacing-md); margin-top: var(--spacing-lg); }
.msg-card { padding: var(--spacing-lg); }
.msg-meta { display: flex; gap: var(--spacing-md); flex-wrap: wrap; font-size: var(--type-caption-size); color: var(--color-muted); margin-bottom: var(--spacing-sm); }
.msg-content { font-size: var(--type-body-md-size); line-height: 1.6; margin-bottom: var(--spacing-sm); }
.msg-actions { display: flex; gap: var(--spacing-xs); }
.badge { padding: 2px 8px; border-radius: var(--rounded-pill); font-size: 11px; }
.badge-pending { background: var(--color-warning); color: white; }
.badge-hidden { background: var(--color-muted); color: white; }
.btn-sm { height: 28px; padding: 0 10px; font-size: 12px; }
.loading { text-align: center; padding: var(--spacing-xxl); color: var(--color-muted); }
</style>
```

- [ ] **Step 2: 添加路由**

在 `packages/admin/src/main.ts` 的 children 中添加：

```ts
{ path: 'messages', name: 'messages', component: () => import('./views/MessagesView.vue') },
```

- [ ] **Step 3: 在 AdminLayout 侧边栏中添加导航项**

在 `AdminLayout.vue` 的导航中添加"留言管理"链接。

---

### Task 6: 时光轴 Worker API

**Files:**
- Create: `workers/api/src/routes/timeline.ts`
- Modify: `workers/api/src/index.ts` (注册路由)

**Steps:**

- [ ] **Step 1: 创建 timeline.ts**

```ts
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

export const timelineRoutes = new Hono<{ Bindings: Bindings }>()

// 公开获取时光轴（手动事件 + 自动聚合）
timelineRoutes.get('/timeline', async (c) => {
  const db = c.env.DB

  // 手动事件
  const { results: events } = await db.prepare(
    'SELECT * FROM timeline_events ORDER BY event_date DESC, sort_order'
  ).all()

  // 自动聚合：最新留言
  const { results: recentMessages } = await db.prepare(
    "SELECT id, student_slug, author_name, content, created_at FROM messages WHERE is_approved = 1 AND is_hidden = 0 ORDER BY created_at DESC LIMIT 20"
  ).all()

  // 自动聚合：最新相册照片
  const { results: recentPhotos } = await db.prepare(
    "SELECT p.*, a.title as album_title FROM photos p JOIN albums a ON p.album_id = a.id ORDER BY p.created_at DESC LIMIT 20"
  ).all()

  // 自动聚合：最新学生加入
  const { results: recentStudents } = await db.prepare(
    "SELECT name, slug, avatar_url, created_at FROM students ORDER BY created_at DESC LIMIT 10"
  ).all()

  // 混合排序
  const timeline: any[] = []

  for (const e of (events || [])) {
    timeline.push({
      type: 'event',
      id: (e as any).id,
      title: (e as any).title,
      description: (e as any).description,
      date: (e as any).event_date,
      photoUrl: (e as any).photo_r2_key ? `/api/files/${(e as any).photo_r2_key}` : null,
      isMilestone: !!(e as any).is_milestone,
    })
  }

  for (const m of (recentMessages || [])) {
    timeline.push({
      type: 'message',
      id: `msg_${(m as any).id}`,
      title: `${(m as any).author_name} 在同学录留言`,
      description: (m as any).content,
      date: (m as any).created_at,
      studentSlug: (m as any).student_slug,
    })
  }

  for (const p of (recentPhotos || [])) {
    timeline.push({
      type: 'photo',
      id: `photo_${(p as any).id}`,
      title: `班级照片 · ${(p as any).album_title}`,
      description: (p as any).caption,
      date: (p as any).created_at,
      photoUrl: `/api/files/${(p as any).r2_key}`,
    })
  }

  for (const s of (recentStudents || [])) {
    timeline.push({
      type: 'join',
      id: `join_${(s as any).slug}`,
      title: `${(s as any).name} 加入了同学录`,
      date: (s as any).created_at,
      slug: (s as any).slug,
      avatarUrl: (s as any).avatar_url,
    })
  }

  // 按日期倒序
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return c.json({ success: true, data: timeline.slice(0, 50) })
})

// 管理后台 CRUD
timelineRoutes.post('/timeline/events', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  if (!body.title || !body.eventDate) {
    return c.json({ success: false, message: '标题和日期必填' }, 400)
  }
  const id = `tle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await db.prepare(
    'INSERT INTO timeline_events (id, title, description, event_date, photo_r2_key, is_milestone) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, body.title, body.description || '', body.eventDate, body.photoR2Key || null, body.isMilestone ? 1 : 0).run()
  return c.json({ success: true, data: { id } })
})

timelineRoutes.put('/timeline/events/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const body = await c.req.json()
  const fields: string[] = []
  const values: any[] = []
  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title) }
  if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description) }
  if (body.eventDate !== undefined) { fields.push('event_date = ?'); values.push(body.eventDate) }
  if (body.photoR2Key !== undefined) { fields.push('photo_r2_key = ?'); values.push(body.photoR2Key) }
  if (body.isMilestone !== undefined) { fields.push('is_milestone = ?'); values.push(body.isMilestone ? 1 : 0) }
  if (fields.length === 0) {
    return c.json({ success: false, message: '没有要更新的字段' }, 400)
  }
  values.push(id)
  await db.prepare(`UPDATE timeline_events SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
  return c.json({ success: true, message: '更新成功' })
})

timelineRoutes.delete('/timeline/events/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  await db.prepare('DELETE FROM timeline_events WHERE id = ?').bind(id).run()
  return c.json({ success: true, message: '删除成功' })
})

export { timelineRoutes }
```

- [ ] **Step 2: 在 index.ts 中注册路由**

```ts
import { timelineRoutes } from './routes/timeline'

// 公开路由
app.route('/api', timelineRoutes)

// JWT 保护写操作
app.use('/api/timeline/events', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return createJwtMiddleware(c.env.JWT_SECRET)(c, next)
})
app.use('/api/timeline/events/:id', async (c, next) => {
  return createJwtMiddleware(c.env.JWT_SECRET)(c, next)
})
```

---

### Task 7: 时光轴 Astro 页面

**Files:**
- Create: `packages/site-astro/src/pages/timeline.astro`

**Steps:**

- [ ] **Step 1: 创建 timeline.astro**

SSG 页面，构建时 fetch `/api/timeline`。视觉上采用垂直时间线布局：

```astro
---
import MainLayout from '../layouts/MainLayout.astro'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://alumni-book-api.chenyuhao2263.workers.dev'
let items: any[] = []
try {
  const res = await fetch(`${API_BASE}/api/timeline`)
  const data = await res.json() as any
  items = data.data || []
} catch {}
---

<MainLayout>
  <div class="timeline-page section">
    <div class="container">
      <div class="timeline-header">
        <p class="timeline-label">· TIMELINE ·</p>
        <h1 class="timeline-title display-lg">时光轴</h1>
        <p class="timeline-subtitle">沿着时间的轨迹，翻阅我们的故事</p>
      </div>

      <div class="timeline-line">
        {items.map((item, i) => (
          <div class={`timeline-node ${item.isMilestone ? 'milestone' : ''} type-${item.type}`}>
            <div class="tl-dot"></div>
            <div class="tl-card">
              <div class="tl-date">{new Date(item.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <h3 class="tl-title">{item.title}</h3>
              {item.description && <p class="tl-desc">{item.description}</p>}
              {item.photoUrl && (
                <img src={item.photoUrl.startsWith('http') ? item.photoUrl : `${API_BASE}${item.photoUrl}`} alt="" loading="lazy" decoding="async" style="aspect-ratio: 4/3" class="tl-photo" />
              )}
              {item.type === 'join' && item.slug && (
                <a href={`/student/${item.slug}`} class="tl-link">查看 TA 的主页 →</a>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div class="empty-state">
          <p>时光轴尚未写入内容</p>
        </div>
      )}
    </div>
  </div>
</MainLayout>

<style>
  .timeline-page { padding-top: calc(var(--nav-height) + var(--spacing-section)); }
  .timeline-header { text-align: center; margin-bottom: var(--spacing-xxl); }
  .timeline-label {
    font-size: var(--type-caption-uppercase-size);
    font-weight: var(--type-caption-uppercase-weight);
    letter-spacing: var(--type-caption-uppercase-letter-spacing);
    color: var(--color-muted);
    margin-bottom: var(--spacing-md);
  }
  .timeline-subtitle { font-size: var(--type-body-sm-size); color: var(--color-muted); margin-top: var(--spacing-sm); }
  .timeline-line { position: relative; max-width: 720px; margin: 0 auto; }
  .timeline-line::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0; bottom: 0;
    width: 1px;
    background: var(--color-hairline);
    transform: translateX(-50%);
  }
  .timeline-node { position: relative; display: flex; margin-bottom: var(--spacing-xl); }
  .timeline-node:nth-child(odd) { padding-right: 50%; }
  .timeline-node:nth-child(even) { padding-left: 50%; justify-content: flex-end; }
  .tl-dot {
    position: absolute;
    left: 50%;
    top: 20px;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: var(--color-primary);
    transform: translateX(-50%);
    z-index: 1;
  }
  .milestone .tl-dot { width: 20px; height: 20px; background: var(--color-accent-amber); box-shadow: 0 0 0 4px rgba(232, 165, 90, 0.2); }
  .tl-card {
    background: var(--color-surface-card);
    border: 1px solid var(--color-hairline);
    border-radius: var(--rounded-md);
    padding: var(--spacing-lg);
    max-width: 340px;
  }
  .tl-date { font-size: var(--type-caption-size); color: var(--color-muted); margin-bottom: var(--spacing-xs); }
  .tl-title { font-size: var(--type-title-sm-size); margin-bottom: var(--spacing-xs); }
  .tl-desc { font-size: var(--type-body-sm-size); color: var(--color-body); line-height: 1.6; }
  .tl-photo { width: 100%; border-radius: var(--rounded-sm); margin-top: var(--spacing-sm); }
  .tl-link { display: inline-block; margin-top: var(--spacing-sm); font-size: var(--type-body-sm-size); color: var(--color-primary); text-decoration: none; }
  .tl-link:hover { text-decoration: underline; }
  .empty-state { text-align: center; padding: var(--spacing-xxl); color: var(--color-muted); }

  @media (max-width: 768px) {
    .timeline-line::before { left: 20px; }
    .timeline-node:nth-child(odd), .timeline-node:nth-child(even) { padding: 0 0 0 48px; }
    .tl-dot { left: 20px; }
    .tl-card { max-width: 100%; }
  }
</style>
```

- [ ] **Step 2: 在导航中添加时光轴链接**

在 `TopNav.astro` 的 `nav-links` 中添加：

```astro
<a href="/timeline" class="nav-link">时光轴</a>
```

---

### Task 8: 管理后台事件管理

**Files:**
- Create: `packages/admin/src/views/TimelineEventsView.vue`
- Modify: `packages/admin/src/main.ts` (添加路由)

**Steps:**

- [ ] **Step 1: 创建 TimelineEventsView.vue**

```vue
<template>
  <div class="timeline-admin">
    <div class="page-header">
      <h1 class="page-title">时光轴事件</h1>
      <button class="btn-primary" @click="showForm = !showForm">
        {{ showForm ? '取消' : '添加事件' }}
      </button>
    </div>

    <!-- 添加/编辑表单 -->
    <div v-if="showForm" class="card form-card">
      <div class="form-group">
        <label class="form-label">标题 *</label>
        <input v-model="form.title" type="text" class="text-input" />
      </div>
      <div class="form-group">
        <label class="form-label">日期 *</label>
        <input v-model="form.eventDate" type="date" class="text-input" />
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea v-model="form.description" class="text-input form-textarea" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">照片 (上传后填入 R2 Key)</label>
        <input v-model="form.photoR2Key" type="text" class="text-input" placeholder="photos/xxx.jpg" />
      </div>
      <div class="form-group">
        <label><input type="checkbox" v-model="form.isMilestone" /> 标记为里程碑</label>
      </div>
      <div class="form-actions">
        <button class="btn-primary" @click="handleSave" :disabled="saving">
          {{ editingId ? '更新' : '添加' }}
        </button>
      </div>
    </div>

    <!-- 事件列表 -->
    <div class="event-list">
      <div v-for="event in events" :key="event.id" class="card event-card">
        <div class="event-info">
          <span class="event-date">{{ event.eventDate }}</span>
          <h3 class="event-title">{{ event.title }}</h3>
          <p v-if="event.description" class="event-desc">{{ event.description }}</p>
          <span v-if="event.isMilestone" class="badge-milestone">里程碑</span>
        </div>
        <div class="event-actions">
          <button class="btn-secondary btn-sm" @click="editEvent(event)">编辑</button>
          <button class="btn-danger btn-sm" @click="deleteEvent(event.id)">删除</button>
        </div>
      </div>
      <div v-if="events.length === 0" class="empty">暂无事件</div>
    </div>

    <div v-if="toast" :class="'toast toast-' + toast.type">{{ toast.message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminFetch } from '@/api/client'

interface Event {
  id: string; title: string; description: string; eventDate: string
  photoR2Key: string | null; isMilestone: boolean
}

const events = ref<Event[]>([])
const showForm = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const form = ref({
  title: '',
  eventDate: '',
  description: '',
  photoR2Key: '',
  isMilestone: false,
})

function resetForm() {
  form.value = { title: '', eventDate: '', description: '', photoR2Key: '', isMilestone: false }
  editingId.value = null
}

async function load() {
  try {
    const res = await adminFetch<{ success: boolean; data: Event[] }>('/api/timeline')
    if (res.data) events.value = res.data.filter((e: any) => e.type === 'event')
  } catch (e: any) {
    toast.value = { type: 'error', message: e.message }
  }
}

async function handleSave() {
  if (!form.value.title || !form.value.eventDate) {
    toast.value = { type: 'error', message: '标题和日期必填' }
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await adminFetch(`/api/timeline/events/${editingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(form.value),
      })
    } else {
      await adminFetch('/api/timeline/events', {
        method: 'POST',
        body: JSON.stringify(form.value),
      })
    }
    resetForm()
    showForm.value = false
    await load()
    toast.value = { type: 'success', message: editingId.value ? '已更新' : '已添加' }
  } catch (e: any) {
    toast.value = { type: 'error', message: e.message }
  } finally { saving.value = false }
}

function editEvent(event: Event) {
  form.value = {
    title: event.title,
    eventDate: event.eventDate,
    description: event.description,
    photoR2Key: event.photoR2Key || '',
    isMilestone: event.isMilestone,
  }
  editingId.value = event.id
  showForm.value = true
}

async function deleteEvent(id: string) {
  if (!confirm('确定删除？')) return
  try {
    await adminFetch(`/api/timeline/events/${id}`, { method: 'DELETE' })
    events.value = events.value.filter(e => e.id !== id)
    toast.value = { type: 'success', message: '已删除' }
  } catch (e: any) {
    toast.value = { type: 'error', message: e.message }
  }
}

onMounted(load)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; }
.form-card { padding: var(--spacing-lg); margin: var(--spacing-lg) 0; display: flex; flex-direction: column; gap: var(--spacing-md); }
.form-group { display: flex; flex-direction: column; gap: var(--spacing-xxs); }
.form-label { font-size: var(--type-body-sm-size); font-weight: 500; }
.form-textarea { min-height: 80px; padding: var(--spacing-sm); resize: vertical; }
.form-actions { display: flex; gap: var(--spacing-sm); }
.event-list { display: flex; flex-direction: column; gap: var(--spacing-md); }
.event-card { display: flex; justify-content: space-between; padding: var(--spacing-lg); }
.event-date { font-size: var(--type-caption-size); color: var(--color-muted); }
.event-title { font-size: var(--type-title-sm-size); margin: var(--spacing-xxs) 0; }
.event-desc { font-size: var(--type-body-sm-size); color: var(--color-body); }
.badge-milestone { display: inline-block; margin-top: var(--spacing-xs); padding: 2px 8px; background: var(--color-accent-amber); color: white; border-radius: var(--rounded-pill); font-size: 11px; }
.event-actions { display: flex; gap: var(--spacing-xs); align-items: flex-start; }
.empty { text-align: center; padding: var(--spacing-xxl); color: var(--color-muted); }
</style>
```

- [ ] **Step 2: 添加路由**

在 `packages/admin/src/main.ts` 中添加：

```ts
{ path: 'timeline', name: 'timeline', component: () => import('./views/TimelineEventsView.vue') },
```

- [ ] **Step 3: 在 AdminLayout 导航中添加"时光轴"链接**

---

### Task 9: info 保守拆表

**Files:**
- Create: `workers/api/migrations/0005_info_columns.sql`
- Modify: `workers/api/src/routes/students.ts` (更新查询适配新列)
- Modify: `workers/api/src/index.ts` (更新 formatStudent)
- Modify: `packages/site-astro/src/pages/student/[slug].astro` (适配新字段)
- Modify: `packages/admin/src/views/StudentEditView.vue` (适配新字段)

**Steps:**

- [ ] **Step 1: 创建 0005_info_columns.sql**

```sql
-- Migration 0005: 提升高频 info 字段为独立列

ALTER TABLE students ADD COLUMN mbti TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN graduation_year TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN school TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN class_name TEXT DEFAULT '';
```

- [ ] **Step 2: 更新 formatStudent (index.ts)**

```ts
function formatStudent(row: any) {
  const info = JSON.parse(row.info || '{}')
  // 新列覆盖 info 中的值
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isOwner: !!row.is_owner,
    avatarUrl: row.avatar_url,
    musicUrl: row.music_url,
    musicTitle: row.music_title,
    musicAutoplay: !!row.music_autoplay,
    backgroundUrl: row.background_url,
    backgroundColor: row.background_color,
    customHtml: row.custom_html,
    info: {
      ...info,
      mbti: row.mbti || info.mbti || '',
      graduationYear: row.graduation_year || info.graduationYear || '',
      school: row.school || info.school || '',
      class: row.class_name || info.class || '',
    },
    photos: JSON.parse(row.photos || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
```

- [ ] **Step 3: 更新 students.ts 的 PUT 路由**

在 `fields` 更新逻辑中添加新列的映射：

```ts
if (body.info?.mbti !== undefined) { fields.push('mbti = ?'); values.push(body.info.mbti) }
if (body.info?.graduationYear !== undefined) { fields.push('graduation_year = ?'); values.push(body.info.graduationYear) }
if (body.info?.school !== undefined) { fields.push('school = ?'); values.push(body.info.school) }
if (body.info?.class !== undefined) { fields.push('class_name = ?'); values.push(body.info.class) }
```

- [ ] **Step 4: 前端适配**

`StudentEditView.vue` 中新列的双向绑定保持不变——`v-model="student.info.mbti"` 自动通过 `formatStudent` 的合并逻辑映射到新列。无需变更 Vue 模板。

---

### Task 10: 集成测试（vitest + unstable_dev）

**Files:**
- Create: `workers/api/vitest.config.ts`
- Create: `workers/api/tests/auth.test.ts`
- Create: `workers/api/tests/students.test.ts`
- Create: `workers/api/tests/messages.test.ts`
- Modify: `workers/api/package.json` (添加 test script)

**Steps:**

- [ ] **Step 1: 安装 vitest + wrangler**

```bash
pnpm --filter worker add -D vitest @cloudflare/vitest-pool-workers
```

- [ ] **Step 2: 创建 vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: '@cloudflare/vitest-pool-workers',
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          d1Databases: ['DB'],
          r2Buckets: ['R2'],
        },
      },
    },
  },
})
```

- [ ] **Step 3: 创建 auth.test.ts**

```ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, it, expect, beforeAll } from 'vitest'
import worker from '../src/index'

describe('Auth API', () => {
  it('POST /api/auth/login — 默认密码登录成功', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin888' }),
    })
    const ctx = createExecutionContext()
    const res = await worker.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(body.data.token).toBeTruthy()
  })

  it('POST /api/auth/login — 错误密码返回 401', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrongpassword' }),
    })
    const ctx = createExecutionContext()
    const res = await worker.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/stats — 无 token 返回 401', async () => {
    const req = new Request('http://localhost/api/admin/stats')
    const ctx = createExecutionContext()
    const res = await worker.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 4: 创建 students.test.ts**

```ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import worker from '../src/index'

describe('Students API', () => {
  it('GET /api/classmates — 返回同学名单', async () => {
    const req = new Request('http://localhost/api/classmates')
    const ctx = createExecutionContext()
    const res = await worker.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('GET /api/config — 返回站点配置', async () => {
    const req = new Request('http://localhost/api/config')
    const ctx = createExecutionContext()
    const res = await worker.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(body.data.preface).toBeDefined()
  })

  it('GET /api/health — 健康检查', async () => {
    const req = new Request('http://localhost/api/health')
    const ctx = createExecutionContext()
    const res = await worker.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.data.status).toBe('ok')
  })
})
```

- [ ] **Step 5: 更新 package.json scripts**

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

- [ ] **Step 6: 运行测试验证**

```bash
pnpm --filter worker test
```

---

### Task 11: 前端 Canvas 缩略图

**Files:**
- Modify: `packages/admin/src/views/StudentEditView.vue` (handleAvatarUpload)
- Modify: `packages/admin/src/views/AlbumsView.vue` (handlePhotoUpload — 需先创建 AlbumsView)

**Steps:**

- [ ] **Step 1: 创建缩略图生成工具函数**

在 `packages/admin/src/api/` 或 `packages/shared/src/` 中创建 `imageUtils.ts`：

```ts
export function createThumbnail(file: File, maxWidth = 200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = maxWidth / img.width
      const canvas = document.createElement('canvas')
      canvas.width = maxWidth
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      }, file.type, quality)
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = url
  })
}
```

- [ ] **Step 2: 更新 StudentEditView 的 handleAvatarUpload**

在现有上传逻辑前插入缩略图生成。原图直接上传，缩略图也上传；或者简化为：只上传缩略图作为头像（头像不需要原图大小）。

```ts
async function handleAvatarUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  // 生成缩略图
  const thumb = await createThumbnail(file, 200)
  const thumbFile = new File([thumb], file.name, { type: file.type })

  const formData = new FormData()
  formData.append('file', thumbFile)  // 上传缩略图而非原图
  formData.append('type', 'avatar')
  formData.append('slug', student.value.slug)

  try {
    const res = await adminFetch<ApiResponse<{ url: string }>>('/api/upload', {
      method: 'POST', body: formData, headers: {},
    })
    if (res.data?.url) student.value.avatarUrl = res.data.url
    showToast('success', '头像上传成功')
  } catch (e: any) {
    showToast('error', e.message || '上传失败')
  }
}
```

- [ ] **Step 3: 所有 `<img>` 标签加懒加载属性**

在 Phase 1 迁移中已完成（`loading="lazy" decoding="async" style="aspect-ratio: 1"`）。检查确认所有图片标签都有这些属性。

---

## 完成标准

- [ ] 留言可提交、审核、展示
- [ ] 管理后台可管理留言（审核/隐藏/删除）
- [ ] 时光轴页面展示手动事件 + 自动聚合内容
- [ ] 管理后台可管理时光轴事件
- [ ] info 高频字段（mbti, graduationYear, school, class）为独立列
- [ ] `pnpm --filter worker test` 通过（核心路径覆盖）
- [ ] 头像上传自动生成缩略图
- [ ] 所有图片懒加载
