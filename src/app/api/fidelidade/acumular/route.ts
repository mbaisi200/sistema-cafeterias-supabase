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
    const { empresa_id, cliente_id, venda_id, valor_compra } = body;

    if (!empresa_id || !cliente_id || !valor_compra) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'Campos obrigatórios: empresa_id, cliente_id, valor_compra' } }, { status: 400 });
    }

    const { data: programa } = await supabase
      .from('programas_fidelidade')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('ativo', true)
      .maybeSingle();

    if (!programa) {
      return NextResponse.json({ sucesso: true, ignorado: true, mensagem: 'Programa de fidelidade não está ativo' });
    }

    const regras = typeof programa.regras === 'string' ? JSON.parse(programa.regras) : (programa.regras || {});
    const modelo = programa.modelo;

    const { data: fidelidadeCliente } = await supabase
      .from('fidelidade_clientes')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('cliente_id', cliente_id)
      .maybeSingle();

    const agora = new Date().toISOString();
    const acumulos: Record<string, any> = {};
    const transacao: Record<string, any> = {
      empresa_id,
      cliente_id,
      tipo: 'acumulo',
      modelo,
      valor_compra,
      venda_id: venda_id || null,
      criado_em: agora,
    };

    if (modelo === 'pontos') {
      const valorPara1Ponto = regras.valor_para_1_ponto || 1;
      const pontos = Math.floor(valor_compra / valorPara1Ponto);
      transacao.pontos_gerados = pontos;
      acumulos.pontos_acumulados = (fidelidadeCliente?.pontos_acumulados || 0) + pontos;
    } else if (modelo === 'selos') {
      const selos = 1;
      transacao.selos_gerados = selos;
      const novoAtual = (fidelidadeCliente?.selos_atual || 0) + selos;
      acumulos.selos_atual = novoAtual;
      acumulos.selos_total = (fidelidadeCliente?.selos_total || 0) + selos;
    } else if (modelo === 'visitas') {
      acumulos.visitas_total = (fidelidadeCliente?.visitas_total || 0) + 1;
    } else if (modelo === 'cashback') {
      const percentual = (regras.percentual || 5) / 100;
      const cashback = valor_compra * percentual;
      transacao.cashback_gerado = cashback;
      acumulos.cashback_disponivel = (fidelidadeCliente?.cashback_disponivel || 0) + cashback;
      acumulos.cashback_total = (fidelidadeCliente?.cashback_total || 0) + cashback;
    }

    acumulos.total_gasto = (fidelidadeCliente?.total_gasto || 0) + valor_compra;
    acumulos.ultima_visita = agora;
    acumulos.atualizado_em = agora;

    if (fidelidadeCliente) {
      const { error: updateError } = await supabase
        .from('fidelidade_clientes')
        .update(acumulos)
        .eq('id', fidelidadeCliente.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('fidelidade_clientes')
        .insert({
          empresa_id,
          cliente_id,
          ...acumulos,
          criado_em: agora,
        });
      if (insertError) throw insertError;
    }

    const { error: transError } = await supabase
      .from('fidelidade_transacoes')
      .insert(transacao);
    if (transError) throw transError;

    return NextResponse.json({ sucesso: true, modelo, acumulos });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
