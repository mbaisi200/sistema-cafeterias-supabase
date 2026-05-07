import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { empresaId } = await request.json();
    if (!empresaId) {
      return NextResponse.json({ sucesso: false, erro: 'empresaId obrigatório' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Deletar nfe_importadas (CASCADE remove estoque_movimentos e contas vinculados)
    const { data: nfeRemovidas, error: errNfe } = await supabase
      .from('nfe_importadas')
      .delete()
      .eq('empresa_id', empresaId)
      .select('id');

    if (errNfe) throw errNfe;

    // 2. Deletar fornecedores
    const { data: fornRemovidos, error: errForn } = await supabase
      .from('fornecedores')
      .delete()
      .eq('empresa_id', empresaId)
      .select('id');

    if (errForn) throw errForn;

    return NextResponse.json({
      sucesso: true,
      nfe_removidas: nfeRemovidas?.length || 0,
      fornecedores_removidos: fornRemovidos?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: 500 }
    );
  }
}
