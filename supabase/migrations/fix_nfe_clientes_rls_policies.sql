-- =============================================
-- Fix RLS policies for clientes, nfe_config, nfe, nfe_eventos, nfe_inutilizacao, nfe_logs
-- 
-- Bug: All policies in nfe_completo_com_clientes.sql use `id = auth.uid()`
--      but `usuarios.id` is the internal UUID PK, not the auth user ID.
--      The correct column is `auth_user_id`.
--      This causes 403 Forbidden on all INSERT/SELECT/UPDATE/DELETE operations
--      for authenticated non-master users.
-- =============================================

-- Drop incorrect policies for CLIENTES
DROP POLICY IF EXISTS "Empresas podem ver próprios clientes" ON clientes;
DROP POLICY IF EXISTS "Empresas podem inserir próprios clientes" ON clientes;
DROP POLICY IF EXISTS "Empresas podem atualizar próprios clientes" ON clientes;
DROP POLICY IF EXISTS "Empresas podem deletar próprios clientes" ON clientes;

-- Recreate with correct auth_user_id
CREATE POLICY "Empresas podem ver próprios clientes" ON clientes
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Empresas podem inserir próprios clientes" ON clientes
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Empresas podem atualizar próprios clientes" ON clientes
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Empresas podem deletar próprios clientes" ON clientes
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

-- Drop incorrect policies for NFE_CONFIG
DROP POLICY IF EXISTS "Empresas podem ver própria config NFE" ON nfe_config;
DROP POLICY IF EXISTS "Empresas podem inserir própria config NFE" ON nfe_config;
DROP POLICY IF EXISTS "Empresas podem atualizar própria config NFE" ON nfe_config;

-- Recreate with correct auth_user_id
CREATE POLICY "Empresas podem ver própria config NFE" ON nfe_config
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Empresas podem inserir própria config NFE" ON nfe_config
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Empresas podem atualizar própria config NFE" ON nfe_config
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

-- Drop incorrect policies for NFE
DROP POLICY IF EXISTS "Empresas podem ver próprias NFEs" ON nfe;
DROP POLICY IF EXISTS "Empresas podem inserir próprias NFEs" ON nfe;
DROP POLICY IF EXISTS "Empresas podem atualizar próprias NFEs" ON nfe;

-- Recreate with correct auth_user_id
CREATE POLICY "Empresas podem ver próprias NFEs" ON nfe
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Empresas podem inserir próprias NFEs" ON nfe
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Empresas podem atualizar próprias NFEs" ON nfe
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

-- Drop incorrect policies for NFE_EVENTOS
DROP POLICY IF EXISTS "Empresas podem ver próprios eventos NFE" ON nfe_eventos;
DROP POLICY IF EXISTS "Empresas podem inserir próprios eventos NFE" ON nfe_eventos;

-- Recreate with correct auth_user_id
CREATE POLICY "Empresas podem ver próprios eventos NFE" ON nfe_eventos
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Empresas podem inserir próprios eventos NFE" ON nfe_eventos
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

-- Drop incorrect policies for NFE_INUTILIZACAO
DROP POLICY IF EXISTS "Empresas podem ver próprias inutilizações NFE" ON nfe_inutilizacao;
DROP POLICY IF EXISTS "Empresas podem inserir próprias inutilizações NFE" ON nfe_inutilizacao;

-- Recreate with correct auth_user_id
CREATE POLICY "Empresas podem ver próprias inutilizações NFE" ON nfe_inutilizacao
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Empresas podem inserir próprias inutilizações NFE" ON nfe_inutilizacao
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

-- Drop incorrect policies for NFE_LOGS
DROP POLICY IF EXISTS "Empresas podem ver próprios logs NFE" ON nfe_logs;

-- Recreate with correct auth_user_id
CREATE POLICY "Empresas podem ver próprios logs NFE" ON nfe_logs
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

-- Grant proper permissions for service_role (bypass RLS)
grant select, insert, update, delete on public.clientes to authenticated;
grant select, insert, update, delete on public.clientes to service_role;

grant select, insert, update, delete on public.nfe_config to authenticated;
grant select, insert, update, delete on public.nfe_config to service_role;

grant select, insert, update, delete on public.nfe to authenticated;
grant select, insert, update, delete on public.nfe to service_role;

grant select, insert, update, delete on public.nfe_eventos to authenticated;
grant select, insert, update, delete on public.nfe_eventos to service_role;

grant select, insert, update, delete on public.nfe_inutilizacao to authenticated;
grant select, insert, update, delete on public.nfe_inutilizacao to service_role;

grant select, insert, update, delete on public.nfe_logs to authenticated;
grant select, insert, update, delete on public.nfe_logs to service_role;

-- =============================================
-- Fix RLS for condicoes_pagamento
-- =============================================
ALTER TABLE condicoes_pagamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver condicoes da empresa" ON condicoes_pagamento;
DROP POLICY IF EXISTS "Criar condicao na empresa" ON condicoes_pagamento;
DROP POLICY IF EXISTS "Atualizar condicao da empresa" ON condicoes_pagamento;
DROP POLICY IF EXISTS "Excluir condicao da empresa" ON condicoes_pagamento;

CREATE POLICY "Ver condicoes da empresa" ON condicoes_pagamento
  FOR SELECT USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Criar condicao na empresa" ON condicoes_pagamento
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Atualizar condicao da empresa" ON condicoes_pagamento
  FOR UPDATE USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

CREATE POLICY "Excluir condicao da empresa" ON condicoes_pagamento
  FOR DELETE USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM usuarios WHERE auth_user_id = auth.uid() AND role = 'master')
  );

grant select, insert, update, delete on public.condicoes_pagamento to authenticated;
grant select, insert, update, delete on public.condicoes_pagamento to service_role;
