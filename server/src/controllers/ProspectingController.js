import { searchPlaces }   from '../modules/prospecting/serper.js'
import { parseAddress, parsePhone } from '../modules/prospecting/addressParser.js'
import { filterExisting }  from '../modules/prospecting/deduplication.js'
import { enrichClient }    from '../modules/prospecting/enrichClient.js'
import { ClientModel }     from '../models/ClientModel.js'
import { AppError }        from '../utils/AppError.js'

/**
 * Detects if a URL belongs to a known social network.
 * Returns { network: 'instagram'|'facebook'|null, handle: string|null }
 */
function detectSocial(url) {
  if (!url) return { network: null, handle: null }
  try {
    const { hostname, pathname } = new URL(url)
    const host = hostname.replace('www.', '')
    if (host === 'instagram.com' || host === 'instagr.am') {
      const handle = pathname.replace(/^\//, '').split('/')[0] || null
      return { network: 'instagram', handle: handle ? `@${handle}` : null }
    }
    if (host === 'facebook.com' || host === 'fb.com') {
      const handle = pathname.replace(/^\//, '').split('/')[0] || null
      return { network: 'facebook', handle }
    }
  } catch {
    // invalid URL — ignore
  }
  return { network: null, handle: null }
}

/**
 * Returns a WhatsApp wa.me link for a Brazilian mobile number (11 digits with DDD).
 * Returns null if the number does not look like a mobile.
 */
function buildWhatsappLink(digits) {
  if (!digits) return null
  // Brazilian mobile: 11 digits starting with 9 after DDD (2 digits)
  const isMobile = digits.length === 11 && digits[2] === '9'
  return isMobile ? `https://wa.me/55${digits}` : null
}

/**
 * Maps a raw Serper place object into a structured prospect
 * matching the clients table shape.
 *
 * @param {object} place       - Raw Serper place object
 * @param {string} [ufFallback] - UF from the search params, used when address parsing fails
 */
function mapPlaceToProspect(place, ufFallback = null) {
  const { logradouro, cidade, uf: ufParsed, cep } = parseAddress(place.address)
  const uf    = ufParsed || (ufFallback ? ufFallback.toUpperCase() : null)
  const phone = parsePhone(place.phone)
  // Store parsed UF separately so the controller can filter by it
  const _ufParsed = ufParsed ? ufParsed.toUpperCase() : null

  // Detect if the "website" field is actually a social media profile
  const { network, handle } = detectSocial(place.website)
  const site      = network ? null          : (place.website || null)
  const instagram = network === 'instagram' ? (handle || place.website) : null
  const facebook  = network === 'facebook'  ? (handle || place.website) : null

  return {
    nome:       place.title || null,
    telefone:   phone,
    whatsapp:   phone,
    site,
    instagram,
    facebook,
    logradouro: logradouro || null,
    cidade:     cidade     || null,
    uf:         uf         || null,
    cep:        cep        || null,
    // Metadata — not saved to DB, used only in the frontend card
    _rating:       place.rating      || null,
    _ratingCount:  place.ratingCount || null,
    _type:         place.type        || null,
    _address:      place.address     || null,
    _whatsappLink: buildWhatsappLink(phone),
    _ufFallback:   ufFallback ? ufFallback.toUpperCase() : null,
    _ufParsed,
  }
}

/**
 * Normalizes a string: removes accents and converts to lowercase.
 */
function normalize(str) {
  if (!str) return ''
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas', 'a', 'o', 'as', 'os'])

/**
 * Extracts meaningful keywords from the searched segments.
 * Words shorter than 4 chars or in the stopword list are ignored.
 */
function extractKeywords(segments) {
  const keywords = new Set()
  for (const seg of segments) {
    const words = normalize(seg).split(/\s+/).filter(w => w.length >= 4 && !STOPWORDS.has(w))
    words.forEach(w => keywords.add(w))
  }
  return [...keywords]
}

/**
 * Returns true if a prospect is relevant to the searched segments.
 * Matches when any keyword (from segment) and any word from the prospect's
 * type or name share a common substring root (e.g. "bicicletaria" ↔ "bicicleta").
 */
function isRelevantResult(prospect, keywords) {
  if (keywords.length === 0) return true
  // If both type and name are missing, keep the result to avoid data loss
  if (!prospect._type && !prospect.nome) return true

  const typeWords = normalize(prospect._type || '').split(/\s+/).filter(w => w.length >= 4)
  const nameWords = normalize(prospect.nome  || '').split(/\s+/).filter(w => w.length >= 4)
  const allWords  = [...typeWords, ...nameWords]

  if (allWords.length === 0) return true

  for (const kw of keywords) {
    for (const word of allWords) {
      // Bidirectional containment catches "bicicletaria" ↔ "bicicleta"
      if (kw.includes(word) || word.includes(kw)) return true
    }
  }
  return false
}

export const ProspectingController = {
  /**
   * POST /prospecting/search
   * Body: { segment: string, uf?: string, city?: string }
   *
   * Searches Google Maps via Serper, parses results and filters out
   * clients that already exist in the database.
   */
  async search(req, res, next) {
    try {
      const { segment, uf, city } = req.body

      if (!segment?.trim()) throw new AppError('O campo "segmento" é obrigatório.', 400)

      // Support multiple segments separated by commas — search each individually
      const segments = segment.split(',').map(s => s.trim()).filter(Boolean)

      let allPlaces    = []
      let totalCredits = 0
      const queries    = []

      for (const seg of segments) {
        const parts = [seg]
        if (city?.trim()) parts.push(city.trim())
        if (uf?.trim())   parts.push(uf.trim().toUpperCase())
        const query = parts.join(' ')
        queries.push(query)

        const { places, creditsUsed } = await searchPlaces(query)
        allPlaces    = allPlaces.concat(places)
        totalCredits += creditsUsed
      }

      if (allPlaces.length === 0) {
        return res.json({ total: 0, unique: [], duplicates: [], creditsUsed: totalCredits, query: queries.join(' | ') })
      }

      let prospects = allPlaces.map(p => mapPlaceToProspect(p, uf))

      // Filter out results unrelated to the searched segments.
      // Google Maps sometimes returns businesses that match on location or
      // unrelated tags — e.g. a "Loja de Roupa" appearing in a bike search.
      const keywords = extractKeywords(segments)
      prospects = prospects.filter(p => isRelevantResult(p, keywords))

      // Filter by UF when specified: exclude results whose parsed address UF
      // differs from the requested UF (Google Maps often returns results from
      // other states even when a state is included in the query).
      if (uf?.trim()) {
        const targetUF = uf.trim().toUpperCase()
        prospects = prospects.filter(p =>
          !p._ufParsed || p._ufParsed === targetUF
        )
      }

      // Deduplicate within results (same name + same phone from different segment queries)
      const seen = new Set()
      prospects = prospects.filter(p => {
        const key = `${(p.nome || '').toLowerCase()}|${p.telefone || ''}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      const { unique, duplicates } = await filterExisting(prospects)

      res.json({
        total:       allPlaces.length,
        unique:      unique,
        duplicates:  duplicates,
        creditsUsed: totalCredits,
        query:       queries.join(' | '),
      })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /prospecting/save
   * Body: { prospects: object[] }
   *
   * Bulk-saves selected prospects as new clients (status: Prospecção).
   * Skips any that are already in the DB (double-check server-side).
   */
  async save(req, res, next) {
    try {
      const { prospects } = req.body
      if (!Array.isArray(prospects) || prospects.length === 0) {
        throw new AppError('Nenhum prospect selecionado para salvar.', 400)
      }

      // Re-run deduplication server-side (never trust client-side alone)
      const { unique } = await filterExisting(prospects)
      if (unique.length === 0) {
        return res.json({ saved: 0, message: 'Todos os prospects já existem na base.' })
      }

      let saved = 0
      const errors = []
      const ids = []

      for (const prospect of unique) {
        try {
          // Strip frontend-only metadata fields before saving
          const { _rating, _ratingCount, _type, _address, _whatsappLink, _ufFallback, _ufParsed, _duplicate, ...clientData } = prospect

          // uf is NOT NULL in the DB.
          // Priority: parsed address UF → search UF (_ufFallback) → 'XX' (unknown state marker)
          if (!clientData.uf) clientData.uf = _ufFallback || 'XX'

          const client = await ClientModel.create(clientData)
          ids.push(client.id)
          saved++
        } catch (err) {
          errors.push(`${prospect.nome}: ${err.message}`)
        }
      }

      res.json({ saved, skipped: unique.length - saved, errors, ids })
    } catch (err) {
      next(err)
    }
  },

  /**
   * POST /prospecting/enrich
   * Body: { clientIds: number[] }
   *
   * Para cada cliente, busca no Google + Claude dados faltantes
   * (instagram, facebook, email, whatsapp, telefone).
   * Retorna sugestões por cliente — o usuário decide o que salvar.
   */
  async enrich(req, res, next) {
    try {
      const { clientIds } = req.body
      if (!Array.isArray(clientIds) || clientIds.length === 0) {
        throw new AppError('Informe ao menos um clientId.', 400)
      }
      if (clientIds.length > 20) {
        throw new AppError('Máximo de 20 clientes por enriquecimento.', 400)
      }

      const results = []

      for (const id of clientIds) {
        const client = await ClientModel.get(id)
        if (!client) continue

        // Só enriquece quem tem algum campo de contato/social faltando
        const needsEnrich = !client.instagram || !client.facebook || !client.email || !client.whatsapp || !client.telefone
        if (!needsEnrich) {
          results.push({ id, nome: client.nome, suggestions: {} })
          continue
        }

        try {
          const suggestions = await enrichClient(client)
          results.push({ id, nome: client.nome, suggestions })
        } catch (err) {
          results.push({ id, nome: client.nome, suggestions: {}, error: err.message })
        }
      }

      res.json({ results })
    } catch (err) {
      next(err)
    }
  },
}
