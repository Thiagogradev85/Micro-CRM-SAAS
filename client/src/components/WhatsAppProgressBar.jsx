import { useEffect, useState, useCallback } from 'react'
import { MessageCircle, X, CheckCircle, AlertTriangle } from 'lucide-react'
import { api } from '../utils/api.js'

const POLL_MS = 3000

/**
 * Floating progress bar shown globally while a WhatsApp bulk send is running.
 * Polls GET /whatsapp/progress every 3s and persists across page navigation.
 */
export function WhatsAppProgressBar() {
  const [job, setJob]         = useState(null)   // null | progress object
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const fetchProgress = useCallback(async () => {
    try {
      const data = await api.whatsappProgress()
      if (!data || data.status === 'idle') return

      setJob(data)
      if (!dismissed) setVisible(true)

      // Stop polling once done and user hasn't dismissed yet
    } catch {
      // backend offline or no job — ignore silently
    }
  }, [dismissed])

  useEffect(() => {
    fetchProgress()
    const id = setInterval(fetchProgress, POLL_MS)
    return () => clearInterval(id)
  }, [fetchProgress])

  async function handleDismiss() {
    setVisible(false)
    setDismissed(true)
    if (job?.status === 'done') {
      try { await api.whatsappProgressClear() } catch { /* ignore */ }
      setJob(null)
    }
  }

  // Reset dismissed state when a new job starts
  useEffect(() => {
    if (job?.status === 'sending') setDismissed(false)
  }, [job?.status])

  if (!visible || !job) return null

  const pct     = job.total > 0 ? Math.round((job.current / job.total) * 100) : 0
  const isDone  = job.status === 'done'

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isDone
            ? <CheckCircle size={15} className="text-green-400 shrink-0" />
            : <MessageCircle size={15} className="text-green-400 shrink-0 animate-pulse" />
          }
          <span className="text-sm font-semibold text-zinc-100">
            {isDone ? 'Envio concluído' : 'Enviando WhatsApp...'}
          </span>
        </div>
        {isDone && (
          <button
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Fechar"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>{job.current} / {job.total} mensagens</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-green-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <span className="text-green-400 font-medium">✓ {job.sent} enviados</span>
        {job.failed > 0 && (
          <span className="flex items-center gap-1 text-red-400 font-medium">
            <AlertTriangle size={11} /> {job.failed} erros
          </span>
        )}
      </div>

      {isDone && (
        <p className="text-xs text-zinc-500">
          Clique em × para fechar
        </p>
      )}
    </div>
  )
}
