-- =====================================================
-- Migration: Add missing columns to estoque_movimentos
-- These columns are used by NFE import and listing APIs
-- =====================================================

-- estoque_movimentos: columns for NFE tracking
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS produto_nome VARCHAR(255);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS tipo_entrada VARCHAR(20);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS quantidade_informada DECIMAL(10,2);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS estoque_anterior DECIMAL(10,2);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS estoque_novo DECIMAL(10,2);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS fornecedor VARCHAR(255);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS documento_ref VARCHAR(255);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS criado_por UUID;
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS criado_por_nome VARCHAR(255);

-- vendas: columns for NFE emission tracking
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfe_emitida BOOLEAN DEFAULT false;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfe_id UUID;

-- Indexes for NFE listing performance
CREATE INDEX IF NOT EXISTS idx_estoque_movimentos_documento_ref ON estoque_movimentos(documento_ref);
CREATE INDEX IF NOT EXISTS idx_estoque_movimentos_tipo_entrada ON estoque_movimentos(tipo_entrada);
