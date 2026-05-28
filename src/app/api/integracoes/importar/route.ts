import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const IFOOD_API = 'https://merchant-api.ifood.com.br';
const IFOOD_AUTH = 'https://merchant-api.ifood.com.br/authentication';
const UBER_API = 'https://api.uber.com/v1/eats';
const UBER_AUTH = 'https://login.uber.com/oauth/v2/token';

interface ImportLog {
  tipo: string;
  mensagem: string;
  sucesso: boolean;
}

// ============ Token helpers ============

async function getIFoodToken(empresaId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: cfg } = await supabase
    .from('ifood_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .single();
  if (!cfg?.client_id || !cfg?.client_secret) return null;

  if (cfg.access_token && cfg.token_expires_at && new Date(cfg.token_expires_at).getTime() - Date.now() > 300000) {
    return cfg.access_token;
  }

  const res = await fetch(IFOOD_AUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: cfg.client_id, client_secret: cfg.client_secret }),
  });
  if (!res.ok) return null;
  const t = await res.json();
  await supabase.from('ifood_config').update({
    access_token: t.access_token, refresh_token: t.refresh_token,
    token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    status: 'connected', atualizado_em: new Date().toISOString(),
  }).eq('id', cfg.id);
  return t.access_token;
}

async function getUberToken(empresaId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: cfg } = await supabase
    .from('uber_eats_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .single();
  if (!cfg?.client_id || !cfg?.client_secret) return null;

  if (cfg.access_token && cfg.token_expires_at && new Date(cfg.token_expires_at).getTime() - Date.now() > 300000) {
    return cfg.access_token;
  }

  const res = await fetch(UBER_AUTH, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.client_id}:${cfg.client_secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'eats.delivery_provider' }),
  });
  if (!res.ok) return null;
  const t = await res.json();
  await supabase.from('uber_eats_config').update({
    access_token: t.access_token, refresh_token: t.refresh_token,
    token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    status: 'connected', atualizado_em: new Date().toISOString(),
  }).eq('id', cfg.id);
  return t.access_token;
}

// ============ Image helper ============

async function importImage(url: string | undefined | null, empresaId: string, produtoId: string, supabase: any): Promise<string | null> {
  if (!url) return null;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    const buffer = Buffer.from(await resp.arrayBuffer());
    const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
    const path = `${empresaId}/${produtoId}.${ext}`;
    const { error } = await supabase.storage.from('produto-imagens').upload(path, buffer, {
      contentType: resp.headers.get('content-type') || 'image/jpeg',
      upsert: true,
    });
    if (error) return null;
    const { data: pub } = supabase.storage.from('produto-imagens').getPublicUrl(path);
    return pub?.publicUrl || null;
  } catch {
    return null;
  }
}

// ============ Import products ============

