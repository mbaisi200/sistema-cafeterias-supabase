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

    if (!empresaId) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'empresa_id é obrigatório' } }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('fidelidade_recompensas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('criado_em', { ascending: true });

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
    const { empresa_id, modelo, tipo, custo_acao, descricao, valor_desconto, produto_id } = body;

    if (!empresa_id || !modelo || !tipo || !custo_acao || !descricao) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'Campos obrigatórios: empresa_id, modelo, tipo, custo_acao, descricao' } }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('fidelidade_recompensas')
      .insert({
        empresa_id, modelo, tipo, custo_acao, descricao,
        valor_desconto: valor_desconto || null,
        produto_id: produto_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ sucesso: true, dado: data });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
