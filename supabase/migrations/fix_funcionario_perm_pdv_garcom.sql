-- Adicionar coluna perm_pdv_garcom na tabela funcionarios (ausente no schema original)
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS perm_pdv_garcom BOOLEAN DEFAULT false;

-- Adicionar RLS policy para permitir login por PIN (sem sessão auth)
-- A consulta por PIN precisa funcionar mesmo sem autenticação
CREATE POLICY "Funcionarios login por PIN" ON funcionarios
  FOR SELECT USING (true);
