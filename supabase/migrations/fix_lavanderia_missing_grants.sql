-- =====================================================
-- Migration: fix_lavanderia_missing_grants
-- Descrição: GRANTs explícitos para tabelas de lavanderia
-- Motivo: Nota #10 do AGENTS.md — necessário a partir de 30/10/2026
-- =====================================================

grant select, insert, update, delete on public.lavanderia_itens_catalogo to authenticated;
grant select, insert, update, delete on public.lavanderia_itens_catalogo to service_role;

grant select, insert, update, delete on public.lavanderia_servicos_catalogo to authenticated;
grant select, insert, update, delete on public.lavanderia_servicos_catalogo to service_role;

grant select, insert, update, delete on public.lavanderia_categorias to authenticated;
grant select, insert, update, delete on public.lavanderia_categorias to service_role;

grant select, insert, update, delete on public.lavanderia_precos to authenticated;
grant select, insert, update, delete on public.lavanderia_precos to service_role;

grant select, insert, update, delete on public.ordens_servico to authenticated;
grant select, insert, update, delete on public.ordens_servico to service_role;
