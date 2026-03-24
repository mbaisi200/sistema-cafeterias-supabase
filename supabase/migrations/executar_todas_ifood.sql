-- =====================================================
-- MIGRATION COMPLETA: iFood + Delivery
-- Execute este script no SQL Editor do Supabase
-- Este script é IDEMPOTENTE (pode ser executado múltiplas vezes)
-- =====================================================

-- =====================================================
-- 1. TABELAS iFOOD
-- =====================================================

-- Tabela de configuração iFood
CREATE TABLE IF NOT EXISTS ifood_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,

  ativo BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),

  client_id VARCHAR(255),
  client_secret VARCHAR(255),
  merchant_id VARCHAR(255),

  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  sincronizar_produtos BOOLEAN DEFAULT true,
  sincronizar_estoque BOOLEAN DEFAULT true,
  sincronizar_precos BOOLEAN DEFAULT true,
  receber_pedidos_automatico BOOLEAN DEFAULT true,
  tempo_preparo_padrao INTEGER DEFAULT 30,

  total_pedidos_recebidos INTEGER DEFAULT 0,
  ultimo_pedido_em TIMESTAMP WITH TIME ZONE,

  ultimo_erro TEXT,
  ultimo_erro_em TIMESTAMP WITH TIME ZONE,

  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs iFood
CREATE TABLE IF NOT EXISTS ifood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'order_received', 'order_confirmed', 'order_preparation_started',
    'order_ready', 'order_dispatched', 'order_delivered', 'order_cancelled',
    'sync_product', 'sync_stock', 'sync_price', 'token_refresh', 'error',
    'webhook_received', 'api_call'
  )),

  order_id VARCHAR(100),
  pedido_externo_id VARCHAR(100),
  produto_id UUID,

  detalhes TEXT,
  dados JSONB,

  sucesso BOOLEAN DEFAULT true,
  erro TEXT,

  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de sincronização de produtos
CREATE TABLE IF NOT EXISTS ifood_produtos_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,

  ifood_product_id VARCHAR(100),
  ifood_external_code VARCHAR(100) NOT NULL,

  status VARCHAR(20) DEFAULT 'not_synced' CHECK (status IN ('synced', 'pending', 'error', 'not_synced', 'deleted')),
  ifood_status VARCHAR(20) CHECK (ifood_status IN ('AVAILABLE', 'UNAVAILABLE', 'HIDDEN')),

  ultimo_sync_em TIMESTAMP WITH TIME ZONE,
  erro_sync TEXT,

  preco_sincronizado DECIMAL(10,2),
  estoque_sincronizado DECIMAL(10,2),

  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(empresa_id, ifood_external_code)
);

-- Tabela de pedidos iFood
CREATE TABLE IF NOT EXISTS ifood_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,

  order_id VARCHAR(100) NOT NULL UNIQUE,
  short_order_number VARCHAR(20),
  display_id VARCHAR(50),

  customer_id VARCHAR(100),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  customer_document VARCHAR(20),
  customer_orders_count INTEGER DEFAULT 0,

  order_type VARCHAR(20) CHECK (order_type IN ('DELIVERY', 'TAKEOUT', 'INDOOR')),
  delivery_by VARCHAR(50),

  delivery_latitude DECIMAL(10,8),
  delivery_longitude DECIMAL(11,8),

  order_timing VARCHAR(50),
  estimated_delivery_time INTEGER,

  ifood_status VARCHAR(30),

  dados_completos JSONB,

  sincronizado BOOLEAN DEFAULT true,
  ultimo_sync_em TIMESTAMP WITH TIME ZONE,

  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABELA DE CONFIGURAÇÃO DE DELIVERY
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_delivery_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,

  delivery_ativo BOOLEAN DEFAULT true,
  retirada_ativo BOOLEAN DEFAULT true,

  taxa_entrega_padrao DECIMAL(10,2) DEFAULT 0,
  pedido_minimo DECIMAL(10,2) DEFAULT 0,

  tempo_preparo_min INTEGER DEFAULT 20,
  tempo_preparo_max INTEGER DEFAULT 45,

  aceita_dinheiro BOOLEAN DEFAULT true,
  aceita_cartao BOOLEAN DEFAULT true,
  aceita_pix BOOLEAN DEFAULT true,

  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. COLUNAS iFOOD NA TABELA PRODUTOS
-- =====================================================

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS disponivel_ifood BOOLEAN DEFAULT false;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ifood_external_code VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ifood_sync_status VARCHAR(20) DEFAULT 'not_synced' CHECK (ifood_sync_status IN ('synced', 'pending', 'error', 'not_synced'));
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ifood_product_id VARCHAR(100);

