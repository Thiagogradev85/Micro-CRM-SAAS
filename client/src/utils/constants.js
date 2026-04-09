export const NOTAS = {
  1: { label: 'Fraco',     color: 'text-red-400' },
  2: { label: 'Médio',     color: 'text-yellow-400' },
  3: { label: 'Excelente', color: 'text-green-400' },
}

export const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO'
]

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// Retorna true se o número (apenas dígitos, sem DDI) parece ser celular brasileiro
// Celular BR: DDD (2 dígitos) + 9 inicial + 8 dígitos = 11 dígitos
//             ou DDD (2 dígitos) + 8 dígitos = 10 dígitos (antigo, menos comum)
// Fixo BR:    DDD (2 dígitos) + 8 dígitos iniciando em 2-5 = 10 dígitos
export function isCelular(digits) {
  if (!digits) return false
  // Remove DDI 55 se presente
  const local = digits.startsWith('55') && digits.length > 11
    ? digits.slice(2)
    : digits
  if (local.length === 11 && local[2] === '9') return true   // 9XXXX-XXXX (atual)
  if (local.length === 10 && ['6','7','8','9'].includes(local[2])) return true // antigo
  return false
}

// Formata número para link wa.me — só gera link se for celular
// Gera link do Instagram (aceita @usuario, usuario ou URL completa)
export function instagramLink(raw) {
  if (!raw) return null
  const handle = socialHandle(raw)
  if (!handle) return null
  return `https://instagram.com/${handle}`
}

export function facebookLink(raw) {
  if (!raw) return null
  const handle = socialHandle(raw)
  if (!handle) return null
  return `https://facebook.com/${handle}`
}

/**
 * Extrai só o handle/slug de uma URL de rede social para exibição.
 * Ex: "https://instagram.com/bikeloja?utm_source=..." → "@bikeloja"
 *     "https://facebook.com/bikeloja"                → "bikeloja"
 *     "@bikeloja"                                     → "@bikeloja"
 *     "bikeloja"                                      → "bikeloja"
 */
export function socialHandle(raw, prefix = '') {
  if (!raw) return ''
  const s = String(raw).trim()
  if (!s) return ''
  if (s.startsWith('http')) {
    try {
      const path = new URL(s).pathname.replace(/^\//, '').split('/')[0].split('?')[0]
      if (path) return `${prefix}${path}`
    } catch { /* URL inválida — cai no fallback */ }
  }
  return `${prefix}${s.replace(/^@/, '')}`
}

export function twitterLink(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null
  if (s.startsWith('http')) return s
  const username = s.replace(/^@/, '')
  return `https://x.com/${username}`
}

export function linkedinLink(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null
  if (s.startsWith('http')) return s
  return `https://linkedin.com/company/${s.replace(/^\//, '')}`
}

// Remove DDI 55 do início se presente — normaliza para DDD + número (10-11 dígitos)
// Ex: "5551936329332" → "51936329332" | "51936329332" → "51936329332"
export function normalizePhone(raw) {
  if (!raw) return raw
  let digits = String(raw).replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2)
  return digits || raw
}

export function whatsappLink(raw) {
  if (!raw) return null
  const digits = normalizePhone(raw)
  if (!digits) return null
  return `https://wa.me/55${digits}`
}

export function statusPill(cor) {
  return {
    backgroundColor: cor || '#6b7280',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  }
}

// ── BroadcastChannel — sincroniza abas após mutações de clientes ─────────────
export function broadcastClient(type, id) {
  try {
    const ch = new BroadcastChannel('crm_clients')
    ch.postMessage({ type, id: typeof id === 'number' ? id : parseInt(id) })
    ch.close()
  } catch { /* navegadores sem suporte a BroadcastChannel */ }
}

