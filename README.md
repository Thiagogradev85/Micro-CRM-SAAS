# CRM Scooter & Patinetes Elétricos

CRM mobile-first para gerenciamento de clientes, catálogos, vendedores, envio em massa via WhatsApp/e-mail e relatório diário.

---

## Stack

| Camada   | Tecnologia                                        |
|----------|---------------------------------------------------|
| Frontend | React 18 + Vite + Tailwind CSS                    |
| Backend  | Node.js + Express                                 |
| Banco    | PostgreSQL — Neon.tech                            |
| IA       | Anthropic Claude (importação de catálogo por PDF) |
| Deploy   | Render (API + Static Site)                        |

---

## Rodar localmente

```bash
# Backend
cd server && npm install && npm run dev   # http://localhost:8000

# Frontend
cd client && npm install && npm run dev   # http://localhost:5173
```

### Variáveis de ambiente — `server/.env`

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
ANTHROPIC_API_KEY=sk-ant-...
PORT=8000
NODE_ENV=development
```

---

## Deploy — Render

| Serviço        | Root Dir | Build           | Start       |
|----------------|----------|-----------------|-------------|
| API (Web)      | `server` | `npm ci`        | `npm start` |
| App (Static)   | `client` | `npm ci && npm run build` | — |

Variáveis necessárias no Render: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NODE_ENV=production`.

---

## Documentação completa

Acesse o **[Wiki do repositório](https://github.com/Thiagogradev85/Leads-React-JS/wiki)** para:

- Arquitetura e estrutura de pastas
- Banco de dados — tabelas e eventos
- API — todos os endpoints
- Módulo WhatsApp (Baileys)
- Módulo E-mail (Nodemailer)
- Tratamento de erros (AppError + useAppModalError)
- Versioning e releases
