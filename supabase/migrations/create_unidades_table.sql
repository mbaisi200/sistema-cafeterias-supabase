-- Tabela de unidades de medida
CREATE TABLE IF NOT EXISTS unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(20) NOT NULL,
  descricao VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert unidades padrão para empresas existentes
INSERT INTO unidades (empresa_id, nome, descricao, ativo)
SELECT e.id, 'un', 'Unidade', true FROM empresas e
ON CONFLICT DO NOTHING;

INSERT INTO unidades (empresa_id, nome, descricao, ativo)
SELECT e.id, 'cx', 'Caixa', true FROM empresas e
ON CONFLICT DO NOTHING;

INSERT INTO unidades (empresa_id, nome, descricao, ativo)
SELECT e.id, 'kg', 'Quilograma', true FROM empresas e
ON CONFLICT DO NOTHING;

INSERT INTO unidades (empresa_id, nome, descricao, ativo)
SELECT e.id, 'lt', 'Litro', true FROM empresas e
ON CONFLICT DO NOTHING;

INSERT INTO unidades (empresa_id, nome, descricao, ativo)
SELECT e.id, 'ml', 'Mililitro', true FROM empresas e
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;