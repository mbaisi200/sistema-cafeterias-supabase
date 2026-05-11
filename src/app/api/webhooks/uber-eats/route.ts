/**
 * Webhook Uber Eats
 * 
 * Endpoint para receber eventos do Uber Eats:
 * - Novos pedidos (order.placed)
 * - Atualizações de status (order.status_changed)
 * - Cancelamentos (order.cancelled)
 * - Testes de conexão (TEST)
 * 
 * URL: /api/webhooks/uber-eats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyWebhookSignatureAsync, processUberEatsOrder, logUberEatsEvent } from '@/services/uber-eats-service';
import type { UberEatsOrder } from '@/types/uber-eats';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const webhookBody = JSON.parse(rawBody);

    const eventType = webhookBody.eventType || webhookBody.event_type;
    const merchantUuid = webhookBody.merchantUuid || webhookBody.merchant_uuid;

    if (!merchantUuid) {
      return NextResponse.json({ sucesso: false, mensagem: 'merchantUuid não informado' }, { status: 400 });
    }

    const supabase = await createClient();

    // Buscar configuração
    const { data: config } = await supabase
      .from('uber_eats_config')
      .select('*')
      .eq('merchant_uuid', merchantUuid)
      .eq('ativo', true)
      .single();

    if (!config) {
      return NextResponse.json({ sucesso: false, mensagem: 'Configuração não encontrada ou inativa' }, { status: 404 });
    }

    const empresaId = config.empresa_id;

    // Verificar assinatura do webhook (se webhook_secret estiver configurado)
    if (config.webhook_secret) {
      const signature = request.headers.get('x-uber-eats-signature') 
        || request.headers.get('X-UBER-EATS-SIGNATURE');
      
      const isValid = await verifyWebhookSignatureAsync(rawBody, signature, config.webhook_secret);
      
      if (!isValid) {
        await logUberEatsEvent(empresaId, 'webhook_received', 'Assinatura inválida', { eventType }, undefined, undefined, false, 'Assinatura do webhook inválida');
        return NextResponse.json({ sucesso: false, mensagem: 'Assinatura inválida' }, { status: 401 });
      }
    }

    // Evento de teste
    if (eventType === 'TEST' || eventType === 'test') {
      await logUberEatsEvent(empresaId, 'webhook_received', 'Test event received', { eventType }, undefined, undefined, true);
      return NextResponse.json({ sucesso: true, mensagem: 'Webhook testado com sucesso' });
    }

    const order = webhookBody.order || webhookBody;
    const orderId = order.orderId || order.order_id;

    if (!orderId) {
      await logUberEatsEvent(empresaId, 'webhook_received', 'orderId não encontrado', { webhookBody }, undefined, undefined, false);
      return NextResponse.json({ sucesso: false, mensagem: 'orderId não encontrado' }, { status: 400 });
    }

    await logUberEatsEvent(empresaId, 'webhook_received', `Evento ${eventType} recebido`, { eventType, webhookBody }, orderId, undefined, true);

    // Novo pedido
    if (eventType === 'order.placed' || eventType === 'ORDER_PLACED') {
      const uberOrder: UberEatsOrder = {
        orderId,
        displayId: order.displayId || order.display_id,
        merchantUuid,
        customer: {
          id: order.customer?.id || '',
          name: order.customer?.name || 'Cliente Uber Eats',
          phone: order.customer?.phone || '',
          email: order.customer?.email || '',
        },
        deliveryAddress: order.deliveryAddress ? {
          street: order.deliveryAddress.street || '',
          streetNumber: order.deliveryAddress.streetNumber || '',
          city: order.deliveryAddress.city || '',
          state: order.deliveryAddress.state || '',
          zipcode: order.deliveryAddress.zipcode || '',
          neighborhood: order.deliveryAddress.neighborhood,
          complement: order.deliveryAddress.complement,
          latitude: order.deliveryAddress.latitude,
          longitude: order.deliveryAddress.longitude,
        } : undefined,
        items: (order.items || []).map((item: any) => ({
          productId: item.productId || item.externalCode || '',
          productName: item.title || item.productName || 'Produto',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.price || 0,
          totalPrice: (item.unitPrice || item.price || 0) * (item.quantity || 1),
          observations: item.observations || item.notes,
        })),
        total: {
          subTotal: order.total?.subTotal || order.subtotal || 0,
          deliveryFee: order.deliveryFee || order.delivery_fee || 0,
          discount: order.total?.discount || order.discount || 0,
          orderAmount: order.total?.orderAmount || order.total || 0,
        },
        status: 'PLACED',
        orderType: order.orderType === 'TAKEOUT' ? 'TAKEOUT' : 'DELIVERY',
        observations: order.observations,
        createdAt: new Date(order.createdAt || Date.now()),
        estimatedDeliveryTime: order.estimatedDeliveryTime || order.estimated_delivery_time,
        deliveryFee: order.deliveryFee || order.delivery_fee,
      };

      try {
        const vendaId = await processUberEatsOrder(empresaId, uberOrder, config.receber_pedidos_automatico);
        return NextResponse.json({ sucesso: true, mensagem: 'Pedido processado com sucesso', vendaId });
      } catch (error) {
        await logUberEatsEvent(empresaId, 'order_received', 'Erro ao processar pedido', { error }, orderId, undefined, false, error instanceof Error ? error.message : 'Erro desconhecido');
        throw error;
      }
    }

    // Pedido cancelado
    if (eventType === 'order.cancelled' || eventType === 'ORDER_CANCELLED') {
      const { data: pedido } = await supabase
        .from('uber_eats_pedidos')
        .select('venda_id')
        .eq('order_id', orderId)
        .single();

      if (pedido) {
        await supabase.from('vendas').update({ status: 'cancelada' }).eq('id', pedido.venda_id);
        await supabase.from('uber_eats_pedidos').update({ uber_eats_status: 'CANCELLED' }).eq('order_id', orderId);
      }

      await logUberEatsEvent(empresaId, 'order_cancelled', 'Pedido cancelado pelo Uber Eats', {}, orderId, undefined, true);
      return NextResponse.json({ sucesso: true, mensagem: 'Cancelamento processado' });
    }

    // Mudança de status
    if (eventType === 'order.status_changed' || eventType === 'ORDER_STATUS_CHANGED') {
      const newStatus = webhookBody.status || webhookBody.newStatus;
      const { data: pedido } = await supabase
        .from('uber_eats_pedidos')
        .select('venda_id')
        .eq('order_id', orderId)
        .single();

      if (pedido) {
        await supabase.from('uber_eats_pedidos').update({ uber_eats_status: newStatus }).eq('order_id', orderId);
      }

      await logUberEatsEvent(empresaId, 'order_status_changed', `Status atualizado para ${newStatus}`, { newStatus }, orderId, undefined, true);
      return NextResponse.json({ sucesso: true, mensagem: 'Status atualizado' });
    }

    // Evento não reconhecido
    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'Evento recebido mas não processado',
      eventType 
    });
  } catch (error: any) {
    console.error('Erro no webhook Uber Eats:', error);
    return NextResponse.json({ sucesso: false, erro: { codigo: 'ERRO_INTERNO', mensagem: error.message } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge') || searchParams.get('challenge');
  
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ sucesso: true, mensagem: 'Webhook Uber Eats ativo' });
}
