'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  HardDrive,
  FileText,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  Loader2,
  Building2,
  DollarSign,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';

interface EmpresaResumo {
  id: string;
  nome: string;
  cnpj?: string;
  status: string;
  resumo: {
    totalVendas: number;
    totalProdutos: number;
    totalUsuarios: number;
  };
}

interface ConsumoEmpresa {
  id: string;
  nome: string;
  cnpj?: string;
  status: string;
  cidade?: string;
  estado?: string;
  registros: number;
  tamanhoEstimado: number;
  tamanhoFormatado: string;
  percentual: number;
}

interface ConsumoTabela {
  tabela: string;
  descricao: string;
  registros: number;
  tamanhoEstimado: number;
}

interface DadosConsumo {
  empresa: {
    id: string;
    nome: string;
    cnpj?: string;
    status: string;
    email?: string;
    telefone?: string;
    cidade?: string;
    estado?: string;
  };
  consumo: {
    porTabela: ConsumoTabela[];
    total: {
      registros: number;
      tamanhoEstimado: number;
      tamanhoFormatado: string;
    };
  };
  estatisticas: {
    vendas30Dias: {
      total: number;
      mediaDiaria: number;
      quantidade: number;
      porDia: { data: string; quantidade: number; total: number }[];
    };
  };
}

interface DadosTodos {
  modo: string;
  empresas: any[];
  consumoPorEmpresa: ConsumoEmpresa[];
  consumoTotal: {
    porTabela: ConsumoTabela[];
    total: {
      registros: number;
      tamanhoEstimado: number;
      tamanhoFormatado: string;
    };
  };
  estatisticas: {
    totalEmpresas: number;
    empresasAtivas: number;
    vendas30Dias: number;
  };
}

const CORES_STATUS: Record<string, string> = {
  ativo: 'bg-green-500',
  inativo: 'bg-yellow-500',
  bloqueado: 'bg-red-500',
};

const ICONES_TABELAS: Record<string, React.ReactNode> = {
  usuarios: <Users className="h-4 w-4" />,
  categorias: <FileText className="h-4 w-4" />,
  produtos: <Package className="h-4 w-4" />,
  funcionarios: <Users className="h-4 w-4" />,
  mesas: <Database className="h-4 w-4" />,
  vendas: <ShoppingCart className="h-4 w-4" />,
  itens_venda: <FileText className="h-4 w-4" />,
  pagamentos: <DollarSign className="h-4 w-4" />,
};

const CORES_GRAFICO = [
  '#f97316', '#3b82f6', '#22c55e', '#ec4899', '#eab308', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16', '#6366f1', '#14b8a6',
];

const formatarTamanho = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

const formatarData = (data: string): string => {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};

