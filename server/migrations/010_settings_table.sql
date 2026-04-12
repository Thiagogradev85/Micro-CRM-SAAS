-- Tabela de configurações do sistema (chaves de API, senha de admin, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Senha padrão para a página de configurações (troque após o primeiro acesso)
INSERT INTO settings (key, value) VALUES ('SETTINGS_PASSWORD', 'admin1234')
  ON CONFLICT (key) DO NOTHING;
