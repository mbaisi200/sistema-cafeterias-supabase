CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome VARCHAR(255),
  cliente VARCHAR(255),
  
  data_pedido TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_entrega DATE,
  condicao_pagamento VARCHAR(50),
  observacoes TEXT,
  
  status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'pendente', 'aprovado', 'faturado', 'cancelado')),
  valor_total DECIMAL(10,2) DEFAULT 0,
  
  itens JSONB DEFAULT '[]',
  
  criado_por UUID,
  criado_por_nome VARCHAR(255),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_empresa ON pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(empresa_id, numero);
