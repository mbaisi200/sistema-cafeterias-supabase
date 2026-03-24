import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API para cancelar NFC-e
 * POST /api/nfce/cancelar
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nfce_id, justificativa } = body;

    if (!nfce_id || !justificativa) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'nfce_id e justificativa são obrigatórios' } },
        { status: 400 }
      );
    }

    // Buscar NFC-e
    const { data: nfce, error: nfceError } = await supabase
      .from('nfce')
      .select('*')
      .eq('id', nfce_id)
      .single();

    if (nfceError || !nfce) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '404', mensagem: 'NFC-e não encontrada' } },
        { status: 404 }
      );
    }

    if (nfce.status !== 'autorizada') {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'Apenas NFC-es autorizadas podem ser canceladas' } },
        { status: 400 }
      );
    }

    // TODO: Enviar evento de cancelamento para SEFAZ
    // Por ora, apenas atualiza o status localmente

    const { error: updateError } = await supabase
      .from('nfce')
      .update({
        status: 'cancelada',
        motivo_cancelamento: justificativa,
        data_cancelamento: new Date().toISOString(),
      })
      .eq('id', nfce_id);

    if (updateError) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'DB001', mensagem: 'Erro ao cancelar NFC-e' } },
        { status: 500 }
      );
    }

    // Registrar evento
    await supabase
      .from('nfce_eventos')
      .insert({
        nfce_id,
        empresa_id: nfce.empresa_id,
        tipo: 'cancelamento',
        codigo_tipo: '110111',
        descricao_tipo: 'Cancelamento',
        sequencial: 1,
        data_evento: new Date().toISOString(),
        status: 'autorizado',
        dados_adicionais: { justificativa },
      });

    return NextResponse.json({
      sucesso: true,
      mensagem: 'NFC-e cancelada com sucesso',
    });

  } catch (error: any) {
    console.error('Erro ao cancelar:', error);
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}
