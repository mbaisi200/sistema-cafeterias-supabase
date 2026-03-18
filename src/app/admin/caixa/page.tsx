'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCaixa } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Minus,
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Clock,
  Loader2,
  Lock,
  Unlock,
  ArrowUpCircle,
  ArrowDownCircle,
  Receipt,
  History,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  FileDown,
  Eye,
  Printer,
  X,
} from 'lucide-react';

// Função para gerar PDF do relatório de caixa
const gerarPDFRelatorioCaixa = (caixa: any, empresa: string) => {
  const dataAbertura = caixa.dataAbertura?.toLocaleString?.('pt-BR') || caixa.abertoEm?.toLocaleString?.('pt-BR') || '-';
  const dataFechamento = caixa.dataFechamento?.toLocaleString?.('pt-BR') || caixa.fechadoEm?.toLocaleString?.('pt-BR') || '-';
  
  // Criar conteúdo HTML para impressão
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório de Caixa</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header h2 { margin: 5px 0; font-size: 18px; color: #666; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .info-box { background: #f5f5f5; padding: 10px; border-radius: 5px; }
        .info-box p { margin: 3px 0; font-size: 12px; }
        .info-box strong { font-size: 14px; }
        .section { margin-bottom: 20px; }
        .section-title { background: #333; color: white; padding: 8px; font-weight: bold; }
        .item { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee; }
        .item.dinheiro { background: #e3f2fd; }
        .item.credito { background: #f3e5f5; }
        .item.debito { background: #e0f2f1; }
        .item.pix { background: #e8f5e9; }
        .total-row { background: #f5f5f5; font-weight: bold; font-size: 16px; }
        .resumo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .resumo-item { padding: 10px; border-radius: 5px; }
        .resumo-item.entrada { background: #e8f5e9; }
        .resumo-item.saida { background: #ffebee; }
        .quebra { padding: 15px; border-radius: 5px; text-align: center; font-size: 18px; font-weight: bold; }
        .quebra.positivo { background: #c8e6c9; color: #2e7d32; }
        .quebra.negativo { background: #ffcdd2; color: #c62828; }
        .quebra.zero { background: #e8f5e9; color: #388e3c; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${empresa}</h1>
        <h2>Relatório de Caixa</h2>
      </div>
      
      <div class="info-grid">
        <div class="info-box">
          <p><strong>Abertura:</strong></p>
          <p>${dataAbertura}</p>
          <p>Por: ${caixa.abertoPor || '-'}</p>
        </div>
        <div class="info-box">
          <p><strong>Fechamento:</strong></p>
          <p>${dataFechamento}</p>
          <p>Por: ${caixa.fechadoPor || '-'}</p>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">VENDAS POR FORMA DE PAGAMENTO</div>
        <div class="item dinheiro">
          <span>💵 Dinheiro</span>
          <strong>R$ ${(caixa.vendasDinheiro || 0).toFixed(2)}</strong>
        </div>
        <div class="item credito">
          <span>💳 Cartão Crédito</span>
          <strong>R$ ${(caixa.vendasCredito || 0).toFixed(2)}</strong>
        </div>
        <div class="item debito">
          <span>💳 Cartão Débito</span>
          <strong>R$ ${(caixa.vendasDebito || 0).toFixed(2)}</strong>
        </div>
        <div class="item pix">
          <span>📱 PIX</span>
          <strong>R$ ${(caixa.vendasPix || 0).toFixed(2)}</strong>
        </div>
        <div class="item total-row">
          <span>TOTAL DE VENDAS</span>
          <span>R$ ${(caixa.totalVendas || 0).toFixed(2)}</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">OUTRAS MOVIMENTAÇÕES</div>
        <div class="item">
          <span>⬆️ Reforços</span>
          <strong style="color: green;">+ R$ ${(caixa.reforcos || 0).toFixed(2)}</strong>
        </div>
        <div class="item">
          <span>⬇️ Sangrias</span>
          <strong style="color: red;">- R$ ${(caixa.sangrias || 0).toFixed(2)}</strong>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">RESUMO DO CAIXA</div>
        <div class="resumo-grid">
          <div class="resumo-item entrada">
            <p>Valor Inicial</p>
            <strong>R$ ${(caixa.valorInicial || 0).toFixed(2)}</strong>
          </div>
          <div class="resumo-item entrada">
            <p>Total Entradas</p>
            <strong>R$ ${(caixa.totalEntradas || 0).toFixed(2)}</strong>
          </div>
          <div class="resumo-item saida">
            <p>Total Saídas</p>
            <strong>R$ ${(caixa.totalSaidas || 0).toFixed(2)}</strong>
          </div>
          <div class="resumo-item entrada">
            <p>Valor Final</p>
            <strong>R$ ${(caixa.valorFinal || caixa.valorAtual || 0).toFixed(2)}</strong>
          </div>
        </div>
      </div>
      
      ${(caixa.quebra || 0) !== 0 ? `
        <div class="quebra ${caixa.quebra > 0 ? 'positivo' : 'negativo'}">
          ${caixa.quebra > 0 ? '💰 SOBRA' : '⚠️ FALTA'}: R$ ${Math.abs(caixa.quebra).toFixed(2)}
        </div>
      ` : `
        <div class="quebra zero">
          ✓ Caixa conferido - Sem diferenças
        </div>
      `}
      
      <p style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
        Relatório gerado em ${new Date().toLocaleString('pt-BR')}
      </p>
    </body>
    </html>
  `;
  
  // Abrir janela de impressão
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

export default function CaixaPage() {
  const { caixaAberto, movimentacoes, historico, loading, abrirCaixa, fecharCaixa, adicionarReforco, adicionarSangria, resumo, carregarCaixaPorId } = useCaixa();
  const { toast } = useToast();
  
  const [dialogAbertura, setDialogAbertura] = useState(false);
  const [dialogFechamento, setDialogFechamento] = useState(false);
  const [dialogReforco, setDialogReforco] = useState(false);
  const [dialogSangria, setDialogSangria] = useState(false);
  const [dialogRelatorioUltimo, setDialogRelatorioUltimo] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados para o seletor de caixa
  const [caixaSelecionadoId, setCaixaSelecionadoId] = useState<string>('');
  const [caixaSelecionado, setCaixaSelecionado] = useState<any>(null);
  const [loadingCaixaSelecionado, setLoadingCaixaSelecionado] = useState(false);
  
  // Form states
  const [valorAbertura, setValorAbertura] = useState('');
  const [obsAbertura, setObsAbertura] = useState('');
  const [valorFechamento, setValorFechamento] = useState('');
  const [obsFechamento, setObsFechamento] = useState('');
  const [valorReforco, setValorReforco] = useState('');
  const [descricaoReforco, setDescricaoReforco] = useState('');
  const [formaReforco, setFormaReforco] = useState('dinheiro');
  const [valorSangria, setValorSangria] = useState('');
  const [descricaoSangria, setDescricaoSangria] = useState('');

  const handleAbrirCaixa = async () => {
    if (!valorAbertura || parseFloat(valorAbertura) < 0) {
      toast({ variant: 'destructive', title: 'Informe um valor válido' });
      return;
    }

    setSaving(true);
    try {
      await abrirCaixa(parseFloat(valorAbertura), obsAbertura);
      toast({ title: 'Caixa aberto com sucesso!' });
      setDialogAbertura(false);
      setValorAbertura('');
      setObsAbertura('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: error.message || 'Erro ao abrir caixa' });
    } finally {
      setSaving(false);
    }
  };

  const handleFecharCaixa = async () => {
    if (!valorFechamento || parseFloat(valorFechamento) < 0) {
      toast({ variant: 'destructive', title: 'Informe o valor final do caixa' });
      return;
    }

    setSaving(true);
    try {
      await fecharCaixa(parseFloat(valorFechamento), obsFechamento);
      toast({ title: 'Caixa fechado com sucesso!' });
      setDialogFechamento(false);
      setValorFechamento('');
      setObsFechamento('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: error.message || 'Erro ao fechar caixa' });
    } finally {
      setSaving(false);
    }
  };

  const handleReforco = async () => {
    if (!valorReforco || parseFloat(valorReforco) <= 0) {
      toast({ variant: 'destructive', title: 'Informe um valor válido' });
      return;
    }
    if (!descricaoReforco) {
      toast({ variant: 'destructive', title: 'Informe uma descrição' });
      return;
    }

    setSaving(true);
    try {
      await adicionarReforco(parseFloat(valorReforco), descricaoReforco, formaReforco);
      toast({ title: 'Reforço adicionado!' });
      setDialogReforco(false);
      setValorReforco('');
      setDescricaoReforco('');
      setFormaReforco('dinheiro');
    } catch (error: any) {
      toast({ variant: 'destructive', title: error.message || 'Erro ao adicionar reforço' });
    } finally {
      setSaving(false);
    }
  };

  const handleSangria = async () => {
    if (!valorSangria || parseFloat(valorSangria) <= 0) {
      toast({ variant: 'destructive', title: 'Informe um valor válido' });
      return;
    }
    if (!descricaoSangria) {
      toast({ variant: 'destructive', title: 'Informe uma descrição' });
      return;
    }

    setSaving(true);
    try {
      await adicionarSangria(parseFloat(valorSangria), descricaoSangria);
      toast({ title: 'Sangria realizada!' });
      setDialogSangria(false);
      setValorSangria('');
      setDescricaoSangria('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: error.message || 'Erro ao realizar sangria' });
    } finally {
      setSaving(false);
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'abertura': return <Unlock className="h-4 w-4 text-green-600" />;
      case 'fechamento': return <Lock className="h-4 w-4 text-red-600" />;
      case 'venda': return <Receipt className="h-4 w-4 text-blue-600" />;
      case 'reforco': return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case 'sangria': return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'abertura': return 'Abertura';
      case 'fechamento': return 'Fechamento';
      case 'venda': return 'Venda';
      case 'reforco': return 'Reforço';
      case 'sangria': return 'Sangria';
      default: return tipo;
    }
  };

  const getFormaIcon = (forma: string) => {
    switch (forma) {
      case 'dinheiro': return <Banknote className="h-4 w-4" />;
      case 'credito': return <CreditCard className="h-4 w-4" />;
      case 'debito': return <CreditCard className="h-4 w-4" />;
      case 'pix': return <Smartphone className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Caixa' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Caixa' }]}>
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Caixa</h1>
              <p className="text-muted-foreground">
                Controle de fluxo de caixa diário
              </p>
            </div>
            
            {caixaAberto ? (
              <div className="flex gap-2">
                <Button 
                  onClick={() => setDialogReforco(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Reforço
                </Button>
                <Button 
                  onClick={() => setDialogSangria(true)}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Minus className="mr-2 h-4 w-4" />
                  Sangria
                </Button>
                <Button 
                  onClick={() => setDialogFechamento(true)}
                  variant="destructive"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Fechar Caixa
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={() => setDialogAbertura(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Unlock className="mr-2 h-4 w-4" />
                  Abrir Caixa
                </Button>
                {historico.length > 0 && (
                  <Button 
                    onClick={() => setDialogRelatorioUltimo(true)}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Relatório Último Caixa
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Status do Caixa */}
          <Card className={caixaAberto ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${caixaAberto ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Wallet className={`h-6 w-6 ${caixaAberto ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {caixaAberto ? 'Caixa Aberto' : 'Caixa Fechado'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {caixaAberto ? (
                        <>
                          Aberto por {caixaAberto.abertoPorNome} em {caixaAberto.abertoEm?.toLocaleString('pt-BR')}
                        </>
                      ) : (
                        'Abra o caixa para começar as vendas'
                      )}
                    </p>
                  </div>
                </div>
                {caixaAberto && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Valor Atual</p>
                    <p className="text-3xl font-bold text-green-600">
                      R$ {(resumo.valorAtual || 0).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {caixaAberto && (
            <>
              {/* Cards de Resumo por Forma de Pagamento */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Banknote className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Dinheiro</p>
                        <p className="text-xl font-bold">R$ {resumo.vendasDinheiro.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Crédito</p>
                        <p className="text-xl font-bold">R$ {resumo.vendasCredito.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Débito</p>
                        <p className="text-xl font-bold">R$ {resumo.vendasDebito.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">PIX</p>
                        <p className="text-xl font-bold">R$ {resumo.vendasPix.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Resumo Financeiro */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Entradas</p>
                        <p className="text-2xl font-bold text-green-600">R$ {resumo.totalEntradas.toFixed(2)}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Vendas: R$ {resumo.totalVendas.toFixed(2)} | Reforços: R$ {resumo.reforcos.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Saídas</p>
                        <p className="text-2xl font-bold text-red-600">R$ {resumo.totalSaidas.toFixed(2)}</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Sangrias realizadas no período
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Inicial</p>
                        <p className="text-2xl font-bold text-blue-600">R$ {resumo.valorInicial.toFixed(2)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Abertura do caixa
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Movimentações */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Movimentações do Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {movimentacoes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação registrada
                    </div>
                  ) : (
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {movimentacoes.map((mov) => (
                          <div 
                            key={mov.id} 
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              mov.tipo === 'sangria' ? 'bg-red-50 border-red-200' : 
                              mov.tipo === 'reforco' ? 'bg-green-50 border-green-200' : 
                              'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {getTipoIcon(mov.tipo)}
                              <div>
                                <p className="font-medium">{mov.descricao}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {getTipoLabel(mov.tipo)}
                                  </Badge>
                                  {mov.formaPagamento && (
                                    <span className="flex items-center gap-1">
                                      {getFormaIcon(mov.formaPagamento)}
                                      {mov.formaPagamento}
                                    </span>
                                  )}
                                  <span>{mov.criadoEm?.toLocaleString('pt-BR')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${
                                mov.tipo === 'sangria' ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {mov.tipo === 'sangria' ? '-' : '+'} R$ {(mov.valor || 0).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">{mov.usuarioNome}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Histórico de Caixas */}
          {!caixaAberto && historico.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Caixas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {historico.map((cx) => (
                      <div 
                        key={cx.id} 
                        className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Lock className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {cx.abertoEm?.toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Aberto por {cx.abertoPorNome || cx.aberto_por_nome} • Fechado por {cx.fechadoPorNome || cx.fechado_por_nome}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-bold">R$ {(cx.valorFinal || cx.valor_final || 0).toFixed(2)}</p>
                            <div className="flex items-center gap-2">
                              {(cx.quebra || 0) !== 0 && (
                                <Badge 
                                  variant={cx.quebra > 0 ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {cx.quebra > 0 ? 'Sobra' : 'Falta'}: R$ {Math.abs(cx.quebra).toFixed(2)}
                                </Badge>
                              )}
                              {cx.quebra === 0 && (
                                <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                                  Conferido
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              onClick={async () => {
                                setLoadingCaixaSelecionado(true);
                                const caixa = await carregarCaixaPorId(cx.id);
                                setCaixaSelecionado(caixa);
                                setDialogRelatorioUltimo(true);
                                setLoadingCaixaSelecionado(false);
                              }}
                              disabled={loadingCaixaSelecionado}
                            >
                              {loadingCaixaSelecionado ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4 mr-1" />
                              )}
                              Ver Relatório
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Mensagem quando não há caixa e nem histórico */}
          {!caixaAberto && historico.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum caixa registrado</p>
                <p className="text-sm text-muted-foreground">Abra o caixa para começar</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog Abertura de Caixa */}
        <Dialog open={dialogAbertura} onOpenChange={setDialogAbertura}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Unlock className="h-5 w-5 text-green-600" />
                Abrir Caixa
              </DialogTitle>
              <DialogDescription>
                Informe o valor inicial em dinheiro no caixa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Valor Inicial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={valorAbertura}
                  onChange={(e) => setValorAbertura(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Textarea
                  placeholder="Ex: Troco inicial do dia"
                  value={obsAbertura}
                  onChange={(e) => setObsAbertura(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogAbertura(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAbrirCaixa} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Abrir Caixa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Fechamento de Caixa */}
        <Dialog open={dialogFechamento} onOpenChange={setDialogFechamento}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                Fechar Caixa - Relatório do Dia
              </DialogTitle>
              <DialogDescription>
                Confira o resumo de vendas por forma de pagamento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              
              {/* Relatório de Vendas por Forma de Pagamento */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-semibold text-sm">
                  VENDAS POR FORMA DE PAGAMENTO
                </div>
                <div className="divide-y">
                  <div className="flex items-center justify-between px-4 py-3 bg-blue-50">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Dinheiro</span>
                    </div>
                    <span className="font-bold text-lg text-blue-600">
                      R$ {resumo.vendasDinheiro.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-purple-50">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Cartão Crédito</span>
                    </div>
                    <span className="font-bold text-lg text-purple-600">
                      R$ {resumo.vendasCredito.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-teal-50">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-teal-600" />
                      <span className="font-medium">Cartão Débito</span>
                    </div>
                    <span className="font-bold text-lg text-teal-600">
                      R$ {resumo.vendasDebito.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-green-50">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-green-600" />
                      <span className="font-medium">PIX</span>
                    </div>
                    <span className="font-bold text-lg text-green-600">
                      R$ {resumo.vendasPix.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-100 font-bold">
                    <span>TOTAL DE VENDAS</span>
                    <span className="text-xl">R$ {resumo.totalVendas.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Outras Movimentações */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-semibold text-sm">
                  OUTRAS MOVIMENTAÇÕES
                </div>
                <div className="divide-y">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-5 w-5 text-green-600" />
                      <span>Reforços</span>
                    </div>
                    <span className="font-bold text-green-600">
                      + R$ {resumo.reforcos.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-5 w-5 text-red-600" />
                      <span>Sangrias</span>
                    </div>
                    <span className="font-bold text-red-600">
                      - R$ {resumo.sangrias.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resumo Final */}
              <div className="border rounded-lg overflow-hidden bg-gray-50">
                <div className="bg-gray-200 px-4 py-2 font-semibold text-sm">
                  RESUMO DO CAIXA
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Inicial:</span>
                    <span className="font-bold">R$ {resumo.valorInicial.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Total Entradas:</span>
                    <span className="font-bold">+ R$ {resumo.totalEntradas.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Total Saídas:</span>
                    <span className="font-bold">- R$ {resumo.totalSaidas.toFixed(2)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Valor Esperado em Caixa:</span>
                    <span className="font-bold text-blue-600 text-xl">
                      R$ {resumo.valorAtual.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Destaque para valor em dinheiro */}
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-yellow-800">Valor esperado em DINHEIRO:</span>
                        <p className="text-xs text-yellow-600">(Valor inicial + vendas dinheiro + reforços - sangrias)</p>
                      </div>
                      <span className="font-bold text-xl text-yellow-700">
                        R$ {(
                          resumo.valorInicial + 
                          resumo.vendasDinheiro + 
                          resumo.reforcos - 
                          resumo.sangrias
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input do Valor Final */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Valor Final em Dinheiro (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Digite o valor contado no caixa"
                  value={valorFechamento}
                  onChange={(e) => setValorFechamento(e.target.value)}
                  className="text-lg h-12"
                />
                {valorFechamento && (
                  <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-100">
                    {parseFloat(valorFechamento) === resumo.valorAtual ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> ✓ Valores conferem perfeitamente!
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1 ${parseFloat(valorFechamento) > resumo.valorAtual ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} p-2 rounded`}>
                        <AlertTriangle className="h-4 w-4" />
                        {parseFloat(valorFechamento) > resumo.valorAtual ? '💰 SOBRA' : '⚠️ FALTA'}: 
                        <strong>R$ {Math.abs(parseFloat(valorFechamento) - resumo.valorAtual).toFixed(2)}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Textarea
                  placeholder="Ex: Conferência realizada com sucesso"
                  value={obsFechamento}
                  onChange={(e) => setObsFechamento(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogFechamento(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleFecharCaixa} 
                disabled={saving || !valorFechamento} 
                variant="destructive"
                className="min-w-[150px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fechando...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Confirmar Fechamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Reforço */}
        <Dialog open={dialogReforco} onOpenChange={setDialogReforco}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
                Adicionar Reforço
              </DialogTitle>
              <DialogDescription>
                Adicione dinheiro ao caixa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={valorReforco}
                  onChange={(e) => setValorReforco(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Ex: Troco adicional"
                  value={descricaoReforco}
                  onChange={(e) => setDescricaoReforco(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Forma</Label>
                <Select value={formaReforco} onValueChange={setFormaReforco}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogReforco(false)}>
                Cancelar
              </Button>
              <Button onClick={handleReforco} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Sangria */}
        <Dialog open={dialogSangria} onOpenChange={setDialogSangria}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
                Realizar Sangria
              </DialogTitle>
              <DialogDescription>
                Retire dinheiro do caixa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                Disponível em caixa: <strong>R$ {resumo.valorAtual.toFixed(2)}</strong>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={valorSangria}
                  onChange={(e) => setValorSangria(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Ex: Pagamento de fornecedor"
                  value={descricaoSangria}
                  onChange={(e) => setDescricaoSangria(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogSangria(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSangria} disabled={saving} variant="destructive">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Realizar Sangria
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Relatório do Caixa Selecionado */}
        <Dialog open={dialogRelatorioUltimo} onOpenChange={setDialogRelatorioUltimo}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Relatório de Caixa
              </DialogTitle>
              <DialogDescription>
                Resumo detalhado do caixa selecionado
              </DialogDescription>
            </DialogHeader>
            
            {loadingCaixaSelecionado ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : caixaSelecionado ? (
              <ScrollArea className="flex-1 max-h-[60vh]">
                <div className="space-y-4 py-4 pr-4">
                  {/* Informações do Caixa */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">Abertura</p>
                      <p className="font-semibold">{caixaSelecionado.dataAbertura?.toLocaleString?.('pt-BR') || '-'}</p>
                      <p className="text-xs text-muted-foreground">por {caixaSelecionado.abertoPor || '-'}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600 font-medium">Fechamento</p>
                      <p className="font-semibold">{caixaSelecionado.dataFechamento?.toLocaleString?.('pt-BR') || '-'}</p>
                      <p className="text-xs text-muted-foreground">por {caixaSelecionado.fechadoPor || '-'}</p>
                    </div>
                  </div>

                  {/* Vendas por Forma de Pagamento */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 font-semibold text-sm text-gray-700">
                      VENDAS POR FORMA DE PAGAMENTO
                    </div>
                    <div className="divide-y">
                      <div className="flex items-center justify-between px-4 py-3 bg-blue-50">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">Dinheiro</span>
                        </div>
                        <span className="font-bold text-lg text-blue-700">
                          R$ {(caixaSelecionado.vendasDinheiro || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-purple-50">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-purple-600" />
                          <span className="font-medium">Cartão Crédito</span>
                        </div>
                        <span className="font-bold text-lg text-purple-700">
                          R$ {(caixaSelecionado.vendasCredito || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-teal-50">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-teal-600" />
                          <span className="font-medium">Cartão Débito</span>
                        </div>
                        <span className="font-bold text-lg text-teal-700">
                          R$ {(caixaSelecionado.vendasDebito || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-cyan-50">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-5 w-5 text-cyan-600" />
                          <span className="font-medium">PIX</span>
                        </div>
                        <span className="font-bold text-lg text-cyan-700">
                          R$ {(caixaSelecionado.vendasPix || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-100 font-bold">
                        <span>TOTAL DE VENDAS</span>
                        <span className="text-xl">R$ {(caixaSelecionado.totalVendas || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Outras Movimentações */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 font-semibold text-sm text-gray-700">
                      OUTRAS MOVIMENTAÇÕES
                    </div>
                    <div className="divide-y">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle className="h-5 w-5 text-green-600" />
                          <span>Reforços</span>
                        </div>
                        <span className="font-bold text-green-600">
                          + R$ {(caixaSelecionado.reforcos || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ArrowDownCircle className="h-5 w-5 text-red-600" />
                          <span>Sangrias</span>
                        </div>
                        <span className="font-bold text-red-600">
                          - R$ {(caixaSelecionado.sangrias || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo do Caixa */}
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <div className="bg-gray-200 px-4 py-2 font-semibold text-sm text-gray-700">
                      RESUMO DO CAIXA
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor Inicial:</span>
                        <span className="font-bold">R$ {(caixaSelecionado.valorInicial || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-green-700">
                        <span>Total Entradas:</span>
                        <span className="font-bold">+ R$ {(caixaSelecionado.totalEntradas || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-700">
                        <span>Total Saídas:</span>
                        <span className="font-bold">- R$ {(caixaSelecionado.totalSaidas || 0).toFixed(2)}</span>
                      </div>
                      <hr />
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Valor Final:</span>
                        <span className="font-bold text-xl">R$ {(caixaSelecionado.valorFinal || caixaSelecionado.valorAtual || 0).toFixed(2)}</span>
                      </div>
                      {(caixaSelecionado.quebra || 0) !== 0 && (
                        <div className={`mt-2 p-2 rounded ${caixaSelecionado.quebra > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <strong>{caixaSelecionado.quebra > 0 ? 'Sobra' : 'Falta'}:</strong> R$ {Math.abs(caixaSelecionado.quebra).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum caixa selecionado
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
              <Button variant="outline" onClick={() => setDialogRelatorioUltimo(false)}>
                <X className="h-4 w-4 mr-2" />
                Fechar
              </Button>
              {caixaSelecionado && (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => gerarPDFRelatorioCaixa(caixaSelecionado, 'Sistema Cafeterias')}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}
