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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileKey,
  Loader2,
  CheckCircle,
  Printer,
  AlertTriangle,
} from 'lucide-react';
import type { NFCe } from '@/types/nfce';

interface EmissaoNFCeDeliveryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venda: {
    id: string;
    total: number;
    subtotal: number;
    desconto?: number;
    taxaEntrega?: number;
    nomeCliente?: string;
    observacao?: string;
    itens: Array<{
      id: string;
      nome: string;
      quantidade: number;
      precoUnitario: number;
      observacao?: string;
    }>;
  };
  formaPagamento?: string;
  onSuccess?: (nfce: NFCe) => void;
}

export function EmissaoNFCeDelivery({
  open,
  onOpenChange,
  venda,
  formaPagamento = 'dinheiro',
  onSuccess,
}: EmissaoNFCeDeliveryProps) {
  const [cpfCliente, setCpfCliente] = useState('');
  const [nomeClienteInput, setNomeClienteInput] = useState('');
  const [emitindo, setEmitindo] = useState(false);
  const [nfceResultado, setNfceResultado] = useState<NFCe | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Preencher nome do cliente automaticamente
  useEffect(() => {
    if (venda.nomeCliente) {
      setNomeClienteInput(venda.nomeCliente);
    }
  }, [venda.nomeCliente]);

  // Resetar estado quando fechar
  useEffect(() => {
    if (!open) {
      setCpfCliente('');
      setNomeClienteInput('');
      setNfceResultado(null);
      setErro(null);
    }
  }, [open]);

  const handleCpfChange = (value: string) => {
    const nums = value.replace(/\D/g, '');
    if (nums.length <= 11) {
      setCpfCliente(nums);
    }
  };

  const formatarCPF = (cpf: string) => {
    if (cpf.length <= 3) return cpf;
    if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
    if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  };

  const mapearFormaPagamento = (forma: string): string => {
    const mapa: Record<string, string> = {
      'dinheiro': '01',
      'cheque': '02',
      'cartao_credito': '03',
      'cartao_debito': '04',
      'credito_loja': '05',
      'vale_alimentacao': '10',
      'vale_refeicao': '11',
      'vale_presente': '12',
      'vale_combustivel': '13',
      'boleto': '15',
      'deposito': '16',
      'pix': '17',
      'transferencia': '18',
      'outros': '99',
      'ifood_online': '99',
      'credito': '03',
      'debito': '04',
    };
    return mapa[forma.toLowerCase()] || '99';
  };

  const emitirNFCe = async () => {
    setEmitindo(true);
    setErro(null);
    setNfceResultado(null);

    try {
      const produtosNFCe = venda.itens.map((item, index) => ({
        codigo: item.id || String(index + 1),
        descricao: item.nome,
        ncm: '00000000',
        cfop: '5102',
        unidade: 'UN',
        quantidade: item.quantidade,
        valor_unitario: item.precoUnitario,
        valor_total: item.precoUnitario * item.quantidade,
        valor_liquido: item.precoUnitario * item.quantidade,
        csosn: '102',
        icms_origem: '0',
        ind_tot: '1',
      }));

      const pagamentosNFCe = [{
        forma: mapearFormaPagamento(formaPagamento),
        valor: venda.total,
      }];

      const destinatario = cpfCliente ? {
        cpf_cnpj: cpfCliente,
        nome: nomeClienteInput || undefined,
      } : undefined;

      const response = await fetch('/api/nfce/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venda_id: venda.id,
          produtos: produtosNFCe,
          pagamentos: pagamentosNFCe,
          destinatario,
          informacoes_adicionais: venda.observacao,
        }),
      });

      const resultado = await response.json();

      if (resultado.sucesso && resultado.nfce) {
        setNfceResultado(resultado.nfce);
        onSuccess?.(resultado.nfce);
      } else {
        setErro(resultado.erro?.mensagem || 'Erro ao emitir NFC-e');
      }
    } catch (error: any) {
      setErro(error.message || 'Erro de conexão');
    } finally {
      setEmitindo(false);
    }
  };

  const handleImprimir = async () => {
    if (!nfceResultado) return;
    const url = `/api/nfce/danfe/${nfceResultado.id}`;
    window.open(url, '_blank', 'width=400,height=600');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileKey className="h-5 w-5 text-green-600" />
            Emissão de NFC-e
          </DialogTitle>
          <DialogDescription>
            Nota Fiscal de Consumidor Eletrônica - Modelo 65
          </DialogDescription>
        </DialogHeader>

        {!nfceResultado ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF do Consumidor (opcional)</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={formatarCPF(cpfCliente)}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  disabled={emitindo}
                />
              </div>

              {cpfCliente && (
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Consumidor</Label>
                  <Input
                    id="nome"
                    placeholder="Nome completo"
                    value={nomeClienteInput}
                    onChange={(e) => setNomeClienteInput(e.target.value)}
                    disabled={emitindo}
                  />
                </div>
              )}
            </div>

            <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Itens:</span>
                <span className="font-medium">{venda.itens.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">
                  {venda.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              {venda.taxaEntrega && venda.taxaEntrega > 0 && (
                <div className="flex justify-between">
                  <span>Taxa de Entrega:</span>
                  <span className="font-medium">
                    {venda.taxaEntrega.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}
              {venda.desconto && venda.desconto > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Desconto:</span>
                  <span>- {venda.desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total:</span>
                <span>
                  {venda.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>

            {erro && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={emitindo}
              >
                Cancelar
              </Button>
              <Button
                onClick={emitirNFCe}
                disabled={emitindo}
                className="bg-green-600 hover:bg-green-700"
              >
                {emitindo ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Emitindo...
                  </>
                ) : (
                  <>
                    <FileKey className="h-4 w-4 mr-2" />
                    Emitir NFC-e
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800 text-lg">NFC-e Autorizada!</p>
              <p className="text-green-700 text-sm mt-1">
                Protocolo: {nfceResultado.protocolo_autorizacao}
              </p>
            </div>

            <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Número:</span>
                <span className="font-medium">{nfceResultado.numero}</span>
              </div>
              <div className="flex justify-between">
                <span>Série:</span>
                <span className="font-medium">{nfceResultado.serie}</span>
              </div>
              <div className="flex justify-between">
                <span>Ambiente:</span>
                <Badge variant={nfceResultado.ambiente === 'producao' ? 'default' : 'secondary'}>
                  {nfceResultado.ambiente === 'producao' ? 'Produção' : 'Homologação'}
                </Badge>
              </div>
              <div className="col-span-2 text-xs text-muted-foreground break-all mt-2">
                <span className="font-medium">Chave:</span> {nfceResultado.chave}
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button onClick={handleImprimir} className="bg-blue-600 hover:bg-blue-700">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir DANFE
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
