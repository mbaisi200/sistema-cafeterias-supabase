import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NFeService } from '@/services/nfe/nfe-service';
import type { CartaCorrecaoNFeRequest, CartaCorrecaoNFeResponse } from '@/types/nfe';

/**
 * API para Carta de Correção (CC-e) de NF-e
 * POST /api/nfe/carta-correcao
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

    const body: CartaCorrecaoNFeRequest = await request.json();
    const { nfe_id, correcoes, condicoes_uso } = body;

    if (!nfe_id || !correcoes || correcoes.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'nfe_id e correções são obrigatórios' } },
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
        { sucesso: false, erro: { codigo: '400', mensagem: 'Apenas NF-es autorizadas podem receber Carta de Correção' } },
        { status: 400 }
      );
    }

    // Carregar config
    const { data: config } = await supabase
      .from('nfe_config')
      .select('*')
      .eq('empresa_id', nfe.empresa_id)
      .single();

    const cnpj = config?.cnpj || nfe.emitente?.cnpj || '';
    const uf = config?.uf || nfe.emitente?.endereco?.uf || 'SP';
    const sequencial = (nfe.numero_cc_e || 0) + 1;

    // Gerar XML da CC-e
    const xmlCCe = NFeService.gerarXMLCartaCorrecao({
      chave: nfe.chave,
      sequencial,
      correcoes: correcoes.map(c => ({
        campo: c.campo_original,
        valorAnterior: c.valor_original,
        valorNovo: c.valor_corrigido,
      })),
      condicoesUso: condicoes_uso,
      cnpj,
      dataEvento: new Date(),
    });

    // Enviar para SEFAZ
    let statusEvento = 'autorizado';
    let protocolo: string | undefined;
    let dataRegistro: Date | undefined;
    let codigoRejeicao: string | undefined;
    let mensagemRejeicao: string | undefined;

    try {
      const resultado = await NFeService.enviarCartaCorrecao(
        nfe.chave,
        sequencial,
        correcoes.map(c => ({
          campo: c.campo_original,
          valorAnterior: c.valor_original,
          valorNovo: c.valor_corrigido,
        })),
        condicoes_uso || '',
        uf,
        nfe.ambiente
      );

      if (resultado.sucesso) {
        protocolo = resultado.protocolo;
        dataRegistro = resultado.dataRegistro;
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

    // Registrar evento
    const { data: eventoSalvo } = await supabase
      .from('nfe_eventos')
      .insert({
        nfe_id,
        empresa_id: nfe.empresa_id,
        tipo: 'carta_correcao',
        codigo_evento: '110110',
        descricao: 'Carta de Correção',
        sequencial,
        data_evento: new Date().toISOString(),
        justificativa: correcoes.map(c => `${c.campo_original}: "${c.valor_original}" -> "${c.valor_corrigido}"`).join('; '),
        condicoes_uso,
        correcoes,
        protocolo,
        data_registro: dataRegistro?.toISOString(),
        status: statusEvento,
        codigo_rejeicao: codigoRejeicao,
        mensagem_rejeicao: mensagemRejeicao,
        xml_envio: xmlCCe,
      })
      .select()
      .single();

    // Atualizar contador de CC-e na NF-e
    if (statusEvento === 'autorizado') {
      await supabase
        .from('nfe')
        .update({
          numero_cc_e: sequencial,
          xml_cc_e: xmlCCe,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', nfe_id);
    }

    // Registrar log
    await supabase.from('nfe_logs').insert({
      empresa_id: nfe.empresa_id,
      nfe_id,
      operacao: 'carta_correcao',
      ambiente: nfe.ambiente,
      uf,
      servico: 'RecepcaoEvento4',
      xml_enviado: xmlCCe,
      sucesso: statusEvento === 'autorizado',
      codigo_status: codigoRejeicao,
      mensagem: statusEvento === 'autorizado' ? 'CC-e registrada com sucesso' : mensagemRejeicao,
    });

    const response: CartaCorrecaoNFeResponse = {
      sucesso: statusEvento === 'autorizado',
      evento: eventoSalvo,
    };

    if (statusEvento !== 'autorizado') {
      response.erro = {
        codigo: codigoRejeicao || 'UNKNOWN',
        mensagem: mensagemRejeicao || 'Erro ao registrar CC-e',
      };
    }

    return NextResponse.json(response);

  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}
