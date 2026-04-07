-- =====================================================
-- SISTEMA DE CAFETERIAS - SCHEMA SUPABASE
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- =====================================================
-- 1. TABELA: EMPRESAS
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20) UNIQUE,
  telefone VARCHAR(20),
  email VARCHAR(255),
  
  -- Endereço
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  
  -- Plano e Status
  valor_mensal DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
  validade TIMESTAMP WITH TIME ZONE,
  data_inicio DATE,
  
  -- Configurações
  moeda VARCHAR(5) DEFAULT 'BRL',
  imposto DECIMAL(5,2) DEFAULT 0,
  taxa_servico DECIMAL(5,2) DEFAULT 10,
  
  -- Timestamps
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABELA: USUÁRIOS (Admin/Master)
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('master', 'admin', 'funcionario')),
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  
  -- Timestamps
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABELA: CATEGORIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(7) DEFAULT '#6B7280',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABELA: PRODUTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  codigo VARCHAR(50),
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  custo DECIMAL(10,2) DEFAULT 0,
  unidade VARCHAR(10) DEFAULT 'un' CHECK (unidade IN ('un', 'kg', 'lt', 'ml', 'g', 'mg')),
  foto TEXT,
  
  estoque_atual DECIMAL(10,2) DEFAULT 0,
  estoque_minimo DECIMAL(10,2) DEFAULT 0,
  destaque BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TABELA: FUNCIONÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(100),
  email VARCHAR(255),
  telefone VARCHAR(20),
  pin VARCHAR(6) NOT NULL, -- PIN de 4-6 dígitos para login
  
  -- Permissões
  perm_pdv BOOLEAN DEFAULT true,
  perm_pdv_garcom BOOLEAN DEFAULT false,
  perm_estoque BOOLEAN DEFAULT false,
  perm_financeiro BOOLEAN DEFAULT false,
  perm_relatorios BOOLEAN DEFAULT false,
  perm_cancelar_venda BOOLEAN DEFAULT false,
  perm_dar_desconto BOOLEAN DEFAULT false,
  
  ativo BOOLEAN DEFAULT true,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. TABELA: MESAS
-- =====================================================
CREATE TABLE IF NOT EXISTS mesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  numero INTEGER NOT NULL,
  capacidade INTEGER DEFAULT 4,
  status VARCHAR(20) DEFAULT 'livre' CHECK (status IN ('livre', 'ocupada', 'reservada', 'manutencao')),
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. TABELA: VENDAS
-- =====================================================
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Tipo e Canal
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('mesa', 'balcao', 'delivery', 'comanda')),
  canal VARCHAR(20) DEFAULT 'balcao' CHECK (canal IN ('balcao', 'mesa', 'delivery', 'ifood', 'rappi', 'uber_eats', 'whatsapp')),
  status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
  
  -- Relacionamentos
  mesa_id UUID REFERENCES mesas(id) ON DELETE SET NULL,
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL,
  
  -- Valores
  subtotal DECIMAL(10,2) DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  taxa_servico DECIMAL(10,2) DEFAULT 0,
  taxa_entrega DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  
  -- Forma de pagamento
  forma_pagamento VARCHAR(20) CHECK (forma_pagamento IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'voucher', 'ifood_online')),
  
  -- Delivery / iFood
  pedido_externo_id VARCHAR(100),
  nome_cliente VARCHAR(255),
  telefone_cliente VARCHAR(20),
  
  -- Endereço de entrega
  entrega_logradouro VARCHAR(255),
  entrega_numero VARCHAR(10),
  entrega_complemento VARCHAR(100),
  entrega_bairro VARCHAR(100),
  entrega_cidade VARCHAR(100),
  entrega_estado VARCHAR(2),
  entrega_cep VARCHAR(10),
  entrega_referencia TEXT,
  tempo_estimado_entrega INTEGER, -- em minutos
  
  -- Comanda
  comanda_id UUID,
  comanda_numero INTEGER,
  
  observacao TEXT,
  
  -- Controle
  criado_por UUID,
  criado_por_nome VARCHAR(255),
  cancelado_por UUID,
  cancelado_em TIMESTAMP WITH TIME ZONE,
  motivo_cancelamento TEXT,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fechado_em TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 8. TABELA: ITENS_VENDA
