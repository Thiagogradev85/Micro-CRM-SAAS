import db from '../../db/db.js'

/**
 * Normalizes a string for fuzzy comparison:
 * lowercase, remove accents, strip non-alphanumeric.
 */
function normalize(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

/**
 * Jaccard similarity over significant words (>= 3 chars).
 * Returns 0–1. Ignores common filler words.
 */
const STOPWORDS = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'em', 'com', 'para', 'por', 'ltd', 'ltda', 'me', 'eireli', 'epp', 'sa', 'ss'])

function wordSimilarity(a, b) {
  const words = str => new Set(
    str.split(/\s+/).filter(w => w.length >= 3 && !STOPWORDS.has(w))
  )
  const wa = words(a)
  const wb = words(b)
  if (wa.size === 0 || wb.size === 0) return 0

  let intersection = 0
  for (const w of wa) {
    if (wb.has(w)) intersection++
  }
  const union = wa.size + wb.size - intersection
  return intersection / union
}

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

/**
 * Returns true if two normalized names are considered similar enough
 * to be the same business.
 *
 * Criteria (any match = duplicate):
 *  1. One name is a substring of the other
 *  2. Jaccard word similarity >= 0.6 (60% of significant words overlap)
 *  3. For short names (< 30 chars): edit distance <= 20% of the longer name's length
 */
function nameSimilar(a, b) {
  if (!a || !b) return false

  // 1. Substring check (handles "Farmácia X" ↔ "Farmácia X Ltda")
  if (a.includes(b) || b.includes(a)) return true

  // 2. Word-level Jaccard similarity
  if (wordSimilarity(a, b) >= 0.6) return true

  // 3. Edit distance for reasonably short names
  const maxLen = Math.max(a.length, b.length)
  if (maxLen <= 40) {
    const dist = levenshtein(a, b)
    if (dist / maxLen <= 0.2) return true
  }

  return false
}

/**
 * Loads existing clients from the DB for deduplication.
 * Returns lightweight objects: { normalizedName, phone }
 */
async function loadExistingClients() {
  const { rows } = await db.query(
    `SELECT nome, whatsapp, telefone FROM clients WHERE ativo = true`
  )
  return rows.map(r => ({
    normalizedName: normalize(r.nome),
    phone: (r.whatsapp || r.telefone || '').replace(/\D/g, ''),
  }))
}

/**
 * Filters out prospects that already exist in the DB.
 * Deduplication criteria (any match = duplicate):
 *  1. Phone digits match (when both have a phone)
 *  2. Fuzzy name similarity (substring, word overlap, or edit distance)
 *
 * @param {object[]} prospects - Array of structured prospect objects
 * @returns {{ unique: object[], duplicates: object[] }}
 */
export async function filterExisting(prospects) {
  const existing = await loadExistingClients()

  const unique = []
  const duplicates = []

  for (const prospect of prospects) {
    const pName  = normalize(prospect.nome)
    const pPhone = (prospect.telefone || '').replace(/\D/g, '')

    const isDuplicate = existing.some(e => {
      if (pPhone && e.phone && pPhone === e.phone) return true
      if (nameSimilar(pName, e.normalizedName)) return true
      return false
    })

    if (isDuplicate) duplicates.push({ ...prospect, _duplicate: true })
    else unique.push(prospect)
  }

  return { unique, duplicates }
}
