import { useState, useEffect, useCallback } from 'react'
import { Edit2, X, Plus, Trash2, Package } from 'lucide-react'
import { api } from '../utils/api.js'
import { EmptyState } from '../components/EmptyState.jsx'
import { Toast } from '../components/Toast.jsx'

// ── Máscaras ────────────────────────────────────────────────────────────────

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
  const mg = Math.round(parseFloat(String(value)) * 1000)
  return isNaN(mg) ? '' : String(mg)
}

function maskMM(raw) {
  return String(raw).replace(/\D/g, '')
}
function parseMM(masked) {
  if (!masked) return ''
  const n = parseInt(masked, 10)
  return isNaN(n) ? '' : n
}

// ── Campos mascarados ────────────────────────────────────────────────────────

function BRLInput({ value, onChange }) {
  const [display, setDisplay] = useState(() => value ? maskBRL(brlToDigits(value)) : '')
  useEffect(() => { setDisplay(value ? maskBRL(brlToDigits(value)) : '') }, [value])
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '')
    setDisplay(maskBRL(digits))
    onChange(parseBRL(maskBRL(digits)))
  }
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">R$</span>
      <input className="input pl-9" value={display} onChange={handleChange} placeholder="0,00" inputMode="numeric" />
    </div>
  )
}

function KGInput({ value, onChange }) {
  const [display, setDisplay] = useState(() => value ? maskKG(kgToDigits(value)) : '')
  useEffect(() => { setDisplay(value ? maskKG(kgToDigits(value)) : '') }, [value])
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '')
    setDisplay(maskKG(digits))
    onChange(parseKG(maskKG(digits)))
  }
  return (
    <div className="relative">
      <input className="input pr-10" value={display} onChange={handleChange} placeholder="0,000" inputMode="numeric" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">kg</span>
    </div>
  )
}

function MMInput({ value, onChange }) {
  const [display, setDisplay] = useState(() => value ? maskMM(String(value)) : '')
  useEffect(() => { setDisplay(value ? maskMM(String(value)) : '') }, [value])
  function handleChange(e) {
    const digits = maskMM(e.target.value)
    setDisplay(digits)
    onChange(parseMM(digits))
  }
  return (
    <div className="relative">
      <input className="input pr-10" value={display} onChange={handleChange} placeholder="0" inputMode="numeric" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">mm</span>
    </div>
  )
}

// ── ProductForm ──────────────────────────────────────────────────────────────

