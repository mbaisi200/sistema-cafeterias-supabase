-- =====================================================
-- Migration: Cardápio Conversacional WhatsApp
-- =====================================================

-- 1. Sessões dos clientes no WhatsApp (carrinho + estado)
CREATE TABLE IF NOT EXISTS public.whatsapp_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  wa_phone VARCHAR(20) NOT NULL,
  etapa VARCHAR(30) NOT NULL DEFAULT 'idle'
    CHECK (etapa IN (
      'idle', 'saudacao', 'categoria', 'produto',
      'quantidade', 'carrinho', 'endereco', 'forma_pagamento',
      'confirmacao', 'finalizado'
    )),
  dados JSONB DEFAULT '{}'::jsonb,
  conversa_id UUID REFERENCES atendimento_conversas(id) ON DELETE SET NULL,
  ultima_interacao TIMESTAMPTZ DEFAULT now(),
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, wa_phone)
);

-- 2. Config do cardápio no WhatsApp (colunas na whatsapp_config)
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS menu_ativo BOOLEAN DEFAULT false;

ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS mensagem_boas_vindas TEXT DEFAULT 'Olá! 🍔 Bem-vindo ao {empresa}.\n\nEnvie *"cardápio"*, *"menu"* ou *"quero pedir"* para ver nossas opções.\n\nOu envie sua mensagem que um atendente responderá em breve.';

ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS mensagem_categorias TEXT DEFAULT '📋 *Cardápio {empresa}*\n\nEscolha uma categoria abaixo:';

ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS categorias_ativas UUID[] DEFAULT '{}';

ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS criar_pedido_auto BOOLEAN DEFAULT true;

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessoes_empresa ON whatsapp_sessoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessoes_phone ON whatsapp_sessoes(empresa_id, wa_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessoes_interacao ON whatsapp_sessoes(ultima_interacao DESC);

-- 4. RLS
ALTER TABLE public.whatsapp_sessoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_sessoes_select" ON public.whatsapp_sessoes
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "whatsapp_sessoes_insert" ON public.whatsapp_sessoes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_sessoes_update" ON public.whatsapp_sessoes
  FOR UPDATE USING (true);
CREATE POLICY "whatsapp_sessoes_delete" ON public.whatsapp_sessoes
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()) AND (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) IN ('admin', 'master'));

-- 5. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_sessoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_sessoes TO service_role;

-- 6. Incluir tabela no consumo de dados (registro manual no route.ts também necessário)
