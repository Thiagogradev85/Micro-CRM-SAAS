import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const STORAGE_KEY = 'overdue_reminder_last_shown'
const COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24h

// Verifica clientes sem contato há mais de N dias e controla exibição do modal.
// O modal é mostrado no máximo 1x a cada 24h (via localStorage).
// Clientes criados hoje ("Novos") são excluídos — regra aplicada no backend.
export function useOverdueReminder(days = 3) {
  const [overdueClients, setOverdueClients] = useState([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const lastShown = localStorage.getItem(STORAGE_KEY)
    if (lastShown && Date.now() - parseInt(lastShown) < COOLDOWN_MS) return

    api.getOverdueClients(days)
      .then(clients => {
        if (clients.length > 0) {
          setOverdueClients(clients)
          setShowModal(true)
          localStorage.setItem(STORAGE_KEY, String(Date.now()))
        }
      })
      .catch(() => {
        // Falha silenciosa — não bloqueia a página principal
      })
  }, [days])

  function dismiss() {
    setShowModal(false)
  }

  return { overdueClients, showModal, dismiss }
}
