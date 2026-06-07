-- =====================================================
-- MIGRATION: Adicionar integração 99Food (Open Delivery)
-- =====================================================

-- 1. Configuração da integração 99Food
CREATE TABLE IF NOT EXISTS public.noventa_e_nove_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  client_id TEXT,
  client_secret TEXT,
  merchant_id TEXT,
  api_base_url TEXT DEFAULT 'https://api.99food.com/open-delivery/v1',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  webhook_secret TEXT,
  sincronizar_produtos BOOLEAN DEFAULT true,
  sincronizar_estoque BOOLEAN DEFAULT true,
  sincronizar_precos BOOLEAN DEFAULT true,
  receber_pedidos_automatico BOOLEAN DEFAULT true,
  tempo_preparo_padrao INTEGER DEFAULT 30,
  total_pedidos_recebidos INTEGER DEFAULT 0,
  ultimo_pedido_em TIMESTAMPTZ,
  ultimo_erro TEXT,
  ultimo_erro_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id)
);

-- 2. Logs da integração 99Food
CREATE TABLE IF NOT EXISTS public.noventa_e_nove_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'sync_produto', 'sync_estoque', 'sync_preco',
    'pedido_recebido', 'pedido_atualizado', 'pedido_cancelado',
    'webhook_recebido', 'evento_polling',
    'token_atualizado', 'erro_autenticacao', 'erro_api',
    'teste_conexao', 'config_atualizada'
  )),
  order_id TEXT,
  pedido_externo_id TEXT,
  produto_id UUID,
  detalhes TEXT,
  dados JSONB,
  sucesso BOOLEAN DEFAULT true,
  erro TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Sincronização de produtos com 99Food
CREATE TABLE IF NOT EXISTS public.noventa_e_nove_produtos_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  noventa_e_nove_product_id VARCHAR(100),
  ninety_nine_external_code VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'not_synced' CHECK (status IN ('synced', 'pending', 'error', 'not_synced', 'deleted')),
  ninety_nine_status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (ninety_nine_status IN ('AVAILABLE', 'UNAVAILABLE', 'HIDDEN')),
  ultimo_sync_em TIMESTAMPTZ,
  erro_sync TEXT,
  preco_sincronizado DECIMAL(10, 2),
  estoque_sincronizado DECIMAL(10, 2),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, ninety_nine_external_code)
);

-- 4. Pedidos da 99Food
CREATE TABLE IF NOT EXISTS public.noventa_e_nove_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  order_id VARCHAR(100) NOT NULL,
  display_id VARCHAR(50),
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  order_type VARCHAR(20) DEFAULT 'DELIVERY' CHECK (order_type IN ('DELIVERY', 'TAKEOUT', 'INDOOR')),
  delivery_latitude DECIMAL(10, 7),
  delivery_longitude DECIMAL(10, 7),
  order_timing VARCHAR(20),
  estimated_delivery_time TIMESTAMPTZ,
  ninety_nine_status VARCHAR(30) DEFAULT 'PLACED',
  dados_completos JSONB,
  sincronizado BOOLEAN DEFAULT false,
  ultimo_sync_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id)
);

-- 5. Colunas na tabela produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS disponivel_99food BOOLEAN DEFAULT false;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ninety_nine_external_code VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ninety_nine_sync_status VARCHAR(20) DEFAULT 'not_synced';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ninety_nine_product_id VARCHAR(100);

-- 6. Adicionar 'noventa_e_nove' ao CHECK constraint de canal nas vendas
ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_canal_check;
ALTER TABLE vendas ADD CONSTRAINT vendas_canal_check
  CHECK (canal IN ('balcao', 'mesa', 'delivery', 'ifood', 'rappi', 'uber_eats', 'whatsapp', 'varejo', 'lavanderia', 'noventa_e_nove'));

-- 7. Índices
CREATE INDEX IF NOT EXISTS idx_noventa_e_nove_config_empresa ON noventa_e_nove_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_noventa_e_nove_logs_empresa ON noventa_e_nove_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_noventa_e_nove_logs_criado ON noventa_e_nove_logs(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_noventa_e_nove_produtos_sync_empresa ON noventa_e_nove_produtos_sync(empresa_id);
CREATE INDEX IF NOT EXISTS idx_noventa_e_nove_produtos_sync_produto ON noventa_e_nove_produtos_sync(produto_id);
CREATE INDEX IF NOT EXISTS idx_noventa_e_nove_pedidos_empresa ON noventa_e_nove_pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_noventa_e_nove_pedidos_order ON noventa_e_nove_pedidos(order_id);
CREATE INDEX IF NOT EXISTS idx_noventa_e_nove_pedidos_status ON noventa_e_nove_pedidos(ninety_nine_status);

-- 8. RLS Policies
ALTER TABLE public.noventa_e_nove_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noventa_e_nove_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noventa_e_nove_produtos_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noventa_e_nove_pedidos ENABLE ROW LEVEL SECURITY;

-- Config: admin/master podem gerenciar
CREATE POLICY "noventa_e_nove_config_select" ON public.noventa_e_nove_config
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "noventa_e_nove_config_insert" ON public.noventa_e_nove_config
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()) AND (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) IN ('admin', 'master'));
CREATE POLICY "noventa_e_nove_config_update" ON public.noventa_e_nove_config
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()) AND (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) IN ('admin', 'master'));
CREATE POLICY "noventa_e_nove_config_delete" ON public.noventa_e_nove_config
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()) AND (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) IN ('admin', 'master'));

-- Logs: leitura para admin/master, insert para sistemas (webhooks)
CREATE POLICY "noventa_e_nove_logs_select" ON public.noventa_e_nove_logs
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "noventa_e_nove_logs_insert" ON public.noventa_e_nove_logs
  FOR INSERT WITH CHECK (true);

-- Produtos sync: admin/master podem gerenciar
CREATE POLICY "noventa_e_nove_produtos_sync_select" ON public.noventa_e_nove_produtos_sync
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "noventa_e_nove_produtos_sync_insert" ON public.noventa_e_nove_produtos_sync
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()) AND (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) IN ('admin', 'master'));
CREATE POLICY "noventa_e_nove_produtos_sync_update" ON public.noventa_e_nove_produtos_sync
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()) AND (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) IN ('admin', 'master'));
CREATE POLICY "noventa_e_nove_produtos_sync_delete" ON public.noventa_e_nove_produtos_sync
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()) AND (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) IN ('admin', 'master'));

-- Pedidos: leitura para admin/master, insert para webhooks/sistema
CREATE POLICY "noventa_e_nove_pedidos_select" ON public.noventa_e_nove_pedidos
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "noventa_e_nove_pedidos_insert" ON public.noventa_e_nove_pedidos
  FOR INSERT WITH CHECK (true);
CREATE POLICY "noventa_e_nove_pedidos_update" ON public.noventa_e_nove_pedidos
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "noventa_e_nove_pedidos_delete" ON public.noventa_e_nove_pedidos
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()) AND (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) IN ('admin', 'master'));

-- 9. GRANTs (Nota #10 - Obrigatório)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noventa_e_nove_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noventa_e_nove_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noventa_e_nove_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noventa_e_nove_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noventa_e_nove_produtos_sync TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noventa_e_nove_produtos_sync TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noventa_e_nove_pedidos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noventa_e_nove_pedidos TO service_role;
