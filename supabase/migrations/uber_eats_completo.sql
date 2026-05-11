-- =====================================================
-- MIGRATION: Uber Eats
-- Execute no SQL Editor do Supabase (idempotente)
-- =====================================================

-- 1. TABELA DE CONFIGURAÇÃO
CREATE TABLE IF NOT EXISTS uber_eats_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,

  ativo BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),

  client_id VARCHAR(255),
  client_secret VARCHAR(255),
  merchant_uuid VARCHAR(255),

  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  sincronizar_produtos BOOLEAN DEFAULT true,
  sincronizar_estoque BOOLEAN DEFAULT true,
  sincronizar_precos BOOLEAN DEFAULT true,
  receber_pedidos_automatico BOOLEAN DEFAULT true,
  tempo_preparo_padrao INTEGER DEFAULT 30,

  webhook_secret VARCHAR(255),

  total_pedidos_recebidos INTEGER DEFAULT 0,
  ultimo_pedido_em TIMESTAMP WITH TIME ZONE,

  ultimo_erro TEXT,
  ultimo_erro_em TIMESTAMP WITH TIME ZONE,

  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE LOGS
CREATE TABLE IF NOT EXISTS uber_eats_logs (
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

-- 3. TABELA DE SINC DE PRODUTOS
CREATE TABLE IF NOT EXISTS uber_eats_produtos_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,

  uber_eats_product_id VARCHAR(100),
  uber_eats_external_code VARCHAR(100) NOT NULL,

  status VARCHAR(20) DEFAULT 'not_synced' CHECK (status IN ('synced', 'pending', 'error', 'not_synced', 'deleted')),
  uber_eats_status VARCHAR(20) CHECK (uber_eats_status IN ('AVAILABLE', 'UNAVAILABLE', 'HIDDEN')),

  ultimo_sync_em TIMESTAMP WITH TIME ZONE,
  erro_sync TEXT,

  preco_sincronizado DECIMAL(10,2),
  estoque_sincronizado DECIMAL(10,2),

  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(empresa_id, uber_eats_external_code)
);

-- 4. TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS uber_eats_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,

  order_id VARCHAR(100) NOT NULL UNIQUE,
  display_id VARCHAR(50),

  customer_id VARCHAR(100),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),

  order_type VARCHAR(20) CHECK (order_type IN ('DELIVERY', 'TAKEOUT')),

  delivery_address TEXT,
  delivery_latitude DECIMAL(10,8),
  delivery_longitude DECIMAL(11,8),

  order_timing VARCHAR(50),
  estimated_delivery_time INTEGER,

  uber_eats_status VARCHAR(30),
  dados_completos JSONB,

  sincronizado BOOLEAN DEFAULT true,
  ultimo_sync_em TIMESTAMP WITH TIME ZONE,

  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. COLUNAS NA TABELA PRODUTOS
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS disponivel_uber_eats BOOLEAN DEFAULT false;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS uber_eats_external_code VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS uber_eats_sync_status VARCHAR(20) DEFAULT 'not_synced' CHECK (uber_eats_sync_status IN ('synced', 'pending', 'error', 'not_synced'));
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS uber_eats_product_id VARCHAR(100);

-- 6. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_uber_config_empresa ON uber_eats_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_uber_logs_empresa ON uber_eats_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_uber_logs_tipo ON uber_eats_logs(tipo);
CREATE INDEX IF NOT EXISTS idx_uber_logs_order ON uber_eats_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_uber_logs_criado ON uber_eats_logs(criado_em);
CREATE INDEX IF NOT EXISTS idx_uber_produtos_sync_empresa ON uber_eats_produtos_sync(empresa_id);
CREATE INDEX IF NOT EXISTS idx_uber_produtos_sync_produto ON uber_eats_produtos_sync(produto_id);
CREATE INDEX IF NOT EXISTS idx_uber_produtos_sync_status ON uber_eats_produtos_sync(status);
CREATE INDEX IF NOT EXISTS idx_uber_pedidos_empresa ON uber_eats_pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_uber_pedidos_venda ON uber_eats_pedidos(venda_id);
CREATE INDEX IF NOT EXISTS idx_uber_pedidos_order ON uber_eats_pedidos(order_id);
CREATE INDEX IF NOT EXISTS idx_produtos_uber_external_code ON produtos(uber_eats_external_code);
CREATE INDEX IF NOT EXISTS idx_produtos_uber_sync_status ON produtos(uber_eats_sync_status);
CREATE INDEX IF NOT EXISTS idx_produtos_disponivel_uber ON produtos(disponivel_uber_eats);

