import db from '../db/db.js'

export const ClientModel = {
  // Retorna lista de UFs com contagem, respeitando os mesmos filtros do list()
  async listUFs({ status_id, ativo, ja_cliente, catalogo_enviado, nao_tem_interesse, search, companyId } = {}) {
    const conditions = []
    const params = []

    params.push(companyId)
    conditions.push(`c.company_id = $${params.length}`)

    if (status_id) {
      params.push(status_id)
      conditions.push(`c.status_id = $${params.length}`)
    }
    if (ativo !== undefined) {
      params.push(ativo)
      conditions.push(`c.ativo = $${params.length}`)
    }
    if (ja_cliente !== undefined) {
      params.push(ja_cliente)
      conditions.push(`c.ja_cliente = $${params.length}`)
    }
    if (catalogo_enviado !== undefined) {
      params.push(catalogo_enviado)
      conditions.push(`c.catalogo_enviado = $${params.length}`)
    }
    if (nao_tem_interesse !== undefined) {
      params.push(nao_tem_interesse)
      conditions.push(`c.nao_tem_interesse = $${params.length}`)
    }
    if (search) {
      const words = search.trim().split(/\s+/).filter(Boolean)
      const wordConditions = (field) =>
        words.map(w => {
          params.push(`%${w}%`)
          return `unaccent(${field}) ILIKE unaccent($${params.length})`
        }).join(' AND ')
      params.push(`%${search.trim()}%`)
      const nPhone = params.length
      conditions.push(`(
        (${wordConditions('c.nome')}) OR
        (${wordConditions('c.cidade')}) OR
        c.whatsapp            ILIKE $${nPhone} OR
        unaccent(c.instagram) ILIKE unaccent($${nPhone})
      )`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await db.query(`
      SELECT COALESCE(c.uf, '—') AS uf, COUNT(*)::int AS count
      FROM clients c
      ${where}
      GROUP BY c.uf
      ORDER BY c.uf NULLS LAST
    `, params)
    return rows
  },

  async list({ uf, status_id, ativo, ja_cliente, catalogo_enviado, nao_tem_interesse, search, page = 1, limit = 50, sort = 'created_at', companyId } = {}) {
    const conditions = []
    const params = []

    params.push(companyId)
    conditions.push(`c.company_id = $${params.length}`)

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
    if (ja_cliente !== undefined) {
      params.push(ja_cliente)
      conditions.push(`c.ja_cliente = $${params.length}`)
    }
    if (catalogo_enviado !== undefined) {
      params.push(catalogo_enviado)
      conditions.push(`c.catalogo_enviado = $${params.length}`)
    }
    if (nao_tem_interesse !== undefined) {
      params.push(nao_tem_interesse)
      conditions.push(`c.nao_tem_interesse = $${params.length}`)
    }
    if (search) {
      // Todas as palavras devem casar no MESMO campo (evita falsos positivos onde
      // "Bike" casa no nome e "Sul" casa na cidade de outro cliente)
      const words = search.trim().split(/\s+/).filter(Boolean)
      const wordConditions = (field) =>
        words.map((w, i) => {
          params.push(`%${w}%`)
          return `unaccent(${field}) ILIKE unaccent($${params.length})`
        }).join(' AND ')

      // Para whatsapp/instagram usa a frase completa (não faz sentido dividir dígitos)
      params.push(`%${search.trim()}%`)
      const nPhone = params.length

      conditions.push(`(
        (${wordConditions('c.nome')}) OR
        (${wordConditions('c.cidade')}) OR
        c.whatsapp            ILIKE $${nPhone} OR
        unaccent(c.instagram) ILIKE unaccent($${nPhone})
      )`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const orderBy =
      sort === 'uf'              ? 'c.uf ASC NULLS LAST, c.nome ASC' :
      sort === 'nome_asc'        ? 'c.nome ASC' :
      sort === 'nome_desc'       ? 'c.nome DESC' :
      sort === 'contato_asc'     ? 'c.ultimo_contato ASC NULLS FIRST' :
      sort === 'contato_desc'    ? 'c.ultimo_contato DESC NULLS LAST' :
                                   'c.created_at DESC'
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

  async get(id, companyId) {
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
      WHERE c.id = $1 AND c.company_id = $2
    `, [id, companyId])
    return rows[0] || null
  },

  // Busca o seller_id responsável pelo UF informado (restrito à empresa)
  async findSellerByUF(uf, companyId) {
    if (!uf) return null
    const { rows } = await db.query(
      `SELECT su.seller_id FROM seller_ufs su
       JOIN sellers s ON s.id = su.seller_id
       WHERE su.uf = $1 AND s.company_id = $2
       LIMIT 1`,
      [uf.toUpperCase(), companyId]
    )
    return rows[0]?.seller_id || null
  },

  async create(data, companyId) {
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
    const cnpj       = s(data.cnpj)
    const nota       = data.nota || null
    const catalog_id = data.catalog_id || null

    // Se não informou status, usa "Prospecção" por padrão
    let status_id = data.status_id || null
    if (!status_id) {
      const { rows: st } = await db.query(
        `SELECT id FROM status WHERE nome = 'Prospecção' AND company_id = $1 LIMIT 1`,
        [companyId]
      )
      status_id = st[0]?.id || null
    }

    // Se seller_id não foi informado, atribui automaticamente pelo UF
    const seller_id = data.seller_id || await this.findSellerByUF(uf, companyId)

    // Sem WhatsApp e sem Instagram → nota 1 (Fraco) automaticamente
    const notaFinal = nota || (!whatsapp && !instagram ? 1 : null)

    const { rows } = await db.query(`
      INSERT INTO clients
        (nome, cidade, uf, whatsapp, telefone, site, email, instagram, facebook, twitter, linkedin,
         responsavel, logradouro, numero, complemento, bairro, cep, cnpj,
         nota, status_id, catalog_id, seller_id, ja_cliente, company_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING *
    `, [nom, cidade, uf, whatsapp, telefone, site, email, instagram, facebook, twitter, linkedin,
        responsavel, logradouro, numero, complemento, bairro, cep, cnpj,
        notaFinal, status_id, catalog_id, seller_id, data.ja_cliente ?? false, companyId])

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

  async update(id, data, companyId) {
    const {
      nome, cidade, uf, whatsapp, telefone, site, email, instagram, facebook, twitter, linkedin,
      responsavel, logradouro, numero, complemento, bairro, cep, cnpj,
      ativo, nota, status_id, catalog_id, seller_id, ja_cliente, catalogo_enviado, nao_tem_interesse,
      updated_at: clientUpdatedAt
    } = data

    // Verifica status anterior para disparar eventos (também serve para detectar se o cliente existe)
    const previous = await this.get(id, companyId)
    if (!previous) return null

    // Verificação de conflito em JS (evita problemas de precisão de microsegundos no SQL)
    if (clientUpdatedAt) {
      const dbMs     = new Date(previous.updated_at).getTime()
      const clientMs = new Date(clientUpdatedAt).getTime()
      if (dbMs !== clientMs) return 'CONFLICT'
    }

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
        cnpj        = COALESCE($18, cnpj),
        ativo       = COALESCE($19, ativo),
        nota        = COALESCE($20, nota),
        status_id   = COALESCE($21, status_id),
        catalog_id  = COALESCE($22, catalog_id),
        seller_id   = COALESCE($23, seller_id),
        ja_cliente        = COALESCE($25, ja_cliente),
        catalogo_enviado  = COALESCE($26, catalogo_enviado),
        nao_tem_interesse = COALESCE($28, nao_tem_interesse),
        updated_at        = NOW()
      WHERE id = $24 AND company_id = $27
      RETURNING *
    `, [nome, cidade, uf, whatsapp, telefone, site, email, instagram, facebook, twitter, linkedin,
        responsavel, logradouro, numero, complemento, bairro, cep, cnpj,
        ativo, nota, status_id, catalog_id, seller_id, id, ja_cliente, catalogo_enviado, companyId,
        nao_tem_interesse ?? null])

    const updated = rows[0]
    if (!updated) return null

    // Rastreia se o evento catalog_requested já foi disparado via mudança de status
    let catalogEventFired = false

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

      // Dispara catalog_requested e seta flag permanente se mudou para "Catálogo"
      if (nomeStatus === 'Catálogo') {
        await db.query(
          `INSERT INTO daily_report_events (client_id, event_type, event_date)
           VALUES ($1, 'catalog_requested', (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)
           ON CONFLICT DO NOTHING`,
          [id]
        )
        await db.query(
          `UPDATE clients SET catalogo_enviado = true WHERE id = $1`, [id]
        )
        catalogEventFired = true
      }

      // Mudou para "Não Tem Interesse" → ativa flag histórica + agenda reset 3 meses
      if (nomeStatus === 'Não Tem Interesse') {
        await db.query(
          `UPDATE clients SET nao_tem_interesse = true, interesse_reset_at = NOW() + interval '3 months' WHERE id = $1`,
          [id]
        )
      }

      // Saiu de "Não Tem Interesse" manualmente → cancela o timer (flag histórica permanece)
      if (previous.status_nome === 'Não Tem Interesse' && nomeStatus !== 'Não Tem Interesse') {
        await db.query(
          `UPDATE clients SET interesse_reset_at = NULL WHERE id = $1`,
          [id]
        )
      }
    }

    // Flag catalogo_enviado ativada manualmente — só dispara se o evento
    // ainda não foi registrado via mudança de status nesta mesma operação
    if (catalogo_enviado === true && !previous?.catalogo_enviado && !catalogEventFired) {
      await db.query(
        `INSERT INTO daily_report_events (client_id, event_type, event_date)
         VALUES ($1, 'catalog_requested', (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)
         ON CONFLICT DO NOTHING`,
        [id]
      )
    }

    return updated
  },

  // Marca cliente como "Contatado" — atualiza status, ultimo_contato e registra evento
  async markContacted(id, companyId) {
    const { rows: statusRows } = await db.query(
      `SELECT id FROM status WHERE nome = 'Contatado' AND company_id = $1 LIMIT 1`, [companyId]
    )
    const statusId = statusRows[0]?.id
    if (statusId) {
      await db.query(
        `UPDATE clients SET status_id = $1, ultimo_contato = NOW(), updated_at = NOW() WHERE id = $2 AND company_id = $3`,
        [statusId, id, companyId]
      )
    } else {
      await db.query(
        `UPDATE clients SET ultimo_contato = NOW(), updated_at = NOW() WHERE id = $1 AND company_id = $2`,
        [id, companyId]
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
  async destroy(id, companyId) {
    await db.query('DELETE FROM clients WHERE id = $1 AND company_id = $2', [id, companyId])
  },

  // Soft delete — apenas inativa o cliente
  async deactivate(id, companyId) {
    const { rows } = await db.query(
      `UPDATE clients SET ativo = FALSE, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, companyId]
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
  // encerramento ou vínculo permanente (Fabricação Própria, Exclusividade).
  async getOverdue(days = 3, companyId) {
    const { rows } = await db.query(
      `SELECT c.id, c.nome, c.cidade, c.uf, c.whatsapp, c.ultimo_contato, c.status_id
       FROM clients c
       LEFT JOIN status s ON s.id = c.status_id
       WHERE c.ativo = true
         AND c.company_id = $2
         AND c.created_at::date < (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
         AND (
           s.nome IS NULL
           OR unaccent(lower(s.nome)) NOT IN (
             'fabricacao propria', 'exclusividade'
           )
         )
         AND (
           c.ultimo_contato < NOW() - ($1 || ' days')::INTERVAL
           OR (c.ultimo_contato IS NULL AND c.created_at < NOW() - ($1 || ' days')::INTERVAL)
         )
       ORDER BY c.ultimo_contato ASC NULLS FIRST`,
      [days, companyId]
    )
    return rows
  },

  // Importação em lote (Excel) — cada registro usa o pool diretamente (sem transação global)
  async bulkUpsert(records, companyId) {
    const results = { imported: 0, updated: 0, skipped: 0, errors: [] }

    // Busca o id de "Prospecção" uma vez para usar em todos os inserts
    const { rows: stRows } = await db.query(
      `SELECT id FROM status WHERE nome = 'Prospecção' AND company_id = $1 LIMIT 1`,
      [companyId]
    )
    const prospeccaoId = stRows[0]?.id || null

    for (const rec of records) {
      try {
        if (!rec.nome) {
          results.skipped++
          continue
        }
        const recUF = rec.uf ? rec.uf.toUpperCase() : null
        // Tenta atualizar por whatsapp ou nome+uf (restrito à empresa)
        const { rows: existing } = await db.query(
          `SELECT id FROM clients WHERE company_id = $4 AND ((whatsapp = $1 AND $1 IS NOT NULL) OR (LOWER(nome) = LOWER($2) AND ($3 IS NULL OR uf = $3))) LIMIT 1`,
          [rec.whatsapp || null, rec.nome, recUF, companyId]
        )
        if (existing.length > 0) {
          // Só preenche campos que estão vazios no banco — nunca sobrescreve dados existentes
          await db.query(
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
          // Atribui vendedor automaticamente pelo UF (restrito à empresa)
          const { rows: sellerRows } = recUF ? await db.query(
            `SELECT su.seller_id FROM seller_ufs su
             JOIN sellers s ON s.id = su.seller_id
             WHERE su.uf = $1 AND s.company_id = $2
             LIMIT 1`,
            [recUF, companyId]
          ) : { rows: [] }
          const seller_id = sellerRows[0]?.seller_id || null

          // Sem WhatsApp e sem Instagram → nota 1 automaticamente
          const nota = (!rec.whatsapp && !rec.instagram) ? 1 : null

          const { rows: inserted } = await db.query(
            `INSERT INTO clients (nome, cidade, uf, whatsapp, site, instagram, nota, seller_id, status_id, ja_cliente, company_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
            [rec.nome, rec.cidade, recUF, rec.whatsapp, rec.site, rec.instagram, nota, seller_id, prospeccaoId, false, companyId]
          )
          await db.query(
            `INSERT INTO daily_report_events (client_id, event_type, event_date)
             VALUES ($1, 'new_client', (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)
             ON CONFLICT DO NOTHING`,
            [inserted[0].id]
          )
          results.imported++
        }
      } catch (e) {
        results.errors.push({ nome: rec.nome, uf: rec.uf, error: e.message })
      }
    }
    return results
  },

  // Clientes importados sem UF — aguardando atribuição manual
  async listPendingUF(companyId) {
    const { rows } = await db.query(
      `SELECT c.id, c.nome, c.cidade, c.whatsapp, c.instagram, c.site, c.created_at
       FROM clients c
       WHERE c.uf IS NULL AND c.ativo = true AND c.company_id = $1
       ORDER BY c.created_at DESC`,
      [companyId]
    )
    return rows
  },

  // Atribui UF a um cliente sem UF e já tenta associar vendedor
  async assignUF(id, uf, companyId) {
    const upperUF = uf.toUpperCase()
    // Busca vendedor responsável por essa UF
    const { rows: sellerRows } = await db.query(
      `SELECT su.seller_id FROM seller_ufs su
       JOIN sellers s ON s.id = su.seller_id
       WHERE su.uf = $1 AND s.company_id = $2 AND s.ativo = true
       LIMIT 1`,
      [upperUF, companyId]
    )
    const seller_id = sellerRows[0]?.seller_id || null
    const { rows } = await db.query(
      `UPDATE clients SET uf = $1, seller_id = COALESCE(seller_id, $2), updated_at = NOW()
       WHERE id = $3 AND company_id = $4 AND uf IS NULL
       RETURNING id, nome, cidade, uf, seller_id`,
      [upperUF, seller_id, id, companyId]
    )
    return rows[0] || null
  },

  // Tarefa diária: associa vendedores a clientes que têm UF mas seller_id nulo
  async bulkAssignSellers(companyId = null) {
    // Se companyId for null, roda para todas as empresas
    const params = companyId ? [companyId] : []
    const companyFilter = companyId ? 'AND c.company_id = $1' : ''
    const { rowCount } = await db.query(
      `UPDATE clients c
       SET seller_id = su.seller_id, updated_at = NOW()
       FROM seller_ufs su
       JOIN sellers s ON s.id = su.seller_id AND s.ativo = true
       WHERE c.uf IS NOT NULL
         AND c.seller_id IS NULL
         AND c.ativo = true
         AND su.uf = c.uf
         AND s.company_id = c.company_id
         ${companyFilter}`,
      params
    )
    return rowCount
  },
}
