# Tratamento de Erros

## Backend — AppError

`server/src/utils/AppError.js` — classe para erros previsíveis (validação, not found, regra de negócio).

**Padrão em todos os controllers:**

```js
async get(req, res, next) {
  try {
    const data = await ClientModel.get(req.params.id)
    if (!data) throw new AppError('Cliente não encontrado', 404)
    res.json(data)
  } catch (err) {
    next(err)
  }
}
```

**Middleware global em `server/src/index.js`:**

```js
app.use((err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }
  console.error('[Erro inesperado]', err)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})
```

Erros inesperados (crash de DB, bug de código) → status 500, mensagem genérica, detalhes nos logs.

## Frontend — useAppModalError

`client/src/hooks/useAppModalError.jsx` — hook para exibir modais de feedback em qualquer página.

**Uso:**

```jsx
import { useAppModalError } from '../hooks/useAppModalError.js'

function MinhaPage() {
  const { modal, showModal } = useAppModalError()

  async function handleSalvar() {
    try {
      await api.salvar(dados)
      showModal({ type: 'success', title: 'Salvo', message: 'Dados atualizados.' })
    } catch (err) {
      showModal({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  return (
    <>
      {modal}
      {/* resto da página */}
    </>
  )
}
```

**Tipos disponíveis:** `success` · `error` · `warning` · `info`

> `useAppModal` e `AppModal` são re-exports de compatibilidade. Use sempre `useAppModalError` e `AppModalError` diretamente.
