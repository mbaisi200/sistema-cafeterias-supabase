-- =====================================================
-- SCRIPT CONSOLIDADO - TODAS AS TABELAS DO SISTEMA
-- Pode rodar sem medo (tudo com IF NOT EXISTS)
-- =====================================================

-- =====================================================
-- 1. EMPRESAS
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20) UNIQUE,
  telefone VARCHAR(20),
  email VARCHAR(255),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  valor_mensal DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
  validade TIMESTAMP WITH TIME ZONE,
  data_inicio DATE,
  moeda VARCHAR(5) DEFAULT 'BRL',
  imposto DECIMAL(5,2) DEFAULT 0,
  taxa_servico DECIMAL(5,2) DEFAULT 10,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS segmento_id UUID;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS nome_marca VARCHAR(100);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS restringir_dispositivos BOOLEAN DEFAULT false;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS permitir_foto_produto BOOLEAN DEFAULT true NOT NULL;

-- =====================================================
-- 2. USUARIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('master', 'admin', 'funcionario')),
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CATEGORIAS
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
-- 4. PRODUTOS
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
  unidade VARCHAR(10) DEFAULT 'un',
  foto TEXT,
  estoque_atual DECIMAL(10,2) DEFAULT 0,
  estoque_minimo DECIMAL(10,2) DEFAULT 0,
  destaque BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(20);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ncm VARCHAR(8) DEFAULT '00000000';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cest VARCHAR(7) DEFAULT '';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cfop VARCHAR(4) DEFAULT '5102';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cst VARCHAR(3) DEFAULT '00';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS csosn VARCHAR(3) DEFAULT '102';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS origem VARCHAR(1) DEFAULT '0';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidade_tributavel VARCHAR(6) DEFAULT 'UN';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS icms DECIMAL(5,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ipi_aliquota DECIMAL(5,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS pis_aliquota DECIMAL(5,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cofins_aliquota DECIMAL(5,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS disponivel_ifood BOOLEAN DEFAULT false;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ifood_external_code VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ifood_sync_status VARCHAR(20) DEFAULT 'not_synced';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ifood_product_id VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS controlar_estoque BOOLEAN DEFAULT true;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS fornecedor_id UUID;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS combo_preco DECIMAL(10,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidades_por_caixa INTEGER DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_unidade DECIMAL(10,2) DEFAULT 0;

-- =====================================================
-- 5. FUNCIONARIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(100),
  email VARCHAR(255),
  telefone VARCHAR(20),
  pin VARCHAR(6) NOT NULL,
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

ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

-- =====================================================
-- 6. MESAS
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
-- 7. VENDAS
-- =====================================================
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('mesa', 'balcao', 'delivery', 'comanda')),
  canal VARCHAR(20) DEFAULT 'balcao' CHECK (canal IN ('balcao', 'mesa', 'delivery', 'ifood', 'rappi', 'uber_eats', 'whatsapp')),
  status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
  mesa_id UUID REFERENCES mesas(id) ON DELETE SET NULL,
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL,
  subtotal DECIMAL(10,2) DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  taxa_servico DECIMAL(10,2) DEFAULT 0,
  taxa_entrega DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  forma_pagamento VARCHAR(20) CHECK (forma_pagamento IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'voucher', 'ifood_online')),
  pedido_externo_id VARCHAR(100),
  nome_cliente VARCHAR(255),
  telefone_cliente VARCHAR(20),
  entrega_logradouro VARCHAR(255),
  entrega_numero VARCHAR(10),
  entrega_complemento VARCHAR(100),
  entrega_bairro VARCHAR(100),
  entrega_cidade VARCHAR(100),
  entrega_estado VARCHAR(2),
  entrega_cep VARCHAR(10),
  entrega_referencia TEXT,
  tempo_estimado_entrega INTEGER,
  comanda_id UUID,
  comanda_numero INTEGER,
  observacao TEXT,
  criado_por UUID,
  criado_por_nome VARCHAR(255),
  cancelado_por UUID,
  cancelado_em TIMESTAMP WITH TIME ZONE,
  motivo_cancelamento TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fechado_em TIMESTAMP WITH TIME ZONE
);

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_id UUID;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cpf_cliente VARCHAR(14);
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfe_emitida BOOLEAN DEFAULT false;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfe_id UUID;

-- =====================================================
-- 8. ITENS_VENDA
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
-- 9. PAGAMENTOS
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
-- 10. CAIXAS
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
-- 11. MOVIMENTACOES_CAIXA
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
-- 12. COMANDAS
-- =====================================================
CREATE TABLE IF NOT EXISTS comandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  nome_cliente VARCHAR(255),
  observacao TEXT,
  total DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
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
-- 13. CONTAS (PAGAR/RECEBER)
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

ALTER TABLE contas ADD COLUMN IF NOT EXISTS nfe_importada_id UUID;

-- =====================================================
-- 14. ESTOQUE_MOVIMENTOS
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

ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS produto_nome VARCHAR(255);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS tipo_entrada VARCHAR(20);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS quantidade_informada DECIMAL(10,2);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS estoque_anterior DECIMAL(10,2);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS estoque_novo DECIMAL(10,2);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS fornecedor VARCHAR(255);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS documento_ref VARCHAR(255);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS criado_por UUID;
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS criado_por_nome VARCHAR(255);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS nfe_importada_id UUID;

-- =====================================================
-- 15. LOGS
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
-- 16. DELIVERY_CONFIG
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  ifood_ativo BOOLEAN DEFAULT false,
  ifood_client_id VARCHAR(255),
  ifood_client_secret VARCHAR(255),
  ifood_merchant_id VARCHAR(255),
  ifood_token TEXT,
  ifood_token_expira TIMESTAMP WITH TIME ZONE,
  whatsapp_ativo BOOLEAN DEFAULT false,
  whatsapp_numero VARCHAR(20),
  whatsapp_api_key VARCHAR(255),
  taxa_entrega_padrao DECIMAL(10,2) DEFAULT 0,
  entrega_gratis_minimo DECIMAL(10,2),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 17. CUPOM_CONFIG
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
-- 18. CLIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  documento VARCHAR(20),
  tipo_pessoa VARCHAR(10) DEFAULT 'PF' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 19. NF-E TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS nfe_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  cnpj VARCHAR(20),
  ie VARCHAR(30),
  im VARCHAR(30),
  cnae VARCHAR(10),
  crt VARCHAR(1) DEFAULT '3',
  ambiente VARCHAR(10) DEFAULT 'homologacao',
  serie_nfe INTEGER DEFAULT 1,
  serie_nfce INTEGER DEFAULT 1,
  ultimo_numero_nfe INTEGER DEFAULT 0,
  ultimo_numero_nfce INTEGER DEFAULT 0,
  certificado_digital TEXT,
  certificado_validade TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id),
  numero INTEGER NOT NULL,
  serie INTEGER NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('nfe', 'nfce')),
  chave_acesso VARCHAR(44),
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizada', 'cancelada', 'denegada', 'inutilizada')),
  valor_total DECIMAL(10,2) DEFAULT 0,
  xml TEXT,
  protocolo VARCHAR(50),
  motivo_status TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfe_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_id UUID NOT NULL REFERENCES nfe(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  descricao TEXT,
  data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfe_inutilizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero_inicial INTEGER NOT NULL,
  numero_final INTEGER NOT NULL,
  serie INTEGER NOT NULL,
  justificativa TEXT NOT NULL,
  protocolo VARCHAR(50),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfe_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  acao VARCHAR(100) NOT NULL,
  mensagem TEXT,
  erro TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 20. NFC-E TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS nfce_certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  certificado TEXT NOT NULL,
  senha VARCHAR(255),
  validade TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfce_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  cnpj VARCHAR(20),
  ie VARCHAR(30),
  im VARCHAR(30),
  cnae VARCHAR(10),
  crt VARCHAR(1) DEFAULT '3',
  ambiente VARCHAR(10) DEFAULT 'homologacao',
  serie INTEGER DEFAULT 1,
  ultimo_numero INTEGER DEFAULT 0,
  certificado_id UUID,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfce (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES vendas(id),
  numero INTEGER NOT NULL,
  serie INTEGER NOT NULL,
  chave_acesso VARCHAR(44),
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizada', 'cancelada', 'denegada')),
  valor_total DECIMAL(10,2) DEFAULT 0,
  xml TEXT,
  protocolo VARCHAR(50),
  motivo_status TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfce_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfce_id UUID NOT NULL REFERENCES nfce(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  descricao TEXT,
  data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfce_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  acao VARCHAR(100) NOT NULL,
  mensagem TEXT,
  erro TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 21. NF-E IMPORTADAS
-- =====================================================
CREATE TABLE IF NOT EXISTS nfe_importadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  chave_acesso VARCHAR(44) UNIQUE,
  numero INTEGER,
  serie INTEGER,
  data_emissao TIMESTAMP WITH TIME ZONE,
  data_recebimento TIMESTAMP WITH TIME ZONE,
  cnpj_emitente VARCHAR(20),
  nome_emitente VARCHAR(255),
  cpf_cnpj_destinatario VARCHAR(20),
  nome_destinatario VARCHAR(255),
  valor_total DECIMAL(10,2) DEFAULT 0,
  valor_produtos DECIMAL(10,2) DEFAULT 0,
  valor_desconto DECIMAL(10,2) DEFAULT 0,
  base_calculo_icms DECIMAL(10,2) DEFAULT 0,
  valor_icms DECIMAL(10,2) DEFAULT 0,
  base_calculo_icms_st DECIMAL(10,2) DEFAULT 0,
  valor_icms_st DECIMAL(10,2) DEFAULT 0,
  valor_frete DECIMAL(10,2) DEFAULT 0,
  valor_seguro DECIMAL(10,2) DEFAULT 0,
  valor_outras_despesas DECIMAL(10,2) DEFAULT 0,
  valor_ipi DECIMAL(10,2) DEFAULT 0,
  xml_original TEXT,
  xml_assinado TEXT,
  protocolo VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pendente',
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 22. CLIENTE_ENDERECOS (Delivery)
-- =====================================================
CREATE TABLE IF NOT EXISTS cliente_enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  logradouro VARCHAR(255) NOT NULL,
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  referencia TEXT,
  principal BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 23. DELIVERY PEDIDOS
-- =====================================================
CREATE TABLE IF NOT EXISTS pedido_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id),
  endereco_entrega_id UUID REFERENCES cliente_enderecos(id),
  status VARCHAR(30) DEFAULT 'novo' CHECK (status IN ('novo', 'confirmado', 'preparando', 'saiu_entrega', 'entregue', 'cancelado')),
  subtotal DECIMAL(10,2) DEFAULT 0,
  taxa_entrega DECIMAL(10,2) DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  forma_pagamento VARCHAR(20),
  observacao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_delivery_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedido_delivery(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  nome VARCHAR(255) NOT NULL,
  quantidade DECIMAL(10,2) NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  observacao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_delivery_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedido_delivery(id) ON DELETE CASCADE,
  status_anterior VARCHAR(30),
  status_novo VARCHAR(30) NOT NULL,
  observacao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_delivery_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedido_delivery(id) ON DELETE CASCADE,
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 24. CUPONS DE DESCONTO (Delivery)
-- =====================================================
CREATE TABLE IF NOT EXISTS cupons_desconto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('percentual', 'fixo')),
  valor DECIMAL(10,2) NOT NULL,
  valor_minimo DECIMAL(10,2) DEFAULT 0,
  uso_maximo INTEGER DEFAULT 1,
  usos INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  valido_ate TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 25. CARDAPIO ONLINE
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias_cardapio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produto_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('unica', 'multipla')),
  obrigatorio BOOLEAN DEFAULT false,
  minimo INTEGER DEFAULT 0,
  maximo INTEGER DEFAULT 99,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produto_opcao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opcao_id UUID NOT NULL REFERENCES produto_opcoes(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  acrescimo DECIMAL(10,2) DEFAULT 0,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produto_opcao_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  opcao_id UUID NOT NULL REFERENCES produto_opcoes(id) ON DELETE CASCADE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(produto_id, opcao_id)
);

-- =====================================================
-- 26. EMPRESA_DELIVERY_CONFIG (Delivery)
-- =====================================================
CREATE TABLE IF NOT EXISTS empresa_delivery_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  cardapio_ativo BOOLEAN DEFAULT false,
  pedidos_abertos BOOLEAN DEFAULT true,
  tempo_entrega_min INTEGER DEFAULT 30,
  tempo_entrega_max INTEGER DEFAULT 60,
  raio_entrega_km INTEGER DEFAULT 10,
  taxa_entrega_fixa DECIMAL(10,2) DEFAULT 0,
  entrega_gratis_apos DECIMAL(10,2),
  pedido_minimo DECIMAL(10,2) DEFAULT 0,
  horario_funcionamento JSONB DEFAULT '[]',
  formas_pagamento TEXT[] DEFAULT ARRAY['dinheiro', 'cartao_credito', 'cartao_debito', 'pix'],
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 27. iFOOD TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS ifood_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  client_id VARCHAR(255),
  client_secret VARCHAR(255),
  merchant_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  acao VARCHAR(100) NOT NULL,
  request TEXT,
  response TEXT,
  status_code INTEGER,
  erro TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifood_produtos_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  ifood_product_id VARCHAR(100),
  external_code VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  ultima_sync TIMESTAMP WITH TIME ZONE,
  erro TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ifood_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  pedido_id VARCHAR(100) NOT NULL UNIQUE,
  venda_id UUID REFERENCES vendas(id),
  status VARCHAR(50),
  dados JSONB,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 28. ERP / PEDIDOS / ORDENS DE SERVICO
-- =====================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id),
  numero VARCHAR(50),
  data_pedido TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(30) DEFAULT 'pendente',
  tipo VARCHAR(30),
  subtotal DECIMAL(10,2) DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  observacao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero_os INTEGER,
  cliente_nome VARCHAR(255),
  cliente_telefone VARCHAR(20),
  descricao TEXT,
  observacoes TEXT,
  status VARCHAR(30) DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'finalizada', 'entregue', 'cancelada')),
  valor_total DECIMAL(10,2) DEFAULT 0,
  data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_entrega TIMESTAMP WITH TIME ZONE,
  criado_por UUID,
  criado_por_nome VARCHAR(255),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 29. FORNECEDORES
