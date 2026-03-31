-- Migration 007: adiciona cnpj e ja_cliente à tabela clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS cnpj       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ja_cliente BOOLEAN NOT NULL DEFAULT false;
