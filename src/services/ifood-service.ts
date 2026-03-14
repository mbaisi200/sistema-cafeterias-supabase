/**
 * iFood Integration Service
 * 
 * Este serviço gerencia toda a integração com a API do iFood.
 * Inclui autenticação, recebimento de pedidos, sincronização de produtos e atualização de status.
 */

import { getSupabaseClient } from '@/lib/supabase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  getDocs,
  Timestamp,
  serverTimestamp
} from '@supabase/supabase-js';
import {
  IFoodConfig,
  IFoodOrder,
  IFoodProdutoSync,
  IFoodLog,
  IFoodProductPayload
} from '@/types/ifood';
import { FormaPagamentoLocal, IFOOD_PAYMENT_MAP } from '@/types/ifood';

// ============================================
// Constants
// ============================================

const IFOOD_API_BASE_URL = 'https://merchant-api.ifood.com.br';
const IFOOD_AUTH_URL = 'https://merchant-api.ifood.com.br/authentication';

// ============================================
// Authentication
// ============================================

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Obter token de acesso usando client credentials
 */
export async function getAccessToken(config: IFoodConfig): Promise<TokenResponse> {
  const response = await fetch(IFOOD_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao obter token iFood: ${error}`);
  }

  return response.json();
}

/**
 * Renovar token usando refresh token
 */
export async function refreshAccessToken(config: IFoodConfig): Promise<TokenResponse> {
  const response = await fetch(IFOOD_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken || '',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao renovar token iFood: ${error}`);
  }

  return response.json();
}

// ============================================
// Config Management
// ============================================

/**
 * Salvar configuração iFood no Firestore
 */
export async function saveIFoodConfig(empresaId: string, config: Partial<IFoodConfig>): Promise<string> {
  const dbInstance = db();
  if (!dbInstance) throw new Error('Firebase não inicializado');

  const configRef = doc(collection(dbInstance, 'ifood_config'));
  const configData = {
    ...config,
    empresaId,
    atualizadoEm: serverTimestamp(),
  };

  if (config.id) {
    await updateDoc(doc(dbInstance, 'ifood_config', config.id), configData);
    return config.id;
  } else {
    configData.criadoEm = serverTimestamp();
    const docRef = await addDoc(collection(dbInstance, 'ifood_config'), configData);
    return docRef.id;
  }
}

/**
 * Obter configuração iFood de uma empresa
 */
export async function getIFoodConfig(empresaId: string): Promise<IFoodConfig | null> {
  const dbInstance = db();
  if (!dbInstance) return null;

  const q = query(
    collection(dbInstance, 'ifood_config'),
    where('empresaId', '==', empresaId)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  const docData = snapshot.docs[0];
  return {
    id: docData.id,
    ...docData.data(),
  } as IFoodConfig;
}

/**
 * Atualizar tokens no Firestore
 */
export async function updateTokens(
  configId: string, 
  accessToken: string, 
  refreshToken: string, 
  expiresIn: number
): Promise<void> {
  const dbInstance = db();
  if (!dbInstance) return;

  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await updateDoc(doc(dbInstance, 'ifood_config', configId), {
    accessToken,
    refreshToken,
    tokenExpiresAt: Timestamp.fromDate(expiresAt),
    status: 'connected',
    atualizadoEm: serverTimestamp(),
  });
}

// ============================================
// Order Management
// ============================================

/**
 * Confirmar pedido no iFood
 */
export async function confirmOrder(config: IFoodConfig, orderId: string): Promise<void> {
  const response = await fetch(`${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao confirmar pedido: ${error}`);
  }
}

/**
 * Atualizar status de preparação
 */
export async function updatePreparationStatus(
  config: IFoodConfig, 
  orderId: string, 
  status: 'STARTED' | 'FINISHED'
): Promise<void> {
  const response = await fetch(`${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/preparation/${status}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao atualizar status de preparação: ${error}`);
  }
}

/**
 * Solicitar entregador do iFood
 */
