import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react'

const SERPER_SIGNUP_URL = 'https://serper.dev'

/**
 * Modal exibido quando o limite de buscas gratuitas do Serper é atingido.
 * Orienta o usuário a aguardar a renovação mensal ou assinar um plano pago.
 *
 * Props:
 *   onClose — () => void
 */
export function SerperLimitModal({ onClose }) {
  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"
      onClick={handleOverlay}
    >
      <div className="bg-zinc-900 border border-amber-600/40 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-900/40">
            <AlertTriangle size={30} className="text-amber-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-100">Limite Serper atingido</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Você usou todas as buscas gratuitas do mês no Serper.
              O plano free renova automaticamente no início do próximo mês.
            </p>
          </div>
        </div>

        <div className="bg-zinc-800 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-medium text-zinc-200">O que você pode fazer:</p>
          <ul className="space-y-1.5 text-zinc-400">
            <li className="flex items-start gap-2">
              <RefreshCw size={13} className="text-sky-400 shrink-0 mt-0.5" />
              Aguardar a renovação mensal do plano gratuito
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink size={13} className="text-emerald-400 shrink-0 mt-0.5" />
              Assinar um plano pago para continuar agora
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={SERPER_SIGNUP_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-primary w-full text-center flex items-center justify-center gap-2"
            onClick={onClose}
          >
            <ExternalLink size={15} /> Ver planos no Serper.dev
          </a>
          <button className="btn-ghost w-full text-sm" onClick={onClose}>
            Aguardar renovação
          </button>
        </div>

      </div>
    </div>
  )
}
