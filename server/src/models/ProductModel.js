import db from '../db/db.js'

// Converte string vazia ou undefined em null; para numéricos converte e valida
function cleanStr(v) { return (v === '' || v == null) ? null : String(v).trim() || null }
function cleanNum(v) {
  if (v === '' || v == null) return null
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? null : n
}

export const ProductModel = {
  async list() {
    const { rows } = await db.query(
      'SELECT * FROM products ORDER BY tipo ASC, modelo ASC'
    )
    return rows
  },

  async listByCatalog(catalog_id) {
    const { rows } = await db.query(
      `SELECT p.* FROM products p
       JOIN catalog_products cp ON cp.product_id = p.id
       WHERE cp.catalog_id = $1
       ORDER BY p.tipo ASC, p.modelo ASC`,
      [catalog_id]
    )
    return rows
  },

  async linkToCatalog(catalog_id, product_id) {
    await db.query(
      'INSERT INTO catalog_products (catalog_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [catalog_id, product_id]
    )
  },

  async unlinkFromCatalog(catalog_id, product_id) {
    await db.query(
      'DELETE FROM catalog_products WHERE catalog_id = $1 AND product_id = $2',
      [catalog_id, product_id]
    )
  },

  async get(id) {
    const { rows } = await db.query(
      'SELECT * FROM products WHERE id = $1', [id]
    )
    return rows[0] || null
  },

  async create(catalog_id, data) {
    const { rows } = await db.query(`
      INSERT INTO products
        (catalog_id, tipo, modelo, bateria, motor, velocidade_min, velocidade_max,
         pneu, suspensao, autonomia, carregador, peso_bruto, peso_liquido,
         comprimento, largura, altura, impermeabilidade, cambio,
         estoque, imagem, extra, preco)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *
    `, [
      catalog_id,
      cleanStr(data.tipo),
      cleanStr(data.modelo),
      cleanStr(data.bateria),
      cleanStr(data.motor),
      cleanNum(data.velocidade_min),
      cleanNum(data.velocidade_max),
      cleanStr(data.pneu),
      cleanStr(data.suspensao),
      cleanStr(data.autonomia),
      cleanStr(data.carregador),
      cleanNum(data.peso_bruto),
      cleanNum(data.peso_liquido),
      cleanNum(data.comprimento),
      cleanNum(data.largura),
      cleanNum(data.altura),
      cleanStr(data.impermeabilidade),
      cleanStr(data.cambio),
      cleanNum(data.estoque) ?? 0,
      cleanStr(data.imagem),
      cleanStr(data.extra),
      cleanNum(data.preco),
    ])
    return rows[0]
  },

  async update(id, data) {
    const { rows } = await db.query(`
      UPDATE products SET
        tipo             = $1,
        modelo           = $2,
        bateria          = $3,
        motor            = $4,
        velocidade_min   = $5,
        velocidade_max   = $6,
        pneu             = $7,
        suspensao        = $8,
        autonomia        = $9,
        carregador       = $10,
        peso_bruto       = $11,
        peso_liquido     = $12,
        comprimento      = $13,
        largura          = $14,
        altura           = $15,
        impermeabilidade = $16,
        cambio           = $17,
        estoque          = $18,
        imagem           = $19,
        extra            = $20,
        preco            = $21,
        updated_at       = NOW()
      WHERE id = $22
      RETURNING *
    `, [
      cleanStr(data.tipo),
      cleanStr(data.modelo),
      cleanStr(data.bateria),
      cleanStr(data.motor),
      cleanNum(data.velocidade_min),
      cleanNum(data.velocidade_max),
      cleanStr(data.pneu),
      cleanStr(data.suspensao),
      cleanStr(data.autonomia),
      cleanStr(data.carregador),
      cleanNum(data.peso_bruto),
      cleanNum(data.peso_liquido),
      cleanNum(data.comprimento),
      cleanNum(data.largura),
      cleanNum(data.altura),
      cleanStr(data.impermeabilidade),
      cleanStr(data.cambio),
      cleanNum(data.estoque) ?? 0,
      cleanStr(data.imagem),
      cleanStr(data.extra),
      cleanNum(data.preco),
      id,
    ])
    return rows[0] || null
  },

  async updateStock(id, estoque) {
    const { rows } = await db.query(
      'UPDATE products SET estoque = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estoque, id]
    )
    return rows[0] || null
  },

  async delete(id) {
    await db.query('DELETE FROM products WHERE id = $1', [id])
  },
}
