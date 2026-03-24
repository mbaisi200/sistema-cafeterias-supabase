-- =====================================================
-- MIGRAÇÃO: SISTEMA DE DELIVERY (Cliente)
-- Permite que clientes façam pedidos pelo app
-- =====================================================

-- =====================================================
-- TABELA: clientes
-- Clientes que fazem pedidos no app
-- =====================================================

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefone VARCHAR(20) NOT NULL,
    cpf VARCHAR(11),
    data_nascimento DATE,
    
    foto_url TEXT,
    
    -- Preferências
    receber_promocoes BOOLEAN DEFAULT true,
    receber_notificacoes BOOLEAN DEFAULT true,
    
    -- Estatísticas
    total_pedidos INTEGER DEFAULT 0,
    total_gasto DECIMAL(15,2) DEFAULT 0,
    
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(empresa_id, telefone)
);

CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);

-- =====================================================
-- TABELA: cliente_enderecos
-- Endereços de entrega dos clientes
-- =====================================================

CREATE TABLE IF NOT EXISTS cliente_enderecos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    
    apelido VARCHAR(50) NOT NULL,  -- "Casa", "Trabalho", etc.
    
    logradouro VARCHAR(150) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    complemento VARCHAR(100),
    bairro VARCHAR(50) NOT NULL,
    cidade VARCHAR(60) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    cep VARCHAR(8) NOT NULL,
    
    -- Coordenadas para entrega
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    ponto_referencia TEXT,
    instrucoes_entrega TEXT,
    
    endereco_padrao BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cliente_enderecos_cliente ON cliente_enderecos(cliente_id);

-- =====================================================
-- TABELA: pedido_delivery
-- Pedidos feitos pelo app de delivery
-- =====================================================

