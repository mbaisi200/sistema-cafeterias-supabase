-- ============================================================
-- MIGRATION: Adicionar seções Configurações (Geral) e Fidelidade
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- Adicionar seções no menu
INSERT INTO secoes_menu (chave, nome, descricao, icone, url, grupo, ordem, ativo, obrigatoria, visivel_para) VALUES
  ('configuracoes',     'Configurações',     'Configurações gerais',         'Settings',        '/admin/configuracoes',            'principal',      17, true,  false, ARRAY['admin']),
  ('fidelidade',        'Fidelidade',        'Programa de fidelidade',       'Heart',           '/admin/configuracoes/fidelidade', 'principal',      18, true,  false, ARRAY['admin'])
ON CONFLICT (chave) DO NOTHING;

-- Ativar para empresas sem segmento (via empresa_secoes)
INSERT INTO empresa_secoes (empresa_id, secao_id, ativo)
SELECT e.id, s.id, true
FROM empresas e
CROSS JOIN secoes_menu s
WHERE s.chave IN ('configuracoes', 'fidelidade')
  AND e.segmento_id IS NULL
ON CONFLICT (empresa_id, secao_id) DO NOTHING;

-- Ativar para segmentos (via segmento_secoes) - afeta empresas com segmento
INSERT INTO segmento_secoes (segmento_id, secao_id, ativo)
SELECT seg.id, s.id, true
FROM segmentos seg
CROSS JOIN secoes_menu s
WHERE s.chave IN ('configuracoes', 'fidelidade')
ON CONFLICT (segmento_id, secao_id) DO NOTHING;
