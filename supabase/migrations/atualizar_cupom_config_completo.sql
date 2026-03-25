-- =====================================================
-- MIGRAÇÃO COMPLETA: Atualizar tabela cupom_config
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Adicionar campos de configuração de impressão se não existirem
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS mostrar_cpf BOOLEAN DEFAULT true;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS mostrar_data BOOLEAN DEFAULT true;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS mostrar_hora BOOLEAN DEFAULT true;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS mostrar_vendedor BOOLEAN DEFAULT true;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS mostrar_desconto BOOLEAN DEFAULT true;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS tamanho_fonte INTEGER DEFAULT 12;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS largura_papel INTEGER DEFAULT 58;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS espacamento_linhas DECIMAL(3,1) DEFAULT 1.4;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS margem_superior INTEGER DEFAULT 2;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS margem_inferior INTEGER DEFAULT 2;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS intensidade_impressao VARCHAR(20) DEFAULT 'escura';
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS imprimir_automatico BOOLEAN DEFAULT false;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS vias INTEGER DEFAULT 1;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_cupom_config_empresa ON cupom_config(empresa_id);

-- Adicionar trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_cupom_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cupom_config_updated_at ON cupom_config;
CREATE TRIGGER update_cupom_config_updated_at 
BEFORE UPDATE ON cupom_config 
FOR EACH ROW EXECUTE FUNCTION update_cupom_config_updated_at();

-- Habilitar RLS
ALTER TABLE cupom_config ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS se não existirem
DO $$
BEGIN
  -- Política para SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cupom_config' 
    AND policyname = 'Usuarios podem ver config da sua empresa'
  ) THEN
    CREATE POLICY "Usuarios podem ver config da sua empresa" ON cupom_config
      FOR SELECT USING (
        empresa_id IN (
          SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master'
        )
      );
  END IF;

  -- Política para INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cupom_config' 
    AND policyname = 'Usuarios podem criar config na sua empresa'
  ) THEN
    CREATE POLICY "Usuarios podem criar config na sua empresa" ON cupom_config
      FOR INSERT WITH CHECK (
        empresa_id IN (
          SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master'
        )
      );
  END IF;

  -- Política para UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cupom_config' 
    AND policyname = 'Usuarios podem atualizar config da sua empresa'
  ) THEN
    CREATE POLICY "Usuarios podem atualizar config da sua empresa" ON cupom_config
      FOR UPDATE USING (
        empresa_id IN (
          SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master'
        )
      );
  END IF;
END $$;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
