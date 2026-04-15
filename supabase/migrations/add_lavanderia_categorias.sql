-- ============================================================
-- Tabela: lavanderia_categorias
-- Permite gerenciar categorias de peças de lavanderia de forma dinâmica
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lavanderia_categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor_bg TEXT DEFAULT 'bg-gray-100',
  cor_text TEXT DEFAULT 'text-gray-700',
  ativo BOOLEAN DEFAULT TRUE,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now(),

  -- Uma empresa não pode ter categorias duplicadas (mesmo nome)
  UNIQUE(empresa_id, nome)
);

-- RLS
ALTER TABLE public.lavanderia_categorias ENABLE ROW LEVEL SECURITY;

-- Políticas: empresa só vê suas próprias categorias
CREATE POLICY "empresas_select_categorias" ON public.lavanderia_categorias
  FOR SELECT USING (empresa_id = auth.uid() OR empresa_id IN (SELECT id FROM public.empresas));

CREATE POLICY "empresas_insert_categorias" ON public.lavanderia_categorias
  FOR INSERT WITH CHECK (empresa_id IN (SELECT id FROM public.empresas));

CREATE POLICY "empresas_update_categorias" ON public.lavanderia_categorias
  FOR UPDATE USING (empresa_id IN (SELECT id FROM public.empresas));

CREATE POLICY "empresas_delete_categorias" ON public.lavanderia_categorias
  FOR DELETE USING (empresa_id IN (SELECT id FROM public.empresas));

-- Índice
CREATE INDEX IF NOT EXISTS idx_lavanderia_categorias_empresa ON public.lavanderia_categorias(empresa_id);
