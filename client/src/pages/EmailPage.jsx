import { useState, useEffect, useCallback } from 'react'
import {
  Mail, Wifi, WifiOff, Send, Users, Settings,
  Clock, AlertTriangle, Loader2, ChevronDown, X
} from 'lucide-react'
import { api } from '../utils/api.js'
import { UFS } from '../utils/constants.js'
import { useAppModalError } from '../hooks/useAppModalError.js'

// ── SMTP presets para os provedores mais comuns ───────────────────────────────
const PRESETS = [
  { label: 'Gmail',           host: 'smtp.gmail.com',          port: 587, secure: false },
  { label: 'Outlook/Hotmail', host: 'smtp-mail.outlook.com',   port: 587, secure: false },
  { label: 'Office 365',      host: 'smtp.office365.com',      port: 587, secure: false },
  { label: 'Yahoo',           host: 'smtp.mail.yahoo.com',     port: 465, secure: true  },
  { label: 'Personalizado',   host: '',                         port: 587, secure: false },
]

function UFMultiSelect({ selected, onChange }) {
  const [open, setOpen] = useState(false)

  function toggle(uf) {
    onChange(selected.includes(uf) ? selected.filter(u => u !== uf) : [...selected, uf])
  }

  function toggleAll() {
    onChange(selected.length === UFS.length ? [] : [...UFS])
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="input flex items-center justify-between w-full text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="truncate text-sm">
          {selected.length === 0
            ? <span className="text-zinc-500">Todos os estados</span>
            : selected.length === UFS.length
              ? 'Todos os estados'
              : selected.join(', ')
          }
        </span>
        <ChevronDown size={14} className={`shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {selected.length > 0 && selected.length < UFS.length && (
        <button
          type="button"
          className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          onClick={() => onChange([])}
          title="Limpar seleção"
        >
          <X size={13} />
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            <button
              type="button"
              className="w-full px-3 py-2 text-xs text-left text-sky-400 hover:bg-zinc-700 border-b border-zinc-700 font-medium"
              onClick={toggleAll}
            >
              {selected.length === UFS.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
            <div className="grid grid-cols-4 gap-0 p-1">
              {UFS.map(uf => (
                <button
                  key={uf}
                  type="button"
                  onClick={() => toggle(uf)}
                  className={`px-2 py-1.5 text-xs rounded font-medium transition-colors text-center ${
                    selected.includes(uf)
                      ? 'bg-sky-600 text-white'
                      : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
                  }`}
                >
                  {uf}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const POLL_INTERVAL_IDLE    = 5000
const POLL_INTERVAL_SENDING = 2000

export function EmailPage() {
  // ── Estado de conexão ──────────────────────────────
  const [status, setStatus]     = useState({ status: 'unconfigured', user: null, error: null })
  const [smtpForm, setSmtpForm] = useState({ host: 'smtp.gmail.com', port: 587, secure: false, user: '', pass: '' })
  const [preset, setPreset]     = useState('Gmail')
  const [configuring, setConfiguring] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // ── Estado de envio ────────────────────────────────
  const [statuses, setStatuses]   = useState([])
  const [filters, setFilters]     = useState({ status_id: '', ufs: [] })
  const [preview, setPreview]     = useState(null)
  const [subject, setSubject]     = useState('Conheça nossas scooters e patinetes elétricos, {{nome}}!')
  const [message, setMessage]     = useState(
`Olá, {{nome}}!

Somos especializados em scooters e patinetes elétricos e gostaríamos de apresentar nosso catálogo completo de produtos.

Temos modelos ideais para uso urbano em {{cidade}} - {{uf}}, com ótimo custo-benefício, garantia e suporte técnico.

Ficamos à disposição para enviar mais informações, tirar dúvidas ou agendar uma apresentação.

Atenciosamente,
Equipe de Vendas`
  )
  const [delayMs, setDelayMs]     = useState(4000)
  const [sending, setSending]               = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [testEmail, setTestEmail]           = useState('')
  const [sendingTest, setSendingTest]       = useState(false)

  const { modal, showModal } = useAppModalError()

  // ── Polling de status ──────────────────────────────
  const pollStatus = useCallback(async () => {
    try {
      const s = await api.emailStatus()
      setStatus(s)
    } catch { /* backend offline */ }
  }, [])

  useEffect(() => {
    pollStatus()
    api.listStatuses().then(setStatuses).catch(() => {})
    const isSending = status.sendState?.status === 'sending'
    const interval = setInterval(pollStatus, isSending ? POLL_INTERVAL_SENDING : POLL_INTERVAL_IDLE)
    return () => clearInterval(interval)
  }, [pollStatus, status.sendState?.status])

  // Abre a modal de resultado assim que o envio termina
  useEffect(() => {
    const ss = status.sendState
    if (ss?.status !== 'done') return

    if (ss.sent > 0 && ss.failed === 0) {
      showModal({
        type: 'success',
        title: 'Envio concluído!',
        message: `${ss.sent} e-mail${ss.sent !== 1 ? 's' : ''} enviado${ss.sent !== 1 ? 's' : ''} com sucesso.`,
      })
    } else if (ss.sent > 0 && ss.failed > 0) {
      showModal({
        type: 'warning',
        title: 'Envio parcialmente concluído',
        message: `${ss.sent} enviado${ss.sent !== 1 ? 's' : ''} · ${ss.failed} com erro.`,
        details: ss.errors.map(e => `${e.nome}${e.email ? ` (${e.email})` : ''}: ${e.error}`),
      })
    } else {
      showModal({
        type: 'error',
        title: 'Nenhum e-mail foi enviado',
        message: 'Verifique as configurações SMTP e os endereços de e-mail dos clientes.',
        details: ss.errors.map(e => `${e.nome}: ${e.error}`),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.sendState?.status, status.sendState?.finishedAt])

  // ── Aplicar preset SMTP ────────────────────────────
  function applyPreset(label) {
    const p = PRESETS.find(p => p.label === label)
    if (p) {
      setPreset(label)
      setSmtpForm(f => ({ ...f, host: p.host, port: p.port, secure: p.secure }))
    }
  }

  // ── Conectar SMTP ──────────────────────────────────
  async function handleConfigure(e) {
    e.preventDefault()
    setConfiguring(true)
    try {
      const result = await api.emailConfigure(smtpForm)
      showModal({ type: 'success', title: 'Conectado!', message: result.message })
      await pollStatus()
    } catch (err) {
      showModal({ type: 'error', title: 'Erro de conexão SMTP', message: err.message })
    } finally {
      setConfiguring(false)
    }
  }

  async function handleDisconnect() {
    try {
      await api.emailDisconnect()
      setPreview(null)
      await pollStatus()
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  // ── Preview de destinatários ───────────────────────
  async function handlePreview() {
    setLoadingPreview(true)
    try {
      const params = {}
      if (filters.status_id) params.status_id = filters.status_id
      if (filters.ufs.length > 0) params.ufs = filters.ufs.join(',')
      const result = await api.emailPreview(params)
      setPreview(result)
    } catch (err) {
      showModal({ type: 'error', title: 'Erro ao buscar destinatários', message: err.message })
    } finally { setLoadingPreview(false) }
  }

  // ── Enviar e-mail de teste ─────────────────────────
  async function handleSendTest() {
    if (!testEmail.trim()) return showModal({ type: 'warning', title: 'Campo obrigatório', message: 'Informe um e-mail de destino para o teste.' })
    if (!subject.trim())   return showModal({ type: 'warning', title: 'Campo obrigatório', message: 'Escreva o assunto antes de testar.' })
    if (!message.trim())   return showModal({ type: 'warning', title: 'Campo obrigatório', message: 'Escreva a mensagem antes de testar.' })
    setSendingTest(true)
    try {
      const result = await api.emailSendTest({ to: testEmail, subject, message })
      showModal({ type: 'success', title: 'Teste enviado!', message: result.message })
    } catch (err) {
      showModal({ type: 'error', title: 'Erro no envio de teste', message: err.message })
    } finally { setSendingTest(false) }
  }

  // ── Enviar em massa ────────────────────────────────
  async function handleSend() {
    if (!subject.trim())               return showModal({ type: 'warning', title: 'Campo obrigatório', message: 'Digite o assunto antes de enviar.' })
    if (!message.trim())               return showModal({ type: 'warning', title: 'Campo obrigatório', message: 'Digite a mensagem antes de enviar.' })
    if (!preview || preview.total === 0) return showModal({ type: 'warning', title: 'Sem destinatários', message: 'Clique em "Ver destinatários" antes de enviar.' })
    if (!confirm(`Enviar e-mail para ${preview.total} clientes?\n\nEssa ação não pode ser desfeita.`)) return

    setSending(true)
    try {
      const params = {}
      if (filters.status_id) params.status_id = filters.status_id
      if (filters.ufs.length > 0) params.ufs = filters.ufs.join(',')
      await api.emailSendBulk({ ...params, subject, message, delay_ms: delayMs })
      showModal({ type: 'info', title: 'Envio iniciado', message: `Enviando para ${preview.total} clientes em background. Você será avisado quando terminar.` })
    } catch (err) {
      showModal({ type: 'error', title: 'Erro ao iniciar envio', message: err.message })
    } finally { setSending(false) }
  }

  const isConnected    = status.status === 'connected'
  const isConfiguring  = status.status === 'connecting'
  const hasError       = status.status === 'error'

  // Preview da mensagem interpolada para o primeiro contato
  const previewClient = preview?.clients?.[0]
  const previewSubject = previewClient
    ? subject.replace(/\{\{nome\}\}/gi, previewClient.nome || '').replace(/\{\{cidade\}\}/gi, previewClient.cidade || '').replace(/\{\{uf\}\}/gi, previewClient.uf || '')
    : subject
  const previewMsg = previewClient
    ? message.replace(/\{\{nome\}\}/gi, previewClient.nome || '').replace(/\{\{cidade\}\}/gi, previewClient.cidade || '').replace(/\{\{uf\}\}/gi, previewClient.uf || '')
    : message

  const ss = status.sendState

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {modal}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Mail size={22} className="text-sky-400" />
          E-mail em Massa
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">Envio de e-mails automáticos para clientes via SMTP</p>
      </div>

      {/* ── Card de Configuração SMTP ── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-200 flex items-center gap-2">
            {isConnected
              ? <><Wifi size={16} className="text-green-400" /> Conectado</>
              : isConfiguring
                ? <><Loader2 size={16} className="animate-spin text-yellow-400" /> Testando conexão...</>
                : hasError
                  ? <><WifiOff size={16} className="text-red-400" /> Erro de conexão</>
                  : <><Settings size={16} className="text-zinc-400" /> Configurar SMTP</>
            }
          </h2>
          {isConnected && (
            <button className="btn-danger btn-sm" onClick={handleDisconnect}>Desconectar</button>
          )}
        </div>

        {isConnected ? (
          <p className="text-sm text-zinc-400">
            Enviando como: <span className="text-green-400 font-medium">{status.user}</span>
          </p>
        ) : (
          <form onSubmit={handleConfigure} className="space-y-3">
            {/* Preset */}
            <div>
              <label className="label">Provedor</label>
              <select
                className="select"
                value={preset}
                onChange={e => applyPreset(e.target.value)}
              >
                {PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
              </select>
            </div>

            {/* Gmail hint */}
            {preset === 'Gmail' && (
              <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-800/30 rounded-lg p-3">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>
                  Gmail requer uma <strong>Senha de Aplicativo</strong> (não sua senha normal).<br />
                  Acesse: Conta Google → Segurança → Verificação em 2 etapas → Senhas de app.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Servidor SMTP (host)</label>
                <input
                  className="input"
                  placeholder="smtp.gmail.com"
                  value={smtpForm.host}
                  onChange={e => setSmtpForm(f => ({ ...f, host: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Porta</label>
                <input
                  className="input"
                  type="number"
                  placeholder="587"
                  value={smtpForm.port}
                  onChange={e => setSmtpForm(f => ({ ...f, port: e.target.value }))}
                  required
                />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={smtpForm.secure}
                    onChange={e => setSmtpForm(f => ({ ...f, secure: e.target.checked }))}
                    className="accent-sky-500"
                  />
                  <span className="text-sm text-zinc-300">SSL (porta 465)</span>
                </label>
              </div>
              <div className="col-span-2">
                <label className="label">Seu e-mail</label>
                <input
                  className="input"
                  type="email"
                  placeholder="voce@empresa.com"
                  value={smtpForm.user}
                  onChange={e => setSmtpForm(f => ({ ...f, user: e.target.value }))}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="label">Senha / Senha de App</label>
                <div className="relative">
                  <input
                    className="input pr-16"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••••••••••"
                    value={smtpForm.pass}
                    onChange={e => setSmtpForm(f => ({ ...f, pass: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
                    onClick={() => setShowPass(v => !v)}
                  >
                    {showPass ? 'ocultar' : 'mostrar'}
                  </button>
                </div>
              </div>
            </div>

            {hasError && status.error && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg p-3">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                {status.error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={configuring}
            >
              {configuring
                ? <><Loader2 size={14} className="animate-spin" /> Testando conexão...</>
                : <><Wifi size={14} /> Conectar e testar</>
              }
            </button>
          </form>
        )}
      </div>

      {/* ── Card de Filtros e Preview ── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-zinc-200">1. Selecionar destinatários</h2>
        <p className="text-xs text-zinc-500 -mt-2">Apenas clientes com e-mail cadastrado serão incluídos.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <select
              className="select"
              value={filters.status_id}
              onChange={e => setFilters(f => ({ ...f, status_id: e.target.value }))}
            >
              <option value="">Todos os status</option>
              {statuses.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Estados (UF)</label>
            <UFMultiSelect
              selected={filters.ufs}
              onChange={ufs => setFilters(f => ({ ...f, ufs }))}
            />
          </div>
        </div>

        <button
          className="btn-secondary flex items-center gap-2"
          onClick={handlePreview}
          disabled={loadingPreview}
        >
          {loadingPreview
            ? <><Loader2 size={14} className="animate-spin" /> Buscando...</>
            : <><Users size={14} /> Ver destinatários</>
          }
        </button>

        {preview && (
          <div className="bg-zinc-800/60 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-zinc-200">
              {preview.total === 0
                ? preview.noEmail > 0
                  ? <span className="text-amber-400">Nenhum cliente com e-mail cadastrado.<span className="font-normal text-zinc-400"> {preview.noEmail} cliente{preview.noEmail !== 1 ? 's' : ''} encontrado{preview.noEmail !== 1 ? 's' : ''} nesse filtro, mas sem e-mail.</span></span>
                  : 'Nenhum cliente encontrado para esses filtros.'
                : <><span className="text-sky-400 font-bold">{preview.total}</span> clientes receberão o e-mail:</>
              }
            </p>
            {preview.total > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {preview.clients.slice(0, 50).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{c.nome}</span>
                    <span className="text-zinc-600">{c.email}</span>
                  </div>
                ))}
                {preview.total > 50 && (
                  <p className="text-xs text-zinc-600">...e mais {preview.total - 50} clientes</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Card de Mensagem ── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-zinc-200">2. Compor e-mail</h2>

        <div>
          <label className="label">Assunto</label>
          <input
            className="input"
            placeholder="Assunto do e-mail..."
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Corpo da mensagem</label>
          <textarea
            className="input resize-none font-mono text-sm"
            rows={8}
            placeholder="Corpo do e-mail..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <p className="text-xs text-zinc-600 mt-1">
            Variáveis: <code className="text-sky-400">{'{{nome}}'}</code>, <code className="text-sky-400">{'{{cidade}}'}</code>, <code className="text-sky-400">{'{{uf}}'}</code>
            {' '}— funciona no assunto e no corpo.
          </p>
        </div>

        <div>
          <label className="label">Intervalo entre envios (segundos)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={2} max={30} step={1}
              value={delayMs / 1000}
              onChange={e => setDelayMs(parseInt(e.target.value) * 1000)}
              className="flex-1 accent-sky-500"
            />
            <span className="text-zinc-300 font-medium w-12 text-right">{delayMs / 1000}s</span>
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Mínimo recomendado: 3s. Evita bloqueio por rate limit do servidor de e-mail.
          </p>
        </div>
      </div>

      {/* ── Card de Teste ── */}
      <div className="card space-y-3">
        <div>
          <h2 className="font-semibold text-zinc-200">3. Enviar e-mail de teste</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Envia o e-mail com dados fictícios (nome: <span className="text-zinc-400">Teste</span>, cidade: <span className="text-zinc-400">São Paulo - SP</span>) para conferir como vai chegar.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="email"
            placeholder="destinatario@teste.com"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendTest()}
          />
          <button
            className="btn-secondary flex items-center gap-2 shrink-0"
            onClick={handleSendTest}
            disabled={!isConnected || sendingTest || !subject.trim() || !message.trim()}
          >
            {sendingTest
              ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
              : <><Send size={14} /> Testar</>
            }
          </button>
        </div>

        {!isConnected && (
          <p className="text-xs text-zinc-600">Configure o SMTP acima para habilitar o teste.</p>
        )}
      </div>

      {/* ── Card de Preview ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-200">4. Preview do e-mail</h2>
          {previewClient && (
            <span className="text-xs text-zinc-500">exemplo: {previewClient.nome}</span>
          )}
        </div>

        {!previewClient ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500 bg-zinc-800/50 rounded-lg p-3">
            <AlertTriangle size={14} className="text-zinc-600 shrink-0" />
            Clique em <strong className="text-zinc-400">Ver destinatários</strong> acima para visualizar o e-mail com dados reais de um cliente.
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden text-sm">
            {/* Cabeçalho simulado */}
            <div className="px-4 py-3 bg-zinc-800 border-b border-zinc-700 space-y-1.5">
              <div className="flex gap-2 text-xs">
                <span className="text-zinc-500 w-12 shrink-0">De:</span>
                <span className="text-zinc-300">{status.user || 'seu@email.com'}</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="text-zinc-500 w-12 shrink-0">Para:</span>
                <span className="text-zinc-300">{previewClient.email}</span>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="text-zinc-500 w-12 shrink-0">Assunto:</span>
                <span className="text-zinc-100 font-semibold">{previewSubject || <em className="text-zinc-600">(sem assunto)</em>}</span>
              </div>
            </div>
            {/* Corpo */}
            <div className="px-4 py-4 text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {previewMsg || <span className="text-zinc-600 italic">(sem corpo)</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── Enviar ── */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-zinc-200">5. Enviar</h2>

        {!isConnected && (
          <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3">
            <AlertTriangle size={15} className="shrink-0" />
            Configure e conecte seu e-mail SMTP antes de enviar.
          </div>
        )}

        {/* Enviando em background */}
        {status.sendState?.status === 'sending' && (
          <div className="space-y-2 bg-sky-900/20 border border-sky-800/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-sky-400">
              <Loader2 size={14} className="animate-spin shrink-0" />
              Enviando em background... {status.sendState.sent + status.sendState.failed}/{status.sendState.total}
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-1.5">
              <div
                className="bg-sky-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(((status.sendState.sent + status.sendState.failed) / status.sendState.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock size={12} />
          Tempo estimado: ~{preview?.total ? Math.round((preview.total * delayMs) / 60000) : 0} minutos para {preview?.total || 0} contatos
        </div>

        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={handleSend}
          disabled={!isConnected || sending || !preview?.total || !subject.trim() || !message.trim()}
        >
          {sending
            ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
            : <><Send size={15} /> Enviar para {preview?.total || 0} clientes</>
          }
        </button>

        <p className="text-xs text-zinc-600 text-center">
          ⚠️ O envio ocorre em background. Não feche o servidor durante o processo.
        </p>
      </div>
    </div>
  )
}
