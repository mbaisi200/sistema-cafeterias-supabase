import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { empresaId } = await request.json();


    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId é obrigatório', debug: { empresaId } }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuração do servidor ausente' }, { status: 500 });
    }

    // Usar service role para bypass de RLS
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Buscar TODOS os caixas abertos (sem filtro de empresa) para debug
    const { data: todosCaixas, error: todosError } = await supabase
      .from('caixas')
      .select('id, empresa_id, status, valor_atual, aberto_em');

    if (todosCaixas) {
      todosCaixas.forEach((c: any) => {
      });
    }
    if (todosError) {
    }

    // Buscar caixa aberto para esta empresa
    // Usar .limit(1) em vez de .single() para evitar erro PGRST116 quando há múltiplos
    const { data: caixas, error: caixaError } = await supabase
      .from('caixas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('status', 'aberto')
      .order('aberto_em', { ascending: false })
      .limit(1);

    const caixa = caixas && caixas.length > 0 ? caixas[0] : null;


    if (caixaError) {
    }

    // Se há mais de 1 caixa aberto, fechar os antigos automaticamente
    if (caixas && caixas.length > 1) {
      const idsParaFechar = caixas.slice(1).map((c: any) => c.id);
      await supabase
        .from('caixas')
        .update({
          status: 'fechado',
          fechado_em: new Date().toISOString(),
          observacao_fechamento: 'Fechado automaticamente (duplicidade)',
        })
        .in('id', idsParaFechar);
    }

    // Buscar movimentações do caixa
    let movimentacoes = [];
    if (caixa) {
      const { data: movs, error: movsError } = await supabase
        .from('movimentacoes_caixa')
        .select('*')
        .eq('caixa_id', caixa.id)
        .order('criado_em', { ascending: false });

      if (!movsError && movs) {
        movimentacoes = movs;
      }
    }

    return NextResponse.json({
      caixa: caixa || null,
      movimentacoes,
      debug: {
        empresaId,
        empresaIdLength: empresaId?.length,
        caixasNoBanco: todosCaixas?.length || 0,
        caixasPorEmpresa: todosCaixas?.map((c: any) => ({
          id: c.id,
          empresa_id: c.empresa_id,
          status: c.status,
        })) || [],
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
