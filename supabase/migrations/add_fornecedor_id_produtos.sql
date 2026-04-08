-- =====================================================
-- Migration: Adicionar fornecedor_id à tabela produtos
-- Descrição: Permite vincular cada produto ao seu fornecedor
--   para evitar conflito de códigos de produtos entre
--   fornecedores diferentes durante a importação de NF-e.
--
-- Contexto: Quando importando NF-e de entrada, diferentes
--   fornecedores podem usar o mesmo código interno (cProd)
--   para produtos diferentes. Com o fornecedor_id, o
--   matching pode considerar código + fornecedor, evitando
--   associar um produto ao produto errado.
-- =====================================================

-- 1. Adicionar coluna fornecedor_id (nullable FK)
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL;

-- 2. Criar índice para performance nas buscas por fornecedor
CREATE INDEX IF NOT EXISTS idx_produtos_fornecedor_id
  ON produtos(fornecedor_id)
  WHERE fornecedor_id IS NOT NULL;

-- 3. Criar índice composto para matching por código + fornecedor
--    (otimiza a query principal de importação NFe)
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_fornecedor
  ON produtos(empresa_id, codigo, fornecedor_id)
  WHERE codigo IS NOT NULL;

-- 4. Adicionar comentário à coluna
COMMENT ON COLUMN produtos.fornecedor_id IS
  'Fornecedor principal do produto. Usado durante importação de NFe para diferenciar produtos com o mesmo código de fornecedores diferentes.';
