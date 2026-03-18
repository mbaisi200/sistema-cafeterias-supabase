'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Receipt, BarChart3, XCircle } from 'lucide-react';
import { KPI } from '@/types/bi';
import { motion } from 'framer-motion';

interface KPICardsProps {
  kpis: KPI[];
}

const icones: Record<string, React.ElementType> = {
  emerald: DollarSign,
  blue: ShoppingCart,
  violet: Receipt,
  amber: BarChart3,
  rose: Receipt,
  red: XCircle
};

const cores: Record<string, { bg: string; text: string; border: string; gradient: string; iconBg: string }> = {
  emerald: { 
    bg: 'bg-emerald-50', 
    text: 'text-emerald-600', 
    border: 'border-emerald-200',
    gradient: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-100'
  },
  blue: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-600', 
    border: 'border-blue-200',
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-100'
  },
  violet: { 
    bg: 'bg-violet-50', 
    text: 'text-violet-600', 
    border: 'border-violet-200',
    gradient: 'from-violet-500 to-violet-600',
    iconBg: 'bg-violet-100'
  },
  amber: { 
    bg: 'bg-amber-50', 
    text: 'text-amber-600', 
    border: 'border-amber-200',
    gradient: 'from-amber-500 to-amber-600',
    iconBg: 'bg-amber-100'
  },
  rose: { 
    bg: 'bg-rose-50', 
    text: 'text-rose-600', 
    border: 'border-rose-200',
    gradient: 'from-rose-500 to-rose-600',
    iconBg: 'bg-rose-100'
  },
  red: { 
    bg: 'bg-red-50', 
    text: 'text-red-600', 
    border: 'border-red-200',
    gradient: 'from-red-500 to-red-600',
    iconBg: 'bg-red-100'
  }
};

function formatarValor(valor: number, formato: KPI['formato']): string {
  switch (formato) {
    case 'moeda':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    case 'porcentagem':
      return `${valor.toFixed(1)}%`;
    case 'numero':
      return new Intl.NumberFormat('pt-BR').format(Math.round(valor));
    default:
      return valor.toString();
  }
}

export function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map((kpi, index) => {
        const corKey = kpi.cor || 'blue';
        const Icone = icones[corKey] || DollarSign;
        const cor = cores[corKey] || cores.blue;
        const variacaoPositiva = (kpi.variacao ?? 0) >= 0;
        
        return (
          <motion.div
            key={kpi.titulo}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <Card className={`relative overflow-hidden border-2 ${cor.border} hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${cor.gradient} opacity-5`} />
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cor.gradient}`} />
              
              <CardContent className="relative p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${cor.iconBg} shadow-sm`}>
                    <Icone className={`h-5 w-5 ${cor.text}`} />
                  </div>
                  
                  {kpi.variacao !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      variacaoPositiva ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {kpi.variacao === 0 ? (
                        <Minus className="h-3 w-3" />
                      ) : variacaoPositiva ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{Math.abs(kpi.variacao).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium truncate">{kpi.titulo}</p>
                  <p className={`text-xl font-bold ${cor.text} truncate`}>{formatarValor(kpi.valor, kpi.formato)}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
