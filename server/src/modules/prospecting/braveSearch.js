/**
 * Brave Web Search API — fallback gratuito ao Serper.
 *
 * Plano: pago — $5/mês inclui ~1.000 buscas ($5,00 por 1.000 requests).
 * Cadastro: api.search.brave.com
 * Configuração: BRAVE_SEARCH_KEY no .env
 *
 * Retorna o mesmo shape que searchWeb() do serper.js:
 *   { organic: [{ link, title, snippet }], knowledgeGraph: null, localResults: [] }
 *
 * Retorna null se não configurado ou se ocorrer erro.
 */

const BRAVE_URL = 'https://api.search.brave.com/res/v1/web/search'

export async function searchWebBrave(query) {
  const key = process.env.BRAVE_SEARCH_KEY
  if (!key) return null  // não configurado

  const params = new URLSearchParams({ q: query, country: 'br', search_lang: 'pt', count: '10' })

  let response
  try {
    response = await fetch(`${BRAVE_URL}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': key,
      },
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    return null  // timeout ou erro de rede
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    console.warn(`[Brave] ${response.status} query="${query}":`, body?.message || '')
    return null
  }

  const data  = await response.json()
  const items = data.web?.results || []

  const organic = items.map(item => ({
    link:    item.url         || '',
    title:   item.title       || '',
    snippet: item.description || '',
  }))

  console.log(`[Brave] ${organic.length} resultados para "${query}"`)
  return { organic, knowledgeGraph: null, localResults: [] }
}
