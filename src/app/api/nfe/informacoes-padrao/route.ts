import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const tipo = searchParams.get('tipo');

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    const targetEmpresaId = empresaId || usuario?.empresa_id;
    if (!targetEmpresaId) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '403', mensagem: 'Empresa não encontrada' } }, { status: 403 });
    }

    let query = supabase
      .from('nfe_informacoes_padrao')
      .select('*')
      .eq('empresa_id', targetEmpresaId)
      .order('criado_em', { ascending: true });

    if (tipo) query = query.eq('tipo', tipo);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ sucesso: true, dados: data || [] });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const body = await request.json();
    const { empresa_id, tipo, titulo, conteudo } = body;

    if (!empresa_id || !tipo || !titulo || !conteudo) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'Campos obrigatórios: empresa_id, tipo, titulo, conteudo' } }, { status: 400 });
    }

    if (!['complementares', 'fisco'].includes(tipo)) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'Tipo deve ser complementares ou fisco' } }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('nfe_informacoes_padrao')
      .insert({ empresa_id, tipo, titulo, conteudo })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ sucesso: true, dado: data });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const body = await request.json();
    const { id, titulo, conteudo, ativo } = body;

    if (!id) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'id é obrigatório' } }, { status: 400 });
    }

    const updateData: any = { atualizado_em: new Date().toISOString() };
    if (titulo !== undefined) updateData.titulo = titulo;
    if (conteudo !== undefined) updateData.conteudo = conteudo;
    if (ativo !== undefined) updateData.ativo = ativo;

    const { data, error } = await supabase
      .from('nfe_informacoes_padrao')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ sucesso: true, dado: data });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'id é obrigatório' } }, { status: 400 });
    }

    const { error } = await supabase.from('nfe_informacoes_padrao').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ sucesso: true });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
