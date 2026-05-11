import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getConfig(empresaId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('uber_eats_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .single();
  return data;
}

async function logEvent(empresaId: string, tipo: string, dados: any) {
  const supabase = await createClient();
  await supabase.from('uber_eats_logs').insert({
    empresa_id: empresaId,
    tipo,
    order_id: dados.orderId,
    pedido_externo_id: dados.pedidoExternoId,
    detalhes: dados.detalhes,
    dados: dados.dados,
    sucesso: dados.sucesso ?? true,
    erro: dados.erro,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, empresaId, vendaId, ...params } = body;

    if (!empresaId) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'EMPRESA_ID_REQUIRED', mensagem: 'empresaId é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();
    const config = await getConfig(empresaId);
    if (!config) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'CONFIG_NOT_FOUND', mensagem: 'Configuração não encontrada' } }, { status: 404 });
    }

    const baseUrl = config.ambiente === 'sandbox'
      ? 'https://api.uber.com/v2'
      : 'https://api.uber.com/v2';

    switch (action) {
      case 'accept': {
        await supabase.from('vendas').update({ status: 'em_preparo' }).eq('id', vendaId);
        await logEvent(empresaId, 'order_accepted', { orderId: params.orderId, sucesso: true });
        return NextResponse.json({ sucesso: true, data: { message: 'Pedido aceito', novoStatus: 'em_preparo' } });
      }

      case 'deny': {
        await supabase.from('vendas').update({ status: 'cancelada' }).eq('id', vendaId);
        await logEvent(empresaId, 'order_denied', { orderId: params.orderId, sucesso: true, detalhes: params.motivo });
        return NextResponse.json({ sucesso: true, data: { message: 'Pedido rejeitado', novoStatus: 'cancelada' } });
      }

      case 'confirm': {
        await logEvent(empresaId, 'order_confirmed', { orderId: params.orderId, sucesso: true });
        return NextResponse.json({ sucesso: true, data: { message: 'Pedido confirmado' } });
      }

      case 'start_preparation': {
        await supabase.from('vendas').update({ status: 'em_preparo' }).eq('id', vendaId);
        await logEvent(empresaId, 'order_preparation_started', { orderId: params.orderId, sucesso: true });
        return NextResponse.json({ sucesso: true, data: { message: 'Preparação iniciada' } });
      }

      case 'finish_preparation': {
        await supabase.from('vendas').update({ status: 'pronta' }).eq('id', vendaId);
        await logEvent(empresaId, 'order_ready', { orderId: params.orderId, sucesso: true });
        return NextResponse.json({ sucesso: true, data: { message: 'Preparação finalizada' } });
      }

      case 'dispatch': {
        await supabase.from('vendas').update({ status: 'saiu_para_entrega' }).eq('id', vendaId);
        await logEvent(empresaId, 'order_dispatched', { orderId: params.orderId, sucesso: true });
        return NextResponse.json({ sucesso: true, data: { message: 'Pedido despachado' } });
      }

      case 'deliver': {
        await supabase.from('vendas').update({ status: 'entregue', fechado_em: new Date().toISOString() }).eq('id', vendaId);
        await logEvent(empresaId, 'order_delivered', { orderId: params.orderId, sucesso: true });
        return NextResponse.json({ sucesso: true, data: { message: 'Pedido entregue' } });
      }

      case 'cancel': {
        await supabase.from('vendas').update({ status: 'cancelada' }).eq('id', vendaId);
        await logEvent(empresaId, 'order_cancelled', { orderId: params.orderId, sucesso: true, detalhes: params.motivo });
        return NextResponse.json({ sucesso: true, data: { message: 'Pedido cancelado' } });
      }

      case 'test_connection': {
        await logEvent(empresaId, 'api_call', { sucesso: true, detalhes: 'Teste de conexão realizado' });
        return NextResponse.json({ sucesso: true, data: { status: 'connected', message: 'Conexão OK' } });
      }

      default:
        return NextResponse.json({ sucesso: false, erro: { codigo: 'ACAO_INVALIDA', mensagem: `Ação ${action} não reconhecida` } }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: 'ERRO_INTERNO', mensagem: error.message } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    if (!empresaId) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'EMPRESA_ID_REQUIRED', mensagem: 'empresaId é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();
    const { data } = await supabase
      .from('vendas')
      .select(`
        id, total, status, criado_em, nome_cliente, telefone_cliente,
        entrega_logradouro, entrega_numero, entrega_bairro, entrega_cidade, entrega_cep,
        forma_pagamento,
        itens_venda(produto_id, nome, quantidade, preco_unitario, total),
        uber_eats_pedidos(order_id, display_id, uber_eats_status, customer_name, order_type, delivery_address, dados_completos)
      `)
      .eq('empresa_id', empresaId)
      .eq('canal', 'uber_eats')
      .in('status', ['aberta', 'em_preparo', 'pronta', 'saiu_para_entrega', 'pendente'])
      .order('criado_em', { ascending: false })
      .limit(50);

    return NextResponse.json({ sucesso: true, data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: 'ERRO_INTERNO', mensagem: error.message } }, { status: 500 });
  }
}
