import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { empresa_id, cliente_identificador, cliente_nome, cliente_telefone, cliente_email, itens, subtotal, taxa_entrega, total, tipo_pedido, cupom_codigo } = body;

    if (!empresa_id || !cliente_identificador) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'empresa_id e cliente_identificador são obrigatórios' } }, { status: 400 });
    }

    const supabase = await createClient();

    const existing = await supabase
      .from('carrinhos_abandonados')
      .select('id, lembretes_enviados')
      .eq('empresa_id', empresa_id)
      .eq('cliente_identificador', cliente_identificador)
      .eq('recuperado', false)
      .maybeSingle();

    if (existing.data) {
      const { error } = await supabase
        .from('carrinhos_abandonados')
        .update({
          cliente_nome,
          cliente_telefone: cliente_telefone || null,
          cliente_email: cliente_email || null,
          itens: JSON.stringify(itens),
          subtotal,
          taxa_entrega: taxa_entrega || 0,
          total,
          tipo_pedido: tipo_pedido || 'delivery',
          cupom_codigo: cupom_codigo || null,
          ultima_etapa: 'checkout',
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', existing.data.id);

      if (error) {
        return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
      }

      return NextResponse.json({ sucesso: true, data: { id: existing.data.id } });
    }

    const { data, error } = await supabase
      .from('carrinhos_abandonados')
      .insert({
        empresa_id,
        cliente_identificador,
        cliente_nome,
        cliente_telefone: cliente_telefone || null,
        cliente_email: cliente_email || null,
        itens: JSON.stringify(itens),
        subtotal,
        taxa_entrega: taxa_entrega || 0,
        total,
        tipo_pedido: tipo_pedido || 'delivery',
        cupom_codigo: cupom_codigo || null,
        ultima_etapa: 'checkout',
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, data: { id: data.id } });
  } catch (error) {
    console.error('Erro salvar carrinho:', error);
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
