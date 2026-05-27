-- Renomeia "Cupons Fiscais" para "Cupons e Notas Fiscais" no sidebar e nas breadcrumbs
-- Atualiza a tabela secoes_menu (cache do banco)
UPDATE secoes_menu
SET nome = 'Cupons e Notas Fiscais',
    descricao = 'Gestão de cupons fiscais e notas fiscais de saída'
WHERE url = '/admin/cupons-nfes';
