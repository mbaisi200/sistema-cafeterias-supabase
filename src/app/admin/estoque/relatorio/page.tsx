'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutos, useCategorias } from '@/hooks/useSupabase';
import { getSupabaseClient } from '@/lib/supabase';
import { exportToPDF, fetchEmpresaPDFData } from '@/lib/export-pdf';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import {
  ArrowUpDown, Search, Download, ArrowUp, ArrowDown,
  X, Loader2, Package, TrendingUp, TrendingDown, List, ChevronLeft,
} from 'lucide-react';

interface MovItem {
  id: string;
  produto_id: string;
  produto_nome: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'venda';
  quantidade: number;
  estoque_anterior: number | null;
  estoque_novo: number | null;
  observacao: string | null;
  fornecedor: string | null;
  documento_ref: string | null;
  venda_id: string | null;
  usuario_nome: string | null;
  criado_por_nome: string | null;
  criado_em: string;
}

export default function RelatorioEstoquePage() {
  const { user, empresaId } = useAuth();
  const { produtos } = useProdutos();
  const { categorias } = useCategorias();
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';

  const [movimentos, setMovimentos] = useState<MovItem[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);

  const [filtroDataInicio, setFiltroDataInicio] = useState(inicioMes);
  const [filtroDataFim, setFiltroDataFim] = useState(hoje.toISOString().slice(0, 10));
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroProduto, setFiltroProduto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroTexto, setFiltroTexto] = useState('');

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const supabase = getSupabaseClient();

    let query = supabase
      .from('estoque_movimentos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('criado_em', { ascending: false });

    if (filtroDataInicio) query = query.gte('criado_em', `${filtroDataInicio}T00:00:00`);
    if (filtroDataFim) query = query.lte('criado_em', `${filtroDataFim}T23:59:59`);
    if (filtroTipo !== 'todos') query = query.eq('tipo', filtroTipo);
    if (filtroProduto) {
      const prod = produtos.find(p => p.id === filtroProduto);
      if (prod) query = query.eq('produto_id', filtroProduto);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const items = (data || []) as MovItem[];
    setMovimentos(items);

    // Buscar nomes dos clientes das vendas vinculadas
    const vendaIds = items.filter(i => i.venda_id).map(i => i.venda_id!);
    if (vendaIds.length > 0) {
      const { data: vendas } = await supabase
        .from('vendas')
        .select('id, nome_cliente')
        .in('id', vendaIds);
      if (vendas) {
        const map: Record<string, string> = {};
        for (const v of vendas) {
          if (v.nome_cliente) map[v.id] = v.nome_cliente;
        }
        setClientesMap(map);
      }
    }

    setLoading(false);
  }, [empresaId, filtroDataInicio, filtroDataFim, filtroTipo, filtroProduto, produtos]);

  useEffect(() => { carregar(); }, [carregar]);

  const movimentosFiltrados = useMemo(() => {
    return movimentos.filter(m => {
      if (filtroTexto) {
        const t = filtroTexto.toLowerCase();
        const matchNome = m.produto_nome?.toLowerCase().includes(t);
        const matchFornecedor = m.fornecedor?.toLowerCase().includes(t);
        const matchCliente = (m.venda_id && clientesMap[m.venda_id]?.toLowerCase().includes(t));
        const matchObs = m.observacao?.toLowerCase().includes(t);
        const matchDoc = m.documento_ref?.toLowerCase().includes(t);
        if (!matchNome && !matchFornecedor && !matchCliente && !matchObs && !matchDoc) return false;
      }
      if (filtroCategoria !== 'todos') {
        const prod = produtos.find(p => p.id === m.produto_id);
        if (prod?.categoriaId !== filtroCategoria) return false;
      }
      return true;
    });
  }, [movimentos, filtroTexto, filtroCategoria, produtos, clientesMap]);

  const totalEntradas = useMemo(
    () => movimentosFiltrados.filter(m => m.tipo === 'entrada').reduce((s, m) => s + Number(m.quantidade), 0),
    [movimentosFiltrados],
  );
  const totalSaidas = useMemo(
    () => movimentosFiltrados.filter(m => m.tipo === 'saida' || m.tipo === 'venda').reduce((s, m) => s + Number(m.quantidade), 0),
    [movimentosFiltrados],
  );

  const nomeFornecedorOuCliente = (m: MovItem) => {
    if (m.tipo === 'entrada' && m.fornecedor) return m.fornecedor;
    if ((m.tipo === 'venda' || m.tipo === 'saida') && m.venda_id && clientesMap[m.venda_id]) return clientesMap[m.venda_id];
    return null;
  };

  const documentoRef = (m: MovItem) => {
    if (m.documento_ref) return m.documento_ref;
    if ((m.tipo === 'venda' || m.tipo === 'saida') && m.venda_id) return `Venda ${m.venda_id.slice(-8)}`;
    return null;
  };

  const labelTipo = (tipo: string) => {
    const map: Record<string, string> = { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste', venda: 'Venda' };
    return map[tipo] || tipo;
  };

  const corTipo = (tipo: string) => {
    if (tipo === 'entrada') return darkMode ? 'bg-green-900/60 text-green-300' : 'bg-green-100 text-green-700';
    if (tipo === 'venda') return darkMode ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-700';
    if (tipo === 'saida') return darkMode ? 'bg-red-900/60 text-red-300' : 'bg-red-100 text-red-700';
    return darkMode ? 'bg-yellow-900/60 text-yellow-300' : 'bg-yellow-100 text-yellow-700';
  };

  const formatData = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ label: 'Estoque', href: '/admin/estoque' }, { label: 'Relatório de Movimentações' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/estoque">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Relatório de Movimentações</h1>
                <p className="text-sm text-muted-foreground">Histórico de entradas e saídas por produto</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                const empresaInfo = await fetchEmpresaPDFData(empresaId);
                exportToPDF({
                  title: 'Relatório de Movimentações de Estoque',
                  subtitle: `${filtroDataInicio} a ${filtroDataFim} | Entradas: ${totalEntradas} | Saídas: ${totalSaidas}`,
                  columns: [
                    { header: 'Data/Hora', accessor: (row: MovItem) => formatData(row.criado_em), width: 30 },
                    { header: 'Produto', accessor: (row: MovItem) => row.produto_nome || '-', width: 35 },
                    { header: 'Tipo', accessor: (row: MovItem) => labelTipo(row.tipo), width: 12 },
                    { header: 'Qtd', accessor: (row: MovItem) => row.quantidade, width: 10, totalize: true },
                    { header: 'Fornecedor/Cliente', accessor: (row: MovItem) => nomeFornecedorOuCliente(row) || '-', width: 30 },
                    { header: 'Documento', accessor: (row: MovItem) => documentoRef(row) || '-', width: 20 },
                    { header: 'Observação', accessor: (row: MovItem) => row.observacao || '-', width: 40 },
                    { header: 'Usuário', accessor: (row: MovItem) => row.usuario_nome || row.criado_por_nome || '-', width: 20 },
                  ],
                  data: movimentosFiltrados,
                  filename: `relatorio-movimentacoes-${filtroDataInicio}-a-${filtroDataFim}`,
                  orientation: 'landscape',
                  totals: { label: 'TOTAL' },
                  ...empresaInfo,
                });
              }}
              disabled={movimentosFiltrados.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" /> Exportar PDF
            </Button>
          </div>

          {/* Filters */}
          <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div>
                  <Label className="text-[10px]">Data Início</Label>
                  <Input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Data Fim</Label>
                  <Input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Tipo</Label>
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                      <SelectItem value="venda">Venda</SelectItem>
                      <SelectItem value="ajuste">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Produto</Label>
                  <Select value={filtroProduto} onValueChange={setFiltroProduto}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {produtos.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Categoria</Label>
                  <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {categorias.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Produto, cliente..."
                      value={filtroTexto}
                      onChange={e => setFiltroTexto(e.target.value)}
                      className="pl-7 h-8 text-xs"
                    />
                    {filtroTexto && (
                      <button onClick={() => setFiltroTexto('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-2">
            <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/40">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight">Entradas</p>
                  <p className="text-base font-bold text-green-600 dark:text-green-400 truncate">{totalEntradas}</p>
                </div>
              </CardContent>
            </Card>
            <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40">
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight">Saídas</p>
                  <p className="text-base font-bold text-red-600 dark:text-red-400 truncate">{totalSaidas}</p>
                </div>
              </CardContent>
            </Card>
            <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <List className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight">Registros</p>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 truncate">{movimentosFiltrados.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                  <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight">Produtos</p>
                  <p className="text-base font-bold text-purple-600 dark:text-purple-400 truncate">
                    {new Set(movimentosFiltrados.map(m => m.produto_id)).size}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : movimentosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ArrowUpDown className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma movimentação encontrada</p>
                  <p className="text-sm">Tente ajustar os filtros</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] py-2 whitespace-nowrap">Data/Hora</TableHead>
                        <TableHead className="text-[11px] py-2">Produto</TableHead>
                        <TableHead className="text-[11px] py-2 text-center">Tipo</TableHead>
                        <TableHead className="text-[11px] py-2 text-center">Qtd</TableHead>
                        <TableHead className="text-[11px] py-2">Fornec./Cliente</TableHead>
                        <TableHead className="text-[11px] py-2">Documento</TableHead>
                        <TableHead className="text-[11px] py-2">Observação</TableHead>
                        <TableHead className="text-[11px] py-2">Usuário</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimentosFiltrados.map(m => (
                        <TableRow key={m.id} className={darkMode ? 'border-white/5' : ''}>
                          <TableCell className="text-xs py-1.5 whitespace-nowrap text-muted-foreground">
                            {formatData(m.criado_em)}
                          </TableCell>
                          <TableCell className="text-xs py-1.5 font-medium max-w-[180px] truncate" title={m.produto_nome || ''}>
                            {m.produto_nome || '-'}
                          </TableCell>
                          <TableCell className="text-xs py-1.5 text-center">
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${corTipo(m.tipo)}`}>
                              {m.tipo === 'entrada' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                              {labelTipo(m.tipo)}
                            </span>
                          </TableCell>
                          <TableCell className={`text-xs py-1.5 text-center font-bold ${
                            m.tipo === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {m.tipo === 'entrada' ? '+' : '-'}{Math.abs(Number(m.quantidade))}
                          </TableCell>
                          <TableCell className="text-xs py-1.5 text-muted-foreground max-w-[130px] truncate" title={nomeFornecedorOuCliente(m) || ''}>
                            {nomeFornecedorOuCliente(m) || '-'}
                          </TableCell>
                          <TableCell className="text-xs py-1.5 text-muted-foreground max-w-[100px] truncate" title={documentoRef(m) || ''}>
                            {documentoRef(m) || '-'}
                          </TableCell>
                          <TableCell className="text-xs py-1.5 text-muted-foreground max-w-[150px] truncate" title={m.observacao || ''}>
                            {m.observacao || '-'}
                          </TableCell>
                          <TableCell className="text-xs py-1.5 text-muted-foreground whitespace-nowrap">
                            {m.usuario_nome || m.criado_por_nome || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
