-- =====================================================
-- Migration: add_missing_indexes
-- Descrição: Índices faltantes para reduzir Disk IO
-- Motivo: Sequential scans em tabelas com empresa_id
-- =====================================================

-- 1. itens_venda — tabela mais crítica (cresce rápido, sem índice empresa_id)
CREATE INDEX IF NOT EXISTS idx_itens_venda_empresa ON itens_venda(empresa_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_empresa_venda ON itens_venda(empresa_id, venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_empresa_produto ON itens_venda(empresa_id, produto_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_criado_em ON itens_venda(empresa_id, criado_em DESC);

-- 2. pagamentos — sem índice empresa_id
CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa ON pagamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa_venda ON pagamentos(empresa_id, venda_id);

-- 3. movimentacoes_caixa — sem índice empresa_id
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa_empresa ON movimentacoes_caixa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa_empresa_tipo ON movimentacoes_caixa(empresa_id, tipo, criado_em DESC);

-- 4. nfe_importadas — sem índice empresa_id
CREATE INDEX IF NOT EXISTS idx_nfe_importadas_empresa ON nfe_importadas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_nfe_importadas_empresa_data ON nfe_importadas(empresa_id, data_emissao DESC);

-- 5. categorias — composto para busca por status
CREATE INDEX IF NOT EXISTS idx_categorias_empresa_ativo ON categorias(empresa_id, ativo);

-- 6. comandas — composto para busca por status
CREATE INDEX IF NOT EXISTS idx_comandas_empresa_status ON comandas(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_comandas_empresa_numero ON comandas(empresa_id, numero);

-- 7. mesas — composto para busca por status
CREATE INDEX IF NOT EXISTS idx_mesas_empresa_status ON mesas(empresa_id, status);

-- 8. caixas — composto para busca por status + data
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_status ON caixas(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_criado ON caixas(empresa_id, criado_em DESC);

-- 9. pedidos — composto para ordenação por data
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_criado ON pedidos(empresa_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_status_criado ON pedidos(empresa_id, status, criado_em DESC);

-- 10. pedidos_temp — composto para cleanup
CREATE INDEX IF NOT EXISTS idx_pedidos_temp_empresa_criado ON pedidos_temp(empresa_id, criado_em);

-- 11. produtos — composto para busca comum
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_ativo_nome ON produtos(empresa_id, ativo, nome);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_categoria_ativo ON produtos(empresa_id, categoria_id, ativo);

-- 12. vendas — índice extra para consulta por cliente
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_cliente ON vendas(empresa_id, cliente_id);
