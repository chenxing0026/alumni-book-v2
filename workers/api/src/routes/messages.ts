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

// 管理员获取所有留言
messagesRoutes.get('/admin/messages', async (c) => {
  const db = c.env.DB
  const slug = c.req.query('slug')
  const approved = c.req.query('approved')

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

// 删除留言
messagesRoutes.delete('/admin/messages/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  await db.prepare('DELETE FROM messages WHERE id = ?').bind(id).run()
  return c.json({ success: true, message: '已删除' })
})
