'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useVendas, useContas } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function FinanceiroPage() {
  const { user } = useAuth();
  const { vendas, loading: loadingVendas } = useVendas();
  const { 
    contas, 
    loading: loadingContas, 
    adicionarConta, 
    registrarPagamento,
    contasPagar,
    contasReceber,
    totalPagarPendente,
    totalReceberPendente,
    totalPago,
    totalRecebido
  } = useContas();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPagamentoOpen, setDialogPagamentoOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [tipoConta, setTipoConta] = useState<'pagar' | 'receber'>('pagar');
  const { toast } = useToast();

  const loading = loadingVendas || loadingContas;

  // Calcular estatísticas de vendas
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendasFechadas = vendas.filter(v => v.status === 'fechada');
  
  const vendasHoje = vendasFechadas.filter(v => {
    const dataVenda = new Date(v.criadoEm);
    dataVenda.setHours(0, 0, 0, 0);
    return dataVenda.getTime() === hoje.getTime();
  });

  const totalVendasHoje = vendasHoje.reduce((acc, v) => acc + (v.total || 0), 0);

  // Calcular saldo projetado
  const saldoProjetado = totalReceberPendente - totalPagarPendente;

  // Contas vencidas
  const contasVencidas = contas.filter(c => 
    c.status === 'pendente' && 
    c.vencimento && 
    new Date(c.vencimento) < hoje
  );

  const handleSalvarConta = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const vencimentoStr = formData.get('vencimento') as string;
      const vencimento = vencimentoStr ? new Date(vencimentoStr + 'T00:00:00') : null;
      
      await adicionarConta({
        tipo: tipoConta,
        descricao: formData.get('descricao') as string,
        valor: parseFloat(formData.get('valor') as string) || 0,
        vencimento: vencimento,
        categoria: formData.get('categoria') as string,
        fornecedor: formData.get('fornecedor') as string,
      });

      toast({
        title: 'Conta cadastrada!',
        description: `A conta a ${tipoConta} foi adicionada com sucesso.`,
      });

      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível cadastrar a conta.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRegistrarPagamento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      await registrarPagamento(contaSelecionada.id, {
        valor: parseFloat(formData.get('valor') as string) || contaSelecionada.valor,
        formaPagamento: formData.get('formaPagamento') as string,
        observacao: formData.get('observacao') as string,
      });

      toast({
        title: 'Pagamento registrado!',
        description: 'O pagamento foi registrado com sucesso.',
      });

      setDialogPagamentoOpen(false);
      setContaSelecionada(null);
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível registrar o pagamento.',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (conta: any) => {
    if (conta.status === 'pago') {
      return <Badge className="bg-green-500">Pago</Badge>;
    }
    
    if (conta.vencimento && new Date(conta.vencimento) < hoje) {
      return <Badge className="bg-red-500">Vencida</Badge>;
    }
    
    const diasVencimento = conta.vencimento 
      ? Math.ceil((new Date(conta.vencimento).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    if (diasVencimento !== null && diasVencimento <= 3) {
      return <Badge className="bg-yellow-500">Vence em {diasVencimento}d</Badge>;
    }
    
    return <Badge className="bg-blue-500">Pendente</Badge>;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Financeiro' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Admin' },
          { title: 'Financeiro' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Área Financeira</h1>
              <p className="text-muted-foreground">
                Gerencie o fluxo de caixa e contas do estabelecimento
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Conta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Conta</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova conta a pagar ou receber
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSalvarConta}>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={tipoConta === 'pagar' ? 'default' : 'outline'}
                        className={tipoConta === 'pagar' ? 'bg-red-500 hover:bg-red-600' : ''}
                        onClick={() => setTipoConta('pagar')}
                      >
                        <ArrowUpCircle className="h-4 w-4 mr-2" />
                        A Pagar
                      </Button>
                      <Button
                        type="button"
                        variant={tipoConta === 'receber' ? 'default' : 'outline'}
                        className={tipoConta === 'receber' ? 'bg-green-500 hover:bg-green-600' : ''}
                        onClick={() => setTipoConta('receber')}
                      >
                        <ArrowDownCircle className="h-4 w-4 mr-2" />
                        A Receber
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição *</Label>
                      <Input id="descricao" name="descricao" placeholder="Ex: Aluguel do mês" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="valor">Valor (R$) *</Label>
                        <Input id="valor" name="valor" type="number" step="0.01" placeholder="0,00" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vencimento">Vencimento</Label>
                        <Input id="vencimento" name="vencimento" type="date" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="categoria">Categoria</Label>
                        <Select name="categoria">
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {tipoConta === 'pagar' ? (
                              <>
                                <SelectItem value="fornecedores">Fornecedores</SelectItem>
                                <SelectItem value="aluguel">Aluguel</SelectItem>
                                <SelectItem value="funcionarios">Funcionários</SelectItem>
                                <SelectItem value="impostos">Impostos</SelectItem>
                                <SelectItem value="servicos">Serviços</SelectItem>
                                <SelectItem value="outros">Outros</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="vendas">Vendas</SelectItem>
                                <SelectItem value="servicos">Serviços</SelectItem>
                                <SelectItem value="aluguel">Aluguel Recebido</SelectItem>
                                <SelectItem value="outros">Outros</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fornecedor">
                          {tipoConta === 'pagar' ? 'Fornecedor' : 'Cliente'}
                        </Label>
                        <Input 
                          id="fornecedor" 
                          name="fornecedor" 
                          placeholder={tipoConta === 'pagar' ? 'Nome do fornecedor' : 'Nome do cliente'} 
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Salvar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Alerta de contas vencidas */}
          {contasVencidas.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-800">
                      Atenção: {contasVencidas.length} conta(s) vencida(s)
                    </p>
                    <p className="text-sm text-red-700">
                      Você tem {contasVencidas.length} conta(s) com vencimento ultrapassado. Regularize o quanto antes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas Hoje</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {totalVendasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <ArrowUpCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">A Pagar</p>
                    <p className="text-2xl font-bold text-red-600">
                      R$ {totalPagarPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <ArrowDownCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">A Receber</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {totalReceberPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${saldoProjetado >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Wallet className={`h-6 w-6 ${saldoProjetado >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Projetado</p>
                    <p className={`text-2xl font-bold ${saldoProjetado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {saldoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="visao" className="space-y-4">
            <TabsList>
              <TabsTrigger value="visao">Visão Geral</TabsTrigger>
              <TabsTrigger value="pagar">
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                A Pagar ({contasPagar.length})
              </TabsTrigger>
              <TabsTrigger value="receber">
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                A Receber ({contasReceber.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab Visão Geral */}
            <TabsContent value="visao" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo a Pagar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pendente</span>
                        <span className="font-semibold text-red-600">
                          R$ {totalPagarPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pago</span>
                        <span className="font-semibold text-green-600">
                          R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo a Receber</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pendente</span>
                        <span className="font-semibold text-blue-600">
                          R$ {totalReceberPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recebido</span>
                        <span className="font-semibold text-green-600">
                          R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Vendas Recentes */}
              <Card>
                <CardHeader>
                  <CardTitle>Vendas Recentes</CardTitle>
                  <CardDescription>Últimas vendas realizadas no PDV</CardDescription>
                </CardHeader>
                <CardContent>
                  {vendas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma venda registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {vendas.slice(0, 5).map((venda) => (
                        <div key={venda.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="font-medium">
                              {venda.tipo === 'mesa' ? `Mesa ${venda.mesaId}` : 
                               venda.tipo === 'delivery' ? 'Delivery' : 'Balcão'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(venda.criadoEm).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(venda.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <p className="font-bold text-green-600">
                            R$ {(venda.total || 0).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab A Pagar */}
            <TabsContent value="pagar">
              <Card>
                <CardHeader>
                  <CardTitle>Contas a Pagar</CardTitle>
                  <CardDescription>Gerencie suas despesas e pagamentos</CardDescription>
                </CardHeader>
                <CardContent>
                  {contasPagar.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ArrowUpCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma conta a pagar</p>
                      <p className="text-sm">Clique em "Nova Conta" para adicionar</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contasPagar.map((conta) => (
                            <TableRow key={conta.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{conta.descricao}</p>
                                  {conta.fornecedor && (
                                    <p className="text-sm text-muted-foreground">{conta.fornecedor}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{conta.categoria || '-'}</TableCell>
                              <TableCell>
                                {conta.vencimento ? new Date(conta.vencimento).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>
                              <TableCell className="font-semibold">
                                R$ {conta.valor?.toFixed(2)}
                              </TableCell>
                              <TableCell>{getStatusBadge(conta)}</TableCell>
                              <TableCell className="text-right">
                                {conta.status === 'pendente' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setContaSelecionada(conta);
                                      setDialogPagamentoOpen(true);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Pagar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab A Receber */}
            <TabsContent value="receber">
              <Card>
                <CardHeader>
                  <CardTitle>Contas a Receber</CardTitle>
                  <CardDescription>Gerencie seus recebíveis</CardDescription>
                </CardHeader>
                <CardContent>
                  {contasReceber.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ArrowDownCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma conta a receber</p>
                      <p className="text-sm">Clique em "Nova Conta" para adicionar</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contasReceber.map((conta) => (
                            <TableRow key={conta.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{conta.descricao}</p>
                                  {conta.fornecedor && (
                                    <p className="text-sm text-muted-foreground">{conta.fornecedor}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{conta.categoria || '-'}</TableCell>
                              <TableCell>
                                {conta.vencimento ? new Date(conta.vencimento).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>
                              <TableCell className="font-semibold">
                                R$ {conta.valor?.toFixed(2)}
                              </TableCell>
                              <TableCell>{getStatusBadge(conta)}</TableCell>
                              <TableCell className="text-right">
                                {conta.status === 'pendente' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setContaSelecionada(conta);
                                      setDialogPagamentoOpen(true);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Receber
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>

      {/* Dialog Pagamento */}
      <Dialog open={dialogPagamentoOpen} onOpenChange={setDialogPagamentoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {contaSelecionada?.tipo === 'pagar' ? 'Registrar Pagamento' : 'Registrar Recebimento'}
            </DialogTitle>
            <DialogDescription>
              {contaSelecionada?.descricao} - R$ {contaSelecionada?.valor?.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegistrarPagamento}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor a {contaSelecionada?.tipo === 'pagar' ? 'Pagar' : 'Receber'}</Label>
                <Input 
                  id="valor" 
                  name="valor" 
                  type="number" 
                  step="0.01"
                  defaultValue={contaSelecionada?.valor}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                <Select name="formaPagamento" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Dinheiro
                      </div>
                    </SelectItem>
                    <SelectItem value="pix">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        PIX
                      </div>
                    </SelectItem>
                    <SelectItem value="credito">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cartão de Crédito
                      </div>
                    </SelectItem>
                    <SelectItem value="debito">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cartão de Débito
                      </div>
                    </SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Input id="observacao" name="observacao" placeholder="Opcional" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogPagamentoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
