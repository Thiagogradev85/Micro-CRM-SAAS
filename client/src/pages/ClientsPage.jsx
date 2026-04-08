import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
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
import { formatDate, statusPill, NOTAS, UFS, whatsappLink, instagramLink, broadcastClient } from '../utils/constants.js'
import { ClientForm } from '../components/ClientForm.jsx'
import { EmptyState } from '../components/EmptyState.jsx'
import { useModal } from '../hooks/useModal.js'
import { useOverdueReminder } from '../hooks/useOverdueReminder.js'
import { OverdueReminderModal } from '../components/OverdueReminderModal.jsx'
import { DuplicatesModal } from '../components/DuplicatesModal.jsx'
import { EnrichModal } from '../components/EnrichModal.jsx'

// Input de busca isolado — digitar aqui não re-renderiza o ClientsPage
const SearchInput = memo(function SearchInput({ initialValue, onSearch }) {
  const [value, setValue] = useState(initialValue)
  const timer = useRef(null)
  return (
    <div className="relative flex-1 min-w-[180px]">
      <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
      <input
        className="input pl-8"
        placeholder="Buscar nome, cidade..."
        value={value}
        onChange={e => {
          setValue(e.target.value)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => onSearch(e.target.value), 300)
        }}
      />
    </div>
  )
})

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
const ClientRow = memo(function ClientRow({ c, alreadyContacted, isAttention, onContact, onDeactivate, onDelete, onEnrich }) {
  return (
    <tr key={c.id}>
      <td className="max-w-[180px] break-words">
        <a
          href={`/clients/${c.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 font-medium text-left break-words"
        >
          {c.nome}
        </a>
        {isAttention && (
          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle size={10} /> Atenção
          </span>
        )}
        {c.ja_cliente && (
          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-xs font-bold bg-green-600/20 text-green-400 border border-green-600/30">Cliente</span>
        )}
        {c.catalogo_enviado && (
          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-xs font-bold bg-pink-600/20 text-pink-400 border border-pink-600/30">Catálogo</span>
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
          <a
            href={`/clients/${c.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost btn-sm"
            title="Ver detalhes"
          >
            <Eye size={13} />
          </a>
          <button
            className="btn-ghost btn-sm"
            onClick={() => onEnrich(c)}
            title="Enriquecer dados deste cliente"
          >
            <Sparkles size={13} className="text-amber-400" />
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
})

const PAGE_SIZE = 50

const UFSection = memo(function UFSection({ uf, count, rows, tableHead, contactedToday, rowProps, isOpen, onToggle, loadingRows }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const displayCount = count ?? rows?.length

  // Resetar paginação interna ao fechar ou ao trocar rows
  useEffect(() => { if (!isOpen) setVisibleCount(PAGE_SIZE) }, [isOpen])
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [rows])

  const visibleRows = rows ? rows.slice(0, visibleCount) : null
  const hasMore     = rows ? rows.length > visibleCount : false

  return (
    <div className="table-wrapper">
      <button
        className="w-full flex items-center gap-2 px-4 py-2 bg-zinc-800 border-b border-zinc-700 hover:bg-zinc-700/60 transition-colors text-left"
        onClick={onToggle}
      >
        <MapPin size={14} className="text-sky-400" />
        <span className="font-semibold text-zinc-100 text-sm">{uf}</span>
        <span className="text-zinc-500 text-xs">
          {displayCount != null ? `${displayCount} cliente${displayCount !== 1 ? 's' : ''}` : '...'}
        </span>
        {isOpen
          ? <ChevronUp size={14} className="ml-auto text-zinc-600" />
          : <ChevronDown size={14} className="ml-auto text-zinc-600" />
        }
      </button>
      {isOpen && (
        loadingRows
          ? <div className="flex items-center justify-center py-6 text-zinc-500 text-sm gap-2">
              <Loader2 size={15} className="animate-spin" /> Carregando...
            </div>
          : visibleRows?.length > 0
            ? <>
                <table className="table">
                  {tableHead}
                  <tbody>
                    {visibleRows.map(c => (
                      <ClientRow key={c.id} c={c} alreadyContacted={contactedToday.has(c.id)} {...rowProps} />
                    ))}
                  </tbody>
                </table>
                {hasMore && (
                  <button
                    className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                    onClick={e => { e.stopPropagation(); setVisibleCount(v => v + PAGE_SIZE) }}
                  >
                    Ver mais ({rows.length - visibleCount} restantes)
                  </button>
                )}
              </>
            : <div className="py-4 text-center text-zinc-600 text-sm">Nenhum cliente</div>
      )}
    </div>
  )
})

export function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients]   = useState([])
  const [total, setTotal]       = useState(0)
  // Lazy load (state view sem filtros)
  const [ufSummary, setUfSummary]         = useState([])   // [{uf, count}]
  const [ufCache, setUfCache]             = useState(new Map()) // uf → {data, loading}
  const [overdueSection, setOverdueSection] = useState([]) // para seção Atenção no lazy mode
  const [newSection, setNewSection]         = useState([]) // para seção Novos no lazy mode
  // Chave para resetar o SearchInput ao limpar filtros
  const [searchKey, setSearchKey] = useState(0)
  // Contador para forçar auto-load após invalidação do cache por broadcast
  const [ufCacheVersion, setUfCacheVersion] = useState(0)
  const handleSearch = useCallback((val) => setFilter('search', val), [])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading]     = useState(false)
  const [importing, setImporting] = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [contactedToday, setContactedToday] = useState(new Set())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [dupModal, setDupModal] = useState(null)
  const [enrichModal, setEnrichModal] = useState(null)
  // 'state' = agrupado por estado | 'list' = lista plana com paginação
  const [viewMode, setViewMode] = useState(
    () => sessionStorage.getItem(VIEW_KEY) || 'state'
  )
  const [nameSort, setNameSort]         = useState('asc')  // 'asc' | 'desc'
  const [contactSort, setContactSort]   = useState(null)   // null | 'asc' | 'desc'
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
  // Mapa de estado aberto/fechado por UF — sobrevive a re-renders e loads
  const [openUFs, setOpenUFs] = useState(new Map())

  function toggleUF(uf) {
    setOpenUFs(prev => {
      const next = new Map(prev)
      const opening = !next.get(uf)
      next.set(uf, opening)
      if (opening && isStateView) loadUF(uf)
      return next
    })
  }

  function isUFOpen(uf, totalUFs) {
    if (openUFs.has(uf)) return openUFs.get(uf)
    // Padrão: aberto quando há filtro de UF específico ou só 1 seção visível
    return totalUFs === 1 || !!filters.uf
  }
  const { modal, showModal } = useModal()
  const { overdueClients, showModal: showOverdueModal, dismiss: dismissOverdue } = useOverdueReminder(attentionDays)

  const [filters, setFilters] = useState(
    () => savedFilters() || { search: '', status_id: '', uf: '', ativo: '', ja_cliente: '', catalogo_enviado: '', page: 1 }
  )

  // State view sempre usa lazy-por-UF. List view usa paginação real.
  const isStateView = viewMode === 'state'

  // Filtros aplicáveis ao /clients/ufs e ao lazy load por UF
  const activeFilters = useMemo(() => Object.fromEntries(
    Object.entries(filters).filter(([k, v]) => v !== '' && k !== 'page')
  ), [filters])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date().toLocaleDateString('en-CA')
      const [details, overdueData] = await Promise.all([
        api.getReportDetails(today),
        api.getOverdueClients(attentionDays),
      ])
      setContactedToday(new Set(details.details.contacted.map(c => c.client_id)))
      setOverdueSection(overdueData)

      if (isStateView) {
        // State view: sempre lazy — carrega só UFs + contagem + seção Novos
        const filterParams = Object.fromEntries(
          Object.entries(activeFilters).filter(([k]) => k !== 'uf')
        )
        const [ufData, newData] = await Promise.all([
          api.listClientUFs(Object.keys(filterParams).length ? filterParams : undefined),
          api.listClients({ sort: 'created_at_desc', limit: 100 }),
        ])
        // Se filtro de UF ativo, restringe a lista de seções
        const filtered = activeFilters.uf
          ? ufData.filter(r => r.uf === activeFilters.uf)
          : ufData
        setUfSummary(filtered)
        setTotal(filtered.reduce((s, r) => s + r.count, 0))
        setNewSection(newData.data.filter(c => isCreatedToday(c.created_at)))
        setUfCache(new Map()) // invalida cache ao mudar filtros
        setClients([])
      } else {
        // List view: paginação real no backend
        let listSort = 'created_at'
        if (contactSort === 'asc')       listSort = 'contato_asc'
        else if (contactSort === 'desc') listSort = 'contato_desc'
        else if (nameSort === 'asc')     listSort = 'nome_asc'
        else                             listSort = 'nome_desc'
        const result = await api.listClients({ ...activeFilters, limit: 50, page: filters.page || 1, sort: listSort })
        setClients(result.data)
        setTotal(result.total)
      }
    } finally {
      setLoading(false)
    }
  }, [filters, activeFilters, isStateView, attentionDays, nameSort, contactSort])

  // Carrega clientes de uma UF com os filtros ativos (com cache)
  const loadUF = useCallback(async (uf) => {
    setUfCache(prev => {
      if (prev.get(uf)?.data || prev.get(uf)?.loading) return prev
      const next = new Map(prev)
      next.set(uf, { data: null, loading: true })
      return next
    })
    try {
      const result = await api.listClients({ ...activeFilters, uf, limit: 9999 })
      setUfCache(prev => {
        const next = new Map(prev)
        next.set(uf, { data: result.data, loading: false })
        return next
      })
    } catch {
      setUfCache(prev => {
        const next = new Map(prev)
        next.set(uf, { data: [], loading: false })
        return next
      })
    }
  }, [activeFilters])

  useEffect(() => {
    api.listStatuses().then(setStatuses)
  }, [])

  // Ouve atualizações de outras abas (cliente salvo na tela de detalhe)
  useEffect(() => {
    let ch
    try { ch = new BroadcastChannel('crm_clients') } catch { return }
    ch.onmessage = (e) => {
      const type = e.data?.type
      if (type !== 'client_updated' && type !== 'client_deleted' && type !== 'client_created') return
      if (isStateView) {
        // Invalida o cache e incrementa versão para re-trigger do auto-load
        setUfCache(new Map())
        setUfCacheVersion(v => v + 1)
      } else {
        load()
      }
    }
    return () => ch.close()
  }, [isStateView, load])

  useEffect(() => { load() }, [load])

  // Auto-load das UFs que abrem automaticamente (filtro de UF ativo, só 1 seção, ou após broadcast)
  useEffect(() => {
    if (!isStateView || ufSummary.length === 0) return
    ufSummary.forEach(({ uf }) => {
      if (isUFOpen(uf, ufSummary.length)) {
        loadUF(uf)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ufSummary, ufCacheVersion])

  async function handleContact(client) {
    try {
      await api.updateClient(client.id, { status_id: statuses.find(s => s.nome === 'Contatado')?.id })
      broadcastClient('client_updated', client.id)
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
              broadcastClient('client_deleted', client.id)
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
              broadcastClient('client_deleted', client.id)
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
              broadcastClient('client_deleted', client.id)
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
      broadcastClient('client_deleted', client.id)
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

  async function handleEnrichSave(patches) {
    for (const { id, fields } of patches) {
      if (Object.keys(fields).length > 0) {
        await api.updateClient(id, fields)
        broadcastClient('client_updated', id)
      }
    }
    load()
  }

  async function handleCreate(data) {
    try {
      const created = await api.createClient(data)
      broadcastClient('client_created', created?.id)
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

  const EMPTY_FILTERS = { search: '', status_id: '', uf: '', ativo: '', ja_cliente: '', catalogo_enviado: '', page: 1 }

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }))

  const hasActiveFilters = filters.search || filters.status_id || filters.uf || filters.ativo || filters.ja_cliente || filters.catalogo_enviado

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    setSearchKey(k => k + 1) // força remount do SearchInput com valor vazio
    sessionStorage.removeItem(FILTERS_KEY)
  }

  const SortIcon        = nameSort    === 'asc' ? ArrowUp : ArrowDown
  const ContactSortIcon = contactSort === 'asc' ? ArrowUp : contactSort === 'desc' ? ArrowDown : ArrowUpDown

  function handleContactSort() {
    // null → 'asc' (sem data primeiro) → 'desc' (mais recente primeiro) → null
    setContactSort(s => s === null ? 'asc' : s === 'asc' ? 'desc' : null)
  }

  const tableHead = useMemo(() => (
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
        <th className="hidden lg:table-cell">
          <button
            className="flex items-center gap-1 hover:text-sky-400 transition-colors"
            onClick={handleContactSort}
            title="Ordenar por último contato (sem data primeiro)"
          >
            Últ. Contato
            <ContactSortIcon size={13} className={contactSort ? 'text-sky-400' : 'text-zinc-600'} />
          </button>
        </th>
        <th>Ações</th>
      </tr>
    </thead>
  ), [nameSort, contactSort])

  const handleEnrich = useCallback((c) => setEnrichModal({ clientIds: [c.id] }), [])
  const rowProps = useMemo(() => ({
    contactedToday,
    onContact:    handleContact,
    onDeactivate: handleDeactivate,
    onDelete:     handleDelete,
    onEnrich:     handleEnrich,
    navigate,
  }), [contactedToday, handleContact, handleDeactivate, handleDelete, handleEnrich, navigate])

  const sortClients = useCallback((arr) => {
    return [...arr].sort((a, b) => {
      if (contactSort) {
        const dateA = a.ultimo_contato ? new Date(a.ultimo_contato).getTime() : null
        const dateB = b.ultimo_contato ? new Date(b.ultimo_contato).getTime() : null
        if (contactSort === 'asc') {
          if (dateA === null && dateB !== null) return -1
          if (dateA !== null && dateB === null) return 1
          if (dateA !== null && dateB !== null) return dateA - dateB
        } else {
          if (dateA === null && dateB !== null) return 1
          if (dateA !== null && dateB === null) return -1
          if (dateA !== null && dateB !== null) return dateB - dateA
        }
      }
      const cmp = (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
      return nameSort === 'asc' ? cmp : -cmp
    })
  }, [nameSort, contactSort])

  // ── Seção Atenção reutilizável (estado e lista) ─────────────────────────────
  // overdueOverride: quando fornecido, usa esses dados em vez de calcular do clients[]
  function renderAttentionSection(isOpen, setIsOpen, overdueOverride) {
    const allOverdue      = overdueOverride ?? clients.filter(c => isOverdue(c, attentionDays))
    const ufPool          = overdueOverride ? overdueOverride : clients
    const filteredOverdue = allOverdue.filter(c => !attentionIgnoredUFs.has(c.uf || '—'))
    const ufOptions       = [...new Set([...ufPool.map(c => c.uf || '—'), ...attentionIgnoredUFs])].sort()

    if (allOverdue.length === 0 && attentionIgnoredUFs.size === 0) return null

    return (
      <div className="relative">
        {attentionUFPopover && (
          <div className="fixed inset-0 z-10" onClick={() => setAttentionUFPopover(false)} />
        )}
        <div className="table-wrapper">
          <div className="flex items-center bg-amber-950 border-b border-amber-800">
            <button
              className="flex-1 flex items-center gap-2 px-4 py-2 hover:bg-amber-900/60 transition-colors text-left"
              onClick={() => setIsOpen(v => !v)}
            >
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="font-semibold text-amber-300 text-sm">Atenção</span>
              <span className="text-amber-700 text-xs">
                {filteredOverdue.length} cliente{filteredOverdue.length !== 1 ? 's' : ''} sem contato há mais de {attentionDays} dias
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
            <button
              className={`relative z-20 p-1.5 mx-2 rounded transition-colors ${attentionIgnoredUFs.size > 0 ? 'text-amber-400 bg-amber-800/50' : 'text-amber-700 hover:text-amber-400 hover:bg-amber-800/30'}`}
              title="Configurar estados do grupo de atenção"
              onClick={e => { e.stopPropagation(); setAttentionUFPopover(v => !v) }}
            >
              <Settings size={13} />
            </button>
          </div>
          {isOpen && filteredOverdue.length > 0 && (
            <table className="table">
              {tableHead}
              <tbody>
                {sortClients(filteredOverdue).map(c => (
                  <ClientRow key={c.id} c={c} isAttention alreadyContacted={contactedToday.has(c.id)} {...rowProps} />
                ))}
              </tbody>
            </table>
          )}
        </div>
        {attentionUFPopover && (
          <div className="absolute right-0 top-9 z-20 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-3 min-w-[220px]">
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Estados ocultos</p>
              {attentionIgnoredUFs.size > 0 && (
                <button
                  className="text-xs text-amber-600 hover:text-amber-400 transition-colors"
                  onClick={e => { e.stopPropagation(); setAttentionIgnoredUFs(new Set()) }}
                >
                  Mostrar todos
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
              {ufOptions.map(uf => (
                <label key={uf} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 hover:text-zinc-100">
                  <input
                    type="checkbox"
                    checked={attentionIgnoredUFs.has(uf)}
                    onChange={e => { e.stopPropagation(); toggleIgnoredUF(uf) }}
                    className="accent-amber-500"
                  />
                  <span className={attentionIgnoredUFs.has(uf) ? 'line-through text-zinc-500' : ''}>{uf}</span>
                  <span className="ml-auto text-zinc-500 text-xs">
                    {allOverdue.filter(c => (c.uf || '—') === uf).length}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Render modo "Por Estado" ────────────────────────────────────────────────
  function renderStateView() {
    if (!loading && ufSummary.length === 0 && overdueSection.length === 0 && newSection.length === 0)
      return <EmptyState icon={Search} message="Nenhum cliente encontrado" />

    return (
      <div className="space-y-6">
          {renderAttentionSection(attentionOpen, setAttentionOpen, overdueSection)}

          {newSection.length > 0 && (
            <div className="table-wrapper">
              <button
                className="w-full flex items-center gap-2 px-4 py-2 bg-emerald-950 border-b border-emerald-800 hover:bg-emerald-900/60 transition-colors text-left"
                onClick={() => setNewClientsOpen(v => !v)}
              >
                <Sparkles size={14} className="text-emerald-400" />
                <span className="font-semibold text-emerald-300 text-sm">Novos</span>
                <span className="text-emerald-600 text-xs">
                  {newSection.length} cliente{newSection.length !== 1 ? 's' : ''} cadastrado{newSection.length !== 1 ? 's' : ''} hoje
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
                    {sortClients(newSection).map(c => (
                      <ClientRow key={c.id} c={c} alreadyContacted={contactedToday.has(c.id)} {...rowProps} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {ufSummary.map(({ uf, count }) => {
            const cached      = ufCache.get(uf)
            const rows        = cached?.data ? sortClients(cached.data) : null
            const loadingRows = cached?.loading ?? false
            const isOpen      = isUFOpen(uf, ufSummary.length)
            return (
              <UFSection
                key={uf}
                uf={uf}
                count={count}
                rows={rows}
                tableHead={tableHead}
                contactedToday={contactedToday}
                rowProps={rowProps}
                isOpen={isOpen}
                onToggle={() => toggleUF(uf)}
                loadingRows={loadingRows || (isOpen && !cached)}
              />
            )
          })}
      </div>
    )
  }

  // ── Render modo "Lista" — paginação real no backend ─────────────────────────
  function renderListView() {
    if (clients.length === 0 && !loading) return <EmptyState icon={Search} message="Nenhum cliente encontrado" />

    const totalPages = Math.ceil(total / 50)

    return (
      <>
        {renderAttentionSection(listAttentionOpen, setListAttentionOpen, overdueSection)}

        {clients.length > 0 && (
          <div className="table-wrapper">
            <table className="table">
              {tableHead}
              <tbody>
                {clients.map(c => (
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

        {totalPages > 1 && (
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

      {enrichModal && (
        <EnrichModal
          clientIds={enrichModal.clientIds}
          onSave={handleEnrichSave}
          onClose={() => setEnrichModal(null)}
        />
      )}

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
        <SearchInput
          key={searchKey}
          initialValue={filters.search}
          onSearch={handleSearch}
        />
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
        <select
          className="select w-auto"
          value={filters.catalogo_enviado}
          onChange={e => setFilter('catalogo_enviado', e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Com catálogo enviado</option>
          <option value="false">Sem catálogo enviado</option>
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
