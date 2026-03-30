import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API para download de XML da NF-e
 * GET /api/nfe/xml/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { id } = await params;
    const tipo = new URL(request.url).searchParams.get('tipo') || 'autorizado';

    const { data: nfe, error } = await supabase
      .from('nfe')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !nfe) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '404', mensagem: 'NF-e não encontrada' } }, { status: 404 });
    }

    let xmlContent = '';
    let fileName = '';

    switch (tipo) {
      case 'autorizado':
        xmlContent = nfe.xml_autorizado || nfe.xml_assinado || nfe.xml_enviado || '';
        fileName = `NFe_${nfe.chave}-autorizada.xml`;
        break;
      case 'assinado':
        xmlContent = nfe.xml_assinado || nfe.xml_enviado || '';
        fileName = `NFe_${nfe.chave}-assinada.xml`;
        break;
      case 'enviado':
        xmlContent = nfe.xml_enviado || '';
        fileName = `NFe_${nfe.chave}-enviada.xml`;
        break;
      case 'cancelamento':
        xmlContent = nfe.xml_cancelamento || '';
        fileName = `NFe_${nfe.chave}-cancelamento.xml`;
        break;
      case 'cce':
        xmlContent = nfe.xml_cc_e || '';
        fileName = `NFe_${nfe.chave}-cce.xml`;
        break;
      default:
        xmlContent = nfe.xml_autorizado || nfe.xml_assinado || nfe.xml_enviado || '';
        fileName = `NFe_${nfe.chave}.xml`;
    }

    if (!xmlContent) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '404', mensagem: `XML do tipo "${tipo}" não disponível para esta NF-e` } },
        { status: 404 }
      );
    }

    return new NextResponse(xmlContent, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}
