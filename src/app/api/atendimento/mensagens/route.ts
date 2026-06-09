import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversaId = searchParams.get('conversa_id');

    if (!conversaId) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'conversa_id é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('atendimento_mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: true });

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, data: data || [] });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { empresa_id, conversa_id, tipo, conteudo, cliente_nome, cliente_telefone, cliente_identificador } = body;

    if (!empresa_id || !conteudo) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'empresa_id e conteudo são obrigatórios' } }, { status: 400 });
    }

    let convId = conversa_id;

    if (!convId) {
      if (!cliente_identificador) {
        return NextResponse.json({ sucesso: false, erro: { mensagem: 'conversa_id ou cliente_identificador é obrigatório' } }, { status: 400 });
      }
      const { data: conv } = await supabase
        .from('atendimento_conversas')
        .insert({
          empresa_id,
          cliente_identificador,
          cliente_nome: cliente_nome || null,
          cliente_telefone: cliente_telefone || null,
        })
        .select('id')
        .single();

      if (!conv) {
        return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro ao criar conversa' } }, { status: 500 });
      }
      convId = conv.id;
    }

    const { data, error } = await supabase
      .from('atendimento_mensagens')
      .insert({
        empresa_id,
        conversa_id: convId,
        tipo: tipo || 'cliente',
        conteudo,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    await supabase
      .from('atendimento_conversas')
      .update({
        ultima_mensagem: conteudo,
        ultimo_remetente: tipo || 'cliente',
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', convId);

    return NextResponse.json({ sucesso: true, data });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
