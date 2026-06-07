-- Create servicos_categorias table
CREATE TABLE IF NOT EXISTS public.servicos_categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cor VARCHAR(7) DEFAULT '#6B7280',
  ativo BOOLEAN DEFAULT true NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_servicos_categorias_empresa ON servicos_categorias(empresa_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_servicos_categorias_empresa_nome ON servicos_categorias(empresa_id, nome) WHERE ativo = true;

ALTER TABLE servicos_categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "servicos_categorias_select" ON servicos_categorias;
DROP POLICY IF EXISTS "servicos_categorias_insert" ON servicos_categorias;
DROP POLICY IF EXISTS "servicos_categorias_update" ON servicos_categorias;
DROP POLICY IF EXISTS "servicos_categorias_delete" ON servicos_categorias;

CREATE POLICY "servicos_categorias_select" ON servicos_categorias
  FOR SELECT USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "servicos_categorias_insert" ON servicos_categorias
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "servicos_categorias_update" ON servicos_categorias
  FOR UPDATE USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "servicos_categorias_delete" ON servicos_categorias
  FOR DELETE USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
  ));

grant select, insert, update, delete on public.servicos_categorias to authenticated;
grant select, insert, update, delete on public.servicos_categorias to service_role;
