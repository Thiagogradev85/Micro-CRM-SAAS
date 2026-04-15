import express from 'express'
import cors    from 'cors'
import dotenv  from 'dotenv'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { Server as SocketIO } from 'socket.io'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync }    from 'fs'
import { setupPresence } from './socket/presenceService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

import statusRoutes      from './routes/status.js'
import sellerRoutes      from './routes/sellers.js'
import clientRoutes      from './routes/clients.js'
import catalogRoutes     from './routes/catalogs.js'
import productRoutes     from './routes/products.js'
import dailyReportRoutes from './routes/dailyReport.js'
import whatsappRoutes    from './routes/whatsapp.js'
import emailRoutes       from './routes/email.js'
import prospectingRoutes from './routes/prospecting.js'
import settingsRoutes    from './routes/settings.js'
import authRoutes        from './routes/auth.js'
import companyRoutes     from './routes/companies.js'
import { AppError }      from './utils/AppError.js'
import db                from './db/db.js'
import { ClientModel }   from './models/ClientModel.js'
import { loadConfigFromDb } from './config/configService.js'
import { seedAdmin }        from './config/adminSeed.js'

dotenv.config()

// ── Reset diário: Contatado → Prospecção à meia-noite ──
async function resetContatadoParaProspeccao({ apenasAnteriores = false } = {}) {
  try {
    // Se apenasAnteriores=true, só reseta clientes atualizados antes de hoje (Brasília)
    // Usado na inicialização para não afetar quem foi contatado hoje
    const whereExtra = apenasAnteriores
      ? `AND updated_at AT TIME ZONE 'America/Sao_Paulo' < CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo'`
      : ''

    const { rowCount } = await db.query(`
      UPDATE clients c
      SET status_id  = (SELECT id FROM status WHERE nome = 'Prospecção' AND company_id = c.company_id LIMIT 1),
          updated_at = NOW()
      WHERE status_id IN (SELECT id FROM status WHERE nome = 'Contatado')
        AND ativo = true
        ${whereExtra}
    `)
    if (rowCount > 0) {
      console.log(`[Reset diário] ${rowCount} cliente(s) voltaram para Prospecção.`)
    }
  } catch (err) {
    console.error('[Reset diário] Erro:', err.message)
  }
}

async function resetNaoTemInteresse() {
  try {
    const { rowCount } = await db.query(`
      UPDATE clients c
      SET status_id         = (SELECT id FROM status WHERE nome = 'Prospecção' AND company_id = c.company_id LIMIT 1),
          interesse_reset_at = NULL,
          updated_at         = NOW()
      WHERE status_id IN (SELECT id FROM status WHERE nome = 'Não Tem Interesse')
        AND interesse_reset_at IS NOT NULL
        AND interesse_reset_at <= NOW()
        AND ativo = true
    `)
    if (rowCount > 0) {
      console.log(`[Reset NTI] ${rowCount} cliente(s) voltaram para Prospecção após 3 meses.`)
    }
  } catch (err) {
    console.error('[Reset NTI] Erro:', err.message)
  }
}

// ── Auto-assign diário: associa vendedores a clientes com UF mas sem vendedor ──
async function assignSellersToClients() {
  try {
    const count = await ClientModel.bulkAssignSellers()
    if (count > 0) {
      console.log(`[Auto-assign] ${count} cliente(s) associado(s) a vendedores.`)
    }
  } catch (err) {
    console.error('[Auto-assign] Erro:', err.message)
  }
}

function agendarResetMeiaNoite() {
  const agora = new Date()

  // Próxima meia-noite no horário de Brasília (UTC-3, sem DST desde 2019)
  // 00:00 BRT = 03:00 UTC
  const dataHojeBrasilia = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const [ano, mes, dia] = dataHojeBrasilia.split('-').map(Number)
  const meiaNoite = new Date(Date.UTC(ano, mes - 1, dia + 1, 3, 0, 0))
  const msAteReset = meiaNoite - agora

  setTimeout(async () => {
    await resetContatadoParaProspeccao()
    await resetNaoTemInteresse()
    await assignSellersToClients()
    agendarResetMeiaNoite() // reagenda para a próxima meia-noite de Brasília
  }, msAteReset)

  console.log(`[Reset diário] Agendado para ${meiaNoite.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)
}

const app        = express()
const httpServer = createServer(app)
const io         = new SocketIO(httpServer, {
  cors: { origin: true, credentials: true },
})
setupPresence(io)

const PORT = process.env.PORT || 8000

app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '15mb' }))
app.use(express.urlencoded({ extended: true, limit: '15mb' }))

// ── Rotas ──────────────────────────────────────────
app.use('/api/auth',         authRoutes)
app.use('/api/status',       statusRoutes)
app.use('/api/sellers',      sellerRoutes)
app.use('/api/clients',      clientRoutes)
app.use('/api/catalogs',     catalogRoutes)
app.use('/api/products',     productRoutes)
app.use('/api/daily-report', dailyReportRoutes)
app.use('/api/whatsapp',     whatsappRoutes)
app.use('/api/email',        emailRoutes)
app.use('/api/prospecting',  prospectingRoutes)
app.use('/api/settings',     settingsRoutes)
app.use('/api/companies',    companyRoutes)

// ── Health check ───────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }))

// ── Serve frontend (produção) ───────────────────────
const distPath = join(__dirname, '../../client/dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')))
}

// ── Middleware global de erros ──────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }
  console.error('[Erro inesperado]', err)
  const isDev = process.env.NODE_ENV !== 'production'
  res.status(500).json({ error: isDev ? (err.message || String(err)) : 'Erro interno do servidor. Verifique os logs.' })
})

httpServer.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
  await loadConfigFromDb()
  await seedAdmin()
  resetContatadoParaProspeccao({ apenasAnteriores: true })
  resetNaoTemInteresse()
  assignSellersToClients()
  agendarResetMeiaNoite()
})
