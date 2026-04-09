import { useState, useEffect } from 'react'
import { api } from '../utils/api.js'
import { UFS, NOTAS } from '../utils/constants.js'
import { useAppModalError } from '../hooks/useAppModalError.js'

const EMPTY = {
  nome: '', responsavel: '', cnpj: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
  whatsapp: '', telefone: '', email: '', site: '',
  instagram: '', facebook: '', twitter: '', linkedin: '',
  nota: '', status_id: '', catalog_id: '', seller_id: '', ativo: true, ja_cliente: false
}

export function ClientForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm]         = useState({ ...EMPTY, ...initial })
  const [statuses, setStatuses] = useState([])
  const [catalogs, setCatalogs] = useState([])
  const [sellers, setSellers]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState({})
  const { modal, showModal }    = useAppModalError()

  useEffect(() => {
    Promise.all([api.listStatuses(), api.listCatalogs(), api.listSellers()])
      .then(([s, c, v]) => { setStatuses(s); setCatalogs(c); setSellers(v) })
  }, [])

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.nome?.trim()) errs.nome = true
    if (!form.uf)           errs.uf   = true
    if (Object.keys(errs).length) {
      setErrors(errs)
      showModal({
        type: 'warning',
        title: 'Campos obrigatórios',
        message: 'Preencha os campos obrigatórios antes de salvar:',
        details: [
          errs.nome && 'Nome da empresa / loja',
          errs.uf   && 'UF (Estado)',
        ].filter(Boolean),
      })
      return
    }
    setLoading(true)
    try {
      await onSave({
        ...form,
        nota:       form.nota       ? parseInt(form.nota)       : null,
        status_id:  form.status_id  ? parseInt(form.status_id)  : null,
        catalog_id: form.catalog_id ? parseInt(form.catalog_id) : null,
        seller_id:  form.seller_id  ? parseInt(form.seller_id)  : null,
      })
    } finally {
      setLoading(false)
    }
  }

  const inp = (field, placeholder, type = 'text') => (
    <input
      className={`input ${errors[field] ? 'border-red-500' : ''}`}
      type={type}
      value={form[field] || ''}
      onChange={e => set(field, e.target.value)}
      placeholder={placeholder}
    />
  )

  function formatCnpj(value) {
    const d = String(value).replace(/\D/g, '').slice(0, 14)
    if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    return value
  }

  const inpCnpj = () => (
    <input
      className={`input ${errors.cnpj ? 'border-red-500' : ''}`}
      type="text"
      value={form.cnpj || ''}
      onChange={e => set('cnpj', e.target.value)}
      onBlur={e => set('cnpj', formatCnpj(e.target.value))}
      placeholder="00.000.000/0000-00"
      maxLength={18}
    />
  )

  const section = (title) => (
    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-4 mb-2">{title}</p>
  )

  return (
    <>
      {modal}
      <form onSubmit={handleSubmit} className="space-y-1">

        {section('Identificação')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Nome *</label>
            {inp('nome', 'Nome da loja / empresa')}
            {errors.nome && <p className="text-xs text-red-400 mt-1">* obrigatório</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="label">Responsável</label>
            {inp('responsavel', 'Nome do contato')}
          </div>
          <div>
            <label className="label">CNPJ</label>
            {inpCnpj()}
          </div>
        </div>

        {section('Endereço')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">CEP</label>
            {inp('cep', '00000-000')}
          </div>
          <div>
            <label className="label">UF *</label>
            <select
              className={`select ${errors.uf ? 'border-red-500' : ''}`}
              value={form.uf}
              onChange={e => set('uf', e.target.value)}
            >
              <option value="">Selecione</option>
              {UFS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            {errors.uf && <p className="text-xs text-red-400 mt-1">* obrigatório</p>}
          </div>
          <div>
            <label className="label">Cidade</label>
            {inp('cidade', '')}
          </div>
          <div>
            <label className="label">Bairro</label>
            {inp('bairro', '')}
          </div>
          <div>
            <label className="label">Logradouro</label>
            {inp('logradouro', 'Rua, Av...')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Número</label>
              {inp('numero', '')}
            </div>
            <div>
              <label className="label">Complemento</label>
              {inp('complemento', 'Sala, Loja...')}
            </div>
          </div>
        </div>

        {section('Contato')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">WhatsApp</label>
            {inp('whatsapp', '5511...')}
          </div>
          <div>
            <label className="label">Telefone Fixo</label>
            {inp('telefone', '1133...')}
          </div>
          <div className="sm:col-span-2">
            <label className="label">E-mail</label>
            {inp('email', 'contato@loja.com', 'email')}
          </div>
          <div className="sm:col-span-2">
            <label className="label">Site</label>
            {inp('site', 'https://...')}
          </div>
        </div>

        {section('Redes Sociais')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Instagram</label>
            {inp('instagram', '@usuario')}
          </div>
          <div>
            <label className="label">Facebook</label>
            {inp('facebook', 'facebook.com/pagina')}
          </div>
          <div>
            <label className="label">X (Twitter)</label>
            {inp('twitter', '@usuario')}
          </div>
          <div>
            <label className="label">LinkedIn</label>
            {inp('linkedin', 'linkedin.com/company/...')}
          </div>
        </div>

        {section('CRM')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="select" value={form.status_id} onChange={e => set('status_id', e.target.value)}>
              <option value="">Sem status</option>
              {statuses.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nota</label>
            <select className="select" value={form.nota} onChange={e => set('nota', e.target.value)}>
              <option value="">Sem nota</option>
              {Object.entries(NOTAS).map(([v, n]) => (
                <option key={v} value={v}>{v} — {n.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Catálogo</label>
            <select className="select" value={form.catalog_id} onChange={e => set('catalog_id', e.target.value)}>
              <option value="">Nenhum</option>
              {catalogs.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Vendedor</label>
            <select className="select" value={form.seller_id} onChange={e => set('seller_id', e.target.value)}>
              <option value="">Nenhum</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" id="ja_cliente" checked={!!form.ja_cliente}
              onChange={e => set('ja_cliente', e.target.checked)} className="accent-green-500" />
            <label htmlFor="ja_cliente" className="text-sm text-zinc-300">Já é cliente (realizou compra)</label>
          </div>
          {initial.id && (
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" id="ativo" checked={!!form.ativo}
                onChange={e => set('ativo', e.target.checked)} className="accent-sky-500" />
              <label htmlFor="ativo" className="text-sm text-zinc-300">Cliente ativo</label>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
          {onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
          )}
        </div>
      </form>
    </>
  )
}
