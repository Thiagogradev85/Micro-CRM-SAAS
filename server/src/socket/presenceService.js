import { verifyToken } from '../utils/auth.js'

// userId (string) → { nome, role }
// socketId não é armazenado — usamos rooms do socket.io para broadcasts
const onlineUsers = new Map()

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader.split(';')
      .map(c => c.trim())
      .filter(Boolean)
      .map(c => {
        const idx = c.indexOf('=')
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))]
      })
  )
}

export function setupPresence(io) {
  // ── Auth middleware ───────────────────────────────────
  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie)
      const token = cookies.token
      if (!token) return next(new Error('Não autenticado'))
      socket.user = verifyToken(token)
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', (socket) => {
    const { id: userId, nome, role } = socket.user
    const uid = String(userId)

    // Admin entra na room "admins" — usada para broadcasts diretos
    if (role === 'admin') {
      socket.join('admins')
    }

    // Registra como online
    onlineUsers.set(uid, { nome, role })
    console.log(`[Presence] ${nome} (${role}) conectou. Online: ${onlineUsers.size}`)

    // Admin recebe lista atual ao conectar
    if (role === 'admin') {
      socket.emit('online-users', [...onlineUsers.keys()])
    }

    // Notifica todos os admins quando usuário (não-admin) entra
    if (role !== 'admin') {
      io.to('admins').emit('user-online', { userId: uid, nome })
    }

    socket.on('disconnect', (reason) => {
      onlineUsers.delete(uid)
      console.log(`[Presence] ${nome} desconectou (${reason}). Online: ${onlineUsers.size}`)

      if (role !== 'admin') {
        io.to('admins').emit('user-offline', { userId: uid })
      }
    })
  })
}

export function getOnlineUserIds() {
  return [...onlineUsers.keys()]
}
