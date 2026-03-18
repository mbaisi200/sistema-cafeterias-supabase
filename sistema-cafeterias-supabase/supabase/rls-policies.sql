-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO AUXILIAR: Obter empresa_id do usuário
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID AS $$
DECLARE
  user_empresa_id UUID;
BEGIN
  -- Buscar empresa_id do usuário logado
  SELECT empresa_id INTO user_empresa_id
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 2. FUNÇÃO: Verificar se é master
-- =====================================================
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

-- =====================================================
-- 3. HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupom_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. POLÍTICAS PARA EMPRESAS
-- =====================================================
-- Masters podem ver todas as empresas
CREATE POLICY "Masters podem ver todas empresas" ON empresas
  FOR SELECT USING (is_master());

-- Admins podem ver apenas sua própria empresa
CREATE POLICY "Admins podem ver propria empresa" ON empresas
  FOR SELECT USING (id = get_user_empresa_id());

-- Masters podem inserir empresas
CREATE POLICY "Masters podem criar empresas" ON empresas
  FOR INSERT WITH CHECK (is_master());

-- Masters podem atualizar empresas
CREATE POLICY "Masters podem atualizar empresas" ON empresas
  FOR UPDATE USING (is_master());

-- Masters podem excluir empresas
CREATE POLICY "Masters podem excluir empresas" ON empresas
  FOR DELETE USING (is_master());

-- =====================================================
-- 5. POLÍTICAS PARA USUÁRIOS
-- =====================================================
-- Todos podem ver próprios dados e dados da mesma empresa
CREATE POLICY "Usuarios podem ver da propria empresa" ON usuarios
  FOR SELECT USING (
    empresa_id = get_user_empresa_id() OR is_master()
  );

-- Masters podem criar usuários
CREATE POLICY "Masters podem criar usuarios" ON usuarios
  FOR INSERT WITH CHECK (is_master() OR empresa_id = get_user_empresa_id());

-- Usuários podem atualizar próprios dados
CREATE POLICY "Usuarios podem atualizar proprios dados" ON usuarios
  FOR UPDATE USING (
    auth_user_id = auth.uid() OR is_master() OR empresa_id = get_user_empresa_id()
  );

-- Masters podem excluir usuários
CREATE POLICY "Masters podem excluir usuarios" ON usuarios
  FOR DELETE USING (is_master() OR empresa_id = get_user_empresa_id());

-- =====================================================
-- 6. POLÍTICAS PARA CATEGORIAS
-- =====================================================
CREATE POLICY "Ver categorias da empresa" ON categorias
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar categoria na empresa" ON categorias
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar categoria da empresa" ON categorias
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir categoria da empresa" ON categorias
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 7. POLÍTICAS PARA PRODUTOS
-- =====================================================
CREATE POLICY "Ver produtos da empresa" ON produtos
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar produto na empresa" ON produtos
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar produto da empresa" ON produtos
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir produto da empresa" ON produtos
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 8. POLÍTICAS PARA FUNCIONARIOS
-- =====================================================
CREATE POLICY "Ver funcionarios da empresa" ON funcionarios
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar funcionario na empresa" ON funcionarios
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar funcionario da empresa" ON funcionarios
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir funcionario da empresa" ON funcionarios
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 9. POLÍTICAS PARA MESAS
-- =====================================================
CREATE POLICY "Ver mesas da empresa" ON mesas
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar mesa na empresa" ON mesas
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar mesa da empresa" ON mesas
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir mesa da empresa" ON mesas
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 10. POLÍTICAS PARA VENDAS
-- =====================================================
CREATE POLICY "Ver vendas da empresa" ON vendas
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar venda na empresa" ON vendas
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar venda da empresa" ON vendas
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir venda da empresa" ON vendas
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 11. POLÍTICAS PARA ITENS_VENDA
-- =====================================================
CREATE POLICY "Ver itens_venda da empresa" ON itens_venda
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar item_venda na empresa" ON itens_venda
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar item_venda da empresa" ON itens_venda
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir item_venda da empresa" ON itens_venda
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 12. POLÍTICAS PARA PAGAMENTOS
-- =====================================================
CREATE POLICY "Ver pagamentos da empresa" ON pagamentos
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar pagamento na empresa" ON pagamentos
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar pagamento da empresa" ON pagamentos
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir pagamento da empresa" ON pagamentos
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 13. POLÍTICAS PARA CAIXAS
-- =====================================================
CREATE POLICY "Ver caixas da empresa" ON caixas
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar caixa na empresa" ON caixas
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar caixa da empresa" ON caixas
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir caixa da empresa" ON caixas
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 14. POLÍTICAS PARA MOVIMENTACOES_CAIXA
-- =====================================================
CREATE POLICY "Ver movimentacoes da empresa" ON movimentacoes_caixa
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar movimentacao na empresa" ON movimentacoes_caixa
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar movimentacao da empresa" ON movimentacoes_caixa
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir movimentacao da empresa" ON movimentacoes_caixa
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 15. POLÍTICAS PARA COMANDAS
-- =====================================================
CREATE POLICY "Ver comandas da empresa" ON comandas
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar comanda na empresa" ON comandas
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar comanda da empresa" ON comandas
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir comanda da empresa" ON comandas
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 16. POLÍTICAS PARA CONTAS
-- =====================================================
CREATE POLICY "Ver contas da empresa" ON contas
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar conta na empresa" ON contas
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar conta da empresa" ON contas
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir conta da empresa" ON contas
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 17. POLÍTICAS PARA ESTOQUE_MOVIMENTOS
-- =====================================================
CREATE POLICY "Ver estoque_movimentos da empresa" ON estoque_movimentos
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar estoque_movimento na empresa" ON estoque_movimentos
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar estoque_movimento da empresa" ON estoque_movimentos
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir estoque_movimento da empresa" ON estoque_movimentos
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 18. POLÍTICAS PARA LOGS
-- =====================================================
CREATE POLICY "Ver logs da empresa" ON logs
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar log na empresa" ON logs
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir log da empresa" ON logs
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 19. POLÍTICAS PARA DELIVERY_CONFIG
-- =====================================================
CREATE POLICY "Ver delivery_config da empresa" ON delivery_config
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar delivery_config na empresa" ON delivery_config
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar delivery_config da empresa" ON delivery_config
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir delivery_config da empresa" ON delivery_config
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- 20. POLÍTICAS PARA CUPOM_CONFIG
-- =====================================================
CREATE POLICY "Ver cupom_config da empresa" ON cupom_config
  FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Criar cupom_config na empresa" ON cupom_config
  FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Atualizar cupom_config da empresa" ON cupom_config
  FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());

CREATE POLICY "Excluir cupom_config da empresa" ON cupom_config
  FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());

-- =====================================================
-- FIM DAS POLÍTICAS RLS
-- =====================================================
