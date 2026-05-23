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
import { VendasItensDia } from '@/components/bi/VendasItensDia';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, DollarSign, PiggyBank, Download, ChevronLeft, WashingMachine, Package, Database, Search, X } from 'lucide-react';
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
  const { empresaId, secoesPermitidas, nomeMarca } = useAuth();

  const [fornecedores, setFornecedores] = useState<any[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    const loadFornecedores = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from('fornecedores').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true);
      setFornecedores(data || []);
    };
    loadFornecedores();
  }, [empresaId]);

  const hasLavanderia = secoesPermitidas.some(s => s.startsWith('/admin/os-lavanderia'));

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

  const bi = useBIData(vendas, produtos, categorias, movimentacoes, fornecedores);

  // ── Estoque Tab state ──
  const [estoqueCategoria, setEstoqueCategoria] = useState('');
  const [estoqueSearch, setEstoqueSearch] = useState('');

  const estoqueData = useMemo(() => {
    let filtered = [...produtos];

    // Filtro global BI: fornecedores
    if (bi.filtros.fornecedores.length > 0) {
      filtered = filtered.filter(p => p.fornecedorId && bi.filtros.fornecedores.includes(p.fornecedorId));
    }
    // Filtro global BI: categorias
    if (bi.filtros.categorias.length > 0) {
      filtered = filtered.filter(p => p.categoriaId && bi.filtros.categorias.includes(p.categoriaId));
    }

    if (estoqueCategoria) {
      filtered = filtered.filter(p => p.categoriaId === estoqueCategoria);
    }
    if (estoqueSearch) {
      const s = estoqueSearch.toLowerCase();
      filtered = filtered.filter(p => p.nome.toLowerCase().includes(s));
    }

    return filtered.map(p => {
      const qtd = p.estoqueAtual || 0;
      const custo = p.custo || 0;
      const preco = p.preco || 0;
      const totalCusto = qtd * custo;
      const totalVenda = qtd * preco;
      return {
        ...p,
        totalCusto,
        totalVenda,
        resultado: totalVenda - totalCusto,
      };
    });
  }, [produtos, estoqueCategoria, estoqueSearch, bi.filtros.fornecedores, bi.filtros.categorias]);

  const estoqueTotais = useMemo(() => {
    const totalCusto = estoqueData.reduce((acc, p) => acc + p.totalCusto, 0);
    const totalVenda = estoqueData.reduce((acc, p) => acc + p.totalVenda, 0);
    return { totalCusto, totalVenda, resultado: totalVenda - totalCusto };
  }, [estoqueData]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' });
  const fmtQtd = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 0 });

  const fetchEmpresaInfo = async () => {
    if (!empresaId) return {};
    const { getSupabaseClient } = await import('@/lib/supabase');
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('empresas').select('nome_marca, nome, cnpj, telefone, email, logradouro, numero, complemento, bairro, cidade, estado, cep, logo_url').eq('id', empresaId).single();
    if (!data) return {};
    const { maskCNPJ, maskPhone } = await import('@/lib/masks');
    const nomeExibicao = data.nome || '';
    const enderecoPartes = [data.logradouro, data.numero, data.complemento, data.bairro, data.cidade, data.estado].filter(Boolean);
    return {
      logo: data.logo_url || undefined,
      companyInfo: { name: nomeExibicao, cnpj: data.cnpj ? `CNPJ: ${maskCNPJ(data.cnpj)}` : undefined, phone: data.telefone ? maskPhone(data.telefone) : undefined, email: data.email },
      footerText: enderecoPartes.length ? `${nomeExibicao} — ${enderecoPartes.join(', ')}` : undefined,
    };
  };

  const downloadXLS = (headers: string[], rows: any[][], filename: string) => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Dados</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${[headers, ...rows].map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
              <TabsList className={`grid w-min md:w-auto md:inline-grid min-w-full md:min-w-0 ${hasLavanderia ? 'grid-cols-8' : 'grid-cols-7'}`}>
              <TabsTrigger value="visao-geral" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger value="vendas" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Vendas</span>
              </TabsTrigger>
              <TabsTrigger value="estoque" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Estoque</span>
              </TabsTrigger>
              <TabsTrigger value="itens" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Itens</span>
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
              {hasLavanderia && (
              <TabsTrigger value="lavanderia" className="flex items-center gap-2">
                <WashingMachine className="h-4 w-4" />
                <span className="hidden sm:inline">Lavanderia</span>
              </TabsTrigger>
              )}
            </TabsList>
            </div>

            {/* Tab: Visão Geral */}
            <TabsContent value="visao-geral" className="space-y-6">
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  const empresaInfo = await fetchEmpresaInfo();
                  exportToPDF({
                    title: 'Visão Geral',
                    subtitle: bi.periodoFormatado,
                    columns: [
                      { header: 'Produto', accessor: (r: any) => r.nome },
                      { header: 'Categoria', accessor: (r: any) => { const cat = categorias.find((c: any) => c.id === r.categoriaId); return cat?.nome || '-'; }},
                      { header: 'Qtd. Vendida', accessor: (r: any) => r.quantidadeTotal },
                      { header: 'Valor Total', accessor: (r: any) => formatCurrencyPDF(r.valorTotal) },
                      { header: 'Ticket Médio', accessor: (r: any) => formatCurrencyPDF(r.ticketMedio) },
                      { header: '% Vendas', accessor: (r: any) => `${r.percentualVendas?.toFixed(1)}%` },
                    ],
                    data: bi.produtosMaisVendidos,
                    filename: 'relatorio-visao-geral',
                    orientation: 'landscape',
                    summary: [
                      { label: 'Faturamento Total', value: formatCurrencyPDF(bi.kpis[0]?.valor || 0) },
                      { label: 'Quantidade de Vendas', value: String(bi.kpis[1]?.valor || 0) },
                      { label: 'Ticket Médio', value: formatCurrencyPDF(bi.kpis[2]?.valor || 0) },
                      { label: 'Produtos Ativos', value: String(bi.kpis[3]?.valor || 0) },
                    ],
                    ...empresaInfo,
                  });
                }}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const headers = ['Produto', 'Categoria', 'Qtd. Vendida', 'Valor Total', 'Ticket Médio', '% Vendas'];
                  const rows = bi.produtosMaisVendidos.map((p: any) => [
                    p.nome,
                    categorias.find((c: any) => c.id === p.categoriaId)?.nome || '-',
                    String(p.quantidadeTotal),
                    fmt(p.valorTotal),
                    fmt(p.ticketMedio),
                    `${p.percentualVendas?.toFixed(1)}%`,
                  ]);
                  downloadXLS(headers, rows, 'visao-geral');
                }}>
                  <Download className="h-4 w-4 mr-1" /> XLS
                </Button>
              </div>
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
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  const empresaInfo = await fetchEmpresaInfo();
                  exportToPDF({
                    title: 'Relatório de Vendas',
                    subtitle: bi.periodoFormatado,
                    columns: [
                      { header: 'Operador', accessor: (r: any) => r.nome },
                      { header: 'Qtd. Vendas', accessor: (r: any) => r.quantidade },
                      { header: 'Valor Total', accessor: (r: any) => formatCurrencyPDF(r.valor) },
                    ],
                    data: bi.vendasPorOperador,
                    filename: 'relatorio-vendas',
                    orientation: 'landscape',
                    summary: [
                      { label: 'Faturamento Total', value: formatCurrencyPDF(bi.kpis[0]?.valor || 0) },
                      { label: 'Quantidade de Vendas', value: String(bi.kpis[1]?.valor || 0) },
                      { label: 'Ticket Médio', value: formatCurrencyPDF(bi.kpis[2]?.valor || 0) },
                    ],
                    ...empresaInfo,
                  });
                }}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const headers = ['Operador', 'Qtd. Vendas', 'Valor Total'];
                  const rows = bi.vendasPorOperador.map((r: any) => [
                    r.nome,
                    String(r.quantidade),
                    fmt(r.valor),
                  ]);
                  downloadXLS(headers, rows, 'vendas');
                }}>
                  <Download className="h-4 w-4 mr-1" /> XLS
                </Button>
              </div>
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

            {/* Tab: Estoque */}
            <TabsContent value="estoque" className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-2 border-primary/10 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Database className="h-5 w-5 text-blue-500" />
                          Relatório de Estoque
                        </CardTitle>
                        <CardDescription>Quantidades, custos e valores de venda por produto</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{estoqueData.length} produtos</Badge>
                        <Button variant="outline" size="sm" onClick={async () => {
                          const empresaInfo = await fetchEmpresaInfo();
                          exportToPDF({
                            title: 'Relatório de Estoque',
                            subtitle: `${estoqueData.length} produtos`,
                            columns: [
                              { header: 'Produto', accessor: (r: any) => r.nome },
                              { header: 'Categoria', accessor: (r: any) => categorias.find((c: any) => c.id === r.categoriaId)?.nome || '-' },
                              { header: 'Qtd', accessor: (r: any) => String(r.estoqueAtual || 0) },
                              { header: 'Custo Unit.', accessor: (r: any) => formatCurrencyPDF(r.custo || 0) },
                              { header: 'Venda Unit.', accessor: (r: any) => formatCurrencyPDF(r.preco || 0) },
                              { header: 'Total Custo', accessor: (r: any) => formatCurrencyPDF(r.totalCusto) },
                              { header: 'Total Venda', accessor: (r: any) => formatCurrencyPDF(r.totalVenda) },
                              { header: 'Resultado', accessor: (r: any) => formatCurrencyPDF(r.resultado) },
                            ],
                            data: estoqueData,
                            filename: `estoque-${new Date().toISOString().split('T')[0]}`,
                            orientation: 'landscape',
                            summary: [
                              { label: 'Total Produtos', value: String(estoqueData.length) },
                              { label: 'Total Custo', value: formatCurrencyPDF(estoqueTotais.totalCusto) },
                              { label: 'Total Venda', value: formatCurrencyPDF(estoqueTotais.totalVenda) },
                              { label: 'Resultado', value: formatCurrencyPDF(estoqueTotais.resultado) },
                            ],
                            ...empresaInfo,
                          });
                        }}>
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          const headers = ['Produto', 'Categoria', 'Qtd', 'Custo Unit.', 'Venda Unit.', 'Total Custo', 'Total Venda', 'Resultado'];
                          const rows = estoqueData.map((p: any) => [
                            p.nome,
                            categorias.find((c: any) => c.id === p.categoriaId)?.nome || '-',
                            String(p.estoqueAtual || 0),
                            fmt(p.custo || 0),
                            fmt(p.preco || 0),
                            fmt(p.totalCusto),
                            fmt(p.totalVenda),
                            fmt(p.resultado),
                          ]);
                          rows.push([]);
                          rows.push(['Total', '', '', '', '', fmt(estoqueTotais.totalCusto), fmt(estoqueTotais.totalVenda), fmt(estoqueTotais.resultado)]);
                          const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Estoque</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${[headers, ...rows].map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
                          const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `estoque-${new Date().toISOString().split('T')[0]}.xls`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}>
                          <Download className="h-4 w-4 mr-1" />
                          XLS
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Resumo */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800">
                        <Database className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                        <p className="text-xs text-muted-foreground mb-1">Produtos</p>
                        <p className="text-lg font-bold text-blue-600">{estoqueData.length}</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border border-orange-200 dark:border-orange-800">
                        <TrendingUp className="h-5 w-5 mx-auto mb-2 text-orange-600" />
                        <p className="text-xs text-muted-foreground mb-1">Total Custo</p>
                        <p className="text-lg font-bold text-orange-600">{fmt(estoqueTotais.totalCusto)}</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                        <DollarSign className="h-5 w-5 mx-auto mb-2 text-emerald-600" />
                        <p className="text-xs text-muted-foreground mb-1">Total Venda</p>
                        <p className="text-lg font-bold text-emerald-600">{fmt(estoqueTotais.totalVenda)}</p>
                      </div>
                      <div className={`text-center p-4 rounded-xl border ${estoqueTotais.resultado >= 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border-emerald-200 dark:border-emerald-800' : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200 dark:border-red-800'}`}>
                        <PiggyBank className={`h-5 w-5 mx-auto mb-2 ${estoqueTotais.resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                        <p className="text-xs text-muted-foreground mb-1">Resultado</p>
                        <p className={`text-lg font-bold ${estoqueTotais.resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {fmt(estoqueTotais.resultado)}
                        </p>
                      </div>
                    </div>

                    {/* Busca e Filtros */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-5 mb-6 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                          <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                          <Input
                            placeholder="Buscar produto por nome..."
                            value={estoqueSearch}
                            onChange={(e) => setEstoqueSearch(e.target.value)}
                            className="pl-10 h-11 text-base bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600 focus-visible:ring-blue-500 shadow-sm"
                          />
                          {estoqueSearch && (
                            <button
                              onClick={() => setEstoqueSearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                              <X className="h-3 w-3 text-slate-500" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">Categoria</span>
                          <Select value={estoqueCategoria} onValueChange={(v) => setEstoqueCategoria(v === '__all__' ? '' : v)}>
                            <SelectTrigger className="w-[180px] h-9 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600">
                              <SelectValue placeholder="Todas as categorias" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Todas as categorias</SelectItem>
                              {categorias.map((cat: any) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            <strong className="text-slate-700 dark:text-slate-200">{estoqueData.length}</strong> produto{estoqueData.length !== 1 ? 's' : ''} encontrado{estoqueData.length !== 1 ? 's' : ''}
                          </span>
                          {(estoqueCategoria || estoqueSearch) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEstoqueCategoria(''); setEstoqueSearch(''); }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Limpar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tabela */}
                    <Table className="w-full table-fixed [&_td]:px-1.5 [&_td]:py-2 [&_th]:px-1.5 [&_th]:h-9">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Produto</TableHead>
                          <TableHead className="w-[100px]">Categoria</TableHead>
                          <TableHead className="text-right w-[60px]">Qtd</TableHead>
                          <TableHead className="text-right w-[90px]">Custo</TableHead>
                          <TableHead className="text-right w-[90px]">Venda</TableHead>
                          <TableHead className="text-right w-[100px]">Custo Total</TableHead>
                          <TableHead className="text-right w-[100px]">Venda Total</TableHead>
                          <TableHead className="text-right w-[100px]">Resultado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {estoqueData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              Nenhum produto encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          estoqueData.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium truncate" title={p.nome}>{p.nome}</TableCell>
                              <TableCell className="truncate" title={categorias.find((c: any) => c.id === p.categoriaId)?.nome || ''}>{categorias.find((c: any) => c.id === p.categoriaId)?.nome || '-'}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">{fmtQtd(p.estoqueAtual || 0)}</TableCell>
                              <TableCell className={`text-right whitespace-nowrap ${p.custo > 0 ? '' : 'text-muted-foreground'}`}>{p.custo > 0 ? fmt(p.custo) : '-'}</TableCell>
                              <TableCell className={`text-right whitespace-nowrap ${p.preco > 0 ? '' : 'text-muted-foreground'}`}>{p.preco > 0 ? fmt(p.preco) : '-'}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">{fmt(p.totalCusto)}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">{fmt(p.totalVenda)}</TableCell>
                              <TableCell className={`text-right whitespace-nowrap font-semibold ${p.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {fmt(p.resultado)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Tab: Itens */}
            <TabsContent value="itens" className="space-y-6">
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  const empresaInfo = await fetchEmpresaInfo();
                  const itensAgrupados = vendas.reduce((acc: any, v: any) => {
                    (v.itens || []).forEach((item: any) => {
                      const nome = item.nome || produtos.find((p: any) => p.id === item.produtoId)?.nome || 'Item';
                      if (!acc[nome]) acc[nome] = { nome, quantidade: 0, valor: 0 };
                      acc[nome].quantidade += item.quantidade || 0;
                      acc[nome].valor += (item.preco || item.precoUnitario || 0) * (item.quantidade || 0);
                    });
                    return acc;
                  }, {} as Record<string, any>);
                  const dados = Object.values(itensAgrupados).sort((a: any, b: any) => b.valor - a.valor);
                  exportToPDF({
                    title: 'Relatório de Itens Vendidos',
                    subtitle: bi.periodoFormatado,
                    columns: [
                      { header: 'Item', accessor: (r: any) => r.nome },
                      { header: 'Qtd. Vendida', accessor: (r: any) => r.quantidade },
                      { header: 'Valor Total', accessor: (r: any) => formatCurrencyPDF(r.valor) },
                    ],
                    data: dados,
                    filename: 'relatorio-itens',
                    orientation: 'landscape',
                    summary: [
                      { label: 'Total de Itens', value: String(dados.length) },
                      { label: 'Qtd. Vendida', value: String(dados.reduce((a: number, i: any) => a + i.quantidade, 0)) },
                      { label: 'Valor Total', value: formatCurrencyPDF(dados.reduce((a: number, i: any) => a + i.valor, 0)) },
                    ],
                    ...empresaInfo,
                  });
                }}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const itensAgrupados = vendas.reduce((acc: any, v: any) => {
                    (v.itens || []).forEach((item: any) => {
                      const nome = item.nome || produtos.find((p: any) => p.id === item.produtoId)?.nome || 'Item';
                      if (!acc[nome]) acc[nome] = { nome, quantidade: 0, valor: 0 };
                      acc[nome].quantidade += item.quantidade || 0;
                      acc[nome].valor += (item.preco || item.precoUnitario || 0) * (item.quantidade || 0);
                    });
                    return acc;
                  }, {} as Record<string, any>);
                  const dados = Object.values(itensAgrupados).sort((a: any, b: any) => b.valor - a.valor);
                  const headers = ['Item', 'Qtd. Vendida', 'Valor Total'];
                  const rows = dados.map((r: any) => [r.nome, String(r.quantidade), fmt(r.valor)]);
                  downloadXLS(headers, rows, 'itens');
                }}>
                  <Download className="h-4 w-4 mr-1" /> XLS
                </Button>
              </div>
              <VendasItensDia />
            </TabsContent>

            {/* Tab: Produtos */}
            <TabsContent value="produtos" className="space-y-6">
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  const empresaInfo = await fetchEmpresaInfo();
                  exportToPDF({
                    title: 'Relatório de Produtos',
                    subtitle: bi.periodoFormatado,
                    columns: [
                      { header: 'Produto', accessor: (r: any) => r.nome },
                      { header: 'Categoria', accessor: (r: any) => { const cat = categorias.find((c: any) => c.id === r.categoriaId); return cat?.nome || '-'; }},
                      { header: 'Qtd. Vendida', accessor: (r: any) => r.quantidadeTotal },
                      { header: 'Valor Total', accessor: (r: any) => formatCurrencyPDF(r.valorTotal) },
                      { header: '% Vendas', accessor: (r: any) => `${r.percentualVendas?.toFixed(1)}%` },
                    ],
                    data: bi.produtosMaisVendidos,
                    filename: 'relatorio-produtos',
                    orientation: 'landscape',
                    summary: [
                      { label: 'Total de Produtos', value: String(bi.produtosMaisVendidos.length) },
                      { label: 'Total de Unidades', value: String(bi.produtosMaisVendidos.reduce((a: number, p: any) => a + p.quantidadeTotal, 0)) },
                      { label: 'Receita Total', value: formatCurrencyPDF(bi.produtosMaisVendidos.reduce((a: number, p: any) => a + p.valorTotal, 0)) },
                    ],
                    ...empresaInfo,
                  });
                }}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const headers = ['Produto', 'Categoria', 'Qtd. Vendida', 'Valor Total', '% Vendas'];
                  const rows = bi.produtosMaisVendidos.map((p: any) => [
                    p.nome,
                    categorias.find((c: any) => c.id === p.categoriaId)?.nome || '-',
                    String(p.quantidadeTotal),
                    fmt(p.valorTotal),
                    `${p.percentualVendas?.toFixed(1)}%`,
                  ]);
                  downloadXLS(headers, rows, 'produtos');
                }}>
                  <Download className="h-4 w-4 mr-1" /> XLS
                </Button>
              </div>
              <ProdutosMaisVendidos dados={bi.produtosMaisVendidos} categorias={categorias} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VendasPorCategoriaChart dados={bi.vendasPorCategoria} />
                <AnaliseHorarioChart dados={bi.analisePorHorario} />
              </div>
            </TabsContent>

            {/* Tab: Lucro Bruto */}
            <TabsContent value="lucro-bruto" className="space-y-6">
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  const empresaInfo = await fetchEmpresaInfo();
                  exportToPDF({
                    title: 'Relatório de Lucro Bruto',
                    subtitle: bi.periodoFormatado,
                    columns: [
                      { header: 'Produto', accessor: (r: any) => r.nome },
                      { header: 'Categoria', accessor: (r: any) => { const cat = categorias.find((c: any) => c.id === r.categoriaId); return cat?.nome || '-'; }},
                      { header: 'Qtd.', accessor: (r: any) => r.quantidadeVendida },
                      { header: 'Receita', accessor: (r: any) => formatCurrencyPDF(r.receitaTotal) },
                      { header: 'Custo', accessor: (r: any) => formatCurrencyPDF(r.custoTotal) },
                      { header: 'Lucro Bruto', accessor: (r: any) => formatCurrencyPDF(r.lucroBruto) },
                      { header: 'Margem', accessor: (r: any) => `${r.margemLucro.toFixed(1)}%` },
                    ],
                    data: bi.lucroBrutoPorProduto,
                    filename: 'relatorio-lucro-bruto',
                    orientation: 'landscape',
                    summary: [
                      { label: 'Receita Total', value: formatCurrencyPDF(bi.resumoLucroBruto?.receitaTotal || 0) },
                      { label: 'Custo Total', value: formatCurrencyPDF(bi.resumoLucroBruto?.custoTotal || 0) },
                      { label: 'Lucro Bruto', value: formatCurrencyPDF(bi.resumoLucroBruto?.lucroBrutoTotal || 0) },
                      { label: 'Margem Média', value: `${(bi.resumoLucroBruto?.margemMedia || 0).toFixed(1)}%` },
                    ],
                    ...empresaInfo,
                  });
                }}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const headers = ['Produto', 'Categoria', 'Qtd.', 'Receita', 'Custo', 'Lucro Bruto', 'Margem'];
                  const rows = bi.lucroBrutoPorProduto.map((p: any) => [
                    p.nome,
                    categorias.find((c: any) => c.id === p.categoriaId)?.nome || '-',
                    String(p.quantidadeVendida),
                    fmt(p.receitaTotal),
                    fmt(p.custoTotal),
                    fmt(p.lucroBruto),
                    `${p.margemLucro.toFixed(1)}%`,
                  ]);
                  downloadXLS(headers, rows, 'lucro-bruto');
                }}>
                  <Download className="h-4 w-4 mr-1" /> XLS
                </Button>
              </div>
              <LucroBrutoPorProduto 
                dados={bi.lucroBrutoPorProduto} 
                resumo={bi.resumoLucroBruto}
                categorias={categorias} 
              />
            </TabsContent>

            {/* Tab: Financeiro */}
            <TabsContent value="financeiro" className="space-y-6">
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  const empresaInfo = await fetchEmpresaInfo();
                  exportToPDF({
                    title: 'Relatório Financeiro',
                    subtitle: bi.periodoFormatado,
                    columns: [
                      { header: 'Operador', accessor: (r: any) => r.nome },
                      { header: 'Qtd. Vendas', accessor: (r: any) => r.quantidade },
                      { header: 'Valor Total', accessor: (r: any) => formatCurrencyPDF(r.valor) },
                    ],
                    data: bi.vendasPorOperador,
                    filename: 'relatorio-financeiro',
                    orientation: 'landscape',
                    summary: [
                      { label: 'Faturamento Total', value: formatCurrencyPDF(bi.kpis[0]?.valor || 0) },
                      { label: 'Entradas (Caixa)', value: formatCurrencyPDF(bi.fluxoCaixa.entradas || 0) },
                      { label: 'Saídas (Caixa)', value: formatCurrencyPDF(bi.fluxoCaixa.saidas || 0) },
                      { label: 'Saldo (Caixa)', value: formatCurrencyPDF(bi.fluxoCaixa.saldo || 0) },
                    ],
                    ...empresaInfo,
                  });
                }}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const headers = ['Operador', 'Qtd. Vendas', 'Valor Total'];
                  const rows = bi.vendasPorOperador.map((r: any) => [r.nome, String(r.quantidade), fmt(r.valor)]);
                  downloadXLS(headers, rows, 'financeiro');
                }}>
                  <Download className="h-4 w-4 mr-1" /> XLS
                </Button>
              </div>
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

            {hasLavanderia && (
            <TabsContent value="lavanderia" className="space-y-6">
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  const empresaInfo = await fetchEmpresaInfo();
                  exportToPDF({
                    title: 'Relatório Lavanderia',
                    subtitle: 'Geral',
                    columns: [
                      { header: 'Status', accessor: (r: any) => r.status },
                      { header: 'Quantidade', accessor: (r: any) => r.quantidade },
                    ],
                    data: osByStatus,
                    filename: 'relatorio-lavanderia',
                    orientation: 'landscape',
                    summary: [
                      { label: 'Total de OS', value: String(lavanderiaRevenue.totalOS) },
                      { label: 'Receita Total', value: formatCurrencyPDF(lavanderiaRevenue.totalRevenue) },
                      { label: 'Ticket Médio', value: formatCurrencyPDF(lavanderiaRevenue.ticketMedio) },
                      { label: 'Total Peças', value: String(lavanderiaRevenue.totalPecas) },
                    ],
                    ...empresaInfo,
                  });
                }}>
                  <Download className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const headers = ['Status', 'Quantidade'];
                  const rows = osByStatus.map((r: any) => [r.status, String(r.quantidade)]);
                  downloadXLS(headers, rows, 'lavanderia');
                }}>
                  <Download className="h-4 w-4 mr-1" /> XLS
                </Button>
              </div>
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
            )}
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
