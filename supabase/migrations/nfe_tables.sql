-- =============================================
-- MIGRAÇÃO COMPLETA: NFE + CLIENTES
-- Sistema de Cafeterias - Nota Fiscal Eletrônica Brasileira
-- Execute este SQL no SQL Editor do Supabase
-- =============================================

-- =============================================
-- 1. TABELA DE CLIENTES (cadastro para NF-e)
-- =============================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  -- Tipo: 1=Pessoa Jurídica (CNPJ), 2=Pessoa Física (CPF)
  tipo_pessoa VARCHAR(1) NOT NULL DEFAULT '2' CHECK (tipo_pessoa IN ('1', '2')),

  -- CNPJ/CPF (apenas dígitos, sem formatação)
  cnpj_cpf VARCHAR(14) NOT NULL,

  -- Razão Social / Nome Completo
  nome_razao_social VARCHAR(255) NOT NULL,

  -- Nome Fantasia (PF não usa)
  nome_fantasia VARCHAR(255),

  -- Inscrição Estadual
  inscricao_estadual VARCHAR(20),

  -- Indicador IE: 1=Contribuinte, 2=Isento, 9=Não Contribuinte
  indicador_ie INTEGER NOT NULL DEFAULT 9 CHECK (indicador_ie IN (1, 2, 9)),

  -- Inscricao Municipal
  inscricao_municipal VARCHAR(20),

  -- Suframa (Zona Franca)
  suframa VARCHAR(20),

  -- E-mail
  email VARCHAR(255),

  -- Telefone
  telefone VARCHAR(20),

  -- Celular
  celular VARCHAR(20),

  -- Endereço
  logradouro VARCHAR(255) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  complemento VARCHAR(100),
  bairro VARCHAR(100) NOT NULL,
  codigo_municipio VARCHAR(7) NOT NULL,
  municipio VARCHAR(100) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  cep VARCHAR(8) NOT NULL,
  pais_codigo VARCHAR(4) DEFAULT '1058',
  pais_nome VARCHAR(100) DEFAULT 'BRASIL',

  -- Observações
  observacoes TEXT,

  -- Status do cliente
  ativo BOOLEAN NOT NULL DEFAULT true,

  -- Controle
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Não permite cliente duplicado na mesma empresa
  UNIQUE(empresa_id, cnpj_cpf)
);

-- =============================================
-- 2. TABELA DE CONFIGURAÇÃO DA NF-E POR EMPRESA
-- =============================================
CREATE TABLE IF NOT EXISTS nfe_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  -- Ambiente
  ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),

  -- Dados do Emitente
  cnpj VARCHAR(14) NOT NULL,
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),

  -- Endereço do Emitente
  logradouro VARCHAR(255) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  complemento VARCHAR(100),
  bairro VARCHAR(100) NOT NULL,
  codigo_municipio VARCHAR(7) NOT NULL,
  municipio VARCHAR(100) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  cep VARCHAR(8) NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(255),

  -- Regime Tributário: 1=Simples, 2=Simples excesso, 3=Normal
  regime_tributario VARCHAR(1) NOT NULL DEFAULT '1' CHECK (regime_tributario IN ('1', '2', '3')),

  -- Configurações de Emissão NF-e
  serie_nfe VARCHAR(3) NOT NULL DEFAULT '1',
  numero_inicial_nfe INTEGER NOT NULL DEFAULT 1,
  numero_atual_nfe INTEGER NOT NULL DEFAULT 0,

  -- CFOP padrão
  cfop_saida_padrao VARCHAR(4) DEFAULT '5102',
  cfop_entrada_padrao VARCHAR(4) DEFAULT '2102',

  -- CST/CSOSN padrão
  cst_padrao VARCHAR(3) DEFAULT '00',
  csosn_padrao VARCHAR(3) DEFAULT '102',
  ncm_padrao VARCHAR(8) DEFAULT '00000000',
  unidade_padrao VARCHAR(6) DEFAULT 'UN',

  -- Tributos
  icms_aliquota DECIMAL(5,2) DEFAULT 0.00,
  icms_situacao_tributaria VARCHAR(5),
  pis_aliquota DECIMAL(5,2) DEFAULT 0.00,
  pis_situacao_tributaria VARCHAR(3),
  cofins_aliquota DECIMAL(5,2) DEFAULT 0.00,
  cofins_situacao_tributaria VARCHAR(3),
  ipi_aliquota DECIMAL(5,2) DEFAULT 0.00,
  ipi_situacao_tributaria VARCHAR(3),

  -- Certificado Digital
  certificado_id UUID REFERENCES nfce_certificados(id) ON DELETE SET NULL,

  -- Informações Adicionais
  informacoes_adicionais TEXT,
  informacoes_fisco TEXT,
  natureza_operacao_padrao VARCHAR(60) DEFAULT 'VENDA DE MERCADORIA',

  -- Contingência
  em_contingencia BOOLEAN NOT NULL DEFAULT false,
  tipo_contingencia VARCHAR(3),
  motivo_contingencia TEXT,
  data_hora_contingencia TIMESTAMPTZ,

  -- Impressão DANFE
  imprimir_danfe_automatico BOOLEAN NOT NULL DEFAULT false,
  formato_danfe VARCHAR(10) DEFAULT 'A4',
  impressora_danfe VARCHAR(255),

  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(empresa_id)
);

-- =============================================
-- 3. TABELA PRINCIPAL DE NF-e EMITIDAS
-- =============================================
CREATE TABLE IF NOT EXISTS nfe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  -- Identificação
  numero INTEGER NOT NULL,
  serie VARCHAR(3) NOT NULL,
  modelo VARCHAR(2) NOT NULL DEFAULT '55',
  ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao',
  chave VARCHAR(44) NOT NULL,
  chave_recibo VARCHAR(30),
  codigo_numerico VARCHAR(8),
  versao VARCHAR(5) DEFAULT '4.00',
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',

  -- Operação
  natureza_operacao VARCHAR(60) NOT NULL DEFAULT 'VENDA DE MERCADORIA',
  tipo_operacao INTEGER NOT NULL DEFAULT 1 CHECK (tipo_operacao IN (0, 1)),
  forma_emissao INTEGER NOT NULL DEFAULT 1,
  finalidade INTEGER NOT NULL DEFAULT 1,
  indicador_presenca INTEGER NOT NULL DEFAULT 1,
  indicador_destino INTEGER NOT NULL DEFAULT 1,
  processo_emissao INTEGER NOT NULL DEFAULT 0,

  -- Partes (JSONB)
  emitente JSONB NOT NULL,
  destinatario JSONB,
  local_retirada JSONB,
  local_entrega JSONB,
  produtos JSONB NOT NULL DEFAULT '[]',

  -- Totais
  total_icms DECIMAL(15,2) DEFAULT 0.00,
  total_icms_st DECIMAL(15,2) DEFAULT 0.00,
  total_icms_fcp DECIMAL(15,2) DEFAULT 0.00,
  total_icms_st_fcp DECIMAL(15,2) DEFAULT 0.00,
  total_icms_st_ret DECIMAL(15,2) DEFAULT 0.00,
  total_icms_st_ret_fcp DECIMAL(15,2) DEFAULT 0.00,
  total_fcp DECIMAL(15,2) DEFAULT 0.00,
  base_calculo_icms DECIMAL(15,2) DEFAULT 0.00,
  base_calculo_icms_st DECIMAL(15,2) DEFAULT 0.00,
  total_produtos DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_frete DECIMAL(15,2) DEFAULT 0.00,
  total_seguro DECIMAL(15,2) DEFAULT 0.00,
  total_desconto DECIMAL(15,2) DEFAULT 0.00,
  total_ii DECIMAL(15,2) DEFAULT 0.00,
  total_ipi DECIMAL(15,2) DEFAULT 0.00,
  total_ipi_devol DECIMAL(15,2) DEFAULT 0.00,
  total_pis DECIMAL(15,2) DEFAULT 0.00,
  total_cofins DECIMAL(15,2) DEFAULT 0.00,
  total_outras_despesas DECIMAL(15,2) DEFAULT 0.00,
  total_nota DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  -- Pagamentos, Transporte, Cobrança (JSONB)
  pagamentos JSONB DEFAULT '[]',
  transporte JSONB,
  cobranca JSONB,

  -- Informações adicionais
  informacoes_adicionais TEXT,
  informacoes_fisco TEXT,
  informacoes_complementares TEXT,

  -- Datas
  data_emissao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_saida_entrada TIMESTAMPTZ,
  data_horario_inicio_emissao TIMESTAMPTZ DEFAULT now(),

  -- Autorização SEFAZ
  protocolo_autorizacao VARCHAR(30),
  data_autorizacao TIMESTAMPTZ,
  versao_aplicacao VARCHAR(20),

  -- Rejeição
  codigo_rejeicao VARCHAR(10),
  mensagem_rejeicao TEXT,

  -- Cancelamento
  protocolo_cancelamento VARCHAR(30),
  data_cancelamento TIMESTAMPTZ,
  motivo_cancelamento TEXT,

  -- Denegação
  protocolo_denegacao VARCHAR(30),
  data_denegacao TIMESTAMPTZ,
  motivo_denegacao TEXT,

  -- Carta de Correção
  numero_cc_e INTEGER DEFAULT 0,

  -- XML
  xml_enviado TEXT,
  xml_assinado TEXT,
  xml_autorizado TEXT,
  xml_cancelamento TEXT,
  xml_cc_e TEXT,

  -- DANFE
  danfe_url TEXT,
  danfe_base64 TEXT,

  -- Venda/Pedido relacionado
  venda_id UUID,
  pedido_id UUID,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,

  -- Contingência
  em_contingencia BOOLEAN NOT NULL DEFAULT false,
  tipo_contingencia VARCHAR(3),

  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. TABELA DE EVENTOS DA NF-e
