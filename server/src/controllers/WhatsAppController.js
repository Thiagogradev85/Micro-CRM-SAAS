import { whatsAppService } from '../modules/whatsapp/index.js'
import { ClientModel } from '../models/ClientModel.js'

export const WhatsAppController = {
  // GET /whatsapp/status
  async status(req, res) {
    res.json(whatsAppService.getStatus())
  },

  // POST /whatsapp/connect
  async connect(req, res) {
    try {
      whatsAppService.connect() // não aguarda — conexão é assíncrona (QR code)
      res.json({ message: 'Conectando... aguarde o QR Code.' })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // POST /whatsapp/disconnect
  async disconnect(req, res) {
    try {
      await whatsAppService.disconnect()
      res.json({ message: 'Desconectado.' })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // GET /whatsapp/preview?status_id=&ufs=MT,MS,PR
  // Retorna clientes que receberão a mensagem (com WhatsApp válido)
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
      const clients = result.data.filter(c => c.whatsapp)
      res.json({ total: clients.length, clients })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // POST /whatsapp/send-bulk
  // body: { status_id, ufs, message, delay_ms }
  async sendBulk(req, res) {
    try {
      const { status_id, ufs, message, delay_ms = 5000 } = req.body
      if (!message?.trim()) return res.status(400).json({ error: 'Mensagem não pode estar vazia.' })

      const result = await ClientModel.list({
        status_id: status_id || undefined,
        uf: ufs || undefined,
        ativo: 'true',
        limit: 9999,
        page: 1,
      })
      const clients = result.data.filter(c => c.whatsapp)
      if (clients.length === 0) return res.status(400).json({ error: 'Nenhum cliente com WhatsApp encontrado para os filtros selecionados.' })

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
      res.status(500).json({ error: err.message })
    }
  },
}
