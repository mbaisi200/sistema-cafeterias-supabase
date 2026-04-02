import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { empresaId, caixaId, valor, formaPagamento, vendaId, descricao, usuarioId, usuarioNome } = await request.json();

    if (!empresaId || !caixaId || !vendaId) {
      return NextResponse.json({ error: 'empresaId, caixaId e vendaId são obrigatórios' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Buscar dados atuais do caixa
    const { data: caixa, error: caixaError } = await supabase
      .from('caixas')
      .select('id, valor_atual, total_vendas, total_entradas')
      .eq('id', caixaId)
      .eq('status', 'aberto')
      .single();

    if (caixaError || !caixa) {
      console.error('Erro ao buscar caixa para registrar venda:', caixaError);
      return NextResponse.json({ error: 'Caixa não encontrado ou fechado' }, { status: 404 });
    }

    // Registrar movimentação
    const { error: movError } = await supabase.from('movimentacoes_caixa').insert({
      caixa_id: caixaId,
      empresa_id: empresaId,
      tipo: 'venda',
      valor,
      forma_pagamento: formaPagamento || 'dinheiro',
      venda_id: vendaId,
      descricao: descricao || `Venda ${vendaId.substring(0, 8)}`,
      usuario_id: usuarioId || null,
      usuario_nome: usuarioNome || '',
      criado_em: new Date().toISOString(),
    });

    if (movError) {
      console.error('Erro ao registrar movimentação de venda:', movError);
    }

    // Atualizar totais do caixa
    const { error: updateError } = await supabase
      .from('caixas')
      .update({
        valor_atual: (caixa.valor_atual || 0) + valor,
        total_vendas: (caixa.total_vendas || 0) + valor,
        total_entradas: (caixa.total_entradas || 0) + valor,
      })
      .eq('id', caixaId);

    if (updateError) {
      console.error('Erro ao atualizar totais do caixa:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar caixa' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API caixa-registrar-venda:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
