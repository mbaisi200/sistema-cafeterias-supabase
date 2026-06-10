import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import secoesFallback from '@/data/manual-sistema.json';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: secoes, error } = await supabase
      .from('manual_sistema')
      .select('*')
      .eq('ativo', true)
      .order('categoria')
      .order('ordem');

    if (error || !secoes || secoes.length === 0) {
      // Fallback: usar dados do JSON embutido
      return agruparERetornar(secoesFallback);
    }

    return agruparERetornar(secoes);
  } catch {
    // Fallback total: usar dados do JSON
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