-- 7. TRIGGERS UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_uber_config_updated_at ON uber_eats_config;
CREATE TRIGGER update_uber_config_updated_at
  BEFORE UPDATE ON uber_eats_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_uber_produtos_sync_updated_at ON uber_eats_produtos_sync;
CREATE TRIGGER update_uber_produtos_sync_updated_at
  BEFORE UPDATE ON uber_eats_produtos_sync
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_uber_pedidos_updated_at ON uber_eats_pedidos;
CREATE TRIGGER update_uber_pedidos_updated_at
  BEFORE UPDATE ON uber_eats_pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. RLS POLICIES
ALTER TABLE uber_eats_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE uber_eats_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE uber_eats_produtos_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE uber_eats_pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver config Uber Eats da sua empresa" ON uber_eats_config;
CREATE POLICY "Usuários podem ver config Uber Eats da sua empresa"
  ON uber_eats_config FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins podem inserir config Uber Eats" ON uber_eats_config;
CREATE POLICY "Admins podem inserir config Uber Eats"
  ON uber_eats_config FOR INSERT
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

DROP POLICY IF EXISTS "Admins podem atualizar config Uber Eats" ON uber_eats_config;
CREATE POLICY "Admins podem atualizar config Uber Eats"
  ON uber_eats_config FOR UPDATE
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

DROP POLICY IF EXISTS "Usuários podem ver logs Uber Eats da sua empresa" ON uber_eats_logs;
CREATE POLICY "Usuários podem ver logs Uber Eats da sua empresa"
  ON uber_eats_logs FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Sistema pode inserir logs Uber Eats" ON uber_eats_logs;
CREATE POLICY "Sistema pode inserir logs Uber Eats"
  ON uber_eats_logs FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem ver sync Uber Eats da sua empresa" ON uber_eats_produtos_sync;
CREATE POLICY "Usuários podem ver sync Uber Eats da sua empresa"
  ON uber_eats_produtos_sync FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins podem gerenciar sync Uber Eats" ON uber_eats_produtos_sync;
CREATE POLICY "Admins podem gerenciar sync Uber Eats"
  ON uber_eats_produtos_sync FOR ALL
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

DROP POLICY IF EXISTS "Usuários podem ver pedidos Uber Eats da sua empresa" ON uber_eats_pedidos;
CREATE POLICY "Usuários podem ver pedidos Uber Eats da sua empresa"
  ON uber_eats_pedidos FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Sistema pode inserir pedidos Uber Eats" ON uber_eats_pedidos;
CREATE POLICY "Sistema pode inserir pedidos Uber Eats"
  ON uber_eats_pedidos FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins podem atualizar pedidos Uber Eats" ON uber_eats_pedidos;
CREATE POLICY "Admins podem atualizar pedidos Uber Eats"
  ON uber_eats_pedidos FOR UPDATE
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

-- =====================================================
-- FIM
-- =====================================================

SELECT 'Migration Uber Eats concluída!' as status;

SELECT
  item,
  CASE WHEN status_check THEN '✅ OK' ELSE '❌ Erro' END as resultado
FROM (
  SELECT 'Tabela uber_eats_config' as item, EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uber_eats_config') as status_check
  UNION ALL
  SELECT 'Tabela uber_eats_logs', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uber_eats_logs')
  UNION ALL
  SELECT 'Tabela uber_eats_produtos_sync', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uber_eats_produtos_sync')
  UNION ALL
  SELECT 'Tabela uber_eats_pedidos', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uber_eats_pedidos')
  UNION ALL
  SELECT 'Coluna disponivel_uber_eats', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'disponivel_uber_eats')
  UNION ALL
  SELECT 'Coluna uber_eats_sync_status', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'uber_eats_sync_status')
) checks;
