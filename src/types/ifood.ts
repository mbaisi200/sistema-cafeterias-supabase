// ============================================
// iFood Integration Types
// ============================================

// Status do pedido iFood
export type IFoodOrderStatus =
  | 'PLACED'           // Pedido recebido
  | 'CONFIRMED'        // Confirmado pelo restaurante
  | 'IN_PREPARATION'   // Em preparação
  | 'READY_FOR_PICKUP' // Pronto para retirada
  | 'DISPATCHED'       // Enviado para entrega
  | 'DELIVERED'        // Entregue
  | 'CANCELLED'        // Cancelado
  | 'REJECTED';        // Rejeitado

// Status de integração
export type IFoodIntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

// Configuração da integração iFood por empresa
export interface IFoodConfig {
  id: string;
  empresaId: string;
  ativo: boolean;
  status: IFoodIntegrationStatus;

  // Credenciais iFood
  clientId: string;
  clientSecret: string;
  merchantId: string;          // ID do estabelecimento no iFood

  // Tokens (armazenados de forma segura)
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;

  // Configurações de sincronização
  sincronizarProdutos: boolean;
  sincronizarEstoque: boolean;
  sincronizarPrecos: boolean;
  receberPedidosAutomatico: boolean;
  tempoPreparoPadrao: number;  // em minutos

  // Mapeamento de formas de pagamento
  mapeamentoPagamento: {
    [key: string]: FormaPagamentoLocal;
  };

  // Logs e estatísticas
  ultimoPedidoEm?: Date;
  totalPedidosRecebidos: number;
  ultimoErro?: string;
  ultimoErroEm?: Date;

  criadoEm: Date;
  atualizadoEm: Date;
}

// Forma de pagamento local
export type FormaPagamentoLocal = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'voucher' | 'ifood_online';

// Pedido recebido do iFood (Webhook)
export interface IFoodOrder {
  // Identificação
  orderId: string;              // ID único do pedido no iFood
  shortOrderNumber?: string;    // Número curto do pedido
  displayId?: string;           // ID para exibição
  merchantId: string;           // ID do estabelecimento

  // Cliente
  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    document?: string;          // CPF
    ordersCountOnMerchant?: number;
  };

  // Endereço de entrega
  deliveryAddress?: {
    streetName: string;
    streetNumber: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    reference?: string;
  };

  // Itens do pedido
  items: IFoodOrderItem[];

  // Valores
  total: IFoodOrderTotal;

  // Pagamento
  payments: IFoodPayment[];

  // Status e timestamps
  status: IFoodOrderStatus;
  orderTiming: string;
  createdAt: string;            // ISO 8601
  modifiedAt?: string;

  // Entrega
  delivery?: {
    deliveredBy?: string;       // "IFOOD" ou nome do restaurante
    deliveryFee?: number;
    estimatedDeliveryTime?: number;
  };

  // Observações
  observations?: string;

  // Tipo de pedido
  orderType: 'DELIVERY' | 'TAKEOUT' | 'INDOOR';
}

// Item do pedido iFood
export interface IFoodOrderItem {
  id: string;
  name: string;
  externalCode?: string;        // Código do produto no seu sistema
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  observations?: string;

  // Opções/adicionais
  options?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    externalCode?: string;
  }[];

  // Garnitures (acompanhamentos)
  garnishItems?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    externalCode?: string;
  }[];
}

// Totais do pedido
export interface IFoodOrderTotal {
  subTotal: number;
  deliveryFee: number;
  discount: number;
  addition: number;
  orderAmount: number;          // Valor total
}

// Pagamento iFood
export interface IFoodPayment {
  id: string;
  code?: string;
  method: string;
  type: string;
  value: number;
  prepaid: boolean;
  changeFor?: number;           // Troco para pagamentos em dinheiro
  card?: {
    brand?: string;
    lastFourDigits?: string;
  };
}

// Produto sincronizado com iFood
export interface IFoodProdutoSync {
  id: string;
  empresaId: string;
  produtoId: string;            // ID do produto no sistema local
  ifoodProductId?: string;      // ID do produto no iFood
  ifoodExternalCode: string;    // Código externo usado no iFood

  // Status de sincronização
  status: 'synced' | 'pending' | 'error' | 'not_synced';
  ultimoSyncEm?: Date;
  erroSync?: string;

  // Dados do iFood
  ifoodStatus?: 'AVAILABLE' | 'UNAVAILABLE' | 'HIDDEN';

  criadoEm: Date;
  atualizadoEm: Date;
}

// Log de eventos iFood
export interface IFoodLog {
  id: string;
  empresaId: string;
  tipo: 'order_received' | 'order_confirmed' | 'order_cancelled' | 'sync_product' | 'sync_stock' | 'error' | 'token_refresh';
  orderId?: string;
  produtoId?: string;

  detalhes: string;
  dados?: Record<string, unknown>;

  sucesso: boolean;
  erro?: string;

  criadoEm: Date;
}

// ============================================
// API Request/Response Types
// ============================================

// Request para confirmar pedido
export interface IFoodConfirmOrderRequest {
  orderId: string;
}

// Request para atualizar status de preparação
export interface IFoodUpdatePreparationStatusRequest {
  orderId: string;
  status: 'STARTED' | 'FINISHED';
}

// Request para solicitar entregador
export interface IFoodRequestDriverRequest {
  orderId: string;
}

// Produto para sincronização com iFood
export interface IFoodProductPayload {
  externalCode: string;
  name: string;
  description?: string;
  price: number;
  category: {
    id: string;
    name: string;
  };
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'HIDDEN';
  shipping?: {
    deliveryTime: number;
    unit: 'MINUTES' | 'HOURS' | 'DAYS';
  };
  image?: string;
}

// ============================================
// Webhook Events
// ============================================

export interface IFoodWebhookEvent {
  event: string;
  data: IFoodOrder | IFoodOrderStatusUpdate | IFoodTestEvent;
  createdAt: string;
}

export interface IFoodOrderStatusUpdate {
  orderId: string;
  status: IFoodOrderStatus;
  reason?: string;
}

export interface IFoodTestEvent {
  test: boolean;
  message?: string;
}

// ============================================
// Estatísticas iFood
// ============================================

export interface IFoodStats {
  pedidosHoje: number;
  vendasHoje: number;
  pedidosMes: number;
  vendasMes: number;
  ticketMedio: number;
  tempoMedioPreparo: number;
  taxaCancelamento: number;
  produtosMaisVendidos: {
    produtoId: string;
    nome: string;
    quantidade: number;
    valor: number;
  }[];
}

// ============================================
// Helper Types
// ============================================

// Mapeamento de status iFood para status local
export const IFOOD_STATUS_MAP: Record<IFoodOrderStatus, string> = {
  'PLACED': 'pendente',
  'CONFIRMED': 'confirmado',
  'IN_PREPARATION': 'preparando',
  'READY_FOR_PICKUP': 'pronto',
  'DISPATCHED': 'enviado',
  'DELIVERED': 'entregue',
  'CANCELLED': 'cancelado',
  'REJECTED': 'rejeitado'
};

// Mapeamento de formas de pagamento iFood
export const IFOOD_PAYMENT_MAP: Record<string, FormaPagamentoLocal> = {
  'CASH': 'dinheiro',
  'CREDIT_CARD': 'cartao_credito',
  'DEBIT_CARD': 'cartao_debito',
  'PIX': 'pix',
  'VOUCHER': 'voucher',
  'ONLINE': 'ifood_online',
  'MEAL_VOUCHER': 'voucher',
  'FOOD_VOUCHER': 'voucher'
};
