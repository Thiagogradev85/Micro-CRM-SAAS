import { useState, useEffect } from 'react'
import {
  Plus, Edit2, Trash2, BookOpen, Package,
  ChevronDown, ChevronRight, FileUp, Loader2, X,
  Link, MinusCircle, FileText, ImageIcon,
} from 'lucide-react'
import { api } from '../utils/api.js'
import { EmptyState } from '../components/EmptyState.jsx'
import { Toast } from '../components/Toast.jsx'
import { ImageLightbox } from '../components/ImageLightbox.jsx'

// ── Catalog date dropdowns ──────────────────────────────────────────────────

const MESES = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

const currentYear = new Date().getFullYear()
const ANOS = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i)

// ── CatalogForm ─────────────────────────────────────────────────────────────

function CatalogForm({ initial = {}, onSave, onCancel }) {
  const [nome, setNome] = useState(initial.nome || '')
  const [loading, setLoading] = useState(false)
  const initDate = initial.data ? initial.data.split('T')[0] : ''
  const [mes, setMes] = useState(initDate ? initDate.slice(5, 7) : String(new Date().getMonth() + 1).padStart(2, '0'))
  const [ano, setAno] = useState(initDate ? initDate.slice(0, 4) : String(currentYear))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nome || !mes || !ano) return
    setLoading(true)
    try { await onSave({ nome, data: `${ano}-${mes}-01` }) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Nome do catálogo *</label>
        <input className="input" value={nome} onChange={e => setNome(e.target.value)}
          required placeholder="Ex: Catálogo Março 2026" />
      </div>
      <div>
        <label className="label">Mês / Ano de referência *</label>
        <div className="flex gap-2">
          <select className="select flex-1" value={mes} onChange={e => setMes(e.target.value)} required>
            {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="select w-28" value={ano} onChange={e => setAno(e.target.value)} required>
            {ANOS.map(a => <option key={a} value={String(a)}>{a}</option>)}
          </select>
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

// ── Máscaras ────────────────────────────────────────────────────────────────

function maskBRL(digits) {
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
function maskKG(digits) {
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
  const [display, setDisplay] = useState(() => value ? String(value).replace(/\D/g, '') : '')
  useEffect(() => { setDisplay(value ? String(value).replace(/\D/g, '') : '') }, [value])
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '')
    setDisplay(digits)
    onChange(digits ? parseInt(digits, 10) : '')
  }
  return (
    <div className="relative">
      <input className="input pr-10" value={display} onChange={handleChange} placeholder="0" inputMode="numeric" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">mm</span>
    </div>
  )
}

// ── Campo de imagem (URL ou arquivo local) ───────────────────────────────────

function ImageInput({ value, onChange }) {
  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange(ev.target.result)
    reader.readAsDataURL(file)
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Cole uma URL ou escolha um arquivo..."
        />
        <label className="btn-secondary cursor-pointer flex items-center gap-1.5 shrink-0 px-3">
          <ImageIcon size={14} />
          Escolher
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
      {value && (
        <img src={value} alt="preview" className="h-20 object-contain rounded-lg bg-zinc-800 p-1 border border-zinc-700" />
      )}
    </div>
  )
}

// ── ProductForm ─────────────────────────────────────────────────────────────

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
      value={form[k] ?? ''} onChange={e => set(k, e.target.value)} />
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
          <label className="label">Imagem</label>
          <ImageInput value={form.imagem} onChange={v => set('imagem', v)} />
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

// ── ProductRow ──────────────────────────────────────────────────────────────

