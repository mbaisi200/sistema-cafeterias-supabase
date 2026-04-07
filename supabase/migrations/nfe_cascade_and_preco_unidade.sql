-- =====================================================
-- MIGRATION: Melhorias NF-e Import
-- Data: 2025
-- Execute este script no SQL Editor do Supabase
-- =====================================================
--
-- Problemas corrigidos:
-- 1. Quando excluída uma NF-e importada, exclui em cascata:
--    - Reverte estoque de todos os produtos
--    - Exclui movimentações de estoque
--    - Exclui conta a pagar gerada
--    - Exclui produtos que foram criados pela importação
-- 2. Auto-calcula preco_unidade quando preco e unidades_por_caixa estão preenchidos
-- 3. Adiciona FK nfe_importada_id para rastreamento
--

-- =====================================================
-- 1. ADICIONAR COLUNA nfe_importada_id EM estoque_movimentos
-- =====================================================
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS nfe_importada_id UUID;

-- Constraint FK com ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_estoque_movimentos_nfe_importada'
    AND table_name = 'estoque_movimentos'
  ) THEN
    ALTER TABLE estoque_movimentos
      ADD CONSTRAINT fk_estoque_movimentos_nfe_importada
      FOREIGN KEY (nfe_importada_id) REFERENCES nfe_importadas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 2. ADICIONAR COLUNA nfe_importada_id EM contas
-- =====================================================
ALTER TABLE contas ADD COLUMN IF NOT EXISTS nfe_importada_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_contas_nfe_importada'
    AND table_name = 'contas'
  ) THEN
    ALTER TABLE contas
      ADD CONSTRAINT fk_contas_nfe_importada
      FOREIGN KEY (nfe_importada_id) REFERENCES nfe_importadas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 3. BACKFILL: Preencher nfe_importada_id nos registros existentes
-- =====================================================

-- 3a. Preencher em estoque_movimentos
-- Relacionamento: documento_ref = 'NFe numero/serie' e nfe_importadas.tem numero + serie
UPDATE estoque_movimentos em
SET nfe_importada_id = ni.id
FROM nfe_importadas ni
WHERE em.empresa_id = ni.empresa_id
  AND ni.numero IS NOT NULL
  AND ni.serie IS NOT NULL
  AND em.documento_ref = 'NFe ' || ni.numero || '/' || ni.serie
  AND em.nfe_importada_id IS NULL;

-- 3b. Preencher em contas
-- Relacionamento: observacao_pagamento contem 'Chave: chave_acesso'
UPDATE contas c
SET nfe_importada_id = ni.id
FROM nfe_importadas ni
WHERE c.empresa_id = ni.empresa_id
  AND ni.chave_acesso IS NOT NULL
  AND c.observacao_pagamento LIKE '%Chave: ' || ni.chave_acesso || '%'
  AND c.nfe_importada_id IS NULL;

-- =====================================================
-- 4. TRIGGER: Exclusão em cascata de NFe importada
-- =====================================================
-- Quando um registro de nfe_importadas é excluído:
-- - Reverte o estoque de todos os produtos (subtrai as quantidades importadas)
-- - Exclui produtos criados pela importação (estoque_anterior era 0 e estoque atual ficou 0)
-- - CASCADE FK exclui automaticamente:
--   * estoque_movimentos (via nfe_importada_id FK)
--   * contas (via nfe_importada_id FK)

CREATE OR REPLACE FUNCTION fn_cascade_delete_nfe_importada()
RETURNS TRIGGER AS $$
DECLARE
  v_estoque_count INTEGER;
  v_produtos_count INTEGER;
BEGIN
  -- 4a. REVERTER ESTOQUE: Subtrair quantidades importadas de cada produto
  UPDATE produtos p
  SET estoque_atual = GREATEST(0, COALESCE(p.estoque_atual, 0) - COALESCE(sub.qtd_total, 0))
  FROM (
    SELECT m.produto_id, SUM(m.quantidade) AS qtd_total
    FROM estoque_movimentos m
    WHERE m.nfe_importada_id = OLD.id
      AND m.tipo = 'entrada'
    GROUP BY m.produto_id
  ) sub
  WHERE p.id = sub.produto_id;

  GET DIAGNOSTICS v_estoque_count = ROW_COUNT;
  RAISE NOTICE 'fn_cascade_delete_nfe_importada: Estoque revertido para % produto(s)', v_estoque_count;

  -- 4b. EXCLUIR PRODUTOS criados por esta importação
  -- Critério: estoque_anterior era 0 ou NULL (produto não existia antes)
  -- E estoque_atual agora é 0 (tudo revertido, sem uso posterior)
  DELETE FROM produtos
  WHERE id IN (
    SELECT DISTINCT m.produto_id
    FROM estoque_movimentos m
    WHERE m.nfe_importada_id = OLD.id
      AND (m.estoque_anterior = 0 OR m.estoque_anterior IS NULL)
  )
  AND COALESCE(estoque_atual, 0) = 0;

  GET DIAGNOSTICS v_produtos_count = ROW_COUNT;
  RAISE NOTICE 'fn_cascade_delete_nfe_importada: Produtos excluídos: %', v_produtos_count;

  -- Nota: As seguintes exclusões são automáticas via ON DELETE CASCADE:
  -- - estoque_movimentos com nfe_importada_id = OLD.id
  -- - contas com nfe_importada_id = OLD.id

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger (substitui se já existir)
DROP TRIGGER IF EXISTS trg_cascade_delete_nfe_importada ON nfe_importadas;
CREATE TRIGGER trg_cascade_delete_nfe_importada
  BEFORE DELETE ON nfe_importadas
  FOR EACH ROW
  EXECUTE FUNCTION fn_cascade_delete_nfe_importada();

-- =====================================================
-- 5. TRIGGER: Auto-calcular preco_unidade
-- =====================================================
-- Quando um produto tem unidades_por_caixa > 0 e preco > 0,
-- calcula automaticamente preco_unidade = preco / unidades_por_caixa
-- (apenas se preco_unidade estiver zerado ou nulo)

CREATE OR REPLACE FUNCTION fn_calcular_preco_unidade()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.unidades_por_caixa, 0) > 0
     AND COALESCE(NEW.preco, 0) > 0
     AND COALESCE(NEW.preco_unidade, 0) = 0
  THEN
    NEW.preco_unidade := ROUND(NEW.preco / NEW.unidades_por_caixa, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcular_preco_unidade ON produtos;
CREATE TRIGGER trg_calcular_preco_unidade
  BEFORE INSERT OR UPDATE ON produtos
  FOR EACH ROW
  EXECUTE FUNCTION fn_calcular_preco_unidade();

-- =====================================================
-- 6. CORRIGIR DADOS EXISTENTES: preco_unidade zerado
-- =====================================================
-- Atualizar produtos que já possuem preco e unidades_por_caixa
-- mas têm preco_unidade zerado ou nulo
UPDATE produtos
SET preco_unidade = ROUND(preco / unidades_por_caixa, 2)
WHERE unidades_por_caixa > 0
  AND preco > 0
  AND (preco_unidade IS NULL OR preco_unidade = 0);

-- =====================================================
-- 7. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_estoque_movimentos_nfe_importada_id
  ON estoque_movimentos(nfe_importada_id)
  WHERE nfe_importada_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contas_nfe_importada_id
  ON contas(nfe_importada_id)
  WHERE nfe_importada_id IS NOT NULL;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
