/**
 * Uber Eats Integration Service
 * 
 * Este serviço gerencia toda a integração com a API do Uber Eats.
 * Inclui autenticação OAuth2, recebimento de pedidos, sincronização de produtos e atualização de status.
 * 
 * Documentação: https://developer.uber.com/docs/eats
 */

import { getSupabaseClient } from '@/lib/supabase';
import {
  UberEatsConfig,
  UberEatsOrder,
  UberEatsProdutoSync,
  UberEatsLog,
  UberEatsProductPayload,
  UBER_EATS_STATUS_MAP,
} from '@/types/uber-eats';

// ============================================
// Constants
// ============================================

const UBER_EATS_API_BASE_URL = 'https://api.uber.com/v1/eats';
const UBER_EATS_AUTH_URL = 'https://login.uber.com/oauth/v2/token';

// ============================================
// Authentication
// ============================================

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Obter token de acesso usando client credentials
 * Uber Eats usa OAuth2 com client credentials flow
 */
export async function getAccessToken(config: { clientId: string; clientSecret: string }): Promise<TokenResponse> {
  const response = await fetch(UBER_EATS_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'eats.delivery_provider',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao obter token Uber Eats: ${error}`);
  }

  return response.json();
}

/**
 * Renovar token usando refresh token
 */
export async function refreshAccessToken(config: { clientId: string; clientSecret: string; refreshToken: string }): Promise<TokenResponse> {
  const response = await fetch(UBER_EATS_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao renovar token Uber Eats: ${error}`);
  }

  return response.json();
}

/**
 * Verificar se o token está expirado
 */
export function isTokenExpired(tokenExpiresAt?: Date): boolean {
  if (!tokenExpiresAt) return true;
  const now = new Date();
  const expiresAt = new Date(tokenExpiresAt);
  // Considerar expirado 5 minutos antes para margem de segurança
  return now >= new Date(expiresAt.getTime() - 5 * 60 * 1000);
}

// ============================================
// Config Management
// ============================================

/**
 * Salvar configuração Uber Eats no Supabase
 */
export async function saveUberEatsConfig(empresaId: string, config: Partial<UberEatsConfig>): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não inicializado');

  const configData: Record<string, any> = {
    empresa_id: empresaId,
    atualizado_em: new Date().toISOString(),
  };

  if (config.clientId !== undefined) configData.client_id = config.clientId;
  if (config.clientSecret !== undefined) configData.client_secret = config.clientSecret;
  if (config.merchantUuid !== undefined) configData.merchant_uuid = config.merchantUuid;
  if (config.ativo !== undefined) configData.ativo = config.ativo;
  if (config.status !== undefined) configData.status = config.status;
  if (config.webhookSecret !== undefined) configData.webhook_secret = config.webhookSecret;
  if (config.sincronizarProdutos !== undefined) configData.sincronizar_produtos = config.sincronizarProdutos;
  if (config.sincronizarEstoque !== undefined) configData.sincronizar_estoque = config.sincronizarEstoque;
  if (config.sincronizarPrecos !== undefined) configData.sincronizar_precos = config.sincronizarPrecos;
  if (config.receberPedidosAutomatico !== undefined) configData.receber_pedidos_automatico = config.receberPedidosAutomatico;
  if (config.tempoPreparoPadrao !== undefined) configData.tempo_preparo_padrao = config.tempoPreparoPadrao;

  if (config.id) {
    const { error } = await supabase
      .from('uber_eats_config')
      .update(configData)
      .eq('id', config.id);
    
    if (error) throw error;
    return config.id;
  } else {
    const { data, error } = await supabase
      .from('uber_eats_config')
      .insert(configData)
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }
}

/**
 * Obter configuração Uber Eats de uma empresa
 */
export async function getUberEatsConfig(empresaId: string): Promise<UberEatsConfig | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('uber_eats_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    empresaId: data.empresa_id,
    ativo: data.ativo ?? false,
    status: data.status ?? 'disconnected',
    clientId: data.client_id || '',
    clientSecret: data.client_secret || '',
    merchantUuid: data.merchant_uuid || '',
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: data.token_expires_at ? new Date(data.token_expires_at) : undefined,
    webhookSecret: data.webhook_secret,
    sincronizarProdutos: data.sincronizar_produtos ?? true,
    sincronizarEstoque: data.sincronizar_estoque ?? true,
    sincronizarPrecos: data.sincronizar_precos ?? true,
    receberPedidosAutomatico: data.receber_pedidos_automatico ?? true,
    tempoPreparoPadrao: data.tempo_preparo_padrao || 30,
    ultimoPedidoEm: data.ultimo_pedido_em ? new Date(data.ultimo_pedido_em) : undefined,
    totalPedidosRecebidos: data.total_pedidos_recebidos || 0,
    ultimoErro: data.ultimo_erro,
    ultimoErroEm: data.ultimo_erro_em ? new Date(data.ultimo_erro_em) : undefined,
    criadoEm: new Date(data.criado_em),
    atualizadoEm: new Date(data.atualizado_em),
  };
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
    .from('uber_eats_config')
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

