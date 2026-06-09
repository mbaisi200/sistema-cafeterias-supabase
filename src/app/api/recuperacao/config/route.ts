import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');

    if (!empresaId) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'empresa_id é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('empresa_delivery_config')
      .select('recuperacao_ativa, recuperacao_tempo_minutos, recuperacao_desconto_percentual, recuperacao_mensagem')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({
      sucesso: true,
      data: data || {
        recuperacao_ativa: false,
        recuperacao_tempo_minutos: 30,
        recuperacao_desconto_percentual: null,
        recuperacao_mensagem: 'Olá {nome}! 😊 Vimos que você deixou um carrinho no nosso cardápio online. Seu pedido de {total} ainda está esperando! Quer finalizar? 🚀',
      }
    });
  } catch (error) {
    console.error('Erro config recuperacao:', error);
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { empresa_id, recuperacao_ativa, recuperacao_tempo_minutos, recuperacao_desconto_percentual, recuperacao_mensagem } = body;

    if (!empresa_id) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'empresa_id é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('empresa_delivery_config')
      .update({
        recuperacao_ativa,
        recuperacao_tempo_minutos: recuperacao_tempo_minutos || 30,
        recuperacao_desconto_percentual: recuperacao_desconto_percentual || null,
        recuperacao_mensagem: recuperacao_mensagem || null,
      })
      .eq('empresa_id', empresa_id);

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error('Erro atualizar config:', error);
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
