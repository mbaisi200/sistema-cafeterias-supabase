import { createAdminClient } from '@/lib/supabase/server';

const IFOOD_API_BASE = 'https://merchant-api.ifood.com.br';
const IFOOD_AUTH_URL = 'https://merchant-api.ifood.com.br/authentication';
const UBER_API_BASE = 'https://api.uber.com/v1/eats';
const UBER_AUTH_URL = 'https://login.uber.com/oauth/v2/token';

interface NotifyParams {
  empresaId: string;
  vendaId: string;
  orderExternalId: string;
  origem: 'ifood' | 'uber_eats';
  acao: string;
  motivo?: string;
}

interface NotifyResult {
  notified: boolean;
  error?: string;
}

// ============ iFood ============

async function getIFoodToken(empresaId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from('ifood_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .single();

  if (!config?.client_id || !config?.client_secret) return null;

  if (config.access_token && config.token_expires_at) {
    const expiresAt = new Date(config.token_expires_at);
    if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) return config.access_token;
  }

  const res = await fetch(IFOOD_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.client_id,
      client_secret: config.client_secret,
    }),
  });
  if (!res.ok) return null;

  const tokenData = await res.json();
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  await supabase
    .from('ifood_config')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt,
      status: 'connected',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', config.id);

  return tokenData.access_token;
}

async function notifyIFood(params: NotifyParams): Promise<NotifyResult> {
  const token = await getIFoodToken(params.empresaId);
  if (!token) return { notified: false };

  const endpointMap: Record<string, string> = {
    confirm: `/order/v1.0/orders/${params.orderExternalId}/confirm`,
    start_preparation: `/order/v1.0/orders/${params.orderExternalId}/preparation/STARTED`,
    finish_preparation: `/order/v1.0/orders/${params.orderExternalId}/preparation/FINISHED`,
    request_driver: `/order/v1.0/orders/${params.orderExternalId}/requestDriver`,
    dispatch: `/order/v1.0/orders/${params.orderExternalId}/dispatch`,
    deliver: `/order/v1.0/orders/${params.orderExternalId}/deliver`,
    cancel: `/order/v1.0/orders/${params.orderExternalId}/cancel`,
  };

  const endpoint = endpointMap[params.acao];
  if (!endpoint) return { notified: false, error: `Ação iFood desconhecida: ${params.acao}` };

  const method = endpoint.includes('preparation') ? 'PUT' : 'POST';
  const body = params.acao === 'cancel' ? { reason: params.motivo || 'Cancelado pelo estabelecimento' } : undefined;

  try {
    const res = await fetch(`${IFOOD_API_BASE}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errText = await res.text();
      return { notified: false, error: errText };
    }
    return { notified: true };
  } catch (err) {
    return { notified: false, error: String(err) };
  }
}

// ============ Uber Eats ============

async function getUberToken(empresaId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from('uber_eats_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .single();

  if (!config?.client_id || !config?.client_secret) return null;

  if (config.access_token && config.token_expires_at) {
    const expiresAt = new Date(config.token_expires_at);
    if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) return config.access_token;
  }

  const res = await fetch(UBER_AUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.client_id}:${config.client_secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'eats.delivery_provider',
    }),
  });
  if (!res.ok) return null;

  const tokenData = await res.json();
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  await supabase
    .from('uber_eats_config')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt,
      status: 'connected',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', config.id);

  return tokenData.access_token;
}

async function notifyUber(params: NotifyParams): Promise<NotifyResult> {
  const token = await getUberToken(params.empresaId);
  if (!token) return { notified: false };

  const endpointMap: Record<string, { method: string; path: string; body?: Record<string, unknown> }> = {
    confirm: { method: 'POST', path: `/orders/${params.orderExternalId}/confirm` },
    start_preparation: { method: 'POST', path: `/orders/${params.orderExternalId}/preparation`, body: { status: 'started' } },
    finish_preparation: { method: 'POST', path: `/orders/${params.orderExternalId}/ready` },
    request_driver: { method: 'POST', path: `/orders/${params.orderExternalId}/restaurantdelivery/status`, body: { status: 'started' } },
    dispatch: { method: 'POST', path: `/orders/${params.orderExternalId}/dispatch` },
    deliver: { method: 'POST', path: `/orders/${params.orderExternalId}/delivered` },
    cancel: { method: 'POST', path: `/orders/${params.orderExternalId}/cancel`, body: { reason: params.motivo || 'Cancelado pelo estabelecimento' } },
  };

  const action = endpointMap[params.acao];
  if (!action) return { notified: false, error: `Ação Uber Eats desconhecida: ${params.acao}` };

  try {
    const res = await fetch(`${UBER_API_BASE}${action.path}`, {
      method: action.method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Uber-Sandbox': 'false',
      },
      body: action.body ? JSON.stringify(action.body) : undefined,
    });
    if (!res.ok && res.status !== 204) {
      const errText = await res.text();
      return { notified: false, error: errText };
    }
    return { notified: true };
  } catch (err) {
    return { notified: false, error: String(err) };
  }
}

// ============ Dispatch ============

function mapStatusToAction(status: string): string | null {
  const map: Record<string, string> = {
    confirmado: 'confirm',
    em_preparacao: 'start_preparation',
    pronto: 'finish_preparation',
    saiu_para_entrega: 'request_driver',
    entregue: 'deliver',
    cancelado: 'cancel',
  };
  return map[status] || null;
}

export async function notifyIntegration(params: NotifyParams): Promise<NotifyResult> {
  const supabase = createAdminClient();

  try {
    const result = params.origem === 'ifood'
      ? await notifyIFood(params)
      : await notifyUber(params);

    await supabase.from(params.origem === 'ifood' ? 'ifood_logs' : 'uber_eats_logs').insert({
      empresa_id: params.empresaId,
      tipo: `status_${params.acao}`,
      detalhes: `Notificação de status para pedido ${params.orderExternalId}: ${result.notified ? 'sucesso' : 'falha'}`,
      order_id: params.orderExternalId,
      sucesso: result.notified,
      erro: result.error || null,
      dados: { vendaId: params.vendaId, acao: params.acao },
      criado_em: new Date().toISOString(),
    });

    return result;
  } catch (err) {
    return { notified: false, error: String(err) };
  }
}

export function getAcaoFromStatus(status: string): string | null {
  return mapStatusToAction(status);
}
