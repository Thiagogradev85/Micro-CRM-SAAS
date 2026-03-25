import { useState, useCallback } from 'react'
import { AppModalError } from '../components/AppModalError.jsx'

/**
 * Hook de tratamento de erros e feedback do sistema.
 * Responsabilidade: gerenciar o estado e renderização de modais
 * de erro, sucesso, aviso e info em qualquer página.
 *
 * Uso:
 *   const { modal, showModal } = useAppModalError()
 *
 *   showModal({ type: 'error',   title: 'Erro',    message: 'Algo deu errado.', details: ['item1'] })
 *   showModal({ type: 'success', title: 'Pronto!', message: 'Operação concluída.' })
 *   showModal({ type: 'warning', title: 'Atenção', message: 'Campo obrigatório.' })
 *   showModal({ type: 'info',    title: 'Info',    message: 'Processando...' })
 *
 *   // No JSX da página:
 *   return <div> {modal} ... </div>
 */
export function useAppModalError() {
  const [state, setState] = useState(null) // null = fechado

  const showModal = useCallback(({ type = 'info', title, message, details = [] }) => {
    setState({ type, title, message, details })
  }, [])

  const closeModal = useCallback(() => setState(null), [])

  const modal = state
    ? <AppModalError {...state} onClose={closeModal} />
    : null

  return { modal, showModal, closeModal }
}