-- =====================================================
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cnpj_cpf VARCHAR(20),
  inscricao_estadual VARCHAR(30),
  tipo_pessoa VARCHAR(10) DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 30. SERVICOS
-- =====================================================
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) DEFAULT 0,
  categoria VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 31. LAVANDERIA
-- =====================================================
CREATE TABLE IF NOT EXISTS lavanderia_itens_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria_id UUID,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lavanderia_servicos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lavanderia_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lavanderia_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES lavanderia_itens_catalogo(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES lavanderia_servicos_catalogo(id) ON DELETE CASCADE,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  prazo_horas INTEGER,
  ativo BOOLEAN DEFAULT true,
  UNIQUE(item_id, servico_id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 32. SEGMENTOS / SECOES / MENU
-- =====================================================
CREATE TABLE IF NOT EXISTS segmentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  nome_marca VARCHAR(100),
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS secoes_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(100) NOT NULL,
  url VARCHAR(100),
  icone VARCHAR(50),
  ordem INTEGER DEFAULT 0,
  obrigatoria BOOLEAN DEFAULT false,
  visivel_para TEXT[] DEFAULT ARRAY['admin', 'funcionario'],
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empresa_secoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  secao_id UUID NOT NULL REFERENCES secoes_menu(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  UNIQUE(empresa_id, secao_id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS segmento_secoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segmento_id UUID NOT NULL REFERENCES segmentos(id) ON DELETE CASCADE,
  secao_id UUID NOT NULL REFERENCES secoes_menu(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  UNIQUE(segmento_id, secao_id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 33. COMBOS
-- =====================================================
CREATE TABLE IF NOT EXISTS combo_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  combo_produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  item_produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade DECIMAL(10,2) NOT NULL DEFAULT 1,
  custo_incluido BOOLEAN DEFAULT true,
  UNIQUE(combo_produto_id, item_produto_id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 34. PEDIDOS_TEMP (PDV)
-- =====================================================
CREATE TABLE IF NOT EXISTS pedidos_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mesa_id UUID REFERENCES mesas(id) ON DELETE CASCADE,
  venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  comanda_id UUID REFERENCES comandas(id) ON DELETE SET NULL,
  funcionario_id UUID,
  funcionario_nome VARCHAR(255),
  tipo VARCHAR(20) DEFAULT 'mesa' CHECK (tipo IN ('mesa', 'balcao', 'delivery')),
  status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado', 'cancelado')),
  total DECIMAL(10,2) DEFAULT 0,
  itens JSONB DEFAULT '[]',
  nome_cliente VARCHAR(255),
  observacao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 35. CONDICOES DE PAGAMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS condicoes_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  parcelas INTEGER DEFAULT 1,
  dias_entre_parcelas INTEGER DEFAULT 30,
  acrescimo DECIMAL(5,2) DEFAULT 0,
  desconto DECIMAL(5,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 36. DISPOSITIVOS DE SEGURANCA
-- =====================================================
CREATE TABLE IF NOT EXISTS dispositivos_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  user_agent TEXT,
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  aprovado BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(empresa_id, usuario_id, device_id)
);

-- =====================================================
-- 37. UNIDADES DE MEDIDA
-- =====================================================
CREATE TABLE IF NOT EXISTS unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(10) NOT NULL,
  descricao VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(empresa_id, nome)
);

-- =====================================================
-- 38. ORDEM DE SERVICO LAVANDERIA (com itens dinâmicos)
-- =====================================================
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]';
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS lavanderia_status VARCHAR(30) DEFAULT 'aguardando';

-- =====================================================
-- INDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth ON usuarios(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_empresa ON categorias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa ON funcionarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_pin ON funcionarios(pin);
CREATE INDEX IF NOT EXISTS idx_mesas_empresa ON mesas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa ON vendas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(criado_em);
CREATE INDEX IF NOT EXISTS idx_itens_venda ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venda ON pagamentos(venda_id);
CREATE INDEX IF NOT EXISTS idx_caixas_empresa ON caixas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixas_status ON caixas(status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa ON movimentacoes_caixa(caixa_id);
CREATE INDEX IF NOT EXISTS idx_comandas_empresa ON comandas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_comandas_status ON comandas(status);
CREATE INDEX IF NOT EXISTS idx_contas_empresa ON contas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_estoque_produto ON estoque_movimentos(produto_id);
CREATE INDEX IF NOT EXISTS idx_logs_empresa ON logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_nfe_empresa ON nfe(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa ON fornecedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_empresa ON ordens_servico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa ON pedidos(empresa_id);

-- =====================================================
-- TRIGGERS (updated_at)
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON funcionarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_mesas_updated_at BEFORE UPDATE ON mesas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_caixas_updated_at BEFORE UPDATE ON caixas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_comandas_updated_at BEFORE UPDATE ON comandas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_contas_updated_at BEFORE UPDATE ON contas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_delivery_config_updated_at BEFORE UPDATE ON delivery_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_cupom_config_updated_at BEFORE UPDATE ON cupom_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;
