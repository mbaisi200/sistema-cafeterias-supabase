-- =====================================================
-- ADICIONA COLUNA permitir_foto_produto NA TABELA empresas
-- =====================================================
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS permitir_foto_produto BOOLEAN DEFAULT true NOT NULL;
