'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  XAxis, YAxis, ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

// Onepet color palette
const TEAL = '#14B8A6';
const TEAL_LIGHT = '#5EEAD4';
const TEAL_DARK = '#0D9488';

const PIE_COLORS = ['#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#06B6D4'];

const chartConfigTeal: ChartConfig = {
  valor: { label: 'Valor (R$)', color: TEAL },
  quantidade: { label: 'Quantidade', color: '#F59E0B' },
};

const chartConfigPie: ChartConfig = {
  valor: { label: 'Valor (R$)', color: PIE_COLORS[0] },
  quantidade: { label: 'Quantidade', color: PIE_COLORS[1] },
};

// ─────────────────────────────────────────
// Monthly Evolution Area Chart (6 months)
// ─────────────────────────────────────────
interface MonthlyEvolutionChartProps {
  dados: { mes: string; valor: number }[];
}

export function MonthlyEvolutionChart({ dados }: MonthlyEvolutionChartProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-700">Evolução em 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigTeal} className="h-[280px] w-full">
            <AreaChart data={dados} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TEAL} stopOpacity={0.4} />
                  <stop offset="60%" stopColor={TEAL_LIGHT} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={TEAL_LIGHT} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                  return String(v);
                }}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number) =>
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
                }
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke={TEAL}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#tealGradient)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Product Ranking Horizontal Bar Chart
// ─────────────────────────────────────────
interface ProductRankingChartProps {
  dados: { nome: string; valor: number; quantidade: number }[];
}

export function ProductRankingChart({ dados }: ProductRankingChartProps) {
  // Reverse for horizontal bar (top at the top)
  const reversedData = [...dados].reverse();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-700">Ranking de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigTeal} className="h-[280px] w-full">
            <BarChart data={reversedData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
              <defs>
                <linearGradient id="barGradH" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={TEAL} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={TEAL_LIGHT} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                  return String(v);
                }}
              />
              <YAxis
                type="category"
                dataKey="nome"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={95}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number) =>
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
                }
              />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={20} fill="url(#barGradH)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Day of Week Donut Chart
// ─────────────────────────────────────────
interface DayOfWeekChartProps {
  dados: { dia: string; valor: number; quantidade: number }[];
}

export function DayOfWeekChart({ dados }: DayOfWeekChartProps) {
  const total = dados.reduce((acc, d) => acc + d.valor, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
      <Card className="border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-700">Vendas por dia da semana</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigPie} className="h-[240px] w-full">
            <PieChart>
              <Pie
                data={dados}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                dataKey="valor"
                nameKey="dia"
                stroke="none"
              >
                {dados.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number) =>
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
                }
              />
            </PieChart>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
            {dados.map((item, index) => (
              <div key={item.dia} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span className="text-xs text-gray-500">{item.dia}</span>
                {total > 0 && (
                  <span className="text-xs font-medium text-gray-700">
                    {((item.valor / total) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Shift Donut Chart
// ─────────────────────────────────────────
interface ShiftChartProps {
  dados: { turno: string; valor: number; quantidade: number }[];
}

export function ShiftChart({ dados }: ShiftChartProps) {
  const SHIFT_COLORS = ['#14B8A6', '#F59E0B', '#6366F1'];
  const total = dados.reduce((acc, d) => acc + d.valor, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
      <Card className="border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-700">Vendas por turno</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigPie} className="h-[240px] w-full">
            <PieChart>
              <Pie
                data={dados}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                dataKey="valor"
                nameKey="turno"
                stroke="none"
              >
                {dados.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={SHIFT_COLORS[index % SHIFT_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number) =>
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
                }
              />
            </PieChart>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
            {dados.map((item, index) => (
              <div key={item.turno} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SHIFT_COLORS[index % SHIFT_COLORS.length] }} />
                <span className="text-xs text-gray-500">{item.turno}</span>
                {total > 0 && (
                  <span className="text-xs font-medium text-gray-700">
                    {((item.valor / total) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Items Per Order - Big Number with Trend
// ─────────────────────────────────────────
interface ItemsPerOrderProps {
  mediaAtual: number;
  mediaAnterior: number;
}

export function ItemsPerOrderCard({ mediaAtual, mediaAnterior }: ItemsPerOrderProps) {
  const variacao = mediaAnterior > 0
    ? ((mediaAtual - mediaAnterior) / mediaAnterior) * 100
    : 0;
  const isPositive = variacao >= 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <Card className="border border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-700">Itens por atendimento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <div className="text-4xl font-bold text-gray-800">
            {mediaAtual.toFixed(2)}
          </div>
          <div
            className={`mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              isPositive
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            <span>{isPositive ? '▲' : '▼'}</span>
            <span>{Math.abs(variacao).toFixed(2)}%</span>
            <span className="text-gray-400 font-normal ml-1">vs. mês anterior</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
