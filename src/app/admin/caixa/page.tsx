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
import { useState } from 'react';
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
} from 'lucide-react';

export default function CaixaPage() {
  const { caixaAberto, movimentacoes, historico, loading, abrirCaixa, fecharCaixa, adicionarReforco, adicionarSangria, resumo } = useCaixa();
  const { toast } = useToast();
  
  const [dialogAbertura, setDialogAbertura] = useState(false);
  const [dialogFechamento, setDialogFechamento] = useState(false);
  const [dialogReforco, setDialogReforco] = useState(false);
  const [dialogSangria, setDialogSangria] = useState(false);
  const [saving, setSaving] = useState(false);
  
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
              <Button 
                onClick={() => setDialogAbertura(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Unlock className="mr-2 h-4 w-4" />
                Abrir Caixa
              </Button>
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
                        className="flex items-center justify-between p-4 rounded-lg border bg-gray-50"
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
                              Aberto por {cx.abertoPorNome} • Fechado por {cx.fechadoPorNome}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">R$ {(cx.valorFinal || 0).toFixed(2)}</p>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                Fechar Caixa
              </DialogTitle>
              <DialogDescription>
                Confira os valores e informe o valor final em caixa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-100 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Valor Inicial:</span>
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
                  <span>Valor Esperado:</span>
                  <span className="font-bold text-blue-600">R$ {resumo.valorAtual.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Valor Final em Caixa (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={valorFechamento}
                  onChange={(e) => setValorFechamento(e.target.value)}
                />
                {valorFechamento && (
                  <div className="flex items-center gap-2 text-sm">
                    {parseFloat(valorFechamento) === resumo.valorAtual ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Valores conferem!
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1 ${parseFloat(valorFechamento) > resumo.valorAtual ? 'text-green-600' : 'text-red-600'}`}>
                        <AlertTriangle className="h-4 w-4" />
                        {parseFloat(valorFechamento) > resumo.valorAtual ? 'Sobra' : 'Falta'}: R$ {Math.abs(parseFloat(valorFechamento) - resumo.valorAtual).toFixed(2)}
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogFechamento(false)}>
                Cancelar
              </Button>
              <Button onClick={handleFecharCaixa} disabled={saving} variant="destructive">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Fechar Caixa
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

      </MainLayout>
    </ProtectedRoute>
  );
}
