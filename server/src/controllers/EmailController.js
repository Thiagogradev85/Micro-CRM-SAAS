import { emailService }       from '../modules/email/index.js'
import { ClientModel }         from '../models/ClientModel.js'
import { CatalogModel }        from '../models/CatalogModel.js'
import { ProductModel }        from '../models/ProductModel.js'
import { generateCatalogPdf }  from '../modules/file-export/generateCatalogPdf.js'
import { AppError }            from '../utils/AppError.js'

// Monta o array de attachments nodemailer a partir da request
// Suporta: arquivo uploaded (req.file) OU catálogo do CRM (req.body.catalog_id)
async function buildAttachments(req) {
  const attachments = []

  if (req.file) {
    attachments.push({
      filename:    req.file.originalname,
      content:     req.file.buffer,
      contentType: req.file.mimetype,
    })
    return attachments
  }

  const catalogId = req.body?.catalog_id
  if (catalogId) {
    const catalog  = await CatalogModel.get(catalogId)
    if (!catalog) throw new AppError('Catálogo não encontrado.', 404)
    const products = await ProductModel.listByCatalog(catalogId)
    const pdfBuffer = await generateCatalogPdf({ catalog, products })
    const safeName  = catalog.nome.replace(/[^a-z0-9áéíóúâêôãõüç\s-]/gi, '').trim().replace(/\s+/g, '_')
    attachments.push({
      filename:    `${safeName}.pdf`,
      content:     pdfBuffer,
      contentType: 'application/pdf',
    })
  }

  return attachments
}

export const EmailController = {
  // GET /email/status
  async status(req, res) {
    res.json(emailService.getStatus())
  },

  // POST /email/configure
  // body: { host, port, secure, user, pass }
  async configure(req, res, next) {
    try {
      const { host, port, secure, user, pass } = req.body
      if (!host || !port || !user || !pass) {
        throw new AppError('Preencha todos os campos: host, port, user, pass.', 400)
      }
      await emailService.configure({ host, port, secure, user, pass })
      res.json({ message: `Conectado como ${user}` })
    } catch (err) {
      next(err instanceof AppError ? err : new AppError(err.message, 400))
    }
  },

  // POST /email/disconnect
  async disconnect(req, res) {
    emailService.disconnect()
    res.json({ message: 'Configuração de e-mail removida.' })
  },

  // GET /email/preview?status_id=&ufs=MT,MS
  async preview(req, res, next) {
    try {
      const { status_id, ufs } = req.query
      const result = await ClientModel.list({
        status_id: status_id || undefined,
        uf: ufs || undefined,
        ativo: 'true',
        limit: 9999,
        page: 1,
      })
      const clients    = result.data.filter(c => c.email)
      const noEmail    = result.data.length - clients.length
      res.json({ total: clients.length, clients, noEmail })
    } catch (err) {
      next(err)
    }
  },

  // POST /email/send-test
  // body: { to, subject, message }
  async sendTest(req, res, next) {
    try {
      const { to, subject, message } = req.body
      if (!to?.trim())      throw new AppError('Informe o e-mail de destino do teste.', 400)
      if (!subject?.trim()) throw new AppError('Assunto não pode estar vazio.', 400)
      if (!message?.trim()) throw new AppError('Mensagem não pode estar vazia.', 400)

      if (emailService.status !== 'connected') {
        throw new AppError('E-mail não está configurado. Configure a conexão SMTP primeiro.', 400)
      }

      // Interpola com dados fictícios para o teste
      const resolvedSubject = subject
        .replace(/\{\{nome\}\}/gi, 'Teste')
        .replace(/\{\{cidade\}\}/gi, 'São Paulo')
        .replace(/\{\{uf\}\}/gi, 'SP')

      const resolvedHtml = message
        .replace(/\{\{nome\}\}/gi, 'Teste')
        .replace(/\{\{cidade\}\}/gi, 'São Paulo')
        .replace(/\{\{uf\}\}/gi, 'SP')

      const attachments = await buildAttachments(req)
      await emailService.sendMail({ to, subject: resolvedSubject, html: resolvedHtml, attachments })
      const anexoMsg = attachments.length ? ` (com anexo: ${attachments[0].filename})` : ''
      res.json({ message: `E-mail de teste enviado para ${to}${anexoMsg}` })
    } catch (err) {
      next(err instanceof AppError ? err : new AppError(err.message, 400))
    }
  },

  // POST /email/send-bulk
  // body: { status_id, ufs, subject, message, delay_ms }
  async sendBulk(req, res, next) {
    try {
      const { status_id, ufs, subject, message, delay_ms = 5000 } = req.body
      if (!subject?.trim()) throw new AppError('Assunto não pode estar vazio.', 400)
      if (!message?.trim()) throw new AppError('Mensagem não pode estar vazia.', 400)

      const result = await ClientModel.list({
        status_id: status_id || undefined,
        uf: ufs || undefined,
        ativo: 'true',
        limit: 9999,
        page: 1,
      })
      const clients = result.data.filter(c => c.email)
      if (clients.length === 0) {
        throw new AppError('Nenhum cliente com e-mail encontrado para os filtros selecionados.', 400)
      }

      const attachments = await buildAttachments(req)

      res.json({ message: `Iniciando envio para ${clients.length} clientes...`, total: clients.length })

      emailService.sendBulk({
        clients,
        subject,
        message,
        attachments,
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
      next(err)
    }
  },
}
