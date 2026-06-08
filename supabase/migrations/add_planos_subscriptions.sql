-- Planos de assinatura (Stripe)
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

-- Subscription columns on empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS plano_id UUID REFERENCES planos(id);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'inactive';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Subscription invoices
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

-- RLS
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Planos - todos veem ativos" ON planos;
DROP POLICY IF EXISTS "Planos - Master full access" ON planos;
DROP POLICY IF EXISTS "SubscriptionInvoices - Empresa own" ON subscription_invoices;
DROP POLICY IF EXISTS "SubscriptionInvoices - Master full" ON subscription_invoices;

CREATE POLICY "Planos - todos veem ativos" ON planos
  FOR SELECT USING (ativo = true);

CREATE POLICY "Planos - Master full access" ON planos
  FOR ALL USING (
    (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) = 'master'
  );

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
