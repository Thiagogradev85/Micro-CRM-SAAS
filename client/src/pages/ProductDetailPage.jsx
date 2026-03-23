import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Save, X, Plus, Trash2, Package } from 'lucide-react'
import { api } from '../utils/api.js'
import { formatDate } from '../utils/constants.js'
import { EmptyState } from '../components/EmptyState.jsx'
import { Toast } from '../components/Toast.jsx'

// ── Máscaras ────────────────────────────────────────────────────────────────

// R$ 1.234,56 — armazena centavos internamente como string de dígitos
function maskBRL(raw) {
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  const value = parseInt(digits, 10) / 100
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function parseBRL(masked) {
  if (!masked) return ''
  const n = parseFloat(masked.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? '' : n
}
function brlToDigits(value) {
  if (value === '' || value == null) return ''
  const cents = Math.round(parseFloat(String(value)) * 100)
  return isNaN(cents) ? '' : String(cents)
}

// kg — até 3 decimais
function maskKG(raw) {
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  const value = parseInt(digits, 10) / 1000
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}
function parseKG(masked) {
  if (!masked) return ''
  const n = parseFloat(masked.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? '' : n
}
function kgToDigits(value) {
  if (value === '' || value == null) return ''
  const milligrams = Math.round(parseFloat(String(value)) * 1000)
  return isNaN(milligrams) ? '' : String(milligrams)
}

// mm — inteiro
function maskMM(raw) {
  const digits = String(raw).replace(/\D/g, '')
  return digits
}
function parseMM(masked) {
  if (!masked) return ''
  const n = parseInt(masked, 10)
  return isNaN(n) ? '' : n
}

// ── Campos mascarados ────────────────────────────────────────────────────────

function BRLInput({ value, onChange }) {
  const [display, setDisplay] = useState(() => value ? maskBRL(brlToDigits(value)) : '')

  useEffect(() => {
    setDisplay(value ? maskBRL(brlToDigits(value)) : '')
  }, [value])

  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '')
    setDisplay(maskBRL(digits))
    onChange(parseBRL(maskBRL(digits)))
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">R$</span>
      <input
        className="input pl-9"
        value={display}
        onChange={handleChange}
        placeholder="0,00"
        inputMode="numeric"
      />
    </div>
  )
}

function KGInput({ value, onChange, placeholder = '0,000' }) {
  const [display, setDisplay] = useState(() => value ? maskKG(kgToDigits(value)) : '')

  useEffect(() => {
    setDisplay(value ? maskKG(kgToDigits(value)) : '')
  }, [value])

  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '')
    setDisplay(maskKG(digits))
    onChange(parseKG(maskKG(digits)))
  }

  return (
    <div className="relative">
      <input
        className="input pr-10"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        inputMode="numeric"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">kg</span>
    </div>
  )
}

function MMInput({ value, onChange, placeholder = '0' }) {
  const [display, setDisplay] = useState(() => value ? maskMM(String(value)) : '')

  useEffect(() => {
    setDisplay(value ? maskMM(String(value)) : '')
  }, [value])

  function handleChange(e) {
    const digits = maskMM(e.target.value)
    setDisplay(digits)
    onChange(parseMM(digits))
  }

  return (
    <div className="relative">
      <input
        className="input pr-10"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        inputMode="numeric"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">mm</span>
    </div>
  )
}

// ── Formulário ───────────────────────────────────────────────────────────────

const EMPTY_PRODUCT = {
  tipo: '', modelo: '', bateria: '', motor: '',
  velocidade_min: '', velocidade_max: '', pneu: '', suspensao: '',
  autonomia: '', carregador: '', impermeabilidade: '', cambio: '',
  peso_bruto: '', peso_liquido: '',
  comprimento: '', largura: '', altura: '',
  estoque: 0, imagem: '', extra: '', preco: ''
}

function ProductForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_PRODUCT, ...initial })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try { await onSave(form) }
    finally { setLoading(false) }
  }

  const num = (k) => (
    <input type="number" step="0.01" className="input"
      value={form[k]} onChange={e => set(k, e.target.value)} />
  )
  const txt = (k, placeholder) => (
    <input className="input" value={form[k] || ''}
      onChange={e => set(k, e.target.value)} placeholder={placeholder} />
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="label">Tipo</label>
          {txt('tipo', 'Ex: Patinete, Scooter')}
        </div>
        <div><label className="label">Modelo</label>{txt('modelo')}</div>
        <div>
          <label className="label">Preço (R$)</label>
          <BRLInput value={form.preco} onChange={v => set('preco', v)} />
        </div>
        <div><label className="label">Bateria</label>{txt('bateria', 'Ex: 48V 15Ah')}</div>
        <div><label className="label">Motor</label>{txt('motor', 'Ex: 500W')}</div>
        <div><label className="label">Vel. Mín. (km/h)</label>{num('velocidade_min')}</div>
        <div><label className="label">Vel. Máx. (km/h)</label>{num('velocidade_max')}</div>
        <div><label className="label">Pneu</label>{txt('pneu', 'Ex: 10"')}</div>
        <div><label className="label">Suspensão</label>{txt('suspensao')}</div>
        <div><label className="label">Autonomia</label>{txt('autonomia', 'Ex: 40-60km')}</div>
        <div><label className="label">Carregador</label>{txt('carregador', 'Ex: 2A')}</div>
        <div><label className="label">Impermeabilidade</label>{txt('impermeabilidade', 'Ex: IPX4')}</div>
        <div><label className="label">Câmbio</label>{txt('cambio', 'Ex: 7 velocidades Shimano')}</div>

        {/* Dimensões */}
        <div className="sm:col-span-2">
          <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wide mb-2">Dimensões</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Comprimento</label>
              <MMInput value={form.comprimento} onChange={v => set('comprimento', v)} />
            </div>
            <div>
              <label className="label">Largura</label>
              <MMInput value={form.largura} onChange={v => set('largura', v)} />
            </div>
            <div>
              <label className="label">Altura</label>
              <MMInput value={form.altura} onChange={v => set('altura', v)} />
            </div>
          </div>
        </div>

        {/* Pesos */}
        <div>
          <label className="label">Peso Bruto</label>
          <KGInput value={form.peso_bruto} onChange={v => set('peso_bruto', v)} />
        </div>
        <div>
          <label className="label">Peso Líquido</label>
          <KGInput value={form.peso_liquido} onChange={v => set('peso_liquido', v)} />
        </div>

        <div>
          <label className="label">Estoque</label>
          <input type="number" className="input" value={form.estoque}
            onChange={e => set('estoque', parseInt(e.target.value) || 0)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Imagem (URL)</label>
          {txt('imagem', 'https://...')}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Extras / Observações</label>
          <textarea className="input resize-none" rows={3}
            value={form.extra || ''} onChange={e => set('extra', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export function ProductDetailPage() {
  const { catalogId } = useParams()
  const navigate = useNavigate()

  const [catalog, setCatalog]   = useState(null)
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [toast, setToast]       = useState(null)

  const showToast = (m, t = 'success') => setToast({ message: m, type: t })

  const load = useCallback(async () => {
    if (!catalogId || catalogId === 'all') return
    setLoading(true)
    try {
      const cat = await api.getCatalog(catalogId)
      setCatalog(cat)
      setProducts(cat.products || [])
    } finally {
      setLoading(false)
    }
  }, [catalogId])

  useEffect(() => { load() }, [load])

  async function handleCreate(data) {
    try {
      await api.createProduct(catalogId, data)
      setShowForm(false)
      showToast('Produto criado!')
      load()
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleUpdate(prodId, data) {
    try {
      await api.updateProduct(catalogId, prodId, data)
      setEditing(null)
      showToast('Produto atualizado!')
      load()
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleDelete(prod) {
    if (!confirm(`Excluir produto "${prod.tipo} ${prod.modelo}"?`)) return
    try {
      await api.deleteProduct(catalogId, prod.id)
      showToast('Produto excluído.')
      load()
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleUpdateStock(prod, estoque) {
    try {
      await api.updateStock(catalogId, prod.id, parseInt(estoque))
      load()
    } catch (err) { showToast(err.message, 'error') }
  }

  if (loading && !catalog) return <div className="p-6 text-zinc-500 text-sm">Carregando...</div>

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <button className="btn-ghost btn-sm" onClick={() => navigate('/catalogs')}>
        <ArrowLeft size={15} /> Catálogos
      </button>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{catalog?.nome}</h1>
          <p className="text-xs text-zinc-500">{formatDate(catalog?.data)} · {products.length} produtos</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo Produto
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-zinc-200 mb-4">Novo Produto</h2>
          <ProductForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {products.length === 0 && !showForm ? (
        <EmptyState icon={Package} message="Nenhum produto neste catálogo" />
      ) : (
        <div className="space-y-3">
          {products.map(prod => (
            <div key={prod.id} className="card">
              {editing?.id === prod.id ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-200">Editando: {prod.tipo} {prod.modelo}</h3>
                    <button className="btn-ghost btn-sm" onClick={() => setEditing(null)}>
                      <X size={14} />
                    </button>
                  </div>
                  <ProductForm
                    initial={prod}
                    onSave={(d) => handleUpdate(prod.id, d)}
                    onCancel={() => setEditing(null)}
                  />
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-zinc-100">{prod.tipo} {prod.modelo}</h3>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button className="btn-ghost btn-sm" onClick={() => setEditing(prod)}>
                        <Edit2 size={13} />
                      </button>
                      <button className="btn-danger btn-sm" onClick={() => handleDelete(prod)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {prod.imagem && (
                    <img src={prod.imagem} alt={prod.tipo}
                      className="w-full max-w-xs rounded-lg object-contain bg-zinc-800 p-2" />
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <Spec label="Preço"        value={prod.preco ? `R$ ${Number(prod.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null} />
                    <Spec label="Bateria"      value={prod.bateria} />
                    <Spec label="Motor"        value={prod.motor} />
                    <Spec label="Vel. min"     value={prod.velocidade_min ? `${prod.velocidade_min} km/h` : null} />
                    <Spec label="Vel. max"     value={prod.velocidade_max ? `${prod.velocidade_max} km/h` : null} />
                    <Spec label="Autonomia"    value={prod.autonomia} />
                    <Spec label="Pneu"         value={prod.pneu} />
                    <Spec label="Suspensão"    value={prod.suspensao} />
                    <Spec label="Carregador"   value={prod.carregador} />
                    <Spec label="Impermeab."   value={prod.impermeabilidade} />
                    <Spec label="Câmbio"       value={prod.cambio} />
                    <Spec label="Peso Bruto"   value={prod.peso_bruto ? `${Number(prod.peso_bruto).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} kg` : null} />
                    <Spec label="Peso Líquido" value={prod.peso_liquido ? `${Number(prod.peso_liquido).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} kg` : null} />
                    <Spec label="Comprimento"  value={prod.comprimento ? `${prod.comprimento} mm` : null} />
                    <Spec label="Largura"      value={prod.largura ? `${prod.largura} mm` : null} />
                    <Spec label="Altura"       value={prod.altura ? `${prod.altura} mm` : null} />
                  </div>

                  <div className="flex items-center gap-3 pt-1 border-t border-zinc-800">
                    <label className="text-xs text-zinc-400 font-medium">Estoque:</label>
                    <input
                      type="number"
                      className="input w-20 text-center"
                      value={prod.estoque}
                      onChange={e => handleUpdateStock(prod, e.target.value)}
                      min={0}
                    />
                    <span className="text-xs text-zinc-600">unidades</span>
                  </div>

                  {prod.extra && (
                    <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-2">{prod.extra}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Spec({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-zinc-200 font-medium">{value}</p>
    </div>
  )
}
