-- =====================================================
-- MIGRATION: Adiciona campos NFe e Código de Barras
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Adiciona campo código de barras na tabela produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(20);

-- Adiciona campos NFe na tabela produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ncm VARCHAR(8);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cst VARCHAR(3);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cfop VARCHAR(4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS icms DECIMAL(5,2) DEFAULT 0;

-- Adiciona campo senha na tabela funcionarios
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

-- Criar índice para código de barras (para busca rápida)
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);

-- Comentários nos campos para documentação
COMMENT ON COLUMN produtos.codigo_barras IS 'Código de barras do produto (EAN)';
COMMENT ON COLUMN produtos.ncm IS 'Nomenclatura Comum do Mercosul - 8 dígitos';
COMMENT ON COLUMN produtos.cst IS 'Código de Situação Tributária - 3 dígitos';
COMMENT ON COLUMN produtos.cfop IS 'Código Fiscal de Operações e Prestações - 4 dígitos';
COMMENT ON COLUMN produtos.icms IS 'Alíquota do ICMS em percentual';
COMMENT ON COLUMN funcionarios.senha IS 'Senha de acesso do funcionário';
