import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Upload, Phone, Star, Eye, UserX, RefreshCw,
  List, MapPin, Loader2, Instagram, X, Trash2, Download,
  ArrowUpDown, ArrowUp, ArrowDown, Sparkles, AlertTriangle,
  ChevronDown, ChevronUp, CopyX, Settings
} from 'lucide-react'

const FILTERS_KEY               = 'clients_filters'
const VIEW_KEY                  = 'clients_viewMode'
const ATTENTION_IGNORED_UFS_KEY = 'attention_ignored_ufs'
const ATTENTION_DAYS_KEY        = 'attention_days'

function savedFilters() {
  try { return JSON.parse(sessionStorage.getItem(FILTERS_KEY)) } catch { return null }
}
import { api } from '../utils/api.js'
import { formatDate, statusPill, NOTAS, UFS, whatsappLink, instagramLink } from '../utils/constants.js'
import { ClientForm } from '../components/ClientForm.jsx'
import { EmptyState } from '../components/EmptyState.jsx'
import { useModal } from '../hooks/useModal.js'
import { useOverdueReminder } from '../hooks/useOverdueReminder.js'
import { OverdueReminderModal } from '../components/OverdueReminderModal.jsx'
import { DuplicatesModal } from '../components/DuplicatesModal.jsx'

function isCreatedToday(dateStr) {
  if (!dateStr) return false
  const today = new Date().toLocaleDateString('en-CA') // data local do usuário
  return dateStr.slice(0, 10) === today
}

// Status que indicam encerramento ou vínculo permanente — excluídos do lembrete de atenção.
const OVERDUE_EXCLUDED_STATUSES = new Set([
  'Fabricação Própria',
  'Exclusividade',
])

function isOverdue(client, days) {
  const thresholdMs = days * 24 * 60 * 60 * 1000
  if (isCreatedToday(client.created_at)) return false
  if (OVERDUE_EXCLUDED_STATUSES.has(client.status_nome)) return false
  if (client.ultimo_contato) {
    return Date.now() - new Date(client.ultimo_contato) > thresholdMs
  }
  return Date.now() - new Date(client.created_at) > thresholdMs
}

// Agrupa array de clientes por UF, retorna objeto { 'SP': [...], 'RJ': [...] }
function groupByUF(clients) {
  return clients.reduce((acc, c) => {
    const key = c.uf || '—'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})
}

// Linha individual de cliente (reutilizada em ambos os modos)
function ClientRow({ c, alreadyContacted, isAttention, onContact, onDeactivate, onDelete, navigate }) {
  return (
    <tr key={c.id}>
      <td className="max-w-[180px] break-words">
        <button
          className="text-sky-400 hover:text-sky-300 font-medium text-left break-words"
          onClick={() => navigate(`/clients/${c.id}`)}
        >
          {c.nome}
        </button>
        {isAttention && (
          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle size={10} /> Atenção
          </span>
        )}
        {c.ja_cliente && (
          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-xs font-bold bg-green-600/20 text-green-400 border border-green-600/30">Cliente</span>
        )}
        {isCreatedToday(c.created_at) && (
          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Novo</span>
        )}
        {!c.ativo && (
          <span className="ml-2 badge bg-zinc-700 text-zinc-400">Inativo</span>
        )}
      </td>
      <td className="hidden sm:table-cell text-zinc-400">
        {c.cidade}{c.cidade && c.uf ? '/' : ''}{c.uf}
      </td>
      <td className="hidden md:table-cell text-zinc-400">
        {whatsappLink(c.whatsapp)
          ? <a href={whatsappLink(c.whatsapp)} target="_blank" rel="noreferrer"
              className="text-green-400 hover:text-green-300 flex items-center gap-1">
              <Phone size={12} /> {c.whatsapp}
            </a>
          : <span className="text-zinc-600">—</span>
        }
      </td>
      <td className="hidden md:table-cell">
        {c.instagram
          ? <a href={instagramLink(c.instagram)} target="_blank" rel="noreferrer"
              title={c.instagram}
              className="text-pink-400 hover:text-pink-300">
              <Instagram size={14} />
            </a>
          : null
        }
      </td>
      <td>
        {c.status_nome
          ? <span style={statusPill(c.status_cor)}>{c.status_nome}</span>
          : <span className="text-zinc-600">—</span>
        }
      </td>
      <td className="hidden md:table-cell">
        {c.nota
          ? <span className={`font-semibold ${NOTAS[c.nota]?.color}`}>
              <Star size={12} className="inline mr-1" />
              {NOTAS[c.nota]?.label}
            </span>
          : '—'
        }
      </td>
      <td className="hidden lg:table-cell text-zinc-400">
        {formatDate(c.ultimo_contato)}
      </td>
      <td className="whitespace-nowrap">
        <div className="flex gap-1.5">
          <button
            className={`btn btn-sm ${alreadyContacted ? 'btn-secondary opacity-40' : 'btn-primary'}`}
            onClick={() => !alreadyContacted && onContact(c)}
            disabled={alreadyContacted}
            title={alreadyContacted ? 'Já contatado hoje' : 'Marcar como Contatado'}
          >
            <Phone size={12} />
            <span className="hidden sm:inline">
              {alreadyContacted ? 'Contatado ✓' : 'Contatado'}
            </span>
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={() => navigate(`/clients/${c.id}`)}
            title="Ver detalhes"
          >
            <Eye size={13} />
          </button>
          {c.ativo
            ? (
              <button
                className="btn-danger btn-sm"
                onClick={() => onDeactivate(c)}
                title="Inativar cliente"
              >
                <UserX size={13} />
              </button>
            ) : (
              <button
                className="btn-danger btn-sm"
                onClick={() => onDelete(c)}
                title="Excluir permanentemente"
              >
                <Trash2 size={13} />
              </button>
            )
          }
        </div>
      </td>
    </tr>
  )
}

