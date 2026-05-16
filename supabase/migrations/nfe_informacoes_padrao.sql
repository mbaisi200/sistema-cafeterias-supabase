-- Tabela para gerenciar múltiplas Informações Adicionais Padrão para NF-e
CREATE TABLE IF NOT EXISTS nfe_informacoes_padrao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('complementares', 'fisco')),
  titulo VARCHAR(255) NOT NULL DEFAULT 'Sem título',
  conteudo TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfe_informacoes_padrao_empresa ON nfe_informacoes_padrao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_nfe_informacoes_padrao_tipo ON nfe_informacoes_padrao(tipo);

ALTER TABLE nfe_informacoes_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas podem ver próprias informacoes padrao" ON nfe_informacoes_padrao
  FOR SELECT USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem inserir próprias informacoes padrao" ON nfe_informacoes_padrao
  FOR INSERT WITH CHECK (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem atualizar próprias informacoes padrao" ON nfe_informacoes_padrao
  FOR UPDATE USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem deletar próprias informacoes padrao" ON nfe_informacoes_padrao
  FOR DELETE USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON nfe_informacoes_padrao TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON nfe_informacoes_padrao TO service_role;
