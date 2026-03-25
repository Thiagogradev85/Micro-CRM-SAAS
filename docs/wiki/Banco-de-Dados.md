# Banco de Dados

## Tabelas

| Tabela | Descrição |
|--------|-----------|
| `status` | Status do pipeline (Prospecção, Contatado, etc.) |
| `sellers` | Vendedores |
| `seller_ufs` | Estados atendidos por vendedor (N:N) |
| `catalogs` | Catálogos de produtos |
| `products` | Produtos com specs técnicas completas |
| `clients` | Clientes (soft delete via `ativo`) |
| `observations` | Histórico de follow-ups por cliente |
| `daily_report_events` | Eventos do relatório diário |

## Status do pipeline

| # | Nome | Dispara evento |
|---|------|----------------|
| 1 | Prospecção | — |
| 2 | Contatado | `contacted` |
| 3 | Negociação | — |
| 4 | Proposta Enviada | — |
| 5 | Fechamento | — |
| 6 | Perdido | — |
| 7 | Em Análise | — |
| 8 | Follow-up | — |
| 9 | Cliente Ativo | — |
| 10 | Cliente Inativo | — |
| 11 | Catálogo | `catalog_requested` |

## Eventos do relatório diário

| `event_type` | Quando é gerado | Repetição |
|---|---|---|
| `contacted` | Status → Contatado ou observação adicionada | 1x por dia por cliente |
| `new_client` | Cliente criado manualmente ou importado | 1x por cliente |
| `catalog_requested` | Status → Catálogo | 1x por dia por cliente |
| `purchased` | Clique em "Realizou Compra" | N vezes por dia |

O campo `event_date` usa o fuso horário de Brasília (`America/Sao_Paulo`), independente do fuso do servidor. O relatório filtra sempre por `WHERE event_date = :data`.

## Constraint de unicidade

```sql
CREATE UNIQUE INDEX daily_report_events_unique_non_purchase
  ON daily_report_events (client_id, event_type, event_date)
  WHERE event_type != 'purchased';
```

## Classificação de qualidade (nota)

| Nota | Critério |
|------|----------|
| 1 — Fraco | Sem WhatsApp e sem Instagram |
| 2 — Médio | Tem WhatsApp ou Instagram (não ambos) |
| 3 — Excelente | Tem WhatsApp e Instagram |

Atribuída automaticamente na importação. Editável manualmente.

## Migrações

```
server/migrations/
├── 001_schema.sql                    # Schema completo inicial
├── 002_add_tipo_to_products.sql
├── 003_add_fields_to_clients.sql
└── 004_fix_daily_report_timezone.sql # Corrige event_date para fuso Brasília
```
