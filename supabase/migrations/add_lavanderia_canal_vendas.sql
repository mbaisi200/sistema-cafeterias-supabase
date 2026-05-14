-- Adiciona 'lavanderia' como valor permitido no CHECK constraint de canal da tabela vendas
-- Precisa permitir NULL pois existem vendas com canal nulo
ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_canal_check;
ALTER TABLE vendas ADD CONSTRAINT vendas_canal CHECK (canal IS NULL OR canal IN ('balcao', 'mesa', 'delivery', 'ifood', 'rappi', 'uber_eats', 'whatsapp', 'lavanderia'));
