-- =====================================================
-- Migration: Entregadores (Delivery Drivers)
-- =====================================================

CREATE TABLE IF NOT EXISTS entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  cpf VARCHAR(14),
  veiculo VARCHAR(30) DEFAULT 'moto' CHECK (veiculo IN ('moto', 'carro', 'bicicleta', 'outro')),
  placa VARCHAR(10),
  ativo BOOLEAN DEFAULT true,
  observacao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entregadores_empresa ON entregadores (empresa_id, ativo);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregadores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregadores TO service_role;
