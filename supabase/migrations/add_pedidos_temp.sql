-- =====================================================
-- MIGRAÇÃO: Adicionar tabela pedidos_temp
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- =====================================================
-- 1. TABELA: PEDIDOS_TEMP (para pedidos temporários de mesa/delivery)
-- =====================================================
CREATE TABLE IF NOT EXISTS pedidos_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Tipo de venda
  tipo_venda VARCHAR(20) NOT NULL CHECK (tipo_venda IN ('balcao', 'mesa', 'delivery', 'comanda')),
  
  -- Relacionamentos
  mesa_id UUID REFERENCES mesas(id) ON DELETE SET NULL,
  mesa_numero INTEGER,
  delivery_id VARCHAR(100),
  delivery_info JSONB,
  
  -- Produto
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  quantidade DECIMAL(10,2) NOT NULL DEFAULT 1,
  
  -- Atendente
  atendente_id UUID,
  atendente_nome VARCHAR(255),
  
  -- Cliente (opcional)
  cliente VARCHAR(255),
  observacao TEXT,
  
  -- Timestamps
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ADICIONAR COLUNA ENDEREÇO NA TABELA EMPRESAS
-- =====================================================
-- Adiciona coluna endereco se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'empresas' AND column_name = 'endereco'
  ) THEN
    ALTER TABLE empresas ADD COLUMN endereco TEXT;
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_temp_empresa ON pedidos_temp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_temp_mesa ON pedidos_temp(mesa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_temp_delivery ON pedidos_temp(delivery_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_temp_tipo ON pedidos_temp(tipo_venda);

-- Trigger para atualizar timestamp
CREATE TRIGGER update_pedidos_temp_updated_at 
BEFORE UPDATE ON pedidos_temp 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS na tabela
ALTER TABLE pedidos_temp ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - usuários podem ver pedidos da sua empresa
CREATE POLICY "Usuários podem ver pedidos da sua empresa" ON pedidos_temp
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

-- Política para INSERT - usuários podem criar pedidos na sua empresa
CREATE POLICY "Usuários podem criar pedidos na sua empresa" ON pedidos_temp
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

-- Política para UPDATE - usuários podem atualizar pedidos da sua empresa
CREATE POLICY "Usuários podem atualizar pedidos da sua empresa" ON pedidos_temp
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

-- Política para DELETE - usuários podem deletar pedidos da sua empresa
CREATE POLICY "Usuários podem deletar pedidos da sua empresa" ON pedidos_temp
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
