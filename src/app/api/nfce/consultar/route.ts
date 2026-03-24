import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API para consultar NFC-e
 * GET /api/nfce/consultar
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const nfceId = searchParams.get('nfce_id');
    const chave = searchParams.get('chave');

    if (!nfceId && !chave) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'nfce_id ou chave é obrigatório' } },
        { status: 400 }
      );
    }

    let query = supabase.from('nfce').select('*');

    if (nfceId) {
      query = query.eq('id', nfceId);
    } else if (chave) {
      query = query.eq('chave', chave);
    }

    const { data: nfce, error } = await query.single();

    if (error || !nfce) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '404', mensagem: 'NFC-e não encontrada' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      nfce: {
        ...nfce,
        data_emissao: new Date(nfce.data_emissao),
        data_saida: new Date(nfce.data_saida),
        data_autorizacao: nfce.data_autorizacao ? new Date(nfce.data_autorizacao) : null,
      },
    });

  } catch (error: any) {
    console.error('Erro ao consultar:', error);
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}
