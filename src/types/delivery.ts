// ============================================
// Delivery System Types
// ============================================

// Status do pedido de delivery
export type PedidoDeliveryStatus =
  | 'pendente'
  | 'confirmado'
  | 'em_preparacao'
  | 'pronto'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado'
  | 'rejeitado';

// Tipo de pedido
export type TipoPedido = 'delivery' | 'retirada' | 'consumo_local';

// Status do pagamento
export type StatusPagamento = 'pendente' | 'pago' | 'falhou' | 'estornado';

// Tipo de cupom
export type TipoCupom = 'percentual' | 'valor_fixo' | 'frete_gratis';

// Tipo de opção de produto
export type TipoOpcao = 'variacao' | 'adicional' | 'obrigatorio';

// ============================================
// Cliente
// ============================================

export interface Cliente {
  id: string;
  empresaId: string;
  nome: string;
  email?: string;
  telefone: string;
  cpf?: string;
  dataNascimento?: Date;
  fotoUrl?: string;
  receberPromocoes: boolean;
  receberNotificacoes: boolean;
  totalPedidos: number;
  totalGasto: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

// ============================================
// Endereço do Cliente
// ============================================

export interface ClienteEndereco {
  id: string;
  clienteId: string;
  apelido: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  latitude?: number;
  longitude?: number;
  pontoReferencia?: string;
  instrucoesEntrega?: string;
  enderecoPadrao: boolean;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

// ============================================
// Item do Pedido
// ============================================

export interface ItemVariacao {
  nome: string;
  valor: string;
  preco: number;
}

export interface ItemAdicional {
  id?: string;
  nome: string;
  quantidade: number;
  preco: number;
}

export interface PedidoDeliveryItem {
  id: string;
  pedidoId: string;
  produtoId?: string;
  produtoNome: string;
  produtoDescricao?: string;
  produtoImagem?: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  total: number;
  variacoes?: ItemVariacao[];
  adicionais?: ItemAdicional[];
  observacoes?: string;
  criadoEm: Date;
}

// ============================================
// Pedido de Delivery
// ============================================

export interface PedidoDelivery {
  id: string;
  empresaId: string;
  clienteId: string;
  codigo: string;
  tipo: TipoPedido;
  enderecoEntregaId?: string;
  enderecoEntrega?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    pontoReferencia?: string;
  };
  status: PedidoDeliveryStatus;
  dataConfirmacao?: Date;
  dataPreparacaoInicio?: Date;
  dataPreparacaoFim?: Date;
  dataSaidaEntrega?: Date;
  dataEntrega?: Date;
  dataCancelamento?: Date;
  subtotal: number;
  taxaEntrega: number;
  desconto: number;
  total: number;
  cupomId?: string;
  cupomCodigo?: string;
  cupomDesconto?: number;
  formaPagamento: string;
  statusPagamento: StatusPagamento;
  pagamentoId?: string;
  trocoPara?: number;
  troco?: number;
  tempoEstimadoPreparo?: number;
  tempoEstimadoEntrega?: number;
  previsaoEntrega?: Date;
  observacoes?: string;
  motivoCancelamento?: string;
  entregadorId?: string;
  entregadorNome?: string;
  vendaId?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  
  // Relacionamentos
  cliente?: Cliente;
  itens?: PedidoDeliveryItem[];
}

// ============================================
// Histórico do Pedido
// ============================================

export interface PedidoDeliveryHistorico {
  id: string;
  pedidoId: string;
  statusAnterior?: PedidoDeliveryStatus;
  statusNovo: PedidoDeliveryStatus;
  observacao?: string;
  usuarioId?: string;
  usuarioTipo?: 'cliente' | 'admin' | 'sistema';
  criadoEm: Date;
}

// ============================================
// Avaliação do Pedido
// ============================================

export interface PedidoDeliveryAvaliacao {
  id: string;
  pedidoId: string;
  clienteId: string;
  empresaId: string;
  notaGeral: number;
  notaComida?: number;
  notaEntrega?: number;
  notaAtendimento?: number;
  comentario?: string;
  resposta?: string;
  respondidoEm?: Date;
  visivel: boolean;
  criadoEm: Date;
}

// ============================================
// Cupom de Desconto
// ============================================

export interface CupomDesconto {
  id: string;
  empresaId: string;
  codigo: string;
  descricao?: string;
  tipo: TipoCupom;
  valor: number;
  valorMaximo?: number;
  valorMinimoPedido?: number;
  usoMaximo?: number;
  usoPorCliente: number;
  validoDe: Date;
  validoAte: Date;
  produtosAplicaveis?: string[];
  categoriasAplicaveis?: string[];
  apenasPrimeiraCompra: boolean;
  ativo: boolean;
  totalUsos: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

// ============================================
// Categoria do Cardápio
// ============================================

export interface CategoriaCardapio {
  id: string;
  empresaId: string;
  nome: string;
  descricao?: string;
  icone?: string;
  cor?: string;
  ordem: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

// ============================================
// Opções do Produto
// ============================================

export interface ProdutoOpcaoItem {
  id: string;
  opcaoId: string;
  nome: string;
  precoAdicional: number;
  ordem: number;
  ativo: boolean;
  criadoEm: Date;
}

export interface ProdutoOpcao {
  id: string;
  empresaId: string;
  nome: string;
  descricao?: string;
  tipo: TipoOpcao;
  minimoSelecao: number;
  maximoSelecao: number;
  ordem: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  itens?: ProdutoOpcaoItem[];
}

// ============================================
// Configuração de Delivery da Empresa
// ============================================

export interface EmpresaDeliveryConfig {
  id: string;
  empresaId: string;
  deliveryAtivo: boolean;
  retiradaAtivo: boolean;
  consumoLocalAtivo: boolean;
  horarioAbertura: string;
  horarioFechamento: string;
  diasFuncionamento: number[];
  taxaEntregaPadrao: number;
  taxaEntregaGratisAcima?: number;
  raioEntregaKm: number;
  tempoPreparoMin: number;
  tempoPreparoMax: number;
  tempoEntregaMin: number;
  tempoEntregaMax: number;
  pedidoMinimo: number;
  aceitaAgendamento: boolean;
  aceitaDinheiro: boolean;
  aceitaCartao: boolean;
  aceitaPix: boolean;
  aceitaCartaoOnline: boolean;
  mensagemPedidoRecebido: string;
  mensagemPedidoPronto: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

// ============================================
// Carrinho (Frontend)
// ============================================

export interface CarrinhoItem {
  produtoId: string;
  produtoNome: string;
  produtoDescricao?: string;
  produtoImagem?: string;
  precoBase: number;
  quantidade: number;
  variacoes?: ItemVariacao[];
  adicionais?: ItemAdicional[];
  observacoes?: string;
  total: number;
}

export interface Carrinho {
  empresaId: string;
  clienteId?: string;
  itens: CarrinhoItem[];
  tipo: TipoPedido;
  enderecoEntregaId?: string;
  cupomCodigo?: string;
  cupomDesconto?: number;
  subtotal: number;
  taxaEntrega: number;
  desconto: number;
  total: number;
}

// ============================================
// Helpers
// ============================================

export const STATUS_PEDIDO_LABELS: Record<PedidoDeliveryStatus, string> = {
  'pendente': 'Pendente',
  'confirmado': 'Confirmado',
  'em_preparacao': 'Em Preparação',
  'pronto': 'Pronto',
  'saiu_para_entrega': 'Saiu para Entrega',
  'entregue': 'Entregue',
  'cancelado': 'Cancelado',
  'rejeitado': 'Rejeitado',
};

export const STATUS_PEDIDO_COLORS: Record<PedidoDeliveryStatus, string> = {
  'pendente': 'bg-yellow-500',
  'confirmado': 'bg-blue-500',
  'em_preparacao': 'bg-orange-500',
  'pronto': 'bg-green-500',
  'saiu_para_entrega': 'bg-purple-500',
  'entregue': 'bg-green-600',
  'cancelado': 'bg-red-500',
  'rejeitado': 'bg-red-600',
};

export const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  'dinheiro': 'Dinheiro',
  'cartao_credito': 'Cartão de Crédito',
  'cartao_debito': 'Cartão de Débito',
  'pix': 'PIX',
  'cartao_online': 'Cartão Online',
  'voucher': 'Voucher',
};

export const TIPO_PEDIDO_LABELS: Record<TipoPedido, string> = {
  'delivery': 'Entrega',
  'retirada': 'Retirada',
  'consumo_local': 'Consumo Local',
};
