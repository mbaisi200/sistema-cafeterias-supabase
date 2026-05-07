import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { empresaId, valorInicial, observacao, usuarioId, usuarioNome } = await request.json();

    if (!empresaId || usuarioId == null) {
      return NextResponse.json({ error: 'empresaId e usuarioId são obrigatórios' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar se já existe caixa aberto
    const { data: caixaExistente } = await supabase
      .from('caixas')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('status', 'aberto')
      .single();

    if (caixaExistente) {
      return NextResponse.json({ error: 'Já existe um caixa aberto', caixaId: caixaExistente.id }, { status: 409 });
    }

    // Inserir caixa
    const { data: caixa, error: caixaError } = await supabase
      .from('caixas')
      .insert({
        empresa_id: empresaId,
        valor_inicial: valorInicial || 0,
        valor_atual: valorInicial || 0,
        total_entradas: 0,
        total_saidas: 0,
        total_vendas: 0,
        status: 'aberto',
        aberto_por: usuarioId,
        aberto_por_nome: usuarioNome || '',
        observacao_abertura: observacao || '',
      })
      .select()
      .single();

    if (caixaError) {
      return NextResponse.json({ error: caixaError.message }, { status: 500 });
    }

    // Registrar movimentação de abertura
    await supabase.from('movimentacoes_caixa').insert({
      caixa_id: caixa.id,
      empresa_id: empresaId,
      tipo: 'abertura',
      valor: valorInicial || 0,
      forma_pagamento: 'dinheiro',
      descricao: 'Abertura de caixa',
      usuario_id: usuarioId,
      usuario_nome: usuarioNome || '',
    });

    return NextResponse.json({ caixa });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