export async function requestDriver(config: IFoodConfig, orderId: string): Promise<void> {
  const response = await fetch(`${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/requestDriver`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao solicitar entregador: ${error}`);
  }
}

/**
 * Marcar pedido como despachado
 */
export async function dispatchOrder(config: IFoodConfig, orderId: string): Promise<void> {
  const response = await fetch(`${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/dispatch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao despachar pedido: ${error}`);
  }
}

/**
 * Cancelar pedido
 */
export async function cancelOrder(
  config: IFoodConfig, 
  orderId: string, 
  reason: string
): Promise<void> {
  const response = await fetch(`${IFOOD_API_BASE_URL}/order/v1.0/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao cancelar pedido: ${error}`);
  }
}

// ============================================
// Product Sync
// ============================================

/**
 * Sincronizar produto com iFood
 */
export async function syncProduct(
  config: IFoodConfig, 
  product: IFoodProductPayload
): Promise<{ id: string; externalCode: string }> {
  const response = await fetch(`${IFOOD_API_BASE_URL}/catalog/v1.0/merchant/${config.merchantId}/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao sincronizar produto: ${error}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    externalCode: product.externalCode,
  };
}

/**
 * Atualizar disponibilidade do produto
 */
export async function updateProductAvailability(
  config: IFoodConfig,
  ifoodProductId: string,
  available: boolean
): Promise<void> {
  const status = available ? 'AVAILABLE' : 'UNAVAILABLE';
  
  const response = await fetch(
    `${IFOOD_API_BASE_URL}/catalog/v1.0/merchant/${config.merchantId}/products/${ifoodProductId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao atualizar disponibilidade: ${error}`);
  }
}

/**
 * Atualizar preço do produto
 */