export function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients]   = useState([])
  const [total, setTotal]       = useState(0)
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading]     = useState(false)
  const [importing, setImporting] = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [contactedToday, setContactedToday] = useState(new Set())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [dupModal, setDupModal] = useState(null)
  // 'state' = agrupado por estado | 'list' = lista plana com paginação
  const [viewMode, setViewMode] = useState(
    () => sessionStorage.getItem(VIEW_KEY) || 'state'
  )
  const [nameSort, setNameSort] = useState('asc') // 'asc' | 'desc'
  const [attentionOpen, setAttentionOpen] = useState(
    () => sessionStorage.getItem('section_attention') === 'true'
  )
  const [listAttentionOpen, setListAttentionOpen] = useState(
    () => sessionStorage.getItem('section_list_attention') === 'true'
  )
  const [attentionIgnoredUFs, setAttentionIgnoredUFs] = useState(() => {
    try {
      const saved = localStorage.getItem(ATTENTION_IGNORED_UFS_KEY)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [attentionDays, setAttentionDays] = useState(() => {
    const saved = parseInt(localStorage.getItem(ATTENTION_DAYS_KEY))
    return saved > 0 ? saved : 3
  })
  const [attentionUFPopover, setAttentionUFPopover] = useState(false)
  const [newClientsOpen, setNewClientsOpen] = useState(
    () => sessionStorage.getItem('section_newclients') === 'true'
  )
  const { modal, showModal } = useModal()
  const { overdueClients, showModal: showOverdueModal, dismiss: dismissOverdue } = useOverdueReminder(attentionDays)

  const [filters, setFilters] = useState(
    () => savedFilters() || { search: '', status_id: '', uf: '', ativo: '', ja_cliente: '', page: 1 }
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const base = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      )

      let params
      if (viewMode === 'state') {
        params = { ...base, sort: 'uf', limit: 9999, page: 1 }
      } else {
        // Lista: busca todos para poder exibir seção Atenção e paginar no frontend
        params = { ...base, limit: 9999, page: 1 }
      }

      const result = await api.listClients(params)
      setClients(result.data)
      setTotal(result.total)

      // Verifica quais clientes já foram contatados hoje
      const today = new Date().toLocaleDateString('en-CA') // data local do usuário
      const details = await api.getReportDetails(today)
      setContactedToday(new Set(details.details.contacted.map(c => c.client_id)))
    } finally {
      setLoading(false)
    }
  }, [filters, viewMode])

  useEffect(() => {
    api.listStatuses().then(setStatuses)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleContact(client) {
    try {
      await api.updateClient(client.id, { status_id: statuses.find(s => s.nome === 'Contatado')?.id })
      setContactedToday(prev => new Set([...prev, client.id]))
      showModal({ type: 'success', title: 'Status atualizado', message: `${client.nome} marcado como Contatado!` })
      load()
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  function handleDeactivate(client) {
    showModal({
      type: 'warning',
      title: `O que deseja fazer com ${client.nome}?`,
      message: 'Escolha entre inativar (mantém o histórico) ou excluir permanentemente do banco.',
      actions: [
        {
          label: 'Inativar (manter histórico)',
          variant: 'secondary',
          onClick: async () => {
            try {
              await api.deleteClient(client.id, false)
              showModal({ type: 'success', title: 'Concluído', message: `${client.nome} inativado.` })
              load()
            } catch (err) {
              showModal({ type: 'error', title: 'Erro', message: err.message })
            }
          },
        },
        {
          label: 'Excluir permanentemente',
          variant: 'danger',
          onClick: async () => {
            try {
              await api.deleteClient(client.id, true)
              showModal({ type: 'success', title: 'Concluído', message: `${client.nome} excluído permanentemente.` })
              load()
            } catch (err) {
              showModal({ type: 'error', title: 'Erro', message: err.message })
            }
          },
        },
      ],
    })
  }

  function handleDelete(client) {
    showModal({
      type: 'warning',
      title: `Excluir ${client.nome}?`,
      message: 'Esta ação é permanente e não pode ser desfeita.',
      actions: [
        {
          label: 'Sim, excluir permanentemente',
          variant: 'danger',
          onClick: async () => {
            try {
              await api.deleteClient(client.id, true)
              showModal({ type: 'success', title: 'Concluído', message: `${client.nome} excluído permanentemente.` })
              load()
            } catch (err) {
              showModal({ type: 'error', title: 'Erro', message: err.message })
            }
          },
        },
      ],
    })
  }

  async function handleOpenDuplicates() {
    setDupModal({ loading: true })
    try {
      const data = await api.findDuplicates()
      setDupModal({ groups: data.groups })
    } catch (err) {
      setDupModal(null)
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  async function handleDeleteDuplicate(client, groupIdx) {
    try {
      await api.deleteClient(client.id, true)
      setDupModal(prev => {
        const groups = prev.groups
          .map((g, i) => i === groupIdx ? g.filter(c => c.id !== client.id) : g)
          .filter(g => g.length > 1)
        return { groups }
      })
      load()
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  async function handleCreate(data) {
    try {
      await api.createClient(data)
      setShowForm(false)
      showModal({ type: 'success', title: 'Cliente criado', message: 'Cliente criado com sucesso!' })
      load()
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    try {
      const result = await api.importClients(file)
      const parts = []
      if (result.imported > 0) parts.push(`${result.imported} novo${result.imported !== 1 ? 's' : ''}`)
      if (result.updated  > 0) parts.push(`${result.updated} atualizado${result.updated  !== 1 ? 's' : ''}`)
      if (result.skipped  > 0) parts.push(`${result.skipped} ignorado${result.skipped   !== 1 ? 's' : ''}`)
      const hasErrors = result.errors?.length > 0
      showModal({
        type: hasErrors && result.imported === 0 ? 'error' : 'success',
        title: 'Importação concluída',
        message: parts.length ? `Importação concluída: ${parts.join(' · ')}` : 'Nenhum registro importado.',
        details: hasErrors ? [`${result.errors.length} registro(s) com erro — verifique o arquivo`] : undefined,
      })
      load()
    } catch (err) {
      showModal({ type: 'error', title: 'Erro na importação', message: err.message })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  // Persiste filtros e viewMode no sessionStorage
  useEffect(() => {
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters))
  }, [filters])

  useEffect(() => {
    sessionStorage.setItem(VIEW_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    sessionStorage.setItem('section_attention', attentionOpen)
  }, [attentionOpen])

  useEffect(() => {
    sessionStorage.setItem('section_list_attention', listAttentionOpen)
  }, [listAttentionOpen])

  useEffect(() => {
    sessionStorage.setItem('section_newclients', newClientsOpen)
  }, [newClientsOpen])

  useEffect(() => {
    localStorage.setItem(ATTENTION_IGNORED_UFS_KEY, JSON.stringify([...attentionIgnoredUFs]))
  }, [attentionIgnoredUFs])

  useEffect(() => {
    localStorage.setItem(ATTENTION_DAYS_KEY, String(attentionDays))
  }, [attentionDays])

  function toggleIgnoredUF(uf) {
    setAttentionIgnoredUFs(prev => {
      const next = new Set(prev)
      if (next.has(uf)) next.delete(uf)
      else next.add(uf)
      return next
    })
  }

  const EMPTY_FILTERS = { search: '', status_id: '', uf: '', ativo: '', ja_cliente: '', page: 1 }

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }))

  const hasActiveFilters = filters.search || filters.status_id || filters.uf || filters.ativo || filters.ja_cliente

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    sessionStorage.removeItem(FILTERS_KEY)
  }

  const SortIcon = nameSort === 'asc' ? ArrowUp : ArrowDown

  const tableHead = (
    <thead>
      <tr>
        <th>
          <button
            className="flex items-center gap-1 hover:text-sky-400 transition-colors"
            onClick={() => setNameSort(s => s === 'asc' ? 'desc' : 'asc')}
            title="Ordenar por nome"
          >
            Nome
            <SortIcon size={13} className="text-sky-400" />
          </button>
        </th>
        <th className="hidden sm:table-cell">Cidade/UF</th>
        <th className="hidden md:table-cell">WhatsApp</th>
        <th className="hidden md:table-cell">Instagram</th>
        <th>Status</th>
        <th className="hidden md:table-cell">Nota</th>
        <th className="hidden lg:table-cell">Últ. Contato</th>
        <th>Ações</th>
      </tr>
    </thead>
  )

  const rowProps = { contactedToday, onContact: handleContact, onDeactivate: handleDeactivate, onDelete: handleDelete, navigate }

  function sortByName(arr) {
    return [...arr].sort((a, b) => {
      const cmp = (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
      return nameSort === 'asc' ? cmp : -cmp
    })
  }

  // ── Seção Atenção reutilizável (estado e lista) ─────────────────────────────
  function renderAttentionSection(isOpen, setIsOpen) {
    const allOverdue      = clients.filter(c => isOverdue(c, attentionDays))
    const filteredOverdue = allOverdue.filter(c => !attentionIgnoredUFs.has(c.uf || '—'))
    const ufOptions       = [...new Set(allOverdue.map(c => c.uf || '—'))].sort()

    if (allOverdue.length === 0) return null

    return (
      <div className="table-wrapper">
        {attentionUFPopover && (
          <div className="fixed inset-0 z-10" onClick={() => setAttentionUFPopover(false)} />
        )}
        <div className="flex items-center bg-amber-950 border-b border-amber-800">
          <button
            className="flex-1 flex items-center gap-2 px-4 py-2 hover:bg-amber-900/60 transition-colors text-left"
            onClick={() => setIsOpen(v => !v)}
          >
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="font-semibold text-amber-300 text-sm">Atenção</span>
            <span className="text-amber-700 text-xs">
              {filteredOverdue.length} cliente{filteredOverdue.length !== 1 ? 's' : ''} sem contato há mais de 3 dias
              {attentionIgnoredUFs.size > 0 && (
                <span className="ml-1 text-amber-800">
                  · {attentionIgnoredUFs.size} UF{attentionIgnoredUFs.size !== 1 ? 's' : ''} oculta{attentionIgnoredUFs.size !== 1 ? 's' : ''}
                </span>
              )}
            </span>
            {isOpen
              ? <ChevronUp size={14} className="ml-auto text-amber-600" />
              : <ChevronDown size={14} className="ml-auto text-amber-600" />
            }
          </button>
          <div className="relative px-2">
            <button
              className={`p-1.5 rounded transition-colors ${attentionIgnoredUFs.size > 0 ? 'text-amber-400 bg-amber-800/50' : 'text-amber-700 hover:text-amber-400 hover:bg-amber-800/30'}`}
              title="Filtrar estados do grupo de atenção"
              onClick={e => { e.stopPropagation(); setAttentionUFPopover(v => !v) }}
            >
              <Settings size={13} />
            </button>
            {attentionUFPopover && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-3 min-w-[200px]">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-700">
                  <span className="text-xs text-zinc-400">Alertar após</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={attentionDays}
                    onChange={e => setAttentionDays(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                    onClick={e => e.stopPropagation()}
                    className="w-12 text-center bg-zinc-800 border border-zinc-600 rounded text-sm text-zinc-200 px-1 py-0.5 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-zinc-400">dias</span>
                </div>
                <p className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">Ocultar estados</p>
                <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
                  {ufOptions.map(uf => (
                    <label key={uf} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 hover:text-zinc-100">
                      <input
                        type="checkbox"
                        checked={attentionIgnoredUFs.has(uf)}
                        onChange={() => toggleIgnoredUF(uf)}
                        className="accent-amber-500"
                      />
                      <span>{uf}</span>
                      <span className="ml-auto text-zinc-500 text-xs">
                        {allOverdue.filter(c => (c.uf || '—') === uf).length}
                      </span>
                    </label>
                  ))}
                </div>
                {attentionIgnoredUFs.size > 0 && (
                  <button
                    className="mt-2 w-full text-xs text-amber-600 hover:text-amber-400 transition-colors"
                    onClick={() => setAttentionIgnoredUFs(new Set())}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {isOpen && filteredOverdue.length > 0 && (
          <table className="table">
            {tableHead}
            <tbody>
              {sortByName(filteredOverdue).map(c => (
                <ClientRow key={c.id} c={c} isAttention alreadyContacted={contactedToday.has(c.id)} {...rowProps} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  // ── Render modo "Por Estado" ────────────────────────────────────────────────
  function renderStateView() {
    const newClients    = clients.filter(c => isCreatedToday(c.created_at))
    const allOverdue    = clients.filter(c => isOverdue(c, attentionDays))
    const normalClients = clients.filter(c => !isOverdue(c, attentionDays))

    const grouped   = groupByUF(normalClients)
    const sortedUFs = Object.keys(grouped).sort((a, b) => a.localeCompare(b))

    if (newClients.length === 0 && allOverdue.length === 0 && sortedUFs.length === 0)
      return <EmptyState icon={Search} message="Nenhum cliente encontrado" />

    function UFSection({ uf, rows }) {
      const [open, setOpen] = useState(false)
      return (
        <div className="table-wrapper">
          <button
            className="w-full flex items-center gap-2 px-4 py-2 bg-zinc-800 border-b border-zinc-700 hover:bg-zinc-700/60 transition-colors text-left"
            onClick={() => setOpen(v => !v)}
          >
            <MapPin size={14} className="text-sky-400" />
            <span className="font-semibold text-zinc-100 text-sm">{uf}</span>
            <span className="text-zinc-500 text-xs">
              {rows.length} cliente{rows.length !== 1 ? 's' : ''}
            </span>
            {open
              ? <ChevronUp size={14} className="ml-auto text-zinc-600" />
              : <ChevronDown size={14} className="ml-auto text-zinc-600" />
            }
          </button>
          {open && (
            <table className="table">
              {tableHead}
              <tbody>
                {sortByName(rows).map(c => (
                  <ClientRow key={c.id} c={c} alreadyContacted={contactedToday.has(c.id)} {...rowProps} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Seção Atenção — clientes sem contato há mais de 3 dias */}
        {renderAttentionSection(attentionOpen, setAttentionOpen)}

        {/* Seção Novos — clientes criados hoje */}
        {newClients.length > 0 && (
          <div className="table-wrapper">
            <button
              className="w-full flex items-center gap-2 px-4 py-2 bg-emerald-950 border-b border-emerald-800 hover:bg-emerald-900/60 transition-colors text-left"
              onClick={() => setNewClientsOpen(v => !v)}
            >
              <Sparkles size={14} className="text-emerald-400" />
              <span className="font-semibold text-emerald-300 text-sm">Novos</span>
              <span className="text-emerald-600 text-xs">
                {newClients.length} cliente{newClients.length !== 1 ? 's' : ''} cadastrado{newClients.length !== 1 ? 's' : ''} hoje
              </span>
              {newClientsOpen
                ? <ChevronUp size={14} className="ml-auto text-emerald-700" />
                : <ChevronDown size={14} className="ml-auto text-emerald-700" />
              }
            </button>
            {newClientsOpen && (
              <table className="table">
                {tableHead}
                <tbody>
                  {sortByName(newClients).map(c => (
                    <ClientRow key={c.id} c={c} alreadyContacted={contactedToday.has(c.id)} {...rowProps} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Seções por UF */}
        {sortedUFs.map(uf => (
          <UFSection key={uf} uf={uf} rows={grouped[uf]} />
        ))}
      </div>
    )
  }

  // ── Render modo "Lista" ─────────────────────────────────────────────────────
  function renderListView() {
    if (clients.length === 0) return <EmptyState icon={Search} message="Nenhum cliente encontrado" />

    const normalClients  = sortByName(clients.filter(c => !isOverdue(c, attentionDays)))
    const totalPages     = Math.ceil(normalClients.length / 50)
    const pageClients    = normalClients.slice((filters.page - 1) * 50, filters.page * 50)

    return (
      <>
        {/* Seção Atenção */}
        {renderAttentionSection(listAttentionOpen, setListAttentionOpen)}

        {/* Tabela principal (sem clientes em atraso) */}
        {pageClients.length > 0 && (
          <div className="table-wrapper">
            <table className="table">
              {tableHead}
              <tbody>
                {pageClients.map(c => (
                  <ClientRow
                    key={c.id}
                    c={c}
                    alreadyContacted={contactedToday.has(c.id)}
                    {...rowProps}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {normalClients.length > 50 && (
          <div className="flex gap-2 justify-end text-sm">
            <button
              className="btn-secondary btn-sm"
              disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: 1 }))}
            >
              « Primeira
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
            >
              ← Anterior
            </button>
            <span className="px-3 py-1 text-zinc-400">
              Página {filters.page} de {totalPages}
            </span>
            <button
              className="btn-secondary btn-sm"
              disabled={filters.page >= totalPages}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            >
              Próxima →
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {modal}

      <DuplicatesModal
        state={dupModal}
        onClose={() => setDupModal(null)}
        onDelete={handleDeleteDuplicate}
        navigate={navigate}
      />

      {showOverdueModal && (
        <OverdueReminderModal clients={overdueClients} onClose={dismissOverdue} />
      )}

      {/* Overlay de importação */}
      {importing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl">
            <Loader2 size={40} className="animate-spin text-sky-400" />
            <p className="text-zinc-100 font-semibold text-lg">Importando clientes...</p>
            <p className="text-zinc-500 text-sm">Aguarde, processando o arquivo Excel</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Clientes</h1>
          <p className="text-xs text-zinc-500">{total} clientes</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleOpenDuplicates} title="Verificar clientes duplicados">
            <CopyX size={15} /> Duplicatas
          </button>
          <label className={`btn-secondary cursor-pointer ${importing ? 'opacity-60 pointer-events-none' : ''}`}>
            {importing
              ? <><Loader2 size={15} className="animate-spin" /> Importando...</>
              : <><Upload size={15} /> Importar</>
            }
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <div className="relative">
            <button className="btn-secondary flex items-center gap-1.5" onClick={() => setShowExportMenu(m => !m)}>
              <Download size={15} /> Exportar
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 flex flex-col py-1">
                  <button
                    className="px-4 py-2.5 text-sm text-left text-zinc-200 hover:bg-zinc-700 transition-colors"
                    onClick={() => {
                      api.exportClients(Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== '')), 'xlsx')
                      setShowExportMenu(false)
                    }}
                  >
                    📊 Excel (.xlsx)
                  </button>
                  <button
                    className="px-4 py-2.5 text-sm text-left text-zinc-200 hover:bg-zinc-700 transition-colors"
                    onClick={() => {
                      api.exportClients(Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== '')), 'pdf')
                      setShowExportMenu(false)
                    }}
                  >
                    📄 PDF
                  </button>
                </div>
              </>
            )}
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={15} /> Novo
          </button>
        </div>
      </div>

      {/* Formulário de novo cliente */}
      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-zinc-200 mb-4">Novo Cliente</h2>
          <ClientForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Filtros + toggle de view */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
          <input
            className="input pl-8"
            placeholder="Buscar nome, cidade..."
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>
        <select
          className="select w-auto"
          value={filters.uf}
          onChange={e => setFilter('uf', e.target.value)}
        >
          <option value="">Todos os estados</option>
          {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>
        <select
          className="select w-auto"
          value={filters.status_id}
          onChange={e => setFilter('status_id', e.target.value)}
        >
          <option value="">Todos os status</option>
          {statuses.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <select
          className="select w-auto"
          value={filters.ativo}
          onChange={e => setFilter('ativo', e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <select
          className="select w-auto"
          value={filters.ja_cliente}
          onChange={e => setFilter('ja_cliente', e.target.value)}
        >
          <option value="">Prospects + Clientes</option>
          <option value="true">Só Clientes</option>
          <option value="false">Só Prospects</option>
        </select>

        {/* Toggle view mode */}
        <div className="flex rounded-md overflow-hidden border border-zinc-700">
          <button
            className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
              viewMode === 'state'
                ? 'bg-sky-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => setViewMode('state')}
            title="Agrupar por estado"
          >
            <MapPin size={13} /> Por Estado
          </button>
          <button
            className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
              viewMode === 'list'
                ? 'bg-sky-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => setViewMode('list')}
            title="Lista simples"
          >
            <List size={13} /> Lista
          </button>
        </div>

        {hasActiveFilters && (
          <button
            className="btn-secondary btn-sm flex items-center gap-1"
            onClick={clearFilters}
            title="Limpar filtros"
          >
            <X size={13} /> Limpar
          </button>
        )}

        <button className="btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
      ) : viewMode === 'state' ? renderStateView() : renderListView()}
    </div>
  )
}
