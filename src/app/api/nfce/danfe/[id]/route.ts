import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gerarHTMLDANFE } from '@/components/nfce/DANFENFCe';

/**
 * API para gerar DANFE
 * GET /api/nfce/danfe/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: nfce, error } = await supabase
      .from('nfce')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !nfce) {
      return new NextResponse('NFC-e não encontrada', { status: 404 });
    }

    // Formatar dados para o DANFE
    const nfceFormatada = {
      ...nfce,
      emitente: typeof nfce.emitente === 'string' ? JSON.parse(nfce.emitente) : nfce.emitente,
      produtos: typeof nfce.produtos === 'string' ? JSON.parse(nfce.produtos) : nfce.produtos,
      pagamentos: typeof nfce.pagamentos === 'string' ? JSON.parse(nfce.pagamentos) : nfce.pagamentos,
      destinatario: typeof nfce.destinatario === 'string' ? JSON.parse(nfce.destinatario) : nfce.destinatario,
      data_emissao: new Date(nfce.data_emissao),
      data_saida: new Date(nfce.data_saida),
      data_autorizacao: nfce.data_autorizacao ? new Date(nfce.data_autorizacao) : undefined,
    };

    const html = gerarHTMLDANFE(nfceFormatada as any, 80);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error: any) {
    console.error('Erro ao gerar DANFE:', error);
    return new NextResponse('Erro ao gerar DANFE', { status: 500 });
  }
}
