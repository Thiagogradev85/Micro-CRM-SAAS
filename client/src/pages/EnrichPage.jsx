import { useState, useCallback, useEffect } from 'react'
import {
  Sparkles, Search, Filter, CheckSquare, Square, Loader2,
  Instagram, Phone, Mail, Facebook, MapPin, RefreshCw
} from 'lucide-react'
import { api } from '../utils/api.js'
import { UFS, statusPill } from '../utils/constants.js'
import { EnrichModal } from '../components/EnrichModal.jsx'
import { useModal } from '../hooks/useModal.js'

const MISSING_FILTERS = [
  { key: 'instagram', label: 'Sem Instagram', icon: Instagram },
  { key: 'whatsapp',  label: 'Sem WhatsApp',  icon: Phone     },
  { key: 'email',     label: 'Sem E-mail',    icon: Mail      },
  { key: 'facebook',  label: 'Sem Facebook',  icon: Facebook  },
]

export function EnrichPage() {
  const { modal, showModal } = useModal()

  // Filtros
  const [search,   setSearch]   = useState('')
  const [uf,       setUf]       = useState('')
  const [statusId, setStatusId] = useState('')
  const [missing,  setMissing]  = useState(new Set())   // campos que devem estar vazios

  // Dados
  const [clients,   setClients]   = useState([])
  const [statuses,  setStatuses]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [total,     setTotal]     = useState(0)

  // Seleção
  const [selected, setSelected] = useState(new Set())   // Set de IDs

  // Modal de enriquecimento
  const [enrichIds, setEnrichIds] = useState(null)

  useEffect(() => {
    api.listStatuses().then(setStatuses)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const params = { limit: 9999, page: 1, ativo: true }
      if (search.trim()) params.search   = search.trim()
      if (uf)            params.uf       = uf
      if (statusId)      params.status_id = statusId

      const result = await api.listClients(params)

      // Filtra no frontend por campos faltando (mais simples que query extra no backend)
      let filtered = result.data
      for (const field of missing) {
        filtered = filtered.filter(c => !c[field])
      }

      setClients(filtered)
      setTotal(filtered.length)
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [search, uf, statusId, missing])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  function toggleMissing(field) {
    setMissing(prev => {
      const next = new Set(prev)
      next.has(field) ? next.delete(field) : next.add(field)
      return next
    })
  }

  function toggleClient(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === clients.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(clients.map(c => c.id)))
    }
  }

  function toggleUF(targetUf) {
    const ufClients = clients.filter(c => c.uf === targetUf)
    const allSelected = ufClients.every(c => selected.has(c.id))
    setSelected(prev => {
      const next = new Set(prev)
      ufClients.forEach(c => allSelected ? next.delete(c.id) : next.add(c.id))
      return next
    })
  }

  async function handleEnrichSave(patches) {
    await Promise.all(patches.map(({ id, fields }) => api.updateClient(id, fields)))
    load()
  }

  // Agrupa clientes por UF para exibição
  const grouped = clients.reduce((acc, c) => {
    const key = c.uf || '—'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})
  const sortedUFs = Object.keys(grouped).sort((a, b) => a.localeCompare(b))

  const allSelected = clients.length > 0 && selected.size === clients.length

  return (
    <div className="p-4 md:p-6 space-y-5">
      {modal}
      {enrichIds && (
        <EnrichModal
          clientIds={enrichIds}
          onSave={handleEnrichSave}
          onClose={() => { setEnrichIds(null); setSelected(new Set()) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles size={20} className="text-amber-400" />
            Enriquecimento de Dados
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Selecione clientes para buscar dados de contato faltantes automaticamente
          </p>
        </div>
        <button
          disabled={selected.size === 0}
          onClick={() => setEnrichIds([...selected])}
          className="btn btn-primary gap-2 disabled:opacity-40"
        >
          <Sparkles size={15} />
          Enriquecer {selected.size > 0 ? `${selected.size} selecionado${selected.size !== 1 ? 's' : ''}` : ''}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
          <Filter size={14} />
          Filtros
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              className="input pl-8"
              placeholder="Buscar por nome ou cidade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="input" value={uf} onChange={e => setUf(e.target.value)}>
            <option value="">Todos os estados</option>
            {UFS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <select className="input" value={statusId} onChange={e => setStatusId(e.target.value)}>
            <option value="">Todos os status</option>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>

        {/* Filtros de campos faltando */}
        <div className="flex flex-wrap gap-2">
          <span className="text-zinc-500 text-xs self-center">Mostrar apenas sem:</span>
          {MISSING_FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => toggleMissing(key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                missing.has(key)
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {loading ? 'Carregando...' : `${total} cliente${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
          </span>
          <button onClick={load} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
            <RefreshCw size={11} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Barra de ação */}
      {clients.length > 0 && (
        <div className="flex items-center gap-4 px-1">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {allSelected
              ? <CheckSquare size={16} className="text-sky-400" />
              : <Square size={16} />
            }
            {allSelected ? 'Desmarcar todos' : `Selecionar todos (${clients.length})`}
          </button>

          {selected.size > 0 && (
            <span className="text-xs text-amber-400 font-medium">
              {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Lista agrupada por UF */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500 gap-2">
          <Loader2 size={18} className="animate-spin" />
          Carregando clientes...
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <Sparkles size={32} className="mx-auto mb-2 opacity-30" />
          <p>Nenhum cliente encontrado com esses filtros</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedUFs.map(ufKey => {
            const rows = grouped[ufKey]
            const ufAllSelected = rows.every(c => selected.has(c.id))
            const ufSomeSelected = rows.some(c => selected.has(c.id))

            return (
              <div key={ufKey} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                {/* Cabeçalho da UF */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-800/60 border-b border-zinc-800">
                  <button onClick={() => toggleUF(ufKey)} className="flex items-center gap-2">
                    {ufAllSelected
                      ? <CheckSquare size={14} className="text-sky-400" />
                      : ufSomeSelected
                        ? <CheckSquare size={14} className="text-sky-400/50" />
                        : <Square size={14} className="text-zinc-500" />
                    }
                  </button>
                  <MapPin size={13} className="text-sky-400" />
                  <span className="font-semibold text-zinc-100 text-sm">{ufKey}</span>
                  <span className="text-zinc-500 text-xs">
                    {rows.length} cliente{rows.length !== 1 ? 's' : ''}
                  </span>
                  {ufSomeSelected && (
                    <span className="ml-auto text-xs text-amber-400">
                      {rows.filter(c => selected.has(c.id)).length} selecionado{rows.filter(c => selected.has(c.id)).length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Clientes da UF */}
                <div className="divide-y divide-zinc-800/60">
                  {rows.map(c => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        selected.has(c.id) ? 'bg-sky-600/5' : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleClient(c.id)}
                        className="accent-sky-500 w-4 h-4 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 font-medium truncate">{c.nome}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {c.cidade}{c.cidade && c.uf ? `/${c.uf}` : c.uf}
                        </p>
                      </div>

                      {/* Indicadores de campos presentes */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Instagram
                          size={13}
                          className={c.instagram ? 'text-pink-400' : 'text-zinc-700'}
                          title={c.instagram ? `Instagram: ${c.instagram}` : 'Sem Instagram'}
                        />
                        <Phone
                          size={13}
                          className={c.whatsapp ? 'text-green-400' : 'text-zinc-700'}
                          title={c.whatsapp ? `WhatsApp: ${c.whatsapp}` : 'Sem WhatsApp'}
                        />
                        <Mail
                          size={13}
                          className={c.email ? 'text-sky-400' : 'text-zinc-700'}
                          title={c.email ? `E-mail: ${c.email}` : 'Sem e-mail'}
                        />
                        <Facebook
                          size={13}
                          className={c.facebook ? 'text-blue-400' : 'text-zinc-700'}
                          title={c.facebook ? `Facebook: ${c.facebook}` : 'Sem Facebook'}
                        />
                      </div>

                      {c.status_nome && (
                        <span style={statusPill(c.status_cor)} className="shrink-0 hidden sm:inline">
                          {c.status_nome}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
