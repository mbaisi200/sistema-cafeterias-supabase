import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
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

    const { data, error } = await supabase
      .from('atendimento_conversas')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .order('atualizado_em', { ascending: false })
      .limit(50);

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
    const body = await request.json();
    const { empresa_id, cliente_identificador, cliente_nome, cliente_telefone } = body;

    if (!empresa_id || !cliente_identificador) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'empresa_id e cliente_identificador são obrigatórios' } }, { status: 400 });
    }

    const supabase = await createClient();

    const existing = await supabase
      .from('atendimento_conversas')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('cliente_identificador', cliente_identificador)
      .eq('status', 'aberta')
      .maybeSingle();

    if (existing.data) {
      return NextResponse.json({ sucesso: true, data: existing.data });
    }

    const { data, error } = await supabase
      .from('atendimento_conversas')
      .insert({
        empresa_id,
        cliente_identificador,
        cliente_nome: cliente_nome || null,
        cliente_telefone: cliente_telefone || null,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, data: data });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
