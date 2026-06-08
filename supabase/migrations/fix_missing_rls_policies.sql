-- Fix missing RLS policies for tables with RLS enabled but no policies
-- Drop first, then recreate (idempotent)

-- =====================================================
-- empresa_secoes
-- =====================================================
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

-- =====================================================
-- cupons_desconto
-- =====================================================
DROP POLICY IF EXISTS "Cupons visíveis quando ativos" ON cupons_desconto;
DROP POLICY IF EXISTS "Cupons - Admin full access" ON cupons_desconto;

CREATE POLICY "Cupons visíveis quando ativos" ON cupons_desconto
  FOR SELECT USING (ativo = true);

CREATE POLICY "Cupons - Admin full access" ON cupons_desconto
  FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
  );

-- =====================================================
-- produto_opcoes
-- =====================================================
DROP POLICY IF EXISTS "Opções visíveis" ON produto_opcoes;
DROP POLICY IF EXISTS "Opções - Admin full access" ON produto_opcoes;

CREATE POLICY "Opções visíveis" ON produto_opcoes
  FOR SELECT USING (ativo = true);

CREATE POLICY "Opções - Admin full access" ON produto_opcoes
  FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
  );

-- =====================================================
-- produto_opcao_itens
-- =====================================================
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

-- =====================================================
-- produto_opcao_produtos (NUNCA teve policy)
-- =====================================================
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