-- =============================================
CREATE TABLE IF NOT EXISTS nfe_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_id UUID NOT NULL REFERENCES nfe(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('cancelamento', 'carta_correcao', 'inutilizacao', 'consultar', 'outros')),
  codigo_evento VARCHAR(6) NOT NULL,
  descricao VARCHAR(100),
  sequencial INTEGER NOT NULL DEFAULT 1,
  data_evento TIMESTAMPTZ NOT NULL DEFAULT now(),
  justificativa TEXT,
  condicoes_uso TEXT,
  correcoes JSONB DEFAULT '[]',
  protocolo VARCHAR(30),
  data_registro TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizado', 'rejeitado')),
  codigo_rejeicao VARCHAR(10),
  mensagem_rejeicao TEXT,
  xml_envio TEXT,
  xml_retorno TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 5. TABELA DE INUTILIZAÇÃO DE NUMERAÇÃO
-- =============================================
CREATE TABLE IF NOT EXISTS nfe_inutilizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  ano INTEGER NOT NULL,
  serie VARCHAR(3) NOT NULL,
  numero_inicial INTEGER NOT NULL,
  numero_final INTEGER NOT NULL,
  ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao',
  uf VARCHAR(2) NOT NULL,
  cnpj VARCHAR(14) NOT NULL,
  justificativa TEXT NOT NULL,

  protocolo VARCHAR(30),
  data_registro TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizado', 'rejeitado')),
  codigo_rejeicao VARCHAR(10),
  mensagem_rejeicao TEXT,
  xml_envio TEXT,
  xml_retorno TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 6. TABELA DE LOGS DE COMUNICAÇÃO SEFAZ
-- =============================================
CREATE TABLE IF NOT EXISTS nfe_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nfe_id UUID REFERENCES nfe(id) ON DELETE SET NULL,

  operacao VARCHAR(50) NOT NULL,
  ambiente VARCHAR(20) NOT NULL,
  uf VARCHAR(2),
  servico VARCHAR(100),
  versao_servico VARCHAR(10),
  requisicao TEXT,
  resposta TEXT,
  xml_enviado TEXT,
  xml_recebido TEXT,
  sucesso BOOLEAN NOT NULL DEFAULT false,
  codigo_status VARCHAR(10),
  mensagem TEXT,
  tempo_ms INTEGER,
  ip_servidor VARCHAR(50),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 7. ÍNDICES
-- =============================================

-- Clientes
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes(empresa_id, cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(empresa_id, nome_razao_social);
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes(empresa_id, ativo);

-- NFE
CREATE INDEX IF NOT EXISTS idx_nfe_empresa_data ON nfe(empresa_id, data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_nfe_chave ON nfe(chave);
CREATE INDEX IF NOT EXISTS idx_nfe_status ON nfe(status);
CREATE INDEX IF NOT EXISTS idx_nfe_numero_serie ON nfe(empresa_id, serie, numero);
CREATE INDEX IF NOT EXISTS idx_nfe_venda ON nfe(venda_id);
CREATE INDEX IF NOT EXISTS idx_nfe_cliente ON nfe(cliente_id);

-- Eventos
CREATE INDEX IF NOT EXISTS idx_nfe_eventos_nfe ON nfe_eventos(nfe_id);
CREATE INDEX IF NOT EXISTS idx_nfe_eventos_empresa ON nfe_eventos(empresa_id, data_evento DESC);

-- Inutilização
CREATE INDEX IF NOT EXISTS idx_nfe_inutilizacao_empresa ON nfe_inutilizacao(empresa_id, criado_em DESC);

-- Logs
CREATE INDEX IF NOT EXISTS idx_nfe_logs_empresa ON nfe_logs(empresa_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_nfe_logs_nfe ON nfe_logs(nfe_id);

-- =============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_inutilizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para CLIENTES
CREATE POLICY "Empresas podem ver próprios clientes" ON clientes
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem inserir próprios clientes" ON clientes
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem atualizar próprios clientes" ON clientes
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem deletar próprios clientes" ON clientes
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- Políticas para NFE CONFIG
CREATE POLICY "Empresas podem ver própria config NFE" ON nfe_config
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem inserir própria config NFE" ON nfe_config
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem atualizar própria config NFE" ON nfe_config
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- Políticas para NFE
CREATE POLICY "Empresas podem ver próprias NFEs" ON nfe
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem inserir próprias NFEs" ON nfe
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem atualizar próprias NFEs" ON nfe
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- Políticas para NFE EVENTOS
CREATE POLICY "Empresas podem ver próprios eventos NFE" ON nfe_eventos
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem inserir próprios eventos NFE" ON nfe_eventos
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- Políticas para NFE INUTILIZAÇÃO
CREATE POLICY "Empresas podem ver próprias inutilizações NFE" ON nfe_inutilizacao
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem inserir próprias inutilizações NFE" ON nfe_inutilizacao
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- Políticas para NFE LOGS
CREATE POLICY "Empresas podem ver próprios logs NFE" ON nfe_logs
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Empresas podem inserir próprios logs NFE" ON nfe_logs
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));
