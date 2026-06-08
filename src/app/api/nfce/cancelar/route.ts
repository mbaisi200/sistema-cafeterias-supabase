import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cancelarVendaCompleta } from '@/lib/vendas-cancelar';

/**
 * API para cancelar NFC-e com estorno de estoque
 * POST /api/nfce/cancelar
 * 
 * Conforme legislação brasileira (art. 54 §4º do CONFAZ):
 * - NFC-e autorizada pode ser cancelada em até 24h (ou antes da próxima transmissão)
 * - O cancelamento requer justificativa e protocolo SEFAZ
 * - Estoques devem ser estornados
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

    // Verificar prazo legal (24h para cancelamento)
    const dataEmissao = new Date(nfce.data_emissao);
    const agora = new Date();
    const diffHoras = (agora.getTime() - dataEmissao.getTime()) / (1000 * 60 * 60);
    if (diffHoras > 24) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'PRAZO001', mensagem: 'Prazo legal de 24h para cancelamento expirou. Utilize o evento de carta de correção ou inutilização.' } },
        { status: 400 }
      );
    }

    // Buscar dados do usuário
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nome')
      .eq('auth_user_id', user.id)
      .single();

    const canceladoPor = usuario?.id || user.id;
    const canceladoPorNome = usuario?.nome || user.email || '';

    // Registrar evento de cancelamento no histórico
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

    // Atualizar NFC-e para cancelada
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

    // Cancelar venda vinculada (estoque + caixa)
    if (nfce.venda_id) {
      await cancelarVendaCompleta(
        supabase,
        nfce.venda_id,
        justificativa,
        canceladoPor,
        canceladoPorNome,
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'NFC-e cancelada com sucesso. Estoque e caixa estornados.',
    });

  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}
