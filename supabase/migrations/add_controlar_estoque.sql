-- Adiciona coluna para controlar se produto participa do estoque
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS controlar_estoque BOOLEAN DEFAULT true;