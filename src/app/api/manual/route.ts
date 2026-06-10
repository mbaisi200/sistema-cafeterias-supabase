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

    // Busca TODAS as entradas ativas (poucas ~70), filtra no servidor
    const { data: secoes, error } = await supabase
      .from('manual_sistema')
      .select('*')
      .eq('ativo', true)
      .order('categoria')
      .order('ordem');

    const entradas = (error || !secoes || secoes.length === 0)
      ? secoesFallback
      : secoes;

    // Filtra: globais (secao_chave NULL) + específicas ativas no segmento
    const filtradas = (!chavesAtivas)
      ? entradas
      : entradas.filter((s: any) => !s.secao_chave || chavesAtivas!.includes(s.secao_chave));

    return agruparERetornar(filtradas);
  } catch {
    return agruparERetornar(secoesFallback);
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
