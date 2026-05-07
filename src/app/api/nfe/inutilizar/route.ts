import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NFeService } from '@/services/nfe/nfe-service';
import type { InutilizacaoNFeRequest, InutilizacaoNFeResponse } from '@/types/nfe';

/**
 * API para inutilizar faixa de numeração NF-e
 * POST /api/nfe/inutilizar
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

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (!usuario?.empresa_id) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '403', mensagem: 'Empresa não encontrada' } },
        { status: 403 }
      );
    }

    const body: InutilizacaoNFeRequest = await request.json();
    const { serie, numero_inicial, numero_final, justificativa, ambiente } = body;

    // Validações
    if (!serie || numero_inicial === undefined || numero_final === undefined || !justificativa) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'Todos os campos são obrigatórios: serie, numero_inicial, numero_final, justificativa' } },
        { status: 400 }
      );
    }

    if (numero_inicial > numero_final) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'Número inicial deve ser menor ou igual ao número final' } },
        { status: 400 }
      );
    }

    if (justificativa.length < 15) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'A justificativa deve ter no mínimo 15 caracteres' } },
        { status: 400 }
      );
    }

    // Carregar config
    const { data: config } = await supabase
      .from('nfe_config')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .single();

    if (!config) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'CONFIG001', mensagem: 'Configurações de NF-e não encontradas' } },
        { status: 400 }
      );
    }

    const ano = new Date().getFullYear();
    const ambienteFinal = ambiente || config.ambiente;

    // Gerar XML de inutilização
    const xmlInutilizacao = NFeService.gerarXMLInutilizacao({
      ano,
      serie,
      numeroInicial: numero_inicial,
      numeroFinal: numero_final,
      justificativa,
      cnpj: config.cnpj,
      uf: config.uf,
      ambiente: ambienteFinal,
    });

    // Enviar para SEFAZ
    let statusInut = 'autorizado';
    let protocolo: string | undefined;
    let dataRegistro: Date | undefined;
    let codigoRejeicao: string | undefined;
    let mensagemRejeicao: string | undefined;

    try {
      const resultado = await NFeService.inutilizarNumeracao(
        ano,
        serie,
        numero_inicial,
        numero_final,
        justificativa,
        config.cnpj,
        config.uf,
        ambienteFinal
      );

      if (resultado.sucesso) {
        protocolo = resultado.protocolo;
        dataRegistro = resultado.dataRegistro;
      } else {
        statusInut = 'rejeitado';
        codigoRejeicao = resultado.codigoRejeicao;
        mensagemRejeicao = resultado.mensagemRejeicao;
      }
    } catch (sefazError: any) {
      statusInut = 'rejeitado';
      codigoRejeicao = 'SEFAZ001';
      mensagemRejeicao = `Erro de comunicação com SEFAZ: ${sefazError.message}`;
    }

    // Salvar registro de inutilização
    const { data: inutilizacaoSalva } = await supabase
      .from('nfe_inutilizacao')
      .insert({
        empresa_id: usuario.empresa_id,
        ano,
        serie,
        numero_inicial: numero_inicial,
        numero_final: numero_final,
        ambiente: ambienteFinal,
        uf: config.uf,
        cnpj: config.cnpj,
        justificativa,
        protocolo,
        data_registro: dataRegistro?.toISOString(),
        status: statusInut,
        codigo_rejeicao: codigoRejeicao,
        mensagem_rejeicao: mensagemRejeicao,
        xml_envio: xmlInutilizacao,
      })
      .select()
      .single();

    // Registrar log
    await supabase.from('nfe_logs').insert({
      empresa_id: usuario.empresa_id,
      operacao: 'inutilizar',
      ambiente: ambienteFinal,
      uf: config.uf,
      servico: 'NFeInutilizacao4',
      xml_enviado: xmlInutilizacao,
      sucesso: statusInut === 'autorizado',
      codigo_status: codigoRejeicao,
      mensagem: statusInut === 'autorizado' ? 'Numeração inutilizada com sucesso' : mensagemRejeicao,
    });

    const response: InutilizacaoNFeResponse = {
      sucesso: statusInut === 'autorizado',
      inutilizacao: inutilizacaoSalva,
    };

    if (statusInut !== 'autorizado') {
      response.erro = {
        codigo: codigoRejeicao || 'UNKNOWN',
        mensagem: mensagemRejeicao || 'Erro ao inutilizar numeração',
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
