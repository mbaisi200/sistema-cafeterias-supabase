-- =====================================================
-- MIGRAÇÃO: Adicionar campos na tabela cupom_config
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Adicionar campos que faltam na tabela cupom_config
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

ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS intensidade_impressao VARCHAR(20) DEFAULT 'escura' CHECK (intensidade_impressao IN ('normal', 'escura', 'muito-escura'));
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS imprimir_automatico BOOLEAN DEFAULT false;
ALTER TABLE cupom_config ADD COLUMN IF NOT EXISTS vias INTEGER DEFAULT 1;

-- Renomear coluna mensagem_cupom para mensagem_rodape se necessário
-- ALTER TABLE cupom_config RENAME COLUMN mensagem_cupom TO mensagem_rodape;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
