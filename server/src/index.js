import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import statusRoutes      from './routes/status.js'
import sellerRoutes      from './routes/sellers.js'
import clientRoutes      from './routes/clients.js'
import catalogRoutes     from './routes/catalogs.js'
import productRoutes     from './routes/products.js'
import dailyReportRoutes from './routes/dailyReport.js'
import { AppError }      from './utils/AppError.js'
import db                from './db/db.js'

dotenv.config()

// ── Reset diário: Contatado → Prospecção à meia-noite ──
async function resetContatadoParaProspeccao() {
  try {
    const { rowCount } = await db.query(`
      UPDATE clients
      SET status_id  = (SELECT id FROM status WHERE nome = 'Prospecção' LIMIT 1),
          updated_at = NOW()
      WHERE status_id = (SELECT id FROM status WHERE nome = 'Contatado' LIMIT 1)
        AND ativo = true
    `)
    if (rowCount > 0) {
      console.log(`[Reset diário] ${rowCount} cliente(s) voltaram para Prospecção.`)
    }
  } catch (err) {
    console.error('[Reset diário] Erro:', err.message)
  }
}

function agendarResetMeiaNoite() {
  const agora = new Date()
  const meiaNoite = new Date()
  meiaNoite.setHours(24, 0, 0, 0) // próxima meia-noite
  const msAteResetE = meiaNoite - agora

  setTimeout(async () => {
    await resetContatadoParaProspeccao()
    agendarResetMeiaNoite() // reagenda para a próxima meia-noite
  }, msAteResetE)

  console.log(`[Reset diário] Agendado para ${meiaNoite.toLocaleString('pt-BR')}`)
}

const app = express()
const PORT = process.env.PORT || 8000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Rotas ──────────────────────────────────────────
app.use('/status',       statusRoutes)
app.use('/sellers',      sellerRoutes)
app.use('/clients',      clientRoutes)
app.use('/catalogs',     catalogRoutes)
app.use('/products',     productRoutes)
app.use('/daily-report', dailyReportRoutes)

// ── Health check ───────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }))

// ── Middleware global de erros ──────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }
  console.error('[Erro inesperado]', err)
  res.status(500).json({ error: 'Erro interno do servidor. Verifique os logs.' })
})

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
  agendarResetMeiaNoite()
})
