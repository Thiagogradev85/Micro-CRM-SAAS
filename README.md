# CRM Scooter & Patinetes Elétricos

Sistema de controle de vendas mobile-first para gerenciamento de clientes, catálogos de produtos, vendedores e relatórios diários.

---

## Stack

| Camada    | Tecnologia                          |
|-----------|-------------------------------------|
| Runtime   | Bun                                 |
| Backend   | Express.js (Node/Bun)               |
| Banco     | PostgreSQL — Neon.tech              |
| Frontend  | React 18 + Vite + Tailwind CSS      |
| PDF       | PDFKit (servidor) + jsPDF (cliente) |
| IA        | Anthropic Claude (importação de PDF)|
| Deploy    | Render (API + Static Site)          |

---

## Estrutura do Projeto

```
leads_crm/
├── server/
│   ├── src/
│   │   ├── db/db.js                    # Pool de conexão Neon.tech (SSL, max 5 conexões)
│   │   ├── utils/AppError.js           # Classe de erro HTTP customizado
│   │   ├── models/
│   │   │   ├── StatusModel.js          # CRUD do pipeline de status
│   │   │   ├── SellerModel.js          # CRUD de vendedores + junction seller_ufs
│   │   │   ├── ClientModel.js          # CRUD avançado: filtros, paginação, soft delete,
│   │   │   │                           #   upsert em lote, observações, compras, auto-vendedor
│   │   │   ├── CatalogModel.js         # CRUD de catálogos com contagem de produtos
│   │   │   ├── ProductModel.js         # CRUD de produtos com limpeza de dados (cleanStr/cleanNum)
│   │   │   └── DailyReportModel.js     # Agregação de eventos diários de vendas
│   │   ├── controllers/
│   │   │   ├── StatusController.js
│   │   │   ├── SellerController.js
│   │   │   ├── ClientController.js     # Lista, CRUD, import Excel, export Excel/PDF,
│   │   │   │                           #   compras, observações
│   │   │   ├── CatalogController.js    # CRUD catálogo + produtos + import PDF via IA
│   │   │   └── DailyReportController.js
│   │   ├── routes/
│   │   │   ├── status.js
│   │   │   ├── sellers.js
│   │   │   ├── clients.js              # Multer para upload de arquivos em memória
│   │   │   ├── catalogs.js
│   │   │   └── dailyReport.js
│   │   ├── modules/                    # Passo 1 da refatoração: lógica de negócio isolada
│   │   │   ├── ai-import/
│   │   │   │   ├── importCatalogPdf.js # IA: envia PDF ao Claude (claude-sonnet-4-6),
│   │   │   │   │                       #   extrai specs de produtos como JSON
│   │   │   │   └── index.js            # export { importCatalogPdf }
│   │   │   ├── file-import/
│   │   │   │   ├── importExcel.js      # Parse de .xlsx com mapeamento flexível de colunas,
│   │   │   │   │                       #   estados brasileiros (nome completo e sigla),
│   │   │   │   │                       #   validação de WhatsApp (DDD + 9 dígitos)
│   │   │   │   └── index.js            # export { importExcel }
│   │   │   └── file-export/
│   │   │       ├── exportClients.js    # Export formatado: .xlsx (ExcelJS com zebra/filtros)
│   │   │       │                       #   e PDF paisagem com tema escuro (PDFKit)
│   │   │       ├── generateReportPdf.js# PDF do relatório diário com cards e listas coloridas
│   │   │       └── index.js            # export { toExcel, toPDF, generateReportPdf }
│   │   └── index.js                   # Express: CORS, rotas, /health, error handler global,
│   │                                  #   agendador de reset de status à meia-noite
│   ├── migrations/
│   │   ├── 001_schema.sql             # Schema completo — rodar no Neon
│   │   ├── 002_add_tipo_to_products.sql
│   │   └── 003_add_fields_to_clients.sql
│   └── scripts/                       # Scripts de seed de dados iniciais
│       ├── seed_clientes_batch2.js
│       ├── seed_clientes_pr_to_mt_se.js
│       └── seed_produtos_atomi.js
├── client/
│   └── src/
│       ├── App.jsx                     # BrowserRouter + 5 rotas + tema dark zinc-950
│       ├── components/
│       │   ├── Sidebar.jsx             # Navegação responsiva com toggle mobile
│       │   ├── ClientForm.jsx          # Formulário reutilizável (criar/editar cliente):
│       │   │                           #   Identificação, Endereço, Contato, Redes Sociais, CRM
│       │   ├── Toast.jsx               # Notificação toast (sucesso 3.5s / erro 8s)
│       │   └── EmptyState.jsx          # Placeholder de lista vazia
│       ├── pages/
│       │   ├── ClientsPage.jsx         # Tabela/agrupado por UF, filtros, paginação,
│       │   │                           #   import/export, "Contatado", desativar/excluir
│       │   ├── ClientDetailPage.jsx    # Detalhe + edição + observações + "Realizou Compra"
│       │   ├── CatalogPage.jsx         # Catálogos + produtos + import PDF via IA
│       │   ├── ProductDetailPage.jsx   # Edição de produto com campos técnicos
│       │   ├── SellersPage.jsx         # CRUD vendedores + seleção de UFs (27 estados)
│       │   └── DailyReportPage.jsx     # Dashboard diário + cards métricas + download PDF
│       └── utils/
│           ├── api.js                  # Cliente HTTP centralizado: todos os endpoints,
│           │                           #   mensagens de erro amigáveis (Anthropic, rede)
│           └── constants.js            # NOTAS, UFS, formatadores, builders de links sociais,
│                                       #   detecção de celular brasileiro, statusPill
├── .vscode/
│   └── launch.json                    # Configuração de debug F5 para o backend
├── render.yaml                        # Deploy automático no Render
└── .env.example
```