CREATE TABLE IF NOT EXISTS pedido_delivery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    
    codigo VARCHAR(10) NOT NULL,  -- Código único para exibição (ex: "PED-0001")
    
    -- Tipo de pedido
    tipo VARCHAR(20) NOT NULL DEFAULT 'delivery' CHECK (tipo IN ('delivery', 'retirada', 'consumo_local')),
    
    -- Endereço de entrega (se delivery)
    endereco_entrega_id UUID REFERENCES cliente_enderecos(id),
    endereco_entrega JSONB,  -- Cópia do endereço no momento do pedido
    
    -- Status do pedido
    status VARCHAR(30) NOT NULL DEFAULT 'pendente' CHECK (status IN (
        'pendente',           -- Aguardando confirmação
        'confirmado',         -- Confirmado pelo estabelecimento
        'em_preparacao',      -- Em preparação
        'pronto',             -- Pronto para entrega/retirada
        'saiu_para_entrega',  -- Entregador a caminho
        'entregue',           -- Entregue ao cliente
        'cancelado',          -- Cancelado
        'rejeitado'           -- Rejeitado pelo estabelecimento
    )),
    
    -- Timestamps de status
    data_confirmacao TIMESTAMP WITH TIME ZONE,
    data_preparacao_inicio TIMESTAMP WITH TIME ZONE,
    data_preparacao_fim TIMESTAMP WITH TIME ZONE,
    data_saida_entrega TIMESTAMP WITH TIME ZONE,
    data_entrega TIMESTAMP WITH TIME ZONE,
    data_cancelamento TIMESTAMP WITH TIME ZONE,
    
    -- Valores
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    taxa_entrega DECIMAL(15,2) DEFAULT 0,
    desconto DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Cupom de desconto
    cupom_id UUID,
    cupom_codigo VARCHAR(20),
    cupom_desconto DECIMAL(15,2),
    
    -- Pagamento
    forma_pagamento VARCHAR(30) NOT NULL,
    status_pagamento VARCHAR(20) DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'falhou', 'estornado')),
    pagamento_id VARCHAR(100),  -- ID externo do pagamento (MercadoPago, etc.)
    troco_para DECIMAL(15,2),   -- Se pagamento em dinheiro
    troco DECIMAL(15,2),        -- Valor do troco
    
    -- Tempo estimado
    tempo_estimado_preparo INTEGER,  -- em minutos
    tempo_estimado_entrega INTEGER,  -- em minutos
    previsao_entrega TIMESTAMP WITH TIME ZONE,
    
    -- Observações
    observacoes TEXT,
    motivo_cancelamento TEXT,
    
    -- Entregador (se delivery pela loja)
    entregador_id UUID,
    entregador_nome VARCHAR(100),
    
    -- Integração
    venda_id UUID REFERENCES vendas(id),
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(empresa_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_pedido_delivery_empresa ON pedido_delivery(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedido_delivery_cliente ON pedido_delivery(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedido_delivery_status ON pedido_delivery(status);
CREATE INDEX IF NOT EXISTS idx_pedido_delivery_codigo ON pedido_delivery(codigo);
CREATE INDEX IF NOT EXISTS idx_pedido_delivery_data ON pedido_delivery(criado_em DESC);

-- =====================================================
-- TABELA: pedido_delivery_itens
-- Itens dos pedidos de delivery
-- =====================================================

CREATE TABLE IF NOT EXISTS pedido_delivery_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedido_delivery(id) ON DELETE CASCADE,
    
    produto_id UUID REFERENCES produtos(id),
    produto_nome VARCHAR(150) NOT NULL,
    produto_descricao TEXT,
    produto_imagem TEXT,
    
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario DECIMAL(15,2) NOT NULL,
    desconto DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    
    -- Variações/Opções
    variacoes JSONB,  -- [{nome: "Tamanho", valor: "Grande", preco: 5.00}]
    
    -- Adicionais
    adicionais JSONB,  -- [{nome: "Bacon", quantidade: 1, preco: 3.00}]
    
    -- Observações do item
    observacoes TEXT,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedido_delivery_itens_pedido ON pedido_delivery_itens(pedido_id);

-- =====================================================
-- TABELA: pedido_delivery_historico
-- Histórico de alterações de status do pedido
-- =====================================================

CREATE TABLE IF NOT EXISTS pedido_delivery_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedido_delivery(id) ON DELETE CASCADE,
    
    status_anterior VARCHAR(30),
    status_novo VARCHAR(30) NOT NULL,
    
    observacao TEXT,
    
    usuario_id UUID,  -- Quem fez a alteração (se foi manual)
    usuario_tipo VARCHAR(20),  -- 'cliente', 'admin', 'sistema'
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedido_delivery_historico_pedido ON pedido_delivery_historico(pedido_id);

-- =====================================================
-- TABELA: pedido_delivery_avaliacoes
-- Avaliações dos pedidos pelos clientes
-- =====================================================

CREATE TABLE IF NOT EXISTS pedido_delivery_avaliacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedido_delivery(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    -- Notas (1 a 5)
    nota_geral INTEGER NOT NULL CHECK (nota_geral >= 1 AND nota_geral <= 5),
    nota_comida INTEGER CHECK (nota_comida >= 1 AND nota_comida <= 5),
    nota_entrega INTEGER CHECK (nota_entrega >= 1 AND nota_entrega <= 5),
    nota_atendimento INTEGER CHECK (nota_atendimento >= 1 AND nota_atendimento <= 5),
    
    -- Comentário
    comentario TEXT,
    
    -- Resposta do estabelecimento
    resposta TEXT,
    respondido_em TIMESTAMP WITH TIME ZONE,
    
    -- Flags
    visivel BOOLEAN DEFAULT true,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(pedido_id)
);

CREATE INDEX IF NOT EXISTS idx_pedido_delivery_avaliacoes_empresa ON pedido_delivery_avaliacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedido_delivery_avaliacoes_cliente ON pedido_delivery_avaliacoes(cliente_id);

-- =====================================================
-- TABELA: cupons_desconto
-- Cupons de desconto para delivery
-- =====================================================

CREATE TABLE IF NOT EXISTS cupons_desconto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    codigo VARCHAR(20) NOT NULL UNIQUE,
    descricao VARCHAR(200),
    
    -- Tipo de desconto
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('percentual', 'valor_fixo', 'frete_gratis')),
    valor DECIMAL(15,2) NOT NULL,
    valor_maximo DECIMAL(15,2),  -- Desconto máximo (para percentual)
    
    -- Restrições
    valor_minimo_pedido DECIMAL(15,2),
    uso_maximo INTEGER,
    uso_por_cliente INTEGER DEFAULT 1,
    
    -- Vigência
    valido_de TIMESTAMP WITH TIME ZONE NOT NULL,
    valido_ate TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Produtos/Categorias específicas
    produtos_aplicaveis UUID[],  -- Array de IDs de produtos
    categorias_aplicaveis UUID[],  -- Array de IDs de categorias
    
    -- Primeira compra
    apenas_primeira_compra BOOLEAN DEFAULT false,
    
    ativo BOOLEAN DEFAULT true,
    
    -- Estatísticas
    total_usos INTEGER DEFAULT 0,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cupons_empresa ON cupons_desconto(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cupons_codigo ON cupons_desconto(codigo);

-- =====================================================
-- TABELA: categorias_cardapio
-- Categorias para organização do cardápio
-- =====================================================

CREATE TABLE IF NOT EXISTS categorias_cardapio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50),
    cor VARCHAR(7),  -- Hex color
    
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(empresa_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_categorias_cardapio_empresa ON categorias_cardapio(empresa_id);

-- =====================================================
-- TABELA: produto_opcoes
-- Opções/Adicionais dos produtos
-- =====================================================

CREATE TABLE IF NOT EXISTS produto_opcoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    nome VARCHAR(100) NOT NULL,  -- "Tamanho", "Adicionais", "Sabor"
    descricao TEXT,
    
    tipo VARCHAR(20) NOT NULL DEFAULT 'adicional' CHECK (tipo IN ('variacao', 'adicional', 'obrigatorio')),
    
    minimo_selecao INTEGER DEFAULT 0,
    maximo_selecao INTEGER DEFAULT 10,
    
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produto_opcoes_empresa ON produto_opcoes(empresa_id);

-- =====================================================
-- TABELA: produto_opcao_itens
-- Itens de cada opção (ex: Pequeno, Médio, Grande)
-- =====================================================

CREATE TABLE IF NOT EXISTS produto_opcao_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opcao_id UUID NOT NULL REFERENCES produto_opcoes(id) ON DELETE CASCADE,
    
    nome VARCHAR(100) NOT NULL,
    preco_adicional DECIMAL(15,2) DEFAULT 0,
    
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produto_opcao_itens_opcao ON produto_opcao_itens(opcao_id);

-- =====================================================
-- TABELA: produto_opcao_produtos
-- Relacionamento entre produtos e opções
-- =====================================================

CREATE TABLE IF NOT EXISTS produto_opcao_produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    opcao_id UUID NOT NULL REFERENCES produto_opcoes(id) ON DELETE CASCADE,
    
    ordem INTEGER DEFAULT 0,
    
    UNIQUE(produto_id, opcao_id)
);

CREATE INDEX IF NOT EXISTS idx_produto_opcao_produtos_produto ON produto_opcao_produtos(produto_id);

-- =====================================================
-- TABELA: empresa_delivery_config
-- Configurações de delivery da empresa
-- =====================================================

CREATE TABLE IF NOT EXISTS empresa_delivery_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
    
    -- Ativação
    delivery_ativo BOOLEAN DEFAULT true,
    retirada_ativo BOOLEAN DEFAULT true,
    consumo_local_ativo BOOLEAN DEFAULT false,
    
    -- Horários
    horario_abertura TIME DEFAULT '08:00',
    horario_fechamento TIME DEFAULT '22:00',
    dias_funcionamento INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',  -- 1=Dom, 7=Sáb
    
    -- Taxa de entrega
    taxa_entrega_padrao DECIMAL(15,2) DEFAULT 0,
    taxa_entrega_gratis_acima DECIMAL(15,2),  -- Frete grátis acima de X
    raio_entrega_km DECIMAL(5,2) DEFAULT 5,
    
    -- Tempo estimado
    tempo_preparo_min INTEGER DEFAULT 20,
    tempo_preparo_max INTEGER DEFAULT 45,
    tempo_entrega_min INTEGER DEFAULT 15,
    tempo_entrega_max INTEGER DEFAULT 30,
    
    -- Pedidos
    pedido_minimo DECIMAL(15,2) DEFAULT 0,
    aceita_agendamento BOOLEAN DEFAULT false,
    
    -- Pagamentos aceitos
    aceita_dinheiro BOOLEAN DEFAULT true,
    aceita_cartao BOOLEAN DEFAULT true,
    aceita_pix BOOLEAN DEFAULT true,
    aceita_cartao_online BOOLEAN DEFAULT false,
    
    -- Mensagens
    mensagem_pedido_recebido TEXT DEFAULT 'Seu pedido foi recebido e está sendo processado.',
    mensagem_pedido_pronto TEXT DEFAULT 'Seu pedido está pronto!',
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_empresa_delivery_config_empresa ON empresa_delivery_config(empresa_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
DROP TRIGGER IF EXISTS update_cliente_enderecos_updated_at ON cliente_enderecos;
DROP TRIGGER IF EXISTS update_pedido_delivery_updated_at ON pedido_delivery;
DROP TRIGGER IF EXISTS update_cupons_desconto_updated_at ON cupons_desconto;
DROP TRIGGER IF EXISTS update_empresa_delivery_config_updated_at ON empresa_delivery_config;

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cliente_enderecos_updated_at BEFORE UPDATE ON cliente_enderecos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedido_delivery_updated_at BEFORE UPDATE ON pedido_delivery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cupons_desconto_updated_at BEFORE UPDATE ON cupons_desconto
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_empresa_delivery_config_updated_at BEFORE UPDATE ON empresa_delivery_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_enderecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_delivery_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_delivery_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_delivery_avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupons_desconto ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_cardapio ENABLE ROW LEVEL SECURITY;
ALTER TABLE produto_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produto_opcao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE produto_opcao_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_delivery_config ENABLE ROW LEVEL SECURITY;

-- Políticas para clientes
CREATE POLICY "Clientes podem visualizar próprio perfil" ON clientes
    FOR SELECT USING (true);  -- Por enquanto permite todos

CREATE POLICY "Clientes podem criar perfil" ON clientes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Clientes podem atualizar próprio perfil" ON clientes
    FOR UPDATE USING (true);

-- Políticas para endereços
CREATE POLICY "Endereços visíveis para cliente" ON cliente_enderecos
    FOR SELECT USING (true);

CREATE POLICY "Clientes podem criar endereços" ON cliente_enderecos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Clientes podem atualizar endereços" ON cliente_enderecos
    FOR UPDATE USING (true);

CREATE POLICY "Clientes podem excluir endereços" ON cliente_enderecos
    FOR DELETE USING (true);

-- Políticas para pedidos
CREATE POLICY "Pedidos visíveis para empresa e cliente" ON pedido_delivery
    FOR SELECT USING (true);

CREATE POLICY "Clientes podem criar pedidos" ON pedido_delivery
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Empresa pode atualizar pedidos" ON pedido_delivery
    FOR UPDATE USING (true);

-- Políticas para itens de pedido
CREATE POLICY "Itens visíveis" ON pedido_delivery_itens
    FOR SELECT USING (true);

CREATE POLICY "Pode criar itens" ON pedido_delivery_itens
    FOR INSERT WITH CHECK (true);

-- Políticas para histórico
CREATE POLICY "Histórico visível" ON pedido_delivery_historico
    FOR SELECT USING (true);

CREATE POLICY "Pode criar histórico" ON pedido_delivery_historico
    FOR INSERT WITH CHECK (true);

-- Políticas para avaliações
CREATE POLICY "Avaliações visíveis" ON pedido_delivery_avaliacoes
    FOR SELECT USING (true);

CREATE POLICY "Clientes podem avaliar" ON pedido_delivery_avaliacoes
    FOR INSERT WITH CHECK (true);

-- Políticas para cupons
CREATE POLICY "Cupons visíveis quando ativos" ON cupons_desconto
    FOR SELECT USING (ativo = true);

-- Políticas para categorias
CREATE POLICY "Categorias visíveis" ON categorias_cardapio
    FOR SELECT USING (ativo = true);

-- Políticas para opções
CREATE POLICY "Opções visíveis" ON produto_opcoes
    FOR SELECT USING (ativo = true);

CREATE POLICY "Itens de opção visíveis" ON produto_opcao_itens
    FOR SELECT USING (ativo = true);

-- Políticas para config delivery
CREATE POLICY "Config delivery visível" ON empresa_delivery_config
    FOR SELECT USING (true);
