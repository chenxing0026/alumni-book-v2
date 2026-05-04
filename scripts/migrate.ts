/**
 * 同学录 v10 → v2 数据迁移脚本
 *
 * 使用方法:
 *   npx tsx scripts/migrate.ts
 *
 * 需要环境变量:
 *   CLOUDFLARE_D1_DATABASE_ID
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const OLD_PROJECT = resolve(__dirname, '../alumni-book-v10-master')

interface OldStudent {
  id: string
  name: string
  slug: string
  isOwner?: boolean
  avatar?: string
  music?: {
    enabled: boolean
    src: string
    title: string
    autoplay: boolean
    loop: boolean
  }
  background?: {
    type: string
    src: string
    color: string
  }
  stickers?: any[]
  photos?: any[]
  info: Record<string, string>
}

interface OldSiteConfig {
  particles: Record<string, any>
  footer: { copyright: string; beian: string; beianUrl: string }
  preface: { title: string; subtitle: string; content: string }
  acknowledgments: Array<{ name: string; role: string; tip: string; avatar?: string }>
  typography: { fontFamily: string; fontSize: string }
}

function loadJson<T>(path: string): T | null {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function generateId(): string {
  return `stu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

async function migrate() {
  console.log('=== 同学录 v10 → v2 数据迁移 ===\n')

  // 1. 加载旧数据
  const studentsPath = resolve(OLD_PROJECT, 'data/students.json')
  const configPath = resolve(OLD_PROJECT, 'data/site_config.json')

  const studentsData = loadJson<{ students: OldStudent[] }>(studentsPath)
  const configData = loadJson<OldSiteConfig>(configPath)

  if (!studentsData) {
    console.error('找不到 students.json')
    process.exit(1)
  }

  // 2. 生成 SQL
  const sqlStatements: string[] = []

  // 迁移学生数据
  console.log(`找到 ${studentsData.students.length} 个学生`)
  for (const student of studentsData.students) {
    const id = student.id || generateId()
    const info = JSON.stringify(student.info || {})
    const photos = JSON.stringify(student.photos || [])

    sqlStatements.push(`INSERT OR IGNORE INTO students (id, name, slug, is_owner, avatar_url, music_url, music_title, music_autoplay, background_url, background_color, info, photos) VALUES (${esc(id)}, ${esc(student.name)}, ${esc(student.slug)}, ${student.isOwner ? 1 : 0}, ${esc(student.avatar || null)}, ${esc(student.music?.src || null)}, ${esc(student.music?.title || null)}, ${student.music?.autoplay ? 1 : 0}, ${esc(student.background?.src || null)}, ${esc(student.background?.color || null)}, ${esc(info)}, ${esc(photos)});`)

    console.log(`  - ${student.name} (${student.slug})`)
  }

  // 迁移站点配置
  if (configData) {
    console.log('\n迁移站点配置...')
    const configEntries: [string, any][] = [
      ['particles', configData.particles],
      ['footer', configData.footer],
      ['preface', configData.preface],
      ['acknowledgments', configData.acknowledgments],
      ['typography', configData.typography],
    ]

    for (const [key, value] of configEntries) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      sqlStatements.push(`INSERT OR REPLACE INTO site_config (key, value) VALUES (${esc(key)}, ${esc(serialized)});`)
      console.log(`  - ${key}`)
    }
  }

  // 3. 输出 SQL
  const outputPath = resolve(__dirname, 'migration.sql')
  const { writeFileSync } = await import('fs')
  writeFileSync(outputPath, sqlStatements.join('\n'), 'utf-8')

  console.log(`\n迁移 SQL 已生成: ${outputPath}`)
  console.log(`共 ${sqlStatements.length} 条 SQL 语句`)
  console.log('\n执行迁移:')
  console.log('  npx wrangler d1 execute alumni-book-db --file=scripts/migration.sql')
  console.log('\n注意: 图片文件需要手动上传到 R2 存储桶')
}

function esc(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'NULL'
  return "'" + value.replace(/'/g, "''") + "'"
}

migrate().catch(console.error)