const EMPTY_PRODUCT = {
  tipo: '', modelo: '', bateria: '', motor: '',
  velocidade_min: '', velocidade_max: '', pneu: '', suspensao: '',
  autonomia: '', carregador: '', impermeabilidade: '', cambio: '',
  peso_bruto: '', peso_liquido: '',
  comprimento: '', largura: '', altura: '',
  estoque: 0, imagem: '', extra: '', preco: '',
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

  const txt = (k, placeholder) => (
    <input className="input" value={form[k] || ''} placeholder={placeholder}
      onChange={e => set(k, e.target.value)} />
  )
  const num = (k) => (
    <input type="number" step="0.01" className="input"
      value={form[k]} onChange={e => set(k, e.target.value)} />
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="label">Tipo *</label>
          {txt('tipo', 'Ex: patinete, bicicleta, scooter...')}
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

        <div className="sm:col-span-2">
          <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wide mb-2">Dimensões</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Comprimento</label><MMInput value={form.comprimento} onChange={v => set('comprimento', v)} /></div>
            <div><label className="label">Largura</label><MMInput value={form.largura} onChange={v => set('largura', v)} /></div>
            <div><label className="label">Altura</label><MMInput value={form.altura} onChange={v => set('altura', v)} /></div>
          </div>
        </div>

        <div><label className="label">Peso Bruto</label><KGInput value={form.peso_bruto} onChange={v => set('peso_bruto', v)} /></div>
        <div><label className="label">Peso Líquido</label><KGInput value={form.peso_liquido} onChange={v => set('peso_liquido', v)} /></div>

        <div><label className="label">Estoque</label>
          <input type="number" className="input" value={form.estoque}
            onChange={e => set('estoque', parseInt(e.target.value) || 0)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Imagem (URL)</label>
          {txt('imagem', 'https://...')}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Extras / Observações</label>
          <textarea className="input resize-none" rows={2}
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

// ── Spec ─────────────────────────────────────────────────────────────────────

function Spec({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-zinc-200 font-medium">{value}</p>
    </div>
  )
}

// ── ProductsPage ─────────────────────────────────────────────────────────────

export function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (m, t = 'success') => setToast({ message: m, type: t })

  const load = useCallback(async () => {
    setLoading(true)
    try { setProducts(await api.listAllProducts()) }
    catch (err) { showToast(err.message, 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(data) {
    try {
      await api.createProductGlobal(data)
      setShowForm(false)
      showToast('Produto criado!')
      load()
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleUpdate(id, data) {
    try {
      await api.updateProductGlobal(id, data)
      setEditing(null)
      showToast('Produto atualizado!')
      load()
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleDelete(prod) {
    if (!confirm(`Excluir produto "${prod.tipo} ${prod.modelo}"?`)) return
    try {
      await api.deleteProductGlobal(prod.id)
      showToast('Produto excluído.')
      load()
    } catch (err) { showToast(err.message, 'error') }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Produtos</h1>
          <p className="text-xs text-zinc-500">{products.length} produto(s) cadastrado(s)</p>
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

      {products.length === 0 && !showForm && !loading ? (
        <EmptyState icon={Package} message="Nenhum produto cadastrado" />
      ) : (
        <div className="space-y-3">
          {products.map(prod => (
            <div key={prod.id} className="card">
              {editing?.id === prod.id ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-200">Editando: {prod.tipo} {prod.modelo}</h3>
                    <button className="btn-ghost btn-sm" onClick={() => setEditing(null)}><X size={14} /></button>
                  </div>
                  <ProductForm initial={prod} onSave={(d) => handleUpdate(prod.id, d)} onCancel={() => setEditing(null)} />
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-zinc-100">{prod.tipo} {prod.modelo}</h3>
                    <div className="flex gap-1.5 shrink-0">
                      <button className="btn-ghost btn-sm" onClick={() => setEditing(prod)}><Edit2 size={13} /></button>
                      <button className="btn-danger btn-sm" onClick={() => handleDelete(prod)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <Spec label="Preço" value={prod.preco ? `R$ ${Number(prod.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null} />
                    <Spec label="Bateria" value={prod.bateria} />
                    <Spec label="Motor" value={prod.motor} />
                    <Spec label="Vel. max" value={prod.velocidade_max ? `${prod.velocidade_max} km/h` : null} />
                    <Spec label="Autonomia" value={prod.autonomia} />
                    <Spec label="Pneu" value={prod.pneu} />
                    <Spec label="Suspensão" value={prod.suspensao} />
                    <Spec label="Câmbio" value={prod.cambio} />
                    <Spec label="Carregador" value={prod.carregador} />
                    <Spec label="Impermeab." value={prod.impermeabilidade} />
                    <Spec label="Peso Bruto" value={prod.peso_bruto ? `${Number(prod.peso_bruto).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} kg` : null} />
                    <Spec label="Peso Líquido" value={prod.peso_liquido ? `${Number(prod.peso_liquido).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} kg` : null} />
                    <Spec label="Comprimento" value={prod.comprimento ? `${prod.comprimento} mm` : null} />
                    <Spec label="Largura" value={prod.largura ? `${prod.largura} mm` : null} />
                    <Spec label="Altura" value={prod.altura ? `${prod.altura} mm` : null} />
                  </div>
                  {prod.extra && <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-2">{prod.extra}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
