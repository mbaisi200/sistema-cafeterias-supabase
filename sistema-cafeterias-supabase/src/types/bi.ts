// Tipos para o sistema de BI

export interface FiltrosBI {
  periodo: 'hoje' | 'ontem' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'personalizado';
  dataInicio?: Date;
  dataFim?: Date;
  categorias: string[];
  formasPagamento: string[];
  tiposVenda: string[];
  produtos: string[];
  status: string[];
  canais?: string[];
}

export interface KPI {
  titulo: string;
  valor: number;
  variacao?: number;
  formato: 'moeda' | 'numero' | 'porcentagem';
  cor?: 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'red';
}

export interface ProdutoVendido {
  id: string;
  nome: string;
  categoriaId: string;
  quantidadeTotal: number;
  valorTotal: number;
  ticketMedio: number;
  percentualVendas: number;
}

export interface ProdutoLucroBruto {
  id: string;
  nome: string;
  categoriaId: string;
  quantidadeVendida: number;
  receitaTotal: number;
  custoTotal: number;
  lucroBruto: number;
  margemLucro: number;
  precoUnitario: number;
  custoUnitario: number;
}

export interface AnaliseHorario {
  hora: number;
  quantidadeVendas: number;
  valorTotal: number;
}

export interface AnaliseDiaSemana {
  dia: string;
  diaNumero: number;
  quantidadeVendas: number;
  valorTotal: number;
}
