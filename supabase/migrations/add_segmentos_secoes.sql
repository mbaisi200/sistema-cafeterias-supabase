-- ============================================================
-- MIGRATION: Segmentos + Seções de Menu Dinâmicas
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Tabela de Segmentos
CREATE TABLE IF NOT EXISTS segmentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  nome_marca VARCHAR(100) NOT NULL,  -- Nome exibido no sidebar (ex: "Gestão Pró")
  icone VARCHAR(50) DEFAULT 'Building2',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Seções do Menu (dinâmica - permite adicionar novas seções)
CREATE TABLE IF NOT EXISTS secoes_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave VARCHAR(100) NOT NULL UNIQUE,   -- Identificador único (ex: 'dashboard', 'pdv')
  nome VARCHAR(100) NOT NULL,           -- Nome exibido no menu
  descricao TEXT,                        -- Descrição opcional
  icone VARCHAR(50) NOT NULL,           -- Nome do ícone Lucide (ex: 'LayoutDashboard')
  url VARCHAR(200) NOT NULL,            -- Rota da página
  grupo VARCHAR(50) DEFAULT 'principal', -- 'principal' ou 'atalho_rapido'
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,            -- Se a seção existe/está disponível no sistema
  obrigatoria BOOLEAN DEFAULT false,     -- Não pode ser desativada pelo Master
  visivel_para TEXT[] DEFAULT ARRAY['admin']::TEXT[], -- Quais roles podem ver: admin, funcionario
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Junção: Seções liberadas por Empresa
CREATE TABLE IF NOT EXISTS empresa_secoes (
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  secao_id UUID NOT NULL REFERENCES secoes_menu(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  PRIMARY KEY (empresa_id, secao_id)
);

-- 4. Adicionar colunas na tabela empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS segmento_id UUID REFERENCES segmentos(id) ON DELETE SET NULL;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS nome_marca VARCHAR(100);

-- 5. Criar índices
CREATE INDEX IF NOT EXISTS idx_segmentos_ativo ON segmentos(ativo);
CREATE INDEX IF NOT EXISTS idx_secoes_menu_grupo ON secoes_menu(grupo, ordem);
CREATE INDEX IF NOT EXISTS idx_empresa_secoes_empresa ON empresa_secoes(empresa_id);

-- 6. Seed: Seções do menu (seções atuais do sistema)
INSERT INTO secoes_menu (chave, nome, descricao, icone, url, grupo, ordem, ativo, obrigatoria, visivel_para) VALUES
  ('dashboard',        'Dashboard',         'Painel principal',             'LayoutDashboard', '/admin/dashboard',      'principal',      1, true,  true,  ARRAY['admin','funcionario']),
  ('pdv',              'PDV',               'Ponto de venda',               'ShoppingCart',    '/pdv',                  'principal',      2, true,  true,  ARRAY['admin','funcionario']),
  ('pdv-garcom',       'PDV Garçon',        'Ponto de venda para garçom',   'UtensilsCrossed', '/pdv-garcom',           'principal',      3, true,  true,  ARRAY['admin','funcionario']),
  ('caixa',            'Caixa',             'Controle de caixa',            'Wallet',          '/admin/caixa',          'principal',      4, true,  true,  ARRAY['admin','funcionario']),
  ('cadastros',        'Cadastros',         'Cadastros gerais',             'Users',           '/admin/cadastros',      'principal',      5, true,  false, ARRAY['admin']),
  ('produtos',         'Produtos',          'Gestão de produtos',           'Package',         '/admin/produtos',       'principal',      6, true,  false, ARRAY['admin']),
  ('pedidos',          'Pedidos',           'Gestão de pedidos',            'ClipboardList',   '/admin/pedidos',       'principal',      7, true,  false, ARRAY['admin']),
  ('estoque',          'Estoque',           'Controle de estoque',          'Warehouse',       '/admin/estoque',        'principal',      8, true,  false, ARRAY['admin']),
  ('mesas',            'Mesas',             'Gestão de mesas',              'UtensilsCrossed', '/admin/mesas',          'principal',      9, true,  false, ARRAY['admin']),
  ('delivery',         'Delivery',          'Gestão de entregas',           'Bike',            '/admin/delivery',       'principal',      10, true,  false, ARRAY['admin']),
  ('financeiro',       'Financeiro',        'Controle financeiro',          'DollarSign',      '/admin/financeiro',     'principal',      11, true,  false, ARRAY['admin']),
  ('funcionarios',     'Funcionários',      'Gestão de funcionários',       'UserCog',         '/admin/funcionarios',   'principal',      12, true,  false, ARRAY['admin']),
  ('relatorios',       'Relatórios',        'Relatórios e análises',        'BarChart3',       '/admin/relatorios',     'principal',      13, true,  false, ARRAY['admin']),
  ('integracoes',      'Integrações',       'Integrações externas',         'Plug',            '/admin/integracoes',    'principal',      14, true,  false, ARRAY['admin']),
  ('cupons-nfes',      'Cupons e NFEs',     'Configuração de cupons e NF-e','FileText',        '/admin/cupons-nfes',    'principal',      15, true,  false, ARRAY['admin']),
  ('nfe',              'Notas Fiscais',     'Emissão de notas fiscais',     'FileText',        '/admin/nfe',            'principal',      16, true,  false, ARRAY['admin']),
  ('cardapio',         'Cardápio',          'Cardápio online',              'Menu',            '/cardapio',             'atalho_rapido',  1, true,  false, ARRAY['admin']),
  ('config-cardapio',  'Config. Cardápio',  'Configuração do cardápio online','Settings',       '/admin/delivery/config','atalho_rapido',  2, true,  false, ARRAY['admin'])
ON CONFLICT (chave) DO NOTHING;

-- 7. Seed: Segmentos iniciais
INSERT INTO segmentos (nome, descricao, nome_marca, icone) VALUES
  ('Cafeteria',       'Estabelecimento de cafeteria e café especial',  'Gestão Café',        'Coffee'),
  ('Restaurante',     'Restaurante com salão e delivery',             'Gestão Pro',         'UtensilsCrossed'),
  ('Padaria',         'Padaria e confeitaria',                        'Gestão Padaria',     'Croissant'),
  ('Barbearia',       'Barbearia e salão de beleza',                  'Gestão Barbearia',   'Scissors'),
  ('Pet Shop',        'Pet shop e veterinária',                       'Gestão Pet',         'PawPrint'),
  ('Loja',            'Loja varejista em geral',                      'Gestão Loja',        'ShoppingBag'),
  ('Consultório',     'Consultório médico e odontológico',            'Gestão Saúde',       'Stethoscope'),
  ('Oficina',         'Oficina mecânica e automotiva',                'Gestão Auto',        'Wrench'),
  ('Academia',        'Academia e estúdio de fitness',                'Gestão Fit',         'Dumbbell'),
  ('Supermercado',    'Supermercado e mercearia',                     'Gestão Market',      'ShoppingCart')
ON CONFLICT DO NOTHING;

-- 8. Ativar TODAS as seções para empresas já existentes
INSERT INTO empresa_secoes (empresa_id, secao_id, ativo)
SELECT e.id, s.id, true
FROM empresas e
CROSS JOIN secoes_menu s
ON CONFLICT (empresa_id, secao_id) DO NOTHING;

-- 9. RLS Policies
ALTER TABLE segmentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE secoes_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_secoes ENABLE ROW LEVEL SECURITY;

-- Políticas para segmentos (Master gerencia, todos leem)
CREATE POLICY "Segmentos - Master full access" ON segmentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u JOIN auth.users au ON u.auth_user_id = au.id
            WHERE u.empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
            AND u.role = 'master')
    OR (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) = 'master'
  );

CREATE POLICY "Segmentos - Admin read only" ON segmentos
  FOR SELECT USING (true);

-- Políticas para secoes_menu (todos leem, Master gerencia)
CREATE POLICY "SecoesMenu - Master full access" ON secoes_menu
  FOR ALL USING (
    (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) = 'master'
  );

CREATE POLICY "SecoesMenu - All read" ON secoes_menu
  FOR SELECT USING (true);

-- Políticas para empresa_secoes (Master gerencia, Admin lê da própria empresa)
CREATE POLICY "EmpresaSecoes - Master full access" ON empresa_secoes
  FOR ALL USING (
    (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) = 'master'
  );

CREATE POLICY "EmpresaSecoes - Admin read own empresa" ON empresa_secoes
  FOR SELECT USING (
    empresa_id = (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "EmpresaSecoes - Funcionario read own empresa" ON empresa_secoes
  FOR SELECT USING (
    empresa_id = (
      SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
    )
  );
