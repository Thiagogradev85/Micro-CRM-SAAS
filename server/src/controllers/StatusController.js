import { StatusModel } from '../models/StatusModel.js'
import { AppError } from '../utils/AppError.js'

export const StatusController = {
  async list(req, res, next) {
    try {
      const data = await StatusModel.list()
      res.json(data)
    } catch (err) {
      next(err)
    }
  },

  async get(req, res, next) {
    try {
      const data = await StatusModel.get(req.params.id)
      if (!data) throw new AppError('Status não encontrado', 404)
      res.json(data)
    } catch (err) {
      next(err)
    }
  },

  async create(req, res, next) {
    try {
      const data = await StatusModel.create(req.body)
      res.status(201).json(data)
    } catch (err) {
      next(err)
    }
  },

  async update(req, res, next) {
    try {
      const data = await StatusModel.update(req.params.id, req.body)
      if (!data) throw new AppError('Status não encontrado', 404)
      res.json(data)
    } catch (err) {
      next(err)
    }
  },

  async delete(req, res, next) {
    try {
      await StatusModel.delete(req.params.id)
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },
}
