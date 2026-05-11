import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    if (!empresaId) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'EMPRESA_ID_REQUIRED', mensagem: 'empresaId é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('uber_eats_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) throw error;

    const config = data ? {
      id: data.id,
      empresaId: data.empresa_id,
      ativo: data.ativo,
      status: data.status,
      clientId: data.client_id || '',
      clientSecret: data.client_secret || '',
      merchantUuid: data.merchant_uuid || '',
      sincronizarProdutos: data.sincronizar_produtos ?? true,
      sincronizarEstoque: data.sincronizar_estoque ?? true,
      sincronizarPrecos: data.sincronizar_precos ?? true,
      receberPedidosAutomatico: data.receber_pedidos_automatico ?? true,
      tempoPreparoPadrao: data.tempo_preparo_padrao ?? 30,
      webhookSecret: data.webhook_secret || '',
      totalPedidosRecebidos: data.total_pedidos_recebidos ?? 0,
      ultimoPedidoEm: data.ultimo_pedido_em,
      ultimoErro: data.ultimo_erro,
      ultimoErroEm: data.ultimo_erro_em,
      criadoEm: data.criado_em,
      atualizadoEm: data.atualizado_em,
    } : null;

    return NextResponse.json({ sucesso: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: 'ERRO_INTERNO', mensagem: error.message } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresaId, ...config } = body;
    if (!empresaId) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'EMPRESA_ID_REQUIRED', mensagem: 'empresaId é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();
    const upsertData: any = {
      empresa_id: empresaId,
      ativo: config.ativo ?? false,
      status: config.status || 'disconnected',
      client_id: config.clientId || null,
      client_secret: config.clientSecret || null,
      merchant_uuid: config.merchantUuid || null,
      sincronizar_produtos: config.sincronizarProdutos ?? true,
      sincronizar_estoque: config.sincronizarEstoque ?? true,
      sincronizar_precos: config.sincronizarPrecos ?? true,
      receber_pedidos_automatico: config.receberPedidosAutomatico ?? true,
      tempo_preparo_padrao: config.tempoPreparoPadrao ?? 30,
      webhook_secret: config.webhookSecret || null,
    };

    const { data, error } = await supabase
      .from('uber_eats_config')
      .upsert(upsertData, { onConflict: 'empresa_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ sucesso: true, data });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: 'ERRO_INTERNO', mensagem: error.message } }, { status: 500 });
  }
}
