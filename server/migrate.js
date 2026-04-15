#!/usr/bin/env bun
/**
 * Migration runner — executa arquivos SQL em server/migrations/ em ordem.
 *
 * Uso:
 *   bun migrate.js              — roda todas as migrations pendentes
 *   bun migrate.js 017          — roda apenas a migration que começa com "017"
 *   bun migrate.js --list       — lista migrations e status
 */

import { readdir, readFile } from 'fs/promises'
import { join, dirname }     from 'path'
import { fileURLToPath }     from 'url'
import pg                    from 'pg'

const { Pool } = pg
const __dir    = dirname(fileURLToPath(import.meta.url))

// Carrega DATABASE_URL do .env local (sem depender do dotenv do app)
const envPath = join(__dir, '.env')
const envText = await readFile(envPath, 'utf8').catch(() => '')
for (const line of envText.split('\n')) {
  const [k, ...rest] = line.trim().split('=')
  if (k && rest.length && !process.env[k]) {
    process.env[k] = rest.join('=').replace(/^["']|["']$/g, '')
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Garante tabela de controle
await pool.query(`
  CREATE TABLE IF NOT EXISTS _migrations (
    filename   TEXT        PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)

const migrDir = join(__dir, 'migrations')
const files   = (await readdir(migrDir))
  .filter(f => f.endsWith('.sql'))
  .sort()

const { rows: applied } = await pool.query('SELECT filename FROM _migrations')
const appliedSet = new Set(applied.map(r => r.filename))

// ── args ──────────────────────────────────────────────────────────────────────
const arg = process.argv[2]

if (arg === '--list') {
  console.log('\nMigrations:\n')
  for (const f of files) {
    const status = appliedSet.has(f) ? '✅ aplicada' : '⏳ pendente'
    console.log(`  ${status}  ${f}`)
  }
  console.log()
  await pool.end()
  process.exit(0)
}

const targets = arg
  ? files.filter(f => f.startsWith(arg))
  : files.filter(f => !appliedSet.has(f))

if (targets.length === 0) {
  console.log('Nenhuma migration pendente.')
  await pool.end()
  process.exit(0)
}

for (const file of targets) {
  if (appliedSet.has(file) && arg) {
    console.log(`⚠️  ${file} já foi aplicada — pulando. Use --force para re-aplicar.`)
    continue
  }
  const sql = await readFile(join(migrDir, file), 'utf8')
  console.log(`\n▶  Aplicando ${file}...`)
  try {
    await pool.query(sql)
    await pool.query('INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file])
    console.log(`✅  ${file} concluída.`)
  } catch (err) {
    console.error(`❌  Erro em ${file}:\n${err.message}`)
    await pool.end()
    process.exit(1)
  }
}

console.log('\nDone.\n')
await pool.end()
