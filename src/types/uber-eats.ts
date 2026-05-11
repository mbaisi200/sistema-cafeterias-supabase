// ============================================
// Uber Eats Integration Types
// ============================================

export type UberEatsOrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'IN_PREPARATION'
  | 'READY_FOR_PICKUP'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export type UberEatsIntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface UberEatsConfig {
  id: string;
  empresaId: string;
  ativo: boolean;
  status: UberEatsIntegrationStatus;

  clientId: string;
  clientSecret: string;
  merchantUuid: string;

  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;

  sincronizarProdutos: boolean;
  sincronizarEstoque: boolean;
  sincronizarPrecos: boolean;
  receberPedidosAutomatico: boolean;
  tempoPreparoPadrao: number;

  webhookSecret?: string;

  ultimoPedidoEm?: Date;
  totalPedidosRecebidos: number;
  ultimoErro?: string;
  ultimoErroEm?: Date;

  criadoEm: Date;
  atualizadoEm: Date;
}

export type FormaPagamentoLocal = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'voucher' | 'uber_eats_online';

export interface UberEatsOrder {
  orderId: string;
  displayId?: string;
  merchantUuid: string;

  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };

  deliveryAddress?: {
    street: string;
    streetNumber: string;
    city: string;
    state: string;
    zipcode: string;
    neighborhood?: string;
    complement?: string;
    latitude?: number;
    longitude?: number;
  };

  items: UberEatsOrderItem[];
  total: UberEatsOrderTotal;

  status: UberEatsOrderStatus;
  orderType: 'DELIVERY' | 'TAKEOUT';
  observations?: string;
  createdAt: Date;
  estimatedDeliveryTime?: number;
  deliveryFee?: number;
}

export interface UberEatsOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  observations?: string;
}

export interface UberEatsOrderTotal {
  subTotal: number;
  deliveryFee: number;
  discount: number;
  orderAmount: number;
}

export interface UberEatsProdutoSync {
  id: string;
  empresaId: string;
  produtoId: string;
  uberEatsProductId?: string;
  uberEatsExternalCode: string;
  status: 'synced' | 'pending' | 'error' | 'not_synced' | 'deleted';
  uberEatsStatus?: 'AVAILABLE' | 'UNAVAILABLE' | 'HIDDEN';
  ultimoSyncEm?: Date;
  erroSync?: string;
  precoSincronizado?: number;
  estoqueSincronizado?: number;
}

export interface UberEatsLog {
  id: string;
  empresaId: string;
  tipo: string;
  orderId?: string;
  pedidoExternoId?: string;
  produtoId?: string;
  detalhes?: string;
  dados?: any;
  sucesso: boolean;
  erro?: string;
  criadoEm: Date;
}

export interface UberEatsProductPayload {
  externalCode: string;
  title: string;
  description?: string;
  price: number;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  imageUrl?: string;
  category?: string;
}

export interface UberEatsWebhookEvent {
  eventType: string;
  orderId?: string;
  merchantUuid: string;
  timestamp: string;
  payload?: any;
}

export interface UberEatsStats {
  totalPedidosHoje: number;
  totalVendasHoje: number;
  totalPedidosMes: number;
  totalVendasMes: number;
  totalRecebido: number;
  ultimoPedido?: Date;
}

export const UBER_EATS_STATUS_MAP: Record<string, string> = {
  PLACED: 'aberta',
  CONFIRMED: 'em_preparo',
  IN_PREPARATION: 'em_preparo',
  READY_FOR_PICKUP: 'pronta',
  DISPATCHED: 'saiu_para_entrega',
  DELIVERED: 'entregue',
  CANCELLED: 'cancelada',
  REJECTED: 'cancelada',
};

export const UBER_EATS_EVENT_MAP: Record<string, UberEatsOrderStatus> = {
  'order.placed': 'PLACED',
  'order.confirmed': 'CONFIRMED',
  'order.preparation_started': 'IN_PREPARATION',
  'order.ready_for_pickup': 'READY_FOR_PICKUP',
  'order.dispatched': 'DISPATCHED',
  'order.delivered': 'DELIVERED',
  'order.cancelled': 'CANCELLED',
};
