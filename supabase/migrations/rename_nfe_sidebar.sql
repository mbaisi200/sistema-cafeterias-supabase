-- Renomeia "Notas Fiscais" para "Notas Fiscais de Entrada" no menu lateral
UPDATE secoes_menu
SET nome = 'Notas Fiscais de Entrada',
    descricao = 'Importação e consulta de notas fiscais de entrada'
WHERE url = '/admin/nfe';

-- Renomeia "Cupons e NFEs" para "Cupons Fiscais" para eliminar redundância
UPDATE secoes_menu
SET nome = 'Cupons Fiscais',
    descricao = 'Configuração de cupons fiscais e emissão de NF-e'
WHERE url = '/admin/cupons-nfes';
