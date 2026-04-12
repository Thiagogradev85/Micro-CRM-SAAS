import { AppError }           from '../../utils/AppError.js'
import { searchWebSerpApi }   from './serpApiSearch.js'
import { searchWebBrave }     from './braveSearch.js'
import { searchWebBing }      from './bingSearch.js'
import { searchWebCse }       from './googleCse.js'

const SERPER_MAPS_URL   = 'https://google.serper.dev/maps'
const SERPER_SEARCH_URL = 'https://google.serper.dev/search'

// ── Rastreamento do limite Serper ─────────────────────────────────────────────
// Registra quando o limite de créditos foi atingido para calcular a data de reset.
let serperLimitHitAt = null

/**
 * Retorna o status atual do limite Serper.
 * resetDate: plano free renova no dia 1 do mês seguinte ao limite.
 * @returns {{ hitAt: string, resetDate: string } | null}
 */
export function getSerperLimitStatus() {
  if (!serperLimitHitAt) return null
  const hit   = new Date(serperLimitHitAt)
  const reset = new Date(hit.getFullYear(), hit.getMonth() + 1, 1)
  return { hitAt: serperLimitHitAt, resetDate: reset.toISOString() }
}

// ── Serper Maps ───────────────────────────────────────────────────────────────

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
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'br', hl: 'pt-br', num: 20 }),
    })
  } catch {
    throw new AppError('Falha ao conectar com a API Serper. Verifique sua conexão.', 502)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg  = (body.message || '').toLowerCase()
    console.error(`[Serper] ${response.status} para query="${query}" body=`, JSON.stringify(body))

    if (msg.includes('not enough credits') || msg.includes('credits') || msg.includes('quota') || msg.includes('limit') || msg.includes('exceeded')) {
      serperLimitHitAt = serperLimitHitAt || new Date().toISOString()
      throw new AppError('SERPER_LIMIT_REACHED', 402)
    }
    if (response.status === 403) throw new AppError('Chave Serper inválida. Verifique a SERPER_API_KEY no servidor.', 403)
    throw new AppError(`Erro na API Serper: ${response.status}`, 502)
  }

  // Chamada bem-sucedida — limpa flag de limite
  serperLimitHitAt = null

  const data = await response.json()
  const creditsUsed = parseInt(response.headers.get('X-API-KEY-Usage-Count') || '0', 10)
  return { places: data.places || [], creditsUsed }
}

// ── Serper Web Search (interno) ───────────────────────────────────────────────

async function _searchWebSerper(query) {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new AppError('SERPER_API_KEY não configurada no servidor.', 500)

  let response
  try {
    response = await fetch(SERPER_SEARCH_URL, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
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
    if (response.status === 403) throw new AppError('Chave Serper inválida.', 403)
    throw new AppError(`Erro na API Serper: ${response.status}`, 502)
  }

  // Chamada bem-sucedida — limpa flag de limite
  serperLimitHitAt = null

  const data = await response.json()
  const creditsUsed = parseInt(response.headers.get('X-API-KEY-Usage-Count') || '0', 10)

  return {
    organic:        data.organic        || [],
    knowledgeGraph: data.knowledgeGraph || null,
    localResults:   data.local          || [],
    creditsUsed,
  }
}

// ── Cadeia de fallback ────────────────────────────────────────────────────────
//
// Ordem de prioridade quando o Serper atinge o limite:
//   1. SerpApi      — gratuito, 100 buscas/mês        (SERPAPI_KEY)
//   2. Brave Search — $5 crédito grátis/mês (~1.000 buscas) (BRAVE_SEARCH_KEY)
//   3. Bing Search  — gratuito/pago, 1.000 buscas/mês (BING_SEARCH_KEY)
//   4. Google CSE   — gratuito/pago, 100 buscas/dia   (GOOGLE_CSE_KEY + GOOGLE_CSE_CX)
//
// Providers não configurados retornam null e são ignorados silenciosamente.
// Usuários sem nenhum fallback configurado não são afetados.

async function tryFallbacks(query) {
  const providers = [
    { name: 'SerpApi',     fn: () => searchWebSerpApi(query) },
    { name: 'Brave',       fn: () => searchWebBrave(query)   },
    { name: 'Bing',        fn: () => searchWebBing(query)    },
    { name: 'Google CSE',  fn: () => searchWebCse(query)     },
  ]

  for (const { name, fn } of providers) {
    const result = await fn()
    if (result) {
      console.log(`[Search] Fallback bem-sucedido via ${name} para "${query}"`)
      return result
    }
  }
  return null
}

// ── searchWeb público ─────────────────────────────────────────────────────────

/**
 * Busca web com cadeia de fallback automática.
 *
 * Tenta Serper primeiro. Se o limite for atingido, percorre os fallbacks
 * na ordem: SerpApi → Brave → Bing → Google CSE.
 * Providers sem chave configurada são ignorados silenciosamente.
 *
 * @param {string} query
 * @returns {{ organic, knowledgeGraph, localResults }}
 */
export async function searchWeb(query) {
  // Limite já conhecido nesta sessão — vai direto aos fallbacks
  if (serperLimitHitAt) {
    const result = await tryFallbacks(query)
    if (result) return result
    throw new AppError('SERPER_LIMIT_REACHED', 402)
  }

  try {
    return await _searchWebSerper(query)
  } catch (err) {
    if (err.message === 'SERPER_LIMIT_REACHED') {
      serperLimitHitAt = serperLimitHitAt || new Date().toISOString()
      console.warn(`[Serper] Limite atingido em ${serperLimitHitAt} — tentando fallbacks...`)
      const result = await tryFallbacks(query)
      if (result) return result
      throw err
    }
    throw err
  }
}
