import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

/**
 * Modal de feedback e confirmação do sistema.
 *
 * Tipos  →  type: 'success' | 'error' | 'warning' | 'info'
 * Confirm →  passe a prop `actions` com os botões desejados
 *
 * Props:
 *   type     — 'success' | 'error' | 'warning' | 'info'
 *   title    — string
 *   message  — string (opcional)
 *   details  — string[] (lista de detalhes, opcional)
 *   actions  — { label, onClick, variant?: 'primary'|'secondary'|'danger' }[]
 *              Quando fornecido substitui "Fechar" por botões de ação + "Cancelar"
 *   onClose  — () => void
 *
 * Uso — alerta simples:
 *   showModal({ type: 'success', title: 'Salvo!', message: 'Operação concluída.' })
 *
 * Uso — confirmação:
 *   showModal({
 *     type: 'warning',
 *     title: 'Excluir?',
 *     message: 'Esta ação não pode ser desfeita.',
 *     actions: [
 *       { label: 'Excluir', variant: 'danger', onClick: () => handleDelete() },
 *     ],
 *   })
 */

const VARIANTS = {
  success: { icon: CheckCircle,   iconColor: 'text-green-400',  iconBg: 'bg-green-900/40'  },
  error:   { icon: XCircle,       iconColor: 'text-red-400',    iconBg: 'bg-red-900/40'    },
  warning: { icon: AlertTriangle, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-900/40' },
  info:    { icon: Info,          iconColor: 'text-sky-400',    iconBg: 'bg-sky-900/40'    },
}

const ACTION_CLASS = {
  primary:   'btn-primary w-full',
  secondary: 'btn-secondary w-full',
  danger:    'w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors',
}

export function AppModal({ type = 'info', title, message, details = [], actions, onClose }) {
  const v    = VARIANTS[type] ?? VARIANTS.info
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

        {actions?.length > 0 ? (
          <div className="flex flex-col gap-2">
            {actions.map((a, i) => (
              <button key={i} className={ACTION_CLASS[a.variant ?? 'primary']} onClick={() => { onClose(); a.onClick() }}>
                {a.label}
              </button>
            ))}
            <button className="btn-ghost w-full text-sm" onClick={onClose}>Cancelar</button>
          </div>
        ) : (
          <button className="btn-primary w-full" onClick={onClose}>
            Fechar
          </button>
        )}
      </div>
    </div>
  )
}
