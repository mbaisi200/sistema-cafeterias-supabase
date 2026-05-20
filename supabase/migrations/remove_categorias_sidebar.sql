-- Remove a seção "Categorias" do menu lateral
-- A gestão de categorias já está disponível dentro de Produtos
DELETE FROM secoes_menu WHERE url = '/admin/categorias' AND grupo = 'principal';
DELETE FROM empresa_secoes WHERE secao_id IN (SELECT id FROM secoes_menu WHERE url = '/admin/categorias' AND grupo = 'principal');
