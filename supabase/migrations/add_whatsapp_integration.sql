-- =====================================================
-- Migration: Integração WhatsApp Business (Atendimento)
-- =====================================================

-- 1. Configuração do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  phone_number_id VARCHAR(255),
  business_account_id VARCHAR(255),
  access_token TEXT,
  webhook_verify_token VARCHAR(100) DEFAULT crypto_gen_random_uuid()::text,
  whatsapp_business_phone VARCHAR(20),
  mensagem_saudacao TEXT DEFAULT 'Olá! Como podemos ajudar?',
  ultimo_webhook_em TIMESTAMPTZ,
  ultimo_erro TEXT,
  ultimo_erro_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id)
);

-- 2. Logs do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'mensagem_recebida', 'mensagem_enviada', 'webhook_recebido',
    'conversa_criada', 'erro_envio', 'erro_webhook',
    'config_atualizada', 'teste_conexao'
  )),
  conversa_id UUID REFERENCES atendimento_conversas(id) ON DELETE SET NULL,
  wa_message_id VARCHAR(100),
  telefone_origem VARCHAR(20),
  telefone_destino VARCHAR(20),
  conteudo TEXT,
  dados JSONB,
  sucesso BOOLEAN DEFAULT true,
  erro TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Adicionar canal na tabela de conversas
ALTER TABLE atendimento_conversas
  ADD COLUMN IF NOT EXISTS canal VARCHAR(20) DEFAULT 'web' CHECK (canal IN ('web', 'whatsapp'));

ALTER TABLE atendimento_conversas
  ADD COLUMN IF NOT EXISTS wa_phone VARCHAR(20);

ALTER TABLE atendimento_conversas
  ADD COLUMN IF NOT EXISTS wa_message_id VARCHAR(100);

ALTER TABLE atendimento_mensagens
  ADD COLUMN IF NOT EXISTS wa_message_id VARCHAR(100);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_empresa ON whatsapp_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_empresa ON whatsapp_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_criado ON whatsapp_logs(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_atendimento_conversas_canal ON atendimento_conversas(empresa_id, canal, status);

-- 5. RLS Policies
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Config: admin/master podem gerenciar
CREATE POLICY "whatsapp_config_select" ON public.whatsapp_config
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "whatsapp_config_insert" ON public.whatsapp_config
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()) AND (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) IN ('admin', 'master'));
CREATE POLICY "whatsapp_config_update" ON public.whatsapp_config
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()) AND (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) IN ('admin', 'master'));
CREATE POLICY "whatsapp_config_delete" ON public.whatsapp_config
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()) AND (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) IN ('admin', 'master'));

-- Logs: leitura para admin/master, insert público (webhooks)
CREATE POLICY "whatsapp_logs_select" ON public.whatsapp_logs
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "whatsapp_logs_insert" ON public.whatsapp_logs
  FOR INSERT WITH CHECK (true);

-- 6. Trigger atualizado_em
CREATE OR REPLACE FUNCTION update_whatsapp_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_whatsapp_config_updated_at ON whatsapp_config;
CREATE TRIGGER trg_whatsapp_config_updated_at
  BEFORE UPDATE ON whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_config_updated_at();

-- 7. Grants (Nota #10 - Obrigatório)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_logs TO service_role;

-- 8. Adicionar 'whatsapp' ao CHECK constraint de canal nas vendas (se o canal ainda não estiver na lista)
ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_canal_check;
ALTER TABLE vendas ADD CONSTRAINT vendas_canal_check
  CHECK (canal IN ('balcao', 'mesa', 'delivery', 'ifood', 'rappi', 'uber_eats', 'whatsapp', 'varejo', 'lavanderia', 'noventa_e_nove'));
