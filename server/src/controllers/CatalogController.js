import { CatalogModel } from '../models/CatalogModel.js'
import { ProductModel } from '../models/ProductModel.js'
import { importCatalogPdf } from '../modules/ai-import/index.js'
import { AppError } from '../utils/AppError.js'

export const CatalogController = {
  async list(req, res) {
    try {
      res.json(await CatalogModel.list())
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async get(req, res) {
    try {
      const catalog = await CatalogModel.get(req.params.id)
      if (!catalog) return res.status(404).json({ error: 'Catálogo não encontrado' })
      const products = await ProductModel.listByCatalog(req.params.id)
      res.json({ ...catalog, products })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async create(req, res) {
    try {
      res.status(201).json(await CatalogModel.create(req.body))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async update(req, res) {
    try {
      const data = await CatalogModel.update(req.params.id, req.body)
      if (!data) return res.status(404).json({ error: 'Catálogo não encontrado' })
      res.json(data)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async delete(req, res) {
    try {
      await CatalogModel.delete(req.params.id)
      res.status(204).end()
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // Produtos do catálogo
  async listProducts(req, res) {
    try {
      res.json(await ProductModel.listByCatalog(req.params.id))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async getProduct(req, res) {
    try {
      const data = await ProductModel.get(req.params.prodId)
      if (!data) return res.status(404).json({ error: 'Produto não encontrado' })
      res.json(data)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async createProduct(req, res) {
    try {
      res.status(201).json(await ProductModel.create(req.params.id, req.body))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async updateProduct(req, res) {
    try {
      const data = await ProductModel.update(req.params.prodId, req.body)
      if (!data) return res.status(404).json({ error: 'Produto não encontrado' })
      res.json(data)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async updateStock(req, res) {
    try {
      const { estoque } = req.body
      const data = await ProductModel.updateStock(req.params.prodId, estoque)
      if (!data) return res.status(404).json({ error: 'Produto não encontrado' })
      res.json(data)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async deleteProduct(req, res) {
    try {
      await ProductModel.delete(req.params.prodId)
      res.status(204).end()
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  // Importação de produtos via PDF do catálogo (leitura por IA)
  async importPdf(req, res, next) {
    try {
      if (!req.file) throw new AppError('Arquivo PDF não enviado', 400)

      const products = await importCatalogPdf(req.file.buffer)

      if (products.length === 0) {
        throw new AppError(
          'Nenhum produto encontrado no PDF. Verifique se o arquivo contém texto selecionável (não é uma imagem escaneada) e se os produtos possuem campos como Motor, Bateria ou Velocidade.',
          422
        )
      }

      const created = []
      for (const p of products) {
        const product = await ProductModel.create(req.params.id, {
          tipo:             p.tipo             || null,
          modelo:           p.modelo           || null,
          motor:            p.motor            || null,
          bateria:          p.bateria          || null,
          velocidade_min:   p.velocidade_min   || null,
          velocidade_max:   p.velocidade_max   || null,
          autonomia:        p.autonomia        || null,
          pneu:             p.pneu             || null,
          suspensao:        p.suspensao        || null,
          carregador:       p.carregador       || null,
          impermeabilidade: p.impermeabilidade || null,
          cambio:           p.cambio           || null,
          peso_bruto:       p.peso_bruto       || null,
          peso_liquido:     p.peso_liquido     || null,
          preco:            p.preco            || null,
          estoque:          0,
          imagem:           null,
          extra:            p.extra            || null,
        })
        created.push(product)
      }

      res.json({ created: created.length, products: created })
    } catch (err) {
      // Garante que erros do service aparecem para o usuário com mensagem clara
      if (err instanceof AppError) return next(err)
      next(new AppError(err.message || 'Erro ao importar PDF.', 422))
    }
  },
}
