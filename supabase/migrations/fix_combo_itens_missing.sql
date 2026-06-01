-- =============================================
-- Migration: Criar combo_itens se não existir + RLS correto + GRANTs
-- =============================================

-- 1. Garantir coluna is_combo em produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;

-- 2. Criar tabela combo_itens se não existir
CREATE TABLE IF NOT EXISTS combo_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  combo_produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  item_produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade DECIMAL(10,2) NOT NULL DEFAULT 1,
  custo_incluido BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(combo_produto_id, item_produto_id)
);

-- 3. Habilitar RLS
ALTER TABLE combo_itens ENABLE ROW LEVEL SECURITY;

-- 4. Remover política antiga (que usa current_setting) se existir
DROP POLICY IF EXISTS "Empresa pode gerenciar itens de combo" ON combo_itens;

-- 5. Criar políticas corretas usando funções auxiliares
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'combo_itens' AND policyname = 'Ver combo_itens da empresa') THEN
    CREATE POLICY "Ver combo_itens da empresa" ON combo_itens
      FOR SELECT USING (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Criar combo_item na empresa" ON combo_itens
      FOR INSERT WITH CHECK (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Atualizar combo_item da empresa" ON combo_itens
      FOR UPDATE USING (empresa_id = get_user_empresa_id() OR is_master());
    CREATE POLICY "Excluir combo_item da empresa" ON combo_itens
      FOR DELETE USING (empresa_id = get_user_empresa_id() OR is_master());
  END IF;
END $$;

-- 6. GRANTs explícitos (Nota #10 do AGENTS.md)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combo_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combo_itens TO service_role;

-- 7. Comentários
COMMENT ON TABLE combo_itens IS 'Itens que compõem um combo de produtos';
COMMENT ON COLUMN combo_itens.quantidade IS 'Quantidade do item dentro do combo';
COMMENT ON COLUMN combo_itens.custo_incluido IS 'Se true, o custo deste item entra no cálculo do custo do combo';