function ProductRow({ prod, catId, onEdit, onDelete, onStockChange, onUnlink }) {
  const [lightbox, setLightbox] = useState(null)
  return (
    <div className="border border-zinc-800 rounded-lg p-3 space-y-2">
      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {prod.imagem && (
            <img src={prod.imagem} alt={prod.tipo}
              className="w-12 h-12 object-contain rounded-lg bg-zinc-800 p-1 border border-zinc-700 shrink-0 cursor-zoom-in"
              onClick={() => setLightbox({ src: prod.imagem, alt: `${prod.tipo} ${prod.modelo}` })} />
          )}
          <div>
            <p className="font-medium text-zinc-100 text-sm">{prod.tipo} {prod.modelo}</p>
            {prod.bateria && <p className="text-xs text-zinc-500">{prod.bateria} · {prod.motor}</p>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button className="btn-ghost btn-sm" onClick={() => onEdit(prod)} title="Editar">
            <Edit2 size={12} />
          </button>
          <button className="btn-ghost btn-sm text-orange-400 hover:text-orange-300" onClick={() => onUnlink(prod)} title="Remover do catálogo">
            <MinusCircle size={12} />
          </button>
          <button className="btn-danger btn-sm" onClick={() => onDelete(prod)} title="Excluir produto">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {prod.preco     && <span className="text-green-400 font-medium">R$ {Number(prod.preco).toFixed(2)}</span>}
        {prod.bateria   && <span className="text-zinc-400"><span className="text-zinc-600">Bat:</span> {prod.bateria}</span>}
        {prod.motor     && <span className="text-zinc-400"><span className="text-zinc-600">Motor:</span> {prod.motor}</span>}
        {prod.velocidade_max && <span className="text-zinc-400"><span className="text-zinc-600">Vel:</span> {prod.velocidade_max} km/h</span>}
        {prod.autonomia && <span className="text-zinc-400"><span className="text-zinc-600">Aut:</span> {prod.autonomia}</span>}
        {prod.peso_bruto && <span className="text-zinc-400"><span className="text-zinc-600">Peso Bruto:</span> {prod.peso_bruto} kg</span>}
        {prod.peso_liquido && <span className="text-zinc-400"><span className="text-zinc-600">Peso Líq:</span> {prod.peso_liquido} kg</span>}
        {(prod.comprimento || prod.largura || prod.altura) && (
          <span className="text-zinc-400"><span className="text-zinc-600">Dim:</span> {[prod.comprimento, prod.largura, prod.altura].filter(Boolean).join(' × ')} mm</span>
        )}
        {prod.pneu      && <span className="text-zinc-400"><span className="text-zinc-600">Pneu:</span> {prod.pneu}</span>}
        {prod.cambio    && <span className="text-zinc-400"><span className="text-zinc-600">Câmbio:</span> {prod.cambio}</span>}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
        <span className="text-xs text-zinc-500">Estoque:</span>
        <input
          type="number" min={0}
          className="input w-16 text-center text-xs py-0.5"
          value={prod.estoque}
          onChange={e => onStockChange(prod, e.target.value)}
        />
        <span className="text-xs text-zinc-600">un.</span>
      </div>
    </div>
  )
}

// ── AddExistingModal ─────────────────────────────────────────────────────────

function AddExistingModal({ catId, onClose, onAdd }) {
  const [all, setAll] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listAllProducts().then(setAll).finally(() => setLoading(false))
  }, [])

  const filtered = all.filter(p =>
    `${p.tipo} ${p.modelo}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-100">Adicionar Produto Existente</h3>
          <button className="btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <input className="input" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {loading && <p className="text-zinc-500 text-sm text-center py-4">Carregando...</p>}
          {!loading && filtered.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">Nenhum produto encontrado</p>}
          {filtered.map(p => (
            <button key={p.id} onClick={() => onAdd(p)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors">
              <p className="text-zinc-100 text-sm font-medium">{p.tipo} {p.modelo}</p>
              {p.preco && <p className="text-zinc-500 text-xs">R$ {Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── CatalogPage ─────────────────────────────────────────────────────────────

export function CatalogPage() {
  const [catalogs, setCatalogs]       = useState([])
  const [loading, setLoading]         = useState(false)
  const [importingPdf, setImportingPdf] = useState(null)
  const [showForm, setShowForm]       = useState(false)
  const [editingCatalog, setEditingCatalog] = useState(null)
  const [toast, setToast]             = useState(null)

  // Products state
  const [expanded, setExpanded]       = useState(null)   // catalogId currently open
  const [products, setProducts]       = useState({})     // { [catId]: Product[] }
  const [loadingProds, setLoadingProds] = useState(null)
  const [showProductForm, setShowProductForm] = useState(null) // catId
  const [editingProduct, setEditingProduct]   = useState(null)
  const [addExistingFor, setAddExistingFor]   = useState(null) // catId

  const showToast = (message, type = 'success') => setToast({ message, type })

  async function loadCatalogs() {
    setLoading(true)
    try { setCatalogs(await api.listCatalogs()) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadCatalogs() }, [])

  async function loadProducts(catId) {
    setLoadingProds(catId)
    try {
      const prods = await api.listProducts(catId)
      setProducts(p => ({ ...p, [catId]: prods }))
    } finally {
      setLoadingProds(null)
    }
  }

  async function toggleExpand(catId) {
    if (expanded === catId) {
      setExpanded(null)
      return
    }
    setExpanded(catId)
    setShowProductForm(null)
    setEditingProduct(null)
    if (!products[catId]) await loadProducts(catId)
  }

  // ── Catalog CRUD ────────────────────────────────────────

  async function handleCreateCatalog(data) {
    try {
      await api.createCatalog(data)
      setShowForm(false)
      showToast('Catálogo criado!')
      loadCatalogs()
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleUpdateCatalog(id, data) {
    try {
      await api.updateCatalog(id, data)
      setEditingCatalog(null)
      showToast('Catálogo atualizado!')
      loadCatalogs()
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleDeleteCatalog(cat) {
    if (!confirm(`Excluir catálogo "${cat.nome}"? Isso removerá todos os produtos.`)) return
    try {
      await api.deleteCatalog(cat.id)
      showToast('Catálogo excluído.')
      if (expanded === cat.id) setExpanded(null)
      loadCatalogs()
    } catch (err) { showToast(err.message, 'error') }
  }

  // ── PDF Import ───────────────────────────────────────────

  async function handleImportPdf(catalogId, e) {
    const file = e.target.files[0]
    if (!file) return
    setImportingPdf(catalogId)
    try {
      const result = await api.importCatalogPdf(catalogId, file)
      showToast(`${result.created} produto${result.created !== 1 ? 's' : ''} criado${result.created !== 1 ? 's' : ''} a partir do PDF!`)
      // Refresh products if catalog is expanded
      await loadProducts(catalogId)
      loadCatalogs()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setImportingPdf(null)
      e.target.value = ''
    }
  }

  // ── Product CRUD ────────────────────────────────────────

  async function handleCreateProduct(catId, data) {
    try {
      await api.createProduct(catId, data)
      setShowProductForm(null)
      showToast('Produto criado!')
      await loadProducts(catId)
      loadCatalogs()
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleUpdateProduct(catId, prodId, data) {
    try {
      await api.updateProduct(catId, prodId, data)
      setEditingProduct(null)
      showToast('Produto atualizado!')
      await loadProducts(catId)
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleDeleteProduct(catId, prod) {
    if (!confirm(`Excluir produto "${prod.nome}"?`)) return
    try {
      await api.deleteProduct(catId, prod.id)
      showToast('Produto excluído.')
      await loadProducts(catId)
      loadCatalogs()
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleUpdateStock(catId, prod, estoque) {
    try {
      await api.updateStock(catId, prod.id, parseInt(estoque))
      setProducts(p => ({
        ...p,
        [catId]: p[catId].map(pr => pr.id === prod.id ? { ...pr, estoque: parseInt(estoque) } : pr),
      }))
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleUnlinkProduct(catId, prod) {
    if (!confirm('Remover produto do catálogo? O produto não será excluído.')) return
    try {
      await api.unlinkProductFromCatalog(catId, prod.id)
      showToast('Produto removido do catálogo.')
      await loadProducts(catId)
      loadCatalogs()
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleAddExisting(catId, prod) {
    try {
      await api.linkProductToCatalog(catId, prod.id)
      setAddExistingFor(null)
      showToast(`"${prod.tipo} ${prod.modelo}" adicionado ao catálogo!`)
      await loadProducts(catId)
      loadCatalogs()
    } catch (err) { showToast(err.message, 'error') }
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Add existing product modal */}
      {addExistingFor && (
        <AddExistingModal
          catId={addExistingFor}
          onClose={() => setAddExistingFor(null)}
          onAdd={(prod) => handleAddExisting(addExistingFor, prod)}
        />
      )}

      {/* PDF processing overlay */}
      {importingPdf && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl">
            <Loader2 size={40} className="animate-spin text-sky-400" />
            <p className="text-zinc-100 font-semibold text-lg">Analisando catálogo PDF...</p>
            <p className="text-zinc-500 text-sm text-center">Extraindo produtos do arquivo.<br/>Aguarde alguns instantes.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Catálogos</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo Catálogo
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-zinc-200 mb-4">Novo Catálogo</h2>
          <CatalogForm onSave={handleCreateCatalog} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
      ) : catalogs.length === 0 ? (
        <EmptyState icon={BookOpen} message="Nenhum catálogo cadastrado" />
      ) : (
        <div className="space-y-3">
          {catalogs.map(cat => {
            const isOpen = expanded === cat.id
            const catProducts = products[cat.id] || []

            return (
              <div key={cat.id} className="card p-0 overflow-hidden">
                {/* Catalog header */}
                {editingCatalog?.id === cat.id ? (
                  <div className="p-4">
                    <CatalogForm
                      initial={cat}
                      onSave={(d) => handleUpdateCatalog(cat.id, d)}
                      onCancel={() => setEditingCatalog(null)}
                    />
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/40 transition-colors"
                    onClick={() => toggleExpand(cat.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-zinc-500 shrink-0">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-zinc-100 truncate">{cat.nome}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {cat.data
                            ? new Date(cat.data).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
                            : '—'}
                          {' · '}
                          <span className="inline-flex items-center gap-1">
                            <Package size={11} className="inline" />
                            {cat.total_products} produto{cat.total_products !== 1 ? 's' : ''}
                          </span>
                          {!cat.ativo && <span className="ml-2 badge bg-zinc-700 text-zinc-500">Inativo</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                      {/* PDF import */}
                      <label
                        className={`btn-secondary btn-sm cursor-pointer flex items-center gap-1 ${importingPdf === cat.id ? 'opacity-60 pointer-events-none' : ''}`}
                        title="Importar produtos via PDF"
                      >
                        {importingPdf === cat.id ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />}
                        PDF
                        <input type="file" accept=".pdf" className="hidden"
                          onChange={(e) => handleImportPdf(cat.id, e)}
                          disabled={!!importingPdf} />
                      </label>

                      {/* Export PDF */}
                      <button
                        className="btn-secondary btn-sm flex items-center gap-1"
                        title="Gerar PDF do catálogo"
                        onClick={() => api.downloadCatalogPdf(cat.id)}
                      >
                        <FileText size={13} />
                        Gerar PDF
                      </button>

                      <button className="btn-ghost btn-sm" onClick={() => setEditingCatalog(cat)} title="Editar catálogo">
                        <Edit2 size={13} />
                      </button>
                      <button className="btn-danger btn-sm" onClick={() => handleDeleteCatalog(cat)} title="Excluir catálogo">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Products section (expanded) */}
                {isOpen && (
                  <div className="border-t border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
                    {/* Products header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                        <Package size={14} /> Produtos
                      </h4>
                      <div className="flex items-center gap-1.5">
                        <button
                          className="btn-secondary btn-sm flex items-center gap-1"
                          onClick={() => { setAddExistingFor(cat.id); setShowProductForm(null) }}
                          title="Adicionar produto existente ao catálogo"
                        >
                          <Link size={13} /> Adicionar Existente
                        </button>
                        {showProductForm !== cat.id && (
                          <button className="btn-primary btn-sm" onClick={() => { setShowProductForm(cat.id); setEditingProduct(null) }}>
                            <Plus size={13} /> Novo Produto
                          </button>
                        )}
                      </div>
                    </div>

                    {/* New product form */}
                    {showProductForm === cat.id && (
                      <div className="border border-zinc-700 rounded-lg p-4 bg-zinc-900">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-semibold text-zinc-200">Novo Produto</h5>
                          <button className="btn-ghost btn-sm" onClick={() => setShowProductForm(null)}>
                            <X size={14} />
                          </button>
                        </div>
                        <ProductForm
                          onSave={(d) => handleCreateProduct(cat.id, d)}
                          onCancel={() => setShowProductForm(null)}
                        />
                      </div>
                    )}

                    {/* Edit product form */}
                    {editingProduct?.catId === cat.id && (
                      <div className="border border-sky-700/40 rounded-lg p-4 bg-zinc-900">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-semibold text-zinc-200">Editando: {editingProduct.nome}</h5>
                          <button className="btn-ghost btn-sm" onClick={() => setEditingProduct(null)}>
                            <X size={14} />
                          </button>
                        </div>
                        <ProductForm
                          initial={editingProduct}
                          onSave={(d) => handleUpdateProduct(cat.id, editingProduct.id, d)}
                          onCancel={() => setEditingProduct(null)}
                        />
                      </div>
                    )}

                    {/* Products list */}
                    {loadingProds === cat.id ? (
                      <div className="text-center text-zinc-500 text-xs py-4">Carregando produtos...</div>
                    ) : catProducts.length === 0 && showProductForm !== cat.id ? (
                      <div className="text-center text-zinc-600 text-xs py-4">
                        Nenhum produto neste catálogo. Clique em "Novo Produto" ou importe via PDF.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {catProducts.map(prod => (
                          editingProduct?.id === prod.id ? null : (
                            <ProductRow
                              key={prod.id}
                              prod={prod}
                              catId={cat.id}
                              onEdit={(p) => setEditingProduct({ ...p, catId: cat.id })}
                              onDelete={(p) => handleDeleteProduct(cat.id, p)}
                              onStockChange={(p, v) => handleUpdateStock(cat.id, p, v)}
                              onUnlink={(p) => handleUnlinkProduct(cat.id, p)}
                            />
                          )
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
