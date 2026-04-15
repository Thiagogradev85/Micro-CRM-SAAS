-- ================================================================
-- Multi-tenant por empresa: cada empresa compartilha o mesmo pool
-- de clientes, vendedores, status e catálogos entre seus usuários.
-- ================================================================

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
  id         SERIAL       PRIMARY KEY,
  nome       VARCHAR(200) NOT NULL,
  ativo      BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Usuários passam a pertencer a uma empresa
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;

-- Adiciona company_id nas tabelas principais (nullable para compatibilidade)
ALTER TABLE clients  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE sellers  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE status   ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- ================================================================
-- Migração: cada usuário existente vira sua própria empresa,
-- mantendo total backward-compat (user_id permanece intacto).
-- ================================================================

-- Cria uma empresa por usuário existente
INSERT INTO companies (nome, created_at)
SELECT nome, created_at FROM users ORDER BY id;

-- Associa cada usuário à empresa recém-criada (match por nome+created_at)
UPDATE users u
SET company_id = c.id
FROM companies c
WHERE c.nome = u.nome AND c.created_at = u.created_at;

-- Propaga company_id para as tabelas filhas via user_id
UPDATE clients  SET company_id = u.company_id FROM users u WHERE clients.user_id  = u.id AND clients.company_id  IS NULL;
UPDATE sellers  SET company_id = u.company_id FROM users u WHERE sellers.user_id  = u.id AND sellers.company_id  IS NULL;
UPDATE status   SET company_id = u.company_id FROM users u WHERE status.user_id   = u.id AND status.company_id   IS NULL;
UPDATE catalogs SET company_id = u.company_id FROM users u WHERE catalogs.user_id = u.id AND catalogs.company_id IS NULL;
