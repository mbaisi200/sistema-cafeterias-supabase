-- =============================================================
-- Migration: Programa de Fidelidade (Multi-modelo)
-- =============================================================

-- 1. Tabela de configuração do programa por empresa
CREATE TABLE IF NOT EXISTS programas_fidelidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  modelo VARCHAR(20) NOT NULL CHECK (modelo IN ('pontos', 'selos', 'visitas', 'cashback')),
  ativo BOOLEAN NOT NULL DEFAULT false,
  regras JSONB NOT NULL DEFAULT '{}',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de saldo do cliente
CREATE TABLE IF NOT EXISTS fidelidade_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  pontos_acumulados INTEGER NOT NULL DEFAULT 0,
  pontos_resgatados INTEGER NOT NULL DEFAULT 0,
  pontos_expirados INTEGER NOT NULL DEFAULT 0,
  selos_atual INTEGER NOT NULL DEFAULT 0,
  selos_total INTEGER NOT NULL DEFAULT 0,
  cashback_disponivel DECIMAL(10,2) NOT NULL DEFAULT 0,
  cashback_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  visitas_total INTEGER NOT NULL DEFAULT 0,
  total_gasto DECIMAL(10,2) NOT NULL DEFAULT 0,
  ultima_visita TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, cliente_id)
);

-- 3. Tabela de log de transações de fidelidade
CREATE TABLE IF NOT EXISTS fidelidade_transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('acumulo', 'resgate', 'expiracao', 'ajuste')),
  modelo VARCHAR(20) NOT NULL CHECK (modelo IN ('pontos', 'selos', 'visitas', 'cashback')),
  valor_compra DECIMAL(10,2),
  pontos_gerados INTEGER DEFAULT 0,
  selos_gerados INTEGER DEFAULT 0,
  cashback_gerado DECIMAL(10,2) DEFAULT 0,
  recompensa_tipo VARCHAR(20) CHECK (recompensa_tipo IN ('desconto', 'produto')),
  recompensa_valor DECIMAL(10,2),
  recompensa_produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  recompensa_descricao VARCHAR(255),
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de catálogo de recompensas
CREATE TABLE IF NOT EXISTS fidelidade_recompensas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  modelo VARCHAR(20) NOT NULL CHECK (modelo IN ('pontos', 'selos', 'visitas', 'cashback')),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('desconto', 'produto')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  custo_acao INTEGER NOT NULL,
  valor_desconto DECIMAL(10,2),
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  descricao VARCHAR(255) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_programas_fidelidade_empresa ON programas_fidelidade(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fidelidade_clientes_empresa ON fidelidade_clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fidelidade_clientes_cliente ON fidelidade_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fidelidade_transacoes_empresa ON fidelidade_transacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fidelidade_transacoes_cliente ON fidelidade_transacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fidelidade_transacoes_criado ON fidelidade_transacoes(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_fidelidade_recompensas_empresa ON fidelidade_recompensas(empresa_id);

-- RLS
ALTER TABLE programas_fidelidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE fidelidade_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fidelidade_transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fidelidade_recompensas ENABLE ROW LEVEL SECURITY;

-- Políticas programas_fidelidade
CREATE POLICY "empresa_select_programas" ON programas_fidelidade
  FOR SELECT USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "empresa_insert_programas" ON programas_fidelidade
  FOR INSERT WITH CHECK (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "empresa_update_programas" ON programas_fidelidade
  FOR UPDATE USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "empresa_delete_programas" ON programas_fidelidade
  FOR DELETE USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- Políticas fidelidade_clientes
CREATE POLICY "empresa_select_fidelidade_clientes" ON fidelidade_clientes
  FOR SELECT USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "empresa_insert_fidelidade_clientes" ON fidelidade_clientes
  FOR INSERT WITH CHECK (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "empresa_update_fidelidade_clientes" ON fidelidade_clientes
  FOR UPDATE USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "empresa_delete_fidelidade_clientes" ON fidelidade_clientes
  FOR DELETE USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- Políticas fidelidade_transacoes
CREATE POLICY "empresa_select_fidelidade_transacoes" ON fidelidade_transacoes
  FOR SELECT USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "empresa_insert_fidelidade_transacoes" ON fidelidade_transacoes
  FOR INSERT WITH CHECK (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "empresa_delete_fidelidade_transacoes" ON fidelidade_transacoes
  FOR DELETE USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- Políticas fidelidade_recompensas
CREATE POLICY "empresa_select_fidelidade_recompensas" ON fidelidade_recompensas
  FOR SELECT USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "empresa_insert_fidelidade_recompensas" ON fidelidade_recompensas
  FOR INSERT WITH CHECK (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "empresa_update_fidelidade_recompensas" ON fidelidade_recompensas
  FOR UPDATE USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
CREATE POLICY "empresa_delete_fidelidade_recompensas" ON fidelidade_recompensas
  FOR DELETE USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- GRANTs (Nota #10: necessário para API com service_role)
GRANT SELECT, INSERT, UPDATE, DELETE ON programas_fidelidade TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON programas_fidelidade TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON fidelidade_clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fidelidade_clientes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON fidelidade_transacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fidelidade_transacoes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON fidelidade_recompensas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fidelidade_recompensas TO service_role;
