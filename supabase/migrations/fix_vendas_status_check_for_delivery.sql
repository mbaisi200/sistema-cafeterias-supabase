-- Habilita status de delivery na tabela vendas
ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_status_check;

ALTER TABLE vendas ADD CONSTRAINT vendas_status_check
  CHECK (status IN ('aberta','fechada','cancelada','finalizada','pendente','confirmado','em_preparacao','pronto','saiu_para_entrega','entregue'));
