import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import secoesFallback from '@/data/manual-sistema.json';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentoId = searchParams.get('segmentoId');

    const supabase = createAdminClient();

    // Descobre quais chaves de seção estão ativas para este segmento
    let chavesAtivas: string[] | null = null;

    if (segmentoId) {
      const { data: segSecoes } = await supabase
        .from('segmento_secoes')
        .select('secao_id')
        .eq('segmento_id', segmentoId)
        .eq('ativo', true);

      if (segSecoes && segSecoes.length > 0) {
        const secaoIds = segSecoes.map((s: any) => s.secao_id);
        const { data: secoesMenu } = await supabase
          .from('secoes_menu')
          .select('chave')
          .in('id', secaoIds)
          .eq('ativo', true);

        if (secoesMenu && secoesMenu.length > 0) {
          chavesAtivas = secoesMenu.map((s: any) => s.chave);
        }
      }
    }

    // Se não tem segmento ou não achou seções ativas, mostra tudo
    if (!chavesAtivas) {
      const { data: secoes, error } = await supabase
        .from('manual_sistema')
        .select('*')
        .eq('ativo', true)
        .order('categoria')
        .order('ordem');

      if (error || !secoes || secoes.length === 0) {
        return agruparERetornar(secoesFallback);
      }
      return agruparERetornar(secoes);
    }

    // Filtra: entradas globais (NULL) + entradas com secao_chave ativa no segmento
    const orConditions = ['secao_chave.is.null'];
    for (const chave of chavesAtivas) {
      orConditions.push(`secao_chave.eq.${chave}`);
    }
    const { data: secoes, error } = await supabase
      .from('manual_sistema')
      .select('*')
      .eq('ativo', true)
      .or(orConditions.join(','))
      .order('categoria')
      .order('ordem');

    if (error || !secoes || secoes.length === 0) {
      return agruparERetornar(
        secoesFallback.filter(
          (s: any) => !s.secao_chave || chavesAtivas!.includes(s.secao_chave)
        )
      );
    }

    return agruparERetornar(secoes);
  } catch {
    return agruparERetornar(secoesFallback.filter((s: any) => !s.secao_chave));
  }
}

function agruparERetornar(secoes: any[]) {
  const categorias: Record<string, any[]> = {};
  for (const secao of secoes || []) {
    const cat = secao.categoria;
    if (!categorias[cat]) {
      categorias[cat] = [];
    }
    categorias[cat].push(secao);
  }

  return NextResponse.json({
    sucesso: true,
    data: {
      categorias: Object.entries(categorias).map(([nome, itens]) => ({
        nome,
        icone: itens[0]?.icone || 'FileText',
        itens,
      })),
      total: secoes?.length || 0,
    },
  });
}
