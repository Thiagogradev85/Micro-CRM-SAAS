# Arquitetura

## Estrutura de pastas

```
├── client/src/
│   ├── components/     # AppModalError, Toast, Sidebar, ClientForm, ...
│   ├── hooks/          # useAppModalError (feedback visual em todas as páginas)
│   ├── pages/          # Uma página por módulo
│   └── utils/          # api.js (cliente HTTP), constants.js
│
└── server/src/
    ├── controllers/    # Handlers HTTP — usam AppError + next(err)
    ├── models/         # Queries SQL diretas (pg)
    ├── modules/        # Lógica de negócio isolada por domínio
    │   ├── ai-import/      # Importação de catálogo via PDF (Anthropic Claude)
    │   ├── email/          # Envio em massa via SMTP (Nodemailer)
    │   ├── file-export/    # Export Excel/PDF de clientes e relatório
    │   ├── file-import/    # Import de clientes via Excel
    │   └── whatsapp/       # Envio em massa via WhatsApp Web (Baileys)
    ├── routes/         # Roteamento Express
    └── utils/          # AppError.js
```

## Módulos

Cada módulo em `server/src/modules/` expõe um `index.js` com exports nomeados. Os controllers importam apenas pelo caminho do módulo.

| Módulo        | Responsabilidade |
|---------------|-----------------|
| `ai-import`   | Lê PDF de catálogo com Claude, retorna produtos como JSON |
| `email`       | Configura SMTP, envia teste e envio em massa com delay |
| `file-export` | Gera Excel (ExcelJS) e PDF (PDFKit) de clientes e relatório |
| `file-import` | Parse de .xlsx com mapeamento flexível de colunas |
| `whatsapp`    | Singleton Baileys: QR, conexão, sendBulk com callbacks |

## Fluxo de uma requisição

```
Browser → Vite proxy /api → Express router → Controller → Model (SQL) → PostgreSQL (Neon)
                                                ↓ erro
                                         AppError → middleware global → res.status(code).json
```

## Reset diário automático

À meia-noite de Brasília, todos os clientes com status **Contatado** voltam para **Prospecção**. O agendador usa `setTimeout` recursivo ancorado na data de Brasília (UTC-3), não no fuso do servidor.

```
server/src/index.js → agendarResetMeiaNoite()
```
