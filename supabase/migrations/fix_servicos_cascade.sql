-- Corrige a FK servicos_empresa_id_fkey para ON DELETE CASCADE
-- A constraint atual no banco não tem CASCADE, impedindo exclusão de empresas

ALTER TABLE servicos DROP CONSTRAINT IF EXISTS servicos_empresa_id_fkey;

ALTER TABLE servicos ADD CONSTRAINT servicos_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

grant select, insert, update, delete on public.servicos to authenticated;
grant select, insert, update, delete on public.servicos to service_role;
