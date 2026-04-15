import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Trash2, ToggleLeft, ToggleRight, Loader2, Users, PlusCircle, Pencil, X, Check, UserMinus } from 'lucide-react'
import { api } from '../utils/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useModal } from '../hooks/useModal.js'

const EMPTY_FORM = { nome: '' }

export function AdminCompaniesPage() {
  const { user: me }           = useAuth()
  const navigate               = useNavigate()
  const { modal, showModal }   = useModal()
  const [companies, setCompanies] = useState([])
  const [allUsers, setAllUsers]   = useState([])
  const [loading, setLoading]  = useState(true)
  const [form, setForm]        = useState(EMPTY_FORM)
  const [saving, setSaving]    = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [companyUsers, setCompanyUsers] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editNome, setEditNome]   = useState('')
  const [addUserSel, setAddUserSel] = useState({})

  useEffect(() => {
    if (me && me.role !== 'admin') navigate('/', { replace: true })
  }, [me, navigate])

  useEffect(() => {
    fetchCompanies()
    api.listUsers().then(setAllUsers).catch(() => {})
  }, [])

  async function fetchCompanies() {
    setLoading(true)
    try { setCompanies(await api.listCompanies()) }
    catch (err) { showModal({ type: 'error', title: 'Erro', message: err.message }) }
    finally { setLoading(false) }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createCompany(form)
      setForm(EMPTY_FORM)
      await fetchCompanies()
      showModal({ type: 'success', title: 'Empresa criada', message: `${form.nome} foi adicionada.` })
    } catch (err) {
      showModal({ type: 'error', title: 'Erro ao criar', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function toggleAtivo(company) {
    try {
      await api.updateCompany(company.id, { ativo: !company.ativo })
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, ativo: !c.ativo } : c))
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  function handleDelete(company) {
    showModal({
      type: 'warning',
      title: 'Excluir empresa',
      message: `Excluir permanentemente "${company.nome}"? Todos os dados vinculados (clientes, vendedores, status) serão removidos.`,
      actions: [{
        label: 'Excluir',
        variant: 'danger',
        onClick: async () => {
          try {
            await api.deleteCompany(company.id)
            setCompanies(prev => prev.filter(c => c.id !== company.id))
          } catch (err) {
            showModal({ type: 'error', title: 'Erro ao excluir', message: err.message })
          }
        },
      }],
    })
  }

  function startEdit(company) {
    setEditingId(company.id)
    setEditNome(company.nome)
  }

  async function handleRename(company) {
    const trimmed = editNome.trim()
    if (!trimmed || trimmed === company.nome) { setEditingId(null); return }
    try {
      await api.updateCompany(company.id, { nome: trimmed })
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, nome: trimmed } : c))
      setEditingId(null)
    } catch (err) {
      showModal({ type: 'error', title: 'Erro ao renomear', message: err.message })
    }
  }

  async function toggleUsers(company) {
    if (expanded === company.id) { setExpanded(null); return }
    setExpanded(company.id)
    if (!companyUsers[company.id]) {
      try {
        const users = await api.listCompanyUsers(company.id)
        setCompanyUsers(prev => ({ ...prev, [company.id]: users }))
      } catch (err) {
        showModal({ type: 'error', title: 'Erro', message: err.message })
      }
    }
  }

  async function handleRemoveUser(companyId, userId) {
    try {
      await api.updateUser(userId, { company_id: null })
      setCompanyUsers(prev => ({ ...prev, [companyId]: prev[companyId].filter(u => u.id !== userId) }))
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, company_id: null } : u))
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, user_count: Math.max(0, (c.user_count ?? 1) - 1) } : c))
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  async function handleAddUser(companyId) {
    const userId = parseInt(addUserSel[companyId])
    if (!userId) return
    try {
      await api.updateUser(userId, { company_id: companyId })
      const userObj = allUsers.find(u => u.id === userId)
      if (userObj) {
        setCompanyUsers(prev => ({ ...prev, [companyId]: [...(prev[companyId] ?? []), userObj] }))
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, company_id: companyId } : u))
        setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, user_count: (c.user_count ?? 0) + 1 } : c))
      }
      setAddUserSel(prev => ({ ...prev, [companyId]: '' }))
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {modal}

      <h1 className="text-xl font-bold text-white mb-6">Gerenciar Empresas</h1>

      {/* Formulário de criação */}
      <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">Nova empresa</h2>
        <div className="flex gap-3">
          <input
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            required
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            placeholder="Nome da empresa"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
            {saving ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>

      {/* Lista de empresas */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {companies.map(company => (
            <div key={company.id} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className={`flex items-center gap-3 px-4 py-3 transition ${!company.ativo ? 'opacity-60' : ''}`}>
                <Building2 size={16} className="flex-shrink-0 text-blue-400" />
                <div className="flex-1 min-w-0">
                  {editingId === company.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editNome}
                        onChange={e => setEditNome(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(company); if (e.key === 'Escape') setEditingId(null) }}
                        className="rounded border border-blue-500 bg-zinc-800 px-2 py-0.5 text-sm text-white focus:outline-none"
                      />
                      <button onClick={() => handleRename(company)} className="text-green-400 hover:text-green-300 transition"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-zinc-300 transition"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{company.nome}</span>
                      {!company.ativo && (
                        <span className="rounded bg-red-900/30 px-1.5 py-0.5 text-xs text-red-400">inativa</span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-zinc-500">{company.user_count ?? 0} usuário(s)</p>
                </div>
                <div className="flex items-center gap-1">
                  {editingId !== company.id && (
                    <button
                      onClick={() => startEdit(company)}
                      title="Renomear empresa"
                      className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => toggleUsers(company)}
                    title="Gerenciar usuários"
                    className={`rounded p-1.5 transition hover:bg-zinc-800 ${expanded === company.id ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <Users size={14} />
                  </button>
                  <button
                    onClick={() => toggleAtivo(company)}
                    title={company.ativo ? 'Desativar' : 'Ativar'}
                    className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    {company.ativo
                      ? <ToggleRight size={16} className="text-green-400" />
                      : <ToggleLeft size={16} />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(company)}
                    title="Excluir"
                    className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Usuários da empresa (expansível) */}
              {expanded === company.id && (
                <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-950">
                  {!companyUsers[company.id] ? (
                    <div className="flex justify-center py-2">
                      <Loader2 size={16} className="animate-spin text-zinc-500" />
                    </div>
                  ) : (
                    <>
                      {companyUsers[company.id].length === 0 ? (
                        <p className="text-xs text-zinc-500 mb-3">Nenhum usuário vinculado a esta empresa.</p>
                      ) : (
                        <ul className="mb-3 space-y-1">
                          {companyUsers[company.id].map(u => (
                            <li key={u.id} className="flex items-center gap-2 text-xs text-zinc-400">
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${u.ativo ? 'bg-green-400' : 'bg-zinc-600'}`} />
                              <span className="font-medium text-zinc-300">{u.nome}</span>
                              <span className="text-zinc-600">{u.email}</span>
                              <span className={`ml-auto rounded px-1.5 py-0.5 ${u.role === 'admin' ? 'bg-amber-900/40 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                {u.role}
                              </span>
                              <button
                                onClick={() => handleRemoveUser(company.id, u.id)}
                                title="Remover da empresa"
                                className="rounded p-0.5 text-zinc-600 transition hover:text-red-400"
                              >
                                <UserMinus size={13} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {/* Adicionar usuário */}
                      {(() => {
                        const currentIds = new Set((companyUsers[company.id] ?? []).map(u => u.id))
                        const available = allUsers.filter(u => !currentIds.has(u.id))
                        if (available.length === 0) return null
                        return (
                          <div className="flex items-center gap-2 mt-1">
                            <select
                              value={addUserSel[company.id] ?? ''}
                              onChange={e => setAddUserSel(prev => ({ ...prev, [company.id]: e.target.value }))}
                              className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
                            >
                              <option value="">— Adicionar usuário —</option>
                              {available.map(u => (
                                <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAddUser(company.id)}
                              disabled={!addUserSel[company.id]}
                              className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 transition"
                            >
                              Adicionar
                            </button>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


  useEffect(() => {
    if (me && me.role !== 'admin') navigate('/', { replace: true })
  }, [me, navigate])

  useEffect(() => { fetchCompanies() }, [])

  async function fetchCompanies() {
    setLoading(true)
    try { setCompanies(await api.listCompanies()) }
    catch (err) { showModal({ type: 'error', title: 'Erro', message: err.message }) }
    finally { setLoading(false) }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createCompany(form)
      setForm(EMPTY_FORM)
      await fetchCompanies()
      showModal({ type: 'success', title: 'Empresa criada', message: `${form.nome} foi adicionada.` })
    } catch (err) {
      showModal({ type: 'error', title: 'Erro ao criar', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function toggleAtivo(company) {
    try {
      await api.updateCompany(company.id, { ativo: !company.ativo })
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, ativo: !c.ativo } : c))
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  function handleDelete(company) {
    showModal({
      type: 'warning',
      title: 'Excluir empresa',
      message: `Excluir permanentemente "${company.nome}"? Todos os dados vinculados (clientes, vendedores, status) serão removidos.`,
      actions: [{
        label: 'Excluir',
        variant: 'danger',
        onClick: async () => {
          try {
            await api.deleteCompany(company.id)
            setCompanies(prev => prev.filter(c => c.id !== company.id))
          } catch (err) {
            showModal({ type: 'error', title: 'Erro ao excluir', message: err.message })
          }
        },
      }],
    })
  }

  async function toggleUsers(company) {
    if (expanded === company.id) {
      setExpanded(null)
      return
    }
    setExpanded(company.id)
    if (!companyUsers[company.id]) {
      try {
        const users = await api.listCompanyUsers(company.id)
        setCompanyUsers(prev => ({ ...prev, [company.id]: users }))
      } catch (err) {
        showModal({ type: 'error', title: 'Erro', message: err.message })
      }
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {modal}

      <h1 className="text-xl font-bold text-white mb-6">Gerenciar Empresas</h1>

      {/* Formulário de criação */}
      <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">Nova empresa</h2>
        <div className="flex gap-3">
          <input
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            required
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            placeholder="Nome da empresa"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
            {saving ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>

      {/* Lista de empresas */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {companies.map(company => (
            <div key={company.id} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className={`flex items-center gap-3 px-4 py-3 transition ${!company.ativo ? 'opacity-60' : ''}`}>
                <Building2 size={16} className="flex-shrink-0 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{company.nome}</span>
                    {!company.ativo && (
                      <span className="rounded bg-red-900/30 px-1.5 py-0.5 text-xs text-red-400">inativa</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{company.user_count ?? 0} usuário(s)</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleUsers(company)}
                    title="Ver usuários"
                    className={`rounded p-1.5 transition hover:bg-zinc-800 ${expanded === company.id ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <Users size={14} />
                  </button>
                  <button
                    onClick={() => toggleAtivo(company)}
                    title={company.ativo ? 'Desativar' : 'Ativar'}
                    className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    {company.ativo
                      ? <ToggleRight size={16} className="text-green-400" />
                      : <ToggleLeft size={16} />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(company)}
                    title="Excluir"
                    className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Usuários da empresa (expansível) */}
              {expanded === company.id && (
                <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-950">
                  {!companyUsers[company.id] ? (
                    <div className="flex justify-center py-2">
                      <Loader2 size={16} className="animate-spin text-zinc-500" />
                    </div>
                  ) : companyUsers[company.id].length === 0 ? (
                    <p className="text-xs text-zinc-500">Nenhum usuário vinculado a esta empresa.</p>
                  ) : (
                    <ul className="space-y-1">
                      {companyUsers[company.id].map(u => (
                        <li key={u.id} className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${u.ativo ? 'bg-green-400' : 'bg-zinc-600'}`} />
                          <span className="font-medium text-zinc-300">{u.nome}</span>
                          <span className="text-zinc-600">{u.email}</span>
                          <span className={`ml-auto rounded px-1.5 py-0.5 ${u.role === 'admin' ? 'bg-amber-900/40 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
                            {u.role}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
