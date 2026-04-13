import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const MUTED_KEY = 'presence_muted' // localStorage key

function loadMuted() {
  try { return new Set(JSON.parse(localStorage.getItem(MUTED_KEY) ?? '[]')) }
  catch { return new Set() }
}

function saveMuted(set) {
  localStorage.setItem(MUTED_KEY, JSON.stringify([...set]))
}

/**
 * Gerencia conexão de presença via Socket.io.
 * Só ativo quando o usuário está autenticado.
 *
 * @param {object|null} user  — usuário logado
 * @returns {{
 *   onlineUserIds: string[],
 *   presenceToast: { userId, nome } | null,
 *   clearToast: fn,
 *   mutedUsers: Set<string>,
 *   toggleMute: (userId: string) => void,
 * }}
 */
export function usePresence(user) {
  const socketRef                         = useRef(null)
  const [onlineUserIds, setOnlineUserIds] = useState([])
  const [presenceToast, setPresenceToast] = useState(null)
  const [mutedUsers, setMutedUsers]       = useState(loadMuted)

  function toggleMute(userId) {
    setMutedUsers(prev => {
      const next = new Set(prev)
      if (next.has(String(userId))) next.delete(String(userId))
      else next.add(String(userId))
      saveMuted(next)
      return next
    })
  }

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setOnlineUserIds([])
      return
    }

    const socket = io(window.location.origin, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    // Admin recebe lista inicial de quem já está online
    socket.on('online-users', (ids) => {
      setOnlineUserIds(ids.map(String))
    })

    // Usuário entrou
    socket.on('user-online', ({ userId, nome }) => {
      setOnlineUserIds(prev => [...new Set([...prev, String(userId)])])

      // Notifica só admin e só se não estiver silenciado
      if (user.role === 'admin' && !mutedUsers.has(String(userId))) {
        setPresenceToast({ userId: String(userId), nome })
      }
    })

    // Usuário saiu
    socket.on('user-offline', ({ userId }) => {
      setOnlineUserIds(prev => prev.filter(id => id !== String(userId)))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return {
    onlineUserIds,
    presenceToast,
    clearToast: () => setPresenceToast(null),
    mutedUsers,
    toggleMute,
  }
}
