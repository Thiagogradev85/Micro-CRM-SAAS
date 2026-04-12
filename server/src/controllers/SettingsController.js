import db from '../db/db.js'
import {
  getAllConfig,
  setConfig,
  verifySettingsPassword,
  MANAGED_KEYS,
} from '../config/configService.js'
import { AppError } from '../utils/AppError.js'

/** POST /api/settings/auth — verifica senha */
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

/** GET /api/settings — retorna todas as chaves (mascaradas) */
export async function getSettings(req, res, next) {
  try {
    const config = await getAllConfig()
    res.json(config)
  } catch (err) {
    next(err)
  }
}

/** POST /api/settings — salva uma ou mais chaves */
export async function saveSettings(req, res, next) {
  try {
    const { password, values } = req.body
    if (!password) throw new AppError('Senha obrigatória.', 400)
    const ok = await verifySettingsPassword(password)
    if (!ok) throw new AppError('Senha incorreta.', 401)

    if (!values || typeof values !== 'object') throw new AppError('Payload inválido.', 400)

    for (const [key, value] of Object.entries(values)) {
      // Só permite salvar chaves gerenciadas ou a senha
      if (!MANAGED_KEYS.includes(key) && key !== 'SETTINGS_PASSWORD') continue
      await setConfig(key, value)
    }

    res.json({ ok: true, saved: Object.keys(values).length })
  } catch (err) {
    next(err)
  }
}

/** POST /api/settings/test — testa uma chave específica */
export async function testSetting(req, res, next) {
  try {
    const { password, key } = req.body
    if (!password) throw new AppError('Senha obrigatória.', 400)
    const ok = await verifySettingsPassword(password)
    if (!ok) throw new AppError('Senha incorreta.', 401)

    switch (key) {
      case 'DATABASE_URL': {
        await db.query('SELECT 1')
        return res.json({ ok: true, message: 'Conexão com banco OK.' })
      }
      case 'ANTHROPIC_API_KEY': {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        })
        if (response.ok) return res.json({ ok: true, message: 'Chave Anthropic válida.' })
        return res.json({ ok: false, message: `Anthropic retornou ${response.status}.` })
      }
      case 'SERPER_API_KEY': {
        const apiKey = process.env.SERPER_API_KEY
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: 'test', num: 1 }),
        })
        if (response.ok) return res.json({ ok: true, message: 'Chave Serper válida.' })
        return res.json({ ok: false, message: `Serper retornou ${response.status}.` })
      }
      case 'SERPAPI_KEY': {
        const apiKey = process.env.SERPAPI_KEY
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const url = `https://serpapi.com/account?api_key=${apiKey}`
        const response = await fetch(url)
        if (response.ok) return res.json({ ok: true, message: 'Chave SerpApi válida.' })
        return res.json({ ok: false, message: `SerpApi retornou ${response.status}.` })
      }
      case 'BRAVE_SEARCH_KEY': {
        const apiKey = process.env.BRAVE_SEARCH_KEY
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
          headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey },
        })
        if (response.ok) return res.json({ ok: true, message: 'Chave Brave Search válida.' })
        return res.json({ ok: false, message: `Brave retornou ${response.status}.` })
      }
      case 'BING_SEARCH_KEY': {
        const apiKey = process.env.BING_SEARCH_KEY
        if (!apiKey) return res.json({ ok: false, message: 'Chave não configurada.' })
        const response = await fetch('https://api.bing.microsoft.com/v7.0/search?q=test&count=1', {
          headers: { 'Ocp-Apim-Subscription-Key': apiKey },
        })
        if (response.ok) return res.json({ ok: true, message: 'Chave Bing válida.' })
        return res.json({ ok: false, message: `Bing retornou ${response.status}.` })
      }
      case 'GOOGLE_CSE_KEY': {
        const apiKey = process.env.GOOGLE_CSE_KEY
        const cx = process.env.GOOGLE_CSE_CX
        if (!apiKey || !cx) return res.json({ ok: false, message: 'GOOGLE_CSE_KEY e GOOGLE_CSE_CX são obrigatórios.' })
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=test&num=1`
        const response = await fetch(url)
        if (response.ok) return res.json({ ok: true, message: 'Google CSE válido.' })
        return res.json({ ok: false, message: `Google CSE retornou ${response.status}.` })
      }
      default:
        return res.json({ ok: false, message: 'Teste não disponível para esta chave.' })
    }
  } catch (err) {
    next(err)
  }
}
