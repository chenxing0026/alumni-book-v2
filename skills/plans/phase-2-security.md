# 安全底线修复

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** 修复 JWT Secret 硬编码、密码哈希弱加密两个安全漏洞。改动集中在 Worker 端，前端不变。

**Architecture:** JWT Secret 从 `wrangler.toml` 移到 wrangler secrets + `.dev.vars`；密码哈希从单次 SHA-256 升级到 PBKDF2 + salt + 10 万次迭代。

**Tech Stack:** Cloudflare Workers (Hono) / Web Crypto API / Wrangler CLI

---

## Phase 2 总览

| # | Task | 影响范围 |
|---|------|----------|
| 1 | JWT Secret 外部化 | Worker 配置 |
| 2 | 密码哈希升级到 PBKDF2 | Worker auth 路由 |
| 3 | 验证部署 | 测试 |

---

### Task 1: JWT Secret 外部化

**Files:**
- Modify: `workers/api/wrangler.toml` (删除 JWT_SECRET vars)
- Create: `workers/api/.dev.vars` (本地开发用)
- Modify: `.gitignore` (确认 `.dev.vars` 已忽略)

**Steps:**

- [ ] **Step 1: 创建 .dev.vars**

```bash
# workers/api/.dev.vars
JWT_SECRET=alumni-book-jwt-secret-dev-only-2026
```

- [ ] **Step 2: 从 wrangler.toml 删除 JWT_SECRET**

当前 `wrangler.toml:7` 的 `[vars]` 段：

```toml
[vars]
JWT_SECRET = "alumni-book-jwt-secret-change-me-2026"
CORS_ORIGIN = "https://flashnovayu.github.io"
```

改为：

```toml
[vars]
CORS_ORIGIN = "https://flashnovayu.github.io"
```

只删 `JWT_SECRET`，保留 `CORS_ORIGIN`。

- [ ] **Step 3: 确认 .gitignore 已有 .dev.vars**

`packages/workers/api/.gitignore` 或根 `.gitignore` 中应包含 `.dev.vars`。当前根 `.gitignore` 有 `.env` 和 `.env.local` 但不包含 `.dev.vars`。在根 `.gitignore` 中添加：

```
.dev.vars
```

- [ ] **Step 4: 验证本地 dev**

```bash
pnpm --filter worker dev
# 确认 Worker 启动正常，JWT 中间件从 c.env.JWT_SECRET 读取成功
```

- [ ] **Step 5: 推送 secret 到 Cloudflare**

```bash
wrangler secret put JWT_SECRET
# 输入生产环境 secret（生成一个强随机字符串，例如 openssl rand -hex 32）
```

---

### Task 2: 密码哈希升级到 PBKDF2

**Files:**
- Modify: `workers/api/src/routes/auth.ts:111-121` (hashPassword 和 verifyPassword 函数)

**Steps:**

- [ ] **Step 1: 重写 hashPassword**

将单次 SHA-256 替换为 PBKDF2 + salt + 10 万次迭代：

```ts
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: 100_000,
    },
    key,
    256
  )
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)))
  const saltStr = btoa(String.fromCharCode(...salt))
  return `pbkdf2:${saltStr}:${hash}`
}
```

- [ ] **Step 2: 重写 verifyPassword**

```ts
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('pbkdf2:')) {
    // 新格式: pbkdf2:salt:hash
    const [, saltStr, hash] = storedHash.split(':')
    const encoder = new TextEncoder()
    const salt = Uint8Array.from(atob(saltStr), c => c.charCodeAt(0))
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt,
        iterations: 100_000,
      },
      key,
      256
    )
    const computedHash = btoa(String.fromCharCode(...new Uint8Array(bits)))
    return computedHash === hash
  }
  // 旧格式不兼容，直接拒绝（触发首次登录 admin888 分支重新设置密码）
  return false
}
```

- [ ] **Step 3: 处理默认密码分支**

`auth.ts:52-61` 当前的首次登录逻辑：密码匹配 `admin888` 时自动存储哈希。保持不变——PBKDF2 生成的新哈希存储后，后续登录走 PBKDF2 验证。

- [ ] **Step 4: 清理旧会话**

部署后旧哈希的 session token 仍然有效但密码已不可验证。建议在部署后手动清理 `admin_sessions` 表：

```sql
DELETE FROM admin_sessions;
DELETE FROM site_config WHERE key = 'admin_password';
```

这样所有管理员首次登录都用 `admin888` 重新走 PBKDF2 流程。

---

### Task 3: 验证部署

**Steps:**

- [ ] **Step 1: 本地验证**

```bash
# 启动本地 Worker
pnpm --filter worker dev

# 测试登录
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "admin888"}'
# 应返回 token

# 验证 token 可用
curl http://localhost:8787/api/admin/stats \
  -H "Authorization: Bearer <token>"
# 应返回统计数据
```

- [ ] **Step 2: 部署到生产**

```bash
pnpm --filter worker deploy
```

- [ ] **Step 3: 生产验证**

```bash
curl -X POST https://alumni-book-api.chenyuhao2263.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "admin888"}'
# 确认返回 token，且 password hash 以 pbkdf2: 开头存储
```

---

## 完成标准

- [ ] `JWT_SECRET` 不在 `wrangler.toml` 中
- [ ] `.dev.vars` 包含本地 JWT_SECRET，不提交到 Git
- [ ] 生产环境通过 `wrangler secret put` 设置 JWT_SECRET
- [ ] 密码哈希使用 PBKDF2（10 万迭代 + random salt）
- [ ] 管理员能用 admin888 登录成功
- [ ] 生产 Worker API 正常运行
