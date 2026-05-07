/**
 * Webhook iFood
 * 
 * Endpoint para receber eventos do iFood:
 * - Novos pedidos
 * - Atualizações de status
 * - Testes de conexão
 * 
 * URL: /api/webhooks/ifood
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { 
  IFoodWebhookEvent, 
  IFoodOrder, 
  IFoodOrderStatusUpdate,
} from '@/types/ifood';

// Verificar assinatura do webhook (quando implementado pelo iFood)
function verifyWebhookSignature(request: NextRequest): boolean {
  // TODO: Implementar verificação de assinatura quando o iFood disponibilizar
  return true;
}

// Handler para POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    

    // Verificar assinatura
    if (!verifyWebhookSignature(request)) {
      return NextResponse.json(
        { error: 'Assinatura inválida' },
        { status: 401 }
      );
    }

    const event = body as IFoodWebhookEvent;

    // Processar baseado no tipo de evento
    switch (event.event) {
      case 'ORDER_PLACED':
      case 'ORDER_CREATED':
        return await handleNewOrder(event.data as IFoodOrder);
      
      case 'ORDER_STATUS_CHANGED':
      case 'ORDER_UPDATED':
        return await handleStatusUpdate(event.data as IFoodOrderStatusUpdate);
      
      case 'TEST':
        return await handleTestEvent(event.data as { test: boolean; message?: string });
      
      default:
        return NextResponse.json({ 
          received: true, 
          message: 'Evento recebido mas não processado' 
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Handler para novos pedidos
async function handleNewOrder(order: IFoodOrder) {
  try {

    const supabase = createAdminClient();

    // Buscar configuração pelo merchantId
    const { data: config, error: configError } = await supabase
      .from('delivery_config')
      .select('empresa_id')
      .eq('ifood_merchant_id', order.merchantId)
      .eq('ifood_ativo', true)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Merchant não encontrado' },
        { status: 404 }
      );
    }

    const empresaId = config.empresa_id;

    // Criar venda a partir do pedido iFood
    const { data: venda, error: vendaError } = await supabase
      .from('vendas')
      .insert({
        empresa_id: empresaId,
        tipo: 'delivery',
        canal: 'ifood',
        status: 'aberta',
        pedido_externo_id: order.orderId,
        nome_cliente: order.customer?.name,
        telefone_cliente: order.customer?.phone,
        entrega_logradouro: order.delivery?.address?.street,
        entrega_numero: order.delivery?.address?.number,
        entrega_complemento: order.delivery?.address?.complement,
        entrega_bairro: order.delivery?.address?.neighborhood,
        entrega_cidade: order.delivery?.address?.city,
        entrega_estado: order.delivery?.address?.state,
        entrega_cep: order.delivery?.address?.postalCode,
        taxa_entrega: order.delivery?.deliveryFee || 0,
        subtotal: order.total?.subtotal || 0,
        total: order.total?.total || 0,
        forma_pagamento: order.payments?.[0]?.method || 'ifood_online',
      })
      .select()
      .single();

    if (vendaError) throw vendaError;

    // Criar itens da venda
    if (order.items && order.items.length > 0) {
      const itens = order.items.map(item => ({
        empresa_id: empresaId,
        venda_id: venda.id,
        nome: item.name,
        quantidade: item.quantity,
        preco_unitario: item.unitPrice,
        total: item.totalPrice,
        observacao: item.observations,
      }));

      await supabase.from('itens_venda').insert(itens);
    }

    // Registrar log
    await supabase.from('logs').insert({
      empresa_id: empresaId,
      acao: 'pedido_ifood_recebido',
      detalhes: `Pedido ${order.orderId} recebido do iFood`,
      tipo: 'venda',
      dados_novos: order,
    });


    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      vendaId: venda.id,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Erro ao processar pedido' },
      { status: 500 }
    );
  }
}

// Handler para atualizações de status
async function handleStatusUpdate(update: IFoodOrderStatusUpdate) {
  try {

    const supabase = createAdminClient();

    // Buscar venda pelo pedido externo
    const { data: venda } = await supabase
      .from('vendas')
      .select('id, empresa_id')
      .eq('pedido_externo_id', update.orderId)
      .single();

    if (venda) {
      // Atualizar status
      const statusMap: Record<string, string> = {
        'PLACED': 'aberta',
        'CONFIRMED': 'aberta',
        'PREPARATION_STARTED': 'aberta',
        'READY_FOR_PICKUP': 'aberta',
        'DISPATCHED': 'aberta',
        'DELIVERED': 'fechada',
        'CANCELLED': 'cancelada',
      };

      await supabase
        .from('vendas')
        .update({ status: statusMap[update.status] || 'aberta' })
        .eq('id', venda.id);

      // Registrar log
      await supabase.from('logs').insert({
        empresa_id: venda.empresa_id,
        acao: 'pedido_ifood_status',
        detalhes: `Status do pedido ${update.orderId} atualizado para ${update.status}`,
        tipo: 'venda',
      });
    }

    return NextResponse.json({
      success: true,
      orderId: update.orderId,
      newStatus: update.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao atualizar status' },
      { status: 500 }
    );
  }
}

// Handler para eventos de teste
async function handleTestEvent(data: { test: boolean; message?: string }) {
  
  return NextResponse.json({
    success: true,
    message: 'Webhook funcionando corretamente',
    timestamp: new Date().toISOString(),
  });
}

// Handler para GET (verificação de saúde)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'iFood Webhook',
    timestamp: new Date().toISOString(),
  });
}
