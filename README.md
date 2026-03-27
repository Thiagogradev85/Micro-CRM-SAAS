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
SERPER_API_KEY=sua-chave-aqui
PORT=8000
NODE_ENV=development
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL (Neon.tech) |
| `ANTHROPIC_API_KEY` | ✅ | Chave Claude API — importação de catálogo PDF |
| `SERPER_API_KEY` | ✅ | Chave Serper API — módulo de Prospecção de Clientes |
| `PORT` | — | Porta do servidor (padrão: `8000`) |

> **Obter chaves:**
> - Anthropic: [console.anthropic.com](https://console.anthropic.com)
> - Serper: [serper.dev](https://serper.dev) — plano gratuito inclui **2.500 buscas/mês**

---

## Módulo de Prospecção de Clientes

O módulo de prospecção busca empresas no **Google Maps via Serper API** e filtra automaticamente clientes já cadastrados no banco.

### Como usar

1. Acesse **Prospecção** no menu lateral (ícone 🔭)
2. Preencha:
   - **Segmento** — tipo de negócio (ex: `farmácia`, `mercado`, `clínica`)
   - **Estado** — UF opcional para refinar a busca
   - **Cidade** — cidade opcional
3. Clique em **Buscar prospects**
4. O sistema retorna:
   - ✅ **Novos** — empresas não cadastradas (selecionáveis)
   - ⚪ **Já existem** — empresas que já estão na base (bloqueadas)
5. Selecione os desejados e clique em **Salvar selecionados**

### Limite do plano gratuito Serper

O plano **free** oferece **2.500 buscas/mês**, com renovação automática no início de cada mês.
Ao atingir o limite, um modal avisará o usuário com opção de assinar um plano pago em [serper.dev](https://serper.dev).

### Configurar a chave Serper

```bash
# 1. Acesse https://serper.dev e crie uma conta gratuita
# 2. Copie sua API Key no dashboard
# 3. Adicione ao server/.env:
SERPER_API_KEY=sua-chave-aqui
```

---

## Deploy — Render

| Serviço        | Root Dir | Build           | Start       |
|----------------|----------|-----------------|-------------|
| API (Web)      | `server` | `npm ci`        | `npm start` |
| App (Static)   | `client` | `npm ci && npm run build` | — |

Variáveis necessárias no Render: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SERPER_API_KEY`, `NODE_ENV=production`.

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
