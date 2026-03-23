import { ProductModel } from '../models/ProductModel.js'

export const ProductController = {
  async list(req, res) {
    try { res.json(await ProductModel.list()) }
    catch (err) { res.status(500).json({ error: err.message }) }
  },
  async get(req, res) {
    try {
      const data = await ProductModel.get(req.params.id)
      if (!data) return res.status(404).json({ error: 'Produto não encontrado' })
      res.json(data)
    } catch (err) { res.status(500).json({ error: err.message }) }
  },
  async create(req, res) {
    try { res.status(201).json(await ProductModel.create(null, req.body)) }
    catch (err) { res.status(500).json({ error: err.message }) }
  },
  async update(req, res) {
    try {
      const data = await ProductModel.update(req.params.id, req.body)
      if (!data) return res.status(404).json({ error: 'Produto não encontrado' })
      res.json(data)
    } catch (err) { res.status(500).json({ error: err.message }) }
  },
  async delete(req, res) {
    try {
      await ProductModel.delete(req.params.id)
      res.status(204).end()
    } catch (err) { res.status(500).json({ error: err.message }) }
  },
}
