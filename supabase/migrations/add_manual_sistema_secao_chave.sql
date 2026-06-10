-- Vincula entradas do Manual do Sistema às seções do menu
-- secao_chave referencia secoes_menu.chave para filtrar por segmento
ALTER TABLE manual_sistema ADD COLUMN IF NOT EXISTS secao_chave VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_manual_sistema_secao ON manual_sistema(secao_chave);

-- Popula secao_chave nos registros existentes baseado na categoria
UPDATE manual_sistema SET secao_chave = 'dashboard'      WHERE categoria = 'Dashboard';
UPDATE manual_sistema SET secao_chave = 'pdv'            WHERE categoria = 'PDV (Ponto de Venda)';
UPDATE manual_sistema SET secao_chave = 'caixa'          WHERE categoria = 'Caixa';
UPDATE manual_sistema SET secao_chave = 'cadastros'      WHERE categoria = 'Cadastros';
-- Produtos: granular por sub-seção (secoes_menu.produtos_*)
UPDATE manual_sistema SET secao_chave = 'produtos'             WHERE categoria = 'Produtos' AND titulo IN ('Cadastrar Produtos', 'Serviços');
UPDATE manual_sistema SET secao_chave = 'produtos_categorias'  WHERE categoria = 'Produtos' AND titulo = 'Categorias de Produtos';
UPDATE manual_sistema SET secao_chave = 'produtos_unidades'    WHERE categoria = 'Produtos' AND titulo = 'Unidades de Medida';
UPDATE manual_sistema SET secao_chave = 'produtos_combos'      WHERE categoria = 'Produtos' AND titulo = 'Criar Combos';
UPDATE manual_sistema SET secao_chave = 'estoque'        WHERE categoria = 'Estoque';
UPDATE manual_sistema SET secao_chave = 'financeiro'     WHERE categoria = 'Financeiro';
UPDATE manual_sistema SET secao_chave = 'pedidos'        WHERE categoria = 'Pedidos';
UPDATE manual_sistema SET secao_chave = 'ordens-servico' WHERE categoria = 'Ordens de Serviço';
UPDATE manual_sistema SET secao_chave = 'nfe'            WHERE categoria = 'NF-e (Notas Fiscais)';
UPDATE manual_sistema SET secao_chave = 'cupons-nfes'    WHERE categoria = 'Cupons Fiscais / NFC-e';
UPDATE manual_sistema SET secao_chave = 'delivery'       WHERE categoria = 'Delivery';
UPDATE manual_sistema SET secao_chave = 'integracoes'    WHERE categoria = 'Integrações';
UPDATE manual_sistema SET secao_chave = 'atendimento'    WHERE categoria = 'Atendimento';
UPDATE manual_sistema SET secao_chave = 'fidelidade'     WHERE categoria = 'Fidelidade';
UPDATE manual_sistema SET secao_chave = 'mesas'          WHERE categoria = 'Mesas e Comandas';
UPDATE manual_sistema SET secao_chave = 'dispositivos'   WHERE categoria = 'Dispositivos';
UPDATE manual_sistema SET secao_chave = 'configuracoes'  WHERE categoria = 'Configurações';
UPDATE manual_sistema SET secao_chave = 'relatorios'     WHERE categoria = 'Relatórios';
-- Categorias que ficam NULL (globais): Visão Geral, Autenticação e Acesso, Logs, Tema Visual, Painel Master, Atalhos de Teclado

-- Adiciona a seção 'atendimento' para o manual poder filtrar corretamente
INSERT INTO secoes_menu (chave, nome, descricao, icone, url, grupo, ordem, ativo, obrigatoria, visivel_para)
VALUES (
  'atendimento',
  'Atendimento',
  'Atendimento virtual, chat e cardápio online',
  'MessageCircle',
  '/admin/atendimento',
  'principal',
  21,
  true,
  false,
  ARRAY['admin']
)
ON CONFLICT (chave) DO NOTHING;

grant select, insert, update, delete on public.manual_sistema to authenticated;
grant select, insert, update, delete on public.manual_sistema to service_role;