-- =====================================================
CREATE TABLE IF NOT EXISTS itens_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  quantidade DECIMAL(10,2) NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  desconto DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  observacao TEXT,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. TABELA: PAGAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  
  forma_pagamento VARCHAR(20) NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'voucher', 'ifood_online')),
  valor DECIMAL(10,2) NOT NULL,
  troco DECIMAL(10,2) DEFAULT 0,
  observacao TEXT,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. TABELA: CAIXAS
-- =====================================================
CREATE TABLE IF NOT EXISTS caixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  valor_inicial DECIMAL(10,2) DEFAULT 0,
  valor_atual DECIMAL(10,2) DEFAULT 0,
  valor_final DECIMAL(10,2),
  
  total_entradas DECIMAL(10,2) DEFAULT 0,
  total_saidas DECIMAL(10,2) DEFAULT 0,
  total_vendas DECIMAL(10,2) DEFAULT 0,
  quebra DECIMAL(10,2) DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  
  aberto_por UUID,
  aberto_por_nome VARCHAR(255),
  aberto_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  observacao_abertura TEXT,
  
  fechado_por UUID,
  fechado_por_nome VARCHAR(255),
  fechado_em TIMESTAMP WITH TIME ZONE,
  observacao_fechamento TEXT,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 11. TABELA: MOVIMENTACOES_CAIXA
-- =====================================================
CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  caixa_id UUID NOT NULL REFERENCES caixas(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('abertura', 'venda', 'reforco', 'sangria', 'fechamento')),
  valor DECIMAL(10,2) NOT NULL,
  forma_pagamento VARCHAR(20),
  descricao TEXT,
  quebra DECIMAL(10,2) DEFAULT 0,
  
  usuario_id UUID,
  usuario_nome VARCHAR(255),
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 12. TABELA: COMANDAS
-- =====================================================
CREATE TABLE IF NOT EXISTS comandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  numero INTEGER NOT NULL,
  nome_cliente VARCHAR(255),
  observacao TEXT,
  
  total DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
  
  -- Itens da comanda (JSONB para flexibilidade)
  itens JSONB DEFAULT '[]',
  
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  forma_pagamento VARCHAR(20),
  
  criado_por UUID,
  criado_por_nome VARCHAR(255),
  fechado_por UUID,
  fechado_por_nome VARCHAR(255),
  fechado_em TIMESTAMP WITH TIME ZONE,
  
  cancelado_por UUID,
  cancelado_em TIMESTAMP WITH TIME ZONE,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 13. TABELA: CONTAS A PAGAR/RECEBER
