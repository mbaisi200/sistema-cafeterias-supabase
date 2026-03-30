-- ========================================================
-- Migração: Adicionar vinculo de cliente nas vendas
-- Adiciona colunas cliente_id e cpf_cliente na tabela vendas
-- para vincular vendas ao cadastro de clientes (NFe/NFCe)
-- ========================================================

-- Adicionar coluna cliente_id (FK para tabela clientes)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;

-- Adicionar coluna cpf_cliente para armazenar CPF mesmo sem cliente cadastrado
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cpf_cliente VARCHAR(14);

-- Criar índice para buscas por cliente
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendas_cpf_cliente ON vendas(cpf_cliente) WHERE cpf_cliente IS NOT NULL;

-- Atualizar RLS: permitir SELECT e INSERT com cliente_id
DO $$
BEGIN
  -- Verifica se a política já existe antes de criar
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendas' AND policyname = 'vendas_insert_with_cliente') THEN
    CREATE POLICY vendas_insert_with_cliente ON vendas FOR INSERT TO authenticated WITH CHECK (
      empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
    );
  END IF;
END $$;

-- Comentários
COMMENT ON COLUMN vendas.cliente_id IS 'Referência ao cliente cadastrado na tabela clientes (para NFe/NFCe)';
COMMENT ON COLUMN vendas.cpf_cliente IS 'CPF do consumidor para identificação no cupom fiscal (pode existir independente do cliente_id)';
