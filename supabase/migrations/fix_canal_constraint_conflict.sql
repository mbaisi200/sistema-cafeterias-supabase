-- =====================================================
-- FIX: Conflito entre constraints vendas_canal e vendas_canal_check
-- -- vendas_canal (lavanderia): permite lavanderia mas nao varejo
-- -- vendas_canal_check (varejo): permite varejo mas nao lavanderia
-- Como as duas constraints sao AND, 'varejo' falha em vendas_canal
-- =====================================================

-- Remove todas as constraints da coluna canal na tabela vendas
DO $$
DECLARE
  cons RECORD;
BEGIN
  FOR cons IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'vendas'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%canal%'
  LOOP
    EXECUTE 'ALTER TABLE vendas DROP CONSTRAINT ' || cons.conname;
  END LOOP;
END $$;

-- Cria constraint unificada com todos os valores + NULL
ALTER TABLE vendas ADD CONSTRAINT vendas_canal_check
  CHECK (canal IS NULL OR canal IN (
    'balcao', 'mesa', 'delivery', 'ifood', 'rappi',
    'uber_eats', 'whatsapp', 'varejo', 'lavanderia'
  ));

COMMENT ON CONSTRAINT vendas_canal_check ON vendas IS 'Canais de venda permitidos: balcao, mesa, delivery, ifood, rappi, uber_eats, whatsapp, varejo, lavanderia';
