-- =====================================================
-- Migration: Add estoque reserva support
-- Permite reservar estoque quando um pedido é criado
-- e liberar quando ele é faturado ou cancelado
-- =====================================================

-- Add 'reserva' to the tipo CHECK constraint
ALTER TABLE estoque_movimentos
  DROP CONSTRAINT IF EXISTS estoque_movimentos_tipo_check,
  ADD CONSTRAINT estoque_movimentos_tipo_check
    CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'venda', 'reserva'));

-- Add pedido_id column for referencing the originating pedido
ALTER TABLE estoque_movimentos
  ADD COLUMN IF NOT EXISTS pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL;

-- Index for fast reservation queries per product
CREATE INDEX IF NOT EXISTS idx_estoque_movimentos_reserva
  ON estoque_movimentos (produto_id, tipo)
  WHERE tipo = 'reserva';

-- Index for reservation lookups by pedido
CREATE INDEX IF NOT EXISTS idx_estoque_movimentos_pedido_id
  ON estoque_movimentos (pedido_id)
  WHERE pedido_id IS NOT NULL;

-- =====================================================
-- Grants (required per AGENTS.md note #10)
-- =====================================================
-- No new tables, just ALTER on existing table
-- Grants already exist for estoque_movimentos
