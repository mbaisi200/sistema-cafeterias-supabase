-- =====================================================
-- MIGRATION: Adicionar campo disponivel_ifood em produtos
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Adicionar coluna disponivel_ifood na tabela produtos
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS disponivel_ifood BOOLEAN DEFAULT false;

-- Adicionar coluna para código externo do iFood
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS ifood_external_code VARCHAR(100);

-- Adicionar coluna para status de sincronização
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS ifood_sync_status VARCHAR(20) DEFAULT 'not_synced' 
CHECK (ifood_sync_status IN ('synced', 'pending', 'error', 'not_synced'));

-- Adicionar coluna para ID do produto no iFood
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS ifood_product_id VARCHAR(100);

-- Criar índice para busca por código externo iFood
CREATE INDEX IF NOT EXISTS idx_produtos_ifood_external_code ON produtos(ifood_external_code);
CREATE INDEX IF NOT EXISTS idx_produtos_ifood_sync_status ON produtos(ifood_sync_status);
CREATE INDEX IF NOT EXISTS idx_produtos_disponivel_ifood ON produtos(disponivel_ifood);

-- Comentários nas colunas
COMMENT ON COLUMN produtos.disponivel_ifood IS 'Indica se o produto deve ser sincronizado com o iFood';
COMMENT ON COLUMN produtos.ifood_external_code IS 'Código externo usado para identificar o produto no iFood';
COMMENT ON COLUMN produtos.ifood_sync_status IS 'Status da última sincronização com iFood';
COMMENT ON COLUMN produtos.ifood_product_id IS 'ID do produto no catálogo do iFood';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
