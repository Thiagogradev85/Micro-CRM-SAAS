import db from '../db/db.js'

export const StatusModel = {
  async list(companyId) {
    const { rows } = await db.query(
      'SELECT * FROM status WHERE company_id = $1 ORDER BY ordem ASC',
      [companyId]
    )
    return rows
  },

  async get(id, companyId) {
    const { rows } = await db.query(
      'SELECT * FROM status WHERE id = $1 AND company_id = $2',
      [id, companyId]
    )
    return rows[0] || null
  },

  async create({ nome, cor = '#6b7280', ordem = 0 }, companyId) {
    const { rows } = await db.query(
      'INSERT INTO status (nome, cor, ordem, company_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, cor, ordem, companyId]
    )
    return rows[0]
  },

  async update(id, { nome, cor, ordem }, companyId) {
    const { rows } = await db.query(
      `UPDATE status
       SET nome  = COALESCE($1, nome),
           cor   = COALESCE($2, cor),
           ordem = COALESCE($3, ordem)
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [nome, cor, ordem, id, companyId]
    )
    return rows[0] || null
  },

  async delete(id, companyId) {
    await db.query('DELETE FROM status WHERE id = $1 AND company_id = $2', [id, companyId])
  },
}
