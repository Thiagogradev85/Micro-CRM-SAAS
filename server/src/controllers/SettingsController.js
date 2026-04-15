import db from '../db/db.js'
import {
  getUserConfig,
  setConfig,
  setUserConfig,
  getEffectiveKey,
  MANAGED_KEYS,
  ADMIN_ONLY_KEYS,
} from '../config/configService.js'
import { AppError } from '../utils/AppError.js'

/** Helper: extrai mensagem de erro do body da resposta da API externa */
async function apiErrorMessage(response) {
  try {
    const body = await response.json()
    return body?.error?.message
      || body?.message
      || body?.error
      || `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

/** GET /settings — retorna chaves mascaradas do usuário (com indicação de fallback global) */
export async function getSettings(req, res, next) {
  try {
    const config = await getUserConfig(req.user.id, req.user.role === 'admin')
    res.json(config)
  } catch (err) {
    next(err)
  }
}

/** POST /settings — salva uma ou mais chaves
 *  Admin: salva no global (settings)
 *  Usuário: salva no seu próprio override (user_settings)
 */
export async function saveSettings(req, res, next) {
  try {
    const { values } = req.body
    if (!values || typeof values !== 'object') throw new AppError('Payload inválido.', 400)

    const isAdmin = req.user.role === 'admin'

    const allowedKeys = isAdmin ? [...MANAGED_KEYS, ...ADMIN_ONLY_KEYS] : MANAGED_KEYS

    for (const [key, value] of Object.entries(values)) {
      if (!allowedKeys.includes(key)) continue
      // Chaves admin-only sempre vão pro global
      if (isAdmin || ADMIN_ONLY_KEYS.includes(key)) {
        await setConfig(key, value)
      } else {
        await setUserConfig(req.user.id, key, value)
      }
    }

    res.json({ ok: true, saved: Object.keys(values).length })
  } catch (err) {
    next(err)
  }
}

/** POST /settings/test — testa uma chave específica usando o valor efetivo do usuário */
export async function testSetting(req, res, next) {
  try {
    const { key, value } = req.body

    // Se enviou valor novo, salva temporariamente antes de testar
    if (value && MANAGED_KEYS.includes(key)) {
      if (req.user.role === 'admin') {
        await setConfig(key, value)
      } else {
        await setUserConfig(req.user.id, key, value)
      }
    }

    // Resolve chave efetiva (própria ou fallback global)
    const apiKey = await getEffectiveKey(req.user.id, key)

    switch (key) {

      case 'DATABASE_URL': {
        await db.query('SELECT 1')
        return res.json({ ok: true, message: 'Conexão com banco OK.' })
      }

      case 'ANTHROPIC_API_KEY': {
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        })
        if (response.ok) return res.json({ ok: true, message: 'Chave Anthropic válida e com créditos.' })
        const errMsg = await apiErrorMessage(response)
        return res.json({ ok: false, message: `Anthropic: ${errMsg}` })
      }

      case 'SERPER_API_KEY': {
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: 'test' }),
        })
        if (response.ok) return res.json({ ok: true, message: 'Chave Serper válida.' })
        const errMsg = await apiErrorMessage(response)
        return res.json({ ok: false, message: `Serper: ${errMsg}` })
      }

      case 'SERPAPI_KEY': {
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch(`https://serpapi.com/account?api_key=${apiKey}`)
        if (response.ok) return res.json({ ok: true, message: 'Chave SerpApi válida.' })
        const errMsg = await apiErrorMessage(response)
        return res.json({ ok: false, message: `SerpApi: ${errMsg}` })
      }

      case 'BRAVE_SEARCH_KEY': {
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
          headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
        })
        if (response.ok) return res.json({ ok: true, message: 'Chave Brave Search válida.' })
        const errMsg = await apiErrorMessage(response)
        return res.json({ ok: false, message: `Brave: ${errMsg}` })
      }

      case 'BING_SEARCH_KEY': {
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch('https://api.bing.microsoft.com/v7.0/search?q=test&count=1', {
          headers: { 'Ocp-Apim-Subscription-Key': apiKey },
        })
        if (response.ok) return res.json({ ok: true, message: 'Chave Bing válida.' })
        const errMsg = await apiErrorMessage(response)
        return res.json({ ok: false, message: `Bing: ${errMsg}` })
      }

      case 'GOOGLE_CSE_KEY': {
        const cx = await getEffectiveKey(req.user.id, 'GOOGLE_CSE_CX')
        if (!apiKey) return res.json({ ok: false, message: 'GOOGLE_CSE_KEY não configurada.' })
        if (!cx)     return res.json({ ok: false, message: 'GOOGLE_CSE_CX não configurada.' })
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=test&num=1`
        const response = await fetch(url)
        if (response.ok) return res.json({ ok: true, message: 'Google CSE válido.' })
        const errMsg = await apiErrorMessage(response)
        return res.json({ ok: false, message: `Google CSE: ${errMsg}` })
      }

      default:
        return res.json({ ok: false, message: 'Teste não disponível para esta chave.' })
    }
  } catch (err) {
    next(err)
  }
}

/** POST /settings/reveal — retorna valor real de uma chave (própria ou fallback global) */
export async function revealSetting(req, res, next) {
  try {
    const { key } = req.body
    if (!MANAGED_KEYS.includes(key)) throw new AppError('Chave não permitida.', 403)

    const value = await getEffectiveKey(req.user.id, key)
    if (!value) return res.json({ ok: false, message: 'Chave não configurada.' })

    res.json({ ok: true, value })
  } catch (err) {
    next(err)
  }
}
