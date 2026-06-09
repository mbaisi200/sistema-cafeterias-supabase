-- =====================================================
-- Migration: Recuperador de Carrinhos Abandonados
-- =====================================================

-- 1. Tabela de carrinhos abandonados
CREATE TABLE IF NOT EXISTS carrinhos_abandonados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_identificador VARCHAR(100) NOT NULL,
  cliente_nome VARCHAR(100) NOT NULL,
  cliente_telefone VARCHAR(20),
  cliente_email VARCHAR(100),
  itens JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  taxa_entrega DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  tipo_pedido VARCHAR(20) DEFAULT 'delivery',
  cupom_codigo VARCHAR(20),
  ultima_etapa VARCHAR(50) DEFAULT 'cart',
  origem VARCHAR(50) DEFAULT 'cardapio_online',
  lembretes_enviados INTEGER DEFAULT 0,
  ultimo_lembrete_enviado TIMESTAMP WITH TIME ZONE,
  recuperado BOOLEAN DEFAULT false,
  pedido_id UUID REFERENCES pedido_delivery(id) ON DELETE SET NULL,
  expira_em TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_carrinhos_abandonados_empresa
  ON carrinhos_abandonados (empresa_id, recuperado, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_carrinhos_abandonados_identificador
  ON carrinhos_abandonados (empresa_id, cliente_identificador);

-- 2. Configurações do recuperador (extender empresa_delivery_config)
ALTER TABLE empresa_delivery_config
  ADD COLUMN IF NOT EXISTS recuperacao_ativa BOOLEAN DEFAULT false;

ALTER TABLE empresa_delivery_config
  ADD COLUMN IF NOT EXISTS recuperacao_tempo_minutos INTEGER DEFAULT 30;

ALTER TABLE empresa_delivery_config
  ADD COLUMN IF NOT EXISTS recuperacao_desconto_percentual DECIMAL(5,2);

ALTER TABLE empresa_delivery_config
  ADD COLUMN IF NOT EXISTS recuperacao_mensagem TEXT DEFAULT 'Olá {nome}! 😊 Vimos que você deixou um carrinho no nosso cardápio online. Seu pedido de {total} ainda está esperando! Quer finalizar? 🚀';

-- 3. Grants (required per AGENTS.md note #10)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carrinhos_abandonados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carrinhos_abandonados TO service_role;
