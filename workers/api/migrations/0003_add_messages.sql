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
