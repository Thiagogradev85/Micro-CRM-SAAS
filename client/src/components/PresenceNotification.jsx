import { useEffect, useRef } from 'react'
import { X, Wifi } from 'lucide-react'

/**
 * Notificação não-bloqueante de presença — aparece só para admin.
 * Auto-dismissível com barra de progresso visual.
 *
 * Props:
 *   nome     — string  nome do usuário que entrou
 *   onClose  — fn      callback ao fechar
 *   duration — number  milissegundos até fechar (default 5000)
 */
export function PresenceNotification({ nome, onClose, duration = 5000 }) {
  const barRef = useRef(null)

  useEffect(() => {
    // Anima a barra de progresso
    const bar = barRef.current
    if (bar) {
      bar.style.transition = 'none'
      bar.style.width = '100%'
      requestAnimationFrame(() => {
        bar.style.transition = `width ${duration}ms linear`
        bar.style.width = '0%'
      })
    }

    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  // Iniciais do nome
  const initials = nome
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="fixed bottom-5 right-5 z-50 w-72 rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
      {/* Conteúdo */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {/* Avatar com iniciais */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-900/50 text-sm font-bold text-green-300">
          {initials}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate">{nome}</p>
          <p className="flex items-center gap-1 text-xs text-green-400">
            <Wifi size={11} />
            entrou agora
          </p>
        </div>

        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X size={14} />
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="h-0.5 bg-zinc-800">
        <div ref={barRef} className="h-full bg-green-500" style={{ width: '100%' }} />
      </div>
    </div>
  )
}
