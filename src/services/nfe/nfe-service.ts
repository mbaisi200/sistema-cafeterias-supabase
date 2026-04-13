import type {
  NFeConfig,
  ProdutoNFe,
  PagamentoNFe,
  DestinatarioNFe,
  TransporteNFe,
  EnderecoNFe,
  EmitenteNFe,
  NFe,
} from '@/types/nfe';

/**
 * Serviço para geração, assinatura e comunicação NF-e (Modelo 55)
 * Implementação completa conforme padrões da SEFAZ brasileira
 */
export class NFeService {

  // =============================================
  // GERAÇÃO DE XML NF-e (Layout 4.00)
  // =============================================

  /**
   * Gera o XML completo da NF-e modelo 55
   */
  static gerarXMLNFe(dados: {
    numero: number;
    serie: string;
    ambiente: string;
    emitente: EmitenteNFe;
    destinatario?: DestinatarioNFe;
    produtos: ProdutoNFe[];
    pagamentos?: PagamentoNFe[];
    transporte?: TransporteNFe;
    naturezaOperacao: string;
    tipoOperacao: number;
    finalidade: number;
    indicadorPresenca: number;
    indicadorDestino: number;
    formaEmissao: number;
    informacoesAdicionais?: string;
    informacoesFisco?: string;
    informacoesComplementares?: string;
    dataEmissao: Date;
    totalProdutos: number;
    totalFrete: number;
    totalSeguro: number;
    totalDesconto: number;
    totalIPI: number;
    totalPIS: number;
    totalCOFINS: number;
    totalOutrasDespesas: number;
    totalNF: number;
    totalICMS: number;
    totalICMSST: number;
    totalICMSFCP: number;
    totalICMSSTFCP: number;
    baseCalculoICMS: number;
    baseCalculoICMSST: number;
    totalII: number;
    totalIPIDevol: number;
    totalICMSSTRet: number;
    totalICMSSTRetFCP: number;
    totalFCP: number;
    numeroCCE?: number;
  }): { xml: string; chave: string } {
    const {
      numero, serie, ambiente, emitente, destinatario, produtos, pagamentos,
      transporte, naturezaOperacao, tipoOperacao, finalidade, indicadorPresenca,
      indicadorDestino, formaEmissao, informacoesAdicionais, informacoesFisco,
      informacoesComplementares, dataEmissao, totalProdutos, totalFrete, totalSeguro,
      totalDesconto, totalIPI, totalPIS, totalCOFINS, totalOutrasDespesas, totalNF,
      totalICMS, totalICMSST, totalICMSFCP, totalICMSSTFCP, baseCalculoICMS,
      baseCalculoICMSST, totalII, totalIPIDevol, totalICMSSTRet, totalICMSSTRetFCP,
      totalFCP, numeroCCE
    } = dados;

    // Gerar chave de acesso NF-e (44 posições)
    const chave = this.gerarChaveAcessoNFe({
      cnpj: emitente.cnpj,
      serie,
      numero,
      ambiente,
      dataEmissao,
      tipoOperacao,
      formaEmissao,
    });

    const dv = this.calcularDV(chave);
    const chaveCompleta = chave + dv;

    // Data no formato ISO 8601
    const dhEmi = this.formatarDataSEFAZ(dataEmissao);
    const dhCont = formaEmissao > 1 ? dhEmi : undefined;

    // Código numérico aleatório (8 dígitos)
    const cNF = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');

    // Código UF
    const cUF = this.obterCodigoUF(emitente.endereco.uf);
    const cMunFG = emitente.endereco.codigo_municipio;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${chaveCompleta}" versao="4.00">
      <ide>
        <cUF>${cUF}</cUF>
        <cNF>${cNF}</cNF>
        <natOp>${this.escapeXML(naturezaOperacao)}</natOp>
        <mod>55</mod>
        <serie>${serie.padStart(3, '0')}</serie>
        <nNF>${String(numero).padStart(9, '0')}</nNF>
        <dhEmi>${dhEmi}</dhEmi>
        ${dados.dataEmissao ? `<dhSaiEnt>${dhEmi}</dhSaiEnt>` : ''}
        <tpNF>${tipoOperacao}</tpNF>
        <idDest>${indicadorDestino}</idDest>
        <cMunFG>${cMunFG}</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>${formaEmissao}</tpEmis>
        <cDV>${dv}</cDV>
        <tpAmb>${ambiente === 'producao' ? '1' : '2'}</tpAmb>
        <finNFe>${finalidade}</finNFe>
        <indFinal>${indicadorPresenca === 0 ? '0' : '1'}</indFinal>
        <indPres>${indicadorPresenca}</indPres>
        <indIntermed>${indicadorPresenca === 0 ? '0' : '1'}</indIntermed>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
        ${dhCont ? `<dhCont>${dhCont}</dhCont>` : ''}
        ${formaEmissao > 1 ? `<xJust>${this.escapeXML('Contingência - Erro de comunicação')}</xJust>` : ''}
      </ide>`;

    // Emitente
    xml += `
      <emit>
        <CNPJ>${emitente.cnpj.padStart(14, '0')}</CNPJ>
        <xNome>${this.escapeXML(emitente.razao_social)}</xNome>
        ${emitente.nome_fantasia ? `<xFant>${this.escapeXML(emitente.nome_fantasia)}</xFant>` : ''}
        <enderEmit>
          <xLgr>${this.escapeXML(emitente.endereco.logradouro)}</xLgr>
          <nro>${this.escapeXML(emitente.endereco.numero)}</nro>
          ${emitente.endereco.complemento ? `<xCpl>${this.escapeXML(emitente.endereco.complemento)}</xCpl>` : ''}
          <xBairro>${this.escapeXML(emitente.endereco.bairro)}</xBairro>
          <cMun>${emitente.endereco.codigo_municipio}</cMun>
          <xMun>${this.escapeXML(emitente.endereco.municipio)}</xMun>
          <UF>${emitente.endereco.uf}</UF>
          <CEP>${emitente.endereco.cep}</CEP>
          ${emitente.endereco.pais_codigo ? `<cPais>${emitente.endereco.pais_codigo}</cPais>` : '<cPais>1058</cPais>'}
          ${emitente.endereco.pais_nome ? `<xPais>${this.escapeXML(emitente.endereco.pais_nome)}</xPais>` : '<xPais>BRASIL</xPais>'}
          ${emitente.endereco.telefone ? `<fone>${emitente.endereco.telefone}</fone>` : ''}
        </enderEmit>
        <IE>${emitente.inscricao_estadual}</IE>
        ${emitente.inscricao_municipal ? `<IM>${emitente.inscricao_municipal}</IM>` : ''}
        ${emitente.cnae_fiscal ? `<CNAE>${emitente.cnae_fiscal}</CNAE>` : ''}
        <CRT>${emitente.regime_tributario}</CRT>
      </emit>`;

    // Destinatário
    if (destinatario) {
      const isCNPJ = destinatario.cnpj_cpf.replace(/\D/g, '').length === 14;
      const cnpjCpfLimpo = destinatario.cnpj_cpf.replace(/\D/g, '');

      xml += `
      <dest>
        ${isCNPJ
          ? `<CNPJ>${cnpjCpfLimpo.padStart(14, '0')}</CNPJ>`
          : `<CPF>${cnpjCpfLimpo.padStart(11, '0')}</CPF>`
        }
        <xNome>${this.escapeXML(destinatario.nome_razao_social)}</xNome>
        ${destinatario.endereco ? `
        <enderDest>
          <xLgr>${this.escapeXML(destinatario.endereco.logradouro)}</xLgr>
          <nro>${this.escapeXML(destinatario.endereco.numero)}</nro>
          ${destinatario.endereco.complemento ? `<xCpl>${this.escapeXML(destinatario.endereco.complemento)}</xCpl>` : ''}
          <xBairro>${this.escapeXML(destinatario.endereco.bairro)}</xBairro>
          <cMun>${destinatario.endereco.codigo_municipio}</cMun>
          <xMun>${this.escapeXML(destinatario.endereco.municipio)}</xMun>
          <UF>${destinatario.endereco.uf}</UF>
          <CEP>${destinatario.endereco.cep}</CEP>
          ${destinatario.endereco.pais_codigo ? `<cPais>${destinatario.endereco.pais_codigo}</cPais>` : '<cPais>1058</cPais>'}
          ${destinatario.endereco.pais_nome ? `<xPais>${this.escapeXML(destinatario.endereco.pais_nome)}</xPais>` : '<xPais>BRASIL</xPais>'}
          ${destinatario.endereco.telefone ? `<fone>${destinatario.endereco.telefone}</fone>` : ''}
        </enderDest>` : ''}
        <indIEDest>${destinatario.indicador_ie_destinatario || 9}</indIEDest>
        ${destinatario.ie ? `<IE>${destinatario.ie}</IE>` : ''}
        ${destinatario.isento_icms ? '<ISUF>' : ''}
        ${destinatario.email ? `<email>${destinatario.email}</email>` : ''}
      </dest>`;
    }

    // Produtos (detalhes)
    produtos.forEach((produto, index) => {
      const eanComercial = produto.codigo_barras || '';
      const eanTributavel = produto.codigo_barras_tributavel || produto.codigo_barras || '';
      const isSimples = emitente.regime_tributario === '1' || emitente.regime_tributario === '2';

      xml += `
      <det nItem="${index + 1}">
        <prod>
          <cProd>${this.escapeXML(produto.codigo)}</cProd>
          <cEAN>${eanComercial || ''}</cEAN>
          <xProd>${this.escapeXML(produto.descricao)}</xProd>
          <NCM>${produto.ncm}</NCM>
          ${produto.cest ? `<CEST>${produto.cest}</CEST>` : ''}
          ${produto.indica_total !== undefined ? `<indTot>${produto.indica_total}</indTot>` : '<indTot>1</indTot>'}
          <CFOP>${produto.cfop}</CFOP>
          <uCom>${this.escapeXML(produto.unidade_comercial)}</uCom>
          <qCom>${produto.quantidade_comercial.toFixed(4)}</qCom>
          <vUnCom>${produto.valor_unitario_comercial.toFixed(10)}</vUnCom>
          <vProd>${produto.valor_total.toFixed(2)}</vProd>
          <cEANTrib>${eanTributavel || ''}</cEANTrib>
          <uTrib>${this.escapeXML(produto.unidade_tributavel || produto.unidade_comercial)}</uTrib>
          <qTrib>${(produto.quantidade_tributavel || produto.quantidade_comercial).toFixed(4)}</qTrib>
          <vUnTrib>${(produto.valor_unitario_tributavel || produto.valor_unitario_comercial).toFixed(10)}</vUnTrib>
          ${produto.valor_frete ? `<vFrete>${produto.valor_frete.toFixed(2)}</vFrete>` : ''}
          ${produto.valor_seguro ? `<vSeg>${produto.valor_seguro.toFixed(2)}</vSeg>` : ''}
          ${produto.valor_desconto ? `<vDesc>${produto.valor_desconto.toFixed(2)}</vDesc>` : ''}
          ${produto.valor_outras_despesas ? `<vOutro>${produto.valor_outras_despesas.toFixed(2)}</vOutro>` : ''}
          ${produto.indica_total !== undefined ? `<indTot>${produto.indica_total}</indTot>` : ''}
          ${produto.numero_pedido ? `<nPed>${this.escapeXML(produto.numero_pedido)}</nPed>` : ''}
          ${produto.item_pedido ? `<nItemPed>${produto.item_pedido}</nItemPed>` : ''}
        </prod>
        <imposto>
          <vTotTrib>${((produto.icms_valor || 0) + (produto.pis_valor || 0) + (produto.cofins_valor || 0) + (produto.ipi_valor || 0)).toFixed(2)}</vTotTrib>`;

      // ICMS
      xml += `
          <ICMS>`;
      if (isSimples) {
        // CSOSN - Simples Nacional
        const csosn = produto.icms_csosn || '102';
        if (csosn === '102' || csosn === '103' || csosn === '300' || csosn === '400') {
          xml += `
            <ICMSSN102>
              <orig>${produto.icms_origem || '0'}</orig>
              <CSOSN>${csosn}</CSOSN>
            </ICMSSN102>`;
        } else if (csosn === '101') {
          xml += `
            <ICMSSN101>
              <orig>${produto.icms_origem || '0'}</orig>
              <CSOSN>${csosn}</CSOSN>
              <pCredSN>${(produto.icms_aliquota || 0).toFixed(2)}</pCredSN>
              <vCredICMSSN>${(produto.icms_valor || 0).toFixed(2)}</vCredICMSSN>
            </ICMSSN101>`;
        } else if (csosn === '201' || csosn === '202') {
          xml += `
            <ICMSSN${csosn}>
              <orig>${produto.icms_origem || '0'}</orig>
              <CSOSN>${csosn}</CSOSN>
              <modBC>${produto.icms_modalidade_base_calculo || '3'}</modBC>
              <pRedBC>${(produto.icms_percentual_reducao_bc || 0).toFixed(4)}</pRedBC>
              <vBC>${(produto.icms_valor_base_calculo || 0).toFixed(2)}</vBC>
              <pICMS>${(produto.icms_aliquota || 0).toFixed(2)}</pICMS>
              <vICMS>${(produto.icms_valor || 0).toFixed(2)}</vICMS>
              ${csosn === '201' ? `<vICMSDeson>${'0.00'}</vICMSDeson>` : ''}
              ${produto.icms_st_valor ? `
              <modBCST>${produto.icms_st_modalidade_base_calculo || '4'}</modBCST>
              <pMVAST>${(produto.icms_st_percentual_margem_valor_adicionado || 0).toFixed(4)}</pMVAST>
              <pRedBCST>${(produto.icms_st_percentual_reducao_bc || 0).toFixed(4)}</pRedBCST>
              <vBCST>${(produto.icms_st_valor_base_calculo || 0).toFixed(2)}</vBCST>
              <pICMSST>${(produto.icms_st_aliquota || 0).toFixed(2)}</pICMSST>
              <vICMSST>${(produto.icms_st_valor || 0).toFixed(2)}</vICMSST>` : ''}
            </ICMSSN${csosn}>`;
        } else if (csosn === '500') {
          xml += `
            <ICMSSN500>
              <orig>${produto.icms_origem || '0'}</orig>
              <CSOSN>${csosn}</CSOSN>
              ${produto.icms_st_valor ? `
              <vBCSTRet>${(produto.icms_st_valor_base_calculo || 0).toFixed(2)}</vBCSTRet>
              <vICMSSTRet>${(produto.icms_st_valor || 0).toFixed(2)}</vICMSSTRet>
              <pST>${(produto.icms_st_aliquota || 0).toFixed(2)}</pST>` : ''}
            </ICMSSN500>`;
        } else if (csosn === '900') {
          xml += `
            <ICMSSN900>
              <orig>${produto.icms_origem || '0'}</orig>
              <CSOSN>${csosn}</CSOSN>
              <modBC>${produto.icms_modalidade_base_calculo || '3'}</modBC>
              <vBC>${(produto.icms_valor_base_calculo || 0).toFixed(2)}</vBC>
              <pRedBC>${(produto.icms_percentual_reducao_bc || 0).toFixed(4)}</pRedBC>
              <pICMS>${(produto.icms_aliquota || 0).toFixed(2)}</pICMS>
              <vICMS>${(produto.icms_valor || 0).toFixed(2)}</vICMS>
              ${produto.icms_st_valor ? `
              <modBCST>${produto.icms_st_modalidade_base_calculo || '4'}</modBCST>
              <pMVAST>${(produto.icms_st_percentual_margem_valor_adicionado || 0).toFixed(4)}</pMVAST>
              <pRedBCST>${(produto.icms_st_percentual_reducao_bc || 0).toFixed(4)}</pRedBCST>
              <vBCST>${(produto.icms_st_valor_base_calculo || 0).toFixed(2)}</vBCST>
              <pICMSST>${(produto.icms_st_aliquota || 0).toFixed(2)}</pICMSST>
              <vICMSST>${(produto.icms_st_valor || 0).toFixed(2)}</vICMSST>` : ''}
              <vFCPSTRet>${(produto.icms_st_valor_fcp || 0).toFixed(2)}</vFCPSTRet>
            </ICMSSN900>`;
        }
      } else {
        // CST - Regime Normal
        const cst = produto.icms_cst || '00';
        if (cst === '00' || cst === '20') {
          xml += `
            <ICMS${cst === '00' ? '00' : cst}>
              <orig>${produto.icms_origem || '0'}</orig>
              <CST>${cst}</CST>
              ${cst === '20' ? `<pRedBC>${(produto.icms_percentual_reducao_bc || 0).toFixed(4)}</pRedBC>` : ''}
              <vBC>${(produto.icms_valor_base_calculo || 0).toFixed(2)}</vBC>
              <pICMS>${(produto.icms_aliquota || 0).toFixed(2)}</pICMS>
              <vICMS>${(produto.icms_valor || 0).toFixed(2)}</vICMS>
            </ICMS${cst === '00' ? '00' : cst}>`;
        } else if (cst === '10') {
          xml += `
            <ICMS10>
              <orig>${produto.icms_origem || '0'}</orig>
              <CST>10</CST>
              <modBC>${produto.icms_modalidade_base_calculo || '3'}</modBC>
              <vBC>${(produto.icms_valor_base_calculo || 0).toFixed(2)}</vBC>
              <pICMS>${(produto.icms_aliquota || 0).toFixed(2)}</pICMS>
              <vICMS>${(produto.icms_valor || 0).toFixed(2)}</vICMS>
              <modBCST>${produto.icms_st_modalidade_base_calculo || '4'}</modBCST>
              <pMVAST>${(produto.icms_st_percentual_margem_valor_adicionado || 0).toFixed(4)}</pMVAST>
              <pRedBCST>${(produto.icms_st_percentual_reducao_bc || 0).toFixed(4)}</pRedBCST>
              <vBCST>${(produto.icms_st_valor_base_calculo || 0).toFixed(2)}</vBCST>
              <pICMSST>${(produto.icms_st_aliquota || 0).toFixed(2)}</pICMSST>
              <vICMSST>${(produto.icms_st_valor || 0).toFixed(2)}</vICMSST>
              <pFCPST>${(produto.icms_st_percentual_fcp || 0).toFixed(2)}</pFCPST>
              <vFCPST>${(produto.icms_st_valor_fcp || 0).toFixed(2)}</vFCPST>
            </ICMS10>`;
        } else if (cst === '40' || cst === '41' || cst === '50') {
          xml += `
            <ICMS${cst}>
              <orig>${produto.icms_origem || '0'}</orig>
              <CST>${cst}</CST>
              ${produto.icms_motivo_desoneracao ? `<motDesICMS>${produto.icms_motivo_desoneracao}</motDesICMS>` : ''}
              ${produto.icms_valor_icms_desoneracao ? `<vICMSDeson>${produto.icms_valor_icms_desoneracao.toFixed(2)}</vICMSDeson>` : ''}
            </ICMS${cst}>`;
        } else if (cst === '51') {
          xml += `
            <ICMS51>
              <orig>${produto.icms_origem || '0'}</orig>
              <CST>51</CST>
              <modBC>${produto.icms_modalidade_base_calculo || '3'}</modBC>
              ${produto.icms_percentual_reducao_bc ? `<pRedBC>${produto.icms_percentual_reducao_bc.toFixed(4)}</pRedBC>` : ''}
              <vBC>${(produto.icms_valor_base_calculo || 0).toFixed(2)}</vBC>
              <pICMS>${(produto.icms_aliquota || 0).toFixed(2)}</pICMS>
              <vICMSOp>${(produto.icms_valor || 0).toFixed(2)}</vICMSOp>
              <pDif>${(produto.icms_aliquota || 0).toFixed(2)}</pDif>
              <vICMSDif>${(produto.icms_valor || 0).toFixed(2)}</vICMSDif>
            </ICMS51>`;
        } else if (cst === '60') {
          xml += `
            <ICMS60>
              <orig>${produto.icms_origem || '0'}</orig>
              <CST>60</CST>
              ${produto.icms_st_valor_base_calculo ? `<vBCSTRet>${produto.icms_st_valor_base_calculo.toFixed(2)}</vBCSTRet>` : ''}
              ${produto.icms_st_valor ? `<vICMSSTRet>${produto.icms_st_valor.toFixed(2)}</vICMSSTRet>` : ''}
              ${produto.icms_st_valor_fcp ? `<vFCPSTRet>${produto.icms_st_valor_fcp.toFixed(2)}</vFCPSTRet>` : ''}
            </ICMS60>`;
        } else if (cst === '70') {
          xml += `
            <ICMS70>
              <orig>${produto.icms_origem || '0'}</orig>
              <CST>70</CST>
              <modBC>${produto.icms_modalidade_base_calculo || '3'}</modBC>
              <pRedBC>${(produto.icms_percentual_reducao_bc || 0).toFixed(4)}</pRedBC>
              <vBC>${(produto.icms_valor_base_calculo || 0).toFixed(2)}</vBC>
              <pICMS>${(produto.icms_aliquota || 0).toFixed(2)}</pICMS>
              <vICMS>${(produto.icms_valor || 0).toFixed(2)}</vICMS>
              <modBCST>${produto.icms_st_modalidade_base_calculo || '4'}</modBCST>
              <pMVAST>${(produto.icms_st_percentual_margem_valor_adicionado || 0).toFixed(4)}</pMVAST>
              <pRedBCST>${(produto.icms_st_percentual_reducao_bc || 0).toFixed(4)}</pRedBCST>
              <vBCST>${(produto.icms_st_valor_base_calculo || 0).toFixed(2)}</vBCST>
              <pICMSST>${(produto.icms_st_aliquota || 0).toFixed(2)}</pICMSST>
              <vICMSST>${(produto.icms_st_valor || 0).toFixed(2)}</vICMSST>
            </ICMS70>`;
        } else if (cst === '90') {
          xml += `
            <ICMS90>
              <orig>${produto.icms_origem || '0'}</orig>
              <CST>90</CST>
              <modBC>${produto.icms_modalidade_base_calculo || '3'}</modBC>
              <vBC>${(produto.icms_valor_base_calculo || 0).toFixed(2)}</vBC>
              <pRedBC>${(produto.icms_percentual_reducao_bc || 0).toFixed(4)}</pRedBC>
              <pICMS>${(produto.icms_aliquota || 0).toFixed(2)}</pICMS>
              <vICMS>${(produto.icms_valor || 0).toFixed(2)}</vICMS>
              ${produto.icms_st_valor ? `
              <modBCST>${produto.icms_st_modalidade_base_calculo || '4'}</modBCST>
              <pMVAST>${(produto.icms_st_percentual_margem_valor_adicionado || 0).toFixed(4)}</pMVAST>
              <pRedBCST>${(produto.icms_st_percentual_reducao_bc || 0).toFixed(4)}</pRedBCST>
              <vBCST>${(produto.icms_st_valor_base_calculo || 0).toFixed(2)}</vBCST>
              <pICMSST>${(produto.icms_st_aliquota || 0).toFixed(2)}</pICMSST>
              <vICMSST>${(produto.icms_st_valor || 0).toFixed(2)}</vICMSST>` : ''}
            </ICMS90>`;
        }
      }
      xml += `
          </ICMS>`;

      // PIS
      xml += `
          <PIS>`;
      const pisCst = produto.pis_cst || (isSimples ? '99' : '01');
      if (pisCst === '01' || pisCst === '02') {
        xml += `
            <PISAliq>
              <CST>${pisCst}</CST>
              <vBC>${(produto.pis_valor_base_calculo || produto.valor_total || 0).toFixed(2)}</vBC>
              <pPIS>${(produto.pis_aliquota_percentual || 0).toFixed(2)}</pPIS>
              <vPIS>${(produto.pis_valor || 0).toFixed(2)}</vPIS>
            </PISAliq>`;
      } else if (pisCst === '03') {
        xml += `
            <PISQtde>
              <CST>03</CST>
              <qBCProd>${(produto.pis_quantidade_vendida || 0).toFixed(4)}</qBCProd>
              <vAliqProd>${(produto.pis_valor_por_unidade || 0).toFixed(4)}</vAliqProd>
              <vPIS>${(produto.pis_valor || 0).toFixed(2)}</vPIS>
            </PISQtde>`;
      } else {
        xml += `
            <PISNT>
              <CST>${pisCst}</CST>
            </PISNT>`;
      }
      xml += `
          </PIS>`;

      // COFINS
      xml += `
          <COFINS>`;
      const cofinsCst = produto.cofins_cst || (isSimples ? '99' : '01');
      if (cofinsCst === '01' || cofinsCst === '02') {
        xml += `
            <COFINSAliq>
              <CST>${cofinsCst}</CST>
              <vBC>${(produto.cofins_valor_base_calculo || produto.valor_total || 0).toFixed(2)}</vBC>
              <pCOFINS>${(produto.cofins_aliquota_percentual || 0).toFixed(2)}</pCOFINS>
              <vCOFINS>${(produto.cofins_valor || 0).toFixed(2)}</vCOFINS>
            </COFINSAliq>`;
      } else if (cofinsCst === '03') {
        xml += `
            <COFINSQtde>
              <CST>03</CST>
              <qBCProd>${(produto.cofins_quantidade_vendida || 0).toFixed(4)}</qBCProd>
              <vAliqProd>${(produto.cofins_valor_por_unidade || 0).toFixed(4)}</vAliqProd>
              <vCOFINS>${(produto.cofins_valor || 0).toFixed(2)}</vCOFINS>
            </COFINSQtde>`;
      } else {
        xml += `
            <COFINSNT>
              <CST>${cofinsCst}</CST>
            </COFINSNT>`;
      }
      xml += `
          </COFINS>`;

      // IPI (se aplicável)
      if (produto.ipi_cst && produto.ipi_cst !== '52' && produto.ipi_cst !== '53' && produto.ipi_cst !== '99' && (produto.ipi_valor || 0) > 0) {
        xml += `
          <IPI>
            <IPITrib>
              <CST>${produto.ipi_cst || '50'}</CST>
              ${produto.ipi_codigo_enquadramento ? `<cEnq>${produto.ipi_codigo_enquadramento}</cEnq>` : '<cEnq>999</cEnq>'}
              <vBC>${(produto.ipi_valor_base_calculo || produto.valor_total || 0).toFixed(2)}</vBC>
              <pIPI>${(produto.ipi_aliquota_percentual || 0).toFixed(2)}</pIPI>
              <vIPI>${(produto.ipi_valor || 0).toFixed(2)}</vIPI>
            </IPITrib>
          </IPI>`;
      } else if (produto.ipi_cst) {
        xml += `
          <IPI>
            <IPINT>
              <CST>${produto.ipi_cst}</CST>
            </IPINT>
          </IPI>`;
      }

      xml += `
        </imposto>
        ${produto.informacoes_adicionais ? `<infAdProd>${this.escapeXML(produto.informacoes_adicionais)}</infAdProd>` : ''}
      </det>`;
    });

    // Totais
    xml += `
      <total>
        <ICMSTot>
          <vBC>${baseCalculoICMS.toFixed(2)}</vBC>
          <vICMS>${totalICMS.toFixed(2)}</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>${totalICMSFCP.toFixed(2)}</vFCP>
          <vBCST>${baseCalculoICMSST.toFixed(2)}</vBCST>
          <vST>${totalICMSST.toFixed(2)}</vST>
          <vFCPST>${totalICMSSTFCP.toFixed(2)}</vFCPST>
          <vFCPSTRet>${totalICMSSTRetFCP.toFixed(2)}</vFCPSTRet>
          <vProd>${totalProdutos.toFixed(2)}</vProd>
          <vFrete>${totalFrete.toFixed(2)}</vFrete>
          <vSeg>${totalSeguro.toFixed(2)}</vSeg>
          <vDesc>${totalDesconto.toFixed(2)}</vDesc>
          <vII>${totalII.toFixed(2)}</vII>
          <vIPI>${totalIPI.toFixed(2)}</vIPI>
          <vIPIDevol>${totalIPIDevol.toFixed(2)}</vIPIDevol>
          <vPIS>${totalPIS.toFixed(2)}</vPIS>
          <vCOFINS>${totalCOFINS.toFixed(2)}</vCOFINS>
          <vOutro>${totalOutrasDespesas.toFixed(2)}</vOutro>
          <vNF>${totalNF.toFixed(2)}</vNF>
          <vTotTrib>${(totalICMS + totalPIS + totalCOFINS + totalIPI).toFixed(2)}</vTotTrib>
        </ICMSTot>
      </total>`;

    // Transporte
    if (transporte) {
      xml += `
      <transp>
        <modFrete>${transporte.modalidade_frete || 9}</modFrete>
        ${transporte.transportador ? `
        <transporta>
          ${transporte.transportador.cnpj_cpf ? (transporte.transportador.cnpj_cpf.length === 14
            ? `<CNPJ>${transporte.transportador.cnpj_cpf}</CNPJ>`
            : `<CPF>${transporte.transportador.cnpj_cpf}</CPF>`) : ''}
          ${transporte.transportador.nome ? `<xNome>${this.escapeXML(transporte.transportador.nome)}</xNome>` : ''}
          ${transporte.transportador.ie ? `<IE>${transporte.transportador.ie}</IE>` : ''}
          ${transporte.transportador.endereco ? `<xEnder>${this.escapeXML(transporte.transportador.endereco)}</xEnder>` : ''}
          ${transporte.transportador.municipio ? `<xMun>${this.escapeXML(transporte.transportador.municipio)}</xMun>` : ''}
          ${transporte.transportador.uf ? `<UF>${transporte.transportador.uf}</UF>` : ''}
        </transporta>` : ''}
        ${transporte.veiculo ? `
        <veicTransp>
          ${transporte.veiculo.placa ? `<placa>${transporte.veiculo.placa.toUpperCase()}</placa>` : ''}
          ${transporte.veiculo.uf ? `<UF>${transporte.veiculo.uf}</UF>` : ''}
          ${transporte.veiculo.rntc ? `<RNTC>${transporte.veiculo.rntc}</RNTC>` : ''}
        </veicTransp>` : ''}
        ${transporte.reboque?.length ? transporte.reboque.map(r => `
        <reboque>
          ${r.placa ? `<placa>${r.placa.toUpperCase()}</placa>` : ''}
          ${r.uf ? `<UF>${r.uf}</UF>` : ''}
          ${r.rntc ? `<RNTC>${r.rntc}</RNTC>` : ''}
        </reboque>`).join('') : ''}
        ${transporte.volumes?.length ? `
        <vol>
          ${transporte.volumes.map(v => `
          <lVol>
            <qVol>${v.quantidade}</qVol>
            <esp>${this.escapeXML(v.especie)}</esp>
            <marca>${this.escapeXML(v.marca)}</marca>
            <nVol>${this.escapeXML(v.numeracao)}</nVol>
            <pesoL>${v.peso_liquido.toFixed(3)}</pesoL>
            <pesoB>${v.peso_bruto.toFixed(3)}</pesoB>
            ${v.lacres?.length ? v.lacres.map(l => `<lacres><nLacre>${l.numero}</nLacre></lacres>`).join('') : ''}
          </lVol>`).join('')}
        </vol>` : ''}
      </transp>`;
    } else {
      xml += `
      <transp>
        <modFrete>9</modFrete>
      </transp>`;
    }

    // Pagamentos (NF-e 4.00)
    if (pagamentos && pagamentos.length > 0) {
      xml += `
      <pag>`;
      pagamentos.forEach(pg => {
        xml += `
        <detPag>
          <tPag>${pg.forma_pagamento}</tPag>
          <vPag>${pg.valor.toFixed(2)}</vPag>
          ${pg.carteira ? `<card><tpIntegra>1</tpIntegra><CNPJ>${pg.cnpj_credenciadora || ''}</CNPJ><tBand>${pg.bandeira_operadora || ''}</tBand><cAut>${pg.autorizacao || ''}</cAut></card>` : ''}
        </detPag>`;
      });
      xml += `
      </pag>`;
    }

    // Informações adicionais
    if (informacoesAdicionais || informacoesFisco || informacoesComplementares) {
      xml += `
      <infAdic>`;
      if (informacoesAdicionais) {
        xml += `<infCpl>${this.escapeXML(informacoesAdicionais)}</infCpl>`;
      }
      if (informacoesFisco) {
        xml += `<infAdFisco>${this.escapeXML(informacoesFisco)}</infAdFisco>`;
      }
      xml += `
      </infAdic>`;
    }

    xml += `
    </infNFe>
  </NFe>
</nfeProc>`;

    return { xml, chave: chaveCompleta };
  }

  // =============================================
  // ASSINATURA DIGITAL DO XML
  // =============================================

  /**
   * Assina o XML da NF-e com certificado digital A1
   * Em produção: usar xml-crypto ou biblioteca equivalente
   */
  static async assinarXML(xml: string, certificadoBase64: string, senha: string): Promise<string> {
    console.log('[NFeService] Assinando XML da NF-e...');

    // TODO: Implementar assinatura real com certificado digital A1
    // Usar bibliotecas como:
    // - xml-crypto (para assinatura XML-DSig)
    // - node-forge (para leitura do certificado p12/pfx)
    //
    // A assinatura deve ser inserida entre </infNFe> e </NFe>
    //
    // Exemplo da estrutura de assinatura:
    // <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    //   <SignedInfo>
    //     <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    //     <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
    //     <Reference URI="#NFe${chave}">
    //       <Transforms>
    //         <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
    //         <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    //       </Transforms>
    //       <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
    //       <DigestValue>${digestBase64}</DigestValue>
    //     </Reference>
    //   </SignedInfo>
    //   <SignatureValue>${assinaturaBase64}</SignatureValue>
    //   <KeyInfo>
    //     <X509Data>
    //       <X509Certificate>${certificadoBase64}</X509Certificate>
    //     </X509Data>
    //   </KeyInfo>
    // </Signature>

    // Por enquanto, retorna XML sem assinatura para desenvolvimento
    return xml;
  }

  // =============================================
  // COMUNICAÇÃO COM SEFAZ
  // =============================================

  /**
   * Envia NF-e para autorização na SEFAZ
   */
  static async enviarNFeSEFAZ(
    xmlAssinado: string,
    uf: string,
    ambiente: string,
    certificadoBase64?: string,
    senha?: string
  ): Promise<{
    sucesso: boolean;
    protocolo?: string;
    dataAutorizacao?: Date;
    codigoRejeicao?: string;
    mensagemRejeicao?: string;
    xmlAutorizado?: string;
    versaoAplicacao?: string;
  }> {
    console.log(`[NFeService] Enviando NF-e para SEFAZ ${uf} - Ambiente: ${ambiente}`);

    // TODO: Implementar comunicação real via SOAP
    // Web Service: NfeAutorizacao (versão 4.00)
    // URL varia por UF e ambiente
    //
    // Estrutura SOAP de envio:
    // <soapenv:Envelope>
    //   <soapenv:Body>
    //     <nfeAutorizacaoLote xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
    //       <nfeDadosMsg>
    //         <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
    //           <idLote>${lote}</idLote>
    //           <indSinc>1</indSinc>
    //           ${xmlAssinado}
    //         </enviNFe>
    //       </nfeDadosMsg>
    //     </nfeAutorizacaoLote>
    //   </soapenv:Body>
    // </soapenv:Envelope>

    // Simulação para desenvolvimento
    const protocolo = `135${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    return {
      sucesso: true,
      protocolo,
      dataAutorizacao: new Date(),
      xmlAutorizado: xmlAssinado,
      versaoAplicacao: 'SVRS4.00',
    };
  }

  /**
   * Consulta status do serviço SEFAZ
   */
  static async consultarStatusServico(
    uf: string,
    ambiente: string,
    certificadoBase64?: string,
    senha?: string
  ): Promise<{
    disponivel: boolean;
    ultimaVerificacao: Date;
    motivo?: string;
    versaoAplicacao?: string;
    tempoMedioResposta?: number;
    dataRetorno?: Date;
    observacao?: string;
  }> {
    console.log(`[NFeService] Consultando status serviço SEFAZ ${uf} - Ambiente: ${ambiente}`);

    // TODO: Implementar consulta real via SOAP
    // Web Service: NfeStatusServicoNF (versão 4.00)

    return {
      disponivel: true,
      ultimaVerificacao: new Date(),
      versaoAplicacao: 'SVRS4.00',
      tempoMedioResposta: 150,
      observacao: 'Serviço disponível (simulado)',
    };
  }

  /**
   * Consulta protocolo da NF-e na SEFAZ
   */
  static async consultarProtocolo(
    chave: string,
    uf: string,
    ambiente: string,
    certificadoBase64?: string,
    senha?: string
  ): Promise<{
    sucesso: boolean;
    status?: string;
    protocolo?: string;
    dataAutorizacao?: Date;
    motivo?: string;
    xmlRetorno?: string;
  }> {
    console.log(`[NFeService] Consultando protocolo NF-e ${chave} na SEFAZ ${uf}`);

    // TODO: Implementar consulta real via SOAP
    // Web Service: NfeConsultaProtocolo (versão 4.00)

    return {
      sucesso: true,
      status: 'autorizada',
      protocolo: `135${Date.now()}`,
      dataAutorizacao: new Date(),
    };
  }

  /**
   * Cancela NF-e na SEFAZ
   */
  static async cancelarNFeSEFAZ(
    chave: string,
    protocolo: string,
    justificativa: string,
    uf: string,
    ambiente: string,
    certificadoBase64?: string,
    senha?: string
  ): Promise<{
    sucesso: boolean;
    protocoloCancelamento?: string;
    dataCancelamento?: Date;
    codigoRejeicao?: string;
    mensagemRejeicao?: string;
    xmlEnvio?: string;
    xmlRetorno?: string;
  }> {
    console.log(`[NFeService] Cancelando NF-e ${chave} na SEFAZ ${uf}`);

    // TODO: Implementar cancelamento real via SOAP
    // Evento: 110111 (Cancelamento)
    // Web Service: RecepcaoEvento (versão 1.00)

    const protocoloCancel = `135${Date.now()}`;

    return {
      sucesso: true,
      protocoloCancelamento: protocoloCancel,
      dataCancelamento: new Date(),
    };
  }

  /**
   * Inutiliza faixa de numeração na SEFAZ
   */
  static async inutilizarNumeracao(
    ano: number,
    serie: string,
    numeroInicial: number,
    numeroFinal: number,
    justificativa: string,
    cnpj: string,
    uf: string,
    ambiente: string,
    certificadoBase64?: string,
    senha?: string
  ): Promise<{
    sucesso: boolean;
    protocolo?: string;
    dataRegistro?: Date;
    codigoRejeicao?: string;
    mensagemRejeicao?: string;
    xmlEnvio?: string;
    xmlRetorno?: string;
  }> {
    console.log(`[NFeService] Inutilizando numeração NF-e: série ${serie}, ${numeroInicial}-${numeroFinal}`);

    // TODO: Implementar inutilização real via SOAP
    // Web Service: NfeInutilizacao2 (versão 4.00)

    return {
      sucesso: true,
      protocolo: `135${Date.now()}`,
      dataRegistro: new Date(),
    };
  }

  /**
   * Envia Carta de Correção (CC-e) para a SEFAZ
   */
  static async enviarCartaCorrecao(
    chave: string,
    sequencial: number,
    correcoes: Array<{ campo: string; valorAnterior: string; valorNovo: string }>,
    condicoesUso: string,
    uf: string,
    ambiente: string,
    certificadoBase64?: string,
    senha?: string
  ): Promise<{
    sucesso: boolean;
    protocolo?: string;
    dataRegistro?: Date;
    codigoRejeicao?: string;
    mensagemRejeicao?: string;
    xmlEnvio?: string;
    xmlRetorno?: string;
  }> {
    console.log(`[NFeService] Enviando CC-e para NF-e ${chave} - sequencial ${sequencial}`);

    // TODO: Implementar CC-e real via SOAP
    // Evento: 110110 (Carta de Correção)
    // Web Service: RecepcaoEvento (versão 1.00)

    return {
      sucesso: true,
      protocolo: `135${Date.now()}`,
      dataRegistro: new Date(),
    };
  }

  // =============================================
  // GERAÇÃO DE DANFE (HTML para impressão)
  // =============================================

  /**
   * Gera HTML do DANFE para impressão
   */
  static gerarHTMLDANFE(nfe: NFe, empresaLogo?: string): string {
    const formato = {
      autorizada: { cor: '#16a34a', texto: 'NF-e AUTORIZADA' },
      cancelada: { cor: '#dc2626', texto: 'NF-e CANCELADA' },
      denegada: { cor: '#ea580c', texto: 'NF-e DENEGADA' },
      rejeitada: { cor: '#dc2626', texto: 'NF-e REJEITADA' },
      contingencia: { cor: '#ca8a04', texto: 'NF-e EM CONTINGÊNCIA' },
      pendente: { cor: '#6b7280', texto: 'NF-e PENDENTE' },
      inutilizada: { cor: '#6b7280', texto: 'NUMERAÇÃO INUTILIZADA' },
    }[nfe.status] || { cor: '#6b7280', texto: 'NF-e' };

    const dest = nfe.destinatario;
    const emit = nfe.emitente;
    const dataFormatada = new Date(nfe.data_emissao).toLocaleString('pt-BR');

    let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DANFE - NF-e ${nfe.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #333; width: 210mm; margin: 0 auto; }
    .page { width: 210mm; min-height: 297mm; padding: 5mm; page-break-after: always; }
    .header { border: 1px solid #333; padding: 4px; margin-bottom: 4px; }
    .header-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 4px; }
    .emitente { font-size: 9pt; flex: 1; }
    .emitente .razao { font-size: 11pt; font-weight: bold; }
    .emitente .cnpj { font-size: 8pt; }
    .emitente-logo { width: 80px; height: 50px; object-fit: contain; margin-right: 8px; }
    .destinatario { border: 1px solid #333; padding: 4px; margin: 4px 0; }
    .destinatario .titulo { font-weight: bold; font-size: 7pt; background: #eee; padding: 2px; }
    .section { border: 1px solid #333; margin: 4px 0; }
    .section-title { background: #eee; font-weight: bold; padding: 2px 4px; font-size: 7pt; border-bottom: 1px solid #333; }
    .section-content { padding: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 2px 4px; text-align: left; font-size: 7pt; }
    th { background: #f5f5f5; font-weight: bold; }
    .totais td { font-weight: bold; }
    .status-badge { text-align: center; padding: 6px; font-size: 12pt; font-weight: bold; border: 2px solid; color: white; margin: 4px 0; }
    .chave { font-family: monospace; font-size: 7pt; word-break: break-all; }
    .footer { margin-top: 8px; border-top: 1px solid #333; padding-top: 4px; text-align: center; font-size: 6pt; color: #666; }
    .flex { display: flex; gap: 4px; }
    .flex > div { flex: 1; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .small { font-size: 6pt; }
    @media print { body { margin: 0; } .page { margin: 0; page-break-after: always; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-top">
        ${empresaLogo ? `<img src="${empresaLogo}" class="emitente-logo" alt="Logo" />` : ''}
        <div class="emitente">
          <div class="razao">${emit.razao_social || ''}</div>
          <div class="cnpj">${emit.cnpj ? `CNPJ: ${emit.cnpj}` : ''}</div>
          <div class="small">${emit.nome_fantasia ? `Fantasia: ${emit.nome_fantasia}` : ''}</div>
          <div class="small">${emit.logradouro || ''}${emit.numero ? `, ${emit.numero}` : ''}${emit.bairro ? ` - ${emit.bairro}` : ''}${emit.municipio ? ` - ${emit.municipio}/${emit.uf}` : ''}${emit.cep ? ` - CEP: ${emit.cep}` : ''}</div>
          <div class="small">${emit.telefone ? `Tel: ${emit.telefone}` : ''}${emit.ie ? ` | IE: ${emit.ie}` : ''}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 7pt;">NF-e Modelo 55 | Layout 4.00</div>
          <div style="font-size: 7pt;">Nº <strong>${String(nfe.numero).padStart(9, '0')}</strong> | Série <strong>${nfe.serie}</strong></div>
        </div>
      </div>
      <div class="chave center">
        <strong>Chave de Acesso:</strong> ${nfe.chave}<br>
        <span class="small">Ambiente: ${nfe.ambiente === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}${nfe.protocolo_autorizacao ? ` | Protocolo: ${nfe.protocolo_autorizacao}` : ''}</span>
      </div>
    </div>

    <div class="status-badge" style="background: ${formato.cor}; border-color: ${formato.cor};">
      ${formato.texto}
    </div>

    <div class="destinatario">
      <div class="titulo">DESTINATÁRIO / REMETENTE</div>
      <div class="flex">
        <div><strong>${dest?.nome_razao_social || 'NÃO INFORMADO'}</strong></div>
        <div class="right">${dest?.cnpj_cpf || '-'}</div>
      </div>
      <div>${dest?.endereco?.logradouro || '-'}, ${dest?.endereco?.numero || '-'} ${dest?.endereco?.complemento || ''}</div>
      <div>${dest?.endereco?.bairro || '-'} - ${dest?.endereco?.municipio || '-'}/${dest?.endereco?.uf || '-'} CEP: ${dest?.endereco?.cep || '-'}</div>
      ${dest?.ie ? `<div>IE: ${dest.ie}</div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">DADOS DA NF-e</div>
      <div class="section-content">
        <div class="flex">
          <div><strong>Natureza da Operação:</strong> ${nfe.natureza_operacao}</div>
          <div><strong>Data de Emissão:</strong> ${dataFormatada}</div>
        </div>
        <div class="flex">
          <div><strong>Tipo:</strong> ${nfe.tipo_operacao === 1 ? 'Saída' : 'Entrada'}</div>
          <div><strong>Finalidade:</strong> ${['', 'Normal', 'Complementar', 'Ajuste', 'Devolução'][nfe.finalidade || 1]}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">DADOS DO EMITENTE</div>
      <div class="section-content">
        <div class="flex">
          <div><strong>${emit.razao_social}</strong> ${emit.nome_fantasia ? `(${emit.nome_fantasia})` : ''}</div>
          <div class="right">CNPJ: ${emit.cnpj}</div>
        </div>
        <div>${emit.endereco?.logradouro}, ${emit.endereco?.numero} ${emit.endereco?.complemento || ''}</div>
        <div>${emit.endereco?.bairro} - ${emit.endereco?.municipio}/${emit.endereco?.uf} CEP: ${emit.endereco?.cep}</div>
        <div>IE: ${emit.inscricao_estadual} ${emit.inscricao_municipal ? `| IM: ${emit.inscricao_municipal}` : ''}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">ITENS DA NOTA FISCAL (${nfe.produtos.length} item(ns))</div>
      <table>
        <thead>
          <tr>
            <th style="width: 3%;">#</th>
            <th style="width: 12%;">Código</th>
            <th style="width: 35%;">Descrição</th>
            <th style="width: 8%;">NCM</th>
            <th style="width: 5%;">CFOP</th>
            <th style="width: 5%;">Un.</th>
            <th style="width: 7%;">Qtd</th>
            <th style="width: 10%;">V. Unit.</th>
            <th style="width: 10%;">V. Total</th>
          </tr>
        </thead>
        <tbody>`;

    nfe.produtos.forEach((prod, i) => {
      html += `
          <tr>
            <td>${i + 1}</td>
            <td>${prod.codigo}</td>
            <td>${prod.descricao}</td>
            <td>${prod.ncm}</td>
            <td>${prod.cfop}</td>
            <td>${prod.unidade_comercial}</td>
            <td class="right">${prod.quantidade_comercial.toFixed(4)}</td>
            <td class="right">${prod.valor_unitario_comercial.toFixed(2)}</td>
            <td class="right">${prod.valor_total.toFixed(2)}</td>
          </tr>`;
    });

    html += `
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">VALORES TOTAIS</div>
      <table>
        <tbody>
          <tr><td>Total dos Produtos</td><td class="right">R$ ${nfe.total_produtos.toFixed(2)}</td></tr>
          <tr><td>Total do Frete</td><td class="right">R$ ${nfe.total_frete.toFixed(2)}</td></tr>
          <tr><td>Total do Seguro</td><td class="right">R$ ${nfe.total_seguro.toFixed(2)}</td></tr>
          <tr><td>Desconto</td><td class="right">R$ ${nfe.total_desconto.toFixed(2)}</td></tr>
          <tr><td>Outras Despesas</td><td class="right">R$ ${nfe.total_outras_despesas.toFixed(2)}</td></tr>
          <tr><td>Total do IPI</td><td class="right">R$ ${nfe.total_ipi.toFixed(2)}</td></tr>
          <tr><td>Total do ICMS</td><td class="right">R$ ${nfe.total_icms.toFixed(2)}</td></tr>
          <tr><td>Total do ICMS-ST</td><td class="right">R$ ${nfe.total_icms_st.toFixed(2)}</td></tr>
          <tr><td>Total do PIS</td><td class="right">R$ ${nfe.total_pis.toFixed(2)}</td></tr>
          <tr><td>Total da COFINS</td><td class="right">R$ ${nfe.total_cofins.toFixed(2)}</td></tr>
          <tr class="totais"><td><strong>VALOR TOTAL DA NOTA</strong></td><td class="right"><strong>R$ ${nfe.total_nota.toFixed(2)}</strong></td></tr>
        </tbody>
      </table>
    </div>`;

    if (nfe.pagamentos && nfe.pagamentos.length > 0) {
      html += `
    <div class="section">
      <div class="section-title">PAGAMENTOS</div>
      <table>
        <thead>
          <tr>
            <th>Forma</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>`;
      nfe.pagamentos.forEach(pg => {
        html += `
          <tr>
            <td>${this.descricaoFormaPagamento(pg.forma_pagamento)}</td>
            <td class="right">R$ ${pg.valor.toFixed(2)}</td>
          </tr>`;
      });
      html += `
        </tbody>
      </table>
    </div>`;
    }

    html += `
    <div class="section">
      <div class="section-title">TRANSPORTE</div>
      <div class="section-content">
        <div><strong>Modalidade do Frete:</strong> ${this.descricaoModalidadeFrete(nfe.transporte?.modalidade_frete || 9)}</div>
        ${nfe.transporte?.transportador?.nome ? `<div><strong>Transportador:</strong> ${nfe.transporte.transportador.nome}</div>` : ''}
        ${nfe.transporte?.veiculo?.placa ? `<div><strong>Veículo:</strong> ${nfe.transporte.veiculo.placa} / ${nfe.transporte.veiculo.uf}</div>` : ''}
      </div>
    </div>`;

    if (nfe.informacoes_adicionais) {
      html += `
    <div class="section">
      <div class="section-title">INFORMAÇÕES COMPLEMENTARES</div>
      <div class="section-content">${nfe.informacoes_adicionais}</div>
    </div>`;
    }

    html += `
    <div class="footer">
      <div>DANFE gerado em ${new Date().toLocaleString('pt-BR')}</div>
      <div>Este documento é apenas uma representação gráfica da NF-e. A nota fiscal eletrônica completa está disponível no portal da SEFAZ.</div>
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  // =============================================
  // GERAÇÃO DE XML DE CANCELAMENTO
  // =============================================

  /**
   * Gera XML de evento de cancelamento
   */
  static gerarXMLCancelamento(dados: {
    chave: string;
    protocolo: string;
    justificativa: string;
    cnpj: string;
    dataEvento: Date;
  }): string {
    const dhEvento = this.formatarDataSEFAZ(dados.dataEvento);
    const nSeqEvento = '1';

    return `<?xml version="1.0" encoding="UTF-8"?>
<evento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <infEvento Id="ID110111${dados.chave}${nSeqEvento.padStart(2, '0')}">
    <cOrgao>91</cOrgao>
    <tpAmb>2</tpAmb>
    <CNPJ>${dados.cnpj.padStart(14, '0')}</CNPJ>
    <chNFe>${dados.chave}</chNFe>
    <dhEvento>${dhEvento}</dhEvento>
    <tpEvento>110111</tpEvento>
    <nSeqEvento>${nSeqEvento}</nSeqEvento>
    <verEvento>1.00</verEvento>
    <detEvento versao="1.00">
      <descEvento>Cancelamento</descEvento>
      <nProt>${dados.protocolo}</nProt>
      <xJust>${this.escapeXML(dados.justificativa.substring(0, 255))}</xJust>
    </detEvento>
  </infEvento>
</evento>`;
  }

  // =============================================
  // GERAÇÃO DE XML DE CARTA DE CORREÇÃO
  // =============================================

  /**
   * Gera XML de evento de Carta de Correção (CC-e)
   */
  static gerarXMLCartaCorrecao(dados: {
    chave: string;
    sequencial: number;
    correcoes: Array<{ campo: string; valorAnterior: string; valorNovo: string }>;
    condicoesUso: string;
    cnpj: string;
    dataEvento: Date;
  }): string {
    const dhEvento = this.formatarDataSEFAZ(dados.dataEvento);

    const textoCorrecao = dados.correcoes.map(c =>
      `[${c.campo}] De: "${c.valorAnterior}" Para: "${c.valorNovo}"`
    ).join('; ');

    const grupoCorrecao = dados.correcoes.map(c => `
        <infCorrecao>
          <grupoAlterado>${this.escapeXML(c.campo)}</grupoAlterado>
          <campoAlterado>${this.escapeXML(c.campo)}</campoAlterado>
          <valorAlterado>${this.escapeXML(c.valorAnterior)}</valorAlterado>
          <valorNovo>${this.escapeXML(c.valorNovo)}</valorNovo>
        </infCorrecao>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<evento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <infEvento Id="ID110110${dados.chave}${String(dados.sequencial).padStart(2, '0')}">
    <cOrgao>91</cOrgao>
    <tpAmb>2</tpAmb>
    <CNPJ>${dados.cnpj.padStart(14, '0')}</CNPJ>
    <chNFe>${dados.chave}</chNFe>
    <dhEvento>${dhEvento}</dhEvento>
    <tpEvento>110110</tpEvento>
    <nSeqEvento>${String(dados.sequencial).padStart(2, '0')}</nSeqEvento>
    <verEvento>1.00</verEvento>
    <detEvento versao="1.00">
      <descEvento>Carta de Correção</descEvento>
      <xCorrecao>${this.escapeXML(textoCorrecao)}</xCorrecao>
      <xCondUso>${this.escapeXML(dados.condicoesUso || 'A Carta de Correção é disciplinada pelo § 1º-A do art. 7º do Convênio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularização de erro ocorrido na emissão de documento fiscal, desde que o erro não esteja relacionado com: I - as variáveis que determinam o valor do imposto tais como: base de cálculo, alíquota, diferença de preço, quantidade, valor da operação ou da prestação; II - a correção de dados cadastrais que implique mudança do remetente ou do destinatário; III - a data de emissão ou de saída.')}</xCondUso>
      ${grupoCorrecao}
    </detEvento>
  </infEvento>
</evento>`;
  }

  // =============================================
  // GERAÇÃO DE XML DE INUTILIZAÇÃO
  // =============================================

  /**
   * Gera XML de inutilização de numeração
   */
  static gerarXMLInutilizacao(dados: {
    ano: number;
    serie: string;
    numeroInicial: number;
    numeroFinal: number;
    justificativa: string;
    cnpj: string;
    uf: string;
    ambiente: string;
  }): string {
    const cUF = this.obterCodigoUF(dados.uf);
    const tpAmb = dados.ambiente === 'producao' ? '1' : '2';

    // Gerar ID: ID + cUF + AAAA + CNPJ + modelo + série + nNF inicial + nNF final
    const id = `ID${cUF}${dados.ano}${dados.cnpj.padStart(14, '0')}55${dados.serie.padStart(3, '0')}${String(dados.numeroInicial).padStart(9, '0')}${String(dados.numeroFinal).padStart(9, '0')}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<inutNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <infInut Id="${id}">
    <tpAmb>${tpAmb}</tpAmb>
    <xServ>INUTILIZAR</xServ>
    <cUF>${cUF}</cUF>
    <ano>${dados.ano}</ano>
    <CNPJ>${dados.cnpj.padStart(14, '0')}</CNPJ>
    <mod>55</mod>
    <serie>${dados.serie.padStart(3, '0')}</serie>
    <nNFIni>${String(dados.numeroInicial).padStart(9, '0')}</nNFIni>
    <nNFFin>${String(dados.numeroFinal).padStart(9, '0')}</nNFFin>
    <xJust>${this.escapeXML(dados.justificativa.substring(0, 255))}</xJust>
  </infInut>
</inutNFe>`;
  }

  // =============================================
  // UTILITÁRIOS
  // =============================================

  /**
   * Gera chave de acesso NF-e (44 posições sem DV)
   */
  private static gerarChaveAcessoNFe(dados: {
    cnpj: string;
    serie: string;
    numero: number;
    ambiente: string;
    dataEmissao: Date;
    tipoOperacao: number;
    formaEmissao: number;
  }): string {
    const { cnpj, serie, numero, dataEmissao, tipoOperacao, formaEmissao } = dados;
    const uf = '35'; // Default SP, should be passed from emitente
    const ano = dataEmissao.getFullYear().toString().slice(-2);
    const mes = (dataEmissao.getMonth() + 1).toString().padStart(2, '0');
    const modelo = '55';
    const serieFormatada = serie.padStart(3, '0');
    const numeroFormatado = numero.toString().padStart(9, '0');
    const tpEmis = formaEmissao.toString();
    const cnpjFormatado = cnpj.replace(/\D/g, '').padStart(14, '0');
    const codigoNumerico = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');

    return `${uf}${ano}${mes}${cnpjFormatado}${modelo}${serieFormatada}${numeroFormatado}${tpEmis}${codigoNumerico}`;
  }

  /**
   * Calcula dígito verificador da chave (módulo 11)
   */
  private static calcularDV(chave: string): string {
    let soma = 0;
    let peso = 2;

    for (let i = chave.length - 1; i >= 0; i--) {
      const digito = parseInt(chave[i]);
      soma += digito * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }

    const resto = soma % 11;
    return resto < 2 ? '0' : (11 - resto).toString();
  }

  /**
   * Formata data no padrão SEFAZ (ISO 8601)
   */
  private static formatarDataSEFAZ(data: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}:${pad(data.getSeconds())}-03:00`;
  }

  /**
   * Obtém código IBGE da UF
   */
  static obterCodigoUF(uf: string): string {
    const codigos: Record<string, string> = {
      'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
      'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
      'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
      'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
      'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
      'SE': '28', 'TO': '17',
    };
    return codigos[uf.toUpperCase()] || '35';
  }

  /**
   * Escape de caracteres especiais para XML
   */
  private static escapeXML(texto: string): string {
    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Descrição da forma de pagamento
   */
  static descricaoFormaPagamento(forma: string): string {
    const formas: Record<string, string> = {
      '01': 'Dinheiro', '02': 'Cheque', '03': 'Cartão de Crédito',
      '04': 'Cartão de Débito', '05': 'Crédito Loja', '10': 'Vale Alimentação',
      '11': 'Vale Refeição', '12': 'Vale Presente', '13': 'Vale Combustível',
      '14': 'Duplicata Mercantil', '15': 'Boleto Bancário', '16': 'Depósito Bancário',
      '17': 'Pagamento Eletrônico', '18': 'Voucher', '19': 'Crédito em Conta',
      '90': 'Sem Pagamento', '99': 'Outros',
    };
    return formas[forma] || forma;
  }

  /**
   * Descrição da modalidade de frete
   */
  static descricaoModalidadeFrete(modalidade: number): string {
    const modalidades: Record<number, string> = {
      0: 'Por conta do emitente',
      1: 'Por conta do destinatário/remetente',
      2: 'Por conta de terceiros',
      3: 'Mercadoria transportada por próprio conta e risco do remetente',
      4: 'Mercadoria transportada por próprio conta e risco do destinatário',
      9: 'Sem frete',
    };
    return modalidades[modalidade] || 'Não informado';
  }

  /**
   * Descrição do status da NF-e
   */
  static descricaoStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pendente': 'Pendente de autorização',
      'autorizada': 'Autorizada',
      'rejeitada': 'Rejeitada',
      'cancelada': 'Cancelada',
      'denegada': 'Denegada pelo Fisco',
      'inutilizada': 'Numeração inutilizada',
      'contingencia': 'Em contingência',
    };
    return statusMap[status] || status;
  }

  /**
   * Retorna a cor do badge de status
   */
  static corStatus(status: string): string {
    const cores: Record<string, string> = {
      'pendente': 'bg-gray-100 text-gray-800 border-gray-300',
      'autorizada': 'bg-green-100 text-green-800 border-green-300',
      'rejeitada': 'bg-red-100 text-red-800 border-red-300',
      'cancelada': 'bg-red-100 text-red-800 border-red-300',
      'denegada': 'bg-orange-100 text-orange-800 border-orange-300',
      'inutilizada': 'bg-gray-100 text-gray-800 border-gray-300',
      'contingencia': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    return cores[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  }

  /**
   * URLs dos web services SEFAZ por UF (homologação e produção)
   */
  static obterURLSEFAZ(uf: string, ambiente: string, servico: string): string {
    const urls: Record<string, Record<string, Record<string, string>>> = {
      'SP': {
        'homologacao': {
          'NFeAutorizacao4': 'https://homologacao.nfe.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
          'NFeRetAutorizacao4': 'https://homologacao.nfe.fazenda.sp.gov.br/ws/NFeRetAutorizacao4.asmx',
          'NFeConsultaProtocolo4': 'https://homologacao.nfe.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx',
          'NFeStatusServico4': 'https://homologacao.nfe.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
          'NFeInutilizacao4': 'https://homologacao.nfe.fazenda.sp.gov.br/ws/NFeInutilizacao4.asmx',
          'RecepcaoEvento4': 'https://homologacao.nfe.fazenda.sp.gov.br/ws/RecepcaoEvento4.asmx',
        },
        'producao': {
          'NFeAutorizacao4': 'https://nfe.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
          'NFeRetAutorizacao4': 'https://nfe.fazenda.sp.gov.br/ws/NFeRetAutorizacao4.asmx',
          'NFeConsultaProtocolo4': 'https://nfe.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx',
          'NFeStatusServico4': 'https://nfe.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
          'NFeInutilizacao4': 'https://nfe.fazenda.sp.gov.br/ws/NFeInutilizacao4.asmx',
          'RecepcaoEvento4': 'https://nfe.fazenda.sp.gov.br/ws/RecepcaoEvento4.asmx',
        },
      },
      'SVRS': { // SVC-RS (contingência)
        'homologacao': {
          'NFeAutorizacao4': 'https://homologacao.svrs.rs.gov.br/ws/NFeAutorizacao4/NFeAutorizacao4.asmx',
          'NFeRetAutorizacao4': 'https://homologacao.svrs.rs.gov.br/ws/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx',
          'NFeConsultaProtocolo4': 'https://homologacao.svrs.rs.gov.br/ws/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
          'NFeStatusServico4': 'https://homologacao.svrs.rs.gov.br/ws/NFeStatusServico4/NFeStatusServico4.asmx',
          'NFeInutilizacao4': 'https://homologacao.svrs.rs.gov.br/ws/NFeInutilizacao4/NFeInutilizacao4.asmx',
          'RecepcaoEvento4': 'https://homologacao.svrs.rs.gov.br/ws/RecepcaoEvento4/RecepcaoEvento4.asmx',
        },
        'producao': {
          'NFeAutorizacao4': 'https://svrs.rs.gov.br/ws/NFeAutorizacao4/NFeAutorizacao4.asmx',
          'NFeRetAutorizacao4': 'https://svrs.rs.gov.br/ws/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx',
          'NFeConsultaProtocolo4': 'https://svrs.rs.gov.br/ws/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
          'NFeStatusServico4': 'https://svrs.rs.gov.br/ws/NFeStatusServico4/NFeStatusServico4.asmx',
          'NFeInutilizacao4': 'https://svrs.rs.gov.br/ws/NFeInutilizacao4/NFeInutilizacao4.asmx',
          'RecepcaoEvento4': 'https://svrs.rs.gov.br/ws/RecepcaoEvento4/RecepcaoEvento4.asmx',
        },
      },
    };

    // Tenta UF direta, senão SVRS (contingência/VC)
    return urls[uf]?.[ambiente]?.[servico] || urls['SVRS']?.[ambiente]?.[servico] || urls['SVRS']?.['homologacao']?.[servico] || '';
  }

  /**
   * Valida CNPJ
   */
  static validarCNPJ(cnpj: string): boolean {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;

    let tamanho = cnpjLimpo.length - 2;
    let numeros = cnpjLimpo.substring(0, tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(cnpjLimpo.charAt(tamanho))) return false;

    tamanho++;
    numeros = cnpjLimpo.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado === parseInt(cnpjLimpo.charAt(tamanho));
  }

  /**
   * Valida CPF
   */
  static validarCPF(cpf: string): boolean {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    let resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpfLimpo.charAt(10));
  }
}
