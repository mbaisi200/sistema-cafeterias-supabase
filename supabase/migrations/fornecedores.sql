-- Migration: Tabela de Fornecedores
-- Descrição: Criação da tabela fornecedores para gestão de fornecedores do estabelecimento

CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  razao_social VARCHAR(255),
  cnpj VARCHAR(20),
  inscricao_estadual VARCHAR(30),
  email VARCHAR(255),
  telefone VARCHAR(20),
  telefone2 VARCHAR(20),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  contato VARCHAR(255),
  cargo VARCHAR(100),
  site VARCHAR(255),
  observacoes TEXT,
  categorias TEXT[] DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fornecedores_empresa ON fornecedores(empresa_id);
CREATE INDEX idx_fornecedores_cnpj ON fornecedores(cnpj);

CREATE OR REPLACE FUNCTION update_fornecedores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON fornecedores FOR EACH ROW EXECUTE FUNCTION update_fornecedores_updated_at();
