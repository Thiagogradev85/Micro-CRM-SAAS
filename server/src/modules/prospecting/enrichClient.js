import { searchWeb } from './serper.js'

// ── Helpers de extração ───────────────────────────────────────────────────────

function extractInstagram(text) {
  // URL completa: instagram.com/handle  ou  instagr.am/handle
  const urlMatch = text.match(/(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_.]{2,30})(?:[/?#]|$)/i)
  if (urlMatch) return urlMatch[1]
  // @handle explícito
  const atMatch = text.match(/@([A-Za-z0-9_.]{2,30})/)
  if (atMatch) return atMatch[1]
  return null
}

function extractFacebook(text) {
  const match = text.match(/(?:facebook\.com|fb\.com)\/(?:pages\/[^/?#]+\/)?([A-Za-z0-9._-]{3,60})(?:[/?#]|$)/i)
  if (!match) return null
  const slug = match[1]
  // Ignora segmentos genéricos
  if (['share', 'sharer', 'permalink', 'photo', 'video', 'groups', 'events'].includes(slug.toLowerCase())) return null
  return slug
}

function extractEmail(text) {
  const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  if (!match) return null
  const email = match[1].toLowerCase()
  // Ignora endereços genéricos de plataformas
  const blocked = ['noreply', 'no-reply', 'mailer', 'bounce', 'example', 'sentry']
  if (blocked.some(b => email.includes(b))) return null
  return email
}

function extractPhone(text) {
  // Números brasileiros: (DD) 9xxxx-xxxx | (DD) xxxx-xxxx | +55 variações
  const matches = text.match(/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)(?:9\s?\d{4}|\d{4})[\s-]?\d{4}/g)
  if (!matches) return null
  // Limpa e filtra por tamanho válido (10 ou 11 dígitos)
  for (const raw of matches) {
    const digits = raw.replace(/\D/g, '').replace(/^55/, '')
    if (digits.length === 10 || digits.length === 11) return digits
  }
  return null
}

// ── Enriquecedor principal ────────────────────────────────────────────────────

/**
 * Busca dados de contato faltantes para um cliente usando Serper Web Search.
 * Extração feita por parsing de URLs e regex — sem dependência de IA.
 *
 * @param {{ id, nome, cidade, uf, whatsapp, telefone, email, instagram, facebook }} client
 * @returns {{ instagram?, facebook?, email?, whatsapp?, telefone? }}
 */
export async function enrichClient(client) {
  const query = [client.nome, client.cidade, client.uf, 'instagram email contato'].filter(Boolean).join(' ')

  const { organic } = await searchWeb(query)
  if (!organic.length) return {}

  let instagram = null
  let facebook  = null
  let email     = null
  let phone     = null   // será dividido em whatsapp/telefone abaixo

  for (const result of organic.slice(0, 10)) {
    const texts = [
      result.link    || '',
      result.title   || '',
      result.snippet || '',
      ...(result.sitelinks || []).map(s => `${s.title || ''} ${s.link || ''}`),
    ].join(' ')

    if (!instagram) instagram = extractInstagram(texts)
    if (!facebook)  facebook  = extractFacebook(texts)
    if (!email)     email     = extractEmail(texts)
    if (!phone)     phone     = extractPhone(texts)

    // Para assim que encontrar tudo
    if (instagram && facebook && email && phone) break
  }

  const result = {}

  if (instagram && !client.instagram) result.instagram = instagram
  if (facebook  && !client.facebook)  result.facebook  = facebook
  if (email     && !client.email)     result.email     = email

  if (phone && phone.length === 11 && phone[2] === '9' && !client.whatsapp) {
    result.whatsapp = phone
  } else if (phone && phone.length === 10 && !client.telefone) {
    result.telefone = phone
  } else if (phone && !client.whatsapp && !client.telefone) {
    result.whatsapp = phone
  }

  return result
}
