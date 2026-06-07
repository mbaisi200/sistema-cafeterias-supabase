import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { debitarEstoqueVenda } from '@/lib/supabase';

const NOVENTA_E_NOVE_STATUS_MAP: Record<string, string> = {
  PLACED: 'aberta',
  CONFIRMED: 'em_preparo',
  IN_PREPARATION: 'em_preparo',
  READY_FOR_PICKUP: 'pronta',
  DISPATCHED: 'saiu_para_entrega',
  DELIVERED: 'entregue',
  CANCELLED: 'cancelada',
  REJECTED: 'cancelada',
};

function getMerchantIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/webhooks\/noventa-e-nove\/([^/]+)/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await createAdminClient();

    const merchantId = getMerchantIdFromPath(request.nextUrl.pathname) || body.merchant_id;

    if (!merchantId) {
      const { data: config } = await supabase
        .from('noventa_e_nove_config')
        .select('empresa_id')
        .limit(1)
        .maybeSingle();

      if (!config) {
        return NextResponse.json({ sucesso: false, erro: { codigo: 'MERCHANT_NOT_FOUND', mensagem: 'Merchant ID não encontrado' } }, { status: 404 });
      }
    }

    const { data: config } = await supabase
      .from('noventa_e_nove_config')
      .select('*')
      .eq('merchant_id', merchantId)
      .maybeSingle();

    if (!config) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'CONFIG_NOT_FOUND', mensagem: 'Configuração não encontrada para este merchant' } }, { status: 404 });
    }

    const eventType = body.eventType || body.event || body.type;

    await supabase.from('noventa_e_nove_logs').insert({
      empresa_id: config.empresa_id,
      tipo: 'webhook_recebido',
      order_id: body.orderId || body.order_id,
      detalhes: `Evento: ${eventType}`,
      dados: body,
      sucesso: true,
    });

    if (eventType === 'TEST' || eventType === 'test' || eventType === 'ping') {
      return NextResponse.json({ sucesso: true, message: 'Webhook funcionando' });
    }

    const orderId = body.orderId || body.order_id;
    if (!orderId) {
      return NextResponse.json({ sucesso: true, message: 'Evento sem orderId ignorado' });
    }

    const { data: existingOrder } = await supabase
      .from('noventa_e_nove_pedidos')
      .select('id, venda_id, ninety_nine_status')
      .eq('order_id', orderId)
      .maybeSingle();

    const status = NOVENTA_E_NOVE_STATUS_MAP[body.status || body.orderStatus || 'PLACED'] || 'aberta';

    if (existingOrder) {
      await supabase.from('noventa_e_nove_pedidos').update({
        ninety_nine_status: body.status || body.orderStatus,
        dados_completos: body,
        ultimo_sync_em: new Date().toISOString(),
      }).eq('id', existingOrder.id);

      if (existingOrder.venda_id) {
        if (['cancelada', 'cancelado'].includes(status)) {
          await supabase.from('vendas').update({ status }).eq('id', existingOrder.venda_id);
        } else {
          await supabase.from('vendas').update({ status }).eq('id', existingOrder.venda_id);
        }
      }

      return NextResponse.json({ sucesso: true, message: 'Status atualizado' });
    }

    const items = body.items || body.products || [];
    const customer = body.customer || body.client || {};
    const deliveryAddress = body.deliveryAddress || body.address || body.delivery_address || {};

    const total = body.total?.orderAmount || body.total?.total || body.total_amount || 0;
    const subtotal = body.total?.subTotal || body.subtotal || total;
    const deliveryFee = body.total?.deliveryFee || body.delivery_fee || 0;
    const desconto = body.total?.discount || body.discount || 0;

    const { data: venda, error: vendaError } = await supabase.from('vendas').insert({
      empresa_id: config.empresa_id,
      tipo: 'delivery',
      canal: 'noventa_e_nove',
      status,
      cliente_nome: customer.name || customer.nome || 'Cliente 99Food',
      nome_cliente: customer.name || customer.nome || 'Cliente 99Food',
      telefone_cliente: customer.phone || customer.telefone || '',
      subtotal,
      taxa_entrega: deliveryFee,
      total,
      forma_pagamento: '99food_online',
      criado_em: new Date().toISOString(),
      pedido_externo_id: orderId,
      entrega_logradouro: deliveryAddress.street || deliveryAddress.logradouro || '',
      entrega_numero: deliveryAddress.streetNumber || deliveryAddress.numero || '',
      entrega_complemento: deliveryAddress.complement || deliveryAddress.complemento || '',
      entrega_bairro: deliveryAddress.neighborhood || deliveryAddress.bairro || '',
      entrega_cidade: deliveryAddress.city || deliveryAddress.cidade || '',
      entrega_estado: deliveryAddress.state || deliveryAddress.estado || '',
      entrega_cep: deliveryAddress.zipcode || deliveryAddress.cep || '',
    }).select().single();

    if (vendaError) throw vendaError;

    const itensVenda = items.map((item: any) => ({
      venda_id: venda.id,
      empresa_id: config.empresa_id,
      produto_id: item.productId || item.produto_id || null,
      nome: item.productName || item.nome || item.name || 'Item 99Food',
      quantidade: item.quantity || item.quantidade || 1,
      preco_unitario: item.unitPrice || item.preco_unitario || 0,
      total: item.totalPrice || item.total || 0,
    }));

    if (itensVenda.length > 0) {
      const { error: itensError } = await supabase.from('itens_venda').insert(itensVenda);
      if (itensError) throw itensError;

      try {
        await debitarEstoqueVenda(supabase, venda.id, config.empresa_id);
      } catch (stockError) {
        console.error('Erro ao debitar estoque (99Food webhook):', stockError);
      }
    }

    await supabase.from('noventa_e_nove_pedidos').insert({
      empresa_id: config.empresa_id,
      venda_id: venda.id,
      order_id: orderId,
      display_id: body.displayId || body.display_id || '',
      customer_id: customer.id || '',
      customer_name: customer.name || customer.nome || '',
      customer_phone: customer.phone || customer.telefone || '',
      customer_email: customer.email || '',
      order_type: body.orderType || body.order_type || 'DELIVERY',
      delivery_latitude: deliveryAddress.latitude || null,
      delivery_longitude: deliveryAddress.longitude || null,
      ninety_nine_status: body.status || body.orderStatus || 'PLACED',
      dados_completos: body,
      sincronizado: true,
      ultimo_sync_em: new Date().toISOString(),
    });

    await supabase.from('noventa_e_nove_config').update({
      total_pedidos_recebidos: (config.total_pedidos_recebidos || 0) + 1,
      ultimo_pedido_em: new Date().toISOString(),
    }).eq('empresa_id', config.empresa_id);

    return NextResponse.json({ sucesso: true, message: 'Pedido processado', vendaId: venda.id });
  } catch (error: any) {
    console.error('Erro no webhook 99Food:', error);
    return NextResponse.json({ sucesso: false, erro: { codigo: 'ERRO_INTERNO', mensagem: error.message } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge') || searchParams.get('challenge');
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: 'ok', message: 'Webhook 99Food ativo' });
}
