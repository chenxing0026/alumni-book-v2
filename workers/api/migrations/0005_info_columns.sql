-- Migration 0005: 提升高频 info 字段为独立列

ALTER TABLE students ADD COLUMN mbti TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN graduation_year TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN school TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN class_name TEXT DEFAULT '';
