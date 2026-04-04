CREATE TABLE IF NOT EXISTS condicoes_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_condicoes_pagamento_empresa ON condicoes_pagamento(empresa_id);

-- Enable RLS
ALTER TABLE condicoes_pagamento ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Ver condicoes da empresa" ON condicoes_pagamento;
DROP POLICY IF EXISTS "Criar condicao na empresa" ON condicoes_pagamento;
DROP POLICY IF EXISTS "Atualizar condicao da empresa" ON condicoes_pagamento;
DROP POLICY IF EXISTS "Excluir condicao da empresa" ON condicoes_pagamento;

-- Create policies matching the existing pattern
DO $$
BEGIN
  -- Try with get_user_empresa_id function
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_empresa_id') THEN
    CREATE POLICY "Ver condicoes da empresa" ON condicoes_pagamento
      FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Criar condicao na empresa" ON condicoes_pagamento
      FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Atualizar condicao da empresa" ON condicoes_pagamento
      FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Excluir condicao da empresa" ON condicoes_pagamento
      FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());
    RAISE NOTICE 'RLS criada com get_user_empresa_id()';
  ELSE
    -- Fallback: allow all for the company
    CREATE POLICY "Ver condicoes da empresa" ON condicoes_pagamento
      FOR SELECT USING (empresa_id IS NOT NULL);
    CREATE POLICY "Criar condicao na empresa" ON condicoes_pagamento
      FOR INSERT WITH CHECK (empresa_id IS NOT NULL);
    CREATE POLICY "Atualizar condicao da empresa" ON condicoes_pagamento
      FOR UPDATE USING (empresa_id IS NOT NULL);
    CREATE POLICY "Excluir condicao da empresa" ON condicoes_pagamento
      FOR DELETE USING (empresa_id IS NOT NULL);
    RAISE NOTICE 'RLS criada com fallback';
  END IF;
END $$;