---

## Banco de Dados — Tabelas

| Tabela                | Descrição                                           |
|-----------------------|-----------------------------------------------------|
| `status`              | Status do pipeline (Prospecção, Contatado, etc.)    |
| `sellers`             | Vendedores                                          |
| `seller_ufs`          | Estados atendidos por vendedor (N:N)                |
| `catalogs`            | Catálogos mensais de produtos                       |
| `products`            | Produtos com especificações técnicas completas      |
| `clients`             | Clientes (soft delete via campo `ativo`)            |
| `observations`        | Follow-ups/histórico de contatos por cliente        |
| `daily_report_events` | Eventos do relatório diário                         |

### Eventos do Relatório Diário

| `event_type`         | Quando é gerado                                          |
|----------------------|----------------------------------------------------------|
| `contacted`          | Status muda para **Contatado** (1x por dia por cliente)  |
| `new_client`         | Cliente criado manualmente ou importado via Excel         |
| `catalog_requested`  | Status muda para **Catálogo** (1x por dia por cliente)   |
| `purchased`          | Clique em **Realizou Compra** (N vezes por dia)          |

---

## Status dos Clientes

| # | Nome             | Dispara evento            |
|---|------------------|---------------------------|
| 1 | Prospecção       | —                         |
| 2 | Contatado        | `contacted`               |
| 3 | Negociação       | —                         |
| 4 | Proposta Enviada | —                         |
| 5 | Fechamento       | —                         |
| 6 | Perdido          | —                         |
| 7 | Em Análise       | —                         |
| 8 | Follow-up        | —                         |
| 9 | Cliente Ativo    | —                         |
|10 | Cliente Inativo  | —                         |
|11 | Catálogo         | `catalog_requested`       |

---

## Classificação de Qualidade (Nota)

Atribuída automaticamente na importação e editável manualmente:

| Nota       | Critério                                      |
|------------|-----------------------------------------------|
| Fraco      | Sem WhatsApp e sem Instagram                  |
| Médio      | Tem WhatsApp ou Instagram (mas não ambos)     |
| Excelente  | Tem WhatsApp e Instagram                      |

---

## Auto-atribuição de Vendedor

Ao criar ou importar um cliente, o sistema verifica o campo `uf` e associa automaticamente o vendedor que cobre aquele estado (`seller_ufs`). Caso nenhum vendedor cubra a UF, o campo permanece nulo.

---

## Especificações Técnicas de Produtos

Cada produto armazena as seguintes informações:

| Campo             | Tipo    | Descrição                                 |
|-------------------|---------|-------------------------------------------|
| `tipo`            | texto   | Categoria (patinete, bicicleta, scooter…) |
| `modelo`          | texto   | Nome/código do modelo                     |
| `motor`           | texto   | Potência e tipo do motor                  |
| `bateria`         | texto   | Capacidade e tipo da bateria              |
| `velocidade_min`  | número  | Velocidade mínima (km/h)                  |
| `velocidade_max`  | número  | Velocidade máxima (km/h)                  |
| `autonomia`       | texto   | Autonomia de carga                        |
| `pneu`            | texto   | Tipo/tamanho do pneu                      |
| `suspensao`       | texto   | Tipo de suspensão                         |
| `carregador`      | texto   | Especificação do carregador               |
| `impermeabilidade`| texto   | Grau de proteção (ex: IPX4)               |
| `peso_bruto`      | número  | Peso bruto em kg (com embalagem)          |
| `peso_liquido`    | número  | Peso líquido em kg (sem embalagem)        |
| `comprimento`     | número  | Comprimento em mm                         |
| `largura`         | número  | Largura em mm                             |
| `altura`          | número  | Altura em mm                              |
| `preco`           | número  | Preço de venda em R$                      |
| `estoque`         | número  | Quantidade em estoque                     |
| `imagem`          | texto   | URL da imagem do produto                  |
| `extra`           | texto   | Informações adicionais livres             |

Os campos de peso usam máscara em kg (ex: `12,500`) e dimensões em mm (inteiro). Preço usa máscara BRL (ex: `R$ 1.299,00`).

---

## Arquitetura — Módulos (Passo 1)

A lógica de negócio foi extraída da pasta `services/` e reorganizada em `modules/` com responsabilidades claras:

| Módulo          | Responsabilidade                                                     |
|-----------------|----------------------------------------------------------------------|
| `ai-import`     | Importação de catálogos via PDF usando IA (Anthropic Claude)         |
| `file-import`   | Importação de clientes via Excel (.xlsx)                             |
| `file-export`   | Exportação de clientes (Excel/PDF) e geração de relatório diário PDF |

Cada módulo expõe um `index.js` com exports nomeados. Os controllers importam apenas pelo caminho do módulo, sem depender da estrutura interna.

```js
// Antes (services/)
import { importCatalogPdf } from '../services/importCatalogPdf.js'

// Depois (modules/)
import { importCatalogPdf } from '../modules/ai-import/index.js'
```

A pasta `services/` foi removida após a migração.

---

## Reset Automático de Status à Meia-Noite

Clientes com status **Contatado** são revertidos para **Prospecção** automaticamente à meia-noite. O agendador é iniciado junto com o servidor e usa `setTimeout` recursivo para garantir pontualidade sem drift.

```
server/src/index.js → agendarResetMeiaNoite()
```

Regras de negócio relacionadas:
- Clicar em **Contatado** muda o status e registra evento `contacted` (1x por dia por cliente via `ON CONFLICT DO NOTHING`)
- Adicionar uma observação de follow-up também marca o cliente como Contatado e registra o evento
- À meia-noite, todos os **Contatado** voltam para **Prospecção** automaticamente
- Clientes criados manualmente ou importados via Excel sempre começam com status **Prospecção**

---

## Funcionalidade de IA — Importação de Catálogo por PDF

A rota `POST /catalogs/:id/import-pdf` envia o arquivo PDF ao **Claude (claude-sonnet-4-6)** via Anthropic API. O modelo lê o catálogo e retorna os produtos com todos os campos de especificação técnica (motor, bateria, velocidades, autonomia, pneu, preço, etc.) como JSON, que são inseridos automaticamente no banco.

Requer a variável de ambiente `ANTHROPIC_API_KEY`.

---

## API — Endpoints

### Health
```
GET /health   → { status: "ok", timestamp }
```

### Statuses
```
GET    /status
POST   /status
PUT    /status/:id
DELETE /status/:id
```

### Sellers (Vendedores)
```
GET    /sellers
GET    /sellers/:id
POST   /sellers          { nome, whatsapp, ufs: ["SP","RJ"] }
PUT    /sellers/:id
DELETE /sellers/:id
```

### Clients (Clientes)
```
GET    /clients          ?search=&status_id=&uf=&ativo=&page=&limit=
GET    /clients/:id
POST   /clients
PUT    /clients/:id
DELETE /clients/:id                    → soft delete (inativa, não exclui)
POST   /clients/:id/purchase           → registra compra no relatório diário
POST   /clients/import                 → multipart/form-data, campo "file" (.xlsx)
GET    /clients/export?format=xlsx|pdf → exporta lista filtrada

GET    /clients/:id/observations
POST   /clients/:id/observations       { texto }
DELETE /clients/:id/observations/:obsId
```

