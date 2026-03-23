import { ClientModel } from '../models/ClientModel.js'
import { importExcel } from '../modules/file-import/index.js'
import { toExcel, toPDF } from '../modules/file-export/index.js'

export const ClientController = {
  async list(req, res) {
    try {
      const { uf, status_id, ativo, search, page, limit, sort } = req.query
      const result = await ClientModel.list({
        uf,
        status_id: status_id ? parseInt(status_id) : undefined,
        ativo: ativo !== undefined && ativo !== '' ? ativo === 'true' : undefined,
        search,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        sort: sort || 'created_at',
      })
      res.json(result)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async get(req, res) {
    try {
      const data = await ClientModel.get(req.params.id)
      if (!data) return res.status(404).json({ error: 'Cliente não encontrado' })
      res.json(data)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async create(req, res) {
    try {
      const data = await ClientModel.create(req.body)
      res.status(201).json(data)
    } catch (err) {
      // Violação de chave única (nome + uf duplicado)
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Já existe um cliente com este nome neste estado (UF).' })
      }
      res.status(500).json({ error: err.message })
    }
  },

  async update(req, res) {
    try {
      const data = await ClientModel.update(req.params.id, req.body)
      if (!data) return res.status(404).json({ error: 'Cliente não encontrado' })
      res.json(data)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // Soft delete (inativa) ou hard delete (apaga), conforme ?permanent=true
  async delete(req, res) {
    try {
      if (req.query.permanent === 'true') {
        await ClientModel.destroy(req.params.id)
        return res.json({ message: 'Cliente excluído permanentemente' })
      }
      const data = await ClientModel.deactivate(req.params.id)
      if (!data) return res.status(404).json({ error: 'Cliente não encontrado' })
      res.json({ message: 'Cliente inativado com sucesso', client: data })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // Registra compra no relatório diário
  async registerPurchase(req, res) {
    try {
      await ClientModel.registerPurchase(req.params.id)
      res.json({ message: 'Compra registrada no relatório diário' })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // Observações
  async listObservations(req, res) {
    try {
      const data = await ClientModel.listObservations(req.params.id)
      res.json(data)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async addObservation(req, res) {
    try {
      const { texto } = req.body
      if (!texto) return res.status(400).json({ error: 'Texto obrigatório' })
      const data = await ClientModel.addObservation(req.params.id, texto)
      res.status(201).json(data)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async deleteObservation(req, res) {
    try {
      await ClientModel.deleteObservation(req.params.obsId)
      res.status(204).end()
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // Exportação Excel / PDF (respeita os mesmos filtros da listagem)
  async exportClients(req, res) {
    try {
      const { uf, status_id, ativo, search, format = 'xlsx' } = req.query
      const result = await ClientModel.list({
        uf,
        status_id: status_id ? parseInt(status_id) : undefined,
        ativo: ativo !== undefined && ativo !== '' ? ativo === 'true' : undefined,
        search,
        limit: 9999,
        page: 1,
        sort: 'uf',
      })
      const clients = result.data

      if (format === 'pdf') {
        const buf = await toPDF(clients)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'attachment; filename="clientes.pdf"')
        return res.send(buf)
      }

      const buf = await toExcel(clients)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="clientes.xlsx"')
      return res.send(buf)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // Importação via Excel
  async importExcel(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' })
      const records = await importExcel(req.file.buffer)
      const result = await ClientModel.bulkUpsert(records)
      res.json(result)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },
}
