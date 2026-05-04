-- Migration 0001: 初始化数据库

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_owner INTEGER DEFAULT 0,
  avatar_url TEXT,
  music_url TEXT,
  music_title TEXT,
  music_autoplay INTEGER DEFAULT 0,
  background_url TEXT,
  background_color TEXT,
  info TEXT DEFAULT '{}',
  photos TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  frame_style TEXT DEFAULT 'none',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  caption TEXT DEFAULT '',
  r2_key TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
