import { useState } from 'react'
import { Sparkles, Phone, Instagram, Mail, Facebook, X, Check, Loader2, AlertTriangle } from 'lucide-react'
import { api } from '../utils/api.js'

const FIELD_META = {
  instagram: { label: 'Instagram', icon: Instagram,  color: 'text-pink-400' },
  facebook:  { label: 'Facebook',  icon: Facebook,   color: 'text-blue-400' },
  email:     { label: 'E-mail',    icon: Mail,        color: 'text-sky-400'  },
  whatsapp:  { label: 'WhatsApp',  icon: Phone,       color: 'text-green-400'},
  telefone:  { label: 'Telefone',  icon: Phone,       color: 'text-zinc-300' },
}

/**
 * EnrichModal
 *
 * Props:
 *  - clientIds: number[]   — IDs dos clientes recém-salvos a enriquecer
 *  - onSave: (patches) => Promise<void>  — patches = [{ id, fields }]
 *  - onClose: () => void
 */
const BATCH_SIZE = 20

function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

export function EnrichModal({ clientIds, onSave, onClose }) {
  const [phase, setPhase]         = useState('idle')   // idle | loading | review | saving | done
  const [results, setResults]     = useState([])        // [{ id, nome, suggestions, error }]
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  // selected[id][field] = true/false
  const [selected, setSelected]   = useState({})
  const [saveError, setSaveError] = useState(null)

  const totalBatches = Math.ceil(clientIds.length / BATCH_SIZE)

  async function handleSearch() {
    setPhase('loading')
    setBatchProgress({ current: 0, total: totalBatches })

    const allResults = []
    const batches = chunkArray(clientIds, BATCH_SIZE)

    for (let i = 0; i < batches.length; i++) {
      setBatchProgress({ current: i + 1, total: batches.length })
      try {
        const { results: res } = await api.enrichProspects(batches[i])
        allResults.push(...res)
      } catch (err) {
        // Registra erro do lote mas continua os demais
        allResults.push(...batches[i].map(id => ({ id, nome: null, suggestions: {}, error: err.message })))
      }
    }

    // Pre-seleciona todos os campos encontrados
    const sel = {}
    for (const r of allResults) {
      sel[r.id] = {}
      for (const field of Object.keys(r.suggestions || {})) {
        sel[r.id][field] = true
      }
    }

    setResults(allResults)
    setSelected(sel)
    setPhase('review')
  }

  function toggleField(clientId, field) {
    setSelected(prev => ({
      ...prev,
      [clientId]: { ...prev[clientId], [field]: !prev[clientId]?.[field] },
    }))
  }

  function toggleAll(clientId, value) {
    const fields = Object.keys(results.find(r => r.id === clientId)?.suggestions || {})
    setSelected(prev => ({
      ...prev,
      [clientId]: Object.fromEntries(fields.map(f => [f, value])),
    }))
  }

  async function handleSave() {
    setPhase('saving')
    setSaveError(null)
    try {
      const patches = []
      for (const r of results) {
        const fields = {}
        for (const [field, checked] of Object.entries(selected[r.id] || {})) {
          if (checked && r.suggestions[field]) fields[field] = r.suggestions[field]
        }
        if (Object.keys(fields).length > 0) patches.push({ id: r.id, fields })
      }
      await onSave(patches)
      setPhase('done')
    } catch (err) {
      setSaveError(err.message)
      setPhase('review')
    }
  }

  const hasSuggestions = results.some(r => Object.keys(r.suggestions || {}).length > 0)
  const anySelected    = results.some(r =>
    Object.values(selected[r.id] || {}).some(Boolean)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <Sparkles size={18} className="text-amber-400" />
          <h2 className="font-semibold text-zinc-100 flex-1">Enriquecimento de Dados</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {phase === 'idle' && (
            <div className="text-center py-8 space-y-3">
              <Sparkles size={36} className="mx-auto text-amber-400" />
              <p className="text-zinc-300 font-medium">
                {clientIds.length} cliente{clientIds.length !== 1 ? 's' : ''} salvo{clientIds.length !== 1 ? 's' : ''}!
              </p>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                Posso buscar no Google dados de contato faltantes como Instagram, Facebook, e-mail e telefone.
                Você revisa e decide o que salvar.
              </p>
            </div>
          )}

          {phase === 'loading' && (
            <div className="text-center py-12 space-y-4">
              <Loader2 size={32} className="mx-auto text-amber-400 animate-spin" />
              <p className="text-zinc-400 text-sm">
                Buscando dados para {clientIds.length} cliente{clientIds.length !== 1 ? 's' : ''}…
              </p>
              {totalBatches > 1 && (
                <div className="space-y-1.5 max-w-xs mx-auto">
                  <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-zinc-600 text-xs">
                    Lote {batchProgress.current} de {batchProgress.total}
                  </p>
                </div>
              )}
              {totalBatches === 1 && (
                <p className="text-zinc-600 text-xs">Isso pode levar alguns segundos</p>
              )}
            </div>
          )}

          {(phase === 'review' || phase === 'saving') && (
            <div className="space-y-4">
              {saveError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} /> {saveError}
                </div>
              )}

              {!hasSuggestions && (
                <p className="text-zinc-500 text-sm text-center py-4">
                  Nenhum dado adicional encontrado para os clientes selecionados.
                </p>
              )}

              {results.map(r => {
                const fields = Object.entries(r.suggestions || {})
                if (fields.length === 0 && !r.error) return null

                const allChecked = fields.every(([f]) => selected[r.id]?.[f])

                return (
                  <div key={r.id} className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-zinc-200 text-sm">{r.nome}</p>
                      {fields.length > 0 && (
                        <button
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                          onClick={() => toggleAll(r.id, !allChecked)}
                        >
                          {allChecked ? 'Desmarcar todos' : 'Marcar todos'}
                        </button>
                      )}
                    </div>

                    {r.error && (
                      <p className="text-amber-500 text-xs flex items-center gap-1">
                        <AlertTriangle size={11} /> {r.error}
                      </p>
                    )}

                    {fields.map(([field, value]) => {
                      const meta    = FIELD_META[field] || {}
                      const Icon    = meta.icon || Phone
                      const checked = selected[r.id]?.[field] ?? true

                      return (
                        <label
                          key={field}
                          className={`flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2 transition-colors ${
                            checked ? 'bg-zinc-700/60' : 'opacity-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleField(r.id, field)}
                            className="accent-amber-400"
                          />
                          <Icon size={14} className={meta.color || 'text-zinc-400'} />
                          <span className="text-xs text-zinc-400 w-20 shrink-0">{meta.label}</span>
                          <span className="text-sm text-zinc-200 break-all">{value}</span>
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center py-10 space-y-3">
              <Check size={36} className="mx-auto text-green-400" />
              <p className="text-zinc-300 font-medium">Dados salvos com sucesso!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-800">
          {phase === 'idle' && (
            <>
              <button onClick={onClose} className="btn btn-secondary btn-sm">Pular</button>
              <button onClick={handleSearch} className="btn btn-primary btn-sm gap-1.5">
                <Sparkles size={13} /> Buscar dados
              </button>
            </>
          )}
          {phase === 'review' && (
            <>
              <button onClick={onClose} className="btn btn-secondary btn-sm">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={!anySelected}
                className="btn btn-primary btn-sm gap-1.5 disabled:opacity-40"
              >
                <Check size={13} /> Salvar selecionados
              </button>
            </>
          )}
          {phase === 'saving' && (
            <button disabled className="btn btn-primary btn-sm gap-1.5 opacity-60">
              <Loader2 size={13} className="animate-spin" /> Salvando…
            </button>
          )}
          {phase === 'done' && (
            <button onClick={onClose} className="btn btn-primary btn-sm">Fechar</button>
          )}
        </div>
      </div>
    </div>
  )
}
