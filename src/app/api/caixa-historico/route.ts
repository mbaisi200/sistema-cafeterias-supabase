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

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Buscar caixas fechados
    const { data: caixas, error } = await supabase
      .from('caixas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('status', 'fechado')
      .order('fechado_em', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Erro ao buscar histórico de caixas:', error);
      return NextResponse.json({ caixas: [] });
    }

    return NextResponse.json({ caixas: caixas || [] });
  } catch (error) {
    console.error('Erro na API caixa-historico:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
