import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const body = await request.json();
    const { empresa_id, cliente_id, recompensa_id, venda_id } = body;

    if (!empresa_id || !cliente_id || !recompensa_id) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'Campos obrigatórios: empresa_id, cliente_id, recompensa_id' } }, { status: 400 });
    }

    const { data: recompensa, error: recError } = await supabase
      .from('fidelidade_recompensas')
      .select('*')
      .eq('id', recompensa_id)
      .eq('empresa_id', empresa_id)
      .eq('ativo', true)
      .single();

    if (recError || !recompensa) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '404', mensagem: 'Recompensa não encontrada ou inativa' } }, { status: 404 });
    }

    const { data: cliente, error: cliError } = await supabase
      .from('fidelidade_clientes')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('cliente_id', cliente_id)
      .single();

    if (cliError || !cliente) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '404', mensagem: 'Cliente não encontrado no programa' } }, { status: 404 });
    }

    const modelo = recompensa.modelo;
    let saldoAtual = 0;
    let debitado = 0;

    if (modelo === 'pontos') {
      saldoAtual = (cliente.pontos_acumulados || 0) - (cliente.pontos_resgatados || 0) - (cliente.pontos_expirados || 0);
      debitado = recompensa.custo_acao;
      if (saldoAtual < debitado) {
        return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: `Saldo insuficiente. Você tem ${saldoAtual} pontos, precisa de ${debitado}` } }, { status: 400 });
      }
      await supabase.from('fidelidade_clientes').update({
        pontos_resgatados: (cliente.pontos_resgatados || 0) + debitado,
        atualizado_em: new Date().toISOString(),
      }).eq('id', cliente.id);
    } else if (modelo === 'selos') {
      saldoAtual = cliente.selos_atual || 0;
      debitado = recompensa.custo_acao;
      if (saldoAtual < debitado) {
        return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: `Selos insuficientes. Você tem ${saldoAtual}, precisa de ${debitado}` } }, { status: 400 });
      }
      await supabase.from('fidelidade_clientes').update({
        selos_atual: saldoAtual - debitado,
        atualizado_em: new Date().toISOString(),
      }).eq('id', cliente.id);
    } else if (modelo === 'visitas') {
      saldoAtual = cliente.visitas_total || 0;
      debitado = recompensa.custo_acao;
      if (saldoAtual < debitado) {
        return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: `Visitas insuficientes. Você tem ${saldoAtual}, precisa de ${debitado}` } }, { status: 400 });
      }
    } else if (modelo === 'cashback') {
      saldoAtual = Number(cliente.cashback_disponivel || 0);
      debitado = recompensa.custo_acao;
      if (saldoAtual < debitado) {
        return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: `Cashback insuficiente. Você tem R$ ${saldoAtual.toFixed(2)}, precisa de R$ ${debitado.toFixed(2)}` } }, { status: 400 });
      }
      await supabase.from('fidelidade_clientes').update({
        cashback_disponivel: saldoAtual - debitado,
        atualizado_em: new Date().toISOString(),
      }).eq('id', cliente.id);
    }

    const transacaoBody: Record<string, any> = {
      empresa_id,
      cliente_id,
      tipo: 'resgate',
      modelo,
      recompensa_tipo: recompensa.tipo,
      recompensa_valor: recompensa.valor_desconto || 0,
      recompensa_produto_id: recompensa.produto_id,
      recompensa_descricao: recompensa.descricao,
      venda_id: venda_id || null,
      criado_em: new Date().toISOString(),
    };

    if (modelo === 'pontos') transacaoBody.pontos_gerados = -debitado;
    if (modelo === 'cashback') transacaoBody.cashback_gerado = -debitado;

    const { error: transError } = await supabase
      .from('fidelidade_transacoes')
      .insert(transacaoBody);
    if (transError) throw transError;

    return NextResponse.json({
      sucesso: true,
      recompensa_aplicada: {
        descricao: recompensa.descricao,
        tipo: recompensa.tipo,
        valor: recompensa.valor_desconto || 0,
        produto_id: recompensa.produto_id,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
