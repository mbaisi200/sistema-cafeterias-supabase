/**
 * API iFood - Gerenciamento de Pedidos
 * 
 * Endpoints para interagir com a API do iFood:
 * - Confirmar pedido
 * - Iniciar preparação
 * - Finalizar preparação
 * - Solicitar entregador
 * - Despachar pedido
 * - Cancelar pedido
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Constants iFood API
const IFOOD_API_BASE_URL = 'https://merchant-api.ifood.com.br';
const IFOOD_AUTH_URL = 'https://merchant-api.ifood.com.br/authentication';

// ============================================
// Interfaces
// ============================================

interface IFoodConfig {
  id: string;
  empresa_id: string;
  client_id: string;
  client_secret: string;
  merchant_id: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Obter configuração iFood da empresa
 */
async function getIFoodConfig(empresaId: string): Promise<IFoodConfig | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('ifood_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    empresa_id: data.empresa_id,
    client_id: data.client_id,
    client_secret: data.client_secret,
    merchant_id: data.merchant_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: data.token_expires_at,
  };
}

/**
 * Obter novo token de acesso
 */
async function getAccessToken(config: IFoodConfig): Promise<TokenResponse> {
  const response = await fetch(IFOOD_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.client_id,
      client_secret: config.client_secret,
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
async function refreshAccessToken(config: IFoodConfig): Promise<TokenResponse> {
  const response = await fetch(IFOOD_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.client_id,
      client_secret: config.client_secret,
      refresh_token: config.refresh_token || '',
    }),
  });

  if (!response.ok) {
    // Se falhar, tentar obter novo token
    return getAccessToken(config);
  }

  return response.json();
}

/**
 * Verificar e renovar token se necessário
 */
