-- =====================================================
-- DIAGNÓSTICO E CORREÇÃO DA TABELA cupom_config
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Verificar estrutura atual da tabela
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'cupom_config' 
ORDER BY ordinal_position;

-- 2. Adicionar colunas que podem estar faltando
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS tamanho_fonte INTEGER DEFAULT 12;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS largura_papel INTEGER DEFAULT 58;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS espacamento_linhas DECIMAL(3,1) DEFAULT 1.4;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS margem_superior INTEGER DEFAULT 2;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS margem_inferior INTEGER DEFAULT 2;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS margem_esquerda INTEGER DEFAULT 2;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS margem_direita INTEGER DEFAULT 2;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS intensidade_impressao VARCHAR(20) DEFAULT 'escura';
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS imprimir_automatico BOOLEAN DEFAULT false;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS vias INTEGER DEFAULT 1;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS mostrar_cpf BOOLEAN DEFAULT true;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS mostrar_data BOOLEAN DEFAULT true;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS mostrar_hora BOOLEAN DEFAULT true;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS mostrar_vendedor BOOLEAN DEFAULT true;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS mostrar_desconto BOOLEAN DEFAULT true;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS mensagem_cupom TEXT DEFAULT 'Obrigado pela preferência!';

-- 3. Verificar se há registros na tabela
SELECT id, empresa_id, tamanho_fonte, largura_papel, intensidade_impressao, atualizado_em
FROM cupom_config;

-- 4. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'cupom_config';

-- 5. Garantir que RLS está configurado corretamente
-- (Execute apenas se as políticas não existirem)

-- Política para SELECT
DO $$
BEGIN
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
END $$;

-- Política para INSERT
DO $$
BEGIN
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
END $$;

-- Política para UPDATE
DO $$
BEGIN
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

-- 6. Verificar resultado final
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'cupom_config' 
AND column_name IN (
  'tamanho_fonte', 'largura_papel', 'espacamento_linhas',
  'margem_superior', 'margem_inferior', 'margem_esquerda', 'margem_direita',
  'intensidade_impressao', 'imprimir_automatico', 'vias'
);

-- =====================================================
-- FIM DO SCRIPT DE DIAGNÓSTICO
-- =====================================================
