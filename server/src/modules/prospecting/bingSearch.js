/**
 * Bing Web Search API — fallback gratuito ao Serper.
 *
 * Plano gratuito (F1): 1.000 buscas/mês, sem cartão de crédito.
 * Configuração: BING_SEARCH_KEY no .env
 *
 * Como criar:
 *  1. portal.azure.com → criar conta (grátis)
 *  2. Pesquise "Bing Search" → "Bing Search v7" → Criar
 *  3. Selecione o nível de preço "F1 (Free)" → Criar
 *  4. Vá em "Chaves e Ponto de Extremidade" → copie a Chave 1 → BING_SEARCH_KEY
 *
 * Retorna o mesmo shape que searchWeb() do serper.js:
 *   { organic: [{ link, title, snippet }], knowledgeGraph: null, localResults: [] }
 *
 * Retorna null se não configurado ou se ocorrer erro.
 */

const BING_URL = 'https://api.bing.microsoft.com/v7.0/search'

export async function searchWebBing(query, apiKeys = {}) {
  const key = apiKeys.BING_SEARCH_KEY ?? process.env.BING_SEARCH_KEY
  if (!key) return null  // não configurado

  const params = new URLSearchParams({ q: query, mkt: 'pt-BR', count: '10', safeSearch: 'Off' })

  let response
  try {
    response = await fetch(`${BING_URL}?${params}`, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    return null  // timeout ou erro de rede
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    console.warn(`[Bing] ${response.status} query="${query}":`, body?.error?.message || '')
    return null
  }

  const data  = await response.json()
  const items = data.webPages?.value || []

  const organic = items.map(item => ({
    link:    item.url         || '',
    title:   item.name        || '',
    snippet: item.snippet     || '',
  }))

  console.log(`[Bing] ${organic.length} resultados para "${query}"`)
  return { organic, knowledgeGraph: null, localResults: [] }
}
