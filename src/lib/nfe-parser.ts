// =====================================================
// NFe XML Parser - Parser de Nota Fiscal Eletrônica
// Utiliza DOMParser nativo do navegador (sem dependências externas)
// =====================================================

export interface NFeProduto {
  // Dados básicos
  codigo: string;
  ean: string;
  descricao: string;
  ncm: string;
  cest: string;
  cfop: string;
  cst: string;
  csosn: string;
  unidade: string;
  unidadeTributavel: string;
  quantidade: number;
  quantidadeTributavel: number;
  valorUnitario: number;
  valorUnitarioTributavel: number;
  valorTotal: number;

  // Impostos
  origem: string;
  icmsCst: string;
  icmsCsosn: string;
  icmsAliquota: number;
  icmsValor: number;
  icmsBaseCalculo: number;
  ipiAliquota: number;
  ipiValor: number;
  pisAliquota: number;
  pisValor: number;
  cofinsAliquota: number;
  cofinsValor: number;
}

export interface NFeParsed {
  numero: string;
  serie: string;
  dataEmissao: Date;
  chaveAcesso?: string;
  naturezaOperacao?: string;
  emitente: {
    nome: string;
    cnpj: string;
    ie: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    telefone: string;
    email?: string;
  };
  destinatario: {
    nome: string;
    cnpj: string;
  };
  valorTotal: number;
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  valorOutrasDespesas: number;
  produtos: NFeProduto[];
}

/**
 * Helper para obter texto de um elemento XML, buscando no namespace padrão e com namespace
 */
function getTextContent(parent: Element, tagName: string): string {
  // Tenta sem namespace primeiro
  let el = parent.getElementsByTagName(tagName)[0];
  if (el) return (el.textContent || '').trim();

  // Tenta com namespace NFe comum
  const namespaces = ['nfe', 'nf', 'NFe', 'NFe'];
  for (const ns of namespaces) {
    el = parent.getElementsByTagName(`${ns}:${tagName}`)[0];
    if (el) return (el.textContent || '').trim();
  }

  return '';
}

/**
 * Helper para obter texto numérico de um elemento XML
 */
function getNumberContent(parent: Element, tagName: string, defaultValue = 0): number {
  const text = getTextContent(parent, tagName);
  const num = parseFloat(text);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Busca recursiva por um elemento por tagName, considerando possíveis prefixos de namespace
 */
function findElement(parent: Element | Document, tagName: string): Element | null {
  // Tenta direto
  let el = parent.getElementsByTagName(tagName)[0];
  if (el) return el;

  // Tenta com vários prefixos de namespace
  const prefixes = ['nfe', 'nf', 'NFe', 'NFe'];
  for (const prefix of prefixes) {
    el = parent.getElementsByTagName(`${prefix}:${tagName}`)[0];
    if (el) return el;
  }

  // Tenta buscar por localName em todos os filhos recursivamente
  const allElements = parent.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    if (allElements[i].localName === tagName) {
      return allElements[i];
    }
  }

  return null;
}

/**
 * Busca um elemento de imposto dentro de uma hierarquia variável de ICMS.
 * O elemento ICMS pode ter subtipos como ICMS00, ICMS10, ICMS20, ICMS30, ICMS40,
 * ICMS41, ICMS50, ICMS51, ICMS60, ICMS70, ICMS90, ICMSSN101, ICMSSN102, ICMSSN201,
 * ICMSSN202, ICMSSN500, ICMSSN900, etc.
 */
function findICMSTipo(impostoEl: Element): Element | null {
  // Busca qualquer elemento cujo nome comece com ICMS
  const allElements = impostoEl.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const localName = allElements[i].localName;
    if (
      (localName.startsWith('ICMS') || localName.startsWith('Icms')) &&
      localName !== 'ICMSTot' &&
      localName !== 'ICMSUFDest'
    ) {
      return allElements[i];
    }
  }
  return null;
}

/**
 * Parse de uma string XML de NFe e retorna os dados estruturados
 */
