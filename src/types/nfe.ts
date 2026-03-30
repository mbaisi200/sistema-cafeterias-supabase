// Tipos para NF-e (Nota Fiscal Eletrônica) - Modelo 55

// =============================================
// Tipos Base / Enums
// =============================================

export type AmbienteNFe = 'homologacao' | 'producao';
export type StatusNFe = 'pendente' | 'autorizada' | 'rejeitada' | 'cancelada' | 'denegada' | 'inutilizada' | 'contingencia';
export type RegimeTributario = '1' | '2' | '3'; // 1=Simples Nacional, 2=Excesso sublimite, 3=Regime Normal
export type FinalidadeNFe = 1 | 2 | 3 | 4; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
export type TipoOperacao = 0 | 1; // 0=Entrada, 1=Saída
export type IndicadorPresenca = 0 | 1 | 2 | 3 | 4 | 5 | 9;
export type IndicadorDestino = 1 | 2 | 3; // 1=Interna, 2=Interestadual, 3=Exterior
export type FormaEmissao = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type FormatoImpressao = 1 | 2; // 1=Retrato, 2=Paisagem
export type TipoImpressao = 1 | 2 | 3 | 4 | 5; // 1=DANFe Retrato, etc.
export type FormaPagamento = '01' | '02' | '03' | '04' | '05' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '90' | '99';

// =============================================
// Endereço
// =============================================

export interface EnderecoNFe {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigo_municipio: string;
  municipio: string;
  uf: string;
  cep: string;
  pais_codigo?: string; // Default: 1058 (Brasil)
  pais_nome?: string; // Default: Brasil
  telefone?: string;
  email?: string;
}

// =============================================
// Emitente
// =============================================

export interface EmitenteNFe {
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal?: string;
  razao_social: string;
  nome_fantasia?: string;
  endereco: EnderecoNFe;
  regime_tributario: RegimeTributario;
  cnae_fiscal?: string;
  cnae_fiscal_inicio_atividade?: string;
}

// =============================================
// Destinatário
// =============================================

export interface DestinatarioNFe {
  cnpj_cpf: string;
  ie?: string; // Isento ou vazio para CPF
  isento_icms?: boolean;
  nome_razao_social: string;
  nome_fantasia?: string;
  endereco: EnderecoNFe;
  indicador_ie_destinatario: 1 | 2 | 9; // 1=Contribuinte ICMS, 2=Contribuinte Isento, 9=Não Contribuinte
  email?: string;
  telefone?: string;
}

// =============================================
// Produto / Item da NF-e
// =============================================

export interface ProdutoNFe {
  // Identificação do produto
  codigo: string;
  codigo_barras?: string; // GTIN/EAN
  descricao: string;
  ncm: string; // 8 dígitos
  nve?: string; // Nomenclatura de Valor Aduaneiro
  cest?: string; // Código Especificador da Substituição Tributária
  extipi?: string; // EX TIPI
  cfop: string;

  // Unidades
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_total: number;

  unidade_tributavel: string;
  quantidade_tributavel: number;
  valor_unitario_tributavel: number;

  // EAN tributável
  codigo_barras_tributavel?: string;

  // Frete e seguro por item
  valor_frete?: number;
  valor_seguro?: number;
  valor_desconto?: number;
  valor_outras_despesas?: number;

  // Indicador de totalização
  indica_total: 0 | 1;

  // Número do pedido de compra
  numero_pedido?: string;
  item_pedido?: number;

  // ICMS
  icms_origem: string; // 0..8
  icms_cst?: string; // Regime Normal: 00,10,20,30,40,41,50,51,60,70,90
  icms_csosn?: string; // Simples Nacional: 101,102,103,201,202,203,300,400,500,900
  icms_modalidade_base_calculo?: string;
  icms_percentual_reducao_bc?: number;
  icms_valor_base_calculo?: number;
  icms_aliquota?: number;
  icms_valor?: number;
  icms_valor_proprio?: number;
  icms_st_modalidade_base_calculo?: string;
  icms_st_percentual_margem_valor_adicionado?: number;
  icms_st_percentual_reducao_bc?: number;
  icms_st_valor_base_calculo?: number;
  icms_st_aliquota?: number;
  icms_st_valor?: number;
  icms_st_percentual_fcp?: number;
  icms_st_valor_fcp?: number;
  icms_fcp_percentual?: number;
  icms_fcp_valor?: number;
  icms_motivo_desoneracao?: string;
  icms_valor_icms_desoneracao?: number;

