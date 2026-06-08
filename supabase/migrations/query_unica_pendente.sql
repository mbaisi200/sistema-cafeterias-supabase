-- ============================================================
-- QUERY ÚNICA — Todas as migrations pendentes
-- Copie e cole no SQL Editor do Supabase (uma vez só)
-- ============================================================

-- ============================================================
-- 1. Fix FK servicos com CASCADE
-- ============================================================
ALTER TABLE servicos DROP CONSTRAINT IF EXISTS servicos_empresa_id_fkey;
ALTER TABLE servicos ADD CONSTRAINT servicos_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- ============================================================
-- 2. Planos de assinatura + colunas Stripe
-- ============================================================
CREATE TABLE IF NOT EXISTS planos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  stripe_price_id VARCHAR(100),
  stripe_product_id VARCHAR(100),
  recursos JSONB DEFAULT '{}',
  destaque BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planos_ordem ON planos(ordem);

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS plano_id UUID REFERENCES planos(id);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'inactive';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  amount_paid DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'brl',
  status VARCHAR(30),
  invoice_url TEXT,
  pdf_url TEXT,
  paid_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_empresa ON subscription_invoices(empresa_id);

ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Planos - todos veem ativos" ON planos;
DROP POLICY IF EXISTS "Planos - Master full access" ON planos;
CREATE POLICY "Planos - todos veem ativos" ON planos
  FOR SELECT USING (ativo = true);
CREATE POLICY "Planos - Master full access" ON planos
  FOR ALL USING (
    (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) = 'master'
  );

DROP POLICY IF EXISTS "SubscriptionInvoices - Empresa own" ON subscription_invoices;
DROP POLICY IF EXISTS "SubscriptionInvoices - Master full" ON subscription_invoices;
CREATE POLICY "SubscriptionInvoices - Empresa own" ON subscription_invoices
  FOR SELECT USING (
    empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "SubscriptionInvoices - Master full" ON subscription_invoices
  FOR ALL USING (
    (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) = 'master'
  );

grant select, insert, update, delete on public.planos to authenticated;
grant select, insert, update, delete on public.planos to service_role;
grant select, insert, update, delete on public.subscription_invoices to authenticated;
grant select, insert, update, delete on public.subscription_invoices to service_role;

-- ============================================================
-- 3. RLS policies faltantes
-- ============================================================
-- empresa_secoes
DROP POLICY IF EXISTS "EmpresaSecoes - Master full access" ON empresa_secoes;
DROP POLICY IF EXISTS "EmpresaSecoes - Admin read own empresa" ON empresa_secoes;
DROP POLICY IF EXISTS "EmpresaSecoes - Funcionario read own empresa" ON empresa_secoes;
CREATE POLICY "EmpresaSecoes - Master full access" ON empresa_secoes
  FOR ALL USING (
    (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) = 'master'
  );
CREATE POLICY "EmpresaSecoes - Admin read own empresa" ON empresa_secoes
  FOR SELECT USING (
    empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "EmpresaSecoes - Funcionario read own empresa" ON empresa_secoes
  FOR SELECT USING (
    empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
  );

-- cupons_desconto
DROP POLICY IF EXISTS "Cupons visíveis quando ativos" ON cupons_desconto;
DROP POLICY IF EXISTS "Cupons - Admin full access" ON cupons_desconto;
CREATE POLICY "Cupons visíveis quando ativos" ON cupons_desconto
  FOR SELECT USING (ativo = true);
CREATE POLICY "Cupons - Admin full access" ON cupons_desconto
  FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
  );

-- produto_opcoes
DROP POLICY IF EXISTS "Opções visíveis" ON produto_opcoes;
DROP POLICY IF EXISTS "Opções - Admin full access" ON produto_opcoes;
CREATE POLICY "Opções visíveis" ON produto_opcoes
  FOR SELECT USING (ativo = true);
CREATE POLICY "Opções - Admin full access" ON produto_opcoes
  FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
  );

-- produto_opcao_itens
DROP POLICY IF EXISTS "Itens de opção visíveis" ON produto_opcao_itens;
DROP POLICY IF EXISTS "Itens opção - Admin full access" ON produto_opcao_itens;
CREATE POLICY "Itens de opção visíveis" ON produto_opcao_itens
  FOR SELECT USING (ativo = true);
CREATE POLICY "Itens opção - Admin full access" ON produto_opcao_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM produto_opcoes
      WHERE id = opcao_id
        AND empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    )
  );

-- produto_opcao_produtos
DROP POLICY IF EXISTS "Produtos opção visíveis" ON produto_opcao_produtos;
DROP POLICY IF EXISTS "Produtos opção - Admin full access" ON produto_opcao_produtos;
CREATE POLICY "Produtos opção visíveis" ON produto_opcao_produtos
  FOR SELECT USING (true);
CREATE POLICY "Produtos opção - Admin full access" ON produto_opcao_produtos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM produto_opcoes
      WHERE id = opcao_id
        AND empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    )
  );

-- ============================================================
-- 4. servicos_categorias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.servicos_categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cor VARCHAR(7) DEFAULT '#6B7280',
  ativo BOOLEAN DEFAULT true NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_servicos_categorias_empresa ON servicos_categorias(empresa_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_servicos_categorias_empresa_nome
  ON servicos_categorias(empresa_id, nome) WHERE ativo = true;

ALTER TABLE servicos_categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "servicos_categorias_select" ON servicos_categorias;
DROP POLICY IF EXISTS "servicos_categorias_insert" ON servicos_categorias;
DROP POLICY IF EXISTS "servicos_categorias_update" ON servicos_categorias;
DROP POLICY IF EXISTS "servicos_categorias_delete" ON servicos_categorias;

CREATE POLICY "servicos_categorias_select" ON servicos_categorias
  FOR SELECT USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "servicos_categorias_insert" ON servicos_categorias
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "servicos_categorias_update" ON servicos_categorias
  FOR UPDATE USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
  ));
CREATE POLICY "servicos_categorias_delete" ON servicos_categorias
  FOR DELETE USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()
  ));

grant select, insert, update, delete on public.servicos_categorias to authenticated;
grant select, insert, update, delete on public.servicos_categorias to service_role;

-- ============================================================
-- 5. Endereço em funcionarios
-- ============================================================
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS cep VARCHAR(9);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS logradouro VARCHAR(255);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS estado VARCHAR(2);

-- ============================================================
-- FIM
-- ============================================================
