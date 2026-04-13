'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useVendas, useProdutos, useCategorias, useMovimentacoesBI } from '@/hooks/useSupabase';
import { useBIData } from '@/hooks/useBIData';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { KPICards } from '@/components/bi/KPICards';
import { FiltrosBI } from '@/components/bi/FiltrosBI';
import { VendasPorDiaChart, VendasPorFormaChart, VendasPorTipoChart, VendasPorCategoriaChart, AnaliseHorarioChart, AnaliseDiaSemanaChart } from '@/components/bi/Charts';
import { ProdutosMaisVendidos, VendasPorOperador, FluxoCaixaResumo, LucroBrutoPorProduto } from '@/components/bi/Tabelas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, DollarSign, PiggyBank, Download, ChevronLeft, WashingMachine } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { exportToPDF, formatCurrencyPDF, fetchEmpresaPDFData } from '@/lib/export-pdf';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─────────────────────────────────────────
// Lavanderia BI Chart Config
// ─────────────────────────────────────────
const LAV_COLORS = ['#0ea5e9', '#f59e0b', '#22c55e', '#10b981', '#ef4444'];

const lavChartConfig: ChartConfig = {
  quantidade: { label: 'Quantidade', color: '#0ea5e9' },
  valor: { label: 'Valor (R$)', color: '#10b981' },
  os: { label: 'Ordens de Serviço', color: '#0ea5e9' },
};

const STATUS_LABELS: Record<string, string> = {
  recebida: 'Recebidas',
  em_lavagem: 'Em Lavagem',
  pronta: 'Prontas',
  entregue: 'Entregues',
  cancelada: 'Canceladas',
};

