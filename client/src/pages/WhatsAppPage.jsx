import { useState, useEffect, useCallback } from 'react'
import {
  MessageCircle, Wifi, WifiOff, RefreshCw, Send, Users,
  CheckCircle, Clock, AlertTriangle, Loader2, ChevronDown, X
} from 'lucide-react'
import { api } from '../utils/api.js'
import { Toast } from '../components/Toast.jsx'
import { UFS } from '../utils/constants.js'

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

const POLL_INTERVAL = 3000 // ms — polling para status/QR

export function WhatsAppPage() {
  const [status, setStatus]       = useState({ status: 'disconnected', phone: null, qrCode: null })
  const [statuses, setStatuses]   = useState([])
  const [filters, setFilters]     = useState({ status_id: '', ufs: [] })
  const [preview, setPreview]     = useState(null)   // { total, clients }
  const [message, setMessage]     = useState('')
  const [delayMs, setDelayMs]     = useState(6000)
  const [sending, setSending]     = useState(false)
  const [sendResult, setSendResult] = useState(null) // { message, total }
  const [toast, setToast]         = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const showToast = (message, type = 'success') => setToast({ message, type })

  // Polling de status/QR
  const pollStatus = useCallback(async () => {
    try {
      const s = await api.whatsappStatus()
      setStatus(s)
    } catch { /* backend pode estar offline */ }
  }, [])

  useEffect(() => {
    pollStatus()
    api.listStatuses().then(setStatuses).catch(() => {})
    const interval = setInterval(pollStatus, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [pollStatus])

  async function handleConnect() {
    try {
      await api.whatsappConnect()
      showToast('Iniciando conexão... aguarde o QR Code aparecer.')
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleDisconnect() {
    try {
      await api.whatsappDisconnect()
      setPreview(null)
      setSendResult(null)
      showToast('WhatsApp desconectado.')
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handlePreview() {
    setLoadingPreview(true)
    try {
      const params = {}
      if (filters.status_id) params.status_id = filters.status_id
      if (filters.ufs.length > 0) params.ufs = filters.ufs.join(',')
      const result = await api.whatsappPreview(params)
      setPreview(result)
      setSendResult(null)
    } catch (err) { showToast(err.message, 'error') }
    finally { setLoadingPreview(false) }
  }

  async function handleSend() {
    if (!message.trim()) return showToast('Digite a mensagem antes de enviar.', 'error')
    if (!preview || preview.total === 0) return showToast('Faça o preview antes de enviar.', 'error')
    if (!confirm(`Enviar mensagem para ${preview.total} clientes?\n\nEssa ação não pode ser desfeita.`)) return

    setSending(true)
    setSendResult(null)
    try {
      const params = {}
      if (filters.status_id) params.status_id = filters.status_id
      if (filters.ufs.length > 0) params.ufs = filters.ufs.join(',')
      const result = await api.whatsappSendBulk({ ...params, message, delay_ms: delayMs })
      setSendResult(result)
      showToast(result.message)
    } catch (err) { showToast(err.message, 'error') }
    finally { setSending(false) }
  }

  const isConnected = status.status === 'connected'
  const isConnecting = status.status === 'connecting'

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <MessageCircle size={22} className="text-green-400" />
            CRM Automático
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Envio de mensagens em massa via WhatsApp</p>
        </div>
        <button className="btn-ghost btn-sm" onClick={pollStatus}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Card de Conexão ── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-200 flex items-center gap-2">
            {isConnected
              ? <><Wifi size={16} className="text-green-400" /> Conectado</>
              : isConnecting
                ? <><Loader2 size={16} className="animate-spin text-yellow-400" /> Conectando...</>
                : <><WifiOff size={16} className="text-zinc-500" /> Desconectado</>
            }
          </h2>
          <div className="flex gap-2">
            {isConnected
              ? <button className="btn-danger btn-sm" onClick={handleDisconnect}>Desconectar</button>
              : <button className="btn-primary btn-sm" onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? 'Aguardando QR...' : 'Conectar WhatsApp'}
                </button>
            }
          </div>
        </div>

        {isConnected && status.phone && (
          <p className="text-sm text-zinc-400">
            Conectado como: <span className="text-green-400 font-medium">+{status.phone}</span>
          </p>
        )}

        {/* QR Code */}
        {status.qrCode && !isConnected && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-zinc-400 text-center">
              Abra o WhatsApp no celular → <strong>Configurações → Aparelhos conectados → Conectar um aparelho</strong><br />
              e escaneie o QR Code abaixo:
            </p>
            <img src={status.qrCode} alt="QR Code WhatsApp" className="w-52 h-52 bg-white p-2 rounded-xl" />
            <p className="text-xs text-zinc-600">O QR Code expira em ~60 segundos. Um novo será gerado automaticamente.</p>
          </div>
        )}

        {!isConnected && !isConnecting && !status.qrCode && (
          <div className="flex items-center gap-2 text-sm text-zinc-500 bg-zinc-800/50 rounded-lg p-3">
            <AlertTriangle size={15} className="text-yellow-500 shrink-0" />
            Clique em <strong className="text-zinc-300">Conectar WhatsApp</strong> para gerar o QR Code e autenticar seu número.
          </div>
        )}
      </div>

      {/* ── Card de Filtros e Preview ── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-zinc-200">1. Selecionar destinatários</h2>

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
                ? 'Nenhum cliente com WhatsApp encontrado para esses filtros.'
                : <><span className="text-green-400 font-bold">{preview.total}</span> clientes receberão a mensagem:</>
              }
            </p>
            {preview.total > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {preview.clients.slice(0, 50).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{c.nome}</span>
                    <span className="text-zinc-600">{c.whatsapp}</span>
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
        <h2 className="font-semibold text-zinc-200">2. Compor mensagem</h2>

        <div>
          <label className="label">Mensagem</label>
          <textarea
            className="input resize-none"
            rows={5}
            placeholder={"Olá {{nome}}, tudo bem?\n\nConheça nossas novidades em scooters e patinetes elétricos! 🛴⚡\n\nResponda essa mensagem para saber mais."}
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <p className="text-xs text-zinc-600 mt-1">
            Variáveis disponíveis: <code className="text-sky-400">{'{{nome}}'}</code>, <code className="text-sky-400">{'{{cidade}}'}</code>, <code className="text-sky-400">{'{{uf}}'}</code>
          </p>
        </div>

        {/* Preview da mensagem */}
        {message && preview?.clients?.[0] && (
          <div>
            <p className="text-xs text-zinc-500 mb-1">Preview para o primeiro contato:</p>
            <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-3 text-sm text-zinc-300 whitespace-pre-wrap">
              {message
                .replace(/\{\{nome\}\}/gi, preview.clients[0].nome || '')
                .replace(/\{\{cidade\}\}/gi, preview.clients[0].cidade || '')
                .replace(/\{\{uf\}\}/gi, preview.clients[0].uf || '')}
            </div>
          </div>
        )}

        <div>
          <label className="label">Intervalo entre mensagens (segundos)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={3} max={30} step={1}
              value={delayMs / 1000}
              onChange={e => setDelayMs(parseInt(e.target.value) * 1000)}
              className="flex-1 accent-sky-500"
            />
            <span className="text-zinc-300 font-medium w-12 text-right">{delayMs / 1000}s</span>
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Mínimo recomendado: 5s. Intervalos maiores reduzem risco de bloqueio pelo WhatsApp.
          </p>
        </div>
      </div>

      {/* ── Enviar ── */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-zinc-200">3. Enviar</h2>

        {!isConnected && (
          <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3">
            <AlertTriangle size={15} className="shrink-0" />
            Conecte o WhatsApp antes de enviar.
          </div>
        )}

        {sendResult && (
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 border border-green-800/30 rounded-lg p-3">
            <CheckCircle size={15} className="shrink-0" />
            {sendResult.message}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock size={12} />
          Tempo estimado: ~{preview?.total ? Math.round((preview.total * delayMs) / 60000) : 0} minutos para {preview?.total || 0} contatos
        </div>

        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={handleSend}
          disabled={!isConnected || sending || !preview?.total || !message.trim()}
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
