/**
 * SerpApi — fallback gratuito ao Serper.
 *
 * Plano gratuito: 100 buscas/mês, sem cartão de crédito.
 * Cadastro: serpapi.com → Register → Dashboard → copiar API Key
 * Configuração: SERPAPI_KEY no .env ou em Configurações no app
 *
 * Dois usos:
 *   searchWebSerpApi(query)  → busca web (usada no Enriquecimento)
 *   searchMapsSerpApi(query) → busca Google Maps (fallback da Prospecção)
 *
 * Ambas retornam null se não configurado ou se ocorrer erro.
 */

const SERPAPI_URL = 'https://serpapi.com/search.json'

// ── Busca web (Enriquecimento) ─────────────────────────────────────────────────

export async function searchWebSerpApi(query, apiKeys = {}) {
  const key = apiKeys.SERPAPI_KEY ?? process.env.SERPAPI_KEY
  if (!key) return null

  const params = new URLSearchParams({
    q:       query,
    api_key: key,
    engine:  'google',
    gl:      'br',
    hl:      'pt',
    num:     '10',
  })

  let response
  try {
    response = await fetch(`${SERPAPI_URL}?${params}`, {
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    return null
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    console.warn(`[SerpApi] ${response.status} query="${query}":`, body?.error || '')
    return null
  }

  const data = await response.json()
  if (data.error) {
    console.warn(`[SerpApi] erro query="${query}":`, data.error)
    return null
  }

  const organic = (data.organic_results || []).map(item => ({
    link:    item.link    || '',
    title:   item.title   || '',
    snippet: item.snippet || '',
  }))

  console.log(`[SerpApi web] ${organic.length} resultados para "${query}"`)
  return { organic, knowledgeGraph: data.knowledge_graph || null, localResults: [] }
}

// ── Busca Google Maps (Prospecção) ─────────────────────────────────────────────

/**
 * Busca estabelecimentos no Google Maps via SerpApi.
 * Retorna no mesmo shape que searchPlaces() do serper.js:
 *   { places: [{ title, address, phone, website, rating, ratingCount, type }] }
 *
 * Retorna null se não configurado ou se ocorrer erro.
 */
export async function searchMapsSerpApi(query, apiKeys = {}) {
  const key = apiKeys.SERPAPI_KEY ?? process.env.SERPAPI_KEY
  if (!key) return null

  const params = new URLSearchParams({
    q:       query,
    api_key: key,
    engine:  'google_maps',
    type:    'search',
    gl:      'br',
    hl:      'pt',
  })

  let response
  try {
    response = await fetch(`${SERPAPI_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    console.warn(`[SerpApi Maps] timeout/erro de rede para "${query}"`)
    return null
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    console.warn(`[SerpApi Maps] ${response.status} query="${query}":`, body?.error || '')
    return null
  }

  const data = await response.json()
  if (data.error) {
    console.warn(`[SerpApi Maps] erro query="${query}":`, data.error)
    return null
  }

  // Mapeia para o shape esperado pelo ProspectingController
  const places = (data.local_results || []).map(item => ({
    title:       item.title       || null,
    address:     item.address     || null,
    phone:       item.phone       || null,
    website:     item.website     || null,
    rating:      item.rating      ?? null,
    ratingCount: item.reviews     ?? null,
    type:        item.type        || null,
  }))

  console.log(`[SerpApi Maps] ${places.length} resultados para "${query}"`)
  return { places, creditsUsed: 0 }
}
