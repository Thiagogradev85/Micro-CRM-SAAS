import { DailyReportModel } from '../models/DailyReportModel.js'
import { generateReportPdf } from '../modules/file-export/index.js'

export const DailyReportController = {
  async getSummary(req, res) {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0]
      const summary = await DailyReportModel.getSummary(date)
      res.json({ date, summary })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async getDetails(req, res) {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0]
      const details = await DailyReportModel.getDetails(date)
      const summary = await DailyReportModel.getSummary(date)
      res.json({ date, summary, details })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async listDates(req, res) {
    try {
      const dates = await DailyReportModel.listDatesWithEvents()
      res.json(dates)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  },

  async downloadPdf(req, res) {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0]
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
      res.status(500).json({ error: err.message })
    }
  },
}
