import { searchWeb }    from './serper.js'
import { validateCity } from './ibgeCities.js'

// ── Helpers de extração ───────────────────────────────────────────────────────

// Segmentos de URL do Instagram que não são handles de perfil
const IG_BLOCKED = new Set([
  'p', 'reel', 'reels', 'stories', 'explore', 'tv', 'accounts',
  'about', 'help', 'legal', 'privacy', 'directory', 'hashtag',
  'web', 'ar', 'share', 'sharer', 'login', 'signup', 'embed',
])

function extractInstagram(text) {
  // Prioridade 1: URL real — instagram.com/handle ou instagr.am/handle
  const matches = [...text.matchAll(/(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_.]{3,30})(?:[/?#]|$)/gi)]
  for (const m of matches) {
    const handle = m[1]
    if (!IG_BLOCKED.has(handle.toLowerCase())) return handle
  }

  // Prioridade 2: padrão de título do Google para páginas Instagram
  // Ex: "Bike Shop (@bikeshop) • Instagram" | "(@bikeshop) • Instagram photos"
  const parenMatch = text.match(/\(@?([A-Za-z0-9_.]{3,30})\)\s*[•·]?\s*(?:•\s*)?instagram/i)
  if (parenMatch) {
    const handle = parenMatch[1]
    if (!IG_BLOCKED.has(handle.toLowerCase())) return handle
  }

  // Prioridade 3: menção explícita com @ (comum em snippets do Facebook/Google)
  // Exige @ para evitar falsos positivos com palavras portuguesas após "instagram"
  // Ex: "Instagram: @bikeloja" | "IG: @bikeshop" | "instagram @conta_loja"
  const mentionMatch = text.match(/(?:instagram|ig)\s*[:\s]*@([A-Za-z0-9_.]{3,30})/i)
  if (mentionMatch) {
    const handle = mentionMatch[1]
    if (!IG_BLOCKED.has(handle.toLowerCase()) && /^[A-Za-z0-9]/.test(handle)) return handle
  }

  return null
}

function extractFacebook(text) {
  // facebook.com/slug ou facebook.com/pages/nome/id ou fb.com/slug
  const match = text.match(/(?:facebook\.com|fb\.com)\/(?:pages\/[^/?#]+\/\d+\/?|)([A-Za-z0-9._-]{3,80})(?:[/?#]|$)/i)
  if (!match) return null
  const slug = match[1]
  const blocked = ['share', 'sharer', 'permalink', 'photo', 'video', 'groups',
                   'events', 'login', 'marketplace', 'watch', 'gaming', 'profile.php', 'people']
  if (blocked.some(b => slug.toLowerCase().includes(b))) return null
  return slug
}

function extractEmail(text) {
  const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  if (!match) return null
  const email = match[1].toLowerCase()
  const blocked = ['noreply', 'no-reply', 'mailer', 'bounce', 'example', 'sentry',
                   'wixpress', 'google', 'facebook', 'instagram', 'sampleemail']
  if (blocked.some(b => email.includes(b))) return null
  return email
}

// DDDs válidos por UF — usado para validar se o telefone encontrado bate com o estado do cliente
const UF_DDDS = {
  AC: ['68'],
  AL: ['82'],
  AM: ['92', '97'],
  AP: ['96'],
  BA: ['71', '73', '74', '75', '77'],
  CE: ['85', '88'],
  DF: ['61'],
  ES: ['27', '28'],
  GO: ['62', '64'],
  MA: ['98', '99'],
  MG: ['31', '32', '33', '34', '35', '37', '38'],
  MS: ['67'],
  MT: ['65', '66'],
  PA: ['91', '93', '94'],
  PB: ['83'],
  PE: ['81', '87'],
  PI: ['86', '89'],
  PR: ['41', '42', '43', '44', '45', '46'],
  RJ: ['21', '22', '24'],
  RN: ['84'],
  RO: ['69'],
  RR: ['95'],
  RS: ['51', '53', '54', '55'],
  SC: ['47', '48', '49'],
  SE: ['79'],
  SP: ['11', '12', '13', '14', '15', '16', '17', '18', '19'],
  TO: ['63'],
}

// Palavras que não são nomes de cidades (logradouros, países, etc.)
const CITY_BLOCKED_STARTS = [
  'rua', 'av ', 'avenida', 'travessa', 'alameda', 'praça', 'r.', 'al.',
  'rodovia', 'estrada', 'viela', 'beco', 'brazil', 'brasil',
]

/**
 * Extrai nome de cidade a partir de um endereço contendo o UF.
 * Ex: "Rua X, 360, São José, SC, Brazil" → "São José"
 * Ex: "Av. Beira Mar, 1234 - Florianópolis - SC" → "Florianópolis"
 */
function extractCityFromAddress(address, uf) {
  if (!address || !uf) return null
  const ufUpper = uf.toUpperCase()

  // Padrões: "Cidade, UF" | "Cidade - UF" | "Cidade / UF"
  // Exige separador (vírgula, traço, barra ou início de string) ANTES da cidade
  // para evitar capturar nomes de pessoas que precedem o endereço
  // Ex: "Gustavo Silva, Florianópolis, SC" → captura "Florianópolis", não "Gustavo Silva"
  const pattern = new RegExp(
    String.raw`(?:^|[,/\-])\s*([A-Za-zÀ-ÖØ-öø-ÿ]+(?:[\s\-][A-Za-zÀ-ÖØ-öø-ÿ]+){0,3})\s*[,\-/]\s*${ufUpper}`,
    'gi'
  )
  const allMatches = [...address.matchAll(pattern)]
  if (allMatches.length === 0) return null
  // Usa o ÚLTIMO match — mais próximo do UF, menos chance de ser nome de pessoa
  const m = allMatches[allMatches.length - 1]

  const city = m[1].trim()
  if (city.length < 3 || city.length > 60) return null
  const lower = city.toLowerCase()
  if (CITY_BLOCKED_STARTS.some(b => lower.startsWith(b))) return null
  // Primeira letra maiúscula indica nome próprio (evita capturar fragmentos de frase)
  if (!/^[A-ZÀ-Ö]/.test(city)) return null
  return city
}

function dddMatchesUF(digits, uf) {
  if (!uf) return true  // sem UF cadastrada, aceita qualquer DDD
  const validDDDs = UF_DDDS[uf.toUpperCase()]
  if (!validDDDs) return true  // UF desconhecida, não rejeita
  const ddd = digits.slice(0, 2)
  return validDDDs.includes(ddd)
}

function extractPhone(text, uf = null) {
  // Formatos brasileiros: (DD) 9xxxx-xxxx | DD 9xxxx-xxxx | +55 DD xxx | DDD sem parênteses
  const matches = text.match(
    /(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)(?:9[\s.-]?\d{4}|\d{4})[\s.-]?\d{4}/g
  )
  if (!matches) return null
  for (const raw of matches) {
    const digits = raw.replace(/\D/g, '').replace(/^55/, '')
    if ((digits.length === 10 || digits.length === 11) && dddMatchesUF(digits, uf)) {
      return digits
    }
  }
  return null
}

// Extrai dados do knowledgeGraph do Serper (painel de conhecimento do Google)
function parseKnowledgeGraph(kg, uf = null) {
  if (!kg) return {}
  const result = {}

  // Telefone direto
  const phone = kg.phoneNumber || kg.phone || ''
  if (phone) {
    const digits = phone.replace(/\D/g, '').replace(/^55/, '')
    if ((digits.length === 10 || digits.length === 11) && dddMatchesUF(digits, uf)) {
      result.phone = digits
    }
  }

  // Email direto
  const email = kg.email || ''
  if (email) result.email = extractEmail(email) || undefined

  // Cidade a partir do endereço estruturado
  const address = kg.address || kg.formattedAddress || ''
  if (address && uf) {
    result.cidade = extractCityFromAddress(address, uf) || undefined
  }

  // Website — pode conter links de redes sociais
  const website = kg.website || kg.url || ''
  if (website) {
    if (!result.instagram && website.includes('instagram.com')) result.instagram = extractInstagram(website)
    if (!result.facebook  && website.includes('facebook.com'))  result.facebook  = extractFacebook(website)
  }

  // Profiles / sitelinks do knowledge graph
  const profiles = kg.profiles || []
  for (const p of profiles) {
    const url = (p.url || p.link || '').toLowerCase()
    if (!result.instagram && url.includes('instagram')) result.instagram = extractInstagram(url)
    if (!result.facebook  && url.includes('facebook'))  result.facebook  = extractFacebook(url)
  }

  // Varre todos os textos do KG em busca de redes sociais / contato
  const kgText = JSON.stringify(kg)
  if (!result.instagram) result.instagram = extractInstagram(kgText) || undefined
  if (!result.facebook)  result.facebook  = extractFacebook(kgText)  || undefined
  if (!result.email)     result.email     = extractEmail(kgText)     || undefined
  if (!result.phone)     result.phone     = extractPhone(kgText, uf) || undefined

  return result
}

// Varre resultados orgânicos e local em busca de dados
function parseResults({ organic = [], localResults = [], knowledgeGraph = null }, uf = null) {
  const found = { cidade: null, instagram: null, facebook: null, email: null, phone: null }

  // Knowledge graph tem prioridade — dados mais confiáveis
  const kg = parseKnowledgeGraph(knowledgeGraph, uf)
  if (kg.cidade)    found.cidade    = kg.cidade
  if (kg.instagram) found.instagram = kg.instagram
  if (kg.facebook)  found.facebook  = kg.facebook
  if (kg.email)     found.email     = kg.email
  if (kg.phone)     found.phone     = kg.phone

  // Resultados locais (Google Maps inline) — geralmente têm endereço completo
  for (const local of localResults) {
    const address = local.address || local.formattedAddress || ''
    if (!found.cidade && address && uf) found.cidade = extractCityFromAddress(address, uf)
    const localText = JSON.stringify(local)
    if (!found.phone)     found.phone     = extractPhone(localText, uf)
    if (!found.email)     found.email     = extractEmail(localText)
    if (!found.instagram) found.instagram = extractInstagram(localText)
    if (!found.facebook)  found.facebook  = extractFacebook(localText)
    if (found.cidade && found.phone && found.email && found.instagram && found.facebook) break
  }

  // Resultados orgânicos
  for (const r of organic.slice(0, 10)) {
    const texts = [
      r.link    || '',
      r.title   || '',
      r.snippet || '',
      ...(r.sitelinks || []).map(s => `${s.title || ''} ${s.link || ''}`),
    ].join(' ')

    if (!found.instagram) found.instagram = extractInstagram(texts)
    if (!found.facebook)  found.facebook  = extractFacebook(texts)
    if (!found.email)     found.email     = extractEmail(texts)
    if (!found.phone)     found.phone     = extractPhone(texts, uf)
    if (!found.cidade && uf) found.cidade = extractCityFromAddress(texts, uf)

    if (found.cidade && found.instagram && found.facebook && found.email && found.phone) break
  }

  return found
}

/**
 * Verifica se um handle de Instagram/Facebook é plausível para o nome do cliente.
 * Normaliza ambos removendo acentos, espaços e símbolos, depois checa se
 * pelo menos uma palavra significativa do nome (>2 chars) aparece no handle.
 * Ex: "Bike Speck" → partes ["bike","speck"] → handle "bikespeck" ✓
 */
function nameMatchesHandle(clientName, handle) {
  if (!clientName || !handle) return false
  const norm = s => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
  const parts = clientName.split(/\s+/).map(norm).filter(p => p.length > 2)
  const h = norm(handle)
  return parts.some(p => h.includes(p))
}

// ── Enriquecedor principal ────────────────────────────────────────────────────

/**
 * Busca dados de contato faltantes para um cliente usando 3 buscas Serper paralelas:
 *  1. Busca geral (contato, telefone, email)
 *  2. Busca direcionada ao Instagram (site:instagram.com)
 *  3. Busca direcionada ao Facebook  (site:facebook.com)
 *
 * @param {{ id, nome, cidade, uf, whatsapp, telefone, email, instagram, facebook }} client
 * @returns {{ instagram?, facebook?, email?, whatsapp?, telefone? }}
 */
export async function enrichClient(client, apiKeys = {}) {
  // Sanitiza campos — filtra strings "null"/"undefined" que vêm do banco como texto
  const sanitize = v => (!v || v === 'null' || v === 'undefined') ? null : v
  const nome       = sanitize(client.nome) || ''
  const uf         = sanitize(client.uf)
  const cidadeOrig = sanitize(client.cidade)

  // Segmento de negócio configurável via ENRICH_SEGMENT (por usuário ou global)
  const segment = (apiKeys.ENRICH_SEGMENT ?? process.env.ENRICH_SEGMENT ?? '').trim()

  const base       = [nome, cidadeOrig, uf].filter(Boolean).join(' ')
  const baseWithSeg = segment ? [nome, segment, cidadeOrig, uf].filter(Boolean).join(' ') : base
  const quotedName = `"${nome}"`

  console.log(`[Enrich] cliente="${nome}" cidade="${cidadeOrig}" uf="${uf}" segmento="${segment}"`)
  console.log(`[Enrich] base query: "${baseWithSeg}"`)
  console.log(`[Enrich] ja tem: instagram=${!!client.instagram} facebook=${!!client.facebook} email=${!!client.email}`)

  // Determina quais buscas ainda fazem sentido para este cliente
  const searches = [
    searchWeb(`${baseWithSeg} contato telefone email whatsapp`, apiKeys),
    client.instagram ? Promise.resolve(null) : searchWeb(`${baseWithSeg} site:instagram.com`, apiKeys),
    client.facebook  ? Promise.resolve(null) : searchWeb(`${baseWithSeg} site:facebook.com`, apiKeys),
    client.email     ? Promise.resolve(null) : searchWeb(`${quotedName} ${segment} email contato`.trim(), apiKeys),
  ]

  const [generalRes, igRes, fbRes, emailRes] = await Promise.allSettled(searches)
  console.log(`[Enrich] statuses: general=${generalRes.status} ig=${igRes.status} fb=${fbRes.status} email=${emailRes.status}`)
  if (igRes.status === 'rejected') console.log(`[Enrich] igRes error:`, igRes.reason?.message)

  // Agrega dados de todas as fontes
  let cidade    = cidadeOrig || null
  let instagram = client.instagram || null
  let facebook  = client.facebook  || null
  let email     = client.email     || null
  let phone     = null

  // ── Resultado geral ──────────────────────────────────────────────────────────
  if (generalRes.status === 'fulfilled' && generalRes.value) {
    const g = parseResults(generalRes.value, uf)
    if (!cidade)    cidade    = g.cidade
    if (!instagram) instagram = g.instagram
    if (!facebook)  facebook  = g.facebook
    if (!email)     email     = g.email
    if (!phone)     phone     = g.phone
  }

  console.log(`[Enrich] após geral: instagram=${instagram} facebook=${facebook} email=${email} phone=${phone} cidade=${cidade}`)

  // ── Resultado Instagram (site:instagram.com) ─────────────────────────────────
  if (!instagram && igRes.status === 'fulfilled' && igRes.value) {
    const igOrganic = igRes.value.organic || []
    console.log(`[Enrich] igOrganic count=${igOrganic.length}`, igOrganic.slice(0,5).map(r => ({ link: r.link, title: r.title })))

    // Passa 1a: URL do link com correspondência de nome
    for (const r of igOrganic) {
      if (!r.link?.includes('instagram.com')) continue
      const handle = extractInstagram(r.link)
      if (handle && nameMatchesHandle(nome, handle)) { instagram = handle; break }
    }

    // Passa 1b: título/snippet com correspondência de nome
    // Google retorna títulos como "Bike Shop (@bikeshop) • Instagram photos"
    if (!instagram) {
      for (const r of igOrganic.slice(0, 10)) {
        const text = [r.title, r.snippet].filter(Boolean).join(' ')
        const handle = extractInstagram(text)
        if (handle && nameMatchesHandle(nome, handle)) { instagram = handle; break }
      }
    }

    // Passa 2a: primeiro link de instagram.com mesmo sem correspondência de nome
    if (!instagram) {
      for (const r of igOrganic) {
        if (!r.link?.includes('instagram.com')) continue
        const handle = extractInstagram(r.link)
        if (handle) { instagram = handle; break }
      }
    }

    // Passa 2b: primeiro título/snippet com handle válido
    if (!instagram) {
      for (const r of igOrganic.slice(0, 5)) {
        const text = [r.title, r.snippet].filter(Boolean).join(' ')
        const handle = extractInstagram(text)
        if (handle) { instagram = handle; break }
      }
    }

    // Passa 3: fallback geral (JSON completo do resultado)
    if (!instagram) instagram = parseResults(igRes.value, uf).instagram
    if (!cidade)    cidade    = parseResults(igRes.value, uf).cidade
    console.log(`[Enrich] após igRes: instagram=${instagram}`)
  }

  // ── Resultado Facebook (site:facebook.com) ───────────────────────────────────
  if (fbRes.status === 'fulfilled' && fbRes.value) {
    const fbOrganic = fbRes.value.organic || []

    // Passa 1: slug com correspondência de nome
    if (!facebook) {
      for (const r of fbOrganic) {
        if (!r.link?.includes('facebook.com')) continue
        const slug = extractFacebook(r.link)
        if (slug && nameMatchesHandle(nome, slug)) { facebook = slug; break }
      }
    }
    // Passa 2: primeiro link de facebook.com
    if (!facebook && fbOrganic[0]?.link) {
      facebook = extractFacebook(fbOrganic[0].link)
    }

    // Snippets e sitelinks do Facebook — contêm telefone, email e frequentemente Instagram
    for (const r of fbOrganic.slice(0, 5)) {
      const sitelinksText = (r.sitelinks || []).map(s => `${s.title || ''} ${s.link || ''} ${s.snippet || ''}`).join(' ')
      const text = [r.link, r.title, r.snippet, sitelinksText].filter(Boolean).join(' ')
      if (!phone)     phone     = extractPhone(text, uf)
      if (!email)     email     = extractEmail(text)
      if (!instagram) instagram = extractInstagram(text)
      if (phone && email && instagram) break
    }

    // Varre o JSON completo dos resultados do Facebook para email e instagram
    if (!email || !instagram) {
      const fbFullText = JSON.stringify(fbRes.value)
      if (!email)     email     = extractEmail(fbFullText)
      if (!instagram) instagram = extractInstagram(fbFullText)
    }

    // Knowledge graph do resultado de Facebook
    if (fbRes.value.knowledgeGraph) {
      const kg = parseKnowledgeGraph(fbRes.value.knowledgeGraph, uf)
      if (!cidade)    cidade    = kg.cidade    || null
      if (!phone)     phone     = kg.phone     || null
      if (!email)     email     = kg.email     || null
      if (!facebook)  facebook  = kg.facebook  || null
      if (!instagram) instagram = kg.instagram || null
    }
  }

  // ── Busca de email dedicada ──────────────────────────────────────────────────
  if (!email && emailRes.status === 'fulfilled' && emailRes.value) {
    const e = parseResults(emailRes.value, uf)
    if (!email)     email     = e.email
    if (!instagram) instagram = e.instagram
    if (!phone)     phone     = e.phone
    if (!cidade)    cidade    = e.cidade
    // Varre JSON completo do resultado de email
    if (!email) email = extractEmail(JSON.stringify(emailRes.value))
  }

  // ── Fallback Instagram A: busca só pelo nome sem cidade/UF (site:instagram.com) ──
  if (!instagram) {
    try {
      const igFallback = await searchWeb(`${nome}${segment ? ' ' + segment : ''} site:instagram.com`, apiKeys)
      if (igFallback?.organic?.length) {
        for (const r of igFallback.organic) {
          if (!r.link?.includes('instagram.com')) continue
          const handle = extractInstagram(r.link)
          if (handle) { instagram = handle; break }
        }
        if (!instagram) {
          for (const r of igFallback.organic.slice(0, 5)) {
            const text = [r.title, r.snippet].filter(Boolean).join(' ')
            const handle = extractInstagram(text)
            if (handle) { instagram = handle; break }
          }
        }
      }
    } catch { /* falha silenciosa */ }
  }

  console.log(`[Enrich] após fallbackA: instagram=${instagram}`)
  // ── Fallback Instagram B: busca livre "nome instagram" (sem site:) ───────────
  // Captura casos onde site:instagram.com só retorna posts/reels bloqueados,
  // mas uma busca normal encontra o perfil via link direto nos resultados
  if (!instagram) {
    try {
      const igFree = await searchWeb(`${baseWithSeg} instagram perfil`, apiKeys)
      if (igFree?.organic?.length) {
        // Prioriza links diretos ao instagram.com com correspondência de nome
        for (const r of igFree.organic.slice(0, 10)) {
          if (!r.link?.includes('instagram.com')) continue
          const handle = extractInstagram(r.link)
          if (handle && nameMatchesHandle(nome, handle)) { instagram = handle; break }
        }
        // Aceita qualquer link instagram.com
        if (!instagram) {
          for (const r of igFree.organic.slice(0, 10)) {
            if (!r.link?.includes('instagram.com')) continue
            const handle = extractInstagram(r.link)
            if (handle) { instagram = handle; break }
          }
        }
        // Tenta título/snippet (padrão "(@handle) • Instagram")
        if (!instagram) {
          for (const r of igFree.organic.slice(0, 5)) {
            const text = [r.title, r.snippet].filter(Boolean).join(' ')
            const handle = extractInstagram(text)
            if (handle && nameMatchesHandle(nome, handle)) { instagram = handle; break }
          }
        }
      }
    } catch { /* falha silenciosa */ }
  }

  console.log(`[Enrich] resultado final ANTES de validação: instagram=${instagram} facebook=${facebook} email=${email} cidade=${cidade}`)
  // ── Valida cidade contra a lista oficial de municípios do IBGE ──────────────
  // Descarta se não for um município real do estado (ex: "Sesc", "SIM", "Shopping")
  let cidadeNaoValidada = false
  if (cidade && !cidadeOrig && uf) {
    const { valid, unavailable } = await validateCity(cidade, uf)
    if (!valid) {
      cidade = null
    } else if (unavailable) {
      cidadeNaoValidada = true // IBGE fora do ar — cidade passa mas será sinalizada
    }
  }

  // ── Monta resultado final (só campos realmente ausentes no cliente) ───────────
  const result = {}

  if (cidade    && !cidadeOrig)        result.cidade    = cidade
  if (cidadeNaoValidada && result.cidade) result._cidadeNaoValidada = true
  if (instagram && !client.instagram) result.instagram = instagram
  if (facebook  && !client.facebook)  result.facebook  = facebook
  if (email     && !client.email)     result.email     = email

  if (phone) {
    // Preenche whatsapp ou telefone (fixo), o que estiver vazio
    if (!client.whatsapp) result.whatsapp = phone
    else if (!client.telefone) result.telefone = phone
  }

  return result
}
