import busboy from 'busboy'
import { ClientModel } from '../models/ClientModel.js'
import { importExcel } from '../modules/file-import/index.js'
import { toExcel, toPDF } from '../modules/file-export/index.js'
import { AppError } from '../utils/AppError.js'
import { normalize, nameSimilar } from '../modules/prospecting/deduplication.js'

function readFileFromRequest(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers })
    const chunks = []
    let gotFile = false
    bb.on('file', (_field, fileStream) => {
      gotFile = true
      fileStream.on('data', chunk => chunks.push(chunk))
      fileStream.on('end', () => {})
    })
    bb.on('close', () => {
      if (!gotFile || chunks.length === 0) return reject(new AppError('Arquivo não enviado', 400))
      resolve(Buffer.concat(chunks))
    })
    bb.on('error', err => reject(new AppError(err.message, 422)))
    req.on('data', chunk => bb.write(chunk))
    req.on('end', () => bb.end())
    req.on('error', reject)
  })
}

export const ClientController = {
  async list(req, res, next) {
    try {
      const { uf, status_id, ativo, ja_cliente, search, page, limit, sort } = req.query
      const result = await ClientModel.list({
        uf,
        status_id: status_id ? parseInt(status_id) : undefined,
        ativo: ativo !== undefined && ativo !== '' ? ativo === 'true' : undefined,
        ja_cliente: ja_cliente !== undefined && ja_cliente !== '' ? ja_cliente === 'true' : undefined,
        search,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        sort: sort || 'created_at',
      })
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async get(req, res, next) {
    try {
      const data = await ClientModel.get(req.params.id)
      if (!data) throw new AppError('Cliente não encontrado', 404)
      res.json(data)
    } catch (err) {
      next(err)
    }
  },

  async create(req, res, next) {
    try {
      const { nome, uf } = req.body
      if (!nome?.trim()) throw new AppError('Nome é obrigatório.', 422)
      if (!uf?.trim())   throw new AppError('UF é obrigatória.', 422)
      const data = await ClientModel.create(req.body)
      res.status(201).json(data)
    } catch (err) {
      if (err.code === '23505') return next(new AppError('Já existe um cliente com este nome neste estado (UF).', 409))
      next(err)
    }
  },

  async update(req, res, next) {
    try {
      const { nome, uf } = req.body
      if (nome !== undefined && !nome?.trim()) throw new AppError('Nome é obrigatório.', 422)
      if (uf   !== undefined && !uf?.trim())   throw new AppError('UF é obrigatória.', 422)
      const data = await ClientModel.update(req.params.id, req.body)
      if (!data) throw new AppError('Cliente não encontrado', 404)
      res.json(data)
    } catch (err) {
      next(err)
    }
  },

  // Soft delete (inativa) ou hard delete (apaga), conforme ?permanent=true
  async delete(req, res, next) {
    try {
      if (req.query.permanent === 'true') {
        await ClientModel.destroy(req.params.id)
        return res.json({ message: 'Cliente excluído permanentemente' })
      }
      const data = await ClientModel.deactivate(req.params.id)
      if (!data) throw new AppError('Cliente não encontrado', 404)
      res.json({ message: 'Cliente inativado com sucesso', client: data })
    } catch (err) {
      next(err)
    }
  },

  // Registra compra no relatório diário
  async registerPurchase(req, res, next) {
    try {
      await ClientModel.registerPurchase(req.params.id)
      res.json({ message: 'Compra registrada no relatório diário' })
    } catch (err) {
      next(err)
    }
  },

  // Observações
  async listObservations(req, res, next) {
    try {
      const data = await ClientModel.listObservations(req.params.id)
      res.json(data)
    } catch (err) {
      next(err)
    }
  },

  async addObservation(req, res, next) {
    try {
      const { texto } = req.body
      if (!texto) throw new AppError('Texto obrigatório', 400)
      const data = await ClientModel.addObservation(req.params.id, texto)
      res.status(201).json(data)
    } catch (err) {
      next(err)
    }
  },

  async deleteObservation(req, res, next) {
    try {
      await ClientModel.deleteObservation(req.params.obsId)
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },

  // Exportação Excel / PDF (respeita os mesmos filtros da listagem)
  async exportClients(req, res, next) {
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
      next(err)
    }
  },

  // Importação via Excel
  async importExcel(req, res, next) {
    try {
      const fileBuffer = await readFileFromRequest(req)
      const records = await importExcel(fileBuffer)
      const result = await ClientModel.bulkUpsert(records)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  // Clientes sem contato há mais de N dias (padrão: 3)
  // Exclui clientes criados hoje ("Novos")
  async getOverdue(req, res, next) {
    try {
      const days = parseInt(req.query.days) || 3
      const clients = await ClientModel.getOverdue(days)
      res.json(clients)
    } catch (err) {
      next(err)
    }
  },

  // GET /clients/duplicates
  // Varre todos os clientes ativos e agrupa possíveis duplicatas por nome
  // similar ou telefone igual.
  async findDuplicates(req, res, next) {
    try {
      const result = await ClientModel.list({ ativo: 'true', limit: 9999, page: 1 })
      const clients = result.data

      const visited = new Set()
      const groups  = []

      for (let i = 0; i < clients.length; i++) {
        if (visited.has(clients[i].id)) continue

        const nameA  = normalize(clients[i].nome)
        const phoneA = (clients[i].whatsapp || clients[i].telefone || '').replace(/\D/g, '')
        const group  = [clients[i]]

        for (let j = i + 1; j < clients.length; j++) {
          if (visited.has(clients[j].id)) continue

          const nameB  = normalize(clients[j].nome)
          const phoneB = (clients[j].whatsapp || clients[j].telefone || '').replace(/\D/g, '')

          const match =
            (phoneA && phoneB && phoneA === phoneB) ||
            nameSimilar(nameA, nameB)

          if (match) {
            group.push(clients[j])
            visited.add(clients[j].id)
          }
        }

        if (group.length > 1) {
          visited.add(clients[i].id)
          groups.push(group)
        }
      }

      res.json({ total: groups.length, groups })
    } catch (err) {
      next(err)
    }
  },
}
