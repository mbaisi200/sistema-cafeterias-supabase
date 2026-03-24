// Tipos para NFC-e (Nota Fiscal de Consumidor Eletrônica) - Modelo 65

export type AmbienteNFCe = 'homologacao' | 'producao';
export type StatusNFCe = 'pendente' | 'autorizada' | 'rejeitada' | 'cancelada' | 'inutilizada';
export type RegimeTributario = '1' | '2' | '3'; // 1=Simples Nacional, 2=Simples Nacional - excesso, 3=Regime Normal

export interface CertificadoDigital {
  id: string;
  empresa_id: string;
  nome_arquivo: string;
  arquivo_base64: string;
  senha: string;
  cnpj?: string;
  razao_social?: string;
  validade_inicio?: Date;
  validade_fim?: Date;
  emissor?: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface CertificadoDigitalInfo {
  razaoSocial: string;
  cnpj: string;
  validadeInicio: Date;
  validadeFim: Date;
  emissor: string;
  diasRestantes: number;
}

export interface NFCeConfig {
  id?: string;
  empresa_id: string;
  ambiente: AmbienteNFCe;
  
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
  
  // Configurações de Emissão
  serie: string;
  numero_inicial: number;
  numero_atual: number;
  
  // Certificado Digital
  certificado_id?: string;
  
  // CST/CSOSN padrão
  csosn_padrao: string;
  cfop_padrao: string;
  ncm_padrao?: string;
  unidade_padrao: string;
  
  // Informações Adicionais
  informacoes_adicionais?: string;
  informacoes_fisco?: string;
  
  // ICMS
  icms_situacao_tributaria?: string;
  icms_aliquota?: number;
  
  // PIS/COFINS
  pis_aliquota?: number;
  cofins_aliquota?: number;
  
  // Impressão
  imprimir_danfe_automatico: boolean;
  mensagem_consumidor?: string;
  
  // Contingência
  em_contingencia: boolean;
  motivo_contingencia?: string;
  data_hora_contingencia?: Date;
  
  ativo: boolean;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface DestinatarioNFCe {
  cpf_cnpj: string;
  nome?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    codigo_municipio?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
  };
}

export interface ProdutoNFCe {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_desconto?: number;
  valor_liquido: number;
  csosn: string;
  icms_origem: string;
  icms_aliquota?: number;
  ind_tot: string;
}

export interface PagamentoNFCe {
  forma: '01' | '02' | '03' | '04' | '05' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '90' | '99';
  valor: number;
  troco?: number;
  cnpj_credenciadora?: string;
  bandeira?: string;
  autorizacao?: string;
}

export interface NFCe {
  id: string;
  empresa_id: string;
  
  // Identificação
  numero: number;
  serie: string;
  modelo: string;
  ambiente: AmbienteNFCe;
  
  // Chaves
  chave: string;
  chave_recibo?: string;
  
  // Status
  status: StatusNFCe;
  
  // Emitente
  emitente: {
    cnpj: string;
    inscricao_estadual: string;
    inscricao_municipal?: string;
    razao_social: string;
    nome_fantasia?: string;
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
    regime_tributario: RegimeTributario;
    mensagem_consumidor?: string;
  };
  
  // Destinatário
  destinatario?: DestinatarioNFCe;
  
  // Produtos
  produtos: ProdutoNFCe[];
  
  // Totais
  total_produtos: number;
  total_desconto: number;
  total_liquido: number;
  
  // Pagamentos
  pagamentos: PagamentoNFCe[];
  troco: number;
  
  // Informações de frete
  modalidade_frete: string;
  
  // Informações adicionais
  informacoes_adicionais?: string;
  
  // Datas
  data_emissao: Date;
  data_saida: Date;
  
  // Autorização
  protocolo_autorizacao?: string;
  data_autorizacao?: Date;
  
  // Rejeição
  codigo_rejeicao?: string;
  mensagem_rejeicao?: string;
  
  // Cancelamento
  protocolo_cancelamento?: string;
  data_cancelamento?: Date;
  motivo_cancelamento?: string;
  
  // DANFE
  danfe_base64?: string;
  danfe_html?: string;
  
  // QR Code
  qr_code?: string;
  qr_code_base64?: string;
  
  // XML
  xml_assinado?: string;
  xml_autorizado?: string;
  
  // Venda relacionada
  venda_id?: string;
  
  // Contingência
  em_contingencia: boolean;
  
  criado_em: Date;
  atualizado_em: Date;
}

export interface NFCeEvento {
  id: string;
  nfce_id: string;
  empresa_id: string;
  tipo: 'cancelamento' | 'carta_correcao' | 'inutilizacao';
  codigo_tipo: string;
  descricao_tipo: string;
  sequencial: number;
  data_evento: Date;
  protocolo?: string;
  data_registro?: Date;
  status: 'pendente' | 'autorizado' | 'rejeitado';
  codigo_rejeicao?: string;
  mensagem_rejeicao?: string;
  xml_envio?: string;
  xml_retorno?: string;
  dados_adicionais?: Record<string, unknown>;
  criado_em: Date;
}

export interface NFCeInutilizacao {
  id: string;
  empresa_id: string;
  serie: string;
  numero_inicial: number;
  numero_final: number;
  ambiente: AmbienteNFCe;
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

export interface NFCeLog {
  id: string;
  empresa_id: string;
  nfce_id?: string;
  operacao: string;
  ambiente: AmbienteNFCe;
  requisicao?: string;
  resposta?: string;
  sucesso: boolean;
  codigo_status?: string;
  mensagem?: string;
  tempo_ms?: number;
  criado_em: Date;
}

// Tipos para API
export interface EmissaoNFCeRequest {
  venda_id?: string;
  destinatario?: DestinatarioNFCe;
  produtos: Array<{
    codigo: string;
    descricao: string;
    ncm?: string;
    cfop?: string;
    unidade?: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    valor_desconto?: number;
    valor_liquido: number;
    csosn?: string;
    icms_origem?: string;
  }>;
  pagamentos: Array<{
    forma: string;
    valor: number;
  }>;
  informacoes_adicionais?: string;
  ambiente?: AmbienteNFCe;
}

export interface EmissaoNFCeResponse {
  sucesso: boolean;
  nfce?: NFCe;
  erro?: {
    codigo: string;
    mensagem: string;
  };
}

export interface CancelamentoNFCeRequest {
  nfce_id: string;
  justificativa: string;
}

export interface CancelamentoNFCeResponse {
  sucesso: boolean;
  nfce?: NFCe;
  erro?: {
    codigo: string;
    mensagem: string;
  };
}

export interface ConsultaNFCeRequest {
  nfce_id?: string;
  chave?: string;
}

export interface ConsultaNFCeResponse {
  sucesso: boolean;
  nfce?: NFCe;
  erro?: {
    codigo: string;
    mensagem: string;
  };
}
