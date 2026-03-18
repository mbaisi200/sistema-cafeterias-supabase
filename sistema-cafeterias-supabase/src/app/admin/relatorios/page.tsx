'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useVendas, useProdutos, useCategorias, useCaixa } from '@/hooks/useFirestore';
import { useBIData } from '@/hooks/useBIData';
import { KPICards } from '@/components/bi/KPICards';
import { FiltrosBI } from '@/components/bi/FiltrosBI';
import { VendasPorDiaChart, VendasPorFormaChart, VendasPorTipoChart, VendasPorCategoriaChart, AnaliseHorarioChart, AnaliseDiaSemanaChart } from '@/components/bi/Charts';
import { ProdutosMaisVendidos, VendasPorOperador, FluxoCaixaResumo, LucroBrutoPorProduto } from '@/components/bi/Tabelas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, PieChart, DollarSign, PiggyBank } from 'lucide-react';
import { motion } from 'framer-motion';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardContent className="p-6"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

export default function RelatoriosPage() {
  const { vendas, loading: loadingVendas } = useVendas();
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { categorias, loading: loadingCategorias } = useCategorias();
  const { movimentacoes, loading: loadingCaixa } = useCaixa();

  const loading = loadingVendas || loadingProdutos || loadingCategorias || loadingCaixa;

  const bi = useBIData(vendas, produtos, categorias, movimentacoes);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Relatórios' }]}>
          <LoadingSkeleton />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Relatórios' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Dashboard BI</h1>
              <p className="text-muted-foreground">Análises e métricas do seu estabelecimento</p>
            </div>
          </div>

          {/* Filtros */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <FiltrosBI
              filtros={bi.filtros}
              periodoFormatado={bi.periodoFormatado}
              opcoesFiltros={bi.opcoesFiltros}
              onAtualizarFiltros={bi.atualizarFiltros}
              onResetarFiltros={bi.resetarFiltros}
            />
          </motion.div>

          {/* KPIs */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }}>
            <KPICards kpis={bi.kpis} />
          </motion.div>

          {/* Tabs de navegação */}
          <Tabs defaultValue="visao-geral" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto lg:inline-grid">
              <TabsTrigger value="visao-geral" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger value="vendas" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Vendas</span>
              </TabsTrigger>
              <TabsTrigger value="produtos" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                <span className="hidden sm:inline">Produtos</span>
              </TabsTrigger>
              <TabsTrigger value="lucro-bruto" className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                <span className="hidden sm:inline">Lucro Bruto</span>
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Financeiro</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Visão Geral */}
            <TabsContent value="visao-geral" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VendasPorDiaChart dados={bi.vendasPorDia} />
                <VendasPorFormaChart dados={bi.vendasPorFormaPagamento} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VendasPorCategoriaChart dados={bi.vendasPorCategoria} />
                <AnaliseHorarioChart dados={bi.analisePorHorario} />
              </div>
              <ProdutosMaisVendidos dados={bi.produtosMaisVendidos} categorias={categorias} />
            </TabsContent>

            {/* Tab: Vendas */}
            <TabsContent value="vendas" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VendasPorDiaChart dados={bi.vendasPorDia} />
                <VendasPorTipoChart dados={bi.vendasPorTipo} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VendasPorFormaChart dados={bi.vendasPorFormaPagamento} />
                <AnaliseDiaSemanaChart dados={bi.analisePorDiaSemana} />
              </div>
              <VendasPorOperador dados={bi.vendasPorOperador} />
            </TabsContent>

            {/* Tab: Produtos */}
            <TabsContent value="produtos" className="space-y-6">
              <ProdutosMaisVendidos dados={bi.produtosMaisVendidos} categorias={categorias} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VendasPorCategoriaChart dados={bi.vendasPorCategoria} />
                <AnaliseHorarioChart dados={bi.analisePorHorario} />
              </div>
            </TabsContent>

            {/* Tab: Lucro Bruto */}
            <TabsContent value="lucro-bruto" className="space-y-6">
              <LucroBrutoPorProduto 
                dados={bi.lucroBrutoPorProduto} 
                resumo={bi.resumoLucroBruto}
                categorias={categorias} 
              />
            </TabsContent>

            {/* Tab: Financeiro */}
            <TabsContent value="financeiro" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <VendasPorDiaChart dados={bi.vendasPorDia} />
                </div>
                <FluxoCaixaResumo dados={bi.fluxoCaixa} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VendasPorFormaChart dados={bi.vendasPorFormaPagamento} />
                <VendasPorOperador dados={bi.vendasPorOperador} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