export default function ConsumoDadosPage() {
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('todos');
  const [dadosConsumo, setDadosConsumo] = useState<DadosConsumo | null>(null);
  const [dadosTodos, setDadosTodos] = useState<DadosTodos | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  // Carregar lista de empresas
  useEffect(() => {
    const carregarEmpresas = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/master/consumo-dados');
        const data = await response.json();

        if (data.empresas) {
          setEmpresas(data.empresas);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    carregarEmpresas();
  }, []);

  // Carregar detalhes quando empresa for selecionada
  useEffect(() => {
    const carregarDetalhes = async () => {
      if (!empresaSelecionada) return;

      try {
        setLoadingDetalhes(true);

        if (empresaSelecionada === 'todos') {
          const response = await fetch('/api/master/consumo-dados?modo=todos');
          const data = await response.json();
          setDadosTodos(data);
          setDadosConsumo(null);
        } else {
          const response = await fetch(`/api/master/consumo-dados?empresaId=${empresaSelecionada}`);
          const data = await response.json();
          setDadosConsumo(data);
          setDadosTodos(null);
        }
      } catch (error) {
      } finally {
        setLoadingDetalhes(false);
      }
    };

    carregarDetalhes();
  }, [empresaSelecionada]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['master']}>
        <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Consumo de Dados' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['master']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Master' },
          { title: 'Consumo de Dados' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Consumo de Dados</h1>
              <p className="text-muted-foreground">
                Monitore o uso do banco de dados Supabase
              </p>
            </div>

            {/* Seletor de Cliente */}
            <div className="w-full md:w-80">
              <Select value={empresaSelecionada} onValueChange={setEmpresaSelecionada}>
                <SelectTrigger>
                  <Building2 className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">TODOS (Visão Geral)</span>
                    </div>
                  </SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      <div className="flex items-center gap-2">
                        <span>{empresa.nome}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            empresa.status === 'ativo'
                              ? 'border-green-500 text-green-600'
                              : empresa.status === 'inativo'
                              ? 'border-yellow-500 text-yellow-600'
                              : 'border-red-500 text-red-600'
                          }`}
                        >
                          {empresa.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingDetalhes ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : dadosTodos ? (
            // VISÃO TODOS
            <>
              {/* Cards de Resumo Geral */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-blue-500" />
                      Tamanho Total Estimado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {dadosTodos.consumoTotal.total.tamanhoFormatado}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dadosTodos.consumoTotal.total.registros.toLocaleString('pt-BR')} registros totais
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-green-500" />
                      Total de Clientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {dadosTodos.estatisticas.totalEmpresas}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dadosTodos.estatisticas.empresasAtivas} ativos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-purple-500" />
                      Vendas (30 dias)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatarMoeda(dadosTodos.estatisticas.vendas30Dias)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total de vendas no período
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Database className="h-4 w-4 text-orange-500" />
                      Tabelas em Uso
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {dadosTodos.consumoTotal.porTabela.filter(t => t.registros > 0).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      de {dadosTodos.consumoTotal.porTabela.length} tabelas
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs para visualização */}
              <Tabs defaultValue="clientes" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="clientes">
                    <Users className="h-4 w-4 mr-2" />
                    Por Cliente
                  </TabsTrigger>
                  <TabsTrigger value="tabelas">
                    <Database className="h-4 w-4 mr-2" />
                    Por Tabela
                  </TabsTrigger>
                </TabsList>

                {/* Tab Por Cliente */}
                <TabsContent value="clientes" className="space-y-6">
                  {/* Gráfico de Pizza - Distribuição por Cliente */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Distribuição por Cliente</CardTitle>
                        <CardDescription>
                          Proporção de registros por empresa
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                              <Pie
                                data={dadosTodos.consumoPorEmpresa.slice(0, 10)}
                                dataKey="registros"
                                nameKey="nome"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ nome, percentual }) => `${nome.substring(0, 10)}... ${(percentual || 0).toFixed(1)}%`}
                              >
                                {dadosTodos.consumoPorEmpresa.slice(0, 10).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number) => [
                                  `${value.toLocaleString('pt-BR')} registros`,
                                  'Quantidade',
                                ]}
                              />
                            </RechartsPie>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Gráfico de Barras - Top 10 Clientes */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Top 10 Clientes por Consumo</CardTitle>
                        <CardDescription>
                          Clientes com maior volume de dados
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={dadosTodos.consumoPorEmpresa.slice(0, 10)}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis
                                dataKey="nome"
                                type="category"
                                width={120}
                                tick={{ fontSize: 11 }}
                                formatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                              />
                              <Tooltip
                                formatter={(value: number, name: string) => [
                                  name === 'registros'
                                    ? `${value.toLocaleString('pt-BR')} registros`
                                    : formatarTamanho(value as number),
                                  name === 'registros' ? 'Registros' : 'Tamanho',
                                ]}
                              />
                              <Bar
                                dataKey="registros"
                                fill="#f97316"
                                radius={[0, 4, 4, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabela Detalhada por Cliente */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalhamento por Cliente</CardTitle>
                      <CardDescription>
                        Todos os clientes ordenados por consumo de dados
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Cidade</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Registros</TableHead>
                            <TableHead className="text-right">Tamanho</TableHead>
                            <TableHead className="text-right">% do Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dadosTodos.consumoPorEmpresa.map((empresa, index) => (
                            <TableRow
                              key={empresa.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setEmpresaSelecionada(empresa.id)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: CORES_GRAFICO[index % CORES_GRAFICO.length] }}
                                  />
                                  <span className="font-medium">{empresa.nome}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {empresa.cidade && empresa.estado
                                  ? `${empresa.cidade}/${empresa.estado}`
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    empresa.status === 'ativo'
                                      ? 'border-green-500 text-green-600'
                                      : empresa.status === 'inativo'
                                      ? 'border-yellow-500 text-yellow-600'
                                      : 'border-red-500 text-red-600'
                                  }
                                >
                                  {empresa.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {empresa.registros.toLocaleString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-right">
                                {empresa.tamanhoFormatado}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Progress
                                    value={empresa.percentual}
                                    className="w-16 h-2"
                                  />
                                  <span className="text-sm text-muted-foreground w-12 text-right">
                                    {empresa.percentual.toFixed(1)}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab Por Tabela */}
                <TabsContent value="tabelas" className="space-y-6">
                  {/* Gráfico por Tabela */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Registros por Tabela</CardTitle>
                      <CardDescription>
                        Distribuição de registros em todas as tabelas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={dadosTodos.consumoTotal.porTabela.filter(t => t.registros > 0)}
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis
                              dataKey="descricao"
                              type="category"
                              width={150}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                              formatter={(value: number) => [
                                `${value.toLocaleString('pt-BR')} registros`,
                                'Quantidade',
                              ]}
                            />
                            <Bar
                              dataKey="registros"
                              fill="#3b82f6"
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tabela Detalhada */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalhamento por Tabela</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tabela</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Registros</TableHead>
                            <TableHead className="text-right">Tamanho Estimado</TableHead>
                            <TableHead className="text-right">% do Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dadosTodos.consumoTotal.porTabela.map((tabela) => {
                            const percentual =
                              dadosTodos.consumoTotal.total.registros > 0
                                ? (tabela.registros / dadosTodos.consumoTotal.total.registros) * 100
                                : 0;

                            return (
                              <TableRow key={tabela.tabela}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {ICONES_TABELAS[tabela.tabela] || (
                                      <Database className="h-4 w-4" />
                                    )}
                                    <code className="text-sm bg-muted px-2 py-1 rounded">
                                      {tabela.tabela}
                                    </code>
                                  </div>
                                </TableCell>
                                <TableCell>{tabela.descricao}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {tabela.registros.toLocaleString('pt-BR')}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatarTamanho(tabela.tamanhoEstimado)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Progress value={percentual} className="w-16 h-2" />
                                    <span className="text-sm text-muted-foreground w-12 text-right">
                                      {percentual.toFixed(1)}%
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : dadosConsumo ? (
            // VISÃO INDIVIDUAL POR EMPRESA
            <>
              {/* Informações da Empresa */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {dadosConsumo.empresa.nome}
                  </CardTitle>
                  <CardDescription>
                    {dadosConsumo.empresa.cnpj && `CNPJ: ${dadosConsumo.empresa.cnpj}`}
                    {dadosConsumo.empresa.cidade && ` • ${dadosConsumo.empresa.cidade}`}
                    {dadosConsumo.empresa.estado && `/${dadosConsumo.empresa.estado}`}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Cards de Resumo */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-blue-500" />
                      Tamanho Estimado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {dadosConsumo.consumo.total.tamanhoFormatado}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dadosConsumo.consumo.total.registros.toLocaleString('pt-BR')} registros totais
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-green-500" />
                      Vendas (30 dias)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {dadosConsumo.estatisticas.vendas30Dias.quantidade}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatarMoeda(dadosConsumo.estatisticas.vendas30Dias.total)} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      Média Diária
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatarMoeda(dadosConsumo.estatisticas.vendas30Dias.mediaDiaria)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Média de vendas por dia
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Database className="h-4 w-4 text-orange-500" />
                      Tabelas em Uso
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {dadosConsumo.consumo.porTabela.filter(t => t.registros > 0).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      de {dadosConsumo.consumo.porTabela.length} tabelas disponíveis
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Gráfico de Consumo por Tabela */}
                <Card>
                  <CardHeader>
                    <CardTitle>Registros por Tabela</CardTitle>
                    <CardDescription>
                      Distribuição de registros nas principais tabelas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dadosConsumo.consumo.porTabela
                            .filter(t => t.registros > 0)
                            .slice(0, 8)}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis
                            dataKey="descricao"
                            type="category"
                            width={100}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(value: number) => [
                              `${value.toLocaleString('pt-BR')} registros`,
                              'Quantidade',
                            ]}
                          />
                          <Bar
                            dataKey="registros"
                            fill="#f97316"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de Vendas por Dia */}
                <Card>
                  <CardHeader>
                    <CardTitle>Vendas dos Últimos 30 Dias</CardTitle>
                    <CardDescription>
                      Evolução diária de vendas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={dadosConsumo.estatisticas.vendas30Dias.porDia}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="data"
                            tickFormatter={formatarData}
                            tick={{ fontSize: 10 }}
                            interval={4}
                          />
                          <YAxis />
                          <Tooltip
                            labelFormatter={(label) => formatarData(label as string)}
                            formatter={(value: number) => [
                              formatarMoeda(value),
                              'Total',
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="total"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela Detalhada */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por Tabela</CardTitle>
                  <CardDescription>
                    Quantidade de registros e tamanho estimado por tabela
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tabela</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Registros</TableHead>
                        <TableHead className="text-right">Tamanho Estimado</TableHead>
                        <TableHead className="text-right">% do Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosConsumo.consumo.porTabela.map((tabela) => {
                        const percentual =
                          dadosConsumo.consumo.total.registros > 0
                            ? (tabela.registros / dadosConsumo.consumo.total.registros) * 100
                            : 0;

                        return (
                          <TableRow key={tabela.tabela}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {ICONES_TABELAS[tabela.tabela] || (
                                  <Database className="h-4 w-4" />
                                )}
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                  {tabela.tabela}
                                </code>
                              </div>
                            </TableCell>
                            <TableCell>{tabela.descricao}</TableCell>
                            <TableCell className="text-right font-medium">
                              {tabela.registros.toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatarTamanho(tabela.tamanhoEstimado)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress
                                  value={percentual}
                                  className="w-16 h-2"
                                />
                                <span className="text-sm text-muted-foreground w-12 text-right">
                                  {percentual.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Database className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Selecione um cliente</p>
                <p className="text-sm text-muted-foreground">
                  Escolha um cliente para visualizar o consumo de dados
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
