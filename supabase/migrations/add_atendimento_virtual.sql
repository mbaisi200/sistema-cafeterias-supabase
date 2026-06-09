-- =====================================================
-- Migration: Atendente Virtual (Chat)
-- =====================================================

-- 1. Conversas
CREATE TABLE IF NOT EXISTS atendimento_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_identificador VARCHAR(100) NOT NULL,
  cliente_nome VARCHAR(100),
  cliente_telefone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada')),
  ultima_mensagem TEXT,
  ultimo_remetente VARCHAR(20),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atendimento_conversas_empresa
  ON atendimento_conversas (empresa_id, status, atualizado_em DESC);

-- 2. Mensagens
CREATE TABLE IF NOT EXISTS atendimento_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  conversa_id UUID NOT NULL REFERENCES atendimento_conversas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cliente', 'admin', 'sistema')),
  conteudo TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atendimento_mensagens_conversa
  ON atendimento_mensagens (conversa_id, criado_em);

-- 3. Auto-respostas (FAQ)
CREATE TABLE IF NOT EXISTS atendimento_auto_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  palavra_chave VARCHAR(100) NOT NULL,
  resposta TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atendimento_auto_respostas_empresa
  ON atendimento_auto_respostas (empresa_id, ativo);

-- 4. Config do chat na empresa_delivery_config
ALTER TABLE empresa_delivery_config
  ADD COLUMN IF NOT EXISTS chat_ativo BOOLEAN DEFAULT false;

ALTER TABLE empresa_delivery_config
  ADD COLUMN IF NOT EXISTS chat_tempo_resposta_min INTEGER DEFAULT 5;

-- 5. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendimento_conversas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendimento_conversas TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendimento_mensagens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendimento_mensagens TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendimento_auto_respostas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendimento_auto_respostas TO service_role;