export function parseNFeXML(xmlString: string): NFeParsed {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Verifica erro de parsing
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('XML inválido. Verifique se o arquivo é um XML bem formado.');
  }

  // Encontra o elemento raiz infNFe
  const infNFe = findElement(xmlDoc, 'infNFe');
  if (!infNFe) {
    throw new Error('XML não é uma NFe válida. Elemento "infNFe" não encontrado.');
  }

  // Chave de acesso
  const chaveAcesso = infNFe.getAttribute('Id')?.replace('NFe', '') || undefined;

  // --- Dados da identificação (ide) ---
  const ide = findElement(infNFe, 'ide') || infNFe;
  const numero = getTextContent(ide, 'nNF');
  const serie = getTextContent(ide, 'serie');
  const dhEmi = getTextContent(ide, 'dhEmi');
  const natOp = getTextContent(ide, 'natOp');

  // Parse da data de emissão (formato ISO 8601: 2024-01-15T10:30:00-03:00)
  let dataEmissao = new Date();
  if (dhEmi) {
    try {
      // Tenta parse direto
      const parsed = new Date(dhEmi);
      if (!isNaN(parsed.getTime())) {
        dataEmissao = parsed;
      }
    } catch {
      // Fallback
    }
  }

  // --- Dados do emitente ---
  const emit = findElement(infNFe, 'emit') || infNFe;
  const enderEmit = findElement(emit, 'enderEmit') || emit;

  const emitente = {
    nome: getTextContent(emit, 'xNome'),
    cnpj: getTextContent(emit, 'CNPJ') || getTextContent(emit, 'cnpj'),
    ie: getTextContent(emit, 'IE') || getTextContent(emit, 'ie'),
    logradouro: getTextContent(enderEmit, 'xLgr'),
    numero: getTextContent(enderEmit, 'nro'),
    complemento: getTextContent(enderEmit, 'xCpl'),
    bairro: getTextContent(enderEmit, 'xBairro'),
    cidade: getTextContent(enderEmit, 'xMun'),
    uf: getTextContent(enderEmit, 'UF'),
    cep: getTextContent(enderEmit, 'CEP'),
    telefone: getTextContent(enderEmit, 'fone'),
    email: getTextContent(emit, 'email') || undefined,
  };

  // --- Dados do destinatário ---
  const dest = findElement(infNFe, 'dest') || infNFe;
  const destinatario = {
    nome: getTextContent(dest, 'xNome'),
    cnpj: getTextContent(dest, 'CNPJ') || getTextContent(dest, 'CPF') || getTextContent(dest, 'cnpj') || getTextContent(dest, 'cpf'),
  };

  // --- Dados de totais (total / ICMSTot) ---
  const total = findElement(infNFe, 'total') || infNFe;
  const icmsTot = findElement(total, 'ICMSTot') || total;
  const valorTotal = getNumberContent(icmsTot, 'vNF');
  const valorProdutos = getNumberContent(icmsTot, 'vProd');
  const valorFrete = getNumberContent(icmsTot, 'vFrete');
  const valorSeguro = getNumberContent(icmsTot, 'vSeg');
  const valorDesconto = getNumberContent(icmsTot, 'vDesc');
  const valorOutrasDespesas = getNumberContent(icmsTot, 'vOutro');

  // --- Produtos (det) ---
  const produtos: NFeProduto[] = [];
  // Busca todos os elementos 'det' (podem ter namespace)
  let detElements = Array.from(infNFe.getElementsByTagName('det'));

  if (detElements.length === 0) {
    // Tenta com namespace
    const prefixes = ['nfe', 'nf', 'NFe', 'NFe'];
    for (const prefix of prefixes) {
      detElements = Array.from(infNFe.getElementsByTagName(`${prefix}:det`));
      if (detElements.length > 0) break;
    }
  }

  if (detElements.length === 0) {
    // Busca por localName
    const allElements = Array.from(infNFe.getElementsByTagName('*'));
    detElements = allElements.filter(el => el.localName === 'det');
  }

  for (const det of detElements) {
    const prod = findElement(det, 'prod') || det;

    const codigo = getTextContent(prod, 'cProd');
    const descricao = getTextContent(prod, 'xProd');
    if (!descricao) continue; // Pula se não tiver descrição

    const cst = getTextContent(prod, 'CST') || '';
    const csosn = getTextContent(prod, 'CSOSN') || '';

    // --- Dados tributários ---
    const imposto = findElement(det, 'imposto') || det;
    const icmsEl = findElement(imposto, 'ICMS') || imposto;
    const icmsTipo = findICMSTipo(icmsEl);

    const origem = icmsTipo ? getTextContent(icmsTipo, 'orig') : '';
    const icmsCst = icmsTipo ? (getTextContent(icmsTipo, 'CST') || '') : '';
    const icmsCsosn = icmsTipo ? (getTextContent(icmsTipo, 'CSOSN') || '') : '';
    const icmsAliquota = icmsTipo ? getNumberContent(icmsTipo, 'pICMS') : 0;
    const icmsValor = icmsTipo ? getNumberContent(icmsTipo, 'vICMS') : 0;
    const icmsBaseCalculo = icmsTipo ? getNumberContent(icmsTipo, 'vBC') : 0;

    // IPI - try IPITrib and IPINT subtypes
    const ipiEl = findElement(imposto, 'IPI') || imposto;
    const ipiTrib = findElement(ipiEl, 'IPITrib');
    const ipiNT = findElement(ipiEl, 'IPINT');
    let ipiAliquota = 0;
    let ipiValor = 0;
    if (ipiTrib) {
      ipiAliquota = getNumberContent(ipiTrib, 'pIPI');
      ipiValor = getNumberContent(ipiTrib, 'vIPI');
    }
    // IPINT has no aliquot/value

    // PIS - try multiple subtypes (PISAliq, PISOutr, PISQtde)
    const pisEl = findElement(imposto, 'PIS') || imposto;
    let pisAliquota = 0;
    let pisValor = 0;
    const pisAliq = findElement(pisEl, 'PISAliq');
    const pisOutr = findElement(pisEl, 'PISOutr');
    const pisQtde = findElement(pisEl, 'PISQtde');
    if (pisAliq) {
      pisAliquota = getNumberContent(pisAliq, 'pPIS');
      pisValor = getNumberContent(pisAliq, 'vPIS');
    } else if (pisOutr) {
      pisAliquota = getNumberContent(pisOutr, 'pPIS');
      pisValor = getNumberContent(pisOutr, 'vPIS');
    } else if (pisQtde) {
      pisAliquota = getNumberContent(pisQtde, 'pPIS');
      pisValor = getNumberContent(pisQtde, 'vPIS');
    }

    // COFINS - try multiple subtypes (COFINSAliq, COFINSOutr, COFINSQtde)
    const cofinsEl = findElement(imposto, 'COFINS') || imposto;
    let cofinsAliquota = 0;
    let cofinsValor = 0;
    const cofinsAliq = findElement(cofinsEl, 'COFINSAliq');
    const cofinsOutr = findElement(cofinsEl, 'COFINSOutr');
    const cofinsQtde = findElement(cofinsEl, 'COFINSQtde');
    if (cofinsAliq) {
      cofinsAliquota = getNumberContent(cofinsAliq, 'pCOFINS');
      cofinsValor = getNumberContent(cofinsAliq, 'vCOFINS');
    } else if (cofinsOutr) {
      cofinsAliquota = getNumberContent(cofinsOutr, 'pCOFINS');
      cofinsValor = getNumberContent(cofinsOutr, 'vCOFINS');
    } else if (cofinsQtde) {
      cofinsAliquota = getNumberContent(cofinsQtde, 'pCOFINS');
      cofinsValor = getNumberContent(cofinsQtde, 'vCOFINS');
    }

    produtos.push({
      codigo,
      ean: getTextContent(prod, 'cEAN') || getTextContent(prod, 'CEAN') || '',
      descricao,
      ncm: getTextContent(prod, 'NCM') || '',
      cest: getTextContent(prod, 'CEST') || '',
      cfop: getTextContent(prod, 'CFOP') || '',
      cst: cst || icmsCst,
      csosn: csosn || icmsCsosn,
      unidade: getTextContent(prod, 'uCom') || 'UN',
      unidadeTributavel: getTextContent(prod, 'uTrib') || getTextContent(prod, 'uCom') || 'UN',
      quantidade: getNumberContent(prod, 'qCom'),
      quantidadeTributavel: getNumberContent(prod, 'qTrib'),
      valorUnitario: getNumberContent(prod, 'vUnCom'),
      valorUnitarioTributavel: getNumberContent(prod, 'vUnTrib'),
      valorTotal: getNumberContent(prod, 'vProd'),
      origem,
      icmsCst,
      icmsCsosn,
      icmsAliquota,
      icmsValor,
      icmsBaseCalculo,
      ipiAliquota,
      ipiValor,
      pisAliquota,
      pisValor,
      cofinsAliquota,
      cofinsValor,
    });
  }

  return {
    numero,
    serie,
    dataEmissao,
    chaveAcesso,
    naturezaOperacao: natOp || undefined,
    emitente,
    destinatario,
    valorTotal,
    valorProdutos,
    valorFrete,
    valorSeguro,
    valorDesconto,
    valorOutrasDespesas,
    produtos,
  };
}

