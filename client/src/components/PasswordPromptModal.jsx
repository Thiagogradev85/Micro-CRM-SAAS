import { useState, useEffect } from 'react'
import { Lock, Loader2, XCircle } from 'lucide-react'

/**
 * Modal genérico de confirmação por senha.
 * Usado em ações sensíveis que exigem autenticação antes de prosseguir
 * (ex: revelar chave de API, excluir conta, alterar senha).
 *
 * Props:
 *   open         — boolean — controla visibilidade
 *   title        — string  — título do modal
 *   description  — string  — texto explicativo (opcional)
 *   confirmLabel — string  — texto do botão de confirmação (padrão: "Confirmar")
 *   confirmIcon  — LucideIcon — ícone do botão (padrão: Lock)
 *   loading      — boolean — exibe spinner e desabilita botão
 *   error        — string  — mensagem de erro vinda da API (limpa ao reabrir)
 *   onConfirm    — (password: string) => void
 *   onClose      — () => void
 */
export function PasswordPromptModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  confirmIcon: Icon = Lock,
  loading = false,
  error,
  onConfirm,
  onClose,
}) {
  const [pwd, setPwd] = useState('')

  // Limpa o input toda vez que o modal é aberto
  useEffect(() => {
    if (open) setPwd('')
  }, [open])

  if (!open) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (pwd && !loading) onConfirm(pwd)
  }

  function handleOverlay(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"
      onClick={handleOverlay}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">

        <div className="flex flex-col items-center text-center gap-2 mb-5">
          <div className="w-12 h-12 bg-sky-600/20 rounded-full flex items-center justify-center">
            <Icon size={22} className="text-sky-400" />
          </div>
          <h3 className="text-white font-bold text-base">{title}</h3>
          {description && (
            <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            placeholder="Senha de admin"
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500
                       rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-sky-500 transition-colors"
          />

          {error && (
            <div className="flex items-center gap-2 bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2">
              <XCircle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          )}

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300
                         text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!pwd || loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                         bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <Loader2 size={14} className="animate-spin" />
                : <Icon size={14} />}
              {confirmLabel}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
