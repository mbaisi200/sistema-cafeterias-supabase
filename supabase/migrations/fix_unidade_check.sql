-- Remove CHECK constraint restritivo da coluna unidade
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_unidade_check;

-- Adiciona CHECK mais flexível (permite qualquer valor varchar)
ALTER TABLE produtos ADD CONSTRAINT produtos_unidade_check 
  CHECK (unidade IS NULL OR_LENGTH(unidade) <= 10);