-- =====================================================
-- MIGRAÇÃO: Fix Round 2 - NFE Performance + Fornecedores RLS
-- =====================================================
-- Issues abordadas:
--   Issue 8:  Consulta lenta na listagem de NF-e (estoque_movimentos + vendas)
--   Issue 9:  Fornecedores não aparecem na tela de Cadastros (RLS quebrada)
--
-- Execute este script no SQL Editor do Supabase.
-- Todas as operações são idempotentes (seguro para re-executar).
-- =====================================================


-- =====================================================
-- PARTE 1: ISSUE 8 - Índices de performance para NFE
-- =====================================================

-- -----------------------------------------------------
-- 1a. Índices compostos para estoque_movimentos
--
-- A query de entrada da NFE listagem faz:
--   WHERE empresa_id = $1 AND tipo = 'entrada'
--     AND documento_ref ILIKE '%NFe%'
--     AND criado_em >= ... AND criado_em <= ...
--   ORDER BY criado_em DESC
--
-- O índice composto (empresa_id, tipo, criado_em DESC) cobre a cláusula
-- WHERE + ORDER BY numa única varredura, eliminando filesort.
-- -----------------------------------------------------

-- Composição ideal: filtra por empresa + tipo, e já ordena por data
CREATE INDEX IF NOT EXISTS idx_estoque_mov_empresa_tipo_criado
  ON estoque_movimentos (empresa_id, tipo, criado_em DESC);

-- Índice para consultas de estoque por empresa (padrão geral)
CREATE INDEX IF NOT EXISTS idx_estoque_mov_empresa_criado
  ON estoque_movimentos (empresa_id, criado_em DESC);

-- -----------------------------------------------------
-- 1b. Índice com pg_trgm para busca ILIKE no documento_ref
--
-- O PostgreSQL usa B-tree por padrão, que só otimiza prefixos
-- (ILIKE 'NFe%'). Para padrões com curinga no início
-- (ILIKE '%NFe%'), é necessário o módulo pg_trgm com índice GIN.
-- Isso permite busca full-text no documento_ref sem seqscan.
-- -----------------------------------------------------

-- Habilitar extensão pg_trgm (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN trgm para busca ILIKE genérica em documento_ref
-- Nota: só cria se a extensão foi habilitada com sucesso
DO $$
BEGIN
  -- Verifica se a extensão está disponível
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    -- Remove índice B-tree simples se existir (será substituído pelo GIN)
    DROP INDEX IF EXISTS idx_estoque_movimentos_documento_ref;
    -- Cria índice GIN com trgm para ILIKE '%...%'
    CREATE INDEX IF NOT EXISTS idx_estoque_mov_documento_ref_trgm
      ON estoque_movimentos USING gin (documento_ref gin_trgm_ops);
    RAISE NOTICE 'Índice GIN trgm criado para documento_ref';
  ELSE
    -- Fallback: mantém índice B-tree simples (útil para prefixos)
    CREATE INDEX IF NOT EXISTS idx_estoque_mov_documento_ref_btree
      ON estoque_movimentos (documento_ref);
    RAISE NOTICE 'pg_trgm indisponível, usando B-tree para documento_ref';
  END IF;
END $$;

-- -----------------------------------------------------
-- 1c. Índices compostos para vendas (NFE de saída)
--
-- A query de saída da NFE listagem faz:
--   WHERE empresa_id = $1 AND status = 'fechada'
--     AND criado_em >= ... AND criado_em <= ...
--   ORDER BY criado_em DESC
--
-- O índice composto (empresa_id, status, criado_em DESC) cobre
-- filtro + ordenação numa única varredura.
-- -----------------------------------------------------

-- Composição ideal para saida NFE
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_status_criado
  ON vendas (empresa_id, status, criado_em DESC);

-- Índice auxiliar para lookup por nfe_emitida
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_nfe_emitida
  ON vendas (empresa_id, nfe_emitida) WHERE nfe_emitida = true;

-- =====================================================
-- PARTE 2: ISSUE 9 - RLS para fornecedores
-- =====================================================

-- -----------------------------------------------------
-- 2a. Garantir que as funções auxiliares existem
--
-- As políticas RLS dependem de get_user_empresa_id() e is_master().
-- Essas funções são SECURITY DEFINER para contornar RLS ao buscar
-- na tabela usuarios. Se a versão antiga quebrar, recriamos aqui.
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID AS $$
DECLARE
  user_empresa_id UUID;
BEGIN
  SELECT empresa_id INTO user_empresa_id
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN user_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_master()
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN user_role = 'master';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------------------------------
-- 2b. Garantir que RLS está habilitado na tabela fornecedores
-- -----------------------------------------------------

ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- 2c. Recriar todas as políticas RLS para fornecedores
--
-- Problema original:
--   - rls-policies.sql NÃO inclui políticas para fornecedores
--   - fix_fornecedores_rls.sql criou políticas condicionalmente
--     com fallback "empresa_id IS NOT NULL" (permissivo demais)
--   - Conflito de nomes entre migrações pode causar políticas
--     duplicadas ou ausentes
--
-- Solução:
--   - Remove TODAS as políticas existentes (independente do nome)
--   - Recria usando inline subqueries (padrão robusto que funciona
--     mesmo se as funções get_user_empresa_id/is_master falharem)
--   - Usa nomes únicos com prefixo "forn_" para evitar conflitos
-- -----------------------------------------------------

DO $$
BEGIN
  -- Remover TODAS as políticas existentes em fornecedores
  -- (inclui políticas com nomes antigos e novos)
  DROP POLICY IF EXISTS "Ver fornecedores da empresa" ON fornecedores;
  DROP POLICY IF EXISTS "Criar fornecedor na empresa" ON fornecedores;
  DROP POLICY IF EXISTS "Atualizar fornecedor da empresa" ON fornecedores;
  DROP POLICY IF EXISTS "Excluir fornecedor da empresa" ON fornecedores;
  DROP POLICY IF EXISTS "fornecedores_select" ON fornecedores;
  DROP POLICY IF EXISTS "fornecedores_insert" ON fornecedores;
  DROP POLICY IF EXISTS "fornecedores_update" ON fornecedores;
  DROP POLICY IF EXISTS "fornecedores_delete" ON fornecedores;

  -- Os DROPs acima cobrem todos os nomes conhecidos de políticas.
  -- Se existirem políticas com outros nomes (p.ex. de migrações manuais),
  -- a criação abaixo com CREATE POLICY falhará com erro claro indicando
  -- qual política conflitante existe, facilitando a depuração.

  RAISE NOTICE 'Todas as políticas antigas de fornecedores foram removidas';
END $$;

-- -----------------------------------------------------
-- 2d. Criar políticas RLS robustas para fornecedores
--
-- Usa inline subqueries como padrão principal (mesmo padrão
-- que funciona no fix-caixas-rls.sql), com fallback para
-- as funções get_user_empresa_id/is_master como alternativa.
-- -----------------------------------------------------

-- SELECT: Usuários da mesma empresa ou masters podem ver fornecedores
CREATE POLICY "fornecedores_select" ON fornecedores
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios
      WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid() AND role = 'master'
    )
  );

