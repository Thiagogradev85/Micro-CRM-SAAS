/**
 * Parses a Brazilian address string returned by Serper/Google Maps
 * into structured fields matching the clients table schema.
 *
 * Expected formats:
 *  "R. XV de Novembro, 123 - Centro, Curitiba - PR, 80020-310, Brazil"
 *  "Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100, Brazil"
 *  "Rua das Flores, 45, Joinville - SC, 89201-000"
 */
export function parseAddress(raw) {
  if (!raw) return {}

  // Remove trailing ", Brazil" / ", Brasil"
  const clean = raw.replace(/,?\s*(Brazil|Brasil)\s*$/i, '').trim()

  // Extract CEP (00000-000)
  const cepMatch = clean.match(/\b(\d{5}-\d{3})\b/)
  const cep = cepMatch ? cepMatch[1] : null

  // Extract UF — last 2-letter uppercase state code before CEP or end
  // Pattern: "Cidade - UF" or "Cidade - UF, CEP"
  const ufMatch = clean.match(/[-–]\s*([A-Z]{2})(?:\s*,|\s*$)/)
  const uf = ufMatch ? ufMatch[1] : null

  // Extract city — text between last comma and the "- UF" block
  let cidade = null
  if (uf) {
    const ufBlock = `- ${uf}`
    const ufIdx = clean.lastIndexOf(ufBlock)
    if (ufIdx > 0) {
      const beforeUF = clean.slice(0, ufIdx).trim()
      const lastComma = beforeUF.lastIndexOf(',')
      cidade = lastComma >= 0
        ? beforeUF.slice(lastComma + 1).trim()
        : beforeUF.trim()
    }
  }

  // Extract logradouro — everything up to the first " - " separator or CEP block
  let logradouro = null
  const dashIdx = clean.indexOf(' - ')
  if (dashIdx > 0) {
    logradouro = clean.slice(0, dashIdx).trim()
  }

  return { logradouro, cidade, uf, cep }
}

/**
 * Cleans a phone number returned by Serper to digits only.
 * Strips DDI +55 prefix when present.
 */
export function parsePhone(raw) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  // Remove leading country code 55 if total length > 11
  return digits.startsWith('55') && digits.length > 11
    ? digits.slice(2)
    : digits || null
}
