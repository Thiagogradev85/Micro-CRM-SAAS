import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Save, X, Phone, Globe, Instagram,
  Star, ShoppingCart, Send, Trash2, MessageSquare,
  Mail, Facebook, Twitter, Linkedin, MapPin, Sparkles
} from 'lucide-react'
import { api } from '../utils/api.js'
import { formatDate, formatDateTime, statusPill, NOTAS, UFS, whatsappLink, instagramLink, facebookLink, twitterLink, linkedinLink, broadcastClient, socialHandle, normalizePhone } from '../utils/constants.js'
import { useModal } from '../hooks/useModal.js'
import { EnrichModal } from '../components/EnrichModal.jsx'

export function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [client, setClient]         = useState(null)
  const [observations, setObs]      = useState([])
  const [statuses, setStatuses]     = useState([])
  const [catalogs, setCatalogs]     = useState([])
  const [sellers, setSellers]       = useState([])
  const [editing, setEditing]       = useState(false)
  const [form, setForm]             = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [obsText, setObsText]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [enrichOpen, setEnrichOpen] = useState(false)
  const { modal, showModal } = useModal()

  const load = useCallback(async () => {
    const [c, obs, s, cat, sel] = await Promise.all([
      api.getClient(id),
      api.listObservations(id),
      api.listStatuses(),
      api.listCatalogs(),
      api.listSellers(),
    ])
    setClient(c)
    setForm(c)
    setObs(obs)
    setStatuses(s)
    setCatalogs(cat)
    setSellers(sel)
  }, [id])

  useEffect(() => { load() }, [load])

  function openDeleteConfirm() {
    showModal({
      type: 'warning',
      title: `Excluir ${client.nome}?`,
      message: 'Escolha entre inativar (mantém o histórico) ou excluir permanentemente do banco.',
      actions: [
        {
          label: 'Inativar (manter histórico)',
          variant: 'secondary',
          onClick: async () => {
            try {
              await api.deleteClient(client.id, false)
              broadcastClient('client_deleted', client.id)
              navigate('/clients')
            } catch (err) {
              showModal({ type: 'error', title: 'Erro', message: err.message })
            }
          },
        },
        {
          label: 'Excluir permanentemente',
          variant: 'danger',
          onClick: async () => {
            try {
              await api.deleteClient(client.id, true)
              broadcastClient('client_deleted', client.id)
              navigate('/clients')
            } catch (err) {
              showModal({ type: 'error', title: 'Erro', message: err.message })
            }
          },
        },
      ],
    })
  }

  async function handleSave() {
    const errs = {}
    if (!form.nome?.trim()) errs.nome = true
    if (!form.uf?.trim())   errs.uf   = true
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
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
    setFieldErrors({})
    setLoading(true)
    try {
      await saveClient(form.updated_at)
    } catch (err) {
      if (err.status === 409) {
        setLoading(false)
        showModal({
          type: 'warning',
          title: 'Conflito de edição',
          message: 'Este cliente foi alterado em outra aba ou sessão desde que você o abriu.',
          actions: [
            {
              label: 'Recarregar (descartar minhas alterações)',
              variant: 'secondary',
              onClick: () => { setEditing(false); load() },
            },
            {
              label: 'Forçar salvar (sobrescrever)',
              variant: 'danger',
              onClick: async () => {
                setLoading(true)
                try {
                  await saveClient(null)
                } catch (e) {
                  showModal({ type: 'error', title: 'Erro', message: e.message })
                } finally {
                  setLoading(false)
                }
              },
            },
          ],
        })
        return
      }
      showModal({ type: 'error', title: 'Erro', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function saveClient(updatedAt) {
    await api.updateClient(id, {
      nome:        form.nome,
      responsavel: form.responsavel,
      cnpj:        form.cnpj,
      cidade:      form.cidade,
      uf:          form.uf,
      cep:         form.cep,
      logradouro:  form.logradouro,
      numero:      form.numero,
      complemento: form.complemento,
      bairro:      form.bairro,
      whatsapp:    form.whatsapp,
      telefone:    form.telefone,
      email:       form.email,
      site:        form.site,
      instagram:   form.instagram,
      facebook:    form.facebook,
      twitter:     form.twitter,
      linkedin:    form.linkedin,
      nota:        form.nota       ? parseInt(form.nota)       : null,
      status_id:   form.status_id  ? parseInt(form.status_id)  : null,
      catalog_id:  form.catalog_id ? parseInt(form.catalog_id) : null,
      seller_id:   form.seller_id  ? parseInt(form.seller_id)  : null,
      ativo:            form.ativo,
      ja_cliente:       form.ja_cliente,
      catalogo_enviado: form.catalogo_enviado,
      updated_at:       updatedAt ?? undefined,
    })
    broadcastClient('client_updated', id)
    showModal({ type: 'success', title: 'Sucesso', message: 'Cliente atualizado!' })
    setEditing(false)
    load()
  }

  async function handlePurchase() {
    try {
      await api.registerPurchase(id)
      broadcastClient('client_updated', id)
      showModal({ type: 'success', title: 'Compra registrada!', message: 'Compra registrada no relatório diário.' })
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  async function handleAddObs() {
    if (!obsText.trim()) return
    try {
      await api.addObservation(id, obsText.trim())
      setObsText('')
      const obs = await api.listObservations(id)
      setObs(obs)
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  async function handleDeleteObs(obsId) {
    if (!confirm('Remover este follow-up?')) return
    try {
      await api.deleteObservation(id, obsId)
      setObs(prev => prev.filter(o => o.id !== obsId))
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  // Recebe patches do EnrichModal e aplica ao formulário para revisão antes de salvar
  async function handleEnrichSave(patches) {
    for (const { fields } of patches) {
      setForm(f => ({ ...f, ...fields }))
    }
    setEnrichOpen(false)
    if (!editing) setEditing(true)
  }

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }))
    if (fieldErrors[field]) setFieldErrors(e => ({ ...e, [field]: null }))
  }

  if (!client) return <div className="p-6 text-zinc-500 text-sm">Carregando...</div>

  const currentStatus = statuses.find(s => s.id === client.status_id)

  // Endereço completo formatado
  const endereco = [
    client.logradouro,
    client.numero && `nº ${client.numero}`,
    client.complemento,
    client.bairro,
    [client.cidade, client.uf].filter(Boolean).join('/'),
    client.cep && `CEP ${client.cep}`,
  ].filter(Boolean).join(', ')

  const inp = (field, placeholder, type = 'text') => (
    <input className="input" type={type} value={form[field] || ''}
      onChange={e => set(field, e.target.value)} placeholder={placeholder} />
  )

  function formatCnpj(value) {
    const d = String(value).replace(/\D/g, '').slice(0, 14)
    if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    return value
  }

  const inpCnpj = () => (
    <input
      className="input"
      type="text"
      value={form.cnpj || ''}
      onChange={e => set('cnpj', e.target.value)}
      onBlur={e => set('cnpj', formatCnpj(e.target.value))}
      placeholder="00.000.000/0000-00"
      maxLength={18}
    />
  )

  const section = (title) => (
    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-1 mb-2">{title}</p>
  )

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {modal}

      {enrichOpen && (
        <EnrichModal
          clientIds={[parseInt(id)]}
          onSave={handleEnrichSave}
          onClose={() => setEnrichOpen(false)}
        />
      )}

      <button className="btn-ghost btn-sm" onClick={() => navigate('/clients')}>
        <ArrowLeft size={15} /> Voltar
      </button>

      <div className="card space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            {editing ? (
              <div>
                <input
                  className={`input text-lg font-bold ${fieldErrors.nome ? 'border-red-500' : ''}`}
                  value={form.nome}
                  onChange={e => set('nome', e.target.value)}
                />
                {fieldErrors.nome && <p className="text-xs text-red-400 mt-1">* obrigatório</p>}
              </div>
            ) : (
              <h1 className="text-xl font-bold text-zinc-100">{client.nome}</h1>
            )}
            {client.responsavel && !editing && (
              <p className="text-sm text-zinc-400 mt-0.5">Resp: {client.responsavel}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {client.ja_cliente && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-green-600/20 text-green-400 border border-green-600/30">
                  ✓ Cliente
                </span>
              )}
              {client.catalogo_enviado && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-pink-600/20 text-pink-400 border border-pink-600/30">
                  ✓ Catálogo enviado
                </span>
              )}
              {currentStatus && (
                <span style={statusPill(currentStatus.cor)}>{currentStatus.nome}</span>
              )}
              {client.nota && (
                <span className={`flex items-center gap-1 text-xs font-semibold ${NOTAS[client.nota]?.color}`}>
                  <Star size={12} /> {NOTAS[client.nota]?.label}
                </span>
              )}
              {!client.ativo && (
                <span className="badge bg-zinc-700 text-zinc-400">Inativo</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {editing ? (
              <>
                <button className="btn-primary btn-sm" onClick={handleSave} disabled={loading}>
                  <Save size={14} /> Salvar
                </button>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => setEnrichOpen(true)}
                  title="Enriquecer dados — preenche campos vazios para revisão"
                >
                  <Sparkles size={14} className="text-amber-400" />
                </button>
                <button className="btn-secondary btn-sm" onClick={() => { setEditing(false); setForm(client); setFieldErrors({}) }}>
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <button className="btn-secondary btn-sm" onClick={() => setEditing(true)}>
                  <Edit2 size={14} /> Editar
                </button>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => { setEnrichOpen(true); setEditing(true) }}
                  title="Enriquecer dados — preenche campos vazios para revisão"
                >
                  <Sparkles size={14} className="text-amber-400" />
                </button>
              </>
            )}
            <button className="btn-danger btn-sm" onClick={openDeleteConfirm} title="Excluir cliente">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* EDIÇÃO */}
        {editing ? (
          <div className="space-y-1">
            {section('Identificação')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className={`select ${fieldErrors.uf ? 'border-red-500' : ''}`}
                  value={form.uf || ''}
                  onChange={e => set('uf', e.target.value)}
                >
                  <option value="">Selecione</option>
                  {UFS.map(u => <option key={u}>{u}</option>)}
                </select>
                {fieldErrors.uf && <p className="text-xs text-red-400 mt-1">* obrigatório</p>}
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
                <input className="input" type="text" value={form.whatsapp || ''}
                  onChange={e => set('whatsapp', e.target.value)}
                  onBlur={e => set('whatsapp', normalizePhone(e.target.value))}
                  placeholder="5511..." />
              </div>
              <div>
                <label className="label">Telefone Fixo</label>
                <input className="input" type="text" value={form.telefone || ''}
                  onChange={e => set('telefone', e.target.value)}
                  onBlur={e => set('telefone', normalizePhone(e.target.value))}
                  placeholder="1133..." />
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
                <select className="select" value={form.status_id || ''} onChange={e => set('status_id', e.target.value)}>
                  <option value="">Sem status</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Nota</label>
                <select className="select" value={form.nota || ''} onChange={e => set('nota', e.target.value)}>
                  <option value="">Sem nota</option>
                  {Object.entries(NOTAS).map(([v, n]) => (
                    <option key={v} value={v}>{v} — {n.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Catálogo</label>
                <select className="select" value={form.catalog_id || ''} onChange={e => set('catalog_id', e.target.value)}>
                  <option value="">Nenhum</option>
                  {catalogs.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Vendedor</label>
                <select className="select" value={form.seller_id || ''} onChange={e => set('seller_id', e.target.value)}>
                  <option value="">Nenhum</option>
                  {sellers.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ja_cliente_edit" checked={!!form.ja_cliente}
                  onChange={e => set('ja_cliente', e.target.checked)} className="accent-green-500" />
                <label htmlFor="ja_cliente_edit" className="text-sm text-zinc-300">Já é cliente (realizou compra)</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="catalogo_enviado_edit" checked={!!form.catalogo_enviado}
                  onChange={e => set('catalogo_enviado', e.target.checked)} className="accent-pink-500" />
                <label htmlFor="catalogo_enviado_edit" className="text-sm text-zinc-300">Catálogo já enviado</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo_edit" checked={!!form.ativo}
                  onChange={e => set('ativo', e.target.checked)} className="accent-sky-500" />
                <label htmlFor="ativo_edit" className="text-sm text-zinc-300">Cliente ativo</label>
              </div>
            </div>
          </div>

        ) : (
          /* VISUALIZAÇÃO */
          <div className="space-y-4 text-sm">
            {/* Endereço */}
            {endereco && (
              <div>
                <p className="label">Endereço</p>
                <p className="text-zinc-200 flex items-start gap-1">
                  <MapPin size={13} className="mt-0.5 shrink-0 text-zinc-500" /> {endereco}
                </p>
              </div>
            )}

            {/* CNPJ em destaque */}
            {client.cnpj && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 w-fit">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">CNPJ</span>
                <span className="text-sm font-mono font-semibold text-zinc-200">{client.cnpj}</span>
              </div>
            )}

            {/* Grid infos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              <Info label="Catálogo"    value={client.catalog_nome} />
              <Info label="Vendedor"    value={client.seller_nome} />
              <Info label="Criado em"   value={formatDate(client.created_at)} />
              <Info label="Últ. contato" value={formatDateTime(client.ultimo_contato)} />

              {client.whatsapp && (
                <div>
                  <p className="label">WhatsApp</p>
                  <a href={whatsappLink(client.whatsapp)} target="_blank" rel="noreferrer"
                    className="text-green-400 hover:text-green-300 flex items-center gap-1">
                    <Phone size={13} /> {client.whatsapp}
                  </a>
                </div>
              )}
              {client.telefone && (
                <div>
                  <p className="label">Telefone Fixo</p>
                  <a href={whatsappLink(client.telefone)}
                    target="_blank" rel="noreferrer"
                    className="text-green-400 hover:text-green-300 flex items-center gap-1">
                    <Phone size={13} /> {client.telefone}
                  </a>
                </div>
              )}
              {client.email && (
                <div>
                  <p className="label">E-mail</p>
                  <a href={`mailto:${client.email}`}
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1">
                    <Mail size={13} /> {client.email}
                  </a>
                </div>
              )}
              {client.site && (
                <div>
                  <p className="label">Site</p>
                  <a href={client.site} target="_blank" rel="noreferrer"
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 truncate">
                    <Globe size={13} /> {client.site}
                  </a>
                </div>
              )}
              {client.instagram && (
                <div>
                  <p className="label">Instagram</p>
                  <a href={instagramLink(client.instagram)} target="_blank" rel="noreferrer"
                    className="text-pink-400 hover:text-pink-300 flex items-center gap-1 truncate">
                    <Instagram size={13} className="shrink-0" /> @{socialHandle(client.instagram)}
                  </a>
                </div>
              )}
              {client.facebook && (
                <div>
                  <p className="label">Facebook</p>
                  <a href={facebookLink(client.facebook)} target="_blank" rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 truncate">
                    <Facebook size={13} className="shrink-0" /> {socialHandle(client.facebook)}
                  </a>
                </div>
              )}
              {client.twitter && (
                <div>
                  <p className="label">X (Twitter)</p>
                  <a href={twitterLink(client.twitter)} target="_blank" rel="noreferrer"
                    className="text-zinc-300 hover:text-white flex items-center gap-1">
                    <Twitter size={13} /> {client.twitter}
                  </a>
                </div>
              )}
              {client.linkedin && (
                <div>
                  <p className="label">LinkedIn</p>
                  <a href={linkedinLink(client.linkedin)} target="_blank" rel="noreferrer"
                    className="text-blue-500 hover:text-blue-400 flex items-center gap-1">
                    <Linkedin size={13} /> {client.linkedin}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botão Realizou Compra */}
        {!editing && (
          <div className="pt-2 border-t border-zinc-800">
            <button className="btn-success" onClick={handlePurchase}>
              <ShoppingCart size={15} /> Realizou Compra
            </button>
            <p className="text-xs text-zinc-600 mt-1">
              Cada clique registra uma compra no relatório do dia.
            </p>
          </div>
        )}
      </div>

      {/* Follow-up */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-zinc-200 flex items-center gap-2">
          <MessageSquare size={16} className="text-sky-400" />
          Follow-up / Histórico de Contatos
        </h2>

        <div className="space-y-2">
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1"
              onClick={() => setObsText('Contatado via Instagram')}
            >
              <Instagram size={11} /> Instagram
            </button>
          </div>
          <textarea
            className="input resize-none" rows={3}
            placeholder="Descreva o contato realizado com este cliente..."
            value={obsText}
            onChange={e => setObsText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddObs() }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-600">Ctrl+Enter para salvar</p>
            <button className="btn-primary btn-sm" onClick={handleAddObs} disabled={!obsText.trim()}>
              <Send size={13} /> Salvar Follow-up
            </button>
          </div>
        </div>

        {observations.length === 0 ? (
          <p className="text-xs text-zinc-600 py-2">Nenhum follow-up registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {observations.map(obs => (
              <div key={obs.id} className="flex gap-3 min-w-0">
                <div className="w-px bg-zinc-700 relative mt-1 shrink-0">
                  <div className="absolute -left-[3px] top-0 w-1.5 h-1.5 rounded-full bg-sky-500" />
                </div>
                <div className="flex-1 pb-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap break-all min-w-0 flex-1">{obs.texto}</p>
                    <button className="shrink-0 text-zinc-600 hover:text-red-400 transition-colors"
                      onClick={() => handleDeleteObs(obs.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">{formatDateTime(obs.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="text-zinc-200">{value || '—'}</p>
    </div>
  )
}