async function importIFoodProducts(empresaId: string, logs: ImportLog[]): Promise<{ importados: number; imagens: number }> {
  const supabase = createAdminClient();
  const token = await getIFoodToken(empresaId);
  if (!token) { logs.push({ tipo: 'erro', mensagem: 'iFood não configurado ou token inválido', sucesso: false }); return { importados: 0, imagens: 0 }; }

  const { data: cfg } = await supabase.from('ifood_config').select('merchant_id').eq('empresa_id', empresaId).single();

  const res = await fetch(`${IFOOD_API}/merchant/v1.0/merchants/${cfg?.merchant_id}/products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { logs.push({ tipo: 'erro', mensagem: `Erro ao buscar produtos iFood: ${await res.text()}`, sucesso: false }); return { importados: 0, imagens: 0 }; }

  const produtos = await res.json();
  let importados = 0, imagens = 0;

  for (const p of produtos) {
    const existing = await supabase.from('produtos').select('id').eq('empresa_id', empresaId).eq('codigo', p.externalCode || `ifood-${p.id}`).maybeSingle();
    const produtoId = existing?.id || crypto.randomUUID();

    const fotoUrl = await importImage(p.image, empresaId, produtoId, supabase);

    await supabase.from('produtos').upsert({
      id: produtoId,
      empresa_id: empresaId,
      nome: p.name,
      descricao: p.description || null,
      preco: p.price || 0,
      codigo: p.externalCode || `ifood-${p.id}`,
      foto: fotoUrl || undefined,
      ativo: p.status === 'AVAILABLE',
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    } as any, { onConflict: 'id' });

    importados++;
    if (fotoUrl) imagens++;
  }

  logs.push({ tipo: 'sucesso', mensagem: `${importados} produtos importados do iFood (${imagens} com imagem)`, sucesso: true });
  return { importados, imagens };
}

async function importUberProducts(empresaId: string, logs: ImportLog[]): Promise<{ importados: number; imagens: number }> {
  const supabase = createAdminClient();
  const token = await getUberToken(empresaId);
  if (!token) { logs.push({ tipo: 'erro', mensagem: 'Uber Eats não configurado ou token inválido', sucesso: false }); return { importados: 0, imagens: 0 }; }

  const { data: cfg } = await supabase.from('uber_eats_config').select('merchant_uuid').eq('empresa_id', empresaId).single();

  const res = await fetch(`${UBER_API}/merchants/${cfg?.merchant_uuid}/menus`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) { logs.push({ tipo: 'erro', mensagem: `Erro ao buscar cardápio Uber: ${await res.text()}`, sucesso: false }); return { importados: 0, imagens: 0 }; }

  const menus = await res.json();
  let importados = 0, imagens = 0;

  const items: any[] = [];
  for (const menu of Array.isArray(menus) ? menus : []) {
    const entries = menu.entries || menu.items || [];
    for (const item of entries) {
      items.push(item);
    }
  }

  for (const item of items) {
    const existing = await supabase.from('produtos').select('id').eq('empresa_id', empresaId).eq('codigo', item.externalCode || `uber-${item.id}`).maybeSingle();
    const produtoId = existing?.id || crypto.randomUUID();

    const fotoUrl = await importImage(item.imageUrl || item.image, empresaId, produtoId, supabase);

    await supabase.from('produtos').upsert({
      id: produtoId,
      empresa_id: empresaId,
      nome: item.title || item.name,
      descricao: item.description || null,
      preco: item.price || 0,
      codigo: item.externalCode || `uber-${item.id}`,
      foto: fotoUrl || undefined,
      ativo: item.status === 'AVAILABLE',
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    } as any, { onConflict: 'id' });

    importados++;
    if (fotoUrl) imagens++;
  }

  logs.push({ tipo: 'sucesso', mensagem: `${importados} produtos importados do Uber Eats (${imagens} com imagem)`, sucesso: true });
  return { importados, imagens };
}

// ============ Customer import helper ============

async function importOrCreateCliente(
  supabase: any,
  empresaId: string,
  nome: string | undefined | null,
  telefone: string | undefined | null,
): Promise<string | null> {
  if (!nome?.trim()) return null;

  const nomeLimpo = nome.trim();
  const telLimpo = telefone?.replace(/\D/g, '') || '';

  // Buscar por telefone (mais preciso)
  if (telLimpo) {
    const { data } = await supabase
      .from('clientes')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('telefone', telefone?.trim())
      .maybeSingle();
    if (data) return data.id;
  }

  // Buscar por nome (fallback)
  const { data } = await supabase
    .from('clientes')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('nome_razao_social', nomeLimpo)
    .maybeSingle();
  if (data) return data.id;

  // Criar novo cliente
  const { data: novo, error } = await supabase
    .from('clientes')
    .insert({
      empresa_id: empresaId,
      nome_razao_social: nomeLimpo,
      telefone: telefone?.trim() || null,
      ativo: true,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !novo) return null;
  return novo.id;
}

// ============ Stock check helper ============

async function verificarEstoqueItens(
  supabase: any,
  empresaId: string,
  items: any[],
  logs: ImportLog[],
): Promise<{ items: any[]; semEstoque: string[] }> {
  const semEstoque: string[] = [];
  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, codigo, nome, estoque_atual, controlar_estoque')
    .eq('empresa_id', empresaId);

  const produtosPorCodigo: Record<string, any> = {};
  const produtosPorNome: Record<string, any> = {};
  if (produtos) {
    for (const p of produtos) {
      if (p.codigo) produtosPorCodigo[p.codigo.toLowerCase()] = p;
      if (p.nome) produtosPorNome[p.nome.toLowerCase()] = p;
    }
  }

  for (const item of items) {
    const code = item.externalCode || item.productExternalCode || '';
    const name = item.name || item.productName || '';
    const produto = produtosPorCodigo[code.toLowerCase()] || produtosPorNome[name.toLowerCase()];

    if (produto) {
      item.produto_id = produto.id;
      if (produto.controlar_estoque !== false) {
        const needed = item.quantity || 1;
        const available = parseFloat(produto.estoque_atual) || 0;
        if (available < needed) {
          semEstoque.push(`${produto.nome} (pedido: ${needed}, disponível: ${available})`);
        }
      }
    }
  }

  return { items, semEstoque };
}

// ============ Import orders ============

async function importIFoodOrders(empresaId: string, logs: ImportLog[]): Promise<number> {
  const supabase = createAdminClient();
  const token = await getIFoodToken(empresaId);
  if (!token) { logs.push({ tipo: 'erro', mensagem: 'iFood não configurado', sucesso: false }); return 0; }

  const res = await fetch(`${IFOOD_API}/order/v1.0/orders:polling`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { logs.push({ tipo: 'erro', mensagem: `Erro ao buscar pedidos iFood: ${await res.text()}`, sucesso: false }); return 0; }

  const pedidos = await res.json();
  let criados = 0;

  for (const ev of Array.isArray(pedidos) ? pedidos : []) {
    const orderId = ev.orderId || ev.id;
    if (!orderId) continue;

    const existe = await supabase.from('vendas').select('id').eq('empresa_id', empresaId).eq('pedido_externo_id', orderId).maybeSingle();
    if (existe) continue;

    const detRes = await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!detRes.ok) continue;
    const det = await detRes.json();

    const total = det.total?.orderAmount || 0;
    const now = new Date().toISOString();
    const clienteId = await importOrCreateCliente(supabase, empresaId, det.customer?.name, det.customer?.phone);

    const { data: venda, error: vErr } = await supabase.from('vendas').insert({
      empresa_id: empresaId,
      tipo: 'delivery',
      canal: 'ifood',
      status: 'pendente',
      subtotal: det.total?.subTotal || 0,
      taxa_entrega: det.total?.deliveryFee || 0,
      total,
      forma_pagamento: 'ifood_online',
      pedido_externo_id: orderId,
      cliente_id: clienteId,
      nome_cliente: det.customer?.name || null,
      telefone_cliente: det.customer?.phone || null,
      entrega_logradouro: det.deliveryAddress?.streetName || null,
      entrega_numero: det.deliveryAddress?.streetNumber || null,
      entrega_complemento: det.deliveryAddress?.complement || null,
      entrega_bairro: det.deliveryAddress?.neighborhood || null,
      entrega_cidade: det.deliveryAddress?.city || null,
      entrega_cep: det.deliveryAddress?.postalCode || null,
      observacao: det.observations || null,
      criado_em: now,
    } as any).select('id').single();

    if (vErr) continue;

    if (det.items?.length) {
      const { items, semEstoque } = await verificarEstoqueItens(supabase, empresaId, det.items, logs);
      await supabase.from('itens_venda').insert(
        items.map((i: any) => ({
          empresa_id: empresaId,
          venda_id: venda.id,
          produto_id: i.produto_id || null,
          nome: i.name,
          quantidade: i.quantity || 1,
          preco_unitario: i.unitPrice || 0,
          total: i.totalPrice || 0,
        }))
      );

      if (semEstoque.length > 0) {
        const msg = `⚠️ Sem estoque: ${semEstoque.join('; ')}`;
        const observacaoAtual = (det.observations || '') + `\n${msg}`;
        await supabase.from('vendas').update({ observacao: observacaoAtual }).eq('id', venda.id);
        logs.push({ tipo: 'aviso', mensagem: `Pedido ${orderId}: ${semEstoque.length} item(ns) sem estoque — ${msg}`, sucesso: true });
      }
    }

    criados++;
  }

  logs.push({ tipo: 'sucesso', mensagem: `${criados} pedidos iFood importados`, sucesso: true });
  return criados;
}

async function importUberOrders(empresaId: string, logs: ImportLog[]): Promise<number> {
  const supabase = createAdminClient();
  const token = await getUberToken(empresaId);
  if (!token) { logs.push({ tipo: 'erro', mensagem: 'Uber Eats não configurado', sucesso: false }); return 0; }

  const res = await fetch(`${UBER_API}/orders?status=PLACED,CONFIRMED`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) { logs.push({ tipo: 'erro', mensagem: `Erro ao buscar pedidos Uber: ${await res.text()}`, sucesso: false }); return 0; }

  const pedidos = await res.json();
  let criados = 0;

  for (const order of Array.isArray(pedidos) ? pedidos : []) {
    const orderId = order.id || order.orderId;
    if (!orderId) continue;

    const existe = await supabase.from('vendas').select('id').eq('empresa_id', empresaId).eq('pedido_externo_id', orderId).maybeSingle();
    if (existe) continue;

    const now = new Date().toISOString();
    const total = order.total?.orderAmount || order.payment?.total || 0;
    const clienteId = await importOrCreateCliente(supabase, empresaId, order.customer?.name, order.customer?.phone);

    const { data: venda, error: vErr } = await supabase.from('vendas').insert({
      empresa_id: empresaId,
      tipo: 'delivery',
      canal: 'uber_eats',
      status: 'pendente',
      subtotal: order.total?.subTotal || 0,
      taxa_entrega: order.deliveryFee || order.total?.deliveryFee || 0,
      total,
      forma_pagamento: 'uber_eats_online',
      pedido_externo_id: orderId,
      cliente_id: clienteId,
      nome_cliente: order.customer?.name || null,
      telefone_cliente: order.customer?.phone || null,
      entrega_logradouro: order.deliveryAddress?.street || null,
      entrega_numero: order.deliveryAddress?.streetNumber || null,
      entrega_complemento: order.deliveryAddress?.complement || null,
      entrega_bairro: order.deliveryAddress?.neighborhood || null,
      entrega_cidade: order.deliveryAddress?.city || null,
      entrega_cep: order.deliveryAddress?.zipcode || null,
      observacao: order.observations || null,
      criado_em: now,
    } as any).select('id').single();

    if (vErr) continue;

    if (order.items?.length) {
      const { items, semEstoque } = await verificarEstoqueItens(supabase, empresaId, order.items, logs);
      await supabase.from('itens_venda').insert(
        items.map((i: any) => ({
          empresa_id: empresaId,
          venda_id: venda.id,
          produto_id: i.produto_id || null,
          nome: i.productName || i.name,
          quantidade: i.quantity || 1,
          preco_unitario: i.unitPrice || 0,
          total: i.totalPrice || i.total || 0,
        }))
      );

      if (semEstoque.length > 0) {
        const msg = `⚠️ Sem estoque: ${semEstoque.join('; ')}`;
        const observacaoAtual = (order.observations || '') + `\n${msg}`;
        await supabase.from('vendas').update({ observacao: observacaoAtual }).eq('id', venda.id);
        logs.push({ tipo: 'aviso', mensagem: `Pedido ${orderId}: ${semEstoque.length} item(ns) sem estoque — ${msg}`, sucesso: true });
      }
    }

    criados++;
  }

  logs.push({ tipo: 'sucesso', mensagem: `${criados} pedidos Uber Eats importados`, sucesso: true });
  return criados;
}

// ============ Main handler ============

export async function POST(request: NextRequest) {
  try {
    const { empresaId, plataforma, tipo } = await request.json();

    if (!empresaId || !plataforma) {
      return NextResponse.json({ error: 'empresaId e plataforma são obrigatórios' }, { status: 400 });
    }

    const logs: ImportLog[] = [];
    let importados = 0, imagens = 0, pedidosCriados = 0;

    const importProducts = tipo === 'produtos' || tipo === 'ambos';
    const importOrders = tipo === 'pedidos' || tipo === 'ambos';

    if (plataforma === 'ifood' || plataforma === 'ambas') {
      if (importProducts) {
        const r = await importIFoodProducts(empresaId, logs);
        importados += r.importados;
        imagens += r.imagens;
      }
      if (importOrders) {
        pedidosCriados += await importIFoodOrders(empresaId, logs);
      }
    }

    if (plataforma === 'uber_eats' || plataforma === 'ambas') {
      if (importProducts) {
        const r = await importUberProducts(empresaId, logs);
        importados += r.importados;
        imagens += r.imagens;
      }
      if (importOrders) {
        pedidosCriados += await importUberOrders(empresaId, logs);
      }
    }

    return NextResponse.json({ sucesso: true, importados, imagens, pedidosCriados, logs });
  } catch (error) {
    return NextResponse.json({ sucesso: false, error: String(error), logs: [{ tipo: 'erro', mensagem: String(error), sucesso: false }] }, { status: 500 });
  }
}