async function ensureValidToken(config: IFoodConfig): Promise<string> {
  const supabase = createAdminClient();
  
  // Verificar se o token ainda é válido
  if (config.access_token && config.token_expires_at) {
    const expiresAt = new Date(config.token_expires_at);
    const now = new Date();
    
    // Se ainda tem 5 minutos de validade, usar o token atual
    if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
      return config.access_token;
    }
  }
  
  // Renovar token
  let tokenResponse: TokenResponse;
  
  if (config.refresh_token) {
    tokenResponse = await refreshAccessToken(config);
  } else {
    tokenResponse = await getAccessToken(config);
  }
  
  // Atualizar no banco
  const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
  
  await supabase
    .from('ifood_config')
    .update({
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      status: 'connected',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', config.id);
  
  return tokenResponse.access_token;
}

/**
 * Registrar log iFood
 */
async function logIFoodEvent(
  empresaId: string,
  tipo: string,
  detalhes: string,
  dados?: Record<string, unknown>,
  orderId?: string,
  sucesso: boolean = true,
  erro?: string
): Promise<void> {
  const supabase = createAdminClient();
  
  await supabase
    .from('ifood_logs')
    .insert({
      empresa_id: empresaId,
      tipo,
      detalhes,
      dados,
      order_id: orderId,
      sucesso,
      erro,
      criado_em: new Date().toISOString(),
    });
}

/**
 * Fazer chamada para API iFood
 */
async function callIFoodAPI(
  accessToken: string,
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(`${IFOOD_API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    // Alguns endpoints retornam 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================
// API Handlers
// ============================================

/**
 * GET - Listar pedidos pendentes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    
    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Buscar pedidos delivery da empresa
    const { data: vendas, error } = await supabase
      .from('vendas')
      .select(`
        *,
        itens:itens_venda(*)
      `)
      .eq('empresa_id', empresaId)
      .eq('tipo', 'delivery')
      .in('status', ['aberta', 'em_preparo', 'pronta'])
      .order('criado_em', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ vendas });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}

/**
 * POST - Executar ação no pedido iFood
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, empresaId, vendaId, orderId, motivo } = body;
    
    if (!action || !empresaId) {
      return NextResponse.json({ error: 'action e empresaId são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Buscar configuração iFood
    const config = await getIFoodConfig(empresaId);
    if (!config) {
      return NextResponse.json({ error: 'Integração iFood não configurada' }, { status: 400 });
    }

    // Buscar venda e dados do pedido iFood
    let ifoodOrderId = orderId;
    
    if (!ifoodOrderId && vendaId) {
      const { data: ifoodPedido } = await supabase
        .from('ifood_pedidos')
        .select('order_id')
        .eq('venda_id', vendaId)
        .single();
      
      if (ifoodPedido) {
        ifoodOrderId = ifoodPedido.order_id;
      } else {
        // Tentar buscar pelo pedido_externo_id na venda
        const { data: venda } = await supabase
          .from('vendas')
          .select('pedido_externo_id')
          .eq('id', vendaId)
          .single();
        
        ifoodOrderId = venda?.pedido_externo_id;
      }
    }

    if (!ifoodOrderId && action !== 'test_connection') {
      return NextResponse.json({ error: 'ID do pedido iFood não encontrado' }, { status: 400 });
    }

    // Obter token válido
    const accessToken = await ensureValidToken(config);

    // Executar ação
    let result: { success: boolean; data?: unknown; error?: string };
    let novoStatus: string | null = null;
    let logTipo: string;
    let logDetalhes: string;

    switch (action) {
      case 'confirm':
        // Confirmar pedido
        result = await callIFoodAPI(accessToken, 'POST', `/order/v1.0/orders/${ifoodOrderId}/confirm`);
        novoStatus = 'aberta';
        logTipo = 'order_confirmed';
        logDetalhes = `Pedido ${ifoodOrderId} confirmado`;
        break;

      case 'start_preparation':
        // Iniciar preparação
        result = await callIFoodAPI(accessToken, 'PUT', `/order/v1.0/orders/${ifoodOrderId}/preparation/STARTED`);
        novoStatus = 'em_preparo';
        logTipo = 'order_preparation_started';
        logDetalhes = `Preparação do pedido ${ifoodOrderId} iniciada`;
        break;

      case 'finish_preparation':
        // Finalizar preparação
        result = await callIFoodAPI(accessToken, 'PUT', `/order/v1.0/orders/${ifoodOrderId}/preparation/FINISHED`);
        novoStatus = 'pronta';
        logTipo = 'order_ready';
        logDetalhes = `Preparação do pedido ${ifoodOrderId} finalizada`;
        break;

      case 'request_driver':
        // Solicitar entregador
        result = await callIFoodAPI(accessToken, 'POST', `/order/v1.0/orders/${ifoodOrderId}/requestDriver`);
        logTipo = 'order_dispatched';
        logDetalhes = `Entregador solicitado para pedido ${ifoodOrderId}`;
        break;

      case 'dispatch':
        // Despachar pedido
        result = await callIFoodAPI(accessToken, 'POST', `/order/v1.0/orders/${ifoodOrderId}/dispatch`);
        novoStatus = 'despachada';
        logTipo = 'order_dispatched';
        logDetalhes = `Pedido ${ifoodOrderId} despachado`;
        break;

      case 'deliver':
        // Marcar como entregue
        result = await callIFoodAPI(accessToken, 'POST', `/order/v1.0/orders/${ifoodOrderId}/deliver`);
        novoStatus = 'entregue';
        logTipo = 'order_delivered';
        logDetalhes = `Pedido ${ifoodOrderId} entregue`;
        break;

      case 'cancel':
        // Cancelar pedido
        if (!motivo) {
          return NextResponse.json({ error: 'motivo é obrigatório para cancelamento' }, { status: 400 });
        }
        result = await callIFoodAPI(accessToken, 'POST', `/order/v1.0/orders/${ifoodOrderId}/cancel`, { reason: motivo });
        novoStatus = 'cancelada';
        logTipo = 'order_cancelled';
        logDetalhes = `Pedido ${ifoodOrderId} cancelado: ${motivo}`;
        break;

      case 'test_connection':
        // Testar conexão
        try {
          const testResult = await callIFoodAPI(accessToken, 'GET', `/merchant/v1.0/merchants/${config.merchant_id}/status`);
          result = { success: testResult.success, data: testResult.data, error: testResult.error };
          logTipo = 'api_call';
          logDetalhes = 'Teste de conexão com iFood';
        } catch (e) {
          result = { success: true, data: { message: 'Token válido' } };
          logTipo = 'api_call';
          logDetalhes = 'Teste de conexão com iFood (token válido)';
        }
        break;

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    // Registrar log
    await logIFoodEvent(
      empresaId,
      logTipo,
      logDetalhes,
      { action, orderId: ifoodOrderId, result },
      ifoodOrderId,
      result.success,
      result.error
    );

    // Se a ação foi bem sucedida e há um novo status, atualizar a venda
    if (result.success && novoStatus && vendaId) {
      await supabase
        .from('vendas')
        .update({
          status: novoStatus,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', vendaId);
      
      // Atualizar status no ifood_pedidos também
      await supabase
        .from('ifood_pedidos')
        .update({
          ifood_status: action.toUpperCase(),
          atualizado_em: new Date().toISOString(),
        })
        .eq('venda_id', vendaId);
    }

    // Atualizar erro na config se falhou
    if (!result.success) {
      await supabase
        .from('ifood_config')
        .update({
          ultimo_erro: result.error,
          ultimo_erro_em: new Date().toISOString(),
        })
        .eq('id', config.id);
    }

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      novoStatus,
    });
  } catch (error) {
    console.error('Erro na API iFood:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