-- =====================================================
CREATE TABLE IF NOT EXISTS contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pagar', 'receber')),
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  
  vencimento DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  
  valor_pago DECIMAL(10,2),
  forma_pagamento VARCHAR(20),
  data_pagamento TIMESTAMP WITH TIME ZONE,
  observacao_pagamento TEXT,
  
  categoria VARCHAR(50),
  fornecedor VARCHAR(255),
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 14. TABELA: ESTOQUE_MOVIMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS estoque_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'venda')),
  quantidade DECIMAL(10,2) NOT NULL,
  preco_unitario DECIMAL(10,2),
  observacao TEXT,
  
  usuario_id UUID,
  usuario_nome VARCHAR(255),
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 15. TABELA: LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  
  usuario_id UUID,
  usuario_nome VARCHAR(255),
  
  acao VARCHAR(100) NOT NULL,
  detalhes TEXT,
  tipo VARCHAR(20) CHECK (tipo IN ('venda', 'produto', 'estoque', 'funcionario', 'financeiro', 'outro')),
  
  dados_antigos JSONB,
  dados_novos JSONB,
  
  data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 16. TABELA: DELIVERY CONFIGURAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  
  -- iFood
  ifood_ativo BOOLEAN DEFAULT false,
  ifood_client_id VARCHAR(255),
  ifood_client_secret VARCHAR(255),
  ifood_merchant_id VARCHAR(255),
  ifood_token TEXT,
  ifood_token_expira TIMESTAMP WITH TIME ZONE,
  
  -- WhatsApp
  whatsapp_ativo BOOLEAN DEFAULT false,
  whatsapp_numero VARCHAR(20),
  whatsapp_api_key VARCHAR(255),
  
  -- Taxa de entrega
  taxa_entrega_padrao DECIMAL(10,2) DEFAULT 0,
  entrega_gratis_minimo DECIMAL(10,2),
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 17. TABELA: CONFIGURAÇÕES DE CUPOM
-- =====================================================
CREATE TABLE IF NOT EXISTS cupom_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(20),
  inscricao_estadual VARCHAR(30),
  inscricao_municipal VARCHAR(30),
  
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(255),
  site VARCHAR(255),
  
  mensagem_cupom TEXT,
  exibir_valor BOOLEAN DEFAULT true,
  exibir_cliente BOOLEAN DEFAULT false,
  
  -- Configurações de impressão
  mostrar_cpf BOOLEAN DEFAULT true,
  mostrar_data BOOLEAN DEFAULT true,
  mostrar_hora BOOLEAN DEFAULT true,
  mostrar_vendedor BOOLEAN DEFAULT true,
  mostrar_desconto BOOLEAN DEFAULT true,
  tamanho_fonte INTEGER DEFAULT 12,
  largura_papel INTEGER DEFAULT 58,
  espacamento_linhas DECIMAL(3,1) DEFAULT 1.4,
  margem_superior INTEGER DEFAULT 2,
  margem_inferior INTEGER DEFAULT 2,
  margem_esquerda INTEGER DEFAULT 2,
  margem_direita INTEGER DEFAULT 2,
  intensidade_impressao VARCHAR(20) DEFAULT 'escura',
  imprimir_automatico BOOLEAN DEFAULT false,
  vias INTEGER DEFAULT 1,
  
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX idx_usuarios_auth ON usuarios(auth_user_id);
CREATE INDEX idx_categorias_empresa ON categorias(empresa_id);
CREATE INDEX idx_produtos_empresa ON produtos(empresa_id);
CREATE INDEX idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX idx_funcionarios_empresa ON funcionarios(empresa_id);
CREATE INDEX idx_funcionarios_pin ON funcionarios(pin);
CREATE INDEX idx_mesas_empresa ON mesas(empresa_id);
CREATE INDEX idx_vendas_empresa ON vendas(empresa_id);
CREATE INDEX idx_vendas_status ON vendas(status);
CREATE INDEX idx_vendas_data ON vendas(criado_em);
CREATE INDEX idx_itens_venda ON itens_venda(venda_id);
CREATE INDEX idx_pagamentos_venda ON pagamentos(venda_id);
CREATE INDEX idx_caixas_empresa ON caixas(empresa_id);
CREATE INDEX idx_caixas_status ON caixas(status);
CREATE INDEX idx_movimentacoes_caixa ON movimentacoes_caixa(caixa_id);
CREATE INDEX idx_comandas_empresa ON comandas(empresa_id);
CREATE INDEX idx_comandas_status ON comandas(status);
CREATE INDEX idx_contas_empresa ON contas(empresa_id);
CREATE INDEX idx_estoque_produto ON estoque_movimentos(produto_id);
CREATE INDEX idx_logs_empresa ON logs(empresa_id);

-- =====================================================
-- FUNÇÃO PARA ATUALIZAR TIMESTAMP
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger para todas as tabelas com atualizado_em
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON funcionarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mesas_updated_at BEFORE UPDATE ON mesas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_caixas_updated_at BEFORE UPDATE ON caixas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comandas_updated_at BEFORE UPDATE ON comandas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contas_updated_at BEFORE UPDATE ON contas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_config_updated_at BEFORE UPDATE ON delivery_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cupom_config_updated_at BEFORE UPDATE ON cupom_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================
