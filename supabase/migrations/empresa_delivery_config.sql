-- =====================================================
-- MIGRATION: Tabela de configuração de Delivery
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Tabela de configuração de delivery por empresa
CREATE TABLE IF NOT EXISTS empresa_delivery_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  
  -- Modalidades
  delivery_ativo BOOLEAN DEFAULT true,
  retirada_ativo BOOLEAN DEFAULT true,
  
  -- Valores
  taxa_entrega_padrao DECIMAL(10,2) DEFAULT 0,
  pedido_minimo DECIMAL(10,2) DEFAULT 0,
  
  -- Tempo de preparo (em minutos)
  tempo_preparo_min INTEGER DEFAULT 20,
  tempo_preparo_max INTEGER DEFAULT 45,
  
  -- Formas de pagamento
  aceita_dinheiro BOOLEAN DEFAULT true,
  aceita_cartao BOOLEAN DEFAULT true,
  aceita_pix BOOLEAN DEFAULT true,
  
  -- Controle
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_empresa_delivery_config_empresa ON empresa_delivery_config(empresa_id);

-- Trigger para updated_at
CREATE TRIGGER update_empresa_delivery_config_updated_at 
  BEFORE UPDATE ON empresa_delivery_config 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE empresa_delivery_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver config delivery da sua empresa" 
  ON empresa_delivery_config FOR SELECT 
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins podem gerenciar config delivery" 
  ON empresa_delivery_config FOR ALL 
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
