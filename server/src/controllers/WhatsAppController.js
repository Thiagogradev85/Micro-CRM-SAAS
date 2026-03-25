import { whatsAppService } from '../modules/whatsapp/index.js'
import { ClientModel } from '../models/ClientModel.js'
import { AppError } from '../utils/AppError.js'

export const WhatsAppController = {
  // GET /whatsapp/status
  async status(req, res) {
    res.json(whatsAppService.getStatus())
  },

  // POST /whatsapp/connect
  async connect(req, res, next) {
    try {
      whatsAppService.connect() // não aguarda — conexão é assíncrona (QR code)
      res.json({ message: 'Conectando... aguarde o QR Code.' })
    } catch (err) {
      next(err)
    }
  },

  // POST /whatsapp/disconnect
  async disconnect(req, res, next) {
    try {
      await whatsAppService.disconnect()
      res.json({ message: 'Desconectado.' })
    } catch (err) {
      next(err)
    }
  },

  // GET /whatsapp/preview?status_id=&ufs=MT,MS,PR
  // Retorna clientes que receberão a mensagem (com WhatsApp válido)
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
      const clients = result.data.filter(c => c.whatsapp)
      res.json({ total: clients.length, clients })
    } catch (err) {
      next(err)
    }
  },

  // POST /whatsapp/send-bulk
  // body: { status_id, ufs, message, delay_ms }
  async sendBulk(req, res, next) {
    try {
      const { status_id, ufs, message, delay_ms = 5000 } = req.body
      if (!message?.trim()) throw new AppError('Mensagem não pode estar vazia.', 400)

      const result = await ClientModel.list({
        status_id: status_id || undefined,
        uf: ufs || undefined,
        ativo: 'true',
        limit: 9999,
        page: 1,
      })
      const clients = result.data.filter(c => c.whatsapp)
      if (clients.length === 0) throw new AppError('Nenhum cliente com WhatsApp encontrado para os filtros selecionados.', 400)

      res.json({ message: `Iniciando envio para ${clients.length} clientes...`, total: clients.length })

      whatsAppService.sendBulk({
        clients,
        message,
        delayMs: Math.max(3000, parseInt(delay_ms)),
        onProgress: ({ current, total, results }) => {
          console.log(`[WhatsApp] Progresso: ${current}/${total} — enviados: ${results.sent}, erros: ${results.failed}`)
        },
        onSent: async (client) => {
          try {
            await ClientModel.markContacted(client.id)
          } catch (err) {
            console.error(`[WhatsApp] Erro ao marcar cliente ${client.nome} como contatado:`, err.message)
          }
        },
      }).then(results => {
        console.log('[WhatsApp] Envio concluído:', results)
      })
    } catch (err) {
      next(err)
    }
  },
}
