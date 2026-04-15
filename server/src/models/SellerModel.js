import db from '../db/db.js'

export const SellerModel = {
  async list(companyId) {
    const { rows } = await db.query(`
      SELECT s.*,
             COALESCE(
               json_agg(su.uf ORDER BY su.uf) FILTER (WHERE su.uf IS NOT NULL),
               '[]'
             ) AS ufs
      FROM sellers s
      LEFT JOIN seller_ufs su ON su.seller_id = s.id
      WHERE s.company_id = $1
      GROUP BY s.id
      ORDER BY s.nome ASC
    `, [companyId])
    return rows
  },

  async get(id, companyId) {
    const { rows } = await db.query(`
      SELECT s.*,
             COALESCE(
               json_agg(su.uf ORDER BY su.uf) FILTER (WHERE su.uf IS NOT NULL),
               '[]'
             ) AS ufs
      FROM sellers s
      LEFT JOIN seller_ufs su ON su.seller_id = s.id
      WHERE s.id = $1 AND s.company_id = $2
      GROUP BY s.id
    `, [id, companyId])
    return rows[0] || null
  },

  // Retorna UFs já ocupadas por outros vendedores da mesma empresa (exceto excludeId)
  async takenUFs(companyId, excludeSellerId = null) {
    const { rows } = await db.query(
      `SELECT su.uf
       FROM seller_ufs su
       JOIN sellers s ON s.id = su.seller_id
       WHERE s.company_id = $1
         AND s.ativo = true
         AND ($2::int IS NULL OR s.id <> $2)`,
      [companyId, excludeSellerId]
    )
    return rows.map(r => r.uf)
  },

  // Valida que nenhuma das UFs solicitadas já está ocupada por outro vendedor
  async validateUFsAvailable(ufs, companyId, excludeSellerId = null) {
    if (!ufs || ufs.length === 0) return
    const taken = await this.takenUFs(companyId, excludeSellerId)
    const conflicts = ufs.map(u => u.toUpperCase()).filter(u => taken.includes(u))
    if (conflicts.length > 0) {
      const err = new Error(`UF(s) já atribuída(s) a outro vendedor: ${conflicts.join(', ')}`)
      err.status = 409
      err.conflicts = conflicts
      throw err
    }
  },

  async create({ nome, whatsapp, ufs = [] }, companyId) {
    await this.validateUFsAvailable(ufs, companyId)
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        'INSERT INTO sellers (nome, whatsapp, company_id) VALUES ($1, $2, $3) RETURNING *',
        [nome, whatsapp, companyId]
      )
      const seller = rows[0]
      for (const uf of ufs) {
        await client.query(
          'INSERT INTO seller_ufs (seller_id, uf) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [seller.id, uf.toUpperCase()]
        )
      }
      await client.query('COMMIT')
      return this.get(seller.id, companyId)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async update(id, { nome, whatsapp, ativo, ufs }, companyId) {
    if (Array.isArray(ufs)) {
      await this.validateUFsAvailable(ufs, companyId, id)
    }
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE sellers
         SET nome     = COALESCE($1, nome),
             whatsapp = COALESCE($2, whatsapp),
             ativo    = COALESCE($3, ativo)
         WHERE id = $4 AND company_id = $5`,
        [nome, whatsapp, ativo, id, companyId]
      )
      if (Array.isArray(ufs)) {
        await client.query('DELETE FROM seller_ufs WHERE seller_id = $1', [id])
        for (const uf of ufs) {
          await client.query(
            'INSERT INTO seller_ufs (seller_id, uf) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, uf.toUpperCase()]
          )
        }
      }
      await client.query('COMMIT')
      return this.get(id, companyId)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async delete(id, companyId) {
    await db.query('DELETE FROM sellers WHERE id = $1 AND company_id = $2', [id, companyId])
  },
}