-- =====================================================
-- 4. ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ifood_config_empresa ON ifood_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ifood_config_merchant ON ifood_config(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ifood_logs_empresa ON ifood_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ifood_logs_tipo ON ifood_logs(tipo);
CREATE INDEX IF NOT EXISTS idx_ifood_logs_order ON ifood_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_ifood_logs_criado ON ifood_logs(criado_em);
CREATE INDEX IF NOT EXISTS idx_ifood_produtos_sync_empresa ON ifood_produtos_sync(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ifood_produtos_sync_produto ON ifood_produtos_sync(produto_id);
CREATE INDEX IF NOT EXISTS idx_ifood_produtos_sync_status ON ifood_produtos_sync(status);
CREATE INDEX IF NOT EXISTS idx_ifood_pedidos_empresa ON ifood_pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ifood_pedidos_venda ON ifood_pedidos(venda_id);
CREATE INDEX IF NOT EXISTS idx_ifood_pedidos_order ON ifood_pedidos(order_id);
CREATE INDEX IF NOT EXISTS idx_empresa_delivery_config_empresa ON empresa_delivery_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_ifood_external_code ON produtos(ifood_external_code);
CREATE INDEX IF NOT EXISTS idx_produtos_ifood_sync_status ON produtos(ifood_sync_status);
CREATE INDEX IF NOT EXISTS idx_produtos_disponivel_ifood ON produtos(disponivel_ifood);

-- =====================================================
-- 5. TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ifood_config_updated_at ON ifood_config;
CREATE TRIGGER update_ifood_config_updated_at
  BEFORE UPDATE ON ifood_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ifood_produtos_sync_updated_at ON ifood_produtos_sync;
CREATE TRIGGER update_ifood_produtos_sync_updated_at
  BEFORE UPDATE ON ifood_produtos_sync
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ifood_pedidos_updated_at ON ifood_pedidos;
CREATE TRIGGER update_ifood_pedidos_updated_at
  BEFORE UPDATE ON ifood_pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_empresa_delivery_config_updated_at ON empresa_delivery_config;
CREATE TRIGGER update_empresa_delivery_config_updated_at
  BEFORE UPDATE ON empresa_delivery_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

ALTER TABLE ifood_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifood_produtos_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifood_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_delivery_config ENABLE ROW LEVEL SECURITY;

-- Políticas para ifood_config (idempotentes)
DROP POLICY IF EXISTS "Usuários podem ver config iFood da sua empresa" ON ifood_config;
CREATE POLICY "Usuários podem ver config iFood da sua empresa"
  ON ifood_config FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins podem inserir config iFood" ON ifood_config;
CREATE POLICY "Admins podem inserir config iFood"
  ON ifood_config FOR INSERT
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

DROP POLICY IF EXISTS "Admins podem atualizar config iFood" ON ifood_config;
CREATE POLICY "Admins podem atualizar config iFood"
  ON ifood_config FOR UPDATE
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

-- Políticas para ifood_logs
DROP POLICY IF EXISTS "Usuários podem ver logs iFood da sua empresa" ON ifood_logs;
CREATE POLICY "Usuários podem ver logs iFood da sua empresa"
  ON ifood_logs FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Sistema pode inserir logs iFood" ON ifood_logs;
CREATE POLICY "Sistema pode inserir logs iFood"
  ON ifood_logs FOR INSERT
  WITH CHECK (true);

-- Políticas para ifood_produtos_sync
DROP POLICY IF EXISTS "Usuários podem ver sync iFood da sua empresa" ON ifood_produtos_sync;
CREATE POLICY "Usuários podem ver sync iFood da sua empresa"
  ON ifood_produtos_sync FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins podem gerenciar sync iFood" ON ifood_produtos_sync;
CREATE POLICY "Admins podem gerenciar sync iFood"
  ON ifood_produtos_sync FOR ALL
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

-- Políticas para ifood_pedidos
DROP POLICY IF EXISTS "Usuários podem ver pedidos iFood da sua empresa" ON ifood_pedidos;
CREATE POLICY "Usuários podem ver pedidos iFood da sua empresa"
  ON ifood_pedidos FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Sistema pode inserir pedidos iFood" ON ifood_pedidos;
CREATE POLICY "Sistema pode inserir pedidos iFood"
  ON ifood_pedidos FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins podem atualizar pedidos iFood" ON ifood_pedidos;
CREATE POLICY "Admins podem atualizar pedidos iFood"
  ON ifood_pedidos FOR UPDATE
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

-- Políticas para empresa_delivery_config
DROP POLICY IF EXISTS "Usuários podem ver config delivery da sua empresa" ON empresa_delivery_config;
CREATE POLICY "Usuários podem ver config delivery da sua empresa"
  ON empresa_delivery_config FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins podem gerenciar config delivery" ON empresa_delivery_config;
CREATE POLICY "Admins podem gerenciar config delivery"
  ON empresa_delivery_config FOR ALL
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- Verificar se tudo foi criado corretamente
SELECT 'Migration concluída! Verificando...' as status;

SELECT
  item,
  CASE
    WHEN status_check THEN '✅ OK'
    ELSE '❌ Erro'
  END as resultado
FROM (
  SELECT 'Tabela ifood_config' as item, EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ifood_config') as status_check
  UNION ALL
  SELECT 'Tabela ifood_logs', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ifood_logs')
  UNION ALL
  SELECT 'Tabela ifood_produtos_sync', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ifood_produtos_sync')
  UNION ALL
  SELECT 'Tabela ifood_pedidos', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ifood_pedidos')
  UNION ALL
  SELECT 'Tabela empresa_delivery_config', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresa_delivery_config')
  UNION ALL
  SELECT 'Coluna disponivel_ifood', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'disponivel_ifood')
  UNION ALL
  SELECT 'Coluna ifood_sync_status', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'ifood_sync_status')
) checks;
