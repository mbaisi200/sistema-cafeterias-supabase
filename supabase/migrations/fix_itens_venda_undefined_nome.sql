-- Remove prefixo 'undefined - ' dos nomes de itens_venda
-- Causa: bug anterior onde concatenava undefined + nome do produto

UPDATE itens_venda
SET nome = REPLACE(nome, 'undefined - ', '')
WHERE nome LIKE 'undefined -%';
