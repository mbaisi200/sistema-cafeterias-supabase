'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  FileUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Eye,
  Plus,
  Download,
  Printer,
  Package,
  Truck,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Loader2,
  FilePlus2,
  DollarSign,
} from 'lucide-react';

// =====================================================
// Types
// =====================================================

interface NFeEntrada {
  documento_ref: string;
  fornecedor: string;
  data: string;
  produtos: {
    id: string;
    produto_nome: string;
    quantidade: number;
    tipo_entrada: string;
    preco_unitario: number;
    estoque_novo: number;
    observacao: string | null;
  }[];
  valor_total: number;
  criado_por_nome: string | null;
}

interface NFeSaida {
  id: string;
  numero: string;
  data: string;
  cliente: string;
  total: number;
  forma_pagamento: string;
  status: string;
  nfe_id: string | null;
}

// =====================================================
// Page Component
// =====================================================

export default function NFePage() {
  const { empresaId } = useAuth();
  const [activeTab, setActiveTab] = useState('entrada');

  // Data states
  const [dadosEntrada, setDadosEntrada] = useState<NFeEntrada[]>([]);
  const [dadosSaida, setDadosSaida] = useState<NFeSaida[]>([]);
  const [loadingEntrada, setLoadingEntrada] = useState(false);
  const [loadingSaida, setLoadingSaida] = useState(false);

  // Filters
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [searchEntrada, setSearchEntrada] = useState('');
  const [searchSaida, setSearchSaida] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Detail dialog
  const [detailItem, setDetailItem] = useState<NFeEntrada | NFeSaida | null>(null);
  const [detailType, setDetailType] = useState<'entrada' | 'saida' | null>(null);

  // Set default date range (last 30 days)
  useEffect(() => {
    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    setDataInicio(trintaDiasAtras.toISOString().split('T')[0]);
    setDataFim(hoje.toISOString().split('T')[0]);
  }, []);

  // ========================================
  // Fetch data
  // ========================================
  const fetchEntrada = async () => {
    if (!empresaId) return;
    setLoadingEntrada(true);
    try {
      const response = await fetch('/api/nfe/listar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          tipo: 'entrada',
          dataInicio,
          dataFim,
          search: searchEntrada || undefined,
        }),
      });
      const data = await response.json();
      if (data.sucesso) {
        setDadosEntrada(data.dados || []);
      }
    } catch (error) {
      console.error('Erro ao buscar NF-e de entrada:', error);
    } finally {
      setLoadingEntrada(false);
    }
  };

  const fetchSaida = async () => {
    if (!empresaId) return;
    setLoadingSaida(true);
    try {
      const response = await fetch('/api/nfe/listar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          tipo: 'saida',
          dataInicio,
          dataFim,
          search: searchSaida || undefined,
          status: statusFilter === 'todos' ? undefined : statusFilter,
        }),
      });
      const data = await response.json();
      if (data.sucesso) {
        setDadosSaida(data.dados || []);
      }
    } catch (error) {
      console.error('Erro ao buscar NF-e de saída:', error);
    } finally {
      setLoadingSaida(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    if (empresaId && dataInicio && dataFim) {
      fetchEntrada();
      fetchSaida();
    }
  }, [empresaId, dataInicio, dataFim]);

  // Re-fetch when search changes (debounced)
  useEffect(() => {
    if (!empresaId) return;
    const timeout = setTimeout(() => {
      fetchEntrada();
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchEntrada]);

  useEffect(() => {
    if (!empresaId) return;
    const timeout = setTimeout(() => {
      fetchSaida();
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchSaida, statusFilter]);

  // ========================================
  // Stats
  // ========================================
  const statsEntrada = useMemo(() => {
    const totalNotas = dadosEntrada.length;
    const totalProdutos = dadosEntrada.reduce((acc, n) => acc + n.produtos.length, 0);
    const valorTotal = dadosEntrada.reduce((acc, n) => acc + n.valor_total, 0);
    return { totalNotas, totalProdutos, valorTotal };
  }, [dadosEntrada]);

  const statsSaida = useMemo(() => {
    const totalVendas = dadosSaida.length;
    const comNFe = dadosSaida.filter(v => v.status === 'nfe_emitida').length;
    const semNFe = dadosSaida.filter(v => v.status === 'pendente').length;
    const valorTotal = dadosSaida.reduce((acc, v) => acc + v.total, 0);
    return { totalVendas, comNFe, semNFe, valorTotal };
  }, [dadosSaida]);

  // ========================================
  // Toggle expanded row
  // ========================================
  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // ========================================
  // Helpers
  // ========================================
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // ========================================
  // Render
  // ========================================
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Notas Fiscais' }]}>
        <div className="space-y-6">
          {/* ============================================= */}
          {/* HEADER                                        */}
          {/* ============================================= */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <FileText className="h-7 w-7 md:h-8 md:w-8 text-orange-500" />
                Notas Fiscais
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Consulte e gerencie notas fiscais de entrada e saída
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/nfe/importar">
                <Button className="gap-2">
                  <FileUp className="h-4 w-4" />
                  Importar NF-e
                </Button>
              </Link>
              <Link href="/admin/nfe/emitir">
                <Button variant="outline" className="gap-2">
                  <FilePlus2 className="h-4 w-4" />
                  Emitir NF-e
                </Button>
              </Link>
            </div>
          </div>

          {/* ============================================= */}
          {/* TABS                                          */}
          {/* ============================================= */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
              <TabsTrigger value="entrada" className="gap-2">
                <ArrowDownToLine className="h-4 w-4" />
                NF-e de Entrada
              </TabsTrigger>
              <TabsTrigger value="saida" className="gap-2">
                <ArrowUpFromLine className="h-4 w-4" />
                NF-e de Saída
              </TabsTrigger>
            </TabsList>

            {/* ============================================= */}
            {/* TAB: ENTRADA                                  */}
            {/* ============================================= */}
            <TabsContent value="entrada" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statsEntrada.totalNotas}</p>
                        <p className="text-xs text-muted-foreground">Notas Importadas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statsEntrada.totalProdutos}</p>
                        <p className="text-xs text-muted-foreground">Produtos Importados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="col-span-2 md:col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{formatCurrency(statsEntrada.valorTotal)}</p>
                        <p className="text-xs text-muted-foreground">Valor Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Filter className="h-4 w-4" />
                      <span className="text-sm font-medium whitespace-nowrap">Filtros:</span>
                    </div>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full md:w-[160px]"
                    />
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full md:w-[160px]"
                    />
                    <div className="relative flex-1 w-full md:max-w-[260px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar documento, fornecedor..."
                        value={searchEntrada}
                        onChange={(e) => setSearchEntrada(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchEntrada}>
                      <RefreshCw className={`h-4 w-4 ${loadingEntrada ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowDownToLine className="h-5 w-5 text-blue-600" />
                    Notas Fiscais de Entrada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingEntrada ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Carregando notas de entrada...</span>
                    </div>
                  ) : dadosEntrada.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <ArrowDownToLine className="h-12 w-12 mb-4 opacity-30" />
                      <p className="text-lg font-medium">Nenhuma nota de entrada encontrada</p>
                      <p className="text-sm mt-1">Importe uma NFe XML para registrar notas de entrada</p>
                      <Link href="/admin/nfe/importar">
                        <Button className="mt-4 gap-2">
                          <FileUp className="h-4 w-4" />
                          Importar NF-e
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Documento Ref</TableHead>
                            <TableHead className="text-center">Produtos</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dadosEntrada.map((nfe) => {
                            const isExpanded = expandedRows.has(nfe.documento_ref);
                            return (
                              <React.Fragment key={nfe.documento_ref}>
                                <TableRow
                                  className="cursor-pointer hover:bg-muted/50"
                                  onClick={() => toggleRow(nfe.documento_ref)}
                                >
                                  <TableCell>
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm whitespace-nowrap">
                                    {formatDate(nfe.data)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Truck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                      <span className="text-sm truncate max-w-[200px]">
                                        {nfe.fornecedor}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs font-mono">
                                      {nfe.documento_ref}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="secondary" className="text-xs">
                                      <Package className="h-3 w-3 mr-1" />
                                      {nfe.produtos.length}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-sm">
                                    {formatCurrency(nfe.valor_total)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailItem(nfe);
                                        setDetailType('entrada');
                                      }}
                                      title="Ver detalhes"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                {/* Expanded: product list */}
                                {isExpanded && (
                                  <TableRow>
                                    <TableCell colSpan={7} className="bg-muted/30 p-0">
                                      <div className="px-8 py-3">
                                        <div className="max-h-[300px] overflow-y-auto rounded-lg border">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="text-xs">Produto</TableHead>
                                                <TableHead className="text-xs text-center">Qtd</TableHead>
                                                <TableHead className="text-xs text-right">Custo Unit.</TableHead>
                                                <TableHead className="text-xs text-right">Subtotal</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {nfe.produtos.map((prod) => (
                                                <TableRow key={prod.id}>
                                                  <TableCell className="text-sm py-2">
                                                    {prod.produto_nome}
                                                  </TableCell>
                                                  <TableCell className="text-sm text-center py-2 font-mono">
                                                    {prod.quantidade} {prod.tipo_entrada}
                                                  </TableCell>
                                                  <TableCell className="text-sm text-right py-2 font-mono">
                                                    {formatCurrency(prod.preco_unitario)}
                                                  </TableCell>
                                                  <TableCell className="text-sm text-right py-2 font-semibold font-mono">
                                                    {formatCurrency(prod.preco_unitario * prod.quantidade)}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================= */}
            {/* TAB: SAÍDA                                    */}
            {/* ============================================= */}
            <TabsContent value="saida" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statsSaida.totalVendas}</p>
                        <p className="text-xs text-muted-foreground">Vendas no Período</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statsSaida.comNFe}</p>
                        <p className="text-xs text-muted-foreground">Com NF-e Emitida</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statsSaida.semNFe}</p>
                        <p className="text-xs text-muted-foreground">Sem NF-e</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="col-span-2 md:col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{formatCurrency(statsSaida.valorTotal)}</p>
                        <p className="text-xs text-muted-foreground">Total Vendido</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Filter className="h-4 w-4" />
                      <span className="text-sm font-medium whitespace-nowrap">Filtros:</span>
                    </div>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full md:w-[160px]"
                    />
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full md:w-[160px]"
                    />
                    <div className="relative flex-1 w-full md:max-w-[260px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente, número..."
                        value={searchSaida}
                        onChange={(e) => setSearchSaida(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-[170px]">
                        <SelectValue placeholder="Status NF-e" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="com_nfe">Com NF-e Emitida</SelectItem>
                        <SelectItem value="sem_nfe">Sem NF-e</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchSaida}>
                      <RefreshCw className={`h-4 w-4 ${loadingSaida ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ArrowUpFromLine className="h-5 w-5 text-orange-600" />
                      Notas Fiscais de Saída
                    </CardTitle>
                    <Link href="/admin/nfe/emitir">
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Emitir NF-e
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSaida ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Carregando vendas...</span>
                    </div>
                  ) : dadosSaida.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <ArrowUpFromLine className="h-12 w-12 mb-4 opacity-30" />
                      <p className="text-lg font-medium">Nenhuma venda encontrada no período</p>
                      <p className="text-sm mt-1">Vendas fechadas aparecerão aqui para emissão de NF-e</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Pagamento</TableHead>
                            <TableHead>Status NF-e</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dadosSaida.map((venda) => (
                            <TableRow key={venda.id}>
                              <TableCell className="font-mono text-sm font-medium">
                                {venda.numero}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {formatDate(venda.data)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm truncate max-w-[180px]">
                                    {venda.cliente}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-sm">
                                {formatCurrency(venda.total)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {venda.forma_pagamento}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {venda.status === 'nfe_emitida' ? (
                                  <Badge className="bg-green-500 text-xs gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    NF-e Emitida
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-yellow-400 text-yellow-600 text-xs gap-1">
                                    <Clock className="h-3 w-3" />
                                    Pendente
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setDetailItem(venda);
                                      setDetailType('saida');
                                    }}
                                    title="Ver detalhes"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {venda.status === 'nfe_emitida' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      title="Imprimir DANFE"
                                      onClick={() =>
                                        window.open(`/api/nfe/danfe/${venda.nfe_id}`, '_blank')
                                      }
                                    >
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {venda.status === 'pendente' && (
                                    <Link href="/admin/nfe/emitir">
                                      <Button size="sm" className="gap-1 h-8 text-xs">
                                        <FilePlus2 className="h-3.5 w-3.5" />
                                        Emitir
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* ============================================= */}
          {/* DIALOG: Detalhes da NF-e de Entrada           */}
          {/* ============================================= */}
          <Dialog
            open={detailType === 'entrada' && !!detailItem}
            onOpenChange={(open) => { if (!open) { setDetailItem(null); setDetailType(null); } }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-blue-600" />
                  Detalhes da NF-e de Entrada
                </DialogTitle>
              </DialogHeader>
              {detailItem && detailType === 'entrada' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Documento
                      </p>
                      <p className="font-semibold text-sm mt-1 font-mono">
                        {(detailItem as NFeEntrada).documento_ref}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Truck className="h-3 w-3" /> Fornecedor
                      </p>
                      <p className="font-semibold text-sm mt-1">
                        {(detailItem as NFeEntrada).fornecedor}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Data
                      </p>
                      <p className="font-semibold text-sm mt-1">
                        {formatDateTime((detailItem as NFeEntrada).data)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-600">Valor Total</p>
                      <p className="text-xl font-bold text-emerald-700">
                        {formatCurrency((detailItem as NFeEntrada).valor_total)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-600">Produtos</p>
                      <p className="text-xl font-bold text-emerald-700">
                        {(detailItem as NFeEntrada).produtos.length}
                      </p>
                    </div>
                  </div>

                  {/* Products table */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Produtos</h4>
                    <div className="max-h-[400px] overflow-y-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Produto</TableHead>
                            <TableHead className="text-xs text-center">Qtd</TableHead>
                            <TableHead className="text-xs text-right">Custo Unit.</TableHead>
                            <TableHead className="text-xs text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailItem as NFeEntrada).produtos.map((prod) => (
                            <TableRow key={prod.id}>
                              <TableCell className="text-sm py-2">
                                {prod.produto_nome}
                              </TableCell>
                              <TableCell className="text-sm text-center py-2 font-mono">
                                {prod.quantidade} {prod.tipo_entrada}
                              </TableCell>
                              <TableCell className="text-sm text-right py-2 font-mono">
                                {formatCurrency(prod.preco_unitario)}
                              </TableCell>
                              <TableCell className="text-sm text-right py-2 font-semibold font-mono">
                                {formatCurrency(prod.preco_unitario * prod.quantidade)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* ============================================= */}
          {/* DIALOG: Detalhes da Venda (NF-e Saída)        */}
          {/* ============================================= */}
          <Dialog
            open={detailType === 'saida' && !!detailItem}
            onOpenChange={(open) => { if (!open) { setDetailItem(null); setDetailType(null); } }}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-5 w-5 text-orange-600" />
                  Detalhes da Venda
                </DialogTitle>
              </DialogHeader>
              {detailItem && detailType === 'saida' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Número</p>
                      <p className="font-semibold text-sm mt-1 font-mono">
                        {(detailItem as NFeSaida).numero}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-semibold text-sm mt-1">
                        {formatDateTime((detailItem as NFeSaida).data)}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-semibold text-sm mt-1">
                        {(detailItem as NFeSaida).cliente}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Pagamento</p>
                      <p className="font-semibold text-sm mt-1">
                        {(detailItem as NFeSaida).forma_pagamento}
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-600">Total da Venda</p>
                      <p className="text-xl font-bold text-emerald-700">
                        {formatCurrency((detailItem as NFeSaida).total)}
                      </p>
                    </div>
                    {(detailItem as NFeSaida).status === 'nfe_emitida' ? (
                      <Badge className="bg-green-500 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        NF-e Emitida
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-yellow-400 text-yellow-600 gap-1">
                        <Clock className="h-3 w-3" />
                        Pendente
                      </Badge>
                    )}
                  </div>

                  {(detailItem as NFeSaida).status === 'pendente' && (
                    <Link href="/admin/nfe/emitir">
                      <Button className="w-full gap-2">
                        <FilePlus2 className="h-4 w-4" />
                        Emitir NF-e para esta Venda
                      </Button>
                    </Link>
                  )}

                  {(detailItem as NFeSaida).status === 'nfe_emitida' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() =>
                          window.open(`/api/nfe/danfe/${(detailItem as NFeSaida).nfe_id}`, '_blank')
                        }
                      >
                        <Printer className="h-4 w-4" />
                        DANFE
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() =>
                          window.open(`/api/nfe/xml/${(detailItem as NFeSaida).nfe_id}?tipo=autorizado`, '_blank')
                        }
                      >
                        <Download className="h-4 w-4" />
                        XML
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
