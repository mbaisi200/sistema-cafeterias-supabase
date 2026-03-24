-- =====================================================
-- MIGRAÇÃO: NFC-e (NOTA FISCAL DE CONSUMIDOR ELETRÔNICA)
-- Modelo 65
-- =====================================================

-- =====================================================
-- TABELA: nfce_certificados
-- Certificados digitais A1 para assinatura NFC-e
-- =====================================================

CREATE TABLE IF NOT EXISTS nfce_certificados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    nome_arquivo VARCHAR(255) NOT NULL,
    arquivo_base64 TEXT NOT NULL,
    senha TEXT NOT NULL,
    
    cnpj VARCHAR(14),
    razao_social VARCHAR(100),
    validade_inicio TIMESTAMP WITH TIME ZONE,
    validade_fim TIMESTAMP WITH TIME ZONE,
    emissor VARCHAR(100),
    
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfce_certificados_empresa ON nfce_certificados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_nfce_certificados_ativo ON nfce_certificados(empresa_id, ativo);

-- =====================================================
-- TABELA: nfce_config
-- Configurações de emissão de NFC-e por empresa
-- =====================================================

CREATE TABLE IF NOT EXISTS nfce_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
    
    cnpj VARCHAR(14) NOT NULL,
    inscricao_estadual VARCHAR(20) NOT NULL,
    inscricao_municipal VARCHAR(20),
    razao_social VARCHAR(100) NOT NULL,
    nome_fantasia VARCHAR(100),
    
    logradouro VARCHAR(100) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    complemento VARCHAR(100),
    bairro VARCHAR(50) NOT NULL,
    codigo_municipio VARCHAR(7) NOT NULL,
    municipio VARCHAR(60) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    cep VARCHAR(8) NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR(100),
    
    regime_tributario CHAR(1) NOT NULL DEFAULT '1' CHECK (regime_tributario IN ('1', '2', '3')),
    
    serie VARCHAR(3) NOT NULL DEFAULT '1',
    numero_inicial INTEGER NOT NULL DEFAULT 1,
    numero_atual INTEGER NOT NULL DEFAULT 0,
    
    certificado_id UUID REFERENCES nfce_certificados(id),
    
    csosn_padrao VARCHAR(3) NOT NULL DEFAULT '102',
    cfop_padrao VARCHAR(4) NOT NULL DEFAULT '5102',
    ncm_padrao VARCHAR(8),
    unidade_padrao VARCHAR(6) NOT NULL DEFAULT 'UN',
    
    informacoes_adicionais TEXT,
    informacoes_fisco TEXT,
    
    icms_situacao_tributaria VARCHAR(3),
    icms_aliquota DECIMAL(5,2),
    
    pis_aliquota DECIMAL(5,2),
    cofins_aliquota DECIMAL(5,2),
    
    imprimir_danfe_automatico BOOLEAN NOT NULL DEFAULT true,
    mensagem_consumidor TEXT,
    
    em_contingencia BOOLEAN NOT NULL DEFAULT false,
    motivo_contingencia TEXT,
    data_hora_contingencia TIMESTAMP WITH TIME ZONE,
    
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_nfce_config_empresa ON nfce_config(empresa_id);

-- =====================================================
-- TABELA: nfce
-- Notas Fiscais de Consumidor Eletrônicas emitidas
-- =====================================================

