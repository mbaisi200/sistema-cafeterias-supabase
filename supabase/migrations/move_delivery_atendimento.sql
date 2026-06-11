-- Move Delivery para dentro do Atendimento + remove iFood de subseções
-- ============================================================

-- 1. Garantir que a seção 'atendimento' existe no secoes_menu
INSERT INTO secoes_menu (chave, nome, descricao, icone, url, grupo, ordem, ativo, obrigatoria, visivel_para)
VALUES (
  'atendimento',
  'Atendimento',
  'Atendimento virtual, chat, cardápio online, delivery e integrações',
  'MessageCircle',
  '/admin/atendimento',
  'principal',
  21,
  true,
  false,
  ARRAY['admin']
)
ON CONFLICT (chave) DO NOTHING;

-- 2. Remover iFood das subseções de Produtos (já fará parte do Atendimento)
--    Opção 1: Desativar (mantém registro mas esconde do segmentos dialog)
UPDATE secoes_menu SET ativo = false WHERE chave = 'produtos_ifood';

--    Opção 2 (caso queira excluir permanentemente):
-- DELETE FROM secoes_menu WHERE chave = 'produtos_ifood';

-- 3. Atualizar segmento_secoes para incluir 'atendimento' em todos os segmentos
--    (assim o Master pode ativar/desativar via /master/segmentos)
INSERT INTO segmento_secoes (segmento_id, secao_id, ativo)
SELECT s.id, sm.id, true
FROM segmentos s
CROSS JOIN secoes_menu sm
WHERE sm.chave = 'atendimento'
ON CONFLICT (segmento_id, secao_id) DO NOTHING;

-- 4. GRANTs necessários
grant select, insert, update, delete on public.secoes_menu to authenticated;
grant select, insert, update, delete on public.secoes_menu to service_role;

grant select, insert, update, delete on public.segmento_secoes to authenticated;
grant select, insert, update, delete on public.segmento_secoes to service_role;
