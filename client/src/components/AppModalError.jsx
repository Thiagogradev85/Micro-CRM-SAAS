import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

/**
 * Componente de modal de feedback do sistema.
 * Responsabilidade: exibir mensagens de erro, sucesso, aviso e info
 * que exigem confirmação explícita do usuário (clique em Fechar).
 *
 * Props:
 *   type     — 'success' | 'error' | 'warning' | 'info'
 *   title    — string
 *   message  — string
 *   details  — string[] opcional (lista de itens com erro)
 *   onClose  — () => void
 */

const VARIANTS = {
  success: { icon: CheckCircle, iconColor: 'text-green-400', iconBg: 'bg-green-900/40' },
  error:   { icon: XCircle,     iconColor: 'text-red-400',   iconBg: 'bg-red-900/40'   },
  warning: { icon: AlertTriangle,iconColor: 'text-yellow-400',iconBg: 'bg-yellow-900/40'},
  info:    { icon: Info,         iconColor: 'text-sky-400',   iconBg: 'bg-sky-900/40'   },
}

export function AppModalError({ type = 'info', title, message, details = [], onClose }) {
  const v = VARIANTS[type] ?? VARIANTS.info
  const Icon = v.icon

  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"
      onClick={handleOverlay}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

        <div className="flex flex-col items-center text-center gap-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${v.iconBg}`}>
            <Icon size={32} className={v.iconColor} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-100">{title}</h3>
            {message && (
              <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
            )}
          </div>
        </div>

        {details.length > 0 && (
          <div className="bg-zinc-800 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5">
            {details.map((d, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <X size={12} className="text-red-400 shrink-0 mt-0.5" />
                <span className="text-zinc-300">{d}</span>
              </div>
            ))}
          </div>
        )}

        <button className="btn-primary w-full" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  )
}
