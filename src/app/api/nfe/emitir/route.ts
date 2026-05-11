import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NFeService } from '@/services/nfe/nfe-service';
import type { EmissaoNFeRequest, EmissaoNFeResponse, StatusNFe } from '@/types/nfe';

/**
 * API para emissão de NF-e (Modelo 55)
 * POST /api/nfe/emitir - Emitir NF-e
 * GET /api/nfe/emitir - Listar NF-es emitidas
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    const empresaId = usuario.empresa_id;
    const body: EmissaoNFeRequest = await request.json();

    // Validações básicas
    if (!body.produtos || body.produtos.length === 0) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'Informe ao menos um produto' } },
        { status: 400 }
      );
    }

    // Carregar configurações NFE
    const { data: config, error: configError } = await supabase
      .from('nfe_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'CONFIG001', mensagem: 'Configurações de NF-e não encontradas. Configure em Cupons e NFEs > Configuração NF-e.' } },
        { status: 400 }
      );
    }

    const ambiente = body.ambiente || config.ambiente;
    const proximoNumero = (config.numero_atual_nfe || 0) + 1;
    const isSimples = config.regime_tributario === '1' || config.regime_tributario === '2';

    // Preparar dados do emitente
    const emitente = {
      cnpj: config.cnpj,
      inscricao_estadual: config.inscricao_estadual,
      inscricao_municipal: config.inscricao_municipal,
      razao_social: config.razao_social,
      nome_fantasia: config.nome_fantasia,
      endereco: {
        logradouro: config.logradouro,
        numero: config.numero,
        complemento: config.complemento,
        bairro: config.bairro,
        codigo_municipio: config.codigo_municipio,
        municipio: config.municipio,
        uf: config.uf,
        cep: config.cep,
        telefone: config.telefone,
        email: config.email,
      },
      regime_tributario: config.regime_tributario,
      cnae_fiscal: undefined,
    };

    // Preparar produtos
    const produtos = body.produtos.map(p => {
      const icmsAliquota = p.icms_aliquota || config.icms_aliquota || 0;
      const pisAliquota = p.pis_aliquota || config.pis_aliquota || 0;
      const cofinsAliquota = p.cofins_aliquota || config.cofins_aliquota || 0;
      const ipiAliquota = p.ipi_aliquota || config.ipi_aliquota || 0;
      const valorBaseICMS = p.icms_valor_base_calculo || p.valor_total || 0;
      const valorICMS = p.icms_valor || (valorBaseICMS * icmsAliquota / 100);
      const valorPIS = p.pis_valor || (p.valor_total * pisAliquota / 100);
      const valorCOFINS = p.cofins_valor || (p.valor_total * cofinsAliquota / 100);
      const valorIPI = p.ipi_valor || (p.valor_total * ipiAliquota / 100);

      return {
        codigo: p.codigo,
        descricao: p.descricao,
        ncm: p.ncm || config.ncm_padrao || '00000000',
        cfop: p.cfop || config.cfop_saida_padrao || '5102',
        unidade_comercial: p.unidade_comercial || config.unidade_padrao || 'UN',
        quantidade_comercial: p.quantidade_comercial,
        valor_unitario_comercial: p.valor_unitario_comercial,
        valor_total: p.valor_total,
        valor_desconto: p.valor_desconto,
        unidade_tributavel: p.unidade_comercial || config.unidade_padrao || 'UN',
        quantidade_tributavel: p.quantidade_comercial,
        valor_unitario_tributavel: p.valor_unitario_comercial,
        icms_origem: p.icms_origem || '0',
        icms_cst: p.icms_cst || (isSimples ? undefined : config.cst_padrao),
        icms_csosn: p.icms_csosn || (isSimples ? config.csosn_padrao : undefined),
        icms_aliquota: icmsAliquota,
        icms_valor_base_calculo: valorBaseICMS,
        icms_valor: valorICMS,
        pis_cst: p.pis_cst || (isSimples ? '99' : '01'),
        pis_aliquota_percentual: pisAliquota,
        pis_valor: valorPIS,
        cofins_cst: p.cofins_cst || (isSimples ? '99' : '01'),
        cofins_aliquota_percentual: cofinsAliquota,
        cofins_valor: valorCOFINS,
        ipi_cst: p.ipi_cst || '52',
        ipi_aliquota_percentual: ipiAliquota,
        ipi_valor: valorIPI,
        indica_total: p.indica_total !== undefined ? p.indica_total : 1,
      };
    });

    // Calcular totais
    const totalProdutos = produtos.reduce((acc, p) => acc + (p.valor_total || 0), 0);
    const totalDesconto = produtos.reduce((acc, p) => acc + (p.valor_desconto || 0), 0);
    const totalFrete = body.transporte?.modalidade_frete === 9 ? 0 : 0;
    const totalICMS = produtos.reduce((acc, p) => acc + (p.icms_valor || 0), 0);
    const totalPIS = produtos.reduce((acc, p) => acc + (p.pis_valor || 0), 0);
    const totalCOFINS = produtos.reduce((acc, p) => acc + (p.cofins_valor || 0), 0);
    const totalIPI = produtos.reduce((acc, p) => acc + (p.ipi_valor || 0), 0);
    const baseCalculoICMS = produtos.reduce((acc, p) => acc + (p.icms_valor_base_calculo || 0), 0);
    const totalNF = totalProdutos - totalDesconto + totalIPI;

    const dadosEmissao = {
      numero: proximoNumero,
      serie: config.serie_nfe,
      ambiente,
      emitente,
      destinatario: body.destinatario,
      produtos,
      pagamentos: body.pagamentos,
      transporte: body.transporte,
      naturezaOperacao: body.natureza_operacao || config.natureza_operacao_padrao || 'VENDA DE MERCADORIA',
      tipoOperacao: body.tipo_operacao ?? 1,
      finalidade: body.finalidade ?? 1,
      indicadorPresenca: body.indicador_presenca ?? 1,
      indicadorDestino: body.indicador_destino ?? 1,
      formaEmissao: config.em_contingencia ? (config.tipo_contingencia === 'SVCRS' ? 6 : config.tipo_contingencia === 'SVCAN' ? 7 : 5) : 1,
      informacoesAdicionais: body.informacoes_adicionais || config.informacoes_adicionais,
      informacoesFisco: body.informacoes_fisco || config.informacoes_fisco,
      informacoesComplementares: body.informacoes_complementares,
      dataEmissao: new Date(),
      totalProdutos,
      totalFrete,
      totalSeguro: 0,
      totalDesconto,
      totalIPI,
      totalPIS,
      totalCOFINS,
      totalOutrasDespesas: 0,
      totalNF,
      totalICMS,
      totalICMSST: 0,
      totalICMSFCP: 0,
      totalICMSSTFCP: 0,
      baseCalculoICMS,
      baseCalculoICMSST: 0,
      totalII: 0,
      totalIPIDevol: 0,
      totalICMSSTRet: 0,
      totalICMSSTRetFCP: 0,
      totalFCP: 0,
    };

    // Gerar XML
    const { xml: xmlGerado, chave } = NFeService.gerarXMLNFe(dadosEmissao);

    // Assinar XML
    let xmlAssinado: string;
    try {
      xmlAssinado = await NFeService.assinarXML(xmlGerado, '', '');
    } catch (signError: any) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'SIGN001', mensagem: `Erro ao assinar XML: ${signError.message}` } },
        { status: 500 }
      );
    }

    // Enviar para SEFAZ
    let status: StatusNFe = 'pendente';
    let protocolo: string | undefined;
    let dataAutorizacao: Date | undefined;
    let codigoRejeicao: string | undefined;
    let mensagemRejeicao: string | undefined;
    let xmlAutorizado: string | undefined;
    let versaoAplicacao: string | undefined;

    try {
      const resultadoSEFAZ = await NFeService.enviarNFeSEFAZ(xmlAssinado, config.uf, ambiente);

      if (resultadoSEFAZ.sucesso) {
        status = 'autorizada';
        protocolo = resultadoSEFAZ.protocolo;
        dataAutorizacao = resultadoSEFAZ.dataAutorizacao;
        xmlAutorizado = resultadoSEFAZ.xmlAutorizado;
        versaoAplicacao = resultadoSEFAZ.versaoAplicacao;
      } else {
        status = 'rejeitada';
        codigoRejeicao = resultadoSEFAZ.codigoRejeicao;
        mensagemRejeicao = resultadoSEFAZ.mensagemRejeicao;
      }
    } catch (sefazError: any) {
      status = 'rejeitada';
      codigoRejeicao = 'SEFAZ001';
      mensagemRejeicao = `Erro de comunicação com SEFAZ: ${sefazError.message}`;
    }

    // Salvar NF-e no banco
    const { data: nfeSalva, error: saveError } = await supabase
      .from('nfe')
      .insert({
        empresa_id: empresaId,
        numero: proximoNumero,
        serie: config.serie_nfe,
        modelo: '55',
        ambiente,
        chave,
        status,
        natureza_operacao: dadosEmissao.naturezaOperacao,
        tipo_operacao: dadosEmissao.tipoOperacao,
        forma_emissao: dadosEmissao.formaEmissao,
        finalidade: dadosEmissao.finalidade,
        indicador_presenca: dadosEmissao.indicadorPresenca,
        indicador_destino: dadosEmissao.indicadorDestino,
        processo_emissao: 0,
        emitente,
        destinatario: body.destinatario || null,
        produtos: produtos,
        total_icms: totalICMS,
        total_icms_st: 0,
        total_icms_fcp: 0,
        base_calculo_icms: baseCalculoICMS,
        base_calculo_icms_st: 0,
        total_produtos: totalProdutos,
        total_frete: totalFrete,
        total_seguro: 0,
        total_desconto: totalDesconto,
        total_ii: 0,
        total_ipi: totalIPI,
        total_ipi_devol: 0,
        total_pis: totalPIS,
        total_cofins: totalCOFINS,
        total_outras_despesas: 0,
        total_nota: totalNF,
        pagamentos: body.pagamentos || [],
        transporte: body.transporte || null,
        informacoes_adicionais: body.informacoes_adicionais,
        informacoes_fisco: body.informacoes_fisco,
        informacoes_complementares: body.informacoes_complementares,
        data_emissao: dadosEmissao.dataEmissao.toISOString(),
        data_saida_entrada: dadosEmissao.dataEmissao.toISOString(),
        protocolo_autorizacao: protocolo,
        data_autorizacao: dataAutorizacao?.toISOString(),
        versao_aplicacao: versaoAplicacao,
        codigo_rejeicao: codigoRejeicao,
        mensagem_rejeicao: mensagemRejeicao,
        xml_enviado: xmlGerado,
        xml_assinado: xmlAssinado,
        xml_autorizado: xmlAutorizado,
        venda_id: body.venda_id || null,
        pedido_id: body.pedido_id || null,
        em_contingencia: config.em_contingencia || false,
        tipo_contingencia: config.tipo_contingencia,
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'DB001', mensagem: 'Erro ao salvar NF-e no banco de dados' } },
        { status: 500 }
      );
    }

    // Atualizar número atual na config
    if (status === 'autorizada') {
      await supabase
        .from('nfe_config')
        .update({
          numero_atual_nfe: proximoNumero,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', config.id);
    }

    // Se houver pedido_id vinculado, atualizar o pedido
    if (body.pedido_id) {
      const pedidoUpdate: any = { nfe_id: nfeSalva.id };
      if (status === 'autorizada') {
        pedidoUpdate.status = 'convertido';
      }
      await supabase.from('pedidos').update(pedidoUpdate).eq('id', body.pedido_id);
    }

    // Registrar log
    await supabase.from('nfe_logs').insert({
      empresa_id: empresaId,
      nfe_id: nfeSalva.id,
      operacao: 'emitir',
      ambiente,
      uf: config.uf,
      servico: 'NFeAutorizacao4',
      versao_servico: '4.00',
      xml_enviado: xmlGerado,
      xml_recebido: xmlAutorizado,
      sucesso: status === 'autorizada',
      codigo_status: codigoRejeicao,
      mensagem: status === 'autorizada' ? 'NF-e autorizada com sucesso' : mensagemRejeicao,
    });

    const response: EmissaoNFeResponse = {
      sucesso: status === 'autorizada',
      nfe: {
        id: nfeSalva.id,
        empresa_id: empresaId,
        numero: proximoNumero,
        serie: config.serie_nfe,
        modelo: '55',
        ambiente,
        chave,
        status,
        natureza_operacao: dadosEmissao.naturezaOperacao,
        tipo_operacao: dadosEmissao.tipoOperacao,
        emitente: emitente as any,
        destinatario: body.destinatario as any,
        produtos: produtos as any,
        total_produtos: totalProdutos,
        total_nota: totalNF,
        total_icms: totalICMS,
        total_pis: totalPIS,
        total_cofins: totalCOFINS,
        total_ipi: totalIPI,
        base_calculo_icms: baseCalculoICMS,
        total_frete: totalFrete,
        total_desconto: totalDesconto,
        pagamentos: body.pagamentos || [],
        data_emissao: dadosEmissao.dataEmissao,
        protocolo_autorizacao: protocolo,
        data_autorizacao: dataAutorizacao,
        xml_assinado: xmlAssinado,
        xml_autorizado: xmlAutorizado,
        venda_id: body.venda_id,
        pedido_id: body.pedido_id,
        em_contingencia: config.em_contingencia || false,
        criado_em: new Date(nfeSalva.criado_em),
        atualizado_em: new Date(nfeSalva.atualizado_em),
      } as any,
    };

    if (status !== 'autorizada') {
      response.erro = {
        codigo: codigoRejeicao || 'UNKNOWN',
        mensagem: mensagemRejeicao || 'NF-e não autorizada',
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

/**
 * GET /api/nfe/emitir
 * Lista NF-es emitidas
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (!usuario?.empresa_id) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '403', mensagem: 'Empresa não encontrada' } }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limite = parseInt(searchParams.get('limite') || '50');
    const pagina = parseInt(searchParams.get('pagina') || '1');
    const statusFilter = searchParams.get('status');
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const numeroNF = searchParams.get('numero');

    let query = supabase
      .from('nfe')
      .select('*')
      .eq('empresa_id', usuario.empresa_id);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (dataInicio) {
      query = query.gte('data_emissao', dataInicio);
    }
    if (dataFim) {
      query = query.lte('data_emissao', dataFim);
    }
    if (numeroNF) {
      query = query.eq('numero', parseInt(numeroNF));
    }

    query = query
      .order('data_emissao', { ascending: false })
      .range((pagina - 1) * limite, pagina * limite - 1);

    const { data: nfes, error, count } = await query;

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'DB001', mensagem: 'Erro ao consultar NF-es' } }, { status: 500 });
    }

    return NextResponse.json({
      sucesso: true,
      nfes: nfes?.map(n => ({
        ...n,
        data_emissao: new Date(n.data_emissao),
        data_saida_entrada: n.data_saida_entrada ? new Date(n.data_saida_entrada) : null,
        data_autorizacao: n.data_autorizacao ? new Date(n.data_autorizacao) : null,
      })),
      total: count,
      pagina,
      limite,
    });

  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
