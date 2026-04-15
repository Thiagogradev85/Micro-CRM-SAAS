/**
 * Google Custom Search JSON API — fallback gratuito ao Serper.
 *
 * Plano gratuito: 100 consultas/dia.
 * Configuração: GOOGLE_CSE_KEY (API key) + GOOGLE_CSE_CX (Search Engine ID).
 *
 * Como criar:
 *  1. console.cloud.google.com → Ativar "Custom Search API"
 *  2. Criar credencial → API Key → copiar para GOOGLE_CSE_KEY
 *  3. cse.google.com → Criar buscador → "Pesquisar na web inteira" → copiar CX para GOOGLE_CSE_CX
 *
 * Retorna o mesmo shape que searchWeb() do serper.js:
 *   { organic: [{ link, title, snippet }], knowledgeGraph: null, localResults: [] }
 *
 * Retorna null se não configurado ou se ocorrer erro (permite fallback silencioso).
 */

const CSE_URL = 'https://www.googleapis.com/customsearch/v1'

export async function searchWebCse(query, apiKeys = {}) {
  const key = apiKeys.GOOGLE_CSE_KEY ?? process.env.GOOGLE_CSE_KEY
  const cx  = apiKeys.GOOGLE_CSE_CX  ?? process.env.GOOGLE_CSE_CX
  if (!key || !cx) return null  // não configurado — chamador trata silenciosamente

  const params = new URLSearchParams({ key, cx, q: query, gl: 'br', hl: 'pt', num: '10' })

  let response
  try {
    response = await fetch(`${CSE_URL}?${params}`, { signal: AbortSignal.timeout(8000) })
  } catch {
    return null  // timeout ou erro de rede
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg  = (body?.error?.message || body?.error?.status || '').toLowerCase()
    console.warn(`[GoogleCSE] ${response.status} query="${query}": ${msg}`)
    return null
  }

  const data  = await response.json()
  const items = data.items || []

  const organic = items.map(item => ({
    link:    item.link    || '',
    title:   item.title   || '',
    snippet: item.snippet || '',
  }))

  console.log(`[GoogleCSE] ${organic.length} resultados para "${query}"`)
  return { organic, knowledgeGraph: null, localResults: [] }
}
