import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NFeService } from '@/services/nfe/nfe-service';

/**
 * API para cancelar NF-e
 * POST /api/nfe/cancelar
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
    const { nfe_id, justificativa } = body;

    if (!nfe_id || !justificativa) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'nfe_id e justificativa são obrigatórios' } },
        { status: 400 }
      );
    }

    if (justificativa.length < 15) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'A justificativa deve ter no mínimo 15 caracteres' } },
        { status: 400 }
      );
    }

    // Buscar NF-e
    const { data: nfe, error: nfeError } = await supabase
      .from('nfe')
      .select('*')
      .eq('id', nfe_id)
      .single();

    if (nfeError || !nfe) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '404', mensagem: 'NF-e não encontrada' } },
        { status: 404 }
      );
    }

    if (nfe.status !== 'autorizada') {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'Apenas NF-es autorizadas podem ser canceladas' } },
        { status: 400 }
      );
    }

    // Carregar config para obter dados do emitente
    const { data: config } = await supabase
      .from('nfe_config')
      .select('*')
      .eq('empresa_id', nfe.empresa_id)
      .single();

    const cnpj = config?.cnpj || nfe.emitente?.cnpj || '';
    const uf = config?.uf || nfe.emitente?.endereco?.uf || 'SP';
    const ambiente = nfe.ambiente;

    // Gerar XML de cancelamento
    const xmlCancelamento = NFeService.gerarXMLCancelamento({
      chave: nfe.chave,
      protocolo: nfe.protocolo_autorizacao,
      justificativa,
      cnpj,
      dataEvento: new Date(),
    });

    // Enviar cancelamento para SEFAZ
    let statusEvento = 'autorizado';
    let protocoloCancelamento: string | undefined;
    let dataCancelamento: Date | undefined;
    let codigoRejeicao: string | undefined;
    let mensagemRejeicao: string | undefined;

    try {
      const resultado = await NFeService.cancelarNFeSEFAZ(
        nfe.chave,
        nfe.protocolo_autorizacao,
        justificativa,
        uf,
        ambiente
      );

      if (resultado.sucesso) {
        protocoloCancelamento = resultado.protocoloCancelamento;
        dataCancelamento = resultado.dataCancelamento;
      } else {
        statusEvento = 'rejeitado';
        codigoRejeicao = resultado.codigoRejeicao;
        mensagemRejeicao = resultado.mensagemRejeicao;
      }
    } catch (sefazError: any) {
      statusEvento = 'rejeitado';
      codigoRejeicao = 'SEFAZ001';
      mensagemRejeicao = `Erro de comunicação com SEFAZ: ${sefazError.message}`;
    }

    // Atualizar status da NF-e
    if (statusEvento === 'autorizado') {
      const { error: updateError } = await supabase
        .from('nfe')
        .update({
          status: 'cancelada',
          protocolo_cancelamento: protocoloCancelamento,
          data_cancelamento: dataCancelamento?.toISOString(),
          motivo_cancelamento: justificativa,
          xml_cancelamento: xmlCancelamento,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', nfe_id);

      if (updateError) {
        return NextResponse.json(
          { sucesso: false, erro: { codigo: 'DB001', mensagem: 'Erro ao cancelar NF-e' } },
          { status: 500 }
        );
      }
    }

    // Registrar evento
    await supabase.from('nfe_eventos').insert({
      nfe_id,
      empresa_id: nfe.empresa_id,
      tipo: 'cancelamento',
      codigo_evento: '110111',
      descricao: 'Cancelamento de NF-e',
      sequencial: 1,
      data_evento: new Date().toISOString(),
      justificativa,
      protocolo: protocoloCancelamento,
      data_registro: dataCancelamento?.toISOString(),
      status: statusEvento,
      codigo_rejeicao: codigoRejeicao,
      mensagem_rejeicao: mensagemRejeicao,
      xml_envio: xmlCancelamento,
    });

    // Registrar log
    await supabase.from('nfe_logs').insert({
      empresa_id: nfe.empresa_id,
      nfe_id,
      operacao: 'cancelar',
      ambiente,
      uf,
      servico: 'RecepcaoEvento4',
      xml_enviado: xmlCancelamento,
      sucesso: statusEvento === 'autorizado',
      codigo_status: codigoRejeicao,
      mensagem: statusEvento === 'autorizado' ? 'NF-e cancelada com sucesso' : mensagemRejeicao,
    });

    return NextResponse.json({
      sucesso: statusEvento === 'autorizado',
      protocolo: protocoloCancelamento,
      mensagem: statusEvento === 'autorizado' ? 'NF-e cancelada com sucesso' : `Falha no cancelamento: ${mensagemRejeicao}`,
      erro: statusEvento === 'autorizado' ? undefined : { codigo: codigoRejeicao || 'UNKNOWN', mensagem: mensagemRejeicao || 'Erro ao cancelar' },
    });

  } catch (error: any) {
    console.error('Erro ao cancelar NF-e:', error);
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}
