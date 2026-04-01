-- Adicionar campos codigo e unidade na tabela pedidos_temp
-- para suportar o novo formato de cupom fiscal

ALTER TABLE pedidos_temp 
ADD COLUMN IF NOT EXISTS codigo VARCHAR(50),
ADD COLUMN IF NOT EXISTS unidade VARCHAR(10) DEFAULT 'un';
