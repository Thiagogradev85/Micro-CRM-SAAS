import { CompanyModel } from '../models/CompanyModel.js'
import { AppError }     from '../utils/AppError.js'

export const CompanyController = {
  async list(req, res, next) {
    try {
      res.json(await CompanyModel.list())
    } catch (err) { next(err) }
  },

  async get(req, res, next) {
    try {
      const company = await CompanyModel.get(req.params.id)
      if (!company) throw new AppError('Empresa não encontrada.', 404)
      res.json(company)
    } catch (err) { next(err) }
  },

  async create(req, res, next) {
    try {
      const { nome } = req.body
      if (!nome) throw new AppError('Nome da empresa é obrigatório.', 400)
      res.status(201).json(await CompanyModel.create({ nome }))
    } catch (err) { next(err) }
  },

  async update(req, res, next) {
    try {
      const updated = await CompanyModel.update(req.params.id, req.body)
      if (!updated) throw new AppError('Empresa não encontrada.', 404)
      res.json(updated)
    } catch (err) { next(err) }
  },

  async delete(req, res, next) {
    try {
      await CompanyModel.delete(req.params.id)
      res.status(204).end()
    } catch (err) { next(err) }
  },

  async listUsers(req, res, next) {
    try {
      res.json(await CompanyModel.listUsers(req.params.id))
    } catch (err) { next(err) }
  },
}
