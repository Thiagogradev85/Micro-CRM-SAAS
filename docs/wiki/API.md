# API — Endpoints

Base URL local: `http://localhost:8000`

## Health
```
GET /health   → { status: "ok", ts }
```

## Status
```
GET    /status
POST   /status          { nome, cor, ordem }
PUT    /status/:id
DELETE /status/:id
```

## Sellers
```
GET    /sellers
GET    /sellers/:id
POST   /sellers         { nome, whatsapp, ufs: ["SP","RJ"] }
PUT    /sellers/:id
DELETE /sellers/:id
```

## Clients
```
GET    /clients         ?search= &status_id= &uf= &ativo= &page= &limit= &sort=
GET    /clients/:id
POST   /clients
PUT    /clients/:id
DELETE /clients/:id     → soft delete (inativa). ?permanent=true para excluir.

POST   /clients/:id/purchase             → registra compra no relatório diário
POST   /clients/import                   → multipart/form-data, campo "file" (.xlsx)
GET    /clients/export?format=xlsx|pdf   → exporta com os mesmos filtros da listagem

GET    /clients/:id/observations
POST   /clients/:id/observations         { texto }
DELETE /clients/:id/observations/:obsId
```

## Catalogs
```
GET    /catalogs
GET    /catalogs/:id                         → inclui array products[]
POST   /catalogs
PUT    /catalogs/:id
DELETE /catalogs/:id

GET    /catalogs/:id/products
POST   /catalogs/:id/products                → cria produto novo e vincula
GET    /catalogs/:id/products/:prodId
PUT    /catalogs/:id/products/:prodId
PATCH  /catalogs/:id/products/:prodId/stock  { estoque }
DELETE /catalogs/:id/products/:prodId

GET    /catalogs/:id/pdf                     → download PDF do catálogo
POST   /catalogs/:id/import-pdf              → multipart "file" (.pdf) — leitura por IA
```

## Products (global)
```
GET    /products
POST   /products
PUT    /products/:id
DELETE /products/:id
```

## Daily Report
```
GET /daily-report/summary?date=YYYY-MM-DD
GET /daily-report/details?date=YYYY-MM-DD
GET /daily-report/dates
GET /daily-report/pdf?date=YYYY-MM-DD        → download PDF
```

## WhatsApp
```
GET  /whatsapp/status
POST /whatsapp/connect
POST /whatsapp/disconnect
GET  /whatsapp/preview?status_id=&ufs=       → clientes que receberão a msg
POST /whatsapp/send-bulk                     { status_id, ufs, message, delay_ms }
```

## E-mail
```
GET  /email/status
POST /email/configure    { host, port, secure, user, pass }
POST /email/disconnect
GET  /email/preview?status_id=&ufs=          → clientes com e-mail válido
POST /email/send-test    { to, subject, message }
POST /email/send-bulk    { status_id, ufs, subject, message, delay_ms }
```

## Respostas de erro

Todos os erros seguem o formato:
```json
{ "error": "mensagem legível" }
```

| Status | Quando |
|--------|--------|
| 400 | Validação falhou |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex: cliente duplicado) |
| 422 | Arquivo inválido (PDF sem texto) |
| 500 | Erro interno inesperado |
