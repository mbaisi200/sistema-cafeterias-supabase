-- =====================================================
-- MIGRATION COMPLETA: Tabela de Serviços + Ajustes OS
-- Execute este SQL inteiro no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. Criar tabela servicos
-- =====================================================
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100) DEFAULT 'Outros',
  preco DECIMAL(10,2) DEFAULT 0,
  duracao INTEGER DEFAULT 30,
  comissao DECIMAL(5,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_servicos_empresa ON servicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_servicos_categoria ON servicos(empresa_id, categoria);
CREATE INDEX IF NOT EXISTS idx_servicos_ativo ON servicos(empresa_id, ativo);

-- =====================================================
-- 2. RLS para servicos
-- =====================================================
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios podem ver servicos da empresa" ON servicos;
DROP POLICY IF EXISTS "Usuarios podem criar servicos na empresa" ON servicos;
DROP POLICY IF EXISTS "Usuarios podem atualizar servicos da empresa" ON servicos;
DROP POLICY IF EXISTS "Usuarios podem deletar servicos da empresa" ON servicos;

CREATE POLICY "Usuarios podem ver servicos da empresa" ON servicos
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Usuarios podem criar servicos na empresa" ON servicos
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Usuarios podem atualizar servicos da empresa" ON servicos
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Usuarios podem deletar servicos da empresa" ON servicos
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 3. Trigger para atualizado_em
-- =====================================================
CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON servicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. Atualizar secoes_menu: remover entrada solta de serviços
--    (serviços agora é aba dentro de Cadastros)
-- =====================================================
DELETE FROM secoes_menu WHERE chave = 'servicos';
