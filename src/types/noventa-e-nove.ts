export type NoventaENoveOrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'IN_PREPARATION'
  | 'READY_FOR_PICKUP'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export type NoventaENoveIntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface NoventaENoveConfig {
  id: string;
  empresaId: string;
  ativo: boolean;
  status: NoventaENoveIntegrationStatus;
  clientId: string;
  clientSecret: string;
  merchantId: string;
  apiBaseUrl: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  webhookSecret?: string;
  sincronizarProdutos: boolean;
  sincronizarEstoque: boolean;
  sincronizarPrecos: boolean;
  receberPedidosAutomatico: boolean;
  tempoPreparoPadrao: number;
  totalPedidosRecebidos: number;
  ultimoPedidoEm?: Date;
  ultimoErro?: string;
  ultimoErroEm?: Date;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface NoventaENoveOrder {
  orderId: string;
  displayId?: string;
  merchantId: string;
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
  items: NoventaENoveOrderItem[];
  total: NoventaENoveOrderTotal;
  status: NoventaENoveOrderStatus;
  orderType: 'DELIVERY' | 'TAKEOUT' | 'INDOOR';
  observations?: string;
  createdAt: Date;
  estimatedDeliveryTime?: number;
  deliveryFee?: number;
}

export interface NoventaENoveOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  observations?: string;
}

export interface NoventaENoveOrderTotal {
  subTotal: number;
  deliveryFee: number;
  discount: number;
  orderAmount: number;
}

export interface NoventaENoveProdutoSync {
  id: string;
  empresaId: string;
  produtoId: string;
  noventaENoveProductId?: string;
  ninetyNineExternalCode: string;
  status: 'synced' | 'pending' | 'error' | 'not_synced' | 'deleted';
  ninetyNineStatus?: 'AVAILABLE' | 'UNAVAILABLE' | 'HIDDEN';
  ultimoSyncEm?: Date;
  erroSync?: string;
  precoSincronizado?: number;
  estoqueSincronizado?: number;
}

export interface NoventaENoveLog {
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

export interface NoventaENoveProductPayload {
  externalCode: string;
  title: string;
  description?: string;
  price: number;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  imageUrl?: string;
  category?: string;
}

export interface NoventaENoveWebhookEvent {
  eventType: string;
  orderId?: string;
  merchantId: string;
  timestamp: string;
  payload?: any;
}

export interface NoventaENoveStats {
  totalPedidosHoje: number;
  totalVendasHoje: number;
  totalPedidosMes: number;
  totalVendasMes: number;
  totalRecebido: number;
  ultimoPedido?: Date;
}

export const NOVENTA_E_NOVE_STATUS_MAP: Record<string, string> = {
  PLACED: 'aberta',
  CONFIRMED: 'em_preparo',
  IN_PREPARATION: 'em_preparo',
  READY_FOR_PICKUP: 'pronta',
  DISPATCHED: 'saiu_para_entrega',
  DELIVERED: 'entregue',
  CANCELLED: 'cancelada',
  REJECTED: 'cancelada',
};

export const NOVENTA_E_NOVE_EVENT_MAP: Record<string, NoventaENoveOrderStatus> = {
  'order.placed': 'PLACED',
  'order.confirmed': 'CONFIRMED',
  'order.preparation_started': 'IN_PREPARATION',
  'order.ready_for_pickup': 'READY_FOR_PICKUP',
  'order.dispatched': 'DISPATCHED',
  'order.delivered': 'DELIVERED',
  'order.cancelled': 'CANCELLED',
};
