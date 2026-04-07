'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useVendas } from '@/hooks/useSupabase';
import {
  ShoppingCart,
  DollarSign,
  Package,
  Hash,
  TrendingUp,
  BarChart3,
  Loader2,
  CalendarDays,
  ShoppingCart as CartIcon,
  Layers,
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  MonthlyEvolutionChart,
  ProductRankingChart,
  DayOfWeekChart,
  ShiftChart,
  ItemsPerOrderCard,
} from '@/components/bi/DashboardCharts';

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

// ─────────────────────────────────────────
// Onepet KPI Card
// ─────────────────────────────────────────
interface KPICardData {
  titulo: string;
  valor: string;
  subtitulo: string;
  icone: React.ElementType;
  corIcone: string;
  corBg: string;
  variacao?: number;
}

function KPICard({ data, index }: { data: KPICardData; index: number }) {
  const Icon = data.icone;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <div className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{data.titulo}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1 truncate">{data.valor}</p>
            {data.subtitulo && (
              <p className="text-xs text-gray-400 mt-1 truncate">{data.subtitulo}</p>
            )}
          </div>
          <div className={`flex-shrink-0 p-2 rounded-lg ${data.corBg}`}>
            <Icon className={`h-4 w-4 ${data.corIcone}`} />
          </div>
        </div>
        {data.variacao !== undefined && data.variacao !== null && (
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                data.variacao >= 0
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              <span>{data.variacao >= 0 ? '▲' : '▼'}</span>
              <span>{Math.abs(data.variacao).toFixed(2)}%</span>
              <span className="text-gray-400 font-normal ml-0.5">em relação ao mês anterior</span>
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Section Title (green, Onepet style)
// ─────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 rounded-full bg-green-600" />
      <h2 className="text-sm font-semibold text-green-700 uppercase tracking-wide">{children}</h2>
    </div>
  );
}

// ─────────────────────────────────────────
// Main Dashboard Page
// ─────────────────────────────────────────
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { vendas, loading: loadingVendas } = useVendas();

  const loading = loadingVendas;

  // Filters state
  const [excluirDelivery, setExcluirDelivery] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ── Date helpers ──
  const currentMonthStart = useMemo(() => startOfMonth(new Date()), []);
  const currentMonthEnd = useMemo(() => endOfMonth(new Date()), []);
  const prevMonthStart = useMemo(() => startOfMonth(subMonths(new Date(), 1)), []);
  const prevMonthEnd = useMemo(() => endOfMonth(subMonths(new Date(), 1)), []);
  const selectedDayStart = useMemo(() => startOfDay(selectedDate), [selectedDate]);
  const selectedDayEnd = useMemo(() => endOfDay(selectedDate), [selectedDate]);

  // ── Helper: check if venda is concluded ──
  function isConcluida(v: any) {
    return v.status === 'concluida' || v.status === 'fechada' || v.status === 'finalizada';
  }

  // ── Filtered vendas for selected day ──
  const vendasDia = useMemo(() => {
    const excDelivery = excluirDelivery;
    return vendas.filter(v => {
      if (!isConcluida(v)) return false;
      if (excDelivery && (v.canal === 'delivery' || v.tipo === 'delivery')) return false;
      if (!v.criadoEm) return false;
      const d = new Date(v.criadoEm);
      return d >= selectedDayStart && d <= selectedDayEnd;
    });
  }, [vendas, selectedDayStart, selectedDayEnd, excluirDelivery]);

  // ── Filtered vendas for current month ──
  const vendasMesAtual = useMemo(() => {
    const excDelivery = excluirDelivery;
    return vendas.filter(v => {
      if (!isConcluida(v)) return false;
      if (excDelivery && (v.canal === 'delivery' || v.tipo === 'delivery')) return false;
      if (!v.criadoEm) return false;
      const d = new Date(v.criadoEm);
      return d >= currentMonthStart && d <= currentMonthEnd;
    });
  }, [vendas, currentMonthStart, currentMonthEnd, excluirDelivery]);

  // ── Filtered vendas for previous month ──
  const vendasMesAnterior = useMemo(() => {
    return vendas.filter(v => {
      if (!isConcluida(v)) return false;
      if (!v.criadoEm) return false;
      const d = new Date(v.criadoEm);
      return d >= prevMonthStart && d <= prevMonthEnd;
    });
  }, [vendas, prevMonthStart, prevMonthEnd]);

  // ── Compute metrics from vendas array ──
  function computeMetrics(vendasList: any[]) {
    const totalVendido = vendasList.reduce((acc, v) => acc + (v.total || 0), 0);
    const qtdVendas = vendasList.length;

    const skusSet = new Set<string>();
    let unidadesTotal = 0;
    let itensTotal = 0;

    vendasList.forEach(v => {
      v.itens?.forEach((item: any) => {
        if (item.produtoId) skusSet.add(item.produtoId);
        unidadesTotal += item.quantidade || 0;
        itensTotal += 1;
      });
    });

    const itensSKU = skusSet.size;
    const mediaItensPorPedido = qtdVendas > 0 ? unidadesTotal / qtdVendas : 0;
    const ticketMedio = qtdVendas > 0 ? totalVendido / qtdVendas : 0;

    return { totalVendido, qtdVendas, itensSKU, unidadesTotal, mediaItensPorPedido, ticketMedio };
  }

  const metricasDia = useMemo(() => computeMetrics(vendasDia), [vendasDia]);
  const metricasMesAtual = useMemo(() => computeMetrics(vendasMesAtual), [vendasMesAtual]);
  const metricasMesAnterior = useMemo(() => computeMetrics(vendasMesAnterior), [vendasMesAnterior]);

  // ── Variation calculation ──
  function calcVariacao(atual: number, anterior: number): number | null {
    if (anterior === 0) return atual > 0 ? 100 : null;
    return ((atual - anterior) / anterior) * 100;
  }

  // ── KPI Cards Data - Dia ──
  const kpisDia: KPICardData[] = [
    {
      titulo: 'Valor vendido',
      valor: formatBRL(metricasDia.totalVendido),
      subtitulo: `#${metricasDia.qtdVendas} venda${metricasDia.qtdVendas !== 1 ? 's' : ''} hoje`,
      icone: DollarSign,
      corIcone: 'text-green-600',
      corBg: 'bg-green-50',
    },
    {
      titulo: 'Quantidade de vendas',
      valor: formatNumber(metricasDia.qtdVendas),
      subtitulo: 'Pedidos finalizados',
      icone: ShoppingCart,
      corIcone: 'text-blue-600',
      corBg: 'bg-blue-50',
    },
    {
      titulo: 'Itens vendidos (SKU)',
      valor: formatNumber(metricasDia.itensSKU),
      subtitulo: 'Produtos diferentes',
      icone: Layers,
      corIcone: 'text-violet-600',
      corBg: 'bg-violet-50',
    },
    {
      titulo: 'Unidades vendidas',
      valor: formatNumber(metricasDia.unidadesTotal),
      subtitulo: 'Total de itens',
      icone: Package,
      corIcone: 'text-amber-600',
      corBg: 'bg-amber-50',
    },
    {
      titulo: 'Média de itens por pedido',
      valor: metricasDia.mediaItensPorPedido.toFixed(2),
      subtitulo: 'Itens/venda',
      icone: Hash,
      corIcone: 'text-cyan-600',
      corBg: 'bg-cyan-50',
    },
    {
      titulo: 'Ticket médio',
      valor: formatBRL(metricasDia.ticketMedio),
      subtitulo: 'Valor médio por venda',
      icone: BarChart3,
      corIcone: 'text-rose-600',
      corBg: 'bg-rose-50',
    },
  ];

  // ── KPI Cards Data - Mês ──
  const kpisMes: KPICardData[] = [
    {
      titulo: 'Valor vendido',
      valor: formatBRL(metricasMesAtual.totalVendido),
      subtitulo: `#${metricasMesAtual.qtdVendas} venda${metricasMesAtual.qtdVendas !== 1 ? 's' : ''} no mês`,
      icone: DollarSign,
      corIcone: 'text-green-600',
      corBg: 'bg-green-50',
      variacao: calcVariacao(metricasMesAtual.totalVendido, metricasMesAnterior.totalVendido),
    },
    {
      titulo: 'Quantidade de vendas',
      valor: formatNumber(metricasMesAtual.qtdVendas),
      subtitulo: 'Pedidos finalizados',
      icone: ShoppingCart,
      corIcone: 'text-blue-600',
      corBg: 'bg-blue-50',
      variacao: calcVariacao(metricasMesAtual.qtdVendas, metricasMesAnterior.qtdVendas),
    },
    {
      titulo: 'Itens vendidos (SKU)',
      valor: formatNumber(metricasMesAtual.itensSKU),
      subtitulo: 'Produtos diferentes',
      icone: Layers,
      corIcone: 'text-violet-600',
      corBg: 'bg-violet-50',
      variacao: calcVariacao(metricasMesAtual.itensSKU, metricasMesAnterior.itensSKU),
    },
    {
      titulo: 'Unidades vendidas',
      valor: formatNumber(metricasMesAtual.unidadesTotal),
      subtitulo: 'Total de itens',
      icone: Package,
      corIcone: 'text-amber-600',
      corBg: 'bg-amber-50',
      variacao: calcVariacao(metricasMesAtual.unidadesTotal, metricasMesAnterior.unidadesTotal),
    },
    {
      titulo: 'Média de itens por pedido',
      valor: metricasMesAtual.mediaItensPorPedido.toFixed(2),
      subtitulo: 'Itens/venda',
      icone: Hash,
      corIcone: 'text-cyan-600',
      corBg: 'bg-cyan-50',
      variacao: calcVariacao(metricasMesAtual.mediaItensPorPedido, metricasMesAnterior.mediaItensPorPedido),
    },
    {
      titulo: 'Ticket médio',
      valor: formatBRL(metricasMesAtual.ticketMedio),
      subtitulo: 'Valor médio por venda',
      icone: BarChart3,
      corIcone: 'text-rose-600',
      corBg: 'bg-rose-50',
      variacao: calcVariacao(metricasMesAtual.ticketMedio, metricasMesAnterior.ticketMedio),
    },
  ];

  // ── Vendas por Forma de Pagamento (monthly) ──
  const vendasPorForma = useMemo(() => {
    const formasMap: Record<string, string> = {
      dinheiro: 'Dinheiro',
      credito: 'Cartão Crédito',
      debito: 'Cartão Débito',
      cartao_credito: 'Cartão Crédito',
      cartao_debito: 'Cartão Débito',
      pix: 'PIX/Transferência',
      voucher: 'Voucher',
      vale: 'Vale',
      ifood_online: 'iFood Online',
    };

    const porForma: Record<string, { valor: number; quantidade: number }> = {};
    vendasMesAtual.forEach(v => {
      const formaKey = v.formaPagamento || 'outros';
      const formaLabel = formasMap[formaKey] || formaKey.charAt(0).toUpperCase() + formaKey.slice(1);

      // Group cartao_credito and cartao_debito
      let normalizada: string;
      if (formaKey === 'credito' || formaKey === 'cartao_credito') normalizada = 'Cartão Crédito';
      else if (formaKey === 'debito' || formaKey === 'cartao_debito') normalizada = 'Cartão Débito';
      else if (formaKey === 'pix') normalizada = 'PIX/Transferência';
      else if (formaKey === 'voucher' || formaKey === 'vale') normalizada = 'Vale';
      else normalizada = formaLabel || 'Outros';

      if (!porForma[normalizada]) porForma[normalizada] = { valor: 0, quantidade: 0 };
      porForma[normalizada].valor += v.total || 0;
      porForma[normalizada].quantidade += 1;
    });

    return Object.entries(porForma)
      .map(([forma, dados]) => ({ forma, ...dados }))
      .sort((a, b) => b.valor - a.valor);
  }, [vendasMesAtual]);

  const totalFormaPagamento = useMemo(
    () => vendasPorForma.reduce((acc, f) => acc + f.valor, 0),
    [vendasPorForma]
  );

  // ── Monthly Evolution (6 months) ──
  const evolucaoMensal = useMemo(() => {
    const meses: { mes: string; valor: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(new Date(), i));
      const mEnd = endOfMonth(subMonths(new Date(), i));
      let total = 0;
      vendas.forEach(v => {
        if (!isConcluida(v)) return;
        if (!v.criadoEm) return;
        const d = new Date(v.criadoEm);
        if (d >= mStart && d <= mEnd) total += v.total || 0;
      });
      meses.push({
        mes: format(mStart, 'MMM/yy', { locale: ptBR }),
        valor: total,
      });
    }
    return meses;
  }, [vendas]);

  // ── Product Ranking (top 10) ──
  const rankingProdutos = useMemo(() => {
    const porProduto: Record<string, { nome: string; valor: number; quantidade: number }> = {};
    vendasMesAtual.forEach(v => {
      v.itens?.forEach((item: any) => {
        const pid = item.produtoId;
        const nome = item.nome || 'Produto';
        if (!porProduto[pid]) porProduto[pid] = { nome, valor: 0, quantidade: 0 };
        const preco = item.precoUnitario || item.preco || 0;
        porProduto[pid].valor += preco * (item.quantidade || 0);
        porProduto[pid].quantidade += item.quantidade || 0;
      });
    });
    return Object.values(porProduto)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10)
      .map(p => ({
        nome: p.nome.length > 22 ? p.nome.substring(0, 20) + '…' : p.nome,
        valor: p.valor,
        quantidade: p.quantidade,
      }));
  }, [vendasMesAtual]);

  // ── Day of Week Analysis ──
  const vendasPorDiaSemana = useMemo(() => {
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const porDia: Record<number, { dia: string; valor: number; quantidade: number }> = {};
    for (let i = 0; i < 7; i++) {
      porDia[i] = { dia: diasSemana[i], valor: 0, quantidade: 0 };
    }
    vendasMesAtual.forEach(v => {
      if (!v.criadoEm) return;
      const dayNum = new Date(v.criadoEm).getDay();
      porDia[dayNum].valor += v.total || 0;
      porDia[dayNum].quantidade += 1;
    });
    return Object.values(porDia);
  }, [vendasMesAtual]);

  // ── Shift Analysis (Manhã 6-12, Tarde 12-18, Noite 18-24) ──
  const vendasPorTurno = useMemo(() => {
    const turnos = [
      { turno: 'Manhã (6-12h)', minH: 6, maxH: 12 },
      { turno: 'Tarde (12-18h)', minH: 12, maxH: 18 },
      { turno: 'Noite (18-24h)', minH: 18, maxH: 24 },
    ];
    const resultado = turnos.map(t => ({ ...t, valor: 0, quantidade: 0 }));
    vendasMesAtual.forEach(v => {
      if (!v.criadoEm) return;
      const h = new Date(v.criadoEm).getHours();
      const turno = resultado.find(t => h >= t.minH && h < t.maxH);
      if (turno) {
        turno.valor += v.total || 0;
        turno.quantidade += 1;
      }
    });
    return resultado.map(t => ({ turno: t.turno, valor: t.valor, quantidade: t.quantidade }));
  }, [vendasMesAtual]);

  // ── Items per order (monthly) ──
  const mediaItensAtual = metricasMesAtual.mediaItensPorPedido;
  const mediaItensAnterior = metricasMesAnterior.mediaItensPorPedido;

  // ─────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────
  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Dashboard' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Admin' },
          { title: 'Dashboard' },
        ]}
      >
        <div className="space-y-6 max-w-[1600px] mx-auto">
          {/* ── Header ── */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Bem-vindo, {user?.nome || 'Admin'}! &middot;{' '}
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* ═══════════════════════════════════ */}
          {/* INFORMAÇÕES DO DIA                 */}
          {/* ═══════════════════════════════════ */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <SectionTitle>Informações do dia</SectionTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="excluir-delivery"
                    checked={excluirDelivery}
                    onCheckedChange={(checked) => setExcluirDelivery(checked === true)}
                  />
                  <Label htmlFor="excluir-delivery" className="text-xs text-gray-500 cursor-pointer">
                    Excluindo Delivery
                  </Label>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {format(selectedDate, "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpisDia.map((kpi, i) => (
                <KPICard key={kpi.titulo} data={kpi} index={i} />
              ))}
            </div>
          </section>

          {/* ═══════════════════════════════════ */}
          {/* INFORMAÇÕES DO MÊS                */}
          {/* ═══════════════════════════════════ */}
          <section>
            <SectionTitle>Informações do mês</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpisMes.map((kpi, i) => (
                <KPICard key={`mes-${kpi.titulo}`} data={kpi} index={i + 6} />
              ))}
            </div>
          </section>

          {/* ═══════════════════════════════════ */}
          {/* VENDAS POR FORMA DE PAGAMENTO      */}
          {/* ═══════════════════════════════════ */}
          <section>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-700">
                      Formas de Pagamento
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs text-gray-500">
                      {format(currentMonthStart, 'MMM/yyyy', { locale: ptBR })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Forma de Pagamento
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Quantidade
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendasPorForma.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center py-6 text-gray-400">
                              Nenhuma venda registrada este mês
                            </td>
                          </tr>
                        ) : (
                          <>
                            {vendasPorForma.map((row, idx) => (
                              <tr
                                key={row.forma}
                                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                              >
                                <td className="py-2.5 px-3 font-medium text-gray-700">{row.forma}</td>
                                <td className="py-2.5 px-3 text-right text-gray-600">{row.quantidade}</td>
                                <td className="py-2.5 px-3 text-right font-medium text-gray-700">
                                  {formatBRL(row.valor)}
                                </td>
                              </tr>
                            ))}
                            {/* Total row */}
                            <tr className="border-t-2 border-gray-200 bg-gray-50">
                              <td className="py-2.5 px-3 font-bold text-gray-800">Total</td>
                              <td className="py-2.5 px-3 text-right font-bold text-gray-800">
                                {vendasPorForma.reduce((acc, f) => acc + f.quantidade, 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-gray-800">
                                {formatBRL(totalFormaPagamento)}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </section>

          {/* ═══════════════════════════════════ */}
          {/* CHARTS ROW - TOP                   */}
          {/* ═══════════════════════════════════ */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthlyEvolutionChart dados={evolucaoMensal} />
              <ProductRankingChart dados={rankingProdutos} />
            </div>
          </section>

          {/* ═══════════════════════════════════ */}
          {/* CHARTS ROW - BOTTOM                */}
          {/* ═══════════════════════════════════ */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DayOfWeekChart dados={vendasPorDiaSemana} />
              <ShiftChart dados={vendasPorTurno} />
              <ItemsPerOrderCard
                mediaAtual={mediaItensAtual}
                mediaAnterior={mediaItensAnterior}
              />
            </div>
          </section>

          {/* ── Quick Actions ── */}
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button asChild variant="outline" className="h-12 justify-start gap-2 border-gray-200 hover:bg-gray-50">
                <a href="/pdv">
                  <CartIcon className="h-4 w-4" />
                  <span className="text-sm">Abrir PDV</span>
                </a>
              </Button>
              <Button asChild variant="outline" className="h-12 justify-start gap-2 border-gray-200 hover:bg-gray-50">
                <a href="/admin/caixa">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Caixa</span>
                </a>
              </Button>
              <Button asChild variant="outline" className="h-12 justify-start gap-2 border-gray-200 hover:bg-gray-50">
                <a href="/admin/relatorios">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Relatórios</span>
                </a>
              </Button>
              <Button asChild variant="outline" className="h-12 justify-start gap-2 border-gray-200 hover:bg-gray-50">
                <a href="/admin/produtos">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">Produtos</span>
                </a>
              </Button>
            </div>
          </section>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