const STATUS_COLORS: Record<string, string> = {
  recebida: '#f59e0b',
  em_lavagem: '#3b82f6',
  pronta: '#22c55e',
  entregue: '#10b981',
  cancelada: '#ef4444',
};

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
  const { movimentacoes, loading: loadingCaixa } = useMovimentacoesBI();
  const { empresaId } = useAuth();

  // ── OS Lavanderia data for BI ──
  const [osLavanderia, setOsLavanderia] = useState<any[]>([]);
  const [loadingOS, setLoadingOS] = useState(true);

  useEffect(() => {
    if (!empresaId) return;
    const loadOSLavanderia = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('ordens_servico')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('criado_em', { ascending: false });

        if (error) throw error;

        const parsed = (data || [])
          .filter((o: any) => (o.observacoes || '').startsWith('[LAVANDERIA]'))
          .map((o: any) => {
            let parsedItens: any[] = [];
            try {
              const raw = o.servicos;
              parsedItens = (typeof raw === 'string' ? JSON.parse(raw) : (raw || []));
            } catch { /* ignore */ }

            const totalPecas = parsedItens.reduce((acc: number, i: any) => acc + (i.quantidade || 0), 0);

            const statusMap: Record<string, string> = {
              aberta: 'recebida', em_andamento: 'em_lavagem',
              concluida: 'pronta', aprovada: 'entregue', cancelada: 'cancelada',
            };

            return {
              id: o.id,
              status: statusMap[o.status] || o.status,
              valorTotal: parseFloat(o.valor_total) || 0,
              totalPecas,
              criadoEm: o.criado_em || '',
              itens: parsedItens,
            };
          });

        setOsLavanderia(parsed);
      } catch (err) {
        console.error('Erro ao carregar OS Lavanderia:', err);
        setOsLavanderia([]);
      } finally {
        setLoadingOS(false);
      }
    };
    loadOSLavanderia();
  }, [empresaId]);

  // ── Lavanderia BI data ──
  const osByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    osLavanderia.forEach(os => {
      const s = os.status;
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, quantidade]) => ({
        status: STATUS_LABELS[status] || status,
        quantidade,
        fill: STATUS_COLORS[status] || '#94a3b8',
      }));
  }, [osLavanderia]);

  const osEvolution = useMemo(() => {
    const meses: { mes: string; os: number; valor: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(new Date(), i));
      const mEnd = endOfMonth(subMonths(new Date(), i));
      let count = 0;
      let total = 0;
      osLavanderia.forEach(os => {
        if (!os.criadoEm) return;
        const d = new Date(os.criadoEm);
        if (d >= mStart && d <= mEnd) {
          count += 1;
          total += os.valorTotal || 0;
        }
      });
      meses.push({
        mes: format(mStart, 'MMM/yy', { locale: ptBR }),
        os: count,
        valor: total,
      });
    }
    return meses;
  }, [osLavanderia]);

  const topLavanderiaItems = useMemo(() => {
    const itemMap: Record<string, { nome: string; quantidade: number; valor: number }> = {};
    osLavanderia.forEach(os => {
      (os.itens || []).forEach((item: any) => {
        const desc = item.descricaoPeca || item.descricao || 'Outros';
        if (!itemMap[desc]) itemMap[desc] = { nome: desc, quantidade: 0, valor: 0 };
        itemMap[desc].quantidade += item.quantidade || 0;
        itemMap[desc].valor += item.total || 0;
      });
    });
    return Object.values(itemMap)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10)
      .map(p => ({
        nome: p.nome.length > 25 ? p.nome.substring(0, 23) + '…' : p.nome,
        quantidade: p.quantidade,
        valor: p.valor,
      }));
  }, [osLavanderia]);

  const lavanderiaRevenue = useMemo(() => {
    const totalOS = osLavanderia.length;
    const totalRevenue = osLavanderia.reduce((acc, os) => acc + (os.valorTotal || 0), 0);
    const totalPecas = osLavanderia.reduce((acc, os) => acc + (os.totalPecas || 0), 0);
    const ticketMedio = totalOS > 0 ? totalRevenue / totalOS : 0;
    return { totalOS, totalRevenue, totalPecas, ticketMedio };
  }, [osLavanderia]);

  const loading = loadingVendas || loadingProdutos || loadingCategorias || loadingCaixa || loadingOS;

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
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Dashboard BI</h1>
                <p className="text-muted-foreground">Análises e métricas do seu estabelecimento</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                const empresaInfo = await fetchEmpresaPDFData(empresaId);
                exportToPDF({
                  title: 'Relatório BI - Produtos Mais Vendidos',
                  subtitle: bi.periodoFormatado,
                  columns: [
                    { header: 'Produto', accessor: (row: any) => row.nome },
                    { header: 'Categoria', accessor: (row: any) => {
                      const cat = categorias.find((c: any) => c.id === row.categoriaId);
                      return cat?.nome || '-';
                    }},
                    { header: 'Qtd. Vendida', accessor: (row: any) => row.quantidadeTotal },
                    { header: 'Valor Total', accessor: (row: any) => formatCurrencyPDF(row.valorTotal) },
                    { header: 'Ticket Médio', accessor: (row: any) => formatCurrencyPDF(row.ticketMedio) },
                    { header: '% Vendas', accessor: (row: any) => `${row.percentualVendas?.toFixed(1)}%` },
                  ],
                  data: bi.produtosMaisVendidos,
                  filename: 'relatorio-bi-produtos',
                  orientation: 'landscape',
                  summary: [
                    { label: 'Total de Produtos', value: bi.produtosMaisVendidos.length },
                    { label: 'Receita Total', value: formatCurrencyPDF(bi.produtosMaisVendidos.reduce((acc: number, p: any) => acc + (p.valorTotal || 0), 0)) },
                    { label: 'Unidades Vendidas', value: bi.produtosMaisVendidos.reduce((acc: number, p: any) => acc + (p.quantidadeTotal || 0), 0) },
                  ],
                  ...empresaInfo,
                });
              }}
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
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
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList className="grid w-min md:w-auto md:inline-grid grid-cols-6 min-w-full md:min-w-0">
              <TabsTrigger value="visao-geral" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger value="vendas" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Vendas</span>
              </TabsTrigger>
              <TabsTrigger value="produtos" className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
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
              <TabsTrigger value="lavanderia" className="flex items-center gap-2">
                <WashingMachine className="h-4 w-4" />
                <span className="hidden sm:inline">Lavanderia</span>
              </TabsTrigger>
            </TabsList>
            </div>

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

            {/* Tab: Lavanderia */}
            <TabsContent value="lavanderia" className="space-y-6">
              {/* Lavanderia Summary KPIs */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border border-gray-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-sky-100 flex items-center justify-center">
                          <WashingMachine className="h-6 w-6 text-sky-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total de OS</p>
                          <p className="text-2xl font-bold">{lavanderiaRevenue.totalOS}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Receita Total</p>
                          <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lavanderiaRevenue.totalRevenue)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                          <BarChart3 className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Ticket Médio</p>
                          <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lavanderiaRevenue.ticketMedio)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Peças</p>
                          <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR').format(lavanderiaRevenue.totalPecas)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>

              {/* OS by Status (Donut) + Evolution (Area) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">OS por Status</CardTitle>
                      <CardDescription>Distribuição das ordens de serviço</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={lavChartConfig} className="h-[280px] w-full">
                        <PieChart>
                          <Pie
                            data={osByStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="quantidade"
                            nameKey="status"
                            stroke="none"
                          >
                            {osByStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
                        {osByStatus.map((item, index) => (
                          <div key={item.status} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span className="text-xs text-muted-foreground">{item.status} ({item.quantidade})</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Evolução de OS (6 meses)</CardTitle>
                      <CardDescription>Quantidade e receita mensal</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={lavChartConfig} className="h-[280px] w-full">
                        <AreaChart data={osEvolution} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="lavGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                              <stop offset="60%" stopColor="#0ea5e9" stopOpacity={0.15} />
                              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                          <XAxis dataKey="mes" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                          <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area type="monotone" dataKey="os" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#lavGradient)" />
                        </AreaChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Top Laundry Items (Horizontal Bar) */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Top Peças por Quantidade</CardTitle>
                    <CardDescription>Itens mais processados na lavanderia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topLavanderiaItems.length === 0 ? (
                      <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                        Nenhuma peça registrada
                      </div>
                    ) : (
                      <ChartContainer config={lavChartConfig} className="h-[280px] w-full">
                        <BarChart data={[...topLavanderiaItems].reverse()} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                          <defs>
                            <linearGradient id="lavBarGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.5} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                          <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="nome" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} width={115} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="quantidade" radius={[0, 4, 4, 0]} barSize={20} fill="url(#lavBarGrad)" />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Revenue per Month (Bar) */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Receita da Lavanderia (6 meses)</CardTitle>
                    <CardDescription>Faturamento mensal dos serviços</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={lavChartConfig} className="h-[280px] w-full">
                      <BarChart data={osEvolution} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="lavRevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                        <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                        <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={36} fill="url(#lavRevGrad)" />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
