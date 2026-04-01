/**
 * iFood Integration Service
 * 
 * Este serviço gerencia toda a integração com a API do iFood.
 * Inclui autenticação, recebimento de pedidos, sincronização de produtos e atualização de status.
 */

import { getSupabaseClient } from '@/lib/supabase';
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
 * Salvar configuração iFood no Supabase
 */
export async function saveIFoodConfig(empresaId: string, config: Partial<IFoodConfig>): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não inicializado');

  const configData = {
    ...config,
    empresa_id: empresaId,
    atualizado_em: new Date().toISOString(),
  };

  if (config.id) {
    const { error } = await supabase
      .from('ifood_config')
      .update(configData)
      .eq('id', config.id);
    
    if (error) throw error;
    return config.id;
  } else {
    configData.criado_em = new Date().toISOString();
    const { data, error } = await supabase
      .from('ifood_config')
      .insert(configData)
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }
}

/**
 * Obter configuração iFood de uma empresa
 */
export async function getIFoodConfig(empresaId: string): Promise<IFoodConfig | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('ifood_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .single();
  
  if (error || !data) return null;
  
  // Mapear de snake_case para camelCase
  return {
    id: data.id,
    empresaId: data.empresa_id,
    clientId: data.client_id,
    clientSecret: data.client_secret,
    merchantId: data.merchant_id,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: data.token_expires_at,
    status: data.status,
    totalPedidosRecebidos: data.total_pedidos_recebidos,
    ultimoPedidoEm: data.ultimo_pedido_em,
    criadoEm: data.criado_em,
    atualizadoEm: data.atualizado_em,
  } as IFoodConfig;
}

/**
 * Atualizar tokens no Supabase
 */
export async function updateTokens(
  configId: string, 
  accessToken: string, 
  refreshToken: string, 
  expiresIn: number
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  const { error } = await supabase
    .from('ifood_config')
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: expiresAt.toISOString(),
      status: 'connected',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', configId);
  
  if (error) throw error;
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
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase
    .from('ifood_logs')
    .insert({
      empresa_id: empresaId,
      tipo,
      detalhes,
      dados,
      order_id: orderId,
      produto_id: produtoId,
      sucesso,
      erro,
      criado_em: new Date().toISOString(),
    });
  
  if (error) {
    console.error('Erro ao registrar log iFood:', error);
  }
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
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não inicializado');

  // Verificar se o pedido já existe
  const { data: existingVenda } = await supabase
    .from('vendas')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('pedido_externo_id', order.orderId)
    .single();
  
  if (existingVenda) {
    // Pedido já processado, retornar ID existente
    return existingVenda.id;
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
  const { data: venda, error: vendaError } = await supabase
    .from('vendas')
    .insert({
      empresa_id: empresaId,
      tipo: 'delivery',
      canal: 'ifood',
      status: 'aberta',
      subtotal,
      desconto,
      taxa_servico: 0,
      taxa_entrega: taxaEntrega,
      total,
      
      // Dados do iFood
      pedido_externo_id: order.orderId,
      nome_cliente: order.customer.name,
      telefone_cliente: order.customer.phone,
      
      // Endereço de entrega
      endereco_entrega: order.deliveryAddress ? {
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
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (vendaError || !venda) {
    throw vendaError || new Error('Erro ao criar venda');
  }

  // Criar itens da venda
  const itensVenda = order.items.map(item => ({
    empresa_id: empresaId,
    venda_id: venda.id,
    produto_id: item.externalCode || '',
    nome: item.name,
    quantidade: item.quantity,
    preco_unitario: item.unitPrice,
    total: item.totalPrice || (item.quantity * item.unitPrice),
    desconto: 0,
    observacao: item.observations,
    criado_em: new Date().toISOString(),
  }));

  const { error: itensError } = await supabase
    .from('itens_venda')
    .insert(itensVenda);
  
  if (itensError) {
    console.error('Erro ao criar itens da venda:', itensError);
  }

  // Criar pagamento
  const { error: pagamentoError } = await supabase
    .from('pagamentos')
    .insert({
      empresa_id: empresaId,
      venda_id: venda.id,
      forma_pagamento: formaPagamento,
      valor: total,
      troco: payment?.changeFor ? payment.changeFor - total : 0,
      criado_em: new Date().toISOString(),
    });
  
  if (pagamentoError) {
    console.error('Erro ao criar pagamento:', pagamentoError);
  }

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
    await supabase
      .from('ifood_config')
      .update({
        ultimo_pedido_em: new Date().toISOString(),
        total_pedidos_recebidos: (config.totalPedidosRecebidos || 0) + 1,
      })
      .eq('id', config.id);
  }

  return venda.id;
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
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { pedidosHoje: 0, vendasHoje: 0, pedidosMes: 0, vendasMes: 0 };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Vendas de hoje
  const { data: todayData, error: todayError } = await supabase
    .from('vendas')
    .select('total')
    .eq('empresa_id', empresaId)
    .eq('canal', 'ifood')
    .gte('criado_em', startOfToday.toISOString());
  
  if (todayError) {
    console.error('Erro ao buscar vendas de hoje:', todayError);
  }
  
  const pedidosHoje = todayData?.length || 0;
  const vendasHoje = todayData?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;

  // Vendas do mês
  const { data: monthData, error: monthError } = await supabase
    .from('vendas')
    .select('total')
    .eq('empresa_id', empresaId)
    .eq('canal', 'ifood')
    .gte('criado_em', startOfMonth.toISOString());
  
  if (monthError) {
    console.error('Erro ao buscar vendas do mês:', monthError);
  }
  
  const pedidosMes = monthData?.length || 0;
  const vendasMes = monthData?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;

  return { pedidosHoje, vendasHoje, pedidosMes, vendasMes };
}
