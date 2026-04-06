import { useState } from 'react'
import { Telescope, Search, Loader2, Save, CheckSquare, Square, Info } from 'lucide-react'
import { api } from '../utils/api.js'
import { UFS } from '../utils/constants.js'
import { ProspectCard } from '../components/ProspectCard.jsx'
import { SerperLimitModal } from '../components/SerperLimitModal.jsx'
import { EnrichModal } from '../components/EnrichModal.jsx'
import { useModal } from '../hooks/useModal.js'

export function ProspectingPage() {
  const { modal, showModal } = useModal()
  const [showLimitModal, setShowLimitModal] = useState(false)

  // Search form
  const [segment, setSegment] = useState('')
  const [uf, setUf]           = useState('')
  const [city, setCity]       = useState('')

  // Results
  const [results, setResults]   = useState(null)   // null = no search yet
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [creditsUsed, setCreditsUsed] = useState(null)
  const [enrichIds, setEnrichIds] = useState(null)  // null = modal fechado

  async function handleSearch(e) {
    e.preventDefault()
    if (!segment.trim()) return

    setLoading(true)
    setResults(null)
    setSelected(new Set())

    try {
      const data = await api.searchProspects({ segment: segment.trim(), uf, city: city.trim() })
      setResults(data)
      setCreditsUsed(data.creditsUsed)
      // Pre-select all unique prospects
      setSelected(new Set(data.unique.map((_, i) => i)))
    } catch (err) {
      if (err.message === 'SERPER_LIMIT_REACHED') {
        setShowLimitModal(true)
      } else {
        showModal({ type: 'error', title: 'Erro na busca', message: err.message })
      }
    } finally {
      setLoading(false)
    }
  }

  function toggleAll() {
    if (!results) return
    if (selected.size === results.unique.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(results.unique.map((_, i) => i)))
    }
  }

  function toggleOne(index) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  async function handleSave() {
    if (!results || selected.size === 0) return

    const toSave = results.unique.filter((_, i) => selected.has(i))
    setSaving(true)
    try {
      const result = await api.saveProspects(toSave)
      const hasErrors = result.errors?.length > 0

      // Remove saved prospects from results
      setResults(prev => ({
        ...prev,
        unique: prev.unique.filter((_, i) => !selected.has(i)),
      }))
      setSelected(new Set())

      if (result.saved > 0) {
        // Busca os IDs dos clientes recém-salvos para enriquecimento
        // A API retorna os IDs criados quando saved > 0
        if (result.ids?.length) {
          setEnrichIds(result.ids)
        } else {
          showModal({
            type:    hasErrors ? 'warning' : 'success',
            title:   hasErrors ? 'Salvos com avisos' : 'Prospects salvos',
            message: `${result.saved} cliente${result.saved !== 1 ? 's' : ''} adicionado${result.saved !== 1 ? 's' : ''} com sucesso.${hasErrors ? ` ${result.errors.length} não puderam ser salvos.` : ''}`,
            details: hasErrors ? result.errors : [],
          })
        }
      } else {
        showModal({
          type: hasErrors ? 'error' : 'warning',
          title: 'Nenhum cliente salvo',
          message: 'Nenhum cliente foi salvo. Verifique os erros abaixo.',
          details: hasErrors ? result.errors : [],
        })
      }
    } catch (err) {
      showModal({ type: 'error', title: 'Erro ao salvar', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleEnrichSave(patches) {
    await Promise.all(patches.map(({ id, fields }) => api.updateClient(id, fields)))
  }

  function handleEdit(index, data) {
    setResults(prev => {
      const unique = [...prev.unique]
      const updated = { ...unique[index], ...data }
      // Recalculate WhatsApp link when phone number changes
      if (data.whatsapp !== undefined) {
        const digits = data.whatsapp.replace(/\D/g, '')
        const isMobile = digits.length === 11 && digits[2] === '9'
        updated.whatsapp      = digits || null
        updated.telefone      = digits || null
        updated._whatsappLink = isMobile ? `https://wa.me/55${digits}` : null
      }
      unique[index] = updated
      return { ...prev, unique }
    })
  }

  const allSelected = results && selected.size === results.unique.length && results.unique.length > 0

  return (
    <div className="p-4 md:p-6 space-y-5">
      {modal}
      {showLimitModal && <SerperLimitModal onClose={() => setShowLimitModal(false)} />}
      {enrichIds && (
        <EnrichModal
          clientIds={enrichIds}
          onSave={handleEnrichSave}
          onClose={() => setEnrichIds(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-600/20 flex items-center justify-center shrink-0">
          <Telescope size={18} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Prospecção de Clientes</h1>
          <p className="text-xs text-zinc-500">Busca via Google Maps — Serper API</p>
        </div>
        {creditsUsed !== null && (
          <span className="ml-auto text-xs text-zinc-500 flex items-center gap-1">
            <Info size={12} /> {creditsUsed} crédito{creditsUsed !== 1 ? 's' : ''} usados
          </span>
        )}
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="card space-y-4">
        <h2 className="font-semibold text-zinc-200 text-sm">Parâmetros de busca</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs text-zinc-400 mb-1">Segmento *</label>
            <input
              className="input w-full"
              placeholder="ex: farmácia, mercado, clínica"
              value={segment}
              onChange={e => setSegment(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Estado (UF)</label>
            <select
              className="input w-full"
              value={uf}
              onChange={e => setUf(e.target.value)}
            >
              <option value="">Todos</option>
              {UFS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Cidade</label>
            <input
              className="input w-full"
              placeholder="ex: Curitiba"
              value={city}
              onChange={e => setCity(e.target.value)}
            />
          </div>
        </div>
        <button
          type="submit"
          className="btn-primary flex items-center gap-2"
          disabled={loading || !segment.trim()}
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Buscando...</>
            : <><Search size={15} /> Buscar prospects</>
          }
        </button>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
          <Loader2 size={32} className="animate-spin text-sky-500" />
          <p className="text-sm">Consultando Google Maps via Serper...</p>
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-zinc-300 font-medium">
                {results.total} encontrado{results.total !== 1 ? 's' : ''}
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-emerald-400">
                {results.unique.length} novo{results.unique.length !== 1 ? 's' : ''}
              </span>
              {results.duplicates.length > 0 && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-500">
                    {results.duplicates.length} já existe{results.duplicates.length !== 1 ? 'm' : ''} na base
                  </span>
                </>
              )}
            </div>
            <p className="text-zinc-600 text-xs break-words">
              Busca: <span className="text-zinc-400 italic">"{results.query}"</span>
            </p>
          </div>

          {/* Action bar — only shown when there are unique prospects */}
          {results.unique.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={toggleAll}
              >
                {allSelected
                  ? <CheckSquare size={16} className="text-sky-400" />
                  : <Square size={16} />
                }
                {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
              <button
                className="btn-primary ml-auto flex items-center gap-2"
                onClick={handleSave}
                disabled={saving || selected.size === 0}
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                  : <><Save size={14} /> Salvar {selected.size > 0 ? selected.size : ''} selecionado{selected.size !== 1 ? 's' : ''}</>
                }
              </button>
            </div>
          )}

          {/* New prospects */}
          {results.unique.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Novos prospects</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {results.unique.map((p, i) => (
                  <ProspectCard
                    key={i}
                    prospect={p}
                    selected={selected.has(i)}
                    onToggle={() => toggleOne(i)}
                    duplicate={false}
                    onEdit={data => handleEdit(i, data)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Todos os resultados já existem na base de clientes.
            </div>
          )}

          {/* Duplicates */}
          {results.duplicates.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-600 font-medium uppercase tracking-wider">Já existem na base</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {results.duplicates.map((p, i) => (
                  <ProspectCard
                    key={i}
                    prospect={p}
                    selected={false}
                    onToggle={() => {}}
                    duplicate
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state — before first search */}
      {!loading && !results && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-600">
          <Telescope size={40} />
          <p className="text-sm">Preencha os campos acima e clique em <strong className="text-zinc-400">Buscar prospects</strong></p>
          <p className="text-xs">Os resultados excluem automaticamente clientes já cadastrados</p>
        </div>
      )}
    </div>
  )
}
