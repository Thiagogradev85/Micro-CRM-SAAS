import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Trash2, ShieldCheck, User, ToggleLeft, ToggleRight, Loader2, KeyRound, Bell, BellOff } from 'lucide-react'
import { api } from '../utils/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useModal } from '../hooks/useModal.js'

const EMPTY_FORM = { nome: '', email: '', password: '', role: 'user' }

export function AdminUsersPage() {
  const { user: me, onlineUserIds, mutedUsers, toggleMute } = useAuth()
  const navigate          = useNavigate()
  const { modal, showModal } = useModal()

  // Apenas admins podem acessar
  useEffect(() => {
    if (me && me.role !== 'admin') navigate('/', { replace: true })
  }, [me, navigate])
  const [users, setUsers]      = useState([])
  const [loading, setLoading]  = useState(true)
  const [form, setForm]        = useState(EMPTY_FORM)
  const [saving, setSaving]    = useState(false)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    try { setUsers(await api.listUsers()) }
    catch (err) { showModal({ type: 'error', title: 'Erro', message: err.message }) }
    finally { setLoading(false) }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createUser(form)
      setForm(EMPTY_FORM)
      await fetchUsers()
      showModal({ type: 'success', title: 'Usuário criado', message: `${form.nome} foi adicionado com sucesso.` })
    } catch (err) {
      showModal({ type: 'error', title: 'Erro ao criar', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function toggleAtivo(user) {
    try {
      await api.updateUser(user.id, { ativo: !user.ativo })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ativo: !u.ativo } : u))
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  function handleResetPassword(user) {
    let newPassword = ''
    showModal({
      type: 'warning',
      title: `Redefinir senha — ${user.nome}`,
      message: (
        <div className="mt-2">
          <label className="block text-xs text-zinc-400 mb-1">Nova senha (mínimo 6 caracteres)</label>
          <input
            type="password"
            minLength={6}
            autoFocus
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            onChange={e => { newPassword = e.target.value }}
          />
        </div>
      ),
      actions: [{
        label: 'Salvar senha',
        variant: 'primary',
        onClick: async () => {
          if (!newPassword || newPassword.length < 6) {
            showModal({ type: 'error', title: 'Senha inválida', message: 'A senha deve ter pelo menos 6 caracteres.' })
            return
          }
          try {
            await api.updateUser(user.id, { password: newPassword })
            showModal({ type: 'success', title: 'Senha alterada', message: `Senha de ${user.nome} atualizada.` })
          } catch (err) {
            showModal({ type: 'error', title: 'Erro', message: err.message })
          }
        },
      }],
    })
  }

  function handleDelete(user) {
    showModal({
      type: 'warning',
      title: 'Excluir usuário',
      message: `Excluir permanentemente "${user.nome}"? Todos os dados vinculados a este usuário serão removidos.`,
      actions: [{
        label: 'Excluir',
        variant: 'danger',
        onClick: async () => {
          try {
            await api.deleteUser(user.id)
            setUsers(prev => prev.filter(u => u.id !== user.id))
          } catch (err) {
            showModal({ type: 'error', title: 'Erro ao excluir', message: err.message })
          }
        },
      }],
    })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {modal}

      <h1 className="text-xl font-bold text-white mb-6">Gerenciar Usuários</h1>

      {/* Formulário de criação */}
      <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">Novo usuário</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Nome</label>
            <input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              placeholder="João Silva"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              placeholder="joao@empresa.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Perfil</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="user">Usuário</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {saving ? 'Criando...' : 'Criar usuário'}
          </button>
        </div>
      </form>

      {/* Lista de usuários */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div
              key={user.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition
                ${user.ativo ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-800/50 bg-zinc-900/50 opacity-60'}`}
            >
              {user.role === 'admin'
                ? <ShieldCheck size={16} className="flex-shrink-0 text-amber-400" />
                : <User size={16} className="flex-shrink-0 text-zinc-500" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{user.nome}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${user.role === 'admin' ? 'bg-amber-900/40 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    {user.role}
                  </span>
                  {!user.ativo && <span className="rounded bg-red-900/30 px-1.5 py-0.5 text-xs text-red-400">inativo</span>}
                  {onlineUserIds.includes(String(user.id)) && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      online
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-1">
                {/* Silenciar notificação de presença — só para usuários não-admin */}
                {user.role !== 'admin' && (
                  <button
                    onClick={() => toggleMute(user.id)}
                    title={mutedUsers.has(String(user.id)) ? 'Notificações silenciadas — clique para ativar' : 'Silenciar notificação de entrada'}
                    className={`rounded p-1.5 transition hover:bg-zinc-800 ${
                      mutedUsers.has(String(user.id))
                        ? 'text-zinc-600 hover:text-zinc-400'
                        : 'text-zinc-500 hover:text-yellow-400'
                    }`}
                  >
                    {mutedUsers.has(String(user.id))
                      ? <BellOff size={14} />
                      : <Bell size={14} />
                    }
                  </button>
                )}
                <button
                  onClick={() => toggleAtivo(user)}
                  disabled={user.id === me?.id}
                  title={user.ativo ? 'Desativar' : 'Ativar'}
                  className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-30"
                >
                  {user.ativo ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                </button>
                <button
                  onClick={() => handleResetPassword(user)}
                  title="Redefinir senha"
                  className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-blue-400"
                >
                  <KeyRound size={14} />
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  disabled={user.id === me?.id}
                  title="Excluir"
                  className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
