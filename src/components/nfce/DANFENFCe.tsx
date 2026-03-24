'use client';

import { useMemo } from 'react';
import type { NFCe } from '@/types/nfce';

interface DANFENFCeProps {
  nfce: NFCe;
  largura?: 58 | 80;
}

/**
 * DANFE-NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica
 */
export function DANFENFCe({ nfce, largura = 80 }: DANFENFCeProps) {
  const larguraPx = largura * 3.78;

  const formatarCpfCnpj = (valor: string) => {
    const nums = valor.replace(/\D/g, '');
    if (nums.length === 11) {
      return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (nums.length === 14) {
      return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return valor;
  };

  const formatarDataHora = (data: Date | string) => {
    const d = new Date(data);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatarChave = (chave: string) => {
    return chave.replace(/(.{4})/g, '$1 ').trim();
  };

  const emitente = nfce.emitente;
  const produtos = nfce.produtos || [];
  const pagamentos = nfce.pagamentos || [];
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const troco = nfce.troco || (totalPago - nfce.total_liquido);

  return (
    <div
      id="danfe-nfce"
      className="bg-white font-mono text-black"
      style={{
        width: `${larguraPx}px`,
        fontSize: largura === 58 ? '9px' : '10px',
        lineHeight: 1.3,
        padding: '4px',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* Cabeçalho */}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <div className="font-bold text-sm">
          {emitente.nome_fantasia || emitente.razao_social}
        </div>
        <div className="font-bold text-xs mt-1">
          {emitente.razao_social}
        </div>
        <div className="text-xs mt-1">
          CNPJ: {formatarCpfCnpj(emitente.cnpj)}
        </div>
        <div className="text-xs">
          IE: {emitente.inscricao_estadual}
        </div>
        <div className="text-xs mt-1">
          {emitente.logradouro}, {emitente.numero}
        </div>
        <div className="text-xs">
          {emitente.bairro} - {emitente.municipio}/{emitente.uf}
        </div>
      </div>

      {/* Identificação do Documento */}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <div className="font-bold text-sm">DANFE NFC-e</div>
        <div className="text-xs mt-1">
          NFC-e nº {String(nfce.numero).padStart(9, '0')}
        </div>
        <div className="text-xs">
          Série {nfce.serie} - {nfce.ambiente === 'producao' ? 'Produção' : 'Homologação'}
        </div>
        <div className="text-xs mt-1">
          Emissão: {formatarDataHora(nfce.data_emissao)}
        </div>
      </div>

      {/* Produtos */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <div className="text-xs font-bold mb-1">ITENS</div>
        {produtos.map((produto, index) => (
          <div key={index} className="mb-1">
            <div className="flex justify-between text-xs">
              <span className="truncate" style={{ maxWidth: '65%' }}>
                {produto.descricao}
              </span>
              <span>{formatarValor(produto.valor_total)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-700">
              <span>
                {produto.quantidade} {produto.unidade} x {formatarValor(produto.valor_unitario)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Totais */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between text-xs font-bold">
          <span>TOTAL</span>
          <span>{formatarValor(nfce.total_liquido)}</span>
        </div>
      </div>

      {/* Pagamentos */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <div className="text-xs font-bold mb-1">FORMA DE PAGAMENTO</div>
        {pagamentos.map((pagamento, index) => (
          <div key={index} className="flex justify-between text-xs">
            <span>{pagamento.forma}</span>
            <span>{formatarValor(pagamento.valor)}</span>
          </div>
        ))}
        {troco > 0 && (
          <div className="flex justify-between text-xs mt-1">
            <span>TROCO</span>
            <span>{formatarValor(troco)}</span>
          </div>
        )}
      </div>

      {/* Chave de Acesso */}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <div className="text-xs font-bold">CHAVE DE ACESSO</div>
        <div className="text-xs font-bold tracking-wider mt-1">
          {formatarChave(nfce.chave)}
        </div>
      </div>

      {/* Protocolo de Autorização */}
      <div className="text-center text-xs border-b border-dashed border-black pb-2 mb-2">
        <div className="font-bold">PROTOCOLO DE AUTORIZAÇÃO</div>
        <div className="font-bold">
          {nfce.protocolo_autorizacao || 'Aguardando autorização'}
        </div>
        {nfce.data_autorizacao && (
          <div>{formatarDataHora(nfce.data_autorizacao)}</div>
        )}
      </div>

      {/* Rodapé */}
      <div className="text-center text-xs">
        <div className="font-bold">
          {emitente.mensagem_consumidor || 'Obrigado pela preferência!'}
        </div>
        {nfce.ambiente === 'homologacao' && (
          <div className="mt-2 font-bold text-red-600">
            AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Função para imprimir o DANFE
 */
export async function imprimirDANFE(nfceId: string): Promise<void> {
  const elemento = document.getElementById('danfe-nfce');
  if (!elemento) {
    throw new Error('Elemento DANFE não encontrado');
  }

  const janela = window.open('', '_blank', 'width=400,height=600');
  if (!janela) {
    throw new Error('Não foi possível abrir a janela de impressão');
  }

  janela.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>DANFE NFC-e - ${nfceId}</title>
        <style>
          @page { margin: 0; size: auto; }
          body { margin: 0; padding: 0; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${elemento.outerHTML}
      </body>
    </html>
  `);

  janela.document.close();
  
  janela.onload = () => {
    janela.focus();
    janela.print();
    janela.close();
  };
}

/**
 * Função para gerar HTML do DANFE como string
 */
export function gerarHTMLDANFE(nfce: NFCe, largura: 58 | 80 = 80): string {
  const larguraPx = largura * 3.78;
  
  const formatarCpfCnpj = (valor: string) => {
    const nums = valor.replace(/\D/g, '');
    if (nums.length === 11) {
      return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (nums.length === 14) {
      return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return valor;
  };

  const formatarDataHora = (data: Date | string) => {
    const d = new Date(data);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarChave = (chave: string) => {
    return chave.replace(/(.{4})/g, '$1 ').trim();
  };

  const emitente = nfce.emitente;
  const produtos = nfce.produtos || [];
  const pagamentos = nfce.pagamentos || [];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DANFE NFC-e</title>
  <style>
    @page { margin: 0; size: auto; }
    body { margin: 0; padding: 4px; font-family: 'Courier New', monospace; }
    .container { width: ${larguraPx}px; font-size: ${largura === 58 ? '9' : '10'}px; line-height: 1.3; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .border-b { border-bottom: 1px dashed #000; }
    .pb-2 { padding-bottom: 8px; }
    .mb-2 { margin-bottom: 8px; }
    .mt-1 { margin-top: 4px; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  </style>
</head>
<body>
  <div class="container">
    <div class="center border-b pb-2 mb-2">
      <div class="bold">${emitente.nome_fantasia || emitente.razao_social}</div>
      <div class="bold mt-1">${emitente.razao_social}</div>
      <div class="mt-1">CNPJ: ${formatarCpfCnpj(emitente.cnpj)}</div>
      <div>IE: ${emitente.inscricao_estadual}</div>
      <div class="mt-1">${emitente.logradouro}, ${emitente.numero}</div>
      <div>${emitente.bairro} - ${emitente.municipio}/${emitente.uf}</div>
    </div>
    <div class="center border-b pb-2 mb-2">
      <div class="bold">DANFE NFC-e</div>
      <div>NFC-e nº ${String(nfce.numero).padStart(9, '0')}</div>
      <div>Série ${nfce.serie}</div>
      <div class="mt-1">Emissão: ${formatarDataHora(nfce.data_emissao)}</div>
    </div>
    <div class="border-b pb-2 mb-2">
      ${produtos.map(p => `
        <div class="flex justify-between">
          <span class="truncate" style="max-width:65%">${p.descricao}</span>
          <span>${formatarValor(p.valor_total)}</span>
        </div>
      `).join('')}
    </div>
    <div class="border-b pb-2 mb-2">
      <div class="flex justify-between bold">
        <span>TOTAL</span>
        <span>${formatarValor(nfce.total_liquido)}</span>
      </div>
    </div>
    <div class="center border-b pb-2 mb-2">
      <div class="bold">CHAVE DE ACESSO</div>
      <div class="bold mt-1">${formatarChave(nfce.chave)}</div>
    </div>
    <div class="center">
      <div class="bold">Obrigado pela preferência!</div>
      ${nfce.ambiente === 'homologacao' ? `
        <div class="bold mt-1">AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL</div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}
