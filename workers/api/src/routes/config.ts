import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

export const configRoutes = new Hono<{ Bindings: Bindings }>()

// 更新配置
configRoutes.put('/config', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()

  const entries = Object.entries(body)
  for (const [key, value] of entries) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    await db.prepare(
      'INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)'
    ).bind(key, serialized).run()
  }

  return c.json({ success: true, message: '配置已更新' })
})