  // PIS
  pis_cst?: string;
  pis_valor_base_calculo?: number;
  pis_aliquota_percentual?: number;
  pis_valor?: number;
  pis_quantidade_vendida?: number;
  pis_valor_por_unidade?: number;

  // COFINS
  cofins_cst?: string;
  cofins_valor_base_calculo?: number;
  cofins_aliquota_percentual?: number;
  cofins_valor?: number;
  cofins_quantidade_vendida?: number;
  cofins_valor_por_unidade?: number;

  // IPI
  ipi_cst?: string;
  ipi_codigo_enquadramento?: string;
  ipi_valor_base_calculo?: number;
  ipi_aliquota_percentual?: number;
  ipi_valor?: number;
  ipi_valor_unidade?: number;
  ipi_quantidade_unidade?: number;

  // Informações adicionais do produto
  informacoes_adicionais?: string;
}

// =============================================
// Pagamento
// =============================================

export interface PagamentoNFe {
  forma_pagamento: FormaPagamento;
  valor: number;
  carteira?: string;
  autorizacao?: string;
  data_vencimento?: string;
  cnpj_credenciadora?: string;
  bandeira_operadora?: string;
  numero_parcela?: number;
  valor_parcela?: number;
}

// =============================================
// Transporte
// =============================================

export interface TransporteNFe {
  modalidade_frete: 0 | 1 | 2 | 3 | 4 | 9; // 0=Por conta emitente, 1=Por conta destinatário, etc., 9=Sem frete
  transportador?: {
    cnpj_cpf?: string;
    nome?: string;
    ie?: string;
    endereco?: string;
    municipio?: string;
    uf?: string;
  };
  veiculo?: {
    placa?: string;
    uf?: string;
    rntc?: string;
  };
  reboque?: Array<{
    placa?: string;
    uf?: string;
    rntc?: string;
  }>;
  volumes?: Array<{
    quantidade: number;
    especie: string;
    marca: string;
    numeracao: string;
    peso_liquido: number;
    peso_bruto: number;
    lacres?: Array<{ numero: string }>;
  }>;
}

// =============================================
// Configuração NFE
// =============================================

export interface NFeConfig {
  id?: string;
  empresa_id: string;
  ambiente: AmbienteNFe;

  // Dados do Emitente
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal?: string;
  razao_social: string;
  nome_fantasia?: string;

  // Endereço do Emitente
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigo_municipio: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone?: string;
  email?: string;

  // Regime Tributário
  regime_tributario: RegimeTributario;

  // Configurações de Emissão NF-e
  serie_nfe: string;
  numero_inicial_nfe: number;
  numero_atual_nfe: number;

  // CFOP padrão
  cfop_saida_padrao: string;
  cfop_entrada_padrao: string;

  // CST/CSOSN padrão
  cst_padrao: string;
  csosn_padrao: string;
  ncm_padrao: string;
  unidade_padrao: string;

  // ICMS
  icms_aliquota: number;
  icms_situacao_tributaria?: string;

  // PIS
  pis_aliquota: number;
  pis_situacao_tributaria?: string;

  // COFINS
  cofins_aliquota: number;
  cofins_situacao_tributaria?: string;

  // IPI
  ipi_aliquota: number;
  ipi_situacao_tributaria?: string;

  // Certificado Digital (compartilhado com NFC-e)
  certificado_id?: string;

  // Informações Adicionais
  informacoes_adicionais?: string;
  informacoes_fisco?: string;
  natureza_operacao_padrao: string;

  // Contingência
  em_contingencia: boolean;
  tipo_contingencia?: string;
  motivo_contingencia?: string;
  data_hora_contingencia?: Date;

  // Impressão DANFE
  imprimir_danfe_automatico: boolean;
  formato_danfe: string;
  impressora_danfe?: string;

  ativo: boolean;
  criado_em?: Date;
  atualizado_em?: Date;
}

// =============================================
// NF-e (Nota Fiscal Eletrônica)
// =============================================

export interface NFe {
  id: string;
  empresa_id: string;

