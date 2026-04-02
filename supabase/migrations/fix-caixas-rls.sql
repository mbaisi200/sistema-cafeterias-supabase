-- =====================================================
-- CORREÇÃO: Políticas RLS para tabelas caixas e movimentacoes_caixa
-- Execute este script no SQL Editor do Supabase
-- 
-- Problema: As políticas originais usavam funções auxiliares 
-- (get_user_empresa_id / is_master) que podem não existir.
-- Solução: Recriar as políticas usando subqueries inline 
-- (mesmo padrão que funciona no pedidos_temp).
-- =====================================================

-- 1. Garantir que as funções auxiliares existem
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

-- 2. Remover políticas antigas que podem estar quebradas
DO $$
BEGIN
  -- Remover políticas existentes de caixas (ignora erro se não existir)
  DROP POLICY IF EXISTS "Ver caixas da empresa" ON caixas;
  DROP POLICY IF EXISTS "Criar caixa na empresa" ON caixas;
  DROP POLICY IF EXISTS "Atualizar caixa da empresa" ON caixas;
  DROP POLICY IF EXISTS "Excluir caixa da empresa" ON caixas;
  
  -- Remover políticas existentes de movimentacoes_caixa
  DROP POLICY IF EXISTS "Ver movimentacoes da empresa" ON movimentacoes_caixa;
  DROP POLICY IF EXISTS "Criar movimentacao na empresa" ON movimentacoes_caixa;
  DROP POLICY IF EXISTS "Atualizar movimentacao da empresa" ON movimentacoes_caixa;
  DROP POLICY IF EXISTS "Excluir movimentacao da empresa" ON movimentacoes_caixa;
  
  RAISE NOTICE 'Políticas antigas removidas';
END $$;

-- 3. Garantir que RLS está habilitado
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_caixa ENABLE ROW LEVEL SECURITY;

-- 4. Criar novas políticas para CAIXAS (usando subqueries inline)
CREATE POLICY "caixas_select_empresa" ON caixas
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

CREATE POLICY "caixas_insert_empresa" ON caixas
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

CREATE POLICY "caixas_update_empresa" ON caixas
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

CREATE POLICY "caixas_delete_empresa" ON caixas
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

-- 5. Criar novas políticas para MOVIMENTACOES_CAIXA (usando subqueries inline)
CREATE POLICY "mov_caixas_select_empresa" ON movimentacoes_caixa
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

CREATE POLICY "mov_caixas_insert_empresa" ON movimentacoes_caixa
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

CREATE POLICY "mov_caixas_update_empresa" ON movimentacoes_caixa
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

CREATE POLICY "mov_caixas_delete_empresa" ON movimentacoes_caixa
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

-- =====================================================
-- FIM DA CORREÇÃO
-- =====================================================
