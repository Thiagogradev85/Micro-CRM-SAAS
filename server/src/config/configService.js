/**
 * ConfigService
 * Gerencia chaves de API com dois níveis:
 *   1. user_settings (por usuário) — override individual
 *   2. settings (global/admin) — padrão da plataforma
 *   3. process.env — fallback final (Render / .env)
 *
 * Prioridade: user_settings > settings (global) > process.env
 */

import db from '../db/db.js'

// Chaves visíveis e editáveis por qualquer usuário (próprias + fallback global)
export const MANAGED_KEYS = [
  'ANTHROPIC_API_KEY',
  'SERPER_API_KEY',
  'SERPAPI_KEY',
  'GOOGLE_CSE_KEY',
  'GOOGLE_CSE_CX',
  'BRAVE_SEARCH_KEY',
  'BING_SEARCH_KEY',
  'ENRICH_SEGMENT',
]

// Chaves exclusivamente globais — só o admin vê e edita
export const ADMIN_ONLY_KEYS = ['DATABASE_URL']

/**
 * Executa na inicialização: carrega settings globais em process.env.
 * (Valores por usuário são resolvidos em tempo de request — não vão pro process.env)
 */
export async function loadConfigFromDb() {
  try {
    const { rows } = await db.query(
      `SELECT key, value FROM settings WHERE key = ANY($1)`,
      [MANAGED_KEYS]
    )
    let loaded = 0
    for (const { key, value } of rows) {
      if (value) {
        process.env[key] = value
        loaded++
      }
    }
    if (loaded > 0) {
      console.log(`[ConfigService] ${loaded} chave(s) global(is) carregada(s) do banco.`)
    }
  } catch (err) {
    console.warn('[ConfigService] Aviso ao carregar config do banco:', err.message)
  }
}

/**
 * Retorna o valor efetivo de uma chave para um usuário específico.
 * Ordem: user_settings[userId] → settings (global) → process.env
 */
export async function getEffectiveKey(userId, key) {
  // 1. Tenta setting do próprio usuário
  if (userId) {
    const { rows } = await db.query(
      `SELECT value FROM user_settings WHERE user_id = $1 AND key = $2`,
      [userId, key]
    )
    if (rows[0]?.value) return rows[0].value
  }

  // 2. Fallback para global (admin)
  const { rows: globalRows } = await db.query(
    `SELECT value FROM settings WHERE key = $1`,
    [key]
  )
  if (globalRows[0]?.value) return globalRows[0].value

  // 3. Fallback para process.env
  return process.env[key] || ''
}

/**
 * Retorna um objeto com todas as chaves efetivas para o usuário.
 * Conveniente para passar de uma vez aos módulos de prospecção.
 */
export async function getEffectiveKeys(userId) {
  const result = {}
  await Promise.all(
    MANAGED_KEYS.map(async key => {
      result[key] = await getEffectiveKey(userId, key)
    })
  )
  return result
}

/**
 * Salva ou atualiza uma chave global (admin).
 * Também aplica imediatamente em process.env.
 */
export async function setConfig(key, value) {
  const trimmed = value ? String(value).trim() : ''
  await db.query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, trimmed]
  )
  if (trimmed) process.env[key] = trimmed
}

/**
 * Salva ou atualiza uma chave do usuário em user_settings.
 * Valor vazio = deleta o override (volta ao global).
 */
export async function setUserConfig(userId, key, value) {
  const trimmed = value ? String(value).trim() : ''
  if (!trimmed) {
    await db.query(
      `DELETE FROM user_settings WHERE user_id = $1 AND key = $2`,
      [userId, key]
    )
  } else {
    await db.query(
      `INSERT INTO user_settings (user_id, key, value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [userId, key, trimmed]
    )
  }
}

/**
 * Retorna configurações mascaradas para a UI.
 * Admin: vê globais + próprios overrides.
 * Usuário: vê seus overrides + indica se há fallback global disponível.
 */
export async function getUserConfig(userId, isAdmin = false) {
  // Admin vê chaves gerais + exclusivas de admin
  const keysToShow = isAdmin ? [...MANAGED_KEYS, ...ADMIN_ONLY_KEYS] : MANAGED_KEYS

  // Busca settings globais
  const { rows: globalRows } = await db.query(
    `SELECT key, value, updated_at FROM settings WHERE key = ANY($1)`,
    [keysToShow]
  )
  const globalMap = Object.fromEntries(globalRows.map(r => [r.key, r]))

  // Busca settings do usuário
  const { rows: userRows } = await db.query(
    `SELECT key, value, updated_at FROM user_settings WHERE user_id = $1 AND key = ANY($2)`,
    [userId, MANAGED_KEYS]
  )
  const userMap = Object.fromEntries(userRows.map(r => [r.key, r]))

  return keysToShow.map(key => {
    const isAdminOnly = ADMIN_ONLY_KEYS.includes(key)
    const userEntry   = isAdminOnly ? null : userMap[key]
    const globalEntry = globalMap[key]
    const envValue    = process.env[key] || ''

    const userValue   = userEntry?.value || ''
    const globalValue = globalEntry?.value || envValue

    const effective = userValue || globalValue

    return {
      key,
      configured:        !!effective,
      masked:            effective ? effective.slice(0, 4) + '•••••••••••' : '',
      source:            userValue ? 'user' : globalValue ? 'global' : 'none',
      hasGlobalFallback: !userValue && !!globalValue,
      adminOnly:         isAdminOnly,
      updated_at:        userEntry?.updated_at ?? globalEntry?.updated_at ?? null,
    }
  })
}

/** Retorna configurações globais mascaradas (admin view). */
export async function getAllConfig() {
  return getUserConfig(null, true)
}
