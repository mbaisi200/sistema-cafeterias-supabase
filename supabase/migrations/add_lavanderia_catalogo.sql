-- =============================================================
-- Migration: Catálogo de Itens e Serviços da Lavanderia
-- =============================================================

-- 1. Tabela de catálogo de itens (descrições de peças)
CREATE TABLE IF NOT EXISTS lavanderia_itens_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) DEFAULT 'Outros',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de catálogo de serviços (tipos com preços)
CREATE TABLE IF NOT EXISTS lavanderia_servicos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_lav_itens_empresa ON lavanderia_itens_catalogo(empresa_id, ativo);
CREATE INDEX IF NOT EXISTS idx_lav_servicos_empresa ON lavanderia_servicos_catalogo(empresa_id, ativo);

-- 4. RLS
ALTER TABLE lavanderia_itens_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE lavanderia_servicos_catalogo ENABLE ROW LEVEL SECURITY;

-- Master full access
CREATE POLICY "master_full_lav_itens" ON lavanderia_itens_catalogo FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "master_full_lav_servicos" ON lavanderia_servicos_catalogo FOR ALL USING (true) WITH CHECK (true);
