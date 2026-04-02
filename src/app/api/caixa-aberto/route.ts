import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { empresaId } = await request.json();

    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId é obrigatório' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Usar service role para bypass de RLS
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Buscar caixa aberto
    const { data: caixa, error: caixaError } = await supabase
      .from('caixas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('status', 'aberto')
      .single();

    if (caixaError && caixaError.code !== 'PGRST116') {
      console.error('Erro ao buscar caixa aberto:', caixaError);
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
    });
  } catch (error) {
    console.error('Erro na API caixa-aberto:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
