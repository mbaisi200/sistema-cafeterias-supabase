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

export interface DadosCupomFiscal {
  cpfCliente: string;
  nomeCliente: string;
  imprimirCupom: boolean;
  tamanhoCupom: '58mm' | '80mm';
  configuracoes?: ConfiguracoesCupom;
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
  }>;
  nomeEmpresa?: string;
  cnpjEmpresa?: string;
  enderecoEmpresa?: string;
  processando?: boolean;
  cpfPrePreenchido?: string;
  nomePrePreenchido?: string;
  pagamentosMultiplos?: Array<{ forma: string; valor: number }>;
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
  cpfPrePreenchido = '',
  nomePrePreenchido = '',
}: CupomFiscalModalProps) {
  const { toast } = useToast();
  const { configuracoes } = useConfiguracoesCupom();
  const [cpfCliente, setCpfCliente] = useState(cpfPrePreenchido);
  const [nomeCliente, setNomeCliente] = useState(nomePrePreenchido);
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
      // Usando flushSync para evitar warning de cascading renders
      if (cpfPrePreenchido !== cpfCliente) {
        setCpfCliente(cpfPrePreenchido);
      }
      if (nomePrePreenchido !== nomeCliente) {
        setNomeCliente(nomePrePreenchido);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!cpf) return true; // CPF opcional
    const numeros = cpf.replace(/\D/g, '');
    if (numeros.length === 0) return true; // CPF opcional
    if (numeros.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(numeros)) return false;
    
    // Validar dígitos verificadores
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
            Preencha os dados do cupom fiscal
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

          {/* CPF do Cliente */}
          <div className="space-y-2">
            <Label htmlFor="cpf" className="font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-gray-600" />
              CPF do Cliente
              <span className="text-xs text-gray-400 font-normal">(opcional)</span>
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
          <div className="space-y-2">
            <Label htmlFor="nomeCliente" className="font-bold">
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

// Função para gerar e imprimir cupom
export function imprimirCupomFiscal(
  dados: {
    nomeEmpresa: string;
    cnpjEmpresa: string;
    enderecoEmpresa: string;
    cpfCliente: string;
    nomeCliente: string;
    itens: Array<{ nome: string; quantidade: number; preco: number }>;
    total: number;
    formaPagamento: string;
    tamanhoCupom: '58mm' | '80mm';
    codigoVenda?: string;
    pagamentosMultiplos?: Array<{ forma: string; valor: number }>;
    configuracoes?: ConfiguracoesCupom;
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
  } = dados;

  // Usar configurações salvas ou padrão
  const config = configuracoes || configuracoesCupomPadrao;
  
  // SEMPRE usar dados da empresa das configurações do cupom se preenchidos
  // Caso contrário, usa os dados do cadastro da empresa
  const nomeEmpresa = (config.nomeEmpresa && config.nomeEmpresa.trim() !== '') 
    ? config.nomeEmpresa 
    : nomeEmpresaParam;
  const cnpjEmpresa = (config.cnpj && config.cnpj.trim() !== '') 
    ? config.cnpj 
    : cnpjEmpresaParam;
  const enderecoEmpresa = (config.endereco && config.endereco.trim() !== '') 
    ? config.endereco 
    : enderecoEmpresaParam;
  
  // Determinar largura do papel - usar da configuração ou do tamanho selecionado
  const larguraMm = config.larguraPapel || config.larguraPapel || (tamanhoCupom === '58mm' ? 58 : 80);
  
  // Calcular largura em caracteres baseado no tamanho do papel
  const largura = larguraMm <= 58 ? 32 : larguraMm <= 80 ? 48 : Math.floor(larguraMm * 0.6);
  
  // Configurações de fonte - usar valores da configuração
  const tamanhoFonte = config.tamanhoFonte || 12;
  const intensidade = config.intensidadeImpressao || 'escura';
  const espacamentoLinhas = config.espacamentoLinhas || 1.4;
  const margemSuperior = config.margemSuperior ?? 2;
  const margemInferior = config.margemInferior ?? 2;
  const margemEsquerda = config.margemEsquerda ?? 2;
  const margemDireita = config.margemDireita ?? 2;
  const mensagemRodape = config.mensagemRodape || 'Obrigado pela preferência!\nVolte sempre!';

  // Log para debug
  console.log('Imprimindo cupom com configurações:', {
    nomeEmpresa,
    cnpjEmpresa,
    enderecoEmpresa,
    larguraMm,
    tamanhoFonte,
    intensidade,
    espacamentoLinhas,
    margemSuperior,
    margemInferior,
    margemEsquerda,
    margemDireita,
    mensagemRodape,
  });

  const formaPagamentoLabel: Record<string, string> = {
    dinheiro: 'Dinheiro',
    credito: 'Cartão Crédito',
    debito: 'Cartão Débito',
    pix: 'PIX',
  };

  const separador = '='.repeat(largura);
  const traco = '-'.repeat(largura);

  const centralizar = (texto: string) => {
    const espacos = Math.max(0, Math.floor((largura - texto.length) / 2));
    return ' '.repeat(espacos) + texto;
  };

  const formatarLinha = (esquerda: string, direita: string) => {
    const espacos = Math.max(1, largura - esquerda.length - direita.length);
    return esquerda + ' '.repeat(espacos) + direita;
  };

  const formatarCPF = (cpf: string | undefined | null) => {
    if (!cpf) return '';
    const numeros = cpf.replace(/\D/g, '');
    if (numeros.length !== 11) return cpf;
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
  };

  // Formatar CNPJ: XX.XXX.XXX/XXXX-XX
  const formatarCNPJ = (cnpj: string | undefined | null) => {
    if (!cnpj) return '';
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) return cnpj; // Retorna original se não tiver 14 dígitos
    return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12)}`;
  };

  // Formatar Telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  const formatarTelefone = (telefone: string | undefined | null) => {
    if (!telefone) return '';
    const numeros = telefone.replace(/\D/g, '');
    
    if (numeros.length === 11) {
      // Celular: (XX) XXXXX-XXXX
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    } else if (numeros.length === 10) {
      // Fixo: (XX) XXXX-XXXX
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    } else if (numeros.length === 9) {
      // Sem DDD celular: XXXXX-XXXX
      return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
    } else if (numeros.length === 8) {
      // Sem DDD fixo: XXXX-XXXX
      return `${numeros.slice(0, 4)}-${numeros.slice(4)}`;
    }
    return telefone; // Retorna original se não matching
  };

  // Construir cupom
  let cupom = '';

  cupom += '\n';
  cupom += centralizar(nomeEmpresa || 'EMPRESA') + '\n';
  if (cnpjEmpresa) cupom += centralizar(`CNPJ: ${formatarCNPJ(cnpjEmpresa)}`) + '\n';
  if (enderecoEmpresa) cupom += centralizar(enderecoEmpresa) + '\n';
  if (config.telefone) cupom += centralizar(`Tel: ${formatarTelefone(config.telefone)}`) + '\n';
  cupom += separador + '\n';
  cupom += centralizar('CUPOM FISCAL') + '\n';
  cupom += separador + '\n';

  // Data e hora
  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR');
  const hora = agora.toLocaleTimeString('pt-BR');
  cupom += formatarLinha(`Data: ${data}`, `Hora: ${hora}`) + '\n';
  if (codigoVenda) {
    cupom += formatarLinha('Código:', codigoVenda) + '\n';
  }
  cupom += traco + '\n';

  // Dados do cliente
  if (cpfCliente || nomeCliente) {
    cupom += 'CLIENTE\n';
    if (nomeCliente) cupom += `Nome: ${nomeCliente}\n`;
    if (cpfCliente) cupom += `CPF: ${formatarCPF(cpfCliente)}\n`;
    cupom += traco + '\n';
  }

  // Itens
  cupom += 'ITENS\n';
  cupom += traco + '\n';
  
  itens.forEach((item) => {
    cupom += `${item.nome}\n`;
    cupom += formatarLinha(
      `  ${item.quantidade} x R$ ${item.preco.toFixed(2)}`,
      `R$ ${(item.quantidade * item.preco).toFixed(2)}`
    ) + '\n';
  });
  
  cupom += traco + '\n';

  // Total
  cupom += formatarLinha('TOTAL:', `R$ ${total.toFixed(2)}`) + '\n';
  
  // Forma(s) de pagamento
  if (pagamentosMultiplos && pagamentosMultiplos.length > 1) {
    cupom += 'PAGAMENTOS:\n';
    pagamentosMultiplos.forEach((pg) => {
      cupom += formatarLinha(
        `  ${formaPagamentoLabel[pg.forma] || pg.forma}:`,
        `R$ ${pg.valor.toFixed(2)}`
      ) + '\n';
    });
  } else {
    cupom += formatarLinha('Forma Pgto:', formaPagamentoLabel[formaPagamento] || formaPagamento) + '\n';
  }
  cupom += separador + '\n';

  // Rodapé com mensagem personalizada
  mensagemRodape.split('\n').forEach((linha) => {
    cupom += centralizar(linha) + '\n';
  });
  cupom += '\n\n\n';

  // Determinar peso da fonte baseado na intensidade
  const fontWeight = intensidade === 'normal' ? 400 : intensidade === 'escura' ? 600 : 700;

  // Determinar tamanho do papel para CSS
  const tamanhoPapel = `${larguraMm}mm`;

  // Criar janela de impressão
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cupom Fiscal</title>
      <style>
        @page {
          size: ${tamanhoPapel} auto;
          margin: ${margemSuperior}mm ${margemDireita}mm ${margemInferior}mm ${margemEsquerda}mm;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: ${tamanhoFonte}px;
          font-weight: ${fontWeight};
          line-height: ${espacamentoLinhas};
          margin: 0;
          padding: ${margemSuperior}mm ${margemDireita}mm ${margemInferior}mm ${margemEsquerda}mm;
          white-space: pre-wrap;
          word-wrap: break-word;
          width: ${larguraMm}mm;
          max-width: ${larguraMm}mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          body {
            padding: 0;
            width: ${larguraMm}mm;
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
