import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NFCeService } from '@/services/nfce/nfce-service';
import type { EmissaoNFCeRequest, EmissaoNFCeResponse, StatusNFCe } from '@/types/nfce';

/**
 * API para emissão de NFC-e
 * POST /api/nfce/emitir
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
    const body: EmissaoNFCeRequest = await request.json();

    // Carregar configurações
    const { data: config, error: configError } = await supabase
      .from('nfce_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'CONFIG001', mensagem: 'Configurações de NFC-e não encontradas' } },
        { status: 400 }
      );
    }

    const ambiente = body.ambiente || config.ambiente;
    const proximoNumero = (config.numero_atual || 0) + 1;

    // Preparar dados
    const dadosNFCe = {
      numero: proximoNumero,
      serie: config.serie,
      ambiente,
      emitente: {
        cnpj: config.cnpj,
        ie: config.inscricao_estadual,
        im: config.inscricao_municipal,
        razaoSocial: config.razao_social,
        nomeFantasia: config.nome_fantasia,
        logradouro: config.logradouro,
        numero: config.numero,
        complemento: config.complemento,
        bairro: config.bairro,
        codigoMunicipio: config.codigo_municipio,
        municipio: config.municipio,
        uf: config.uf,
        cep: config.cep,
        telefone: config.telefone,
        email: config.email,
        regimeTributario: config.regime_tributario,
      },
      destinatario: body.destinatario,
      produtos: body.produtos.map(p => ({
        ...p,
        csosn: p.csosn || config.csosn_padrao,
        cfop: p.cfop || config.cfop_padrao,
        ncm: p.ncm || config.ncm_padrao || '00000000',
        unidade: p.unidade || config.unidade_padrao,
      })),
      totalProdutos: body.produtos.reduce((acc, p) => acc + p.valor_total, 0),
      totalDesconto: body.produtos.reduce((acc, p) => acc + (p.valor_desconto || 0), 0),
      totalLiquido: body.produtos.reduce((acc, p) => acc + p.valor_liquido, 0),
      pagamentos: body.pagamentos,
      troco: body.pagamentos.reduce((acc, p) => acc + p.valor, 0) - body.produtos.reduce((acc, p) => acc + p.valor_liquido, 0),
      informacoesAdicionais: body.informacoes_adicionais || config.informacoes_adicionais,
      dataEmissao: new Date(),
    };

    // Gerar XML
    const { xml, chave } = NFCeService.gerarXMLNFCe(dadosNFCe) as any;

    // Assinar XML
    let xmlAssinado: string;
    try {
      xmlAssinado = await NFCeService.assinarXML(xml, '', '');
    } catch (signError: any) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'SIGN001', mensagem: `Erro ao assinar: ${signError.message}` } },
        { status: 500 }
      );
    }

    // Enviar para SEFAZ
    let status: StatusNFCe = 'pendente';
    let protocolo: string | undefined;
    let dataAutorizacao: Date | undefined;
    let codigoRejeicao: string | undefined;
    let mensagemRejeicao: string | undefined;
    let xmlAutorizado: string | undefined;

    try {
      const resultadoSEFAZ = await NFCeService.enviarNFCeSEFAZ(xmlAssinado, config.uf, ambiente);
      
      if (resultadoSEFAZ.sucesso) {
        status = 'autorizada';
        protocolo = resultadoSEFAZ.protocolo;
        dataAutorizacao = resultadoSEFAZ.dataAutorizacao;
        xmlAutorizado = resultadoSEFAZ.xmlAutorizado;
      } else {
        status = 'rejeitada';
        codigoRejeicao = resultadoSEFAZ.codigoRejeicao;
        mensagemRejeicao = resultadoSEFAZ.mensagemRejeicao;
      }
    } catch (sefazError: any) {
      status = 'rejeitada';
      codigoRejeicao = 'SEFAZ001';
      mensagemRejeicao = `Erro SEFAZ: ${sefazError.message}`;
    }

    // Gerar QR Code
    const qrCode = NFCeService.gerarQRCode(chave, ambiente, config.uf);

    // Salvar NFC-e
    const { data: nfceSalva, error: saveError } = await supabase
      .from('nfce')
      .insert({
        empresa_id: empresaId,
        numero: proximoNumero,
        serie: config.serie,
        modelo: '65',
        ambiente,
        chave,
        status,
        emitente: dadosNFCe.emitente,
        destinatario: body.destinatario || null,
        produtos: body.produtos,
        total_produtos: dadosNFCe.totalProdutos,
        total_desconto: dadosNFCe.totalDesconto,
        total_liquido: dadosNFCe.totalLiquido,
        pagamentos: body.pagamentos,
        troco: dadosNFCe.troco,
        modalidade_frete: '9',
        informacoes_adicionais: body.informacoes_adicionais,
        data_emissao: dadosNFCe.dataEmissao.toISOString(),
        data_saida: dadosNFCe.dataEmissao.toISOString(),
        protocolo_autorizacao: protocolo,
        data_autorizacao: dataAutorizacao?.toISOString(),
        codigo_rejeicao: codigoRejeicao,
        mensagem_rejeicao: mensagemRejeicao,
        xml_assinado: xmlAssinado,
        xml_autorizado: xmlAutorizado,
        qr_code: qrCode,
        venda_id: body.venda_id || null,
        em_contingencia: false,
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'DB001', mensagem: 'Erro ao salvar NFC-e' } },
        { status: 500 }
      );
    }

    // Atualizar número
    if (status === 'autorizada') {
      await supabase
        .from('nfce_config')
        .update({ numero_atual: proximoNumero })
        .eq('id', config.id);
    }

    const response: EmissaoNFCeResponse = {
      sucesso: status === 'autorizada',
      nfce: {
        id: nfceSalva.id,
        empresa_id: empresaId,
        numero: proximoNumero,
        serie: config.serie,
        modelo: '65',
        ambiente,
        chave,
        status,
        emitente: dadosNFCe.emitente as any,
        destinatario: body.destinatario,
        produtos: body.produtos,
        total_produtos: dadosNFCe.totalProdutos,
        total_desconto: dadosNFCe.totalDesconto,
        total_liquido: dadosNFCe.totalLiquido,
        pagamentos: body.pagamentos,
        troco: dadosNFCe.troco,
        modalidade_frete: '9',
        informacoes_adicionais: body.informacoes_adicionais,
        data_emissao: dadosNFCe.dataEmissao,
        data_saida: dadosNFCe.dataEmissao,
        protocolo_autorizacao: protocolo,
        data_autorizacao: dataAutorizacao,
        codigo_rejeicao,
        mensagem_rejeicao,
        xml_assinado: xmlAssinado,
        xml_autorizado: xmlAutorizado,
        qr_code: qrCode,
        venda_id: body.venda_id,
        em_contingencia: false,
        criado_em: new Date(nfceSalva.criado_em),
        atualizado_em: new Date(nfceSalva.atualizado_em),
      } as any,
    };

    if (status !== 'autorizada') {
      response.erro = {
        codigo: codigoRejeicao || 'UNKNOWN',
        mensagem: mensagemRejeicao || 'NFC-e não autorizada',
      };
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Erro na emissão:', error);
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nfce/emitir
 * Lista NFC-es emitidas
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (!usuario?.empresa_id) {
      return NextResponse.json({ sucesso: false }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limite = parseInt(searchParams.get('limite') || '50');
    const statusFilter = searchParams.get('status');

    let query = supabase
      .from('nfce')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .order('data_emissao', { ascending: false })
      .limit(limite);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: nfces } = await query;

    return NextResponse.json({
      sucesso: true,
      nfces: nfces?.map(n => ({
        ...n,
        data_emissao: new Date(n.data_emissao),
        data_saida: new Date(n.data_saida),
        data_autorizacao: n.data_autorizacao ? new Date(n.data_autorizacao) : null,
      })),
    });

  } catch (error) {
    return NextResponse.json({ sucesso: false }, { status: 500 });
  }
}
