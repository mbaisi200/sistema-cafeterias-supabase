-- =====================================================
-- MIGRATION: Preparar Pedidos para transformação em NF-e
-- =====================================================

-- 1. Adicionar nfe_id na tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nfe_id UUID REFERENCES nfe(id) ON DELETE SET NULL;

-- 2. Adicionar índice para consulta de pedidos pendentes de NF-e
CREATE INDEX IF NOT EXISTS idx_pedidos_status_nfe ON pedidos (empresa_id, status, nfe_id) WHERE nfe_id IS NULL;

-- 3. Corrigir CHECK constraint de vendas.status para incluir 'finalizada'
ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_status_check;
ALTER TABLE vendas ADD CONSTRAINT vendas_status_check CHECK (status IN ('aberta', 'fechada', 'cancelada', 'finalizada'));
