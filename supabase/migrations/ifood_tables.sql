-- =====================================================
-- MIGRATION: TABELAS iFOOD
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- =====================================================
-- 1. TABELA: IFOOD_CONFIG
-- Configuração da integração iFood por empresa
-- =====================================================
CREATE TABLE IF NOT EXISTS ifood_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  
  -- Status
  ativo BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  
  -- Credenciais iFood
  client_id VARCHAR(255),
  client_secret VARCHAR(255),
  merchant_id VARCHAR(255),
  
  -- Tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Configurações de sincronização
  sincronizar_produtos BOOLEAN DEFAULT true,
  sincronizar_estoque BOOLEAN DEFAULT true,
  sincronizar_precos BOOLEAN DEFAULT true,
  receber_pedidos_automatico BOOLEAN DEFAULT true,
  tempo_preparo_padrao INTEGER DEFAULT 30,
  
  -- Estatísticas
  total_pedidos_recebidos INTEGER DEFAULT 0,
  ultimo_pedido_em TIMESTAMP WITH TIME ZONE,
  
  -- Controle de erros
  ultimo_erro TEXT,
  ultimo_erro_em TIMESTAMP WITH TIME ZONE,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABELA: IFOOD_LOGS
-- Logs de eventos da integração iFood
-- =====================================================
CREATE TABLE IF NOT EXISTS ifood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Tipo do evento
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'order_received', 
    'order_confirmed', 
    'order_preparation_started',
    'order_ready',
    'order_dispatched',
    'order_delivered',
    'order_cancelled',
    'sync_product', 
    'sync_stock', 
    'sync_price',
    'token_refresh',
    'error',
    'webhook_received',
    'api_call'
  )),
  
  -- Referências
  order_id VARCHAR(100),
  pedido_externo_id VARCHAR(100),
  produto_id UUID,
  
  -- Detalhes
  detalhes TEXT,
  dados JSONB,
  
  -- Status
  sucesso BOOLEAN DEFAULT true,
  erro TEXT,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABELA: IFOOD_PRODUTOS_SYNC
-- Sincronização de produtos com iFood
-- =====================================================
CREATE TABLE IF NOT EXISTS ifood_produtos_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  
  -- IDs no iFood
  ifood_product_id VARCHAR(100),
  ifood_external_code VARCHAR(100) NOT NULL,
  
  -- Status de sincronização
  status VARCHAR(20) DEFAULT 'not_synced' CHECK (status IN ('synced', 'pending', 'error', 'not_synced', 'deleted')),
  ifood_status VARCHAR(20) CHECK (ifood_status IN ('AVAILABLE', 'UNAVAILABLE', 'HIDDEN')),
  
  -- Controle
  ultimo_sync_em TIMESTAMP WITH TIME ZONE,
  erro_sync TEXT,
  
  -- Preço sincronizado (para controle)
  preco_sincronizado DECIMAL(10,2),
  estoque_sincronizado DECIMAL(10,2),
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(empresa_id, ifood_external_code)
);

-- =====================================================
-- 4. TABELA: IFOOD_PEDIDOS
-- Detalhes extras dos pedidos iFood
-- =====================================================
CREATE TABLE IF NOT EXISTS ifood_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  
  -- IDs iFood
  order_id VARCHAR(100) NOT NULL UNIQUE,
  short_order_number VARCHAR(20),
  display_id VARCHAR(50),
  
  -- Dados do cliente iFood
  customer_id VARCHAR(100),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  customer_document VARCHAR(20),
  customer_orders_count INTEGER DEFAULT 0,
  
  -- Tipo de pedido
  order_type VARCHAR(20) CHECK (order_type IN ('DELIVERY', 'TAKEOUT', 'INDOOR')),
  delivery_by VARCHAR(50), -- IFOOD ou nome do restaurante
  
  -- Coordenadas de entrega
  delivery_latitude DECIMAL(10,8),
  delivery_longitude DECIMAL(11,8),
  
  -- Timing
  order_timing VARCHAR(50),
  estimated_delivery_time INTEGER, -- minutos
  
  -- Status iFood
  ifood_status VARCHAR(30),
  
  -- Dados completos do pedido (JSON)
  dados_completos JSONB,
  
  -- Controle de sincronização
  sincronizado BOOLEAN DEFAULT true,
  ultimo_sync_em TIMESTAMP WITH TIME ZONE,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
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

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================
CREATE TRIGGER update_ifood_config_updated_at 
  BEFORE UPDATE ON ifood_config 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ifood_produtos_sync_updated_at 
  BEFORE UPDATE ON ifood_produtos_sync 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ifood_pedidos_updated_at 
  BEFORE UPDATE ON ifood_pedidos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE ifood_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifood_produtos_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifood_pedidos ENABLE ROW LEVEL SECURITY;

-- Políticas para ifood_config
CREATE POLICY "Usuários podem ver config iFood da sua empresa" 
  ON ifood_config FOR SELECT 
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins podem inserir config iFood" 
  ON ifood_config FOR INSERT 
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

CREATE POLICY "Admins podem atualizar config iFood" 
  ON ifood_config FOR UPDATE 
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

-- Políticas para ifood_logs
CREATE POLICY "Usuários podem ver logs iFood da sua empresa" 
  ON ifood_logs FOR SELECT 
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Sistema pode inserir logs iFood" 
  ON ifood_logs FOR INSERT 
  WITH CHECK (true);

-- Políticas para ifood_produtos_sync
CREATE POLICY "Usuários podem ver sync iFood da sua empresa" 
  ON ifood_produtos_sync FOR SELECT 
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins podem gerenciar sync iFood" 
  ON ifood_produtos_sync FOR ALL 
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

-- Políticas para ifood_pedidos
CREATE POLICY "Usuários podem ver pedidos iFood da sua empresa" 
  ON ifood_pedidos FOR SELECT 
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Sistema pode inserir pedidos iFood" 
  ON ifood_pedidos FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins podem atualizar pedidos iFood" 
  ON ifood_pedidos FOR UPDATE 
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
