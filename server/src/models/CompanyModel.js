import db from '../db/db.js'

export const CompanyModel = {
  async list() {
    const { rows } = await db.query(`
      SELECT c.*, COUNT(u.id)::int AS user_count
      FROM companies c
      LEFT JOIN users u ON u.company_id = c.id
      GROUP BY c.id
      ORDER BY c.nome ASC
    `)
    return rows
  },

  async get(id) {
    const { rows } = await db.query(
      `SELECT c.*, COUNT(u.id)::int AS user_count
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    )
    return rows[0] || null
  },

  async create({ nome }) {
    const { rows } = await db.query(
      `INSERT INTO companies (nome) VALUES ($1) RETURNING *`,
      [nome.trim()]
    )
    return rows[0]
  },

  async update(id, { nome, ativo }) {
    const sets = []
    const vals = []
    let i = 1

    if (nome  !== undefined) { sets.push(`nome = $${i++}`);  vals.push(nome.trim()) }
    if (ativo !== undefined) { sets.push(`ativo = $${i++}`); vals.push(ativo) }

    if (sets.length === 0) return this.get(id)

    vals.push(id)
    const { rows } = await db.query(
      `UPDATE companies SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    )
    return rows[0] || null
  },

  async delete(id) {
    await db.query(`DELETE FROM companies WHERE id = $1`, [id])
  },

  // Retorna todos os usuários de uma empresa
  async listUsers(companyId) {
    const { rows } = await db.query(
      `SELECT id, nome, email, role, ativo, created_at, company_id
       FROM users WHERE company_id = $1 ORDER BY nome ASC`,
      [companyId]
    )
    return rows
  },
}