CREATE TABLE IF NOT EXISTS nfce (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    numero INTEGER NOT NULL,
    serie VARCHAR(3) NOT NULL,
    modelo CHAR(2) NOT NULL DEFAULT '65',
    ambiente VARCHAR(20) NOT NULL CHECK (ambiente IN ('homologacao', 'producao')),
    
    chave VARCHAR(44) NOT NULL UNIQUE,
    chave_recibo VARCHAR(44),
    
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizada', 'rejeitada', 'cancelada', 'inutilizada')),
    
    emitente JSONB NOT NULL,
    destinatario JSONB,
    produtos JSONB NOT NULL DEFAULT '[]',
    
    total_produtos DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_desconto DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_liquido DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    pagamentos JSONB NOT NULL DEFAULT '[]',
    troco DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    modalidade_frete CHAR(1) NOT NULL DEFAULT '9',
    informacoes_adicionais TEXT,
    
    data_emissao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_saida TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    protocolo_autorizacao VARCHAR(20),
    data_autorizacao TIMESTAMP WITH TIME ZONE,
    
    codigo_rejeicao VARCHAR(5),
    mensagem_rejeicao TEXT,
    
    protocolo_cancelamento VARCHAR(20),
    data_cancelamento TIMESTAMP WITH TIME ZONE,
    motivo_cancelamento TEXT,
    
    danfe_base64 TEXT,
    danfe_html TEXT,
    
    qr_code TEXT,
    qr_code_base64 TEXT,
    
    xml_assinado TEXT,
    xml_autorizado TEXT,
    
    venda_id UUID REFERENCES vendas(id),
    
    em_contingencia BOOLEAN NOT NULL DEFAULT false,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(empresa_id, serie, numero)
);

CREATE INDEX IF NOT EXISTS idx_nfce_empresa ON nfce(empresa_id);
CREATE INDEX IF NOT EXISTS idx_nfce_chave ON nfce(chave);
CREATE INDEX IF NOT EXISTS idx_nfce_status ON nfce(status);
CREATE INDEX IF NOT EXISTS idx_nfce_data_emissao ON nfce(data_emissao DESC);

-- =====================================================
-- TABELA: nfce_eventos
-- Eventos relacionados às NFC-e
-- =====================================================

CREATE TABLE IF NOT EXISTS nfce_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfce_id UUID NOT NULL REFERENCES nfce(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('cancelamento', 'carta_correcao', 'inutilizacao')),
    codigo_tipo VARCHAR(6) NOT NULL,
    descricao_tipo VARCHAR(100) NOT NULL,
    
    sequencial INTEGER NOT NULL DEFAULT 1,
    data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    protocolo VARCHAR(20),
    data_registro TIMESTAMP WITH TIME ZONE,
    
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizado', 'rejeitado')),
    codigo_rejeicao VARCHAR(5),
    mensagem_rejeicao TEXT,
    
    xml_envio TEXT,
    xml_retorno TEXT,
    
    dados_adicionais JSONB,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(nfce_id, tipo, sequencial)
);

-- =====================================================
-- TABELA: nfce_logs
-- Logs de comunicação com SEFAZ
-- =====================================================

CREATE TABLE IF NOT EXISTS nfce_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nfce_id UUID REFERENCES nfce(id) ON DELETE SET NULL,
    
    operacao VARCHAR(50) NOT NULL,
    ambiente VARCHAR(20) NOT NULL,
    
    requisicao TEXT,
    resposta TEXT,
    
    sucesso BOOLEAN NOT NULL DEFAULT false,
    codigo_status VARCHAR(5),
    mensagem TEXT,
    
    tempo_ms INTEGER,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfce_logs_empresa ON nfce_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_nfce_logs_nfce ON nfce_logs(nfce_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_nfce_config_updated_at BEFORE UPDATE ON nfce_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfce_certificados_updated_at BEFORE UPDATE ON nfce_certificados
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfce_updated_at BEFORE UPDATE ON nfce
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE nfce_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfce_certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfce ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfce_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfce_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar configurações da própria empresa" ON nfce_config
    FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Admins podem inserir configurações" ON nfce_config
    FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins podem atualizar configurações" ON nfce_config
    FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Usuários podem visualizar certificados da própria empresa" ON nfce_certificados
    FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Admins podem inserir certificados" ON nfce_certificados
    FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins podem atualizar certificados" ON nfce_certificados
    FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins podem excluir certificados" ON nfce_certificados
    FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Usuários podem visualizar NFC-es da própria empresa" ON nfce
    FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Usuários podem inserir NFC-es" ON nfce
    FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Usuários podem atualizar NFC-es" ON nfce
    FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Usuários podem visualizar eventos da própria empresa" ON nfce_eventos
    FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Usuários podem visualizar logs da própria empresa" ON nfce_logs
    FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
