-- Suporte a combos na tabela de produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;

-- Tabela de itens de combo (produtos componentes de um combo)
CREATE TABLE IF NOT EXISTS combo_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  combo_produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  item_produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade DECIMAL(10,2) NOT NULL DEFAULT 1,
  custo_incluido BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(combo_produto_id, item_produto_id)
);

ALTER TABLE combo_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa pode gerenciar itens de combo"
  ON combo_itens FOR ALL
  USING (empresa_id = (SELECT empresa_id FROM usuarios WHERE id = current_setting('app.current_user_id')::UUID));

COMMENT ON COLUMN produtos.is_combo IS 'Indica se o produto é um combo (agrupa outros produtos)';
COMMENT ON TABLE combo_itens IS 'Itens que compõem um combo de produtos';
COMMENT ON COLUMN combo_itens.quantidade IS 'Quantidade do item dentro do combo';
COMMENT ON COLUMN combo_itens.custo_incluido IS 'Se true, o custo deste item entra no cálculo do custo do combo';
