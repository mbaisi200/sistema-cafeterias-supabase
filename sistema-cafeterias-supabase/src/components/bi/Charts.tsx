'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis, ComposedChart, Line } from 'recharts';
import { motion } from 'framer-motion';

// Cores vibrantes e agradáveis
const COLORS = {
  primary: '#3b82f6',      // Azul
  secondary: '#8b5cf6',    // Violeta
  success: '#10b981',      // Verde
  warning: '#f59e0b',      // Amarelo
  danger: '#ef4444',       // Vermelho
  info: '#06b6d4',         // Ciano
  pink: '#ec4899',         // Rosa
  indigo: '#6366f1',       // Indigo
};

const GRADIENT_COLORS = [
  { start: '#3b82f6', end: '#1d4ed8' },  // Azul
  { start: '#8b5cf6', end: '#6d28d9' },  // Violeta
  { start: '#10b981', end: '#059669' },  // Verde
  { start: '#f59e0b', end: '#d97706' },  // Amarelo
  { start: '#ef4444', end: '#dc2626' },  // Vermelho
  { start: '#06b6d4', end: '#0891b2' },  // Ciano
  { start: '#ec4899', end: '#db2777' },  // Rosa
  { start: '#6366f1', end: '#4f46e5' },  // Indigo
];

const chartConfig = {
  valor: { label: 'Valor (R$)', color: COLORS.primary },
  quantidade: { label: 'Quantidade', color: COLORS.secondary },
  vendas: { label: 'Vendas', color: COLORS.info },
} satisfies ChartConfig;

// Paleta para gráficos de pizza/barras múltiplos
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// Gráfico de Evolução de Vendas
interface VendasPorDiaChartProps {
  dados: { data: string; valor: number; quantidade: number }[];
}

export function VendasPorDiaChart({ dados }: VendasPorDiaChartProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="border-2 border-primary/10 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Evolução das Vendas</CardTitle>
          <CardDescription>Faturamento diário no período</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart data={dados} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="50%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="data" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area 
                type="monotone" 
                dataKey="valor" 
                stroke="url(#strokeGradient)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValorGradient)" 
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Gráfico de Formas de Pagamento
interface VendasPorFormaChartProps {
  dados: { forma: string; valor: number; quantidade: number; percentual: number }[];
}

export function VendasPorFormaChart({ dados }: VendasPorFormaChartProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="border-2 border-primary/10 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Formas de Pagamento</CardTitle>
          <CardDescription>Distribuição por método</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <PieChart>
              <defs>
                {PIE_COLORS.map((color, index) => (
                  <linearGradient key={`grad-${index}`} id={`pieGrad-${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                  </linearGradient>
                ))}
              </defs>
              <Pie 
                data={dados} 
                cx="50%" 
                cy="50%" 
                innerRadius={55} 
                outerRadius={95} 
                paddingAngle={3}
                dataKey="valor" 
                nameKey="forma"
                label={({ forma, percentual }) => `${forma}: ${percentual.toFixed(1)}%`} 
                labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
              >
                {dados.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#pieGrad-${index % PIE_COLORS.length})`}
                    stroke={PIE_COLORS[index % PIE_COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {dados.map((item, index) => (
              <div key={item.forma} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span className="text-sm text-muted-foreground">{item.forma}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Gráfico de Tipos de Venda
interface VendasPorTipoChartProps {
  dados: { tipo: string; valor: number; quantidade: number; percentual: number }[];
}

export function VendasPorTipoChart({ dados }: VendasPorTipoChartProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
      <Card className="border-2 border-primary/10 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Tipos de Venda</CardTitle>
          <CardDescription>Distribuição por canal</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={dados} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
              <defs>
                {PIE_COLORS.map((color, index) => (
                  <linearGradient key={`barGrad-${index}`} id={`barGradH-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <YAxis type="category" dataKey="tipo" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={28}>
                {dados.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#barGradH-${index % PIE_COLORS.length})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Gráfico de Vendas por Categoria
interface VendasPorCategoriaChartProps {
  dados: { categoria: string; valor: number; quantidade: number; percentual: number }[];
}

export function VendasPorCategoriaChart({ dados }: VendasPorCategoriaChartProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
      <Card className="border-2 border-primary/10 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Vendas por Categoria</CardTitle>
          <CardDescription>Performance por categoria</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={dados} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                {PIE_COLORS.map((color, index) => (
                  <linearGradient key={`catGrad-${index}`} id={`catGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="categoria" tick={{ fill: '#6b7280', fontSize: 11 }} angle={-45} textAnchor="end" height={60} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={32}>
                {dados.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#catGrad-${index % PIE_COLORS.length})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Gráfico de Horários de Pico
interface AnaliseHorarioChartProps {
  dados: { hora: number; quantidadeVendas: number; valorTotal: number }[];
}

export function AnaliseHorarioChart({ dados }: AnaliseHorarioChartProps) {
  const dadosFormatados = dados.map(d => ({ ...d, horario: `${d.hora.toString().padStart(2, '0')}h` }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
      <Card className="border-2 border-primary/10 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Horários de Pico</CardTitle>
          <CardDescription>Movimento por horário</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ComposedChart data={dadosFormatados} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="horario" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar yAxisId="left" dataKey="quantidadeVendas" fill="url(#barGradV)" radius={[6, 6, 0, 0]} name="Qtd. Vendas" barSize={24} />
              <Line yAxisId="right" type="monotone" dataKey="valorTotal" stroke="url(#lineGrad)" strokeWidth={3} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#ef4444' }} name="Valor Total" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Gráfico de Dias da Semana
interface AnaliseDiaSemanaChartProps {
  dados: { dia: string; quantidadeVendas: number; valorTotal: number }[];
}

export function AnaliseDiaSemanaChart({ dados }: AnaliseDiaSemanaChartProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <Card className="border-2 border-primary/10 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Vendas por Dia da Semana</CardTitle>
          <CardDescription>Performance por dia</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={dados} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="diaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="valorTotal" fill="url(#diaGrad)" radius={[6, 6, 0, 0]} name="Valor Total" barSize={36} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
