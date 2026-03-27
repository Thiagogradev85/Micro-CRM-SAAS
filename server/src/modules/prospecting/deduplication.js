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
 *  2. Normalized name starts-with or is contained in existing name
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
      if (pName && e.normalizedName && (
        e.normalizedName.includes(pName) || pName.includes(e.normalizedName)
      )) return true
      return false
    })

    if (isDuplicate) duplicates.push({ ...prospect, _duplicate: true })
    else unique.push(prospect)
  }

  return { unique, duplicates }
}
