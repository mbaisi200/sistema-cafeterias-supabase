-- Adicionar coluna telefone na tabela vendedores
ALTER TABLE vendedores ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
