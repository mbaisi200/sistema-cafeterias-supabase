-- =====================================================
-- MIGRAÇÃO: Corrigir tabela pedidos
-- - Adicionar colunas cliente_id e cliente_nome
-- - Habilitar RLS e criar políticas
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Adicionar colunas cliente_id e cliente_nome se não existirem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos' AND column_name = 'cliente_id'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos' AND column_name = 'cliente_nome'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN cliente_nome VARCHAR(255);
  END IF;
END $$;

-- 2. Criar índice para cliente_id
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);

-- 3. Habilitar RLS na tabela pedidos
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas existentes (se houver) para recriar
DROP POLICY IF EXISTS "Usuarios podem ver pedidos da empresa" ON pedidos;
DROP POLICY IF EXISTS "Usuarios podem criar pedidos na empresa" ON pedidos;
DROP POLICY IF EXISTS "Usuarios podem atualizar pedidos da empresa" ON pedidos;
DROP POLICY IF EXISTS "Usuarios podem deletar pedidos da empresa" ON pedidos;

-- 5. Criar políticas RLS
CREATE POLICY "Usuarios podem ver pedidos da empresa" ON pedidos
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

CREATE POLICY "Usuarios podem criar pedidos na empresa" ON pedidos
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

CREATE POLICY "Usuarios podem atualizar pedidos da empresa" ON pedidos
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

CREATE POLICY "Usuarios podem deletar pedidos da empresa" ON pedidos
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
-- FIM DA MIGRAÇÃO
-- =====================================================
