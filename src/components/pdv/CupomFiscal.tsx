'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Printer, FileText, User, Settings, CreditCard, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfiguracoesCupom, ConfiguracoesCupom, configuracoesCupomPadrao } from '@/hooks/useFirestore';
import { BuscaCliente, ClienteEncontrado } from './BuscaCliente';

export interface DadosCupomFiscal {
  cpfCliente: string;
  nomeCliente: string;
  imprimirCupom: boolean;
  tamanhoCupom: '58mm' | '80mm';
  configuracoes?: ConfiguracoesCupom;
  clienteId?: string;
  cliente?: ClienteEncontrado;
  razaoSocial?: string;
  inscricaoEstadual?: string;
  bairroEmpresa?: string;
  cidadeEmpresa?: string;
  ufEmpresa?: string;
  codigoBarras?: string;
  unidade?: string;
  vendedor?: string;
}

interface CupomFiscalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: (dados: DadosCupomFiscal, formaPagamento: string) => void;
  formaPagamento: string;
  total: number;
  itens: Array<{
    nome: string;
    quantidade: number;
    preco: number;
    codigo?: string;
    unidade?: string;
  }>;
  nomeEmpresa?: string;
  cnpjEmpresa?: string;
  enderecoEmpresa?: string;
  processando?: boolean;
  pagamentosMultiplos?: Array<{ forma: string; valor: number }>;
  razaoSocial?: string;
  inscricaoEstadual?: string;
  bairroEmpresa?: string;
  cidadeEmpresa?: string;
  ufEmpresa?: string;
  vendedor?: string;
}

