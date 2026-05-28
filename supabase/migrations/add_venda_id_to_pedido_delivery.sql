-- Adiciona coluna venda_id para vincular pedido delivery à venda gerada
ALTER TABLE pedido_delivery ADD COLUMN IF NOT EXISTS venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL;
