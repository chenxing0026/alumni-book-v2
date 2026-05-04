import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

export const albumsRoutes = new Hono<{ Bindings: Bindings }>()

// 创建相册
albumsRoutes.post('/albums', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()

  if (!body.title) {
    return c.json({ success: false, message: '相册名称必填' }, 400)
  }

  const id = `album_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  await db.prepare(
    'INSERT INTO albums (id, title, description, frame_style) VALUES (?, ?, ?, ?)'
  ).bind(id, body.title, body.description || '', body.frameStyle || 'none').run()

  return c.json({ success: true, data: { id } })
})

// 更新相册
albumsRoutes.put('/albums/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const body = await c.req.json()

  const fields: string[] = []
  const values: any[] = []

  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title) }
  if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description) }
  if (body.frameStyle !== undefined) { fields.push('frame_style = ?'); values.push(body.frameStyle) }
  if (body.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(body.sortOrder) }

  if (fields.length === 0) {
    return c.json({ success: false, message: '没有要更新的字段' }, 400)
  }

  values.push(id)
  await db.prepare(`UPDATE albums SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()

  return c.json({ success: true, message: '更新成功' })
})

// 删除相册
albumsRoutes.delete('/albums/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB

  await db.prepare('DELETE FROM photos WHERE album_id = ?').bind(id).run()
  await db.prepare('DELETE FROM albums WHERE id = ?').bind(id).run()

  return c.json({ success: true, message: '删除成功' })
})
