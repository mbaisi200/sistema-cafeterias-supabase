-- =====================================================
-- Migration: fix_all_missing_grants
-- Descrição: GRANTs explícitos para TODAS as tabelas públicas
-- Motivo: Nota #10 do AGENTS.md — necessário a partir de 30/10/2026
-- =====================================================

grant select, insert, update, delete on public.empresas to authenticated;
grant select, insert, update, delete on public.empresas to service_role;

grant select, insert, update, delete on public.usuarios to authenticated;
grant select, insert, update, delete on public.usuarios to service_role;

grant select, insert, update, delete on public.categorias to authenticated;
grant select, insert, update, delete on public.categorias to service_role;

grant select, insert, update, delete on public.produtos to authenticated;
grant select, insert, update, delete on public.produtos to service_role;

grant select, insert, update, delete on public.funcionarios to authenticated;
grant select, insert, update, delete on public.funcionarios to service_role;

grant select, insert, update, delete on public.logs to authenticated;
grant select, insert, update, delete on public.logs to service_role;

grant select, insert, update, delete on public.delivery_config to authenticated;
grant select, insert, update, delete on public.delivery_config to service_role;

grant select, insert, update, delete on public.cupom_config to authenticated;
grant select, insert, update, delete on public.cupom_config to service_role;

grant select, insert, update, delete on public.nfce_certificados to authenticated;
grant select, insert, update, delete on public.nfce_certificados to service_role;

grant select, insert, update, delete on public.nfce_config to authenticated;
grant select, insert, update, delete on public.nfce_config to service_role;

grant select, insert, update, delete on public.nfce to authenticated;
grant select, insert, update, delete on public.nfce to service_role;

grant select, insert, update, delete on public.nfce_eventos to authenticated;
grant select, insert, update, delete on public.nfce_eventos to service_role;

grant select, insert, update, delete on public.nfce_logs to authenticated;
grant select, insert, update, delete on public.nfce_logs to service_role;

grant select, insert, update, delete on public.nfe_importadas to authenticated;
grant select, insert, update, delete on public.nfe_importadas to service_role;

grant select, insert, update, delete on public.cliente_enderecos to authenticated;
grant select, insert, update, delete on public.cliente_enderecos to service_role;

grant select, insert, update, delete on public.cupons_desconto to authenticated;
grant select, insert, update, delete on public.cupons_desconto to service_role;

grant select, insert, update, delete on public.categorias_cardapio to authenticated;
grant select, insert, update, delete on public.categorias_cardapio to service_role;

grant select, insert, update, delete on public.produto_opcoes to authenticated;
grant select, insert, update, delete on public.produto_opcoes to service_role;

grant select, insert, update, delete on public.produto_opcao_itens to authenticated;
grant select, insert, update, delete on public.produto_opcao_itens to service_role;

grant select, insert, update, delete on public.produto_opcao_produtos to authenticated;
grant select, insert, update, delete on public.produto_opcao_produtos to service_role;

grant select, insert, update, delete on public.empresa_delivery_config to authenticated;
grant select, insert, update, delete on public.empresa_delivery_config to service_role;

grant select, insert, update, delete on public.pedidos to authenticated;
grant select, insert, update, delete on public.pedidos to service_role;

grant select, insert, update, delete on public.fornecedores to authenticated;
grant select, insert, update, delete on public.fornecedores to service_role;

grant select, insert, update, delete on public.servicos to authenticated;
grant select, insert, update, delete on public.servicos to service_role;

grant select, insert, update, delete on public.segmentos to authenticated;
grant select, insert, update, delete on public.segmentos to service_role;

grant select, insert, update, delete on public.secoes_menu to authenticated;
grant select, insert, update, delete on public.secoes_menu to service_role;

grant select, insert, update, delete on public.empresa_secoes to authenticated;
grant select, insert, update, delete on public.empresa_secoes to service_role;

grant select, insert, update, delete on public.segmento_secoes to authenticated;
grant select, insert, update, delete on public.segmento_secoes to service_role;

grant select, insert, update, delete on public.pedidos_temp to authenticated;
grant select, insert, update, delete on public.pedidos_temp to service_role;

grant select, insert, update, delete on public.dispositivos_usuario to authenticated;
grant select, insert, update, delete on public.dispositivos_usuario to service_role;

grant select, insert, update, delete on public.unidades to authenticated;
grant select, insert, update, delete on public.unidades to service_role;
