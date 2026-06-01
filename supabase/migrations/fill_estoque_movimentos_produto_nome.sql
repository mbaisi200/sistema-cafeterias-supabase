-- =====================================================
-- Preenche produto_nome em estoque_movimentos que estão NULL
-- =====================================================

UPDATE estoque_movimentos em
SET produto_nome = p.nome
FROM produtos p
WHERE em.produto_id = p.id
  AND (em.produto_nome IS NULL OR em.produto_nome = '');
