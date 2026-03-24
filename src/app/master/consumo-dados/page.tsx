'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Calendar,
  DollarSign,
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
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [dadosConsumo, setDadosConsumo] = useState<DadosConsumo | null>(null);
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
          if (data.empresas.length > 0) {
            setEmpresaSelecionada(data.empresas[0].id);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar empresas:', error);
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
        const response = await fetch(`/api/master/consumo-dados?empresaId=${empresaSelecionada}`);
        const data = await response.json();

        if (data.empresa) {
          setDadosConsumo(data);
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
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
                Monitore o uso do banco de dados por cliente
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
          ) : dadosConsumo ? (
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

              {/* Resumo de Armazenamento */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo de Armazenamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total de Registros
                      </span>
                      <span className="font-bold">
                        {dadosConsumo.consumo.total.registros.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Tamanho Estimado Total
                      </span>
                      <span className="font-bold text-blue-600">
                        {dadosConsumo.consumo.total.tamanhoFormatado}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Tabela com Mais Registros
                      </span>
                      <span className="font-medium">
                        {dadosConsumo.consumo.porTabela[0]?.descricao || '-'} (
                        {dadosConsumo.consumo.porTabela[0]?.registros.toLocaleString('pt-BR') || 0})
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Nota:</strong> O tamanho estimado é calculado com base no
                      número de registros e um tamanho médio por tipo de dados. O
                      consumo real pode variar dependendo do conteúdo armazenado em
                      campos de texto longo, JSON, e outros dados variáveis.
                    </p>
                  </div>
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
