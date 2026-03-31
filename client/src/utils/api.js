const BASE = import.meta.env.VITE_API_URL ?? '/api'

// Converte erros técnicos em mensagens amigáveis ao usuário
function friendlyError(status, raw) {
  if (!raw) return `Erro ${status}`

  const msg = typeof raw === 'string' ? raw : (raw.error || raw.message || JSON.stringify(raw))

  // Erros conhecidos da API Anthropic
  if (msg.includes('credit balance') || msg.includes('too low'))
    return 'Saldo insuficiente na conta Anthropic. Adicione créditos em console.anthropic.com.'
  if (msg.includes('invalid_api_key') || msg.includes('authentication'))
    return 'Chave da API inválida. Verifique o ANTHROPIC_API_KEY no servidor.'
  if (msg.includes('rate_limit') || status === 429)
    return 'Limite de requisições atingido. Aguarde alguns instantes e tente novamente.'
  if (msg.includes('overloaded') || status === 529)
    return 'Serviço de IA temporariamente sobrecarregado. Tente novamente em breve.'

  // Erros de rede / servidor
  if (status === 404) return 'Recurso não encontrado.'
  if (status === 409) return msg.length < 300 ? msg : 'Conflito: registro já existe.'
  if (status === 400) return msg.length < 200 ? msg : 'Dados inválidos na requisição.'
  if (status === 422) return msg.length < 300 ? msg : 'Não foi possível processar o arquivo enviado.'
  if (status === 500) return msg && msg.length < 300 ? msg : 'Erro interno do servidor. Verifique os logs.'
  if (status === 0)   return 'Sem conexão com o servidor. Verifique se o backend está rodando.'

  return msg.length < 200 ? msg : `Erro ${status}`
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body && !(body instanceof FormData)) {
    opts.body = JSON.stringify(body)
  } else if (body instanceof FormData) {
    delete opts.headers['Content-Type']
    opts.body = body
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, opts)
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique se o backend está rodando.')
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    throw new Error(friendlyError(res.status, payload))
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Statuses ──────────────────────────────────────
export const api = {
  // Statuses
  listStatuses:   ()       => request('GET',    '/status'),
  createStatus:   (data)   => request('POST',   '/status', data),
  updateStatus:   (id, d)  => request('PUT',    `/status/${id}`, d),
  deleteStatus:   (id)     => request('DELETE', `/status/${id}`),

  // Sellers
  listSellers:    ()       => request('GET',    '/sellers'),
  getSeller:      (id)     => request('GET',    `/sellers/${id}`),
  createSeller:   (data)   => request('POST',   '/sellers', data),
  updateSeller:   (id, d)  => request('PUT',    `/sellers/${id}`, d),
  deleteSeller:   (id)     => request('DELETE', `/sellers/${id}`),

  // Clients
  listClients:    (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request('GET', `/clients${qs}`)
  },
  getClient:      (id)     => request('GET',    `/clients/${id}`),
  createClient:   (data)   => request('POST',   '/clients', data),
  updateClient:   (id, d)  => request('PUT',    `/clients/${id}`, d),
  deleteClient:   (id, permanent = false) => request('DELETE', `/clients/${id}${permanent ? '?permanent=true' : ''}`),
  registerPurchase:(id)    => request('POST',   `/clients/${id}/purchase`),
  getOverdueClients: (days = 3) => request('GET', `/clients/overdue?days=${days}`),
  findDuplicates:    ()         => request('GET', '/clients/duplicates'),
  exportClients: (params, format) => {
    const qs = new URLSearchParams({ ...params, format }).toString()
    window.open(`${BASE}/clients/export?${qs}`, '_blank')
  },
  importClients: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    // Vite proxy strips multipart body — call backend directly in dev
    const url = import.meta.env.DEV
      ? 'http://localhost:8000/clients/import'
      : `${BASE}/clients/import`
    return fetch(url, { method: 'POST', body: fd }).then(async res => {
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(friendlyError(res.status, payload))
      }
      return res.json()
    })
  },

  // Observações
  listObservations: (id)   => request('GET',    `/clients/${id}/observations`),
  addObservation:   (id,t) => request('POST',   `/clients/${id}/observations`, { texto: t }),
  deleteObservation:(id,obsId) => request('DELETE', `/clients/${id}/observations/${obsId}`),

  // Catalogs
  importCatalogPdf: (catalogId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return request('POST', `/catalogs/${catalogId}/import-pdf`, fd)
  },
  listCatalogs:   ()       => request('GET',    '/catalogs'),
  getCatalog:     (id)     => request('GET',    `/catalogs/${id}`),
  createCatalog:  (data)   => request('POST',   '/catalogs', data),
  updateCatalog:  (id, d)  => request('PUT',    `/catalogs/${id}`, d),
  deleteCatalog:  (id)     => request('DELETE', `/catalogs/${id}`),

  // Products
  listProducts:   (catId)        => request('GET',   `/catalogs/${catId}/products`),
  getProduct:     (catId, pId)   => request('GET',   `/catalogs/${catId}/products/${pId}`),
  createProduct:  (catId, data)  => request('POST',  `/catalogs/${catId}/products`, data),
  updateProduct:  (catId, pId, d)=> request('PUT',   `/catalogs/${catId}/products/${pId}`, d),
  updateStock:    (catId, pId, s)=> request('PATCH', `/catalogs/${catId}/products/${pId}/stock`, { estoque: s }),
  deleteProduct:  (catId, pId)   => request('DELETE',`/catalogs/${catId}/products/${pId}`),

  // Global Products
  listAllProducts:     ()         => request('GET',    '/products'),
  createProductGlobal: (data)     => request('POST',   '/products', data),
  updateProductGlobal: (id, d)    => request('PUT',    `/products/${id}`, d),
  deleteProductGlobal: (id)       => request('DELETE', `/products/${id}`),

  // Catalog-product linking
  linkProductToCatalog:    (catId, productId) => request('POST',   `/catalogs/${catId}/products/link`, { product_id: productId }),
  unlinkProductFromCatalog:(catId, prodId)    => request('DELETE', `/catalogs/${catId}/products/${prodId}/unlink`),
  downloadCatalogPdf:      (catId)            => { window.open(`${BASE}/catalogs/${catId}/pdf`, '_blank') },

  // WhatsApp / CRM Automático
  whatsappStatus:   ()                => request('GET',  '/whatsapp/status'),
  whatsappConnect:  ()                => request('POST', '/whatsapp/connect'),
  whatsappDisconnect:    ()           => request('POST', '/whatsapp/disconnect'),
  whatsappClearSession:  ()           => request('POST', '/whatsapp/clear-session'),
  whatsappPreview:  (params)          => request('GET',  '/whatsapp/preview?' + new URLSearchParams(params).toString()),
  whatsappSendBulk: (data)            => request('POST', '/whatsapp/send-bulk', data),

  // E-mail em Massa
  emailStatus:      ()       => request('GET',  '/email/status'),
  emailConfigure:   (data)   => request('POST', '/email/configure', data),
  emailDisconnect:  ()       => request('POST', '/email/disconnect'),
  emailPreview:     (params) => request('GET',  '/email/preview?' + new URLSearchParams(params).toString()),
  emailSendTest:    (data)   => request('POST', '/email/send-test', data),
  emailSendBulk:    (data)   => request('POST', '/email/send-bulk', data),

  // Prospecting
  searchProspects: (data)      => request('POST', '/prospecting/search', data),
  saveProspects:   (prospects) => request('POST', '/prospecting/save', { prospects }),

  // Daily Report
  getReportSummary: (date) => request('GET', `/daily-report/summary?date=${date}`),
  getReportDetails: (date) => request('GET', `/daily-report/details?date=${date}`),
  listReportDates:  ()     => request('GET', '/daily-report/dates'),
  downloadReportPdf:(date) => {
    const url = `${BASE}/daily-report/pdf?date=${date}`
    window.open(url, '_blank')
  },
  deleteReportEvent: (id) => request('DELETE', `/daily-report/events/${id}`),
}
