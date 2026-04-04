-- Enable RLS
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Ver fornecedores da empresa" ON fornecedores;
DROP POLICY IF EXISTS "Criar fornecedor na empresa" ON fornecedores;
DROP POLICY IF EXISTS "Atualizar fornecedor da empresa" ON fornecedores;
DROP POLICY IF EXISTS "Excluir fornecedor da empresa" ON fornecedores;

-- Create policies matching the existing pattern (check if these functions exist)
DO $$
BEGIN
  -- Try with get_user_empresa_id function
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_empresa_id') THEN
    CREATE POLICY "Ver fornecedores da empresa" ON fornecedores
      FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Criar fornecedor na empresa" ON fornecedores
      FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Atualizar fornecedor da empresa" ON fornecedores
      FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Excluir fornecedor da empresa" ON fornecedores
      FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());
    RAISE NOTICE 'RLS criada com get_user_empresa_id()';
  ELSE
    -- Fallback: allow all for the company
    CREATE POLICY "Ver fornecedores da empresa" ON fornecedores
      FOR SELECT USING (empresa_id IS NOT NULL);
    CREATE POLICY "Criar fornecedor na empresa" ON fornecedores
      FOR INSERT WITH CHECK (empresa_id IS NOT NULL);
    CREATE POLICY "Atualizar fornecedor da empresa" ON fornecedores
      FOR UPDATE USING (empresa_id IS NOT NULL);
    CREATE POLICY "Excluir fornecedor da empresa" ON fornecedores
      FOR DELETE USING (empresa_id IS NOT NULL);
    RAISE NOTICE 'RLS criada com fallback';
  END IF;
END $$;
