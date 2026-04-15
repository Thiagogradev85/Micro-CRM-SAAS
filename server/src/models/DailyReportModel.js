import db from '../db/db.js'

export const DailyReportModel = {
  async getSummary(date, companyId) {
    const { rows } = await db.query(`
      SELECT
        e.event_type,
        COUNT(*)::int AS total
      FROM daily_report_events e
      JOIN clients c ON c.id = e.client_id
      WHERE e.event_date = $1 AND c.company_id = $2
      GROUP BY e.event_type
    `, [date, companyId])

    const summary = {
      contacted:          0,
      new_client:         0,
      catalog_requested:  0,
      purchased:          0,
    }
    for (const row of rows) {
      if (summary[row.event_type] !== undefined) {
        summary[row.event_type] = row.total
      }
    }
    return summary
  },

  async getDetails(date, companyId) {
    const { rows } = await db.query(`
      SELECT
        e.id         AS event_id,
        e.event_type,
        e.created_at,
        c.id         AS client_id,
        c.nome       AS client_nome,
        c.cidade,
        c.uf,
        c.whatsapp
      FROM daily_report_events e
      JOIN clients c ON c.id = e.client_id
      WHERE e.event_date = $1 AND c.company_id = $2
      ORDER BY e.event_type, e.created_at ASC
    `, [date, companyId])

    return {
      contacted:         rows.filter(r => r.event_type === 'contacted'),
      new_clients:       rows.filter(r => r.event_type === 'new_client'),
      catalog_requested: rows.filter(r => r.event_type === 'catalog_requested'),
      purchased:         rows.filter(r => r.event_type === 'purchased'),
    }
  },

  async deleteEvent(id) {
    const { rowCount } = await db.query(
      `DELETE FROM daily_report_events WHERE id = $1`, [id]
    )
    return rowCount > 0
  },

  // Lista datas que têm eventos (para o calendário/histórico)
  async listDatesWithEvents(companyId) {
    const { rows } = await db.query(`
      SELECT DISTINCT e.event_date
      FROM daily_report_events e
      JOIN clients c ON c.id = e.client_id
      WHERE c.company_id = $1
      ORDER BY e.event_date DESC
      LIMIT 90
    `, [companyId])
    return rows.map(r => r.event_date)
  },
}
