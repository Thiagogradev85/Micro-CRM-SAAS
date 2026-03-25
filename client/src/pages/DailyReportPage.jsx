import { useState, useEffect, useCallback } from 'react'
import {
  BarChart2, Phone, UserPlus, BookOpen, ShoppingCart,
  Download, ChevronDown, ChevronUp
} from 'lucide-react'
import { api } from '../utils/api.js'
import { formatDate } from '../utils/constants.js'
import { useAppModalError } from '../hooks/useAppModalError.js'

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`card flex items-center gap-4 border-l-4 ${color}`}>
      <div className="p-2 rounded-lg bg-zinc-800">
        <Icon size={20} className="text-zinc-300" />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  )
}

function ClientList({ title, clients, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  if (clients.length === 0) return null

  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-200">{title}</span>
          <span className="badge bg-zinc-700 text-zinc-400">{clients.length}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {clients.map((c, i) => (
            <div key={`${c.client_id}-${i}`}
              className="flex items-center gap-3 py-2 border-t border-zinc-800 first:border-0">
              <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{c.client_nome}</p>
                <p className="text-xs text-zinc-500">
                  {[c.cidade, c.uf].filter(Boolean).join('/')}
                  {c.whatsapp && ` · ${c.whatsapp}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function DailyReportPage() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate]       = useState(today)
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(false)
  const { modal, showModal } = useAppModalError()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getReportDetails(date)
      setReport(data)
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  function handleDownloadPdf() {
    api.downloadReportPdf(date)
    showModal({ type: 'info', title: 'Gerando PDF', message: 'PDF sendo gerado, aguarde...' })
  }

  const summary = report?.summary || {}
  const details = report?.details || {}

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      {modal}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <BarChart2 size={20} className="text-sky-400" />
            Relatório Diário
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {date === today ? 'Hoje' : formatDate(date)}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            className="input w-auto"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
          />
          <button
            className="btn-primary"
            onClick={handleDownloadPdf}
            disabled={!report || loading}
          >
            <Download size={15} /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-zinc-500 text-sm">Carregando relatório...</div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={Phone}
              label="Contatados"
              value={summary.contacted || 0}
              color="border-blue-500"
            />
            <SummaryCard
              icon={UserPlus}
              label="Clientes Novos"
              value={summary.new_client || 0}
              color="border-green-500"
            />
            <SummaryCard
              icon={BookOpen}
              label="Pediram Catálogo"
              value={summary.catalog_requested || 0}
              color="border-sky-500"
            />
            <SummaryCard
              icon={ShoppingCart}
              label="Finalizaram Compra"
              value={summary.purchased || 0}
              color="border-yellow-500"
            />
          </div>

          {/* Total geral */}
          {(summary.contacted + summary.new_client + summary.catalog_requested + summary.purchased) === 0 ? (
            <div className="card text-center py-10 text-zinc-600">
              <BarChart2 size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhum evento registrado nesta data.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <ClientList
                title="Contatados"
                clients={details.contacted || []}
                defaultOpen
              />
              <ClientList
                title="Clientes Novos"
                clients={details.new_clients || []}
                defaultOpen
              />
              <ClientList
                title="Pediram Catálogo"
                clients={details.catalog_requested || []}
              />
              <ClientList
                title="Finalizaram Compra"
                clients={details.purchased || []}
                defaultOpen
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
