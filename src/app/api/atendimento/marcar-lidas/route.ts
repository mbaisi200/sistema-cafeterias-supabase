import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversa_id } = body;

    if (!conversa_id) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'conversa_id é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('atendimento_mensagens')
      .update({ lida: true })
      .eq('conversa_id', conversa_id)
      .eq('lida', false);

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
