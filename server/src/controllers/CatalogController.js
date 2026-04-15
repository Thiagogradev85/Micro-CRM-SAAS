import { CatalogModel } from '../models/CatalogModel.js'
import { ProductModel } from '../models/ProductModel.js'
import { importCatalogPdf } from '../modules/ai-import/index.js'
import { AppError } from '../utils/AppError.js'

export const CatalogController = {
  async list(req, res, next) {
    try {
      res.json(await CatalogModel.list(req.user.company_id))
    } catch (err) { next(err) }
  },

  async get(req, res, next) {
    try {
      const catalog = await CatalogModel.get(req.params.id, req.user.company_id)
      if (!catalog) throw new AppError('Catálogo não encontrado', 404)
      const products = await ProductModel.listByCatalog(req.params.id)
      res.json({ ...catalog, products })
    } catch (err) { next(err) }
  },

  async create(req, res, next) {
    try {
      res.status(201).json(await CatalogModel.create(req.body, req.user.company_id))
    } catch (err) { next(err) }
  },

  async update(req, res, next) {
    try {
      const data = await CatalogModel.update(req.params.id, req.body, req.user.company_id)
      if (!data) throw new AppError('Catálogo não encontrado', 404)
      res.json(data)
    } catch (err) { next(err) }
  },

  async delete(req, res, next) {
    try {
      await CatalogModel.delete(req.params.id, req.user.company_id)
      res.status(204).end()
    } catch (err) { next(err) }
  },

  async listProducts(req, res, next) {
    try {
      res.json(await ProductModel.listByCatalog(req.params.id))
    } catch (err) { next(err) }
  },

  async getProduct(req, res, next) {
    try {
      const data = await ProductModel.get(req.params.prodId)
      if (!data) throw new AppError('Produto não encontrado', 404)
      res.json(data)
    } catch (err) { next(err) }
  },

  async createProduct(req, res, next) {
    try {
      const product = await ProductModel.create(null, req.body)
      await ProductModel.linkToCatalog(req.params.id, product.id)
      res.status(201).json(product)
    } catch (err) { next(err) }
  },

  async addProduct(req, res, next) {
    try {
      const { product_id } = req.body
      const product = await ProductModel.get(product_id)
      if (!product) throw new AppError('Produto não encontrado', 404)
      await ProductModel.linkToCatalog(req.params.id, product_id)
      res.json(product)
    } catch (err) { next(err) }
  },

  async removeProduct(req, res, next) {
    try {
      await ProductModel.unlinkFromCatalog(req.params.id, req.params.prodId)
      res.status(204).end()
    } catch (err) { next(err) }
  },

  async catalogPdf(req, res, next) {
    try {
      const catalog = await CatalogModel.get(req.params.id, req.user.company_id)
      if (!catalog) throw new AppError('Catálogo não encontrado', 404)
      const products = await ProductModel.listByCatalog(req.params.id)
      const { generateCatalogPdf } = await import('../modules/file-export/index.js')
      const pdfBuffer = await generateCatalogPdf({ catalog, products })
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="catalogo-${catalog.nome.replace(/\s+/g, '-')}.pdf"`)
      res.send(pdfBuffer)
    } catch (err) { next(err) }
  },

  async updateProduct(req, res, next) {
    try {
      const data = await ProductModel.update(req.params.prodId, req.body)
      if (!data) throw new AppError('Produto não encontrado', 404)
      res.json(data)
    } catch (err) { next(err) }
  },

  async updateStock(req, res, next) {
    try {
      const { estoque } = req.body
      const data = await ProductModel.updateStock(req.params.prodId, estoque)
      if (!data) throw new AppError('Produto não encontrado', 404)
      res.json(data)
    } catch (err) { next(err) }
  },

  async deleteProduct(req, res, next) {
    try {
      await ProductModel.delete(req.params.prodId)
      res.status(204).end()
    } catch (err) { next(err) }
  },

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
        const product = await ProductModel.create(null, {
          tipo: p.tipo || null, modelo: p.modelo || null, motor: p.motor || null,
          bateria: p.bateria || null, velocidade_min: p.velocidade_min || null,
          velocidade_max: p.velocidade_max || null, autonomia: p.autonomia || null,
          pneu: p.pneu || null, suspensao: p.suspensao || null, carregador: p.carregador || null,
          impermeabilidade: p.impermeabilidade || null, cambio: p.cambio || null,
          peso_bruto: p.peso_bruto || null, peso_liquido: p.peso_liquido || null,
          preco: p.preco || null, estoque: 0, imagem: null, extra: p.extra || null,
        })
        await ProductModel.linkToCatalog(req.params.id, product.id)
        created.push(product)
      }
      res.json({ created: created.length, products: created })
    } catch (err) {
      if (err instanceof AppError) return next(err)
      next(new AppError(err.message || 'Erro ao importar PDF.', 422))
    }
  },
}