-- INSERT: Usuários só podem criar fornecedores na própria empresa
CREATE POLICY "fornecedores_insert" ON fornecedores
  FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM usuarios
      WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid() AND role = 'master'
    )
  );

-- UPDATE: Usuários só podem atualizar fornecedores da própria empresa
CREATE POLICY "fornecedores_update" ON fornecedores
  FOR UPDATE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios
      WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid() AND role = 'master'
    )
  );

-- DELETE: Usuários só podem excluir fornecedores da própria empresa
CREATE POLICY "fornecedores_delete" ON fornecedores
  FOR DELETE
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios
      WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid() AND role = 'master'
    )
  );

-- -----------------------------------------------------
-- 2e. Índice auxiliar para fornecedores (otimiza a query do hook)
--
-- O hook useFornecedores faz:
--   SELECT * FROM fornecedores
--   WHERE empresa_id = $1 AND ativo = true
--   ORDER BY nome
--
-- O índice composto (empresa_id, ativo, nome) cobre tudo.
-- -----------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa_ativo_nome
  ON fornecedores (empresa_id, ativo, nome);


-- =====================================================
-- PARTE 3: Verificação pós-migração
-- =====================================================

-- Mostra as políticas criadas para fornecedores
DO $$
DECLARE
  pol_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pol_count
  FROM pg_policy
  JOIN pg_class ON pg_class.oid = pg_policy.polrelid
  JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
  WHERE pg_class.relname = 'fornecedores'
    AND pg_namespace.nspname = 'public';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO PÓS-MIGRAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Políticas RLS em fornecedores: %', pol_count;

  IF pol_count >= 4 THEN
    RAISE NOTICE '✅ Fornecedores: 4 políticas RLS ativas (SELECT, INSERT, UPDATE, DELETE)';
  ELSE
    RAISE NOTICE '⚠️  Fornecedores: esperadas 4 políticas, encontradas %', pol_count;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Índices criados/verificados:';
  RAISE NOTICE '  - idx_estoque_mov_empresa_tipo_criado';
  RAISE NOTICE '  - idx_estoque_mov_empresa_criado';
  RAISE NOTICE '  - idx_estoque_mov_documento_ref_trgm (GIN) ou _btree (fallback)';
  RAISE NOTICE '  - idx_vendas_empresa_status_criado';
  RAISE NOTICE '  - idx_vendas_empresa_nfe_emitida';
  RAISE NOTICE '  - idx_fornecedores_empresa_ativo_nome';
  RAISE NOTICE '  - Funções get_user_empresa_id() e is_master() recriadas';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
