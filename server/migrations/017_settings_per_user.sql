-- ================================================================
-- Configurações por usuário com fallback para o admin global.
-- Mantém a tabela `settings` existente como armazenamento global
-- e adiciona `user_settings` para overrides individuais.
-- ================================================================

CREATE TABLE IF NOT EXISTS user_settings (
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key        TEXT         NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

-- Remove a senha de configurações do global (autenticação agora é via JWT)
DELETE FROM settings WHERE key = 'SETTINGS_PASSWORD';
