-- =====================================================
-- FIX: RLS Policies + GRANTs para Delivery e Integrações
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)
-- =====================================================

-- 1. Recriar funções auxiliares (caso não existam ou estejam corrompidas)
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID AS $$
DECLARE
  user_empresa_id UUID;
BEGIN
  SELECT empresa_id INTO user_empresa_id
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  RETURN user_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_master()
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  RETURN user_role = 'master';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. GRANTs explícitos para TODAS as tabelas do delivery e integrações
-- (Sem isso, a anon key não consegue acessar as tabelas mesmo com RLS)
GRANT ALL ON pedido_delivery TO authenticated, service_role;
GRANT ALL ON pedido_delivery_itens TO authenticated, service_role;
GRANT ALL ON pedido_delivery_historico TO authenticated, service_role;
GRANT ALL ON pedido_delivery_avaliacoes TO authenticated, service_role;
GRANT ALL ON vendas TO authenticated, service_role;
GRANT ALL ON itens_venda TO authenticated, service_role;
GRANT ALL ON ifood_config TO authenticated, service_role;
GRANT ALL ON ifood_pedidos TO authenticated, service_role;
GRANT ALL ON ifood_logs TO authenticated, service_role;
GRANT ALL ON ifood_produtos_sync TO authenticated, service_role;
GRANT ALL ON uber_eats_config TO authenticated, service_role;
GRANT ALL ON uber_eats_pedidos TO authenticated, service_role;
GRANT ALL ON uber_eats_logs TO authenticated, service_role;
GRANT ALL ON uber_eats_produtos_sync TO authenticated, service_role;
GRANT ALL ON pagamentos TO authenticated, service_role;
GRANT ALL ON comandas TO authenticated, service_role;
GRANT ALL ON estoque_movimentos TO authenticated, service_role;
GRANT ALL ON caixas TO authenticated, service_role;
GRANT ALL ON movimentacoes_caixa TO authenticated, service_role;

-- 3. Refresh schema cache do PostgREST
-- (Resolve o erro 409 de schema introspection)
NOTIFY pgrst, 'reload schema';

-- 4. Recriar políticas RLS do pedido_delivery (FOR SELECT USING true)
DROP POLICY IF EXISTS "Pedidos visíveis para empresa e cliente" ON pedido_delivery;
CREATE POLICY "Pedidos visíveis para empresa e cliente" ON pedido_delivery
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Clientes podem criar pedidos" ON pedido_delivery;
CREATE POLICY "Clientes podem criar pedidos" ON pedido_delivery
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Empresa pode atualizar pedidos" ON pedido_delivery;
CREATE POLICY "Empresa pode atualizar pedidos" ON pedido_delivery
    FOR UPDATE USING (true);

-- 5. Recriar políticas RLS do pedido_delivery_itens
DROP POLICY IF EXISTS "Itens visíveis" ON pedido_delivery_itens;
CREATE POLICY "Itens visíveis" ON pedido_delivery_itens
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Pode criar itens" ON pedido_delivery_itens;
CREATE POLICY "Pode criar itens" ON pedido_delivery_itens
    FOR INSERT WITH CHECK (true);

-- 6. Recriar políticas RLS da tabela vendas (com auth_user_id correto)
DROP POLICY IF EXISTS "Ver vendas da empresa" ON vendas;
DROP POLICY IF EXISTS "vendas_insert_with_cliente" ON vendas;
DROP POLICY IF EXISTS "Criar venda na empresa" ON vendas;
DROP POLICY IF EXISTS "Atualizar venda da empresa" ON vendas;
DROP POLICY IF EXISTS "Excluir venda da empresa" ON vendas;

CREATE POLICY "Ver vendas da empresa" ON vendas
  FOR SELECT USING (
    empresa_id = get_user_empresa_id() OR is_master()
  );

CREATE POLICY "Criar venda na empresa" ON vendas
  FOR INSERT WITH CHECK (
    empresa_id = get_user_empresa_id() OR is_master()
  );

CREATE POLICY "Atualizar venda da empresa" ON vendas
  FOR UPDATE USING (
    empresa_id = get_user_empresa_id() OR is_master()
  );

CREATE POLICY "Excluir venda da empresa" ON vendas
  FOR DELETE USING (
    empresa_id = get_user_empresa_id() OR is_master()
  );

-- 7. Recriar políticas RSL do itens_venda
DROP POLICY IF EXISTS "Ver itens da empresa" ON itens_venda;
DROP POLICY IF EXISTS "Criar itens na empresa" ON itens_venda;
DROP POLICY IF EXISTS "Atualizar itens da empresa" ON itens_venda;
DROP POLICY IF EXISTS "Excluir itens da empresa" ON itens_venda;

CREATE POLICY "Ver itens da empresa" ON itens_venda
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM vendas WHERE id = venda_id)
    OR is_master()
  );

CREATE POLICY "Criar itens na empresa" ON itens_venda
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM vendas WHERE id = venda_id)
    OR is_master()
  );

-- 8. Recriar políticas do ifood_config
DROP POLICY IF EXISTS "Usuários podem ver config iFood da sua empresa" ON ifood_config;
CREATE POLICY "Usuários podem ver config iFood da sua empresa"
  ON ifood_config FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins podem inserir config iFood" ON ifood_config;
CREATE POLICY "Admins podem inserir config iFood"
  ON ifood_config FOR INSERT
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

DROP POLICY IF EXISTS "Admins podem atualizar config iFood" ON ifood_config;
CREATE POLICY "Admins podem atualizar config iFood"
  ON ifood_config FOR UPDATE
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

-- 9. Recriar políticas do uber_eats_config
DROP POLICY IF EXISTS "Usuários podem ver config Uber Eats da sua empresa" ON uber_eats_config;
CREATE POLICY "Usuários podem ver config Uber Eats da sua empresa"
  ON uber_eats_config FOR SELECT
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins podem inserir config Uber Eats" ON uber_eats_config;
CREATE POLICY "Admins podem inserir config Uber Eats"
  ON uber_eats_config FOR INSERT
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

DROP POLICY IF EXISTS "Admins podem atualizar config Uber Eats" ON uber_eats_config;
CREATE POLICY "Admins podem atualizar config Uber Eats"
  ON uber_eats_config FOR UPDATE
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid() AND role IN ('admin', 'master')));

-- 10. Refresh schema cache novamente (garantia)
NOTIFY pgrst, 'reload schema';

-- 11. Verificar se o usuário tem auth_user_id correto
-- (Se esta query retornar 0 linhas, o admins/master não tem registro na tabela usuarios)
-- SELECT id, nome, auth_user_id, role FROM usuarios WHERE auth_user_id = auth.uid();
