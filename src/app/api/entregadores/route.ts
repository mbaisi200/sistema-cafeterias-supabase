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
      .from('entregadores')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .order('nome');

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

    if (!body.nome?.trim()) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Nome é obrigatório' } }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('entregadores')
      .insert({
        empresa_id: usuario.empresa_id,
        nome: body.nome.trim(),
        telefone: body.telefone?.replace(/\D/g, '') || null,
        cpf: body.cpf?.replace(/\D/g, '') || null,
        veiculo: body.veiculo || 'moto',
        placa: body.placa || null,
        observacao: body.observacao || null,
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

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'ID é obrigatório' } }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.nome) updateData.nome = body.nome.trim();
    if (body.telefone !== undefined) updateData.telefone = body.telefone?.replace(/\D/g, '') || null;
    if (body.cpf !== undefined) updateData.cpf = body.cpf?.replace(/\D/g, '') || null;
    if (body.veiculo) updateData.veiculo = body.veiculo;
    if (body.placa !== undefined) updateData.placa = body.placa || null;
    if (body.ativo !== undefined) updateData.ativo = body.ativo;
    if (body.observacao !== undefined) updateData.observacao = body.observacao || null;

    const { error } = await supabase
      .from('entregadores')
      .update(updateData)
      .eq('id', body.id);

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'ID é obrigatório' } }, { status: 400 });
    }

    const { error } = await supabase
      .from('entregadores')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