export async function updateProductPrice(
  config: IFoodConfig,
  ifoodProductId: string,
  price: number
): Promise<void> {
  const response = await fetch(
    `${IFOOD_API_BASE_URL}/catalog/v1.0/merchant/${config.merchantId}/products/${ifoodProductId}/price`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ price }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao atualizar preço: ${error}`);
  }
}

// ============================================
// Logging
// ============================================

/**
 * Registrar log de evento iFood
 */
export async function logIFoodEvent(
  empresaId: string,
  tipo: IFoodLog['tipo'],
  detalhes: string,
  dados?: Record<string, unknown>,
  orderId?: string,
  produtoId?: string,
  sucesso: boolean = true,
  erro?: string
): Promise<void> {
  const dbInstance = db();
  if (!dbInstance) return;

  await addDoc(collection(dbInstance, 'ifood_logs'), {
    empresaId,
    tipo,
    detalhes,
    dados,
    orderId,
    produtoId,
    sucesso,
    erro,
    criadoEm: serverTimestamp(),
  });
}

// ============================================
// Order Processing
// ============================================

/**
 * Processar pedido recebido do iFood e criar venda no sistema
 */
export async function processIFoodOrder(
  empresaId: string,
  order: IFoodOrder
): Promise<string> {
  const dbInstance = db();
  if (!dbInstance) throw new Error('Firebase não inicializado');

  // Verificar se o pedido já existe
  const existingQuery = query(
    collection(dbInstance, 'vendas'),
    where('empresaId', '==', empresaId),
    where('pedidoExternoId', '==', order.orderId)
  );
  const existingSnapshot = await getDocs(existingQuery);
  
  if (!existingSnapshot.empty) {
    // Pedido já processado, retornar ID existente
    return existingSnapshot.docs[0].id;
  }

  // Calcular valores
  const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxaEntrega = order.delivery?.deliveryFee || 0;
  const desconto = order.total.discount || 0;
  const total = order.total.orderAmount;

  // Mapear forma de pagamento
  const payment = order.payments[0];
  const formaPagamento: string = payment ? (IFOOD_PAYMENT_MAP[payment.method] || 'ifood_online') : 'ifood_online';

  // Criar venda
  const vendaRef = await addDoc(collection(dbInstance, 'vendas'), {
    empresaId,
    tipo: 'delivery',
    canal: 'ifood',
    status: 'aberta',
    subtotal,
    desconto,
    taxaServico: 0,
    taxaEntrega,
    total,
    
    // Dados do iFood
    pedidoExternoId: order.orderId,
    nomeCliente: order.customer.name,
    telefoneCliente: order.customer.phone,
    
    // Endereço de entrega
    enderecoEntrega: order.deliveryAddress ? {
      logradouro: order.deliveryAddress.streetName,
      numero: order.deliveryAddress.streetNumber,
      complemento: order.deliveryAddress.complement,
      bairro: order.deliveryAddress.neighborhood,
      cidade: order.deliveryAddress.city,
      estado: order.deliveryAddress.state,
      cep: order.deliveryAddress.postalCode,
      referencia: order.deliveryAddress.reference,
    } : undefined,
    
    observacao: order.observations,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  // Criar itens da venda
  for (const item of order.items) {
    await addDoc(collection(dbInstance, 'itens_venda'), {
      vendaId: vendaRef.id,
      produtoId: item.externalCode || '',
      produtoNome: item.name,
      quantidade: item.quantity,
      precoUnitario: item.unitPrice,
      desconto: 0,
      observacao: item.observations,
      criadoEm: serverTimestamp(),
    });
  }

  // Criar pagamento
  await addDoc(collection(dbInstance, 'pagamentos'), {
    empresaId,
    vendaId: vendaRef.id,
    formaPagamento,
    valor: total,
    troco: payment?.changeFor ? payment.changeFor - total : 0,
    criadoEm: serverTimestamp(),
  });

  // Registrar log
  await logIFoodEvent(
    empresaId,
    'order_received',
    `Pedido ${order.orderId} recebido do iFood`,
    { order },
    order.orderId,
    undefined,
    true
  );

  // Atualizar estatísticas do config
  const config = await getIFoodConfig(empresaId);
  if (config && config.id) {
    await updateDoc(doc(dbInstance, 'ifood_config', config.id), {
      ultimoPedidoEm: serverTimestamp(),
      totalPedidosRecebidos: (config.totalPedidosRecebidos || 0) + 1,
    });
  }

  return vendaRef.id;
}

/**
 * Converter pedido iFood para formato de exibição
 */
export function formatIFoodOrder(order: IFoodOrder) {
  return {
    orderId: order.orderId,
    shortNumber: order.shortOrderNumber,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    items: order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.unitPrice,
      total: item.totalPrice,
      notes: item.observations,
      extras: item.options?.map(opt => ({
        name: opt.name,
        quantity: opt.quantity,
        price: opt.unitPrice,
      })) || [],
    })),
    subtotal: order.total.subTotal,
    deliveryFee: order.total.deliveryFee,
    discount: order.total.discount,
    total: order.total.orderAmount,
    status: order.status,
    orderType: order.orderType,
    deliveryAddress: order.deliveryAddress,
    observations: order.observations,
    createdAt: order.createdAt,
    paymentMethod: order.payments[0]?.method,
    isPrepaid: order.payments[0]?.prepaid,
  };
}

// ============================================
// Stats
// ============================================

/**
 * Obter estatísticas de vendas iFood
 */
export async function getIFoodStats(empresaId: string): Promise<{
  pedidosHoje: number;
  vendasHoje: number;
  pedidosMes: number;
  vendasMes: number;
}> {
  const dbInstance = db();
  if (!dbInstance) {
    return { pedidosHoje: 0, vendasHoje: 0, pedidosMes: 0, vendasMes: 0 };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Vendas de hoje
  const todayQuery = query(
    collection(dbInstance, 'vendas'),
    where('empresaId', '==', empresaId),
    where('canal', '==', 'ifood'),
    where('criadoEm', '>=', Timestamp.fromDate(startOfToday))
  );
  const todaySnapshot = await getDocs(todayQuery);
  
  const pedidosHoje = todaySnapshot.size;
  const vendasHoje = todaySnapshot.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.total || 0);
  }, 0);

  // Vendas do mês
  const monthQuery = query(
    collection(dbInstance, 'vendas'),
    where('empresaId', '==', empresaId),
    where('canal', '==', 'ifood'),
    where('criadoEm', '>=', Timestamp.fromDate(startOfMonth))
  );
  const monthSnapshot = await getDocs(monthQuery);
  
  const pedidosMes = monthSnapshot.size;
  const vendasMes = monthSnapshot.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.total || 0);
  }, 0);

  return { pedidosHoje, vendasHoje, pedidosMes, vendasMes };
}
