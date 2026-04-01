-- =====================================================
-- MIGRATION: Corrigir campos faltantes em PRODUTOS
-- Data: 2025
-- Execute este script no SQL Editor do Supabase
-- =====================================================
-- 
-- Problemas corrigidos:
-- 1. Coluna combo_preco faltante
-- 2. Coluna unidades_por_caixa faltante  
-- 3. Coluna preco_unidade faltante
-- 4. CHECK constraint de unidade não inclui 'cx'
-- 5. RLS para pedidos_temp
-- 6. RLS para combo_itens
-- 7. RLS para tabela clientes
--

-- =====================================================
-- 1. ADICIONAR COLUNAS FALTANTES EM PRODUTOS
-- =====================================================

-- combo_preco: preço especial para combos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS combo_preco DECIMAL(10,2) DEFAULT 0;
COMMENT ON COLUMN produtos.combo_preco IS 'Preço especial quando o produto é vendido como combo';

-- unidades_por_caixa: quantidade de unidades por caixa
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidades_por_caixa INTEGER DEFAULT 0;
COMMENT ON COLUMN produtos.unidades_por_caixa IS 'Quantidade de unidades contidas em uma caixa do produto';

-- preco_unidade: preço por unidade (quando vendido por caixa)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_unidade DECIMAL(10,2) DEFAULT 0;
COMMENT ON COLUMN produtos.preco_unidade IS 'Preço unitário do produto (usado quando vendido por caixa)';

-- =====================================================
-- 2. CORRIGIR CHECK CONSTRAINT DE UNIDADE
-- =====================================================
-- A constraint original só permite: 'un', 'kg', 'lt', 'ml', 'g', 'mg'
-- Precisamos adicionar 'cx' (caixa) que é usado no formulário

-- Remover constraint antiga e recriar com 'cx' incluso
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_unidade_check;
ALTER TABLE produtos ADD CONSTRAINT produtos_unidade_check 
  CHECK (unidade IN ('un', 'kg', 'lt', 'ml', 'g', 'mg', 'cx'));

-- =====================================================
-- 3. CAMPOS NFE/NFCe (garantir que existam)
-- =====================================================
-- Estes podem já existir de migrations anteriores, mas garantimos:

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(20);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ncm VARCHAR(8) DEFAULT '00000000';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cest VARCHAR(7) DEFAULT '';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cfop VARCHAR(4) DEFAULT '5102';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cst VARCHAR(3) DEFAULT '00';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS csosn VARCHAR(3) DEFAULT '102';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS origem VARCHAR(1) DEFAULT '0';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidade_tributavel VARCHAR(6) DEFAULT 'UN';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS icms DECIMAL(5,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ipi_aliquota DECIMAL(5,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS pis_aliquota DECIMAL(5,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cofins_aliquota DECIMAL(5,2) DEFAULT 0;

-- iFood fields (garantir)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS disponivel_ifood BOOLEAN DEFAULT false;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ifood_external_code VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ifood_sync_status VARCHAR(20) DEFAULT 'not_synced';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ifood_product_id VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;

-- =====================================================
-- 4. CAMPOS FALTANTES EM VENDAS
-- =====================================================
-- Garantir que cliente_id e cpf_cliente existam
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cpf_cliente VARCHAR(14);

-- =====================================================
-- 5. RLS PARA TABELAS FALTANTES
-- =====================================================

-- Verificar se tabela pedidos_temp existe e aplicar RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pedidos_temp') THEN
    ALTER TABLE pedidos_temp ENABLE ROW LEVEL SECURITY;
    
    -- Remover políticas existentes se houver
    DROP POLICY IF EXISTS "Ver pedidos_temp da empresa" ON pedidos_temp;
    DROP POLICY IF EXISTS "Criar pedido_temp na empresa" ON pedidos_temp;
    DROP POLICY IF EXISTS "Atualizar pedido_temp da empresa" ON pedidos_temp;
    DROP POLICY IF EXISTS "Excluir pedido_temp da empresa" ON pedidos_temp;
    
    CREATE POLICY "Ver pedidos_temp da empresa" ON pedidos_temp
      FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Criar pedido_temp na empresa" ON pedidos_temp
      FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Atualizar pedido_temp da empresa" ON pedidos_temp
      FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Excluir pedido_temp da empresa" ON pedidos_temp
      FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());
    
    RAISE NOTICE 'RLS aplicada em pedidos_temp';
  ELSE
    RAISE NOTICE 'Tabela pedidos_temp não encontrada';
  END IF;
END $$;

-- Garantir RLS em combo_itens
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'combo_itens') THEN
    -- combo_itens já deve ter RLS da migration add_combos.sql
    -- Mas garantimos que as políticas estejam corretas
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'combo_itens' AND policyname = 'Ver combo_itens da empresa') THEN
      CREATE POLICY "Ver combo_itens da empresa" ON combo_itens
        FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());
      CREATE POLICY "Criar combo_item na empresa" ON combo_itens
        FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());
      CREATE POLICY "Atualizar combo_item da empresa" ON combo_itens
        FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());
      CREATE POLICY "Excluir combo_item da empresa" ON combo_itens
        FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());
    END IF;
    RAISE NOTICE 'RLS verificada em combo_itens';
  END IF;
END $$;

-- Garantir RLS em clientes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Ver clientes da empresa') THEN
      ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Ver clientes da empresa" ON clientes
        FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());
      CREATE POLICY "Criar cliente na empresa" ON clientes
        FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());
      CREATE POLICY "Atualizar cliente da empresa" ON clientes
        FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());
      CREATE POLICY "Excluir cliente da empresa" ON clientes
        FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());
    END IF;
    RAISE NOTICE 'RLS verificada em clientes';
  END IF;
END $$;

-- =====================================================
-- 6. ÍNDICES ADICIONAIS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_produtos_combo ON produtos(is_combo);
CREATE INDEX IF NOT EXISTS idx_produtos_unidades_por_caixa ON produtos(unidades_por_caixa);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
