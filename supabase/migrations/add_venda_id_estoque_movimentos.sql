-- Adicionar coluna venda_id na tabela estoque_movimentos
ALTER TABLE estoque_movimentos
ADD COLUMN IF NOT EXISTS venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_mov_venda_id ON estoque_movimentos(venda_id) WHERE venda_id IS NOT NULL;

-- Índices compostos para performance em grandes volumes
CREATE INDEX IF NOT EXISTS idx_estoque_mov_empresa_tipo_data
ON estoque_movimentos(empresa_id, tipo, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_estoque_mov_empresa_produto_data
ON estoque_movimentos(empresa_id, produto_id, criado_em DESC);
