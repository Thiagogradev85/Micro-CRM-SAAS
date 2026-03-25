import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = join(__dirname, '..', '..', '..', '..', '.whatsapp-session')

class WhatsAppService {
  constructor() {
    this.sock = null
    this.qrCodeBase64 = null
    this.status = 'disconnected' // 'disconnected' | 'connecting' | 'connected'
    this.phone = null
    this._listeners = {}
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(fn)
  }

  emit(event, data) {
    ;(this._listeners[event] || []).forEach(fn => fn(data))
  }

  async connect() {
    if (this.status === 'connected') return
    this.status = 'connecting'
    this.qrCodeBase64 = null

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version } = await fetchLatestBaileysVersion()

    this.sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, console),
      },
      printQRInTerminal: false,
      browser: ['CRM Scooter', 'Chrome', '1.0'],
    })

    this.sock.ev.on('creds.update', saveCreds)

    this.sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        this.qrCodeBase64 = await qrcode.toDataURL(qr)
        this.emit('qr', this.qrCodeBase64)
      }

      if (connection === 'open') {
        this.status = 'connected'
        this.qrCodeBase64 = null
        this.phone = this.sock.user?.id?.split(':')[0] || null
        console.log('[WhatsApp] Conectado como', this.phone)
        this.emit('connected', { phone: this.phone })
      }

      if (connection === 'close') {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode
        const shouldReconnect = code !== DisconnectReason.loggedOut
        console.log('[WhatsApp] Desconectado, código:', code, '— reconectar:', shouldReconnect)
        this.status = 'disconnected'
        this.phone = null
        this.emit('disconnected', { code })
        if (shouldReconnect) {
          setTimeout(() => this.connect(), 3000)
        }
      }
    })
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.logout().catch(() => {})
      this.sock = null
    }
    this.status = 'disconnected'
    this.phone = null
    this.qrCodeBase64 = null
    this.emit('disconnected', { code: 'manual' })
  }

  getStatus() {
    return {
      status: this.status,
      phone: this.phone,
      qrCode: this.qrCodeBase64,
    }
  }

  // Envia uma mensagem para um número (formato: 5511999999999)
  async sendText(number, text) {
    if (this.status !== 'connected') throw new Error('WhatsApp não está conectado.')
    const jid = number.replace(/\D/g, '') + '@s.whatsapp.net'
    await this.sock.sendMessage(jid, { text })
  }

  // Envia em lote com delay entre mensagens
  async sendBulk({ clients, message, delayMs = 5000, onProgress, onSent }) {
    if (this.status !== 'connected') throw new Error('WhatsApp não está conectado.')

    const results = { sent: 0, failed: 0, errors: [] }

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i]
      try {
        const text = message
          .replace(/\{\{nome\}\}/gi, client.nome || '')
          .replace(/\{\{cidade\}\}/gi, client.cidade || '')
          .replace(/\{\{uf\}\}/gi, client.uf || '')

        await this.sendText(client.whatsapp, text)
        results.sent++
        console.log(`[WhatsApp] Enviado para ${client.nome} (${client.whatsapp})`)
        if (onSent) await onSent(client)
      } catch (err) {
        results.failed++
        results.errors.push({ nome: client.nome, whatsapp: client.whatsapp, error: err.message })
        console.error(`[WhatsApp] Erro ao enviar para ${client.nome}:`, err.message)
      }

      if (onProgress) onProgress({ current: i + 1, total: clients.length, results })

      // Delay entre mensagens (exceto na última)
      if (i < clients.length - 1) {
        await new Promise(r => setTimeout(r, delayMs))
      }
    }

    return results
  }
}

// Singleton
export const whatsAppService = new WhatsAppService()
