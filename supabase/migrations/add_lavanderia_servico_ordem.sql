-- =============================================================
-- Migration: Adicionar coluna 'ordem' na tabela de serviços da lavanderia
-- Permite ao admin definir a ordem das colunas na Matriz de Preços via drag & drop
-- A ordem é compartilhada entre todas as estações (salva no banco)
-- =============================================================

-- 1. Adicionar coluna ordem (default 0 para serviços existentes)
ALTER TABLE lavanderia_servicos_catalogo
  ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;

-- 2. Criar índice para ordenação eficiente
CREATE INDEX IF NOT EXISTS idx_lav_servicos_empresa_ordem
  ON lavanderia_servicos_catalogo(empresa_id, ordem);
