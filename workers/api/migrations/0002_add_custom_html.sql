-- Migration 0002: 添加 custom_html 列支持专属模板

ALTER TABLE students ADD COLUMN custom_html TEXT;