  // Identificação
  numero: number;
  serie: string;
  modelo: string;
  ambiente: AmbienteNFe;
  versao: string;
  chave: string;
  chave_recibo?: string;
  codigo_numerico?: string;

  // Status
  status: StatusNFe;

  // Operação
  natureza_operacao: string;
  tipo_operacao: TipoOperacao;
  forma_emissao: FormaEmissao;
  finalidade: FinalidadeNFe;
  indicador_presenca: IndicadorPresenca;
  indicador_destino: IndicadorDestino;
  processo_emissao: number;

  // Emitente
  emitente: EmitenteNFe;

  // Destinatário
  destinatario?: DestinatarioNFe;

  // Local de retirada / entrega
  local_retirada?: EnderecoNFe;
  local_entrega?: EnderecoNFe;

  // Produtos
  produtos: ProdutoNFe[];

  // Totais ICMS
  total_icms: number;
  total_icms_st: number;
  total_icms_fcp: number;
  total_icms_st_fcp: number;
  total_icms_st_ret: number;
  total_icms_st_ret_fcp: number;
  total_fcp: number;
  base_calculo_icms: number;
  base_calculo_icms_st: number;

  // Totais gerais
  total_produtos: number;
  total_frete: number;
  total_seguro: number;
  total_desconto: number;
  total_ii: number;
  total_ipi: number;
  total_ipi_devol: number;
  total_pis: number;
  total_cofins: number;
  total_outras_despesas: number;
  total_nota: number;

  // Pagamentos
  pagamentos: PagamentoNFe[];

  // Transporte
  transporte?: TransporteNFe;

  // Cobrança
  cobranca?: {
    fatura?: { numero: string; valor_original: number; valor_desconto: number; valor_liquido: number; vencimento: string };
    duplicatas?: Array<{ numero duplicata: string; data_vencimento: string; valor: number }>;
  };

  // Informações adicionais
  informacoes_adicionais?: string;
  informacoes_fisco?: string;
  informacoes_complementares?: string;

  // Datas
  data_emissao: Date;
  data_saida_entrada?: Date;
  data_horario_inicio_emissao?: Date;

  // Autorização
  protocolo_autorizacao?: string;
  data_autorizacao?: Date;
  versao_aplicacao?: string;

  // Rejeição
  codigo_rejeicao?: string;
  mensagem_rejeicao?: string;

  // Cancelamento
  protocolo_cancelamento?: string;
  data_cancelamento?: Date;
  motivo_cancelamento?: string;

  // Denegação
  protocolo_denegacao?: string;
  data_denegacao?: Date;
  motivo_denegacao?: string;

  // Carta de Correção
  numero_cc_e: number;

  // XML
  xml_enviado?: string;
  xml_assinado?: string;
  xml_autorizado?: string;
  xml_cancelamento?: string;
  xml_cc_e?: string;

  // DANFE
  danfe_url?: string;
  danfe_base64?: string;

  // Venda/Pedido relacionado
  venda_id?: string;
  pedido_id?: string;

  // Contingência
  em_contingencia: boolean;
  tipo_contingencia?: string;

  criado_em: Date;
  atualizado_em: Date;
}

// =============================================
// Eventos NFe
// =============================================

export interface NFeEvento {
  id: string;
  nfe_id: string;
  empresa_id: string;
  tipo: 'cancelamento' | 'carta_correcao' | 'inutilizacao' | 'consultar' | 'outros';
  codigo_evento: string;
  descricao?: string;
  sequencial: number;
  data_evento: Date;
  justificativa?: string;
  condicoes_uso?: string;
  correcoes?: Array<{ campo_original: string; campo_corrigido: string; valor_original: string; valor_corrigido: string }>;
  protocolo?: string;
  data_registro?: Date;
  status: 'pendente' | 'autorizado' | 'rejeitado';
  codigo_rejeicao?: string;
  mensagem_rejeicao?: string;
  xml_envio?: string;
  xml_retorno?: string;
  criado_em: Date;
}

// =============================================
// Inutilização de Numeração
// =============================================

export interface NFeInutilizacao {
  id: string;
  empresa_id: string;
  ano: number;
  serie: string;
  numero_inicial: number;
  numero_final: number;
  ambiente: AmbienteNFe;
  uf: string;
  cnpj: string;
  justificativa: string;
  protocolo?: string;
  data_registro?: Date;
  status: 'pendente' | 'autorizado' | 'rejeitado';
  codigo_rejeicao?: string;
  mensagem_rejeicao?: string;
  xml_envio?: string;
  xml_retorno?: string;
  criado_em: Date;
}

