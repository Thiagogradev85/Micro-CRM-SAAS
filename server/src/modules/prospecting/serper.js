import { AppError } from '../../utils/AppError.js'

const SERPER_MAPS_URL   = 'https://google.serper.dev/maps'
const SERPER_SEARCH_URL = 'https://google.serper.dev/search'

/**
 * Searches Google Maps via Serper API for businesses matching the query.
 *
 * @param {string} query - Search query (e.g. "farmácias Curitiba PR")
 * @returns {{ places: object[], creditsUsed: number }}
 */
export async function searchPlaces(query) {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new AppError('SERPER_API_KEY não configurada no servidor.', 500)

  let response
  try {
    response = await fetch(SERPER_MAPS_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, gl: 'br', hl: 'pt-br', num: 20 }),
    })
  } catch {
    throw new AppError('Falha ao conectar com a API Serper. Verifique sua conexão.', 502)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg  = (body.message || '').toLowerCase()

    if (response.status === 403) {
      // Distinguish between quota exhaustion and invalid key
      if (msg.includes('limit') || msg.includes('quota') || msg.includes('exceeded')) {
        throw new AppError('SERPER_LIMIT_REACHED', 402)
      }
      throw new AppError('Chave Serper inválida. Verifique a SERPER_API_KEY no servidor.', 403)
    }

    throw new AppError(`Erro na API Serper: ${response.status}`, 502)
  }

  const data = await response.json()
  const creditsUsed = parseInt(response.headers.get('X-API-KEY-Usage-Count') || '0', 10)

  return {
    places: data.places || [],
    creditsUsed,
  }
}

/**
 * Searches Google Web via Serper API — used for data enrichment.
 * Returns organic results with links, snippets and sitelinks.
 *
 * @param {string} query
 * @returns {{ organic: object[], creditsUsed: number }}
 */
export async function searchWeb(query) {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new AppError('SERPER_API_KEY não configurada no servidor.', 500)

  let response
  try {
    response = await fetch(SERPER_SEARCH_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, gl: 'br', hl: 'pt-br', num: 10 }),
    })
  } catch {
    throw new AppError('Falha ao conectar com a API Serper.', 502)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg  = (body.message || '').toLowerCase()
    console.error(`[Serper] ${response.status} para query="${query}" body=`, JSON.stringify(body))
    if (msg.includes('not enough credits') || msg.includes('credits') || msg.includes('quota') || msg.includes('limit') || msg.includes('exceeded')) {
      throw new AppError('SERPER_LIMIT_REACHED', 402)
    }
    if (response.status === 403) {
      throw new AppError('Chave Serper inválida.', 403)
    }
    throw new AppError(`Erro na API Serper: ${response.status}`, 502)
  }

  const data = await response.json()
  const creditsUsed = parseInt(response.headers.get('X-API-KEY-Usage-Count') || '0', 10)

  return {
    organic:       data.organic        || [],
    knowledgeGraph: data.knowledgeGraph || null,
    localResults:  data.local          || [],
    creditsUsed,
  }
}
