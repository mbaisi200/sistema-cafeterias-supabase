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
    const clienteId = searchParams.get('cliente_id');

    if (!empresaId || !clienteId) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'empresa_id e cliente_id são obrigatórios' } }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('fidelidade_clientes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (error) throw error;

    const { data: programa } = await supabase
      .from('programas_fidelidade')
      .select('modelo, regras')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .maybeSingle();

    const regras = programa?.regras || {};
    let progresso = 0;
    let meta = 0;
    let saldo_descricao = '';

    if (programa?.modelo === 'pontos') {
      const pontosDisponiveis = (data?.pontos_acumulados || 0) - (data?.pontos_resgatados || 0) - (data?.pontos_expirados || 0);
      saldo_descricao = `${pontosDisponiveis} pontos`;
    } else if (programa?.modelo === 'selos') {
      meta = regras.selos_necessarios || 10;
      progresso = data?.selos_atual || 0;
      saldo_descricao = `${progresso}/${meta} selos`;
    } else if (programa?.modelo === 'visitas') {
      meta = regras.visitas_necessarias || 5;
      progresso = data?.visitas_total || 0;
      saldo_descricao = `${progresso} visitas`;
    } else if (programa?.modelo === 'cashback') {
      saldo_descricao = `R$ ${(data?.cashback_disponivel || 0).toFixed(2)}`;
    }

    return NextResponse.json({
      sucesso: true,
      dado: data || null,
      programa: programa || null,
      saldo_descricao,
      progresso,
      meta,
    });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
