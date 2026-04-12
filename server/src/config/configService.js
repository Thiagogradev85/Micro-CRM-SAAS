/**
 * ConfigService
 * Carrega configurações do banco (tabela settings) e aplica em process.env.
 * Isso permite configurar chaves de API via UI sem precisar do painel do Render.
 *
 * Prioridade: process.env (Render env vars) > banco de dados (UI settings)
 * Ou seja: se a chave já existir no process.env, o valor do banco NÃO sobrescreve.
 */

import db from '../db/db.js'

// Chaves que podem ser gerenciadas via UI
export const MANAGED_KEYS = [
  'ANTHROPIC_API_KEY',
  'SERPER_API_KEY',
  'SERPAPI_KEY',
  'GOOGLE_CSE_KEY',
  'GOOGLE_CSE_CX',
  'BRAVE_SEARCH_KEY',
  'BING_SEARCH_KEY',
  'ENRICH_SEGMENT',
  'SETTINGS_PASSWORD',
]

/**
 * Executa na inicialização do servidor.
 * Para cada chave gerenciável, se ela não estiver em process.env, busca do banco.
 */
export async function loadConfigFromDb() {
  try {
    const { rows } = await db.query(
      `SELECT key, value FROM settings WHERE key = ANY($1)`,
      [MANAGED_KEYS]
    )
    let loaded = 0
    for (const { key, value } of rows) {
      if (!process.env[key] && value) {
        process.env[key] = value
        loaded++
      }
    }
    if (loaded > 0) {
      console.log(`[ConfigService] ${loaded} chave(s) carregada(s) do banco.`)
    }
  } catch (err) {
    // Banco pode não ter a tabela ainda (primeira execução antes da migration)
    console.warn('[ConfigService] Aviso ao carregar config do banco:', err.message)
  }
}

/** Salva ou atualiza um valor no banco E em process.env imediatamente. */
export async function setConfig(key, value) {
  const trimmed = value ? String(value).trim() : ''
  await db.query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, trimmed]
  )
  // Atualiza process.env se há valor novo.
  // Ao limpar (valor vazio), NÃO deleta process.env para preservar variáveis
  // que vieram do Render ou do arquivo .env — elas continuam ativas.
  if (trimmed) {
    process.env[key] = trimmed
  }
}

/** Retorna todos os valores gerenciados (mascarando secrets). */
export async function getAllConfig() {
  const { rows } = await db.query(`SELECT key, value, updated_at FROM settings`)
  const map = Object.fromEntries(rows.map(r => [r.key, { value: r.value, updated_at: r.updated_at }]))

  return MANAGED_KEYS.map(key => {
    const fromDb = map[key]
    const fromEnv = process.env[key]
    const rawValue = fromDb?.value || fromEnv || ''
    return {
      key,
      configured: !!rawValue,
      // Mascara o valor: mostra os primeiros 4 chars + ***
      masked: rawValue ? rawValue.slice(0, 4) + '•••••••••••' : '',
      source: fromEnv && fromDb?.value ? 'env+db' : fromEnv ? 'env' : fromDb?.value ? 'db' : 'none',
      updated_at: fromDb?.updated_at ?? null,
    }
  })
}

/** Verifica a senha de admin para acesso às configurações. */
export async function verifySettingsPassword(password) {
  const { rows } = await db.query(
    `SELECT value FROM settings WHERE key = 'SETTINGS_PASSWORD'`
  )
  const stored = rows[0]?.value ?? 'admin1234'
  return password === stored
}
