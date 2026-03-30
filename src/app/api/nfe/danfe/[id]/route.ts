import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NFeService } from '@/services/nfe/nfe-service';

/**
 * API para gerar DANFE de NF-e
 * GET /api/nfe/danfe/[id]
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

    const { data: nfe, error } = await supabase
      .from('nfe')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !nfe) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '404', mensagem: 'NF-e não encontrada' } }, { status: 404 });
    }

    const danfeHTML = NFeService.gerarHTMLDANFE({
      id: nfe.id,
      empresa_id: nfe.empresa_id,
      numero: nfe.numero,
      serie: nfe.serie,
      modelo: nfe.modelo,
      ambiente: nfe.ambiente,
      versao: nfe.versao,
      chave: nfe.chave,
      status: nfe.status,
      natureza_operacao: nfe.natureza_operacao,
      tipo_operacao: nfe.tipo_operacao,
      finalidade: nfe.finalidade,
      indicador_presenca: nfe.indicador_presenca,
      indicador_destino: nfe.indicador_destino,
      processo_emissao: nfe.processo_emissao,
      emitente: nfe.emitente,
      destinatario: nfe.destinatario,
      produtos: nfe.produtos,
      total_icms: nfe.total_icms,
      total_icms_st: nfe.total_icms_st,
      total_icms_fcp: nfe.total_icms_fcp,
      total_icms_st_fcp: nfe.total_icms_st_fcp,
      base_calculo_icms: nfe.base_calculo_icms,
      base_calculo_icms_st: nfe.base_calculo_icms_st,
      total_produtos: nfe.total_produtos,
      total_frete: nfe.total_frete,
      total_seguro: nfe.total_seguro,
      total_desconto: nfe.total_desconto,
      total_ii: nfe.total_ii,
      total_ipi: nfe.total_ipi,
      total_ipi_devol: nfe.total_ipi_devol,
      total_pis: nfe.total_pis,
      total_cofins: nfe.total_cofins,
      total_outras_despesas: nfe.total_outras_despesas,
      total_nota: nfe.total_nota,
      pagamentos: nfe.pagamentos,
      transporte: nfe.transporte,
      informacoes_adicionais: nfe.informacoes_adicionais,
      data_emissao: new Date(nfe.data_emissao),
      protocolo_autorizacao: nfe.protocolo_autorizacao,
      data_autorizacao: nfe.data_autorizacao ? new Date(nfe.data_autorizacao) : undefined,
      venda_id: nfe.venda_id,
      pedido_id: nfe.pedido_id,
      em_contingencia: nfe.em_contingencia,
      criado_em: new Date(nfe.criado_em),
      atualizado_em: new Date(nfe.atualizado_em),
    } as any);

    return new NextResponse(danfeHTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}
