import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NFeService } from '@/services/nfe/nfe-service';

/**
 * API para consultar NF-e
 * GET /api/nfe/consultar
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
    const nfeId = searchParams.get('nfe_id');
    const chave = searchParams.get('chave');
    const consultarSefaz = searchParams.get('sefaz') === 'true';

    if (!nfeId && !chave) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'nfe_id ou chave é obrigatório' } },
        { status: 400 }
      );
    }

    let query = supabase.from('nfe').select('*');

    if (nfeId) {
      query = query.eq('id', nfeId);
    } else if (chave) {
      query = query.eq('chave', chave);
    }

    const { data: nfe, error } = await query.single();

    if (error || !nfe) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '404', mensagem: 'NF-e não encontrada' } },
        { status: 404 }
      );
    }

    // Consultar protocolo na SEFAZ se solicitado
    if (consultarSefaz && nfe.chave) {
      try {
        const config = await supabase
          .from('nfe_config')
          .select('uf')
          .eq('empresa_id', nfe.empresa_id)
          .single();

        const uf = config?.data?.uf || 'SP';
        const resultadoSefaz = await NFeService.consultarProtocolo(
          nfe.chave,
          uf,
          nfe.ambiente
        );

        if (resultadoSefaz.sucesso) {
          return NextResponse.json({
            sucesso: true,
            nfe: {
              ...nfe,
              data_emissao: new Date(nfe.data_emissao),
              data_saida_entrada: nfe.data_saida_entrada ? new Date(nfe.data_saida_entrada) : null,
              data_autorizacao: nfe.data_autorizacao ? new Date(nfe.data_autorizacao) : null,
            },
            protocolo: resultadoSefaz.protocolo,
            status_sefaz: resultadoSefaz.status,
          });
        }
      } catch (sefazError) {
      }
    }

    return NextResponse.json({
      sucesso: true,
      nfe: {
        ...nfe,
        data_emissao: new Date(nfe.data_emissao),
        data_saida_entrada: nfe.data_saida_entrada ? new Date(nfe.data_saida_entrada) : null,
        data_autorizacao: nfe.data_autorizacao ? new Date(nfe.data_autorizacao) : null,
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}
