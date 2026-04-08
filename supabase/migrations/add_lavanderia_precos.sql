-- =============================================================
-- Migration: Tabela de Preços por Item + Serviço (Lavanderia)
-- Preço específico para cada combinação de Item × Tipo de Serviço
-- Ex: Avental de Couro + Lavar/Passar = R$ 15,00
-- =============================================================

CREATE TABLE IF NOT EXISTS lavanderia_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES lavanderia_itens_catalogo(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES lavanderia_servicos_catalogo(id) ON DELETE CASCADE,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, servico_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lav_precos_empresa ON lavanderia_precos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lav_precos_item ON lavanderia_precos(item_id);
CREATE INDEX IF NOT EXISTS idx_lav_precos_servico ON lavanderia_precos(servico_id);

-- RLS
ALTER TABLE lavanderia_precos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_full_lav_precos" ON lavanderia_precos FOR ALL USING (true) WITH CHECK (true);
