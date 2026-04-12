import db from '../db/db.js'
import {
  getAllConfig,
  setConfig,
  verifySettingsPassword,
  MANAGED_KEYS,
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

/** POST /settings/auth — verifica senha */
export async function authSettings(req, res, next) {
  try {
    const { password } = req.body
    if (!password) throw new AppError('Senha obrigatória.', 400)
    const ok = await verifySettingsPassword(password)
    if (!ok) throw new AppError('Senha incorreta.', 401)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

/** GET /settings — retorna todas as chaves (mascaradas) */
export async function getSettings(req, res, next) {
  try {
    const config = await getAllConfig()
    res.json(config)
  } catch (err) {
    next(err)
  }
}

/** POST /settings — salva uma ou mais chaves */
export async function saveSettings(req, res, next) {
  try {
    const { password, values } = req.body
    if (!password) throw new AppError('Senha obrigatória.', 400)
    const ok = await verifySettingsPassword(password)
    if (!ok) throw new AppError('Senha incorreta.', 401)

    if (!values || typeof values !== 'object') throw new AppError('Payload inválido.', 400)

    for (const [key, value] of Object.entries(values)) {
      if (!MANAGED_KEYS.includes(key)) continue
      await setConfig(key, value)
    }

    res.json({ ok: true, saved: Object.keys(values).length })
  } catch (err) {
    next(err)
  }
}

/** POST /settings/test — testa uma chave específica (salva antes se value enviado) */
export async function testSetting(req, res, next) {
  try {
    const { password, key, value } = req.body
    if (!password) throw new AppError('Senha obrigatória.', 400)
    const ok = await verifySettingsPassword(password)
    if (!ok) throw new AppError('Senha incorreta.', 401)

    // Se veio um valor novo, salva em process.env antes de testar
    if (value && MANAGED_KEYS.includes(key)) {
      await setConfig(key, value)
    }

    switch (key) {

      case 'DATABASE_URL': {
        await db.query('SELECT 1')
        return res.json({ ok: true, message: 'Conexão com banco OK.' })
      }

      case 'ANTHROPIC_API_KEY': {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada. Cole a chave e clique Testar novamente.' })
        // Usa um request mínimo para validar a chave sem consumir créditos
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
        const apiKey = process.env.SERPER_API_KEY
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada. Cole a chave e clique Testar novamente.' })
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
        const apiKey = process.env.SERPAPI_KEY
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch(`https://serpapi.com/account?api_key=${apiKey}`)
        if (response.ok) return res.json({ ok: true, message: 'Chave SerpApi válida.' })
        const errMsg = await apiErrorMessage(response)
        return res.json({ ok: false, message: `SerpApi: ${errMsg}` })
      }

      case 'BRAVE_SEARCH_KEY': {
        const apiKey = process.env.BRAVE_SEARCH_KEY
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
          headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
        })
        if (response.ok) return res.json({ ok: true, message: 'Chave Brave Search válida.' })
        const errMsg = await apiErrorMessage(response)
        return res.json({ ok: false, message: `Brave: ${errMsg}` })
      }

      case 'BING_SEARCH_KEY': {
        const apiKey = process.env.BING_SEARCH_KEY
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch('https://api.bing.microsoft.com/v7.0/search?q=test&count=1', {
          headers: { 'Ocp-Apim-Subscription-Key': apiKey },
        })
        if (response.ok) return res.json({ ok: true, message: 'Chave Bing válida.' })
        const errMsg = await apiErrorMessage(response)
        return res.json({ ok: false, message: `Bing: ${errMsg}` })
      }

      case 'GOOGLE_CSE_KEY': {
        const apiKey = process.env.GOOGLE_CSE_KEY
        const cx = process.env.GOOGLE_CSE_CX
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

/** POST /settings/reveal — retorna o valor real de uma chave (exige senha) */
export async function revealSetting(req, res, next) {
  try {
    const { password, key } = req.body
    if (!password) throw new AppError('Senha obrigatória.', 400)
    const ok = await verifySettingsPassword(password)
    if (!ok) throw new AppError('Senha incorreta.', 401)
    if (!MANAGED_KEYS.includes(key)) throw new AppError('Chave não permitida.', 403)

    // Busca do banco primeiro, depois process.env
    const { rows } = await db.query('SELECT value FROM settings WHERE key = $1', [key])
    const value = rows[0]?.value || process.env[key] || ''
    if (!value) return res.json({ ok: false, message: 'Chave não configurada.' })

    res.json({ ok: true, value })
  } catch (err) {
    next(err)
  }
}