/**
 * Obter token válido (renova se expirado)
 */
export async function getValidToken(config: UberEatsConfig): Promise<string> {
  if (!isTokenExpired(config.tokenExpiresAt) && config.accessToken) {
    return config.accessToken;
  }

  if (config.refreshToken) {
    try {
      const tokenResponse = await refreshAccessToken({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        refreshToken: config.refreshToken,
      });

      await updateTokens(config.id, tokenResponse.access_token, tokenResponse.refresh_token || config.refreshToken, tokenResponse.expires_in);
      return tokenResponse.access_token;
    } catch {
      // Fallback: obter novo token
    }
  }

  const tokenResponse = await getAccessToken({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  await updateTokens(config.id, tokenResponse.access_token, tokenResponse.refresh_token || '', tokenResponse.expires_in);
  return tokenResponse.access_token;
}

// ============================================
// API Helper
// ============================================

/**
 * Fazer requisição autenticada à API do Uber Eats
 */
async function uberEatsApiCall(
  config: UberEatsConfig,
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<any> {
  const token = await getValidToken(config);

  const response = await fetch(`${UBER_EATS_API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Uber-Eats-Merchant-Uuid': config.merchantUuid,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro na API Uber Eats (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data;
}

// ============================================
// Order Management
// ============================================

/**
 * Confirmar/aceitar pedido no Uber Eats
 */
export async function confirmOrder(config: UberEatsConfig, orderId: string): Promise<void> {
  await uberEatsApiCall(config, 'POST', `/orders/${orderId}/confirm`);
}

/**
 * Rejeitar pedido no Uber Eats
 */
export async function rejectOrder(config: UberEatsConfig, orderId: string, reason: string): Promise<void> {
  await uberEatsApiCall(config, 'POST', `/orders/${orderId}/reject`, { reason });
}

/**
 * Atualizar status de preparação
 */
export async function updatePreparationStatus(
  config: UberEatsConfig, 
  orderId: string, 
  status: 'started' | 'finished'
): Promise<void> {
  await uberEatsApiCall(config, 'POST', `/orders/${orderId}/preparation`, { status });
}

/**
 * Marcar pedido como pronto para retirada
 */
export async function markReadyForPickup(config: UberEatsConfig, orderId: string): Promise<void> {
  await uberEatsApiCall(config, 'POST', `/orders/${orderId}/ready`);
}

/**
 * Despachar pedido (entregador a caminho)
 */
export async function dispatchOrder(config: UberEatsConfig, orderId: string): Promise<void> {
  await uberEatsApiCall(config, 'POST', `/orders/${orderId}/dispatch`);
}

/**
 * Marcar pedido como entregue
 */
export async function markDelivered(config: UberEatsConfig, orderId: string): Promise<void> {
  await uberEatsApiCall(config, 'POST', `/orders/${orderId}/delivered`);
}

/**
 * Cancelar pedido
 */
export async function cancelOrder(
  config: UberEatsConfig, 
  orderId: string, 
  reason: string
): Promise<void> {
  await uberEatsApiCall(config, 'POST', `/orders/${orderId}/cancel`, { reason });
}

/**
 * Obter detalhes de um pedido
 */
export async function getOrderDetails(config: UberEatsConfig, orderId: string): Promise<any> {
  return uberEatsApiCall(config, 'GET', `/orders/${orderId}`);
}

// ============================================
// Product Sync
// ============================================

/**
 * Sincronizar produto com Uber Eats
 */
export async function syncProduct(
  config: UberEatsConfig, 
  product: UberEatsProductPayload
): Promise<{ id: string; externalCode: string }> {
  const result = await uberEatsApiCall(config, 'POST', '/menus/items', {
    external_id: product.externalCode,
    name: product.title,
    description: product.description || '',
    price: Math.round(product.price * 100), // Uber Eats usa centavos
    status: product.status,
    image_url: product.imageUrl,
    category_external_id: product.category,
  });

  return {
    id: result.id,
    externalCode: product.externalCode,
  };
}

/**
 * Atualizar disponibilidade do produto
 */
export async function updateProductAvailability(
  config: UberEatsConfig,
  productId: string,
  available: boolean
): Promise<void> {
  await uberEatsApiCall(config, 'PATCH', `/menus/items/${productId}/availability`, {
    available,
  });
}

/**
 * Atualizar preço do produto
 */
export async function updateProductPrice(
  config: UberEatsConfig,
  productId: string,
  price: number
): Promise<void> {
  await uberEatsApiCall(config, 'PATCH', `/menus/items/${productId}/price`, {
    price: Math.round(price * 100), // Uber Eats usa centavos
  });
}

/**
 * Sincronizar categoria/menu
 */
export async function syncCategory(
  config: UberEatsConfig,
  category: { externalId: string; name: string; description?: string }
): Promise<{ id: string }> {
  const result = await uberEatsApiCall(config, 'POST', '/menus/categories', {
    external_id: category.externalId,
    name: category.name,
    description: category.description || '',
  });

  return { id: result.id };
}

/**
 * Sincronizar menu completo
 */
export async function syncFullMenu(
  config: UberEatsConfig,
  menu: {
    externalId: string;
    name: string;
    categories: Array<{
      externalId: string;
      name: string;
      items: Array<{
        externalId: string;
        name: string;
        description?: string;
        price: number;
        available: boolean;
      }>;
    }>;
  }
): Promise<void> {
  await uberEatsApiCall(config, 'PUT', `/menus/${menu.externalId}`, {
    name: menu.name,
    categories: menu.categories.map(cat => ({
      external_id: cat.externalId,
      name: cat.name,
      items: cat.items.map(item => ({
        external_id: item.externalId,
        name: item.name,
        description: item.description || '',
        price: Math.round(item.price * 100),
        available: item.available,
      })),
    })),
  });
}

// ============================================
// Webhook Verification
// ============================================

/**
 * Verificar assinatura do webhook do Uber Eats
 * 
 * Uber Eats envia um header X-UBER-EATS-SIGNATURE com HMAC-SHA256
 * do body do request usando o webhook secret como chave.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null,
  webhookSecret: string
): boolean {
  if (!signature || !webhookSecret) return false;

  // Em ambiente serverless (Edge/Node), usamos crypto do Node.js
  // Para Next.js App Router, usamos Web Crypto API
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const messageData = encoder.encode(body);

    return crypto.subtle
      .importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      .then(key => crypto.subtle.sign('HMAC', key, messageData))
      .then(signatureBytes => {
        const hexSignature = Array.from(new Uint8Array(signatureBytes))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        return hexSignature === signature;
      })
      // Fallback: se crypto.subtle não estiver disponível, aceitar (para dev)
      .catch(() => process.env.NODE_ENV !== 'production');
  } catch {
    // Em caso de erro, aceitar em desenvolvimento
    return process.env.NODE_ENV !== 'production';
  }
}

/**
 * Verificar assinatura do webhook (versão síncrona para uso em edge)
 */
export async function verifyWebhookSignatureAsync(
  body: string,
  signature: string | null,
  webhookSecret: string
): Promise<boolean> {
  if (!signature || !webhookSecret) return false;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const messageData = encoder.encode(body);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign('HMAC', key, messageData);
    const hexSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hexSignature === signature.toLowerCase();
  } catch {
    return process.env.NODE_ENV !== 'production';
  }
}

// ============================================
// Logging
// ============================================

/**
 * Registrar log de evento Uber Eats
 */
export async function logUberEatsEvent(
  empresaId: string,
  tipo: UberEatsLog['tipo'],
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
    .from('uber_eats_logs')
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
    console.error('Erro ao registrar log Uber Eats:', error);
  }
}

// ============================================
// Order Processing
// ============================================

/**
 * Processar pedido recebido do Uber Eats e criar venda no sistema
 */
export async function processUberEatsOrder(
  empresaId: string,
  order: UberEatsOrder,
  autoAccept: boolean = true
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
    return existingVenda.id;
  }

  // Calcular valores
  const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxaEntrega = order.deliveryFee || 0;
  const desconto = order.total.discount || 0;
  const total = order.total.orderAmount;

  // Criar venda
  const { data: venda, error: vendaError } = await supabase
    .from('vendas')
    .insert({
      empresa_id: empresaId,
      tipo: 'delivery',
      canal: 'uber_eats',
      status: autoAccept ? 'aberta' : 'pendente',
      subtotal,
      desconto,
      taxa_entrega: taxaEntrega,
      total,
      
      // Dados do Uber Eats
      pedido_externo_id: order.orderId,
      nome_cliente: order.customer.name,
      telefone_cliente: order.customer.phone,
      
      // Endereço de entrega
      endereco_entrega: order.deliveryAddress ? {
        logradouro: order.deliveryAddress.street,
        numero: order.deliveryAddress.streetNumber,
        complemento: order.deliveryAddress.complement,
        bairro: order.deliveryAddress.neighborhood,
        cidade: order.deliveryAddress.city,
        estado: order.deliveryAddress.state,
        cep: order.deliveryAddress.zipcode,
        latitude: order.deliveryAddress.latitude,
        longitude: order.deliveryAddress.longitude,
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
    produto_id: item.productId || '',
    nome: item.productName,
    quantidade: item.quantity,
    preco_unitario: item.unitPrice,
    total: item.totalPrice || (item.quantity * item.unitPrice),
    observacao: item.observations,
    criado_em: new Date().toISOString(),
  }));

  if (itensVenda.length > 0) {
    const { error: itensError } = await supabase
      .from('itens_venda')
      .insert(itensVenda);
    
    if (itensError) {
      console.error('Erro ao criar itens da venda:', itensError);
    }
  }

  // Criar registro na tabela uber_eats_pedidos
  await supabase.from('uber_eats_pedidos').insert({
    empresa_id: empresaId,
    venda_id: venda.id,
    order_id: order.orderId,
    display_id: order.displayId,
    customer_id: order.customer.id,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    customer_email: order.customer.email,
    order_type: order.orderType,
    delivery_address: order.deliveryAddress ? JSON.stringify(order.deliveryAddress) : null,
    delivery_latitude: order.deliveryAddress?.latitude,
    delivery_longitude: order.deliveryAddress?.longitude,
    estimated_delivery_time: order.estimatedDeliveryTime,
    uber_eats_status: order.status,
    dados_completos: order,
    sincronizado: true,
    ultimo_sync_em: new Date().toISOString(),
  });

  // Registrar log
  await logUberEatsEvent(
    empresaId,
    'order_received',
    `Pedido ${order.orderId} recebido do Uber Eats`,
    { order },
    order.orderId,
    undefined,
    true
  );

  // Atualizar estatísticas do config
  const config = await getUberEatsConfig(empresaId);
  if (config && config.id) {
    await supabase
      .from('uber_eats_config')
      .update({
        ultimo_pedido_em: new Date().toISOString(),
        total_pedidos_recebidos: (config.totalPedidosRecebidos || 0) + 1,
      })
      .eq('id', config.id);
  }

  return venda.id;
}

/**
 * Converter pedido Uber Eats para formato de exibição
 */
export function formatUberEatsOrder(order: UberEatsOrder) {
  return {
    orderId: order.orderId,
    displayId: order.displayId,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    customerEmail: order.customer.email,
    items: order.items.map(item => ({
      name: item.productName,
      quantity: item.quantity,
      price: item.unitPrice,
      total: item.totalPrice,
      notes: item.observations,
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
    estimatedDeliveryTime: order.estimatedDeliveryTime,
  };
}

// ============================================
// Stats
// ============================================

/**
 * Obter estatísticas de vendas Uber Eats
 */
export async function getUberEatsStats(empresaId: string): Promise<{
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
  const { data: todayData } = await supabase
    .from('vendas')
    .select('total')
    .eq('empresa_id', empresaId)
    .eq('canal', 'uber_eats')
    .gte('criado_em', startOfToday.toISOString());
  
  const pedidosHoje = todayData?.length || 0;
  const vendasHoje = todayData?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;

  // Vendas do mês
  const { data: monthData } = await supabase
    .from('vendas')
    .select('total')
    .eq('empresa_id', empresaId)
    .eq('canal', 'uber_eats')
    .gte('criado_em', startOfMonth.toISOString());
  
  const pedidosMes = monthData?.length || 0;
  const vendasMes = monthData?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;

  return { pedidosHoje, vendasHoje, pedidosMes, vendasMes };
}

// ============================================
// Test Connection
// ============================================

/**
 * Testar conexão com a API do Uber Eats
 */
export async function testConnection(config: { clientId: string; clientSecret: string; merchantUuid: string }): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    // Testar obtenção de token
    const tokenResponse = await getAccessToken({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });

    if (!tokenResponse.access_token) {
      return { success: false, message: 'Token não recebido' };
    }

    // Testar acesso à API com o merchant UUID
    const response = await fetch(`${UBER_EATS_API_BASE_URL}/merchants/${config.merchantUuid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenResponse.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const merchantData = await response.json();
      return { 
        success: true, 
        message: 'Conexão realizada com sucesso',
        details: {
          merchantName: merchantData.name,
          status: merchantData.status,
        }
      };
    } else {
      return { success: false, message: `Erro ao acessar merchant: ${response.status}` };
    }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}