/**
 * Verifica se um produto cadastrado corresponde a um produto da NFe
 * por código de barras (EAN) ou código interno do fornecedor.
 *
 * Prioridade de matching:
 *   1. EAN/GTIN (código de barras universal) — funciona entre fornecedores
 *   2. código interno (cProd) APENAS se o produto pertence ao mesmo fornecedor
 *
 * Isso evita que produtos com o mesmo código interno de fornecedores
 * diferentes sejam confundidos durante a importação.
 */
export function matchProdutoByCodigoOuEan(
  produto: { codigo?: string | null; codigoBarras?: string | null; fornecedorId?: string | null },
  nfeProduto: NFeProduto,
  fornecedorId?: string | null
): boolean {
  // 1ª prioridade: Match por código de barras (EAN/GTIN)
  // EAN é universal — o mesmo produto de qualquer fornecedor tem o mesmo EAN
  if (produto.codigoBarras && nfeProduto.ean) {
    const barrasProd = produto.codigoBarras.trim();
    const eanNFe = nfeProduto.ean.trim();
    if (barrasProd && eanNFe && barrasProd === eanNFe) {
      return true;
    }
  }

  // 2ª prioridade: Match por código interno (cProd) APENAS se for do mesmo fornecedor
  // Isso evita conflito quando fornecedores diferentes usam o mesmo código
  if (produto.codigo && nfeProduto.codigo) {
    if (produto.codigo.trim() === nfeProduto.codigo.trim()) {
      // Só match por código se:
      // a) O produto tem um fornecedor_id E é o mesmo fornecedor da NFe, OU
      // b) O produto NÃO tem fornecedor_id (legado — sem vínculo com fornecedor)
      if (produto.fornecedorId && fornecedorId) {
        if (produto.fornecedorId === fornecedorId) {
          return true;
        }
        // Códigos iguais mas fornecedores diferentes → NÃO é o mesmo produto
        return false;
      }
      // Produto sem fornecedor definido (legado) — match normalmente por código
      return true;
    }
  }

  return false;
}

/**
 * Formata CNPJ no padrão brasileiro
 */
export function formatarCNPJ(cnpj: string): string {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  if (cnpjLimpo.length === 14) {
    return cnpjLimpo.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  }
  if (cnpjLimpo.length === 11) {
    return cnpjLimpo.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      '$1.$2.$3-$4'
    );
  }
  return cnpj;
}

/**
 * Formata CEP no padrão brasileiro
 */
export function formatarCEP(cep: string): string {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length === 8) {
    return cepLimpo.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }
  return cep;
}