### Catalogs (Catálogos)
```
GET    /catalogs
GET    /catalogs/:id                        → inclui array de produtos
POST   /catalogs
PUT    /catalogs/:id
DELETE /catalogs/:id

GET    /catalogs/:id/products
POST   /catalogs/:id/products
GET    /catalogs/:id/products/:prodId
PUT    /catalogs/:id/products/:prodId
PATCH  /catalogs/:id/products/:prodId/stock { estoque }
DELETE /catalogs/:id/products/:prodId

POST   /catalogs/:id/import-pdf             → multipart/form-data, campo "file" (.pdf) — IA
```

### Daily Report (Relatório Diário)
```
GET /daily-report/summary?date=YYYY-MM-DD
GET /daily-report/details?date=YYYY-MM-DD
GET /daily-report/dates
GET /daily-report/pdf?date=YYYY-MM-DD       → download PDF
```

---

## Instalação e Execução Local

### Pré-requisitos
- [Bun](https://bun.sh) instalado
- Conta no [Neon.tech](https://neon.tech) com banco PostgreSQL
- (Opcional) Chave da [Anthropic API](https://console.anthropic.com) para importação de catálogos por PDF

### 1. Clonar e instalar dependências
```bash
bun install
cd server && bun install
cd ../client && bun install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example server/.env
# Edite server/.env com suas credenciais
```

Conteúdo do `server/.env`:
```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
PORT=8000
NODE_ENV=development
ANTHROPIC_API_KEY=sk-ant-...   # necessário para importar catálogos por PDF
```

### 3. Criar as tabelas no banco
Acesse o SQL Editor do Neon.tech e execute o conteúdo de:
```
server/migrations/001_schema.sql
```
Se necessário, execute também as migrations 002 e 003 na sequência.

### 4. Rodar em desenvolvimento
```bash
# Na raiz do projeto:
bun run dev
```
- Frontend: http://localhost:5173
- Backend:  http://localhost:8000

### 5. Debug do Backend no VS Code (F5)

O projeto já inclui configuração de debug em `.vscode/launch.json`.

**Pré-requisito:** ter o `bun` instalado e disponível no PATH.

**Como usar:**
1. Abra a pasta raiz do projeto no VS Code
2. Pressione **F5** (ou vá em *Run → Start Debugging*)
3. Selecione **"Debug Backend"** na lista (se solicitado)
4. O servidor iniciará com o debugger ativo na porta `8000`

> As variáveis de ambiente são carregadas automaticamente de `server/.env`.
> Breakpoints funcionam normalmente nos arquivos de `server/src/`.

---

## Deploy no Render

### Backend (Web Service)
1. Conecte o repositório no Render
2. Root Directory: `server`
3. Build Command: `bun install`
4. Start Command: `bun start`
5. Variáveis de ambiente:
   - `DATABASE_URL` = connection string do Neon
   - `ANTHROPIC_API_KEY` = chave da API Anthropic
   - `NODE_ENV` = production

### Frontend (Static Site)
1. Root Directory: `client`
2. Build Command: `bun install && bun run build`
3. Publish Directory: `dist`
4. Variável: `VITE_API_URL` = URL do backend no Render

> Ou utilize o `render.yaml` na raiz do projeto para deploy automático.

---

## Testes (a implementar)

Estrutura planejada em `server/src/tests/`:

```
tests/
├── models/
│   ├── ClientModel.test.js
│   ├── CatalogModel.test.js
│   ├── ProductModel.test.js
│   └── DailyReportModel.test.js
├── controllers/
│   ├── ClientController.test.js
│   └── DailyReportController.test.js
└── modules/
    ├── file-import/importExcel.test.js
    └── file-export/generateReportPdf.test.js
```

Casos de teste prioritários:
- `ClientModel.create` → deve inserir evento `new_client`
- `ClientModel.update` com status `Contatado` → deve inserir `contacted` (idempotente no dia)
- `ClientModel.update` com status `Catálogo` → deve inserir `catalog_requested`
- `ClientModel.registerPurchase` → deve permitir múltiplos no mesmo dia
- `ClientModel.deactivate` → não deve excluir o registro
- `DailyReportModel.getSummary` → deve agregar corretamente por data
- `importExcel` → deve detectar colunas dinamicamente

---

## Licença

Uso privado.
