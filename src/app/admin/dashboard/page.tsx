'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardCard } from '@/components/layout/DashboardCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutos, useVendas, useFuncionarios, useContas } from '@/hooks/useFirestore';
import {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { vendas, loading: loadingVendas } = useVendas();
  const { funcionarios, loading: loadingFuncionarios } = useFuncionarios();
  const { totalPagarPendente, totalReceberPendente, loading: loadingContas } = useContas();

  const loading = loadingProdutos || loadingVendas || loadingFuncionarios || loadingContas;

  // Calcular estatísticas
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Semana atual e anterior
  const inicioSemanaAtual = new Date(hoje);
  inicioSemanaAtual.setDate(hoje.getDate() - hoje.getDay());
  
  const inicioSemanaAnterior = new Date(inicioSemanaAtual);
  inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);
  
  const fimSemanaAnterior = new Date(inicioSemanaAtual);
  fimSemanaAnterior.setDate(fimSemanaAnterior.getDate() - 1);

  const vendasHoje = vendas.filter(v => {
    const dataVenda = new Date(v.criadoEm);
    dataVenda.setHours(0, 0, 0, 0);
    return dataVenda.getTime() === hoje.getTime() && (v.status === 'concluida' || v.status === 'fechada');
  });

  const vendasSemanaAtual = vendas.filter(v => {
    const dataVenda = new Date(v.criadoEm);
    return dataVenda >= inicioSemanaAtual && (v.status === 'concluida' || v.status === 'fechada');
  });

  const vendasSemanaAnterior = vendas.filter(v => {
    const dataVenda = new Date(v.criadoEm);
    return dataVenda >= inicioSemanaAnterior && dataVenda <= fimSemanaAnterior && (v.status === 'concluida' || v.status === 'fechada');
  });

  const vendasMes = vendas.filter(v => {
    const dataVenda = new Date(v.criadoEm);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return dataVenda >= inicioMes && (v.status === 'concluida' || v.status === 'fechada');
  });

  const totalVendasHoje = vendasHoje.reduce((acc, v) => acc + (v.total || 0), 0);
  const totalVendasSemanaAtual = vendasSemanaAtual.reduce((acc, v) => acc + (v.total || 0), 0);
  const totalVendasSemanaAnterior = vendasSemanaAnterior.reduce((acc, v) => acc + (v.total || 0), 0);
  const totalVendasMes = vendasMes.reduce((acc, v) => acc + (v.total || 0), 0);
  const ticketMedio = vendasHoje.length > 0 ? totalVendasHoje / vendasHoje.length : 0;

  // Calcular variação percentual
  const variacaoVendas = totalVendasSemanaAnterior > 0 
    ? ((totalVendasSemanaAtual - totalVendasSemanaAnterior) / totalVendasSemanaAnterior) * 100 
    : totalVendasSemanaAtual > 0 ? 100 : 0;

  const produtosEstoqueBaixo = produtos.filter(p => p.estoqueAtual <= p.estoqueMinimo);
  const funcionariosAtivos = funcionarios.filter(f => f.ativo);

  // Saldo projetado
  const saldoProjetado = totalReceberPendente - totalPagarPendente;

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Dashboard' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
          { title: 'Dashboard' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Bem-vindo, {user?.nome}! Resumo do seu estabelecimento.
              </p>
            </div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <a href="/pdv">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Abrir PDV
              </a>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Vendas Hoje"
              value={`R$ ${totalVendasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              description={`${vendasHoje.length} pedidos`}
              icon={DollarSign}
            />
            <DashboardCard
              title="Vendas da Semana"
              value={`R$ ${totalVendasSemanaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              description={
                <div className="flex items-center gap-1">
                  {variacaoVendas !== 0 && (
                    <>
                      {variacaoVendas > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={variacaoVendas > 0 ? 'text-green-500' : 'text-red-500'}>
                        {variacaoVendas > 0 ? '+' : ''}{variacaoVendas.toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">vs semana anterior</span>
                    </>
                  )}
                  {variacaoVendas === 0 && (
                    <span className="text-muted-foreground">Semana anterior: R$ 0</span>
                  )}
                </div>
              }
              icon={ShoppingCart}
            />
            <DashboardCard
              title="Ticket Médio"
              value={`R$ ${ticketMedio.toFixed(2)}`}
              description="Por pedido hoje"
              icon={Package}
            />
            <DashboardCard
              title="Funcionários Ativos"
              value={funcionariosAtivos.length}
              description="Trabalhando hoje"
              icon={Users}
            />
          </div>

          {/* Financial Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">A Receber</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {totalReceberPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">A Pagar</p>
                    <p className="text-2xl font-bold text-red-600">
                      R$ {totalPagarPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Projetado</p>
                    <p className={`text-2xl font-bold ${saldoProjetado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {saldoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Package className={`h-8 w-8 ${saldoProjetado >= 0 ? 'text-green-500' : 'text-red-500'} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {produtosEstoqueBaixo.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-orange-800">
                      Atenção: {produtosEstoqueBaixo.length} produtos com estoque baixo
                    </p>
                    <p className="text-sm text-orange-700">
                      Alguns produtos estão abaixo do estoque mínimo. Verifique o controle de estoque.
                    </p>
                  </div>
                  <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100" asChild>
                    <a href="/admin/estoque">Ver Estoque</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-blue-100">
              <CardHeader>
                <CardTitle>Produtos Cadastrados</CardTitle>
                <CardDescription>Resumo do cardápio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{produtos.length}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {produtos.filter(p => p.destaque).length} em destaque no PDV
                </p>
                <Button variant="link" className="p-0 h-auto mt-2" asChild>
                  <a href="/admin/produtos">
                    Gerenciar produtos <ArrowRight className="h-4 w-4 ml-1" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-blue-100">
              <CardHeader>
                <CardTitle>Pedidos Recentes</CardTitle>
                <CardDescription>Últimas vendas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{vendas.length}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total de vendas registradas
                </p>
                <Button variant="link" className="p-0 h-auto mt-2" asChild>
                  <a href="/admin/financeiro">
                    Ver financeiro <ArrowRight className="h-4 w-4 ml-1" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Week Comparison */}
          <Card className="border-blue-100">
            <CardHeader>
              <CardTitle>Comparativo Semanal</CardTitle>
              <CardDescription>Desempenho de vendas comparado com a semana anterior</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border border-blue-100 bg-blue-50">
                  <p className="text-sm text-muted-foreground">Semana Atual</p>
                  <p className="text-2xl font-bold mt-1">
                    R$ {totalVendasSemanaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">{vendasSemanaAtual.length} vendas</p>
                </div>
                <div className="p-4 rounded-lg border border-blue-100 bg-white">
                  <p className="text-sm text-muted-foreground">Semana Anterior</p>
                  <p className="text-2xl font-bold mt-1">
                    R$ {totalVendasSemanaAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">{vendasSemanaAnterior.length} vendas</p>
                </div>
              </div>
              {variacaoVendas !== 0 && (
                <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg ${variacaoVendas > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {variacaoVendas > 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    {variacaoVendas > 0 ? 'Crescimento' : 'Queda'} de {Math.abs(variacaoVendas).toFixed(1)}% 
                    em relação à semana anterior
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
