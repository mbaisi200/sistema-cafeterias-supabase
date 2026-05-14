-- Adicionar coluna vendedor_nome na tabela contas
ALTER TABLE contas ADD COLUMN IF NOT EXISTS vendedor_nome VARCHAR(255);
