import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { carrinho_id, pedido_id } = body;

    if (!carrinho_id) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'carrinho_id é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      recuperado: true,
      ultima_etapa: 'recuperado',
      atualizado_em: new Date().toISOString(),
    };

    if (pedido_id) {
      updateData.pedido_id = pedido_id;
    }

    const { error } = await supabase
      .from('carrinhos_abandonados')
      .update(updateData)
      .eq('id', carrinho_id);

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error('Erro marcar recuperado:', error);
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
