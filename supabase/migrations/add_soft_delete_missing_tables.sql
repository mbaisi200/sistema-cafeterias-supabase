-- Adiciona coluna ativo para soft-delete em tabelas que ainda não possuem
-- Permite inativar registros sem perder referências em relatórios

ALTER TABLE mesas ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE contas ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true NOT NULL;

-- GRANTs exigidos pela política #10 do AGENTS.md
GRANT SELECT, INSERT, UPDATE, DELETE ON mesas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON contas TO authenticated, service_role;
