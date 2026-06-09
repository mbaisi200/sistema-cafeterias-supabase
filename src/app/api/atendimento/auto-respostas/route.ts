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
      .from('atendimento_auto_respostas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('ordem');

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!usuario) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Usuário não encontrado' } }, { status: 404 });
    }

    const body = await request.json();

    if (!body.palavra_chave?.trim() || !body.resposta?.trim()) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'palavra_chave e resposta são obrigatórios' } }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('atendimento_auto_respostas')
      .insert({
        empresa_id: usuario.empresa_id,
        palavra_chave: body.palavra_chave.trim().toLowerCase(),
        resposta: body.resposta.trim(),
        ordem: body.ordem || 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, data });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
