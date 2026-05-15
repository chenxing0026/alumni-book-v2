---
name: vue-cloudflare-deploy
description: Use when deploying a Vue 3 SPA to GitHub Pages with Cloudflare Workers API, D1 database, and R2 storage. Covers the full stack: Vite build configuration, GitHub Actions CI/CD, Cloudflare Worker setup, D1 migrations, R2 bucket creation, JWT authentication, and common pitfalls like white-screen issues caused by incorrect base paths.
---

# Vue 3 + Cloudflare 全栈部署指南

部署 Vue 3 单页应用到 GitHub Pages，后端使用 Cloudflare Workers + D1 + R2。

## 架构概览

```
浏览器
  ├── GitHub Pages (静态文件: HTML/CSS/JS)
  │     ├── 公开站点 (/repo-name/)
  │     └── 管理后台 (/repo-name/admin/)
  └── Cloudflare Worker API
        ├── D1 数据库 (结构化数据)
        └── R2 存储桶 (图片/音频)
```

## 一、Vite 构建配置

### 1.1 base 路径（最常见的白屏原因）

GitHub Pages 部署在子路径 `username.github.io/repo-name/`，必须设置 `base`：

```ts
// vite.config.ts
export default defineConfig({
  base: '/repo-name/',           // 站点
  // 或
  base: '/repo-name/admin/',    // 管理后台
})
```

**原理：** Vite 构建时会把 `base` 前缀注入所有资源路径。没有这个配置，浏览器会去根路径 `/assets/xxx.js` 找文件，返回 404，页面白屏。

### 1.2 Vue Router base

```ts
// main.ts
const router = createRouter({
  history: createWebHistory('/repo-name/'),  // 必须与 vite base 一致
  routes: [...]
})
```

**原理：** Vue Router 的 `createWebHistory(base)` 决定了 URL 匹配的基准路径。如果 base 不匹配，路由会失败或跳转到错误页面。

### 1.3 define 注入环境变量

```ts
// vite.config.ts
define: {
  'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
    process.env.VITE_API_BASE_URL || 'https://your-worker.workers.dev'
  ),
}
```

**原理：** Vite 的 `define` 在构建时将变量替换到代码中。不设置时使用默认值，避免依赖 GitHub Secrets。

---

## 二、Cloudflare Workers

### 2.1 Hono 框架

```ts
import { Hono } from 'hono'
const app = new Hono()

// 公开路由
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// 需要认证的路由
app.use('/api/admin/*', async (c, next) => {
  return jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next)
})
```

**关键：** Hono 的 JWT 中间件必须指定 `alg: 'HS256'`，否则 TypeScript 编译报错。

### 2.2 wrangler.toml 配置

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2024-10-22"
workers_dev = true

[vars]
JWT_SECRET = "change-me"
CORS_ORIGIN = "https://username.github.io"

[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xxx"
migrations_dir = "migrations"

[[r2_buckets]]
binding = "R2"
bucket_name = "my-assets"
```

### 2.3 D1 数据库

```sql
-- migrations/0001_init.sql
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  info TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
```

执行迁移：
```bash
npx wrangler d1 migrations apply my-db --remote
```

执行 SQL：
```bash
npx wrangler d1 execute my-db --remote --file seed.sql
```

### 2.4 R2 存储桶

创建：
```bash
npx wrangler r2 bucket create my-assets
```

代码中访问：
```ts
const object = await c.env.R2.get(key)
await c.env.R2.put(key, file.stream(), {
  httpMetadata: { contentType: file.type }
})
```

**注意：** R2 需要在 Cloudflare Dashboard 中先启用，否则创建失败。

### 2.5 JWT 认证

```ts
// 登录
const token = await createToken({ role: 'admin' }, c.env.JWT_SECRET)

// 验证中间件
app.use('/api/admin/*', async (c, next) => {
  return jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next)
})
```

**原理：** JWT 是无状态令牌，包含签名和过期时间。Worker 验证签名即可确认身份，无需 session 存储。

---

## 三、GitHub Actions CI/CD

```yaml
name: Deploy
on:
  push:
    branches: [main, master]
    paths: ['packages/**']

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      VITE_API_BASE_URL: 'https://my-worker.workers.dev'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter site build
      - uses: actions/upload-pages-artifact@v3
        with: { path: packages/site/dist }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

**关键点：**
- `paths` 过滤只在相关文件变更时触发
- `pnpm install --frozen-lockfile` 使用锁文件确保一致性
- `upload-pages-artifact` + `deploy-pages` 是 GitHub Pages 的标准部署方式

---

## 四、常见问题排查

### 白屏问题

| 症状 | 原因 | 修复 |
|---|---|---|
| 页面白屏，控制台 404 | vite.config.ts 缺少 `base` | 添加 `base: '/repo-name/'` |
| 路由跳转 404 | Vue Router 缺少 base | `createWebHistory('/repo-name/')` |
| 点击链接跳转错误 | router-link 使用绝对路径 | 改为相对路径（去掉 `/repo-name` 前缀） |
| 登录后跳转失败 | `window.location.href` 路径错误 | 使用完整路径 `/repo-name/admin/login` |

### 部署问题

| 症状 | 原因 | 修复 |
|---|---|---|
| Actions 不触发 | `paths` 过滤不匹配 | 检查分支名和路径过滤器 |
| R2 创建失败 | R2 未启用 | 先在 Dashboard 启用 R2 |
| D1 迁移失败 | 未指定 `--remote` | 添加 `--remote` 标志 |
| Worker 部署失败 | 未注册子域名 | 访问 Dashboard 的 Workers 页面 |

### 网络问题

- GitHub 连接不稳定时，多次重试 `git push`
- `git config --global http.sslBackend schannel` 可修复 SSL 连接问题
- 使用 `gh auth git-credential` 作为 credential helper

---

## 五、部署验证清单

```bash
# 1. 验证 API
curl https://my-worker.workers.dev/api/health

# 2. 验证站点
curl -I https://username.github.io/repo-name/

# 3. 验证资源路径
curl https://username.github.io/repo-name/assets/index-xxx.js

# 4. 验证管理后台
curl -I https://username.github.io/repo-name/admin/

# 5. 验证认证
curl -X POST https://my-worker.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin888"}'
```

---

## 六、单体仓库结构

```
project/
├── packages/
│   ├── shared/        # 共享类型、设计令牌、工具函数
│   ├── site/          # 公开站点 Vue SPA
│   └── admin/         # 管理后台 Vue SPA
├── workers/
│   └── api/           # Cloudflare Worker
│       ├── src/
│       │   ├── index.ts
│       │   └── routes/
│       ├── migrations/
│       └── wrangler.toml
├── .github/workflows/
├── package.json       # pnpm workspaces
└── pnpm-workspace.yaml
```

**依赖引用：** `"@shared": "workspace:*"` 引用本地包，无需发布到 npm。
