import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tipo, custo_acao, descricao, valor_desconto, produto_id, ativo } = body;

    const updateData: any = { atualizado_em: new Date().toISOString() };
    if (tipo !== undefined) updateData.tipo = tipo;
    if (custo_acao !== undefined) updateData.custo_acao = custo_acao;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (valor_desconto !== undefined) updateData.valor_desconto = valor_desconto;
    if (produto_id !== undefined) updateData.produto_id = produto_id;
    if (ativo !== undefined) updateData.ativo = ativo;

    const { data, error } = await supabase
      .from('fidelidade_recompensas')
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { id } = await params;

    // Check if any fidelidade_transacoes reference this recompensa
    const { count } = await supabase
      .from('fidelidade_transacoes')
      .select('*', { count: 'exact', head: true })
      .eq('recompensa_id', id);

    if (count && count > 0) {
      // Referenced by transacoes → soft-delete
      const { error } = await supabase
        .from('fidelidade_recompensas')
        .update({ ativo: false })
        .eq('id', id);
      if (error) throw error;

      return NextResponse.json({ sucesso: true, message: 'Recompensa inativada (referenciada por transações)' });
    }

    // No references → hard-delete
    const { error } = await supabase.from('fidelidade_recompensas').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ sucesso: true });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
