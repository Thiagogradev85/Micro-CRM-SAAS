import { useState } from 'react'
import { Phone, Globe, MapPin, Star, AlertCircle, Instagram, Facebook, Pencil, Check, X, Mail } from 'lucide-react'

/**
 * Card displaying a single prospect returned by the prospecting search.
 *
 * Props:
 *   prospect   — prospect object from GET /prospecting/search
 *   selected   — boolean (checkbox state)
 *   onToggle   — () => void  (toggle selection)
 *   duplicate  — boolean (already exists in DB)
 *   onEdit     — (updatedFields: object) => void
 */
export function ProspectCard({ prospect, selected, onToggle, duplicate, onEdit }) {
  const stars = prospect._rating ? Math.round(prospect._rating) : 0
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})

  function startEdit(e) {
    e.stopPropagation()
    setDraft({
      nome:      prospect.nome      || '',
      whatsapp:  prospect.whatsapp  || '',
      instagram: prospect.instagram || '',
      facebook:  prospect.facebook  || '',
      site:      prospect.site      || '',
      email:     prospect.email     || '',
    })
    setEditing(true)
  }

  function cancelEdit(e) {
    e.stopPropagation()
    setEditing(false)
  }

  function confirmEdit(e) {
    e.stopPropagation()
    onEdit?.(draft)
    setEditing(false)
  }

  return (
    <div
      className={`
        rounded-xl border p-4 flex gap-3 transition-colors
        ${editing ? 'cursor-default' : 'cursor-pointer'}
        ${duplicate
          ? 'border-zinc-700 bg-zinc-900/40 opacity-60'
          : selected
            ? 'border-sky-600/50 bg-sky-950/30'
            : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
        }
      `}
      onClick={() => !duplicate && !editing && onToggle()}
    >
      {/* Checkbox */}
      <div className="pt-0.5 shrink-0">
        {duplicate ? (
          <span title="Já existe no banco de dados">
            <AlertCircle size={18} className="text-zinc-600" />
          </span>
        ) : (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            onClick={e => e.stopPropagation()}
            className="w-4 h-4 accent-sky-500 cursor-pointer"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-100 text-sm leading-tight">{prospect.nome}</p>
            {prospect._type && (
              <p className="text-xs text-zinc-500 mt-0.5">{prospect._type}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {duplicate && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 font-medium">
                Já existe
              </span>
            )}
            {!duplicate && !editing && (
              <button
                onClick={startEdit}
                title="Editar dados do prospect"
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded"
              >
                <Pencil size={13} />
              </button>
            )}
          </div>
        </div>

        {editing ? (
          /* ── Edit mode ── */
          <div className="space-y-2 pt-1" onClick={e => e.stopPropagation()}>
            <div>
              <label className="block text-xs text-zinc-500 mb-0.5">Nome</label>
              <input
                className="input w-full text-sm"
                value={draft.nome}
                onChange={e => setDraft(d => ({ ...d, nome: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-0.5">WhatsApp</label>
              <input
                className="input w-full text-sm"
                placeholder="ex: 48999999999"
                value={draft.whatsapp}
                onChange={e => setDraft(d => ({ ...d, whatsapp: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-0.5">Instagram</label>
              <input
                className="input w-full text-sm"
                placeholder="@handle"
                value={draft.instagram}
                onChange={e => setDraft(d => ({ ...d, instagram: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-0.5">Facebook</label>
              <input
                className="input w-full text-sm"
                placeholder="facebook.com/pagina"
                value={draft.facebook}
                onChange={e => setDraft(d => ({ ...d, facebook: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-0.5">Site</label>
              <input
                className="input w-full text-sm"
                placeholder="https://exemplo.com.br"
                value={draft.site}
                onChange={e => setDraft(d => ({ ...d, site: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-0.5">E-mail</label>
              <input
                className="input w-full text-sm"
                type="email"
                placeholder="email@exemplo.com"
                value={draft.email}
                onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={confirmEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
              >
                <Check size={12} /> Confirmar
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium transition-colors"
              >
                <X size={12} /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-400">
              {(prospect.cidade || prospect.uf) && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {[prospect.cidade, prospect.uf].filter(Boolean).join('/')}
                </span>
              )}
              {prospect.telefone && (
                <span className="flex items-center gap-1">
                  <Phone size={11} />
                  {prospect.telefone}
                </span>
              )}
              {prospect.site && (
                <a
                  href={prospect.site}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-sky-500 hover:text-sky-400 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <Globe size={11} />
                  {prospect.site.replace(/^https?:\/\//, '').split('/')[0]}
                </a>
              )}
              {prospect.email && (
                <span className="flex items-center gap-1 text-sky-400">
                  <Mail size={11} />
                  {prospect.email}
                </span>
              )}
            </div>

            {/* Social highlights */}
            {(prospect._whatsappLink || prospect.instagram || prospect.facebook) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {prospect._whatsappLink && (
                  <a
                    href={prospect._whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors text-xs font-medium"
                    onClick={e => e.stopPropagation()}
                  >
                    <Phone size={11} />
                    WhatsApp
                  </a>
                )}
                {prospect.instagram && (
                  <a
                    href={
                      prospect.instagram.startsWith('http')
                        ? prospect.instagram
                        : `https://instagram.com/${prospect.instagram.replace('@', '')}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-pink-500/15 text-pink-400 hover:bg-pink-500/25 transition-colors text-xs font-medium"
                    onClick={e => e.stopPropagation()}
                  >
                    <Instagram size={11} />
                    {prospect.instagram.startsWith('@') ? prospect.instagram : 'Instagram'}
                  </a>
                )}
                {prospect.facebook && (
                  <a
                    href={
                      prospect.facebook.startsWith('http')
                        ? prospect.facebook
                        : `https://facebook.com/${prospect.facebook}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors text-xs font-medium"
                    onClick={e => e.stopPropagation()}
                  >
                    <Facebook size={11} />
                    Facebook
                  </a>
                )}
              </div>
            )}

            {stars > 0 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={11}
                    className={i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}
                  />
                ))}
                {prospect._ratingCount && (
                  <span className="text-zinc-500 text-xs ml-1">({prospect._ratingCount})</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