// =============================================
// Logs
// =============================================

export interface NFeLog {
  id: string;
  empresa_id: string;
  nfe_id?: string;
  operacao: string;
  ambiente: AmbienteNFe;
  uf?: string;
  servico?: string;
  versao_servico?: string;
  requisicao?: string;
  resposta?: string;
  xml_enviado?: string;
  xml_recebido?: string;
  sucesso: boolean;
  codigo_status?: string;
  mensagem?: string;
  tempo_ms?: number;
  ip_servidor?: string;
  criado_em: Date;
}

// =============================================
// Request/Response das APIs
// =============================================

export interface EmissaoNFeRequest {
  venda_id?: string;
  pedido_id?: string;
  natureza_operacao?: string;
  tipo_operacao?: TipoOperacao;
  finalidade?: FinalidadeNFe;
  indicador_presenca?: IndicadorPresenca;
  indicador_destino?: IndicadorDestino;
  destinatario?: DestinatarioNFe;
  local_retirada?: EnderecoNFe;
  local_entrega?: EnderecoNFe;
  produtos: Array<{
    codigo: string;
    descricao: string;
    ncm?: string;
    cfop?: string;
    unidade_comercial?: string;
    quantidade_comercial: number;
    valor_unitario_comercial: number;
    valor_total: number;
    valor_desconto?: number;
    icms_origem?: string;
    icms_cst?: string;
    icms_csosn?: string;
    icms_aliquota?: number;
    icms_valor_base_calculo?: number;
    icms_valor?: number;
    pis_cst?: string;
    pis_aliquota?: number;
    pis_valor?: number;
    cofins_cst?: string;
    cofins_aliquota?: number;
    cofins_valor?: number;
    ipi_cst?: string;
    ipi_aliquota?: number;
    ipi_valor?: number;
    indica_total?: 0 | 1;
  }>;
  pagamentos?: Array<{
    forma_pagamento: FormaPagamento;
    valor: number;
    carteira?: string;
  }>;
  transporte?: Partial<TransporteNFe>;
  informacoes_adicionais?: string;
  informacoes_fisco?: string;
  informacoes_complementares?: string;
  ambiente?: AmbienteNFe;
}

export interface EmissaoNFeResponse {
  sucesso: boolean;
  nfe?: NFe;
  erro?: {
    codigo: string;
    mensagem: string;
  };
}

export interface CancelamentoNFeRequest {
  nfe_id: string;
  justificativa: string;
}

export interface CancelamentoNFeResponse {
  sucesso: boolean;
  nfe?: NFe;
  protocolo?: string;
  erro?: {
    codigo: string;
    mensagem: string;
  };
}

export interface ConsultaNFeRequest {
  nfe_id?: string;
  chave?: string;
}

export interface ConsultaNFeResponse {
  sucesso: boolean;
  nfe?: NFe;
  protocolo?: string;
  status_sefaz?: string;
  erro?: {
    codigo: string;
    mensagem: string;
  };
}

export interface InutilizacaoNFeRequest {
  serie: string;
  numero_inicial: number;
  numero_final: number;
  justificativa: string;
  ambiente?: AmbienteNFe;
}

export interface InutilizacaoNFeResponse {
  sucesso: boolean;
  inutilizacao?: NFeInutilizacao;
  erro?: {
    codigo: string;
    mensagem: string;
  };
}

export interface CartaCorrecaoNFeRequest {
  nfe_id: string;
  correcoes: Array<{
    campo_original: string;
    campo_corrigido: string;
    valor_original: string;
    valor_corrigido: string;
  }>;
  condicoes_uso?: string;
}

export interface CartaCorrecaoNFeResponse {
  sucesso: boolean;
  evento?: NFeEvento;
  erro?: {
    codigo: string;
    mensagem: string;
  };
}

export interface StatusServicoNFeResponse {
  sucesso: boolean;
  status: 'disponivel' | 'indisponivel' | 'parcial';
  ultima_verificacao?: Date;
  motivo?: string;
  uf?: string;
  erro?: {
    codigo: string;
    mensagem: string;
  };
}
