-- =============================================
-- Tabela nfe_importadas
-- Rastreamento de NF-e importadas para evitar duplicatas
-- =============================================

CREATE TABLE IF NOT EXISTS public.nfe_importadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  chave_acesso VARCHAR(44) NOT NULL,
  numero VARCHAR(20),
  serie VARCHAR(5),
  data_emissao TIMESTAMPTZ,
  valor_total DECIMAL(15, 2) DEFAULT 0,
  fornecedor_nome TEXT,
  fornecedor_cnpj VARCHAR(20),
  produtos_count INTEGER DEFAULT 0,
  importado_por UUID,
  importado_por_nome TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: mesma chave de acesso não pode ser importada duas vezes na mesma empresa
  UNIQUE(empresa_id, chave_acesso)
);

-- RLS
ALTER TABLE public.nfe_importadas ENABLE ROW LEVEL SECURITY;

-- Políticas: admin pode ver e inserir
CREATE POLICY "Admin pode ver nfe_importadas da empresa"
  ON public.nfe_importadas FOR SELECT
  TO authenticated
  USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
  );

CREATE POLICY "Admin pode inserir nfe_importadas"
  ON public.nfe_importadas FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
  );

-- Índice para busca rápida por chave de acesso
CREATE INDEX IF NOT EXISTS idx_nfe_importadas_chave ON public.nfe_importadas(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfe_importadas_empresa ON public.nfe_importadas(empresa_id);
