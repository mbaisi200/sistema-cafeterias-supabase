-- =====================================================
-- Fix: Registrar "Manual do Sistema" no secoes_menu
-- para que ProtectedRoute permita acesso de admin
-- =====================================================

INSERT INTO secoes_menu (chave, nome, descricao, icone, url, grupo, ordem, ativo, obrigatoria, visivel_para) VALUES
  ('manual_sistema', 'Manual do Sistema', 'Manual completo do sistema de gestão', 'BookOpen', '/admin/manual', 'principal', 19, true, false, ARRAY['admin'])
ON CONFLICT (chave) DO NOTHING;

-- Ativar para empresas sem segmento
INSERT INTO empresa_secoes (empresa_id, secao_id, ativo)
SELECT e.id, s.id, true
FROM empresas e
CROSS JOIN secoes_menu s
WHERE s.chave = 'manual_sistema'
  AND e.segmento_id IS NULL
ON CONFLICT (empresa_id, secao_id) DO NOTHING;

-- Ativar para segmentos
INSERT INTO segmento_secoes (segmento_id, secao_id, ativo)
SELECT seg.id, s.id, true
FROM segmentos seg
CROSS JOIN secoes_menu s
WHERE s.chave = 'manual_sistema'
ON CONFLICT (segmento_id, secao_id) DO NOTHING;

-- GRANTs (Nota #10 do AGENTS)
grant select, insert, update, delete on public.secoes_menu to authenticated;
grant select, insert, update, delete on public.secoes_menu to service_role;
grant select, insert, update, delete on public.empresa_secoes to authenticated;
grant select, insert, update, delete on public.empresa_secoes to service_role;
grant select, insert, update, delete on public.segmento_secoes to authenticated;
grant select, insert, update, delete on public.segmento_secoes to service_role;
