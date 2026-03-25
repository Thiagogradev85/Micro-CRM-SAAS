-- ================================================================
-- Migration 004: Corrigir event_date para fuso horário de Brasília
--
-- Problema: event_date estava sendo gravado com CURRENT_DATE do
-- servidor (UTC). Usuários no Brasil (UTC-3) que registravam contatos
-- após as 21h local tinham os eventos salvos com a data de amanhã
-- (UTC), fazendo esses eventos aparecerem no relatório do dia seguinte.
--
-- Solução: recalcular event_date a partir do created_at real,
-- convertendo UTC → America/Sao_Paulo.
--
-- Executar no console SQL do Neon.
-- ================================================================

BEGIN;

-- ----------------------------------------------------------------
-- Passo 1: Remover duplicatas que surgirão após corrigir as datas.
-- Cenário: cliente contatado às 22h do dia X (Brazil) e às 23h50.
-- Antes da correção, ambos tinham event_date = dia X+1 (UTC).
-- Após correção, ambos teriam event_date = dia X (Brazil) — duplicata.
-- Mantemos apenas o registro mais antigo (created_at ASC).
-- ----------------------------------------------------------------
WITH duplicatas AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        client_id,
        event_type,
        (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date
      ORDER BY created_at ASC
    ) AS rn
  FROM daily_report_events
  WHERE event_type != 'purchased'   -- purchased pode repetir, não tem constraint
)
DELETE FROM daily_report_events
WHERE id IN (
  SELECT id FROM duplicatas WHERE rn > 1
);

-- ----------------------------------------------------------------
-- Passo 2: Corrigir event_date para a data em Brasília.
-- created_at é TIMESTAMP (sem fuso) gravado pelo servidor UTC do Neon.
-- Convertemos explicitamente: interpreta como UTC, converte para BRT.
-- ----------------------------------------------------------------
UPDATE daily_report_events
SET event_date = (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date
WHERE event_date != (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date;

-- ----------------------------------------------------------------
-- Passo 3: Remover eventos com data futura (anomalias de dados).
-- ----------------------------------------------------------------
DELETE FROM daily_report_events
WHERE event_date > (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

COMMIT;

-- ----------------------------------------------------------------
-- Verificação: distribução por data após a correção.
-- Rode separadamente para conferir o resultado.
-- ----------------------------------------------------------------
SELECT
  event_date,
  event_type,
  COUNT(*) AS total
FROM daily_report_events
GROUP BY event_date, event_type
ORDER BY event_date DESC, event_type;
