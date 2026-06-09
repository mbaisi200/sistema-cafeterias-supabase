import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { status: novoStatus } = await request.json();

    if (!novoStatus || !['pendente', 'em_preparacao', 'pronto', 'entregue'].includes(novoStatus)) {
      return NextResponse.json({
        sucesso: false,
        erro: { mensagem: 'Status inválido. Use: pendente, em_preparacao, pronto, entregue' }
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('itens_venda')
      .update({ kds_status: novoStatus })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar item KDS:', error);
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro ao atualizar item' } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error('Erro KDS update:', error);
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
