import { ProductModel } from '../models/ProductModel.js'
import { AppError } from '../utils/AppError.js'

export const ProductController = {
  async list(req, res, next) {
    try { res.json(await ProductModel.list()) }
    catch (err) { next(err) }
  },
  async get(req, res, next) {
    try {
      const data = await ProductModel.get(req.params.id)
      if (!data) throw new AppError('Produto não encontrado', 404)
      res.json(data)
    } catch (err) { next(err) }
  },
  async create(req, res, next) {
    try { res.status(201).json(await ProductModel.create(null, req.body)) }
    catch (err) { next(err) }
  },
  async update(req, res, next) {
    try {
      const data = await ProductModel.update(req.params.id, req.body)
      if (!data) throw new AppError('Produto não encontrado', 404)
      res.json(data)
    } catch (err) { next(err) }
  },
  async delete(req, res, next) {
    try {
      await ProductModel.delete(req.params.id)
      res.status(204).end()
    } catch (err) { next(err) }
  },
}
