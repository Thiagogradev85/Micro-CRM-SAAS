import nodemailer from 'nodemailer'

function friendlySmtpError(err) {
  const msg = err.message || ''
  if (msg.includes('Daily user sending limit') || msg.includes('5.4.5'))
    return 'Limite diário de envios do Gmail atingido (500/dia). Aguarde até meia-noite para enviar novamente.'
  if (msg.includes('Invalid login') || msg.includes('Username and Password') || msg.includes('5.7.8'))
    return 'Usuário ou senha incorretos. Para Gmail, use uma Senha de Aplicativo (não sua senha normal).'
  if (msg.includes('5.7.0') || msg.includes('authentication') || msg.includes('EAUTH'))
    return 'Falha de autenticação SMTP. Verifique o e-mail e a senha de aplicativo.'
  if (msg.includes('ECONNREFUSED'))
    return 'Conexão recusada. Verifique o host e a porta SMTP.'
  if (msg.includes('ETIMEDOUT') || msg.includes('timeout'))
    return 'Tempo de conexão esgotado. Verifique o host SMTP e sua conexão com a internet.'
  if (msg.includes('self signed') || msg.includes('certificate'))
    return 'Erro de certificado SSL. Tente desmarcar a opção SSL ou contate o suporte.'
  if (msg.includes('Recipient address rejected') || msg.includes('5.1.1'))
    return 'Endereço de e-mail do destinatário inválido ou inexistente.'
  if (msg.includes('Message rejected') || msg.includes('blocked'))
    return 'Mensagem bloqueada pelo servidor do destinatário (spam ou política do domínio).'
  return err.message
}

class EmailService {
  constructor() {
    this.transporter = null
    this.config = null       // { host, port, secure, user, pass }
    this.status = 'unconfigured' // 'unconfigured' | 'connecting' | 'connected' | 'error'
    this.errorMsg = null
    this.sendState = null    // null | { status: 'sending'|'done', total, sent, failed, errors, finishedAt }
  }

  getStatus() {
    return {
      status: this.status,
      user: this.config?.user || null,
      error: this.errorMsg || null,
      sendState: this.sendState,
    }
  }

  // Configura e testa a conexão SMTP
  async configure({ host, port, secure, user, pass }) {
    this.status = 'connecting'
    this.errorMsg = null

    const transport = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: Boolean(secure), // true = 465, false = 587/25
      auth: { user, pass },
      tls: { rejectUnauthorized: false }, // aceita certs self-signed corporativos
    })

    try {
      await transport.verify()
      this.transporter = transport
      this.config = { host, port, secure, user, pass }
      this.status = 'connected'
      console.log(`[Email] Conectado como ${user}`)
    } catch (err) {
      this.transporter = null
      this.config = null
      this.status = 'error'
      this.errorMsg = err.message
      console.error('[Email] Erro ao conectar SMTP:', err.message)
      throw new Error(friendlySmtpError(err))
    }
  }

  disconnect() {
    if (this.transporter) {
      this.transporter.close()
      this.transporter = null
    }
    this.config = null
    this.status = 'unconfigured'
    this.errorMsg = null
    console.log('[Email] Desconectado.')
  }

  // Envia um único e-mail
  // attachments = [{ filename, content (Buffer), contentType }] — compatível com nodemailer
  async sendMail({ to, subject, html, text, attachments = [] }) {
    if (this.status !== 'connected') throw new Error('E-mail não está configurado/conectado.')

    try {
      await this.transporter.sendMail({
        from: `"CRM Automático" <${this.config.user}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
        attachments,
      })
    } catch (err) {
      throw new Error(friendlySmtpError(err))
    }
  }

  // Envia em lote com delay entre envios
  // attachments gerado uma vez e reutilizado em todos os envios do lote
  async sendBulk({ clients, subject, message, delayMs = 5000, attachments = [], onProgress, onSent }) {
    if (this.status !== 'connected') throw new Error('E-mail não está configurado/conectado.')

    this.sendState = { status: 'sending', total: clients.length, sent: 0, failed: 0, errors: [], finishedAt: null }

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i]
      try {
        const resolvedSubject = subject
          .replace(/\{\{nome\}\}/gi, client.nome || '')
          .replace(/\{\{cidade\}\}/gi, client.cidade || '')
          .replace(/\{\{uf\}\}/gi, client.uf || '')

        const resolvedHtml = message
          .replace(/\{\{nome\}\}/gi, client.nome || '')
          .replace(/\{\{cidade\}\}/gi, client.cidade || '')
          .replace(/\{\{uf\}\}/gi, client.uf || '')

        await this.sendMail({ to: client.email, subject: resolvedSubject, html: resolvedHtml, attachments })
        this.sendState.sent++
        console.log(`[Email] Enviado para ${client.nome} (${client.email})`)
        if (onSent) await onSent(client)
      } catch (err) {
        this.sendState.failed++
        this.sendState.errors.push({ nome: client.nome, email: client.email, error: friendlySmtpError(err) })
        console.error(`[Email] Erro ao enviar para ${client.nome}:`, err.message)
      }

      if (onProgress) onProgress({ current: i + 1, total: clients.length, results: this.sendState })

      if (i < clients.length - 1) {
        await new Promise(r => setTimeout(r, delayMs))
      }
    }

    this.sendState.status = 'done'
    this.sendState.finishedAt = new Date().toISOString()
    console.log('[Email] Envio concluído:', this.sendState)
    return this.sendState
  }
}

// Singleton
export const emailService = new EmailService()
