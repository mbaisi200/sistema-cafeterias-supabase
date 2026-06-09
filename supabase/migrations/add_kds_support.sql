-- =====================================================
-- Migration: KDS (Kitchen Display System)
-- Adiciona suporte para acompanhamento de itens na cozinha
-- =====================================================

-- Add kds_status column to itens_venda
ALTER TABLE itens_venda
  ADD COLUMN IF NOT EXISTS kds_status VARCHAR(20) DEFAULT 'pendente'
  CHECK (kds_status IN ('pendente', 'em_preparacao', 'pronto', 'entregue'));

-- Update existing items to 'pronto' for already completed orders
UPDATE itens_venda
  SET kds_status = 'pronto'
  WHERE kds_status IS NULL
  AND venda_id IN (SELECT id FROM vendas WHERE status = 'fechada');

-- Index for fast KDS queries
CREATE INDEX IF NOT EXISTS idx_itens_venda_kds_status
  ON itens_venda (empresa_id, kds_status)
  WHERE kds_status IN ('pendente', 'em_preparacao', 'pronto');

-- =====================================================
-- Grants (required per AGENTS.md note #10)
-- =====================================================
-- No new tables, just ALTER on existing table
-- Grants already exist for itens_venda
