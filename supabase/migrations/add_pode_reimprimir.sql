-- =====================================================
-- ADICIONA COLUNA pode_reimprimir NA TABELA empresas
-- Permite que o Master controle reimpressão de cupons
-- por empresa
-- =====================================================
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS pode_reimprimir BOOLEAN DEFAULT true NOT NULL;
