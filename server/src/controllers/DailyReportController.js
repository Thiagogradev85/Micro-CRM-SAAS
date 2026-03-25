import { DailyReportModel } from '../models/DailyReportModel.js'
import { generateReportPdf } from '../modules/file-export/index.js'

export const DailyReportController = {
  async getSummary(req, res, next) {
    try {
      const date = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const summary = await DailyReportModel.getSummary(date)
      res.json({ date, summary })
    } catch (err) {
      next(err)
    }
  },

  async getDetails(req, res, next) {
    try {
      const date = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const details = await DailyReportModel.getDetails(date)
      const summary = await DailyReportModel.getSummary(date)
      res.json({ date, summary, details })
    } catch (err) {
      next(err)
    }
  },

  async listDates(req, res, next) {
    try {
      const dates = await DailyReportModel.listDatesWithEvents()
      res.json(dates)
    } catch (err) {
      next(err)
    }
  },

  async downloadPdf(req, res, next) {
    try {
      const date = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const details = await DailyReportModel.getDetails(date)
      const summary = await DailyReportModel.getSummary(date)

      const pdfBuffer = await generateReportPdf({ date, summary, details })

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="relatorio-${date}.pdf"`
      )
      res.send(pdfBuffer)
    } catch (err) {
      next(err)
    }
  },
}
