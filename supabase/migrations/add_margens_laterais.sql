-- Migration: Adicionar margens laterais (esquerda/direita) na tabela cupom_config
-- Execute este script no SQL Editor do Supabase

-- Adicionar campos de margem esquerda e direita
ALTER TABLE cupom_config 
ADD COLUMN IF NOT EXISTS margem_esquerda INTEGER DEFAULT 2;

ALTER TABLE cupom_config 
ADD COLUMN IF NOT EXISTS margem_direita INTEGER DEFAULT 2;

-- Comentários para documentação
COMMENT ON COLUMN cupom_config.margem_esquerda IS 'Margem esquerda do cupom em milímetros';
COMMENT ON COLUMN cupom_config.margem_direita IS 'Margem direita do cupom em milímetros';

-- Verificar se funcionou
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'cupom_config' 
AND column_name IN ('margem_esquerda', 'margem_direita', 'margem_superior', 'margem_inferior');
