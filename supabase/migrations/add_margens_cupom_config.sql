-- =====================================================
-- MIGRATION: Adicionar colunas de margem na tabela cupom_config
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Adicionar coluna margem_esquerda
ALTER TABLE cupom_config 
ADD COLUMN IF NOT EXISTS margem_esquerda INTEGER DEFAULT 2;

-- Adicionar coluna margem_direita
ALTER TABLE cupom_config 
ADD COLUMN IF NOT EXISTS margem_direita INTEGER DEFAULT 2;

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'cupom_config' 
AND column_name IN ('margem_esquerda', 'margem_direita', 'margem_superior', 'margem_inferior', 'tamanho_fonte', 'largura_papel');
