# CRM Scooter & Patinetes Elétricos

CRM mobile-first para gerenciamento de clientes, catálogos, vendedores, prospecção automática com enriquecimento de dados via IA, envio em massa via WhatsApp/e-mail e relatório diário.

---

## Stack

| Camada   | Tecnologia                                                        |
|----------|-------------------------------------------------------------------|
| Frontend | React 18 + Vite + Tailwind CSS                                    |
| Backend  | Node.js + Express                                                 |
| Banco    | PostgreSQL — Neon.tech                                            |
| IA       | Anthropic Claude (importação de catálogo PDF + enriquecimento)    |
| Busca    | Serper API (Google Maps + Google Web Search)                      |
| Deploy   | Render (API + Static Site)                                        |

---

## Inicialização — passo a passo

### Pré-requisitos

- Node.js 18+
- Conta no [Neon.tech](https://neon.tech) (PostgreSQL gratuito)
- Conta no [Serper.dev](https://serper.dev) (2.500 buscas/mês grátis)
- Conta no [Anthropic Console](https://console.anthropic.com) (Claude API)

### 1. Clonar o repositório

```bash
git clone https://github.com/Thiagogradev85/Leads-React-JS.git
cd Leads-React-JS
```

### 2. Configurar variáveis de ambiente

Crie o arquivo `server/.env` com o seguinte conteúdo:

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
ANTHROPIC_API_KEY=sk-ant-...
SERPER_API_KEY=sua-chave-serper
PORT=8000
NODE_ENV=development
```

| Variável            | Obrigatória | Onde obter |
|---------------------|-------------|------------|
| `DATABASE_URL`      | ✅ | [neon.tech](https://neon.tech) → New Project → Connection String |
| `ANTHROPIC_API_KEY` | ✅ | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `SERPER_API_KEY`    | ✅ | [serper.dev](https://serper.dev) → Dashboard → API Key |
| `PORT`              | — | Padrão: `8000` |

### 3. Criar as tabelas no banco

O schema completo está em `server/migrations/001_schema.sql`.
Execute no seu banco Neon (via SQL Editor no dashboard) ou com psql:

```bash
psql $DATABASE_URL -f server/migrations/001_schema.sql
```

### 4. Instalar dependências e rodar

```bash
# Backend (porta 8000)
cd server && npm install && npm run dev

# Frontend (nova aba — porta 5173)
cd client && npm install && npm run dev
```

Acesse: **http://localhost:5173**

---

## Funcionalidades

### Clientes

Central de gerenciamento de prospects e clientes. Exibe todos os contatos agrupados por estado (UF) ou em lista plana.

- **Busca e filtros**: por nome/cidade, estado, status, nota, ativos/inativos, prospects/clientes
- **Visualização Por Estado**: cada UF aparece como aba recolhível; clique para expandir
- **Visualização Lista**: tabela paginada com ordenação por nome
- **Seção Atenção**: destaca automaticamente clientes sem contato há mais de N dias (configurável). UFs podem ser ocultadas da seção individualmente
- **Seção Novos**: clientes cadastrados hoje aparecem em destaque no topo
- **Ações rápidas**: marcar como Contatado, ver detalhes, inativar ou excluir
- **Importar CSV/Excel**: importação em lote de clientes
- **Exportar**: exporta a lista filtrada atual
- **Duplicatas**: escaneia o banco e agrupa registros similares por nome e telefone para limpeza

### Detalhe do Cliente

Página completa do cliente com histórico e ações:

- Edição de todos os dados: nome, cidade, UF, WhatsApp, Instagram, e-mail, site, status, nota
- **Observações**: histórico de anotações com data e hora
- **Botão Instagram**: abre input específico para registrar observação vinda do Instagram
- Links diretos para WhatsApp (wa.me) e Instagram
- Histórico de contatos via relatório diário

### Prospecção

Busca empresas no **Google Maps** e cadastra novos prospects automaticamente.

1. Informe o **segmento** de negócio (ex: `farmácias, clínicas`), **estado** e **cidade**
2. O sistema busca via Serper API e filtra empresas já cadastradas (deduplicação fuzzy)
3. Selecione os prospects desejados, edite dados inline se necessário
4. Clique em **Salvar selecionados**
5. Após salvar, o sistema oferece **Enriquecimento de Dados** automático

### Enriquecimento de Dados

Módulo dedicado acessível pelo menu lateral em **Enriquecimento**. Permite buscar dados de contato faltantes para clientes já existentes na base.

**Duas formas de uso:**

1. **Após prospecção** — ao salvar novos prospects, o modal de enriquecimento abre automaticamente
2. **Módulo avulso** (`/enrich`) — selecione clientes existentes por UF, status ou busca por nome e enriqueça em lote

**Filtros disponíveis na página:**
- Busca por nome ou cidade
- Estado (UF) — seleciona toda a UF com um clique
- Status do cliente
- Campos faltando: "Sem Instagram", "Sem WhatsApp", "Sem E-mail", "Sem Facebook"

**Como funciona:**
- Busca no Google via **Serper Web Search** por nome + cidade do cliente
- Extrai Instagram, Facebook, e-mail e telefone via parsing de URLs e regex
- Suporta lotes de 20 clientes com barra de progresso quando há mais
- O usuário revisa cada campo por cliente e decide o que salvar — nenhum dado é salvo automaticamente

### Produtos

Catálogo interno de produtos (Bikes Elétricas e Patinetes Elétricos).

- Campos: tipo (dropdown), modelo, preço, bateria, motor, velocidades, pneu, suspensão, autonomia, carregador, impermeabilidade, câmbio, dimensões, estoque, imagem
- Importação de catálogo PDF via Claude (extração automática de especificações)

### Catálogos

Agrupa produtos em catálogos para envio a clientes.

- Criar catálogos com nome e data
- Adicionar produtos existentes ou criar novos dentro do catálogo
- Gerar PDF do catálogo para compartilhamento
- Importar produtos a partir de PDF via IA

### Vendedores

Gerenciamento da equipe de vendas.

- Cadastro de vendedores com nome e estados (UFs) atendidos
- Atribuição automática de vendedor ao cliente pelo estado ao prospectar
- Relatório por vendedor

### WhatsApp

Envio em massa de mensagens via WhatsApp Business.

- Conexão por QR Code (Baileys — WhatsApp Web)
- Seleção de clientes por filtros (estado, status, nota)
- Personalização da mensagem com variáveis (nome do cliente)
- Envio com intervalo configurável entre mensagens
- Barra de progresso em tempo real

### E-mail em Massa

Envio de e-mail marketing para a base de clientes.

- Configuração de SMTP próprio
- Editor de e-mail com suporte a HTML
- Seleção de destinatários por filtros
- Envio em lote com feedback de progresso

### Relatório Diário

Painel de acompanhamento das atividades do dia.

- Clientes novos cadastrados
- Clientes contatados
- Vendas realizadas
- Solicitações de catálogo

### Reset automático de status

Todo dia à meia-noite (horário de Brasília), clientes com status **Contatado** voltam automaticamente para **Prospecção**, permitindo que entrem novamente no relatório diário caso sejam contatados no novo dia.

Se o servidor estiver offline à meia-noite, o reset ocorre automaticamente na próxima inicialização (apenas para contatos de dias anteriores).

---

## Deploy — Render

| Serviço      | Root Dir | Build                     | Start       |
|--------------|----------|---------------------------|-------------|
| API (Web)    | `server` | `npm ci`                  | `npm start` |
| App (Static) | `client` | `npm ci && npm run build` | —           |

Variáveis necessárias no Render: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SERPER_API_KEY`, `NODE_ENV=production`.

---

## Documentação completa

Acesse o **[Wiki do repositório](https://github.com/Thiagogradev85/Leads-React-JS/wiki)** para:

- Arquitetura e estrutura de pastas
- Banco de dados — tabelas e eventos
- API — todos os endpoints
- Módulo WhatsApp (Baileys)
- Módulo E-mail (Nodemailer)
- Sistema de modais (AppModal + useModal)
- Enriquecimento de dados — fluxo completo
