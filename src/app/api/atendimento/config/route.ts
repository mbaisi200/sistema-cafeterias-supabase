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
      .select('chat_ativo, chat_tempo_resposta_min')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({
      sucesso: true,
      data: data || { chat_ativo: false, chat_tempo_resposta_min: 5 }
    });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { empresa_id, chat_ativo, chat_tempo_resposta_min } = body;

    if (!empresa_id) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'empresa_id é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('empresa_delivery_config')
      .update({
        chat_ativo: chat_ativo ?? false,
        chat_tempo_resposta_min: chat_tempo_resposta_min ?? 5,
      })
      .eq('empresa_id', empresa_id);

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
