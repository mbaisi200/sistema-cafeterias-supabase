-- Adiciona sub-seções da página de Produtos como entradas no secoes_menu
-- para que possam ser controladas por segmento no Master > Segmentos

INSERT INTO secoes_menu (chave, nome, descricao, icone, url, grupo, ordem, ativo, obrigatoria, visivel_para) VALUES
  ('produtos_categorias', 'Categorias', 'Gestão de categorias de produtos', 'FolderOpen', '/admin/produtos', 'subsecao', 1, true, false, ARRAY['admin']),
  ('produtos_unidades',   'Unidades',   'Gestão de unidades de medida',     'Ruler',        '/admin/produtos', 'subsecao', 2, true, false, ARRAY['admin']),
  ('produtos_ifood',      'iFood',      'Sincronização com iFood',          'ShoppingCart',  '/admin/produtos', 'subsecao', 3, true, false, ARRAY['admin']),
  ('produtos_combos',     'Combos',     'Gestão de combos de produtos',     'Layers',        '/admin/produtos', 'subsecao', 4, true, false, ARRAY['admin'])
ON CONFLICT (chave) DO NOTHING;
