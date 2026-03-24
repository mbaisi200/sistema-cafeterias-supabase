import type { 
  NFCeConfig, 
  ProdutoNFCe, 
  PagamentoNFCe, 
  DestinatarioNFCe,
  NFCe 
} from '@/types/nfce';

/**
 * Serviço para geração e assinatura de NFC-e
 */
export class NFCeService {
  
  /**
   * Gera o XML da NFC-e
   */
  static gerarXMLNFCe(dados: {
    numero: number;
    serie: string;
    ambiente: string;
    emitente: any;
    destinatario?: DestinatarioNFCe;
    produtos: ProdutoNFCe[];
    totalProdutos: number;
    totalDesconto: number;
    totalLiquido: number;
    pagamentos: PagamentoNFCe[];
    troco: number;
    informacoesAdicionais?: string;
    dataEmissao: Date;
  }): { xml: string; chave: string } {
    const { numero, serie, ambiente, emitente, destinatario, produtos, totalProdutos, totalDesconto, totalLiquido, pagamentos, troco, informacoesAdicionais, dataEmissao } = dados;
    
    // Gerar chave de acesso
    const chave = this.gerarChaveAcesso({
      cnpj: emitente.cnpj,
      serie,
      numero,
      ambiente,
      dataEmissao,
    });

    // Calcular DV da chave
    const dv = this.calcularDV(chave);

    // Data no formato AAAA-MM-DDTHH:MM:SS
    const dhEmi = dataEmissao.toISOString().replace(/\.\d{3}Z$/, '-03:00');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chave}${dv}" versao="4.00">
    <ide>
      <cUF>${this.obterCodigoUF(emitente.uf)}</cUF>
      <cNF>${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}</cNF>
      <natOp>VENDA AO CONSUMIDOR</natOp>
      <mod>65</mod>
      <serie>${serie}</serie>
      <nNF>${numero}</nNF>
      <dhEmi>${dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${emitente.codigoMunicipio}</cMunFG>
      <tpImp>4</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${dv}</cDV>
      <tpAmb>${ambiente === 'producao' ? '1' : '2'}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${emitente.cnpj}</CNPJ>
      <xNome>${this.escapeXML(emitente.razaoSocial)}</xNome>
      ${emitente.nomeFantasia ? `<xFant>${this.escapeXML(emitente.nomeFantasia)}</xFant>` : ''}
      <enderEmit>
        <xLgr>${this.escapeXML(emitente.logradouro)}</xLgr>
        <nro>${emitente.numero}</nro>
        ${emitente.complemento ? `<xCpl>${this.escapeXML(emitente.complemento)}</xCpl>` : ''}
        <xBairro>${this.escapeXML(emitente.bairro)}</xBairro>
        <cMun>${emitente.codigoMunicipio}</cMun>
        <xMun>${this.escapeXML(emitente.municipio)}</xMun>
        <UF>${emitente.uf}</UF>
        <CEP>${emitente.cep}</CEP>
      </enderEmit>
      <IE>${emitente.ie}</IE>
      ${emitente.im ? `<IM>${emitente.im}</IM>` : ''}
      <CRT>${emitente.regimeTributario}</CRT>
    </emit>`;

    // Destinatário (opcional)
    if (destinatario) {
      xml += `
    <dest>
      <CPF>${destinatario.cpf_cnpj}</CPF>
      ${destinatario.nome ? `<xNome>${this.escapeXML(destinatario.nome)}</xNome>` : ''}
    </dest>`;
    }

    // Produtos
    produtos.forEach((produto, index) => {
      xml += `
    <det nItem="${index + 1}">
      <prod>
        <cProd>${produto.codigo}</cProd>
        <cEAN/>
        <xProd>${this.escapeXML(produto.descricao)}</xProd>
        <NCM>${produto.ncm}</NCM>
        <CFOP>${produto.cfop}</CFOP>
        <uCom>${produto.unidade}</uCom>
        <qCom>${produto.quantidade.toFixed(4)}</qCom>
        <vUnCom>${produto.valor_unitario.toFixed(10)}</vUnCom>
        <vProd>${produto.valor_total.toFixed(2)}</vProd>
        <cEANTrib/>
        <uTrib>${produto.unidade}</uTrib>
        <qTrib>${produto.quantidade.toFixed(4)}</qTrib>
        <vUnTrib>${produto.valor_unitario.toFixed(10)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMSSN101>
            <orig>${produto.icms_origem}</orig>
            <CSOSN>${produto.csosn}</CSOSN>
            <pCredSN>0.00</pCredSN>
          </ICMSSN101>
        </ICMS>
      </imposto>
    </det>`;
    });

    // Totais
    xml += `
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${totalProdutos.toFixed(2)}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>${totalDesconto.toFixed(2)}</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${totalLiquido.toFixed(2)}</vNF>
      </ICMSTot>
    </total>`;

    // Transporte
    xml += `
    <transp>
      <modFrete>9</modFrete>
    </transp>`;

    // Pagamentos
    xml += `
    <pag>`;
    
    pagamentos.forEach(pg => {
      xml += `
      <detPag>
        <tPag>${pg.forma}</tPag>
        <vPag>${pg.valor.toFixed(2)}</vPag>
      </detPag>`;
    });

    if (troco > 0) {
      xml += `
      <vTroco>${troco.toFixed(2)}</vTroco>`;
    }

    xml += `
    </pag>`;

    // Informações adicionais
    if (informacoesAdicionais) {
      xml += `
    <infAdic>
      <infCpl>${this.escapeXML(informacoesAdicionais)}</infCpl>
    </infAdic>`;
    }

    xml += `
  </infNFe>
</NFe>`;

    return { xml, chave: chave + dv };
  }

  /**
   * Assina o XML com o certificado digital
   */
  static async assinarXML(xml: string, certificadoBase64: string, senha: string): Promise<string> {
    // Em produção, usar biblioteca como node-forge e xml-crypto
    // Por ora, retorna o XML sem assinatura (modo de desenvolvimento)
    console.log('Assinando XML...');
    
    // TODO: Implementar assinatura real com certificado digital
    // Por enquanto, retorna o XML original
    return xml;
  }

  /**
   * Envia NFC-e para SEFAZ
   */
  static async enviarNFCeSEFAZ(
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
  }> {
    // Em produção, usar SOAP para comunicação com SEFAZ
    // Por ora, simula resposta de sucesso para desenvolvimento
    console.log(`Enviando NFC-e para SEFAZ ${uf} - Ambiente: ${ambiente}`);
    
    // Simulação de resposta para desenvolvimento
    const protocolo = Math.floor(Math.random() * 1000000000000).toString().padStart(15, '0');
    
    return {
      sucesso: true,
      protocolo,
      dataAutorizacao: new Date(),
      xmlAutorizado: xmlAssinado,
    };
  }

  /**
   * Gera QR Code para NFC-e
   */
  static gerarQRCode(chave: string, ambiente: string, uf: string): string {
    // URL base por estado (simplificado)
    const urls: Record<string, string> = {
      'SP': 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx',
      'RJ': 'https://www.nfce.fazenda.rj.gov.br/consulta',
      'MG': 'https://nfce.fazenda.mg.gov.br/portalnfce',
      'PR': 'http://www.dfeportal.fazenda.pr.gov.br/dfe-portal/rest/servico/consultaNFCe',
      'SC': 'https://sat.sef.sc.gov.br/nfce/consulta',
      'RS': 'https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx',
    };

    const baseUrl = urls[uf] || urls['SP'];
    return `${baseUrl}?chNFe=${chave}&tpAmb=${ambiente === 'producao' ? '1' : '2'}`;
  }

  /**
   * Gera chave de acesso
   */
  private static gerarChaveAcesso(dados: {
    cnpj: string;
    serie: string;
    numero: number;
    ambiente: string;
    dataEmissao: Date;
  }): string {
    const { cnpj, serie, numero, ambiente, dataEmissao } = dados;
    
    const ano = dataEmissao.getFullYear().toString().slice(-2);
    const mes = (dataEmissao.getMonth() + 1).toString().padStart(2, '0');
    const codigoUF = this.obterCodigoUF('SP'); // Default SP
    const modelo = '65';
    const serieFormatada = serie.padStart(3, '0');
    const numeroFormatado = numero.toString().padStart(9, '0');
    const tipoEmissao = '1';
    const cnpjFormatado = cnpj.padStart(14, '0');
    const codigoNumerico = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');

    return `${codigoUF}${ano}${mes}${cnpjFormatado}${modelo}${serieFormatada}${numeroFormatado}${tipoEmissao}${codigoNumerico}`;
  }

  /**
   * Calcula dígito verificador da chave
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
   * Obtém código IBGE da UF
   */
  private static obterCodigoUF(uf: string): string {
    const codigos: Record<string, string> = {
      'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
      'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
      'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
      'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
      'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
      'SE': '28', 'TO': '17',
    };
    return codigos[uf] || '35';
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
}
