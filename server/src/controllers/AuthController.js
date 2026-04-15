import db                          from '../db/db.js'
import { hashPassword, verifyPassword, signToken } from '../utils/auth.js'
import { AppError }                from '../utils/AppError.js'

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 dias
}

/** POST /auth/login */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) throw new AppError('Email e senha obrigatórios.', 400)

    const { rows } = await db.query(
      `SELECT u.id, u.nome, u.email, u.password_hash, u.role, u.ativo, u.company_id, c.nome AS company_nome
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    )
    const user = rows[0]
    if (!user) throw new AppError('Email ou senha incorretos.', 401)
    if (!user.ativo) throw new AppError('Conta desativada. Entre em contato com o administrador.', 403)

    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) throw new AppError('Email ou senha incorretos.', 401)

    const token = signToken({ id: user.id, email: user.email, nome: user.nome, role: user.role, company_id: user.company_id })

    res.cookie('token', token, COOKIE_OPTS)
    res.json({ ok: true, user: { id: user.id, nome: user.nome, email: user.email, role: user.role, company_id: user.company_id, company_nome: user.company_nome || null } })
  } catch (err) {
    next(err)
  }
}

/** POST /auth/logout */
export function logout(req, res) {
  res.clearCookie('token', COOKIE_OPTS)
  res.json({ ok: true })
}

/** GET /auth/me */
export async function me(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT c.nome AS company_nome
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
      [req.user.id]
    )
    res.json({ user: { ...req.user, company_nome: rows[0]?.company_nome || null } })
  } catch (err) {
    next(err)
  }
}

/** GET /auth/users — admin: lista todos os usuários */
export async function listUsers(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.nome, u.email, u.role, u.ativo, u.created_at, u.company_id, c.nome AS company_nome
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       ORDER BY u.created_at`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

const DEFAULT_STATUSES = [
  { nome: 'Prospecção', cor: '#6b7280', ordem: 1 },
  { nome: 'Contatado',  cor: '#3b82f6', ordem: 2 },
  { nome: 'Proposta',   cor: '#f59e0b', ordem: 3 },
  { nome: 'Fechado',    cor: '#22c55e', ordem: 4 },
  { nome: 'Perdido',    cor: '#ef4444', ordem: 5 },
]

const SEED_UFS = ['SP','RJ','MG','RS','PR','SC','BA','GO','PE','CE']
const SEED_NOMES = ['Loja Exemplo','Distribuidora Teste','Comércio Demo','Empresa Piloto','Negócio Modelo']

// Semeia status padrão para uma empresa recém-criada (só roda se a empresa ainda não tem status)
async function seedCompanyDefaults(companyId, client) {
  // Verifica se a empresa já tem status cadastrados
  const { rows: existing } = await client.query(
    `SELECT id FROM status WHERE company_id = $1 LIMIT 1`,
    [companyId]
  )
  if (existing.length > 0) return

  let prospeccaoId = null
  for (const s of DEFAULT_STATUSES) {
    const { rows } = await client.query(
      `INSERT INTO status (nome, cor, ordem, company_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [s.nome, s.cor, s.ordem, companyId]
    )
    if (s.nome === 'Prospecção') prospeccaoId = rows[0].id
  }

  // Cria 1 cliente de exemplo
  const idx  = companyId % SEED_UFS.length
  const uf   = SEED_UFS[idx]
  const nome = `${SEED_NOMES[idx % SEED_NOMES.length]} (${uf})`
  await client.query(
    `INSERT INTO clients (nome, uf, status_id, company_id) VALUES ($1, $2, $3, $4)`,
    [nome, uf, prospeccaoId, companyId]
  )
}

/** POST /auth/users — admin: cria novo usuário */
export async function createUser(req, res, next) {
  const dbClient = await db.connect()
  try {
    const { nome, email, password, role = 'user', company_id = null, company_nome = null } = req.body
    if (!nome || !email || !password) throw new AppError('Nome, email e senha são obrigatórios.', 400)
    if (!['admin', 'user'].includes(role)) throw new AppError('Role inválido.', 400)

    await dbClient.query('BEGIN')

    // Resolve company: usa a existente ou cria uma nova se company_nome foi fornecido
    let resolvedCompanyId = company_id
    if (!resolvedCompanyId && company_nome) {
      const { rows: co } = await dbClient.query(
        `INSERT INTO companies (nome) VALUES ($1) RETURNING id`,
        [company_nome.trim()]
      )
      resolvedCompanyId = co[0].id
      await seedCompanyDefaults(resolvedCompanyId, dbClient)
    } else if (resolvedCompanyId) {
      // Semeia apenas se a empresa ainda não tiver dados
      await seedCompanyDefaults(resolvedCompanyId, dbClient)
    }

    const hash = await hashPassword(password)
    const { rows } = await dbClient.query(
      `INSERT INTO users (nome, email, password_hash, role, company_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, email, role, ativo, created_at, company_id`,
      [nome.trim(), email.toLowerCase().trim(), hash, role, resolvedCompanyId]
    )
    const newUser = rows[0]

    await dbClient.query('COMMIT')
    res.status(201).json(newUser)
  } catch (err) {
    await dbClient.query('ROLLBACK')
    if (err.code === '23505') return next(new AppError('Este email já está cadastrado.', 409))
    next(err)
  } finally {
    dbClient.release()
  }
}

/** PUT /auth/users/:id — admin: atualiza usuário */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params
    const { nome, email, password, role, ativo, company_id } = req.body

    const sets = []
    const vals = []
    let i = 1

    if (nome       !== undefined) { sets.push(`nome = $${i++}`);          vals.push(nome.trim()) }
    if (email      !== undefined) { sets.push(`email = $${i++}`);         vals.push(email.toLowerCase().trim()) }
    if (role       !== undefined) { sets.push(`role = $${i++}`);          vals.push(role) }
    if (ativo      !== undefined) { sets.push(`ativo = $${i++}`);         vals.push(ativo) }
    if (company_id !== undefined) { sets.push(`company_id = $${i++}`);    vals.push(company_id) }
    if (password)                 { sets.push(`password_hash = $${i++}`); vals.push(await hashPassword(password)) }

    if (sets.length === 0) throw new AppError('Nenhum campo para atualizar.', 400)

    vals.push(id)
    const { rows } = await db.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, nome, email, role, ativo, company_id`,
      vals
    )
    if (!rows[0]) throw new AppError('Usuário não encontrado.', 404)
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

/** DELETE /auth/users/:id — admin: remove usuário */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params
    if (parseInt(id) === req.user.id) throw new AppError('Você não pode excluir sua própria conta.', 400)
    await db.query(`DELETE FROM users WHERE id = $1`, [id])
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
