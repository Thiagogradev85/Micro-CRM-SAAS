import db from '../db/db.js'

export const ClientModel = {
  async list({ uf, status_id, ativo, search, page = 1, limit = 50, sort = 'created_at' } = {}) {
    const conditions = []
    const params = []

    if (uf) {
      // Aceita UF única ou array de UFs (ex: ['MT','MS','PR'])
      const ufs = Array.isArray(uf) ? uf : uf.split(',').map(u => u.trim().toUpperCase()).filter(Boolean)
      if (ufs.length === 1) {
        params.push(ufs[0])
        conditions.push(`c.uf = $${params.length}`)
      } else if (ufs.length > 1) {
        params.push(ufs)
        conditions.push(`c.uf = ANY($${params.length})`)
      }
    }
    if (status_id) {
      params.push(status_id)
      conditions.push(`c.status_id = $${params.length}`)
    }
    if (ativo !== undefined) {
      params.push(ativo)
      conditions.push(`c.ativo = $${params.length}`)
    }
    if (search) {
      // Divide em palavras, cada uma deve casar em pelo menos um campo (AND entre palavras)
      const words = search.trim().split(/\s+/).filter(Boolean)
      for (const word of words) {
        params.push(`%${word}%`)
        const n = params.length
        conditions.push(`(
          unaccent(c.nome)      ILIKE unaccent($${n}) OR
          unaccent(c.cidade)    ILIKE unaccent($${n}) OR
          c.whatsapp            ILIKE $${n}            OR
          unaccent(c.instagram) ILIKE unaccent($${n})
        )`)
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const orderBy = sort === 'uf' ? 'c.uf ASC NULLS LAST, c.nome ASC' : 'c.created_at DESC'
    const offset = (page - 1) * limit

    params.push(limit)
    params.push(offset)

    const { rows } = await db.query(`
      SELECT
        c.*,
        s.nome  AS status_nome,
        s.cor   AS status_cor,
        cat.nome AS catalog_nome,
        sel.nome AS seller_nome
      FROM clients c
      LEFT JOIN status  s   ON s.id   = c.status_id
      LEFT JOIN catalogs  cat ON cat.id = c.catalog_id
      LEFT JOIN sellers   sel ON sel.id = c.seller_id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params)

    const countParams = params.slice(0, params.length - 2)
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM clients c ${where}`,
      countParams
    )

    return { data: rows, total: parseInt(countRows[0].count) }
  },

  async get(id) {
    const { rows } = await db.query(`
      SELECT
        c.*,
        s.nome  AS status_nome,
        s.cor   AS status_cor,
        cat.nome AS catalog_nome,
        sel.nome AS seller_nome
      FROM clients c
      LEFT JOIN status  s   ON s.id   = c.status_id
      LEFT JOIN catalogs  cat ON cat.id = c.catalog_id
      LEFT JOIN sellers   sel ON sel.id = c.seller_id
      WHERE c.id = $1
    `, [id])
    return rows[0] || null
  },

  // Busca o seller_id responsável pelo UF informado
  async findSellerByUF(uf) {
    if (!uf) return null
    const { rows } = await db.query(
      `SELECT seller_id FROM seller_ufs WHERE uf = $1 LIMIT 1`,
      [uf.toUpperCase()]
    )
    return rows[0]?.seller_id || null
  },

  async create(data) {
    const s = (v) => v?.trim() || null
    const nom        = s(data.nome)
    const cidade     = s(data.cidade)
    const uf         = s(data.uf)?.toUpperCase() || null
    const whatsapp   = s(data.whatsapp)
    const telefone   = s(data.telefone)
    const site       = s(data.site)
    const email      = s(data.email)
    const instagram  = s(data.instagram)
    const facebook   = s(data.facebook)
    const twitter    = s(data.twitter)
    const linkedin   = s(data.linkedin)
    const responsavel = s(data.responsavel)
    const logradouro = s(data.logradouro)
    const numero     = s(data.numero)
    const complemento = s(data.complemento)
    const bairro     = s(data.bairro)
    const cep        = s(data.cep)
    const nota       = data.nota || null
    const catalog_id = data.catalog_id || null

    // Se não informou status, usa "Prospecção" por padrão
    let status_id = data.status_id || null
    if (!status_id) {
      const { rows: st } = await db.query(
        `SELECT id FROM status WHERE nome = 'Prospecção' LIMIT 1`
      )
      status_id = st[0]?.id || null
    }

    // Se seller_id não foi informado, atribui automaticamente pelo UF
    const seller_id = data.seller_id || await this.findSellerByUF(uf)

    // Sem WhatsApp e sem Instagram → nota 1 (Fraco) automaticamente
    const notaFinal = nota || (!whatsapp && !instagram ? 1 : null)

    const { rows } = await db.query(`
      INSERT INTO clients
        (nome, cidade, uf, whatsapp, telefone, site, email, instagram, facebook, twitter, linkedin,
         responsavel, logradouro, numero, complemento, bairro, cep,
         nota, status_id, catalog_id, seller_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING *
    `, [nom, cidade, uf, whatsapp, telefone, site, email, instagram, facebook, twitter, linkedin,
        responsavel, logradouro, numero, complemento, bairro, cep,
        notaFinal, status_id, catalog_id, seller_id])

    const client = rows[0]

    // Registra evento new_client no relatório diário
    await db.query(
      `INSERT INTO daily_report_events (client_id, event_type, event_date)
       VALUES ($1, 'new_client', (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)
       ON CONFLICT DO NOTHING`,
      [client.id]
    )

    return client
  },

  async update(id, data) {
    const {
      nome, cidade, uf, whatsapp, telefone, site, email, instagram, facebook, twitter, linkedin,
      responsavel, logradouro, numero, complemento, bairro, cep,
      ativo, nota, status_id, catalog_id, seller_id
    } = data

    // Verifica status anterior para disparar eventos
    const previous = await this.get(id)

    const { rows } = await db.query(`
      UPDATE clients SET
        nome        = COALESCE($1,  nome),
        cidade      = COALESCE($2,  cidade),
        uf          = COALESCE($3,  uf),
        whatsapp    = COALESCE($4,  whatsapp),
        telefone    = COALESCE($5,  telefone),
        site        = COALESCE($6,  site),
        email       = COALESCE($7,  email),
        instagram   = COALESCE($8,  instagram),
        facebook    = COALESCE($9,  facebook),
        twitter     = COALESCE($10, twitter),
        linkedin    = COALESCE($11, linkedin),
        responsavel = COALESCE($12, responsavel),
        logradouro  = COALESCE($13, logradouro),
        numero      = COALESCE($14, numero),
        complemento = COALESCE($15, complemento),
        bairro      = COALESCE($16, bairro),
        cep         = COALESCE($17, cep),
        ativo       = COALESCE($18, ativo),
        nota        = COALESCE($19, nota),
        status_id   = COALESCE($20, status_id),
        catalog_id  = COALESCE($21, catalog_id),
        seller_id   = COALESCE($22, seller_id),
        updated_at  = NOW()
      WHERE id = $23
      RETURNING *
    `, [nome, cidade, uf, whatsapp, telefone, site, email, instagram, facebook, twitter, linkedin,
        responsavel, logradouro, numero, complemento, bairro, cep,
        ativo, nota, status_id, catalog_id, seller_id, id])

    const updated = rows[0]
    if (!updated) return null

    // Busca nomes dos status para comparar
    if (status_id && previous && previous.status_id !== status_id) {
      const { rows: statusRows } = await db.query(
        'SELECT nome FROM status WHERE id = $1', [status_id]
      )
      const nomeStatus = statusRows[0]?.nome || ''

      // Dispara contacted se mudou para "Contatado"
      if (nomeStatus === 'Contatado') {
        await db.query(
          `UPDATE clients SET ultimo_contato = NOW() WHERE id = $1`, [id]
        )
        await db.query(
          `INSERT INTO daily_report_events (client_id, event_type, event_date)
           VALUES ($1, 'contacted', (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)
           ON CONFLICT DO NOTHING`,
          [id]
        )
      }

      // Dispara catalog_requested se mudou para "Catálogo"
      if (nomeStatus === 'Catálogo') {
        await db.query(
          `INSERT INTO daily_report_events (client_id, event_type, event_date)
           VALUES ($1, 'catalog_requested', (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)
           ON CONFLICT DO NOTHING`,
          [id]
        )
      }
    }

    return updated
  },

  // Marca cliente como "Contatado" — atualiza status, ultimo_contato e registra evento
  async markContacted(id) {
    const { rows: statusRows } = await db.query(
      `SELECT id FROM status WHERE nome = 'Contatado' LIMIT 1`
    )
    const statusId = statusRows[0]?.id
    if (statusId) {
      await db.query(
        `UPDATE clients SET status_id = $1, ultimo_contato = NOW(), updated_at = NOW() WHERE id = $2`,
        [statusId, id]
      )
    } else {
      await db.query(
        `UPDATE clients SET ultimo_contato = NOW(), updated_at = NOW() WHERE id = $1`,
        [id]
      )
    }
    await db.query(
      `INSERT INTO daily_report_events (client_id, event_type, event_date)
       VALUES ($1, 'contacted', (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)
       ON CONFLICT DO NOTHING`,
      [id]
    )
  },

  // Hard delete — remove permanentemente do banco
  async destroy(id) {
    await db.query('DELETE FROM clients WHERE id = $1', [id])
  },

  // Soft delete — apenas inativa o cliente
  async deactivate(id) {
    const { rows } = await db.query(
      `UPDATE clients SET ativo = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    )
    return rows[0] || null
  },

  // Registra compra no relatório diário (pode ser N vezes/dia)
  async registerPurchase(id) {
    await db.query(
      `INSERT INTO daily_report_events (client_id, event_type, event_date)
       VALUES ($1, 'purchased', (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)`,
      [id]
    )
  },

  // Observações
  async listObservations(client_id) {
    const { rows } = await db.query(
      `SELECT * FROM observations WHERE client_id = $1 ORDER BY created_at DESC`,
      [client_id]
    )
    return rows
  },

  async addObservation(client_id, texto) {
    const { rows } = await db.query(
      `INSERT INTO observations (client_id, texto) VALUES ($1, $2) RETURNING *`,
      [client_id, texto]
    )

    // Registra contacted no relatório do dia (1x por dia por cliente)
    await db.query(
      `UPDATE clients SET ultimo_contato = NOW(), updated_at = NOW() WHERE id = $1`,
      [client_id]
    )
    await db.query(
      `INSERT INTO daily_report_events (client_id, event_type, event_date)
       VALUES ($1, 'contacted', (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)
       ON CONFLICT DO NOTHING`,
      [client_id]
    )

    return rows[0]
  },

  async deleteObservation(id) {
    await db.query('DELETE FROM observations WHERE id = $1', [id])
  },

  // Retorna clientes ativos que estão há mais de `days` dias sem contato.
  // Exclui clientes criados hoje ("Novos") e clientes com status que indicam
  // encerramento ou vínculo ativo (Fabricação própria, Fechado, Cliente Ativo, Cliente Inativo).
  async getOverdue(days = 3) {
    const { rows } = await db.query(
      `SELECT c.id, c.nome, c.cidade, c.uf, c.whatsapp, c.ultimo_contato, c.status_id
       FROM clients c
       LEFT JOIN status s ON s.id = c.status_id
       WHERE c.ativo = true
         AND c.created_at::date < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
         AND (
           s.nome IS NULL
           OR unaccent(lower(s.nome)) NOT IN (
             'fabricacao propria', 'fechado', 'cliente ativo', 'cliente inativo'
           )
         )
         AND (
           c.ultimo_contato < NOW() - ($1 || ' days')::INTERVAL
           OR (c.ultimo_contato IS NULL AND c.created_at < NOW() - ($1 || ' days')::INTERVAL)
         )
       ORDER BY c.ultimo_contato ASC NULLS FIRST`,
      [days]
    )
    return rows
  },

  // Importação em lote (Excel) — registra new_client para cada novo
  async bulkUpsert(records) {
    const client = await db.connect()
    const results = { imported: 0, updated: 0, skipped: 0, errors: [] }
    try {
      await client.query('BEGIN')

      // Busca o id de "Prospecção" uma vez para usar em todos os inserts
      const { rows: stRows } = await client.query(
        `SELECT id FROM status WHERE nome = 'Prospecção' LIMIT 1`
      )
      const prospeccaoId = stRows[0]?.id || null

      for (const rec of records) {
        try {
          if (!rec.nome || !rec.uf) {
            results.skipped++
            continue
          }
          // Tenta atualizar por whatsapp ou nome+uf
          const { rows: existing } = await client.query(
            `SELECT id FROM clients WHERE (whatsapp = $1 AND $1 IS NOT NULL) OR (LOWER(nome) = LOWER($2) AND uf = $3) LIMIT 1`,
            [rec.whatsapp || null, rec.nome, rec.uf.toUpperCase()]
          )
          if (existing.length > 0) {
            // Só preenche campos que estão vazios no banco — nunca sobrescreve dados existentes
            await client.query(
              `UPDATE clients SET
                nome      = $1,
                cidade    = COALESCE(NULLIF(cidade, ''),    $2),
                uf        = COALESCE(NULLIF(uf, ''),        $3),
                whatsapp  = COALESCE(NULLIF(whatsapp, ''),  $4),
                site      = COALESCE(NULLIF(site, ''),      $5),
                instagram = COALESCE(NULLIF(instagram, ''), $6),
                updated_at = NOW()
               WHERE id = $7`,
              [rec.nome, rec.cidade || null, rec.uf || null, rec.whatsapp || null, rec.site || null, rec.instagram || null, existing[0].id]
            )
            results.updated++
          } else {
            // Atribui vendedor automaticamente pelo UF
            const { rows: sellerRows } = await client.query(
              `SELECT seller_id FROM seller_ufs WHERE uf = $1 LIMIT 1`,
              [rec.uf.toUpperCase()]
            )
            const seller_id = sellerRows[0]?.seller_id || null

            // Sem WhatsApp e sem Instagram → nota 1 automaticamente
            const nota = (!rec.whatsapp && !rec.instagram) ? 1 : null

            const { rows: inserted } = await client.query(
              `INSERT INTO clients (nome, cidade, uf, whatsapp, site, instagram, nota, seller_id, status_id)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
              [rec.nome, rec.cidade, rec.uf.toUpperCase(), rec.whatsapp, rec.site, rec.instagram, nota, seller_id, prospeccaoId]
            )
            await client.query(
              `INSERT INTO daily_report_events (client_id, event_type, event_date)
               VALUES ($1, 'new_client', (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)
               ON CONFLICT DO NOTHING`,
              [inserted[0].id]
            )
            results.imported++
          }
        } catch (e) {
          results.errors.push(e.message)
        }
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
    return results
  },
}
