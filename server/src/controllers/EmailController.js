import { emailService } from '../modules/email/index.js'
import { ClientModel } from '../models/ClientModel.js'

export const EmailController = {
  // GET /email/status
  async status(req, res) {
    res.json(emailService.getStatus())
  },

  // POST /email/configure
  // body: { host, port, secure, user, pass }
  async configure(req, res) {
    try {
      const { host, port, secure, user, pass } = req.body
      if (!host || !port || !user || !pass) {
        return res.status(400).json({ error: 'Preencha todos os campos: host, port, user, pass.' })
      }
      await emailService.configure({ host, port, secure, user, pass })
      res.json({ message: `Conectado como ${user}` })
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  },

  // POST /email/disconnect
  async disconnect(req, res) {
    emailService.disconnect()
    res.json({ message: 'Configuração de e-mail removida.' })
  },

  // GET /email/preview?status_id=&ufs=MT,MS
  async preview(req, res) {
    try {
      const { status_id, ufs } = req.query
      const result = await ClientModel.list({
        status_id: status_id || undefined,
        uf: ufs || undefined,
        ativo: 'true',
        limit: 9999,
        page: 1,
      })
      const clients = result.data.filter(c => c.email)
      res.json({ total: clients.length, clients })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // POST /email/send-test
  // body: { to, subject, message }
  async sendTest(req, res) {
    try {
      const { to, subject, message } = req.body
      if (!to?.trim())      return res.status(400).json({ error: 'Informe o e-mail de destino do teste.' })
      if (!subject?.trim()) return res.status(400).json({ error: 'Assunto não pode estar vazio.' })
      if (!message?.trim()) return res.status(400).json({ error: 'Mensagem não pode estar vazia.' })

      // Interpola com dados fictícios para o teste
      const resolvedSubject = subject
        .replace(/\{\{nome\}\}/gi, 'Teste')
        .replace(/\{\{cidade\}\}/gi, 'São Paulo')
        .replace(/\{\{uf\}\}/gi, 'SP')

      const resolvedHtml = message
        .replace(/\{\{nome\}\}/gi, 'Teste')
        .replace(/\{\{cidade\}\}/gi, 'São Paulo')
        .replace(/\{\{uf\}\}/gi, 'SP')

      await emailService.sendMail({ to, subject: resolvedSubject, html: resolvedHtml })
      res.json({ message: `E-mail de teste enviado para ${to}` })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // POST /email/send-bulk
  // body: { status_id, ufs, subject, message, delay_ms }
  async sendBulk(req, res) {
    try {
      const { status_id, ufs, subject, message, delay_ms = 5000 } = req.body
      if (!subject?.trim()) return res.status(400).json({ error: 'Assunto não pode estar vazio.' })
      if (!message?.trim()) return res.status(400).json({ error: 'Mensagem não pode estar vazia.' })

      const result = await ClientModel.list({
        status_id: status_id || undefined,
        uf: ufs || undefined,
        ativo: 'true',
        limit: 9999,
        page: 1,
      })
      const clients = result.data.filter(c => c.email)
      if (clients.length === 0) {
        return res.status(400).json({ error: 'Nenhum cliente com e-mail encontrado para os filtros selecionados.' })
      }

      res.json({ message: `Iniciando envio para ${clients.length} clientes...`, total: clients.length })

      emailService.sendBulk({
        clients,
        subject,
        message,
        delayMs: Math.max(2000, parseInt(delay_ms)),
        onProgress: ({ current, total, results }) => {
          console.log(`[Email] Progresso: ${current}/${total} — enviados: ${results.sent}, erros: ${results.failed}`)
        },
        onSent: async (client) => {
          try {
            await ClientModel.markContacted(client.id)
          } catch (err) {
            console.error(`[Email] Erro ao marcar ${client.nome} como contatado:`, err.message)
          }
        },
      }).then(results => {
        console.log('[Email] Envio concluído:', results)
      }).catch(err => {
        console.error('[Email] Erro fatal no envio em massa:', err.message)
        emailService.sendState = {
          status: 'done', total: clients.length, sent: 0,
          failed: clients.length, errors: [{ nome: 'Geral', email: '-', error: err.message }],
          finishedAt: new Date().toISOString(),
        }
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },
}
