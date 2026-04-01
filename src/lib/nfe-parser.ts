// =====================================================
// NFe XML Parser - Parser de Nota Fiscal Eletrônica
// Utiliza DOMParser nativo do navegador (sem dependências externas)
// =====================================================

export interface NFeProduto {
  codigo: string;
  ean: string;
  descricao: string;
  ncm: string;
  cfop: string;
  cst: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface NFeParsed {
  numero: string;
  serie: string;
  dataEmissao: Date;
  chaveAcesso?: string;
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
  };
  destinatario: {
    nome: string;
    cnpj: string;
  };
  valorTotal: number;
  valorProdutos: number;
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

    const cst = getTextContent(prod, 'CST') || getTextContent(prod, 'CSOSN') || '';

    produtos.push({
      codigo,
      ean: getTextContent(prod, 'cEAN') || getTextContent(prod, 'CEAN') || '',
      descricao,
      ncm: getTextContent(prod, 'NCM') || '',
      cfop: getTextContent(prod, 'CFOP') || '',
      cst,
      unidade: getTextContent(prod, 'uCom') || getTextContent(prod, 'uTrib') || 'UN',
      quantidade: getNumberContent(prod, 'qCom'),
      valorUnitario: getNumberContent(prod, 'vUnCom'),
      valorTotal: getNumberContent(prod, 'vProd'),
    });
  }

  return {
    numero,
    serie,
    dataEmissao,
    chaveAcesso,
    emitente,
    destinatario,
    valorTotal,
    valorProdutos,
    produtos,
  };
}

/**
 * Verifica se um produto cadastrado corresponde a um produto da NFe
 * por código interno ou código de barras (EAN)
 */
export function matchProdutoByCodigoOuEan(
  produto: { codigo?: string | null; codigoBarras?: string | null },
  nfeProduto: NFeProduto
): boolean {
  // Match por código de produto
  if (produto.codigo && nfeProduto.codigo) {
    if (produto.codigo.trim() === nfeProduto.codigo.trim()) {
      return true;
    }
  }

  // Match por código de barras (EAN)
  if (produto.codigoBarras && nfeProduto.ean) {
    const barrasProd = produto.codigoBarras.trim();
    const eanNFe = nfeProduto.ean.trim();
    if (barrasProd === eanNFe) {
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