export function CupomFiscalModal({
  open,
  onOpenChange,
  onConfirmar,
  formaPagamento,
  total,
  itens,
  nomeEmpresa = 'Empresa',
  cnpjEmpresa = '',
  enderecoEmpresa = '',
  processando = false,
  razaoSocial = '',
  inscricaoEstadual = '',
  bairroEmpresa = '',
  cidadeEmpresa = '',
  ufEmpresa = '',
  vendedor = '',
}: CupomFiscalModalProps) {
  const { toast } = useToast();
  const { configuracoes } = useConfiguracoesCupom();

  // Estados de cliente
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteEncontrado | null>(null);
  const [cpfCliente, setCpfCliente] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [modoEntradaManual, setModoEntradaManual] = useState(false);

  const [imprimirCupom, setImprimirCupom] = useState(true);
  const [tamanhoCupom, setTamanhoCupom] = useState<'58mm' | '80mm'>('80mm');
  const [mostrarConfiguracoes, setMostrarConfiguracoes] = useState(false);

  // Atualizar tamanho do cupom baseado nas configurações salvas
  useEffect(() => {
    if (configuracoes && configuracoes.larguraPapel) {
      setTamanhoCupom(configuracoes.larguraPapel === 58 ? '58mm' : '80mm');
    }
  }, [configuracoes]);

  // Resetar valores quando o modal abrir
  useEffect(() => {
    if (open) {
      setClienteSelecionado(null);
      setModoEntradaManual(false);
      setCpfCliente('');
      setNomeCliente('');
    }
  }, [open]);

  // Carregar configurações salvas
  useEffect(() => {
    const tamanhoSalvo = localStorage.getItem('pdv-tamanho-cupom');
    if (tamanhoSalvo === '58mm' || tamanhoSalvo === '80mm') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTamanhoCupom(tamanhoSalvo);
    }
  }, []);

  // Formatar CPF
  const formatarCPF = (valor: string | undefined | null) => {
    if (!valor) return '';
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 3) return numeros;
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`;
  };

  // Validar CPF
  const validarCPF = (cpf: string | undefined | null): boolean => {
    if (!cpf) return true;
    const numeros = cpf.replace(/\D/g, '');
    if (numeros.length === 0) return true;
    if (numeros.length !== 11) return false;
    
    if (/^(\d)\1+$/.test(numeros)) return false;
    
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(numeros[i]) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(numeros[9])) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(numeros[i]) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(numeros[10])) return false;
    
    return true;
  };

  const handleCPFChange = (valor: string) => {
    const formatado = formatarCPF(valor || '');
    setCpfCliente(formatado);
  };

  const handleClienteSelect = (cliente: ClienteEncontrado | null) => {
    setClienteSelecionado(cliente);
    if (cliente) {
      setModoEntradaManual(false);
      setCpfCliente(cliente.cnpj_cpf);
      setNomeCliente(cliente.nome_razao_social);
    }
  };

  const handleCadastrarNovo = () => {
    setClienteSelecionado(null);
    setModoEntradaManual(true);
  };

  const handleConfirmar = () => {
    const cpfLimpo = (cpfCliente || '').replace(/\D/g, '');
    
    if (cpfLimpo.length > 0 && !validarCPF(cpfCliente)) {
      toast({
        variant: 'destructive',
        title: 'CPF inválido',
        description: 'Digite um CPF válido ou deixe em branco',
      });
      return;
    }

    // Salvar configuração de tamanho
    localStorage.setItem('pdv-tamanho-cupom', tamanhoCupom);

    onConfirmar({
      cpfCliente: cpfLimpo,
      nomeCliente: (nomeCliente || '').trim(),
      imprimirCupom,
      tamanhoCupom,
      configuracoes: configuracoes || configuracoesCupomPadrao,
      clienteId: clienteSelecionado?.id,
      cliente: clienteSelecionado || undefined,
      razaoSocial,
      inscricaoEstadual,
      bairroEmpresa,
      cidadeEmpresa,
      ufEmpresa,
      vendedor,
    }, formaPagamento);
  };

  const formaPagamentoLabel: Record<string, string> = {
    dinheiro: 'Dinheiro',
    credito: 'Cartão Crédito',
    debito: 'Cartão Débito',
    pix: 'PIX',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border border-blue-200 bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Finalizar Venda
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Identifique o cliente e confirme a venda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Total e forma de pagamento */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium">Total:</span>
              <span className="text-3xl font-extrabold text-green-600">
                R$ {total.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white">
                <CreditCard className="h-3 w-3 mr-1" />
                {formaPagamentoLabel[formaPagamento] || formaPagamento}
              </Badge>
              <span className="text-sm text-gray-500">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
          </div>

          {/* Busca de Cliente */}
          {!modoEntradaManual ? (
            <BuscaCliente
              onSelect={handleClienteSelect}
              selected={clienteSelecionado}
              placeholder="Buscar por nome ou CPF/CNPJ..."
              label="Identificar Cliente"
              showActions={true}
              onCadastrarNovo={handleCadastrarNovo}
            />
          ) : (
            /* Entrada manual de CPF e Nome (fallback) */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-600" />
                  Dados do Cliente
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => setModoEntradaManual(false)}
                >
                  Buscar cliente cadastrado
                </Button>
              </div>

              {/* CPF do Cliente */}
              <div className="space-y-1">
                <Label htmlFor="cpf" className="text-sm font-medium">
                  CPF do Cliente
                  <span className="text-xs text-gray-400 font-normal ml-1">(opcional)</span>
                </Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpfCliente}
                  onChange={(e) => handleCPFChange(e.target.value)}
                  maxLength={14}
                  className="border border-blue-200 focus:border-blue-500 text-lg font-mono"
                />
                {cpfCliente && cpfCliente.replace(/\D/g, '').length === 11 && validarCPF(cpfCliente) && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    CPF válido
                  </p>
                )}
              </div>

              {/* Nome do Cliente */}
              <div className="space-y-1">
                <Label htmlFor="nomeCliente" className="text-sm font-medium">
                  Nome do Cliente
                  <span className="text-xs text-gray-400 font-normal ml-1">(opcional)</span>
                </Label>
                <Input
                  id="nomeCliente"
                  placeholder="Nome do cliente"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  className="border border-blue-200 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Opção de impressão */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Checkbox
              id="imprimir"
              checked={imprimirCupom}
              onCheckedChange={(checked) => setImprimirCupom(checked as boolean)}
            />
            <label
              htmlFor="imprimir"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
            >
              <Printer className="h-4 w-4 text-gray-600" />
              Imprimir cupom fiscal
            </label>
          </div>

          {/* Configurações de tamanho */}
          <div className="space-y-3">
            <button
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
              onClick={() => setMostrarConfiguracoes(!mostrarConfiguracoes)}
            >
              <Settings className="h-4 w-4" />
              {mostrarConfiguracoes ? 'Ocultar configurações' : 'Configurações de impressão'}
            </button>

            {mostrarConfiguracoes && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                <Label className="font-bold text-sm">Tamanho do papel do cupom:</Label>
                <RadioGroup
                  value={tamanhoCupom}
                  onValueChange={(value) => setTamanhoCupom(value as '58mm' | '80mm')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="58mm" id="r58" />
                    <Label htmlFor="r58" className="cursor-pointer">
                      <span className="font-medium">58mm</span>
                      <span className="text-xs text-gray-500 block">Impressora térmica pequena</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="80mm" id="r80" />
                    <Label htmlFor="r80" className="cursor-pointer">
                      <span className="font-medium">80mm</span>
                      <span className="text-xs text-gray-500 block">Impressora térmica padrão</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processando}
            className="border-gray-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={processando}
            className="bg-green-600 hover:bg-green-700 text-white font-bold min-w-[140px]"
          >
            {processando ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Venda
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Função para gerar e imprimir cupom (formato estilo MarketUp)
export function imprimirCupomFiscal(
  dados: {
    nomeEmpresa: string;
    cnpjEmpresa: string;
    enderecoEmpresa: string;
    cpfCliente: string;
    nomeCliente: string;
    itens: Array<{ nome: string; quantidade: number; preco: number; codigo?: string; unidade?: string }>;
    total: number;
    formaPagamento: string;
    tamanhoCupom: '58mm' | '80mm';
    codigoVenda?: string;
    pagamentosMultiplos?: Array<{ forma: string; valor: number }>;
    configuracoes?: ConfiguracoesCupom;
    cliente?: ClienteEncontrado;
    razaoSocial?: string;
    inscricaoEstadual?: string;
    bairroEmpresa?: string;
    cidadeEmpresa?: string;
    ufEmpresa?: string;
    vendedor?: string;
  }
) {
  const {
    nomeEmpresa: nomeEmpresaParam,
    cnpjEmpresa: cnpjEmpresaParam,
    enderecoEmpresa: enderecoEmpresaParam,
    cpfCliente,
    nomeCliente,
    itens,
    total,
    formaPagamento,
    tamanhoCupom,
    codigoVenda,
    pagamentosMultiplos,
    configuracoes,
    cliente,
    razaoSocial: razaoSocialParam,
    inscricaoEstadual: ieParam,
    bairroEmpresa: bairroParam,
    cidadeEmpresa: cidadeParam,
    ufEmpresa: ufParam,
    vendedor: vendedorParam,
  } = dados;

  // Usar configurações salvas ou padrão
  const config = configuracoes || configuracoesCupomPadrao;
  
  // SEMPRE usar dados da empresa das configurações do cupom se preenchidos
  // A prioridade é: cupom_config > dados do PDV (empresa tabela)
  const nomeFantasia = (config.nomeEmpresa && config.nomeEmpresa.trim() !== '') 
    ? config.nomeEmpresa 
    : nomeEmpresaParam;
  const razaoSocial = razaoSocialParam || nomeFantasia;
  const cnpjEmpresa = (config.cnpj && config.cnpj.trim() !== '') 
    ? config.cnpj 
    : cnpjEmpresaParam;

  // Endereço: tenta usar campos separados da empresa, com fallback para config.endereco
  const enderecoLogradouro = enderecoEmpresaParam || config.endereco || '';
  const bairroEmpresa = bairroParam || '';
  const cidadeEmpresa = cidadeParam || '';
  const ufEmpresa = ufParam || '';
  const inscricaoEstadual = ieParam || '';

  // Telefone: tenta cupom_config, depois o que vier do PDV
  const telefoneEmpresa = config.telefone || '';
  const vendedor = vendedorParam || 'ADMINISTRADOR';

  // Se razaoSocial for igual ao nomeFantasia, não mostra duplicado
  const razaoSocialNormalizada = razaoSocial.toUpperCase().trim();
  const nomeFantasiaNormalizada = nomeFantasia.toUpperCase().trim();
  const mostrarRazaoSocial = razaoSocialNormalizada !== '' && razaoSocialNormalizada !== nomeFantasiaNormalizada;

  // Se tem endereço completo separado, usa formato detalhado; senão, usa config.endereco como linha única
  const temEnderecoSeparado = !!(enderecoLogradouro && (bairroEmpresa || cidadeEmpresa || ufEmpresa));
  const usarEnderecoUnico = !temEnderecoSeparado && (config.endereco && config.endereco.trim() !== '');
  
  // Determinar largura do papel
  const larguraMm = config.larguraPapel || (tamanhoCupom === '58mm' ? 58 : 80);
  
  // Configurações de fonte
  const tamanhoFonte = config.tamanhoFonte || 9;
  const espacamentoLinhas = config.espacamentoLinhas || 1.3;
  const margemSuperior = config.margemSuperior ?? 0;
  const margemInferior = config.margemInferior ?? 0;
  const margemEsquerda = config.margemEsquerda ?? 1;
  const margemDireita = config.margemDireita ?? 1;
  
  const larguraUtilMm = Math.max(20, larguraMm - margemEsquerda - margemDireita);
  const mmPorCaractere = (tamanhoFonte / 12) * 1.5;
  const larguraCalculada = Math.floor(larguraUtilMm / mmPorCaractere);
  const largura = Math.max(16, larguraCalculada - 1);
  
  const mensagemRodape = config.mensagemRodape || 'Obrigado pela preferencia!\nVolte sempre!';

  console.log('Imprimindo cupom com configuracoes:', {
    nomeFantasia,
    razaoSocial,
    cnpjEmpresa,
    enderecoLogradouro,
    bairroEmpresa,
    cidadeEmpresa,
    ufEmpresa,
    larguraMm,
    larguraCaracteres: largura,
    tamanhoFonte,
    cliente: cliente?.nome_razao_social || nomeCliente,
  });

  const formaPagamentoLabel: Record<string, string> = {
    dinheiro: 'DINHEIRO',
    credito: 'CARTAO DE CREDITO',
    debito: 'CARTAO DE DEBITO',
    pix: 'PIX',
  };

  const separadorDuplo = '='.repeat(largura);
  const traco = '-'.repeat(largura);

  // ---------- Funções de formatação de texto ----------
  const quebrarTexto = (texto: string): string[] => {
    if (texto.length <= largura) return [texto];
    const linhas: string[] = [];
    let textoRestante = texto;
    while (textoRestante.length > largura) {
      let posicaoQuebra = largura;
      const ultimoEspaco = textoRestante.lastIndexOf(' ', largura);
      if (ultimoEspaco > 0) {
        posicaoQuebra = ultimoEspaco;
      }
      linhas.push(textoRestante.slice(0, posicaoQuebra).trim());
      textoRestante = textoRestante.slice(posicaoQuebra).trim();
    }
    if (textoRestante.length > 0) {
      linhas.push(textoRestante);
    }
    return linhas;
  };

  const centralizar = (texto: string) => {
    const linhas = quebrarTexto(texto);
    return linhas.map(linha => {
      const espacos = Math.max(0, Math.floor((largura - linha.length) / 2));
      return ' '.repeat(espacos) + linha;
    }).join('\n');
  };

  const alinharDireita = (texto: string) => {
    const espacos = Math.max(0, largura - texto.length);
    return ' '.repeat(espacos) + texto;
  };

  const formatarLinha = (esquerda: string, direita: string) => {
    const espacos = Math.max(1, largura - esquerda.length - direita.length);
    return esquerda + ' '.repeat(espacos) + direita;
  };

  const formatarCNPJ = (cnpj: string | undefined | null) => {
    if (!cnpj) return '';
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) return cnpj;
    return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12)}`;
  };

  const formatarCPF = (cpf: string | undefined | null) => {
    if (!cpf) return '';
    const numeros = cpf.replace(/\D/g, '');
    if (numeros.length !== 11) return cpf;
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
  };

  const formatarTelefone = (telefone: string | undefined | null) => {
    if (!telefone) return '';
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    } else if (numeros.length === 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    } else if (numeros.length === 9) {
      return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
    }
    return telefone;
  };

  // Gerar chave de acesso estilo UUID (se não tiver codigoVenda)
  const gerarChaveAcesso = () => {
    const chars = '0123456789ABCDEF';
    let uuid = '';
    for (let i = 0; i < 32; i++) {
      if (i === 8 || i === 12 || i === 16 || i === 20) uuid += '-';
      uuid += chars[Math.floor(Math.random() * chars.length)];
    }
    return uuid;
  };

  const chaveAcesso = codigoVenda 
    ? `${codigoVenda.slice(0, 8)}-${codigoVenda.slice(8, 12)}-${codigoVenda.slice(12, 16)}-${codigoVenda.slice(16, 20)}`
    : gerarChaveAcesso();

  // ---------- Construir cupom no formato MarketUp ----------
  let cupom = '';

  // Espaço inicial
  cupom += '\n';

  // === CABEÇALHO DO EMITENTE ===
  cupom += centralizar(nomeFantasia.toUpperCase()) + '\n';
  if (mostrarRazaoSocial) {
    cupom += centralizar(razaoSocial.toUpperCase()) + '\n';
  }
  
  // Endereço: formato detalhado (logradouro + bairro + cidade-UF) ou linha única (config.endereco)
  if (usarEnderecoUnico) {
    // Formato simples: uma única linha de endereço do config
    cupom += centralizar(config.endereco.toUpperCase()) + '\n';
  } else {
    // Formato detalhado: campos separados da tabela empresas
    if (enderecoLogradouro) {
      cupom += centralizar(enderecoLogradouro.toUpperCase()) + '\n';
    }
    if (bairroEmpresa) {
      cupom += centralizar(bairroEmpresa.toUpperCase()) + '\n';
    }
    if (cidadeEmpresa || ufEmpresa) {
      const cidadeUf = [cidadeEmpresa, ufEmpresa].filter(Boolean).join(' - ');
      cupom += centralizar(cidadeUf.toUpperCase()) + '\n';
    }
  }
  
  // Telefone e CNPJ
  if (telefoneEmpresa) {
    cupom += centralizar(`Tel: ${formatarTelefone(telefoneEmpresa)}`) + '\n';
  }
  if (cnpjEmpresa) {
    cupom += centralizar(`CNPJ: ${formatarCNPJ(cnpjEmpresa)}`) + '\n';
  }
  if (inscricaoEstadual) {
    cupom += centralizar(`I.E: ${inscricaoEstadual}`) + '\n';
  }

  cupom += '\n';

  // === DADOS DO DOCUMENTO ===
  cupom += centralizar('CUPOM NAO FISCAL') + '\n';
  cupom += '\n';

  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR');
  const hora = agora.toLocaleTimeString('pt-BR');

  cupom += `Data Emissao: ${data}\n`;
  cupom += `Hora Emissao:  ${hora}\n`;
  cupom += `Chave: ${chaveAcesso}\n`;
  cupom += `Software: SISTEMA-CAFETERIAS\n`;

  cupom += '\n';

  // === DADOS DO CLIENTE ===
  const nomeClienteFinal = cliente?.nome_razao_social || nomeCliente || 'AO CONSUMIDOR';
  cupom += `Cliente: ${nomeClienteFinal.toUpperCase()}\n`;
  cupom += `Vendedor: ${vendedor.toUpperCase()}\n`;

  cupom += '\n';
  cupom += traco + '\n';

  // === ITENS ===
  // Cabeçalho dos itens (compacto)
  cupom += centralizar('ITENS DO PEDIDO') + '\n';
  cupom += traco + '\n';

  itens.forEach((item) => {
    const codigoStr = (item.codigo || '').padEnd(16, ' ');
    const unidade = (item.unidade || 'UN').toUpperCase();
    const valorUnitStr = item.preco.toFixed(2);
    const valorTotalStr = (item.quantidade * item.preco).toFixed(2);

    // Linha 1: Código (se tiver) + Descrição
    if (item.codigo) {
      cupom += `${codigoStr}${item.nome}\n`;
    } else {
      cupom += `${item.nome}\n`;
    }

    // Linha 2: Qtde x UN R$ V.Unit R$ V.Total
    const detalhe = `${item.quantidade} ${unidade.padEnd(3, ' ')} x R$ ${valorUnitStr}`;
    cupom += formatarLinha(`  ${detalhe}`, `R$ ${valorTotalStr}`) + '\n';
  });

  cupom += traco + '\n';

  // === TOTAIS ===
  const subtotal = total; // Sem desconto por enquanto
  cupom += formatarLinha('  SUBTOTAL:', `R$ ${subtotal.toFixed(2)}`) + '\n';
  cupom += formatarLinha('  TOTAL GERAL:', `R$ ${total.toFixed(2)}`) + '\n';

  cupom += '\n';

  // === PAGAMENTO ===
  if (pagamentosMultiplos && pagamentosMultiplos.length > 1) {
    pagamentosMultiplos.forEach((pg) => {
      cupom += `Pgto: ${formaPagamentoLabel[pg.forma] || pg.forma.toUpperCase()}\n`;
      cupom += formatarLinha('  Valor Pago:', `R$ ${pg.valor.toFixed(2)}`) + '\n';
    });
  } else {
    cupom += `Pagamento: ${formaPagamentoLabel[formaPagamento] || formaPagamento.toUpperCase()}\n`;
    cupom += formatarLinha('  Valor Pago:', `R$ ${total.toFixed(2)}`) + '\n';
  }

  cupom += '\n';

  // === RODAPÉ ===
  cupom += separadorDuplo + '\n';
  mensagemRodape.split('\n').forEach((linha) => {
    cupom += centralizar(linha) + '\n';
  });
  cupom += separadorDuplo + '\n';
  cupom += '\n\n\n';

  // ---------- Abrir janela de impressão ----------
  const tamanhoPapel = `${larguraMm}mm`;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cupom Não Fiscal</title>
      <style>
        @page {
          size: ${tamanhoPapel} auto;
          margin: ${margemSuperior}mm ${margemDireita}mm ${margemInferior}mm ${margemEsquerda}mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', 'Lucida Console', monospace;
          font-size: ${tamanhoFonte}px;
          line-height: ${espacamentoLinhas};
          margin: 0;
          padding: ${margemSuperior}mm ${margemDireita}mm ${margemInferior}mm ${margemEsquerda}mm;
          white-space: pre;
          word-wrap: break-word;
          overflow-wrap: break-word;
          width: ${larguraMm}mm;
          max-width: ${larguraMm}mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          html, body {
            width: ${larguraMm}mm;
            margin: 0;
            padding: 0;
          }
          body {
            padding: ${margemSuperior}mm ${margemDireita}mm ${margemInferior}mm ${margemEsquerda}mm;
          }
        }
      </style>
    </head>
    <body>${cupom}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
