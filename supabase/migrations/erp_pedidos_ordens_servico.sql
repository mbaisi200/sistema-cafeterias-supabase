-- =====================================================
-- MIGRATION: ERP Pedidos & Ordens de Serviço
-- Adapta pedidos do gestao-pro-erp e cria ordens_servico
-- =====================================================

-- =====================================================
-- 1a. Drop existing pedidos table
-- =====================================================
DROP TABLE IF EXISTS pedidos CASCADE;

-- =====================================================
-- 1b. Create new pedidos table
-- =====================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,

  -- Cliente
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(255),

  -- Vendedor
  vendedor_id UUID,
  vendedor_nome VARCHAR(255),

  -- Valores
  subtotal DECIMAL(10,2) DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,

  -- Status e datas
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'convertido', 'cancelado')),
  forma_pagamento VARCHAR(50),
  condicao_pagamento VARCHAR(50),
  prazo_entrega DATE,
  observacoes TEXT,

  -- Relacionamentos
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,

  -- Itens (JSONB para flexibilidade)
  itens JSONB DEFAULT '[]',
  -- Each item: { produtoId, produtoNome, quantidade, precoUnitario, desconto, total }

  -- Controle
  criado_por UUID,
  criado_por_nome VARCHAR(255),
  data_aprovacao TIMESTAMPTZ,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 1c. Create ordens_servico table
-- =====================================================
CREATE TABLE IF NOT EXISTS ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,

  -- Cliente
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(255),

  -- Descrição
  descricao TEXT NOT NULL,

  -- Serviços (JSONB array)
  servicos JSONB DEFAULT '[]',
  -- Each: { descricao, quantidade, valorUnitario, total }

  -- Produtos usados (JSONB array, optional)
  produtos JSONB DEFAULT '[]',

  -- Valores
  valor_servicos DECIMAL(10,2) DEFAULT 0,
  valor_produtos DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(10,2) DEFAULT 0,

  -- Status e datas
  status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'aprovada', 'cancelada', 'convertida')),
  ativo BOOLEAN DEFAULT true,
  data_abertura TIMESTAMPTZ DEFAULT NOW(),
  data_previsao DATE,
  data_conclusao TIMESTAMPTZ,
  data_aprovacao TIMESTAMPTZ,

  -- Técnico
  tecnico VARCHAR(255),

  -- Observações
  observacoes TEXT,

  -- Conversão para venda
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  data_conversao TIMESTAMPTZ,

  -- Parcelas (JSONB array, optional)
  parcelas JSONB DEFAULT '[]',
  -- Each: { numero, valor, vencimento, status }

  -- Controle
  criado_por UUID,
  criado_por_nome VARCHAR(255),

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 1d. Create indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa ON pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(empresa_id, numero);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_empresa ON ordens_servico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_numero ON ordens_servico(empresa_id, numero);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_cliente ON ordens_servico(cliente_id);

-- =====================================================
-- 1e. Enable RLS and create policies
-- =====================================================

-- Pedidos RLS
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios podem ver pedidos da empresa" ON pedidos;
DROP POLICY IF EXISTS "Usuarios podem criar pedidos na empresa" ON pedidos;
DROP POLICY IF EXISTS "Usuarios podem atualizar pedidos da empresa" ON pedidos;
DROP POLICY IF EXISTS "Usuarios podem deletar pedidos da empresa" ON pedidos;

CREATE POLICY "Usuarios podem ver pedidos da empresa" ON pedidos
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Usuarios podem criar pedidos na empresa" ON pedidos
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Usuarios podem atualizar pedidos da empresa" ON pedidos
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Usuarios podem deletar pedidos da empresa" ON pedidos
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- Ordens de Serviço RLS
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios podem ver ordens_servico da empresa" ON ordens_servico;
DROP POLICY IF EXISTS "Usuarios podem criar ordens_servico na empresa" ON ordens_servico;
DROP POLICY IF EXISTS "Usuarios podem atualizar ordens_servico da empresa" ON ordens_servico;
DROP POLICY IF EXISTS "Usuarios podem deletar ordens_servico da empresa" ON ordens_servico;

CREATE POLICY "Usuarios podem ver ordens_servico da empresa" ON ordens_servico
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Usuarios podem criar ordens_servico na empresa" ON ordens_servico
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Usuarios podem atualizar ordens_servico da empresa" ON ordens_servico
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Usuarios podem deletar ordens_servico da empresa" ON ordens_servico
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 1f. Add 'ordens-servico' to secoes_menu
-- =====================================================
INSERT INTO secoes_menu (chave, nome, descricao, icone, url, grupo, ordem, ativo, obrigatoria, visivel_para) VALUES
  ('ordens-servico', 'Ordens de Serviço', 'Gestão de ordens de serviço (OS)', 'Wrench', '/admin/ordens-servico', 'principal', 8, true, false, ARRAY['admin'])
ON CONFLICT (chave) DO NOTHING;

-- Update pedidos description
UPDATE secoes_menu SET descricao = 'Orçamentos e pré-vendas (ERP)' WHERE chave = 'pedidos';

-- =====================================================
-- 1g. Add trigger for atualizado_em
-- =====================================================
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ordens_servico_updated_at BEFORE UPDATE ON ordens_servico FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
