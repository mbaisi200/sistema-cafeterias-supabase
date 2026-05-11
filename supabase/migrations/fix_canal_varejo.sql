-- =====================================================
-- MIGRATION: Adicionar 'varejo' ao CHECK constraint de canal
-- =====================================================

ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_canal_check;
ALTER TABLE vendas ADD CONSTRAINT vendas_canal_check
  CHECK (canal IN ('balcao', 'mesa', 'delivery', 'ifood', 'rappi', 'uber_eats', 'whatsapp', 'varejo'));
