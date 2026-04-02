import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { empresaId } = await request.json();

    console.log('[API caixa-aberto] empresaId recebido:', empresaId);

    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId é obrigatório', debug: { empresaId } }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('[API caixa-aberto] Variáveis de ambiente ausentes');
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

    console.log('[API caixa-aberto] Todos os caixas no banco:', todosCaixas?.length || 0);
    if (todosCaixas) {
      todosCaixas.forEach((c: any) => {
        console.log(`  - Caixa id=${c.id?.substring(0,8)} empresa=${c.empresa_id?.substring(0,8)} status=${c.status} valor=${c.valor_atual}`);
      });
    }
    if (todosError) {
      console.error('[API caixa-aberto] Erro ao buscar todos os caixas:', todosError);
    }

    // Buscar caixa aberto para esta empresa
    const { data: caixa, error: caixaError } = await supabase
      .from('caixas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('status', 'aberto')
      .single();

    console.log('[API caixa-aberto] Resultado para empresa', empresaId?.substring(0,8) + ':', caixa ? 'ENCONTRADO id=' + caixa.id : 'NÃO ENCONTRADO', caixaError?.code || '', caixaError?.message || '');

    if (caixaError && caixaError.code !== 'PGRST116') {
      console.error('[API caixa-aberto] Erro na query:', caixaError);
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
    console.error('[API caixa-aberto] Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
