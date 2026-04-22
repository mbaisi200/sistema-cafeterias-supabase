'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Package, CalendarIcon, Search, ShoppingCart, DollarSign, TrendingUp, User } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Produto {
  id: string;
  nome: string;
  categoria_id: string | null;
}

interface Categoria {
  id: string;
  nome: string;
}

interface Funcionario {
  id: string;
  nome: string;
}

interface ItemVenda {
  id: string;
  venda_id: string;
  produto_id: string | null;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  total: number;
  observacao: string | null;
  criado_em: string;
}

interface Venda {
  id: string;
  criado_em: string;
  tipo: string;
  status: string;
  total: number;
  funcionario_id: string | null;
}

interface ItemAgrupado {
  nome: string;
  categoriaNome: string;
  quantidade: number;
  valor: number;
  itens: number;
  vendas: { horario: string; quantidade: number; valor: number; operador: string }[];
}

interface FiltrosItens {
  dataInicio: Date;
  dataFim: Date;
  produtoId: string | 'todos';
  categoriaId: string | 'todos';
  operadorId: string | 'todos';
}

export function VendasItensDia() {
  const { empresaId } = useAuth();

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [filtros, setFiltros] = useState<FiltrosItens>({
    dataInicio: startOfDay(new Date()),
    dataFim: endOfDay(new Date()),
    produtoId: 'todos',
    categoriaId: 'todos',
    operadorId: 'todos',
  });

  useEffect(() => {
    if (!empresaId) return;
    loadDados();
  }, [empresaId, filtros.dataInicio.toISOString(), filtros.dataFim.toISOString()]);

  const loadDados = async () => {
    if (!empresaId) return;
    setLoading(true);

    try {
      const supabase = getSupabaseClient();

      const [produtosRes, categoriasRes, funcionariosRes] = await Promise.all([
        supabase.from('produtos').select('id, nome, categoria_id').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
        supabase.from('categorias').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
        supabase.from('funcionarios').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
      ]);

      setProdutos(produtosRes.data || []);
      setCategorias(categoriasRes.data || []);
      setFuncionarios(funcionariosRes.data || []);

      const dataInicio = startOfDay(filtros.dataInicio).toISOString();
      const dataFim = endOfDay(filtros.dataFim).toISOString();

      const { data: vendasData } = await supabase
        .from('vendas')
        .select('id, criado_em, tipo, status, total, funcionario_id')
        .eq('empresa_id', empresaId)
        .gte('criado_em', dataInicio)
        .lte('criado_em', dataFim)
        .order('criado_em', { ascending: false });

      setVendas(vendasData || []);

      const vendaIds = (vendasData || []).map(v => v.id);

      if (vendaIds.length === 0) {
        setItens([]);
        setLoading(false);
        return;
      }

      const { data: itensData } = await supabase
        .from('itens_venda')
        .select('*')
        .in('venda_id', vendaIds)
        .order('criado_em', { ascending: false });

      setItens(itensData || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setItens([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoriaNome = (produtoId: string | null) => {
    if (!produtoId) return '-';
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto || !produto.categoria_id) return '-';
    const categoria = categorias.find(c => c.id === produto.categoria_id);
    return categoria?.nome || '-';
  };

  const getFuncionarioNome = (funcionarioId: string | null) => {
    if (!funcionarioId) return 'Admin';
    const funcionario = funcionarios.find(f => f.id === funcionarioId);
    return funcionario?.nome || 'Admin';
  };

  const itensFiltrados = useMemo(() => {
    let resultado = itens;

    if (search) {
      const searchLower = search.toLowerCase();
      resultado = resultado.filter(item =>
        item.nome.toLowerCase().includes(searchLower)
      );
    }

    if (filtros.produtoId !== 'todos') {
      resultado = resultado.filter(item => item.produto_id === filtros.produtoId);
    }

    if (filtros.categoriaId !== 'todos') {
      const produtoIds = new Set(
        produtos
          .filter(p => p.categoria_id === filtros.categoriaId)
          .map(p => p.id)
      );
      resultado = resultado.filter(item => item.produto_id && produtoIds.has(item.produto_id));
    }

    if (filtros.operadorId !== 'todos') {
      const vendaIds = new Set(
        vendas
          .filter(v => v.funcionario_id === filtros.operadorId)
          .map(v => v.id)
      );
      resultado = resultado.filter(item => vendaIds.has(item.venda_id));
    }

    return resultado;
  }, [itens, search, filtros.produtoId, filtros.categoriaId, filtros.operadorId, produtos, vendas]);

  const dadosAgrupados = useMemo(() => {
    const mapa = new Map<string, ItemAgrupado>();

    itensFiltrados.forEach(item => {
      const nome = item.nome;
      const categoriaNome = getCategoriaNome(item.produto_id);
      const venda = vendas.find(v => v.id === item.venda_id);
      const horario = venda ? format(new Date(venda.criado_em), 'HH:mm') : '--:--';
      const operador = getFuncionarioNome(venda?.funcionario_id || null);

      const existente = mapa.get(nome) || { 
        nome, 
        categoriaNome,
        quantidade: 0, 
        valor: 0, 
        itens: 0,
        vendas: []
      };
      existente.quantidade += item.quantidade;
      existente.valor += item.total;
      existente.itens += 1;
      
      const vendaExistente = existente.vendas.find(v => v.horario === horario && v.operador === operador);
      if (vendaExistente) {
        vendaExistente.quantidade += item.quantidade;
        vendaExistente.valor += item.total;
      } else {
        existente.vendas.push({ horario, quantidade: item.quantidade, valor: item.total, operador });
      }
      
      mapa.set(nome, existente);
    });

    return Array.from(mapa.values()).sort((a, b) => b.valor - a.valor);
  }, [itensFiltrados, vendas, produtos, categorias, funcionarios]);

  const totalGeral = useMemo(() => {
    return dadosAgrupados.reduce((acc, item) => acc + item.valor, 0);
  }, [dadosAgrupados]);

  const totalQuantidade = useMemo(() => {
    return dadosAgrupados.reduce((acc, item) => acc + item.quantidade, 0);
  }, [dadosAgrupados]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas de Itens por Dia</CardTitle>
          <CardDescription>Relatório detalhado de itens vendidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Vendas de Itens por Dia
            </CardTitle>
            <CardDescription>Relatório detalhado de itens vendidos no período</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Data Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(filtros.dataInicio, 'dd/MM/yyyy', { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filtros.dataInicio}
                  onSelect={(date) => date && setFiltros(f => ({ ...f, dataInicio: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Data Fim</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(filtros.dataFim, 'dd/MM/yyyy', { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filtros.dataFim}
                  onSelect={(date) => date && setFiltros(f => ({ ...f, dataFim: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Produto</Label>
            <Select
              value={filtros.produtoId}
              onValueChange={(value) => setFiltros(f => ({ ...f, produtoId: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {produtos.map(produto => (
                  <SelectItem key={produto.id} value={produto.id}>{produto.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Categoria</Label>
            <Select
              value={filtros.categoriaId}
              onValueChange={(value) => setFiltros(f => ({ ...f, categoriaId: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Operador</Label>
            <Select
              value={filtros.operadorId}
              onValueChange={(value) => setFiltros(f => ({ ...f, operadorId: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {funcionarios.map(func => (
                  <SelectItem key={func.id} value={func.id}>{func.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-2 border-primary/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Itens</p>
                  <p className="text-xl font-bold">{dadosAgrupados.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-emerald-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Qtd. Vendida</p>
                  <p className="text-xl font-bold">{totalQuantidade.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-amber-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                  <p className="text-xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-violet-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                  <p className="text-xl font-bold">
                    {totalQuantidade > 0
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral / totalQuantidade)
                      : 'R$ 0,00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Vl. Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center w-24">Horário</TableHead>
                <TableHead className="w-32">Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosAgrupados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum item encontrado para os filtros selecionados
                  </TableCell>
                </TableRow>
              ) : (
                dadosAgrupados.map((item, index) => (
                  <TableRow key={item.nome} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.categoriaNome}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.quantidade.toFixed(0)}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantidade > 0 ? item.valor / item.quantidade : 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {item.vendas.slice(0, 3).map((v, i) => (
                          <span key={i} className="text-xs text-muted-foreground">{v.horario}</span>
                        ))}
                        {item.vendas.length > 3 && <span className="text-xs text-muted-foreground">+{item.vendas.length - 3}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {item.vendas[0]?.operador || 'Admin'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {dadosAgrupados.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Mostrando {dadosAgrupados.length} itens
            </p>
            <p className="text-sm font-medium">
              Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}