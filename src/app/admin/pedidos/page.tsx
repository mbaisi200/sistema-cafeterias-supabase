'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase';
import { exportToPDF, formatCurrencyPDF, formatDatePDF } from '@/lib/export-pdf';
import {
  Plus,
  ChevronLeft,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Package,
  ShoppingCart,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  ChevronDown,
  User,
  Download,
} from 'lucide-react';

interface PedidoItem {
  id: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

interface Pedido {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  dataPedido: string;
  dataEntrega: string;
  condicaoPagamento: string;
  observacoes: string;
  status: string;
  valorTotal: number;
  itens: PedidoItem[];
  criadoEm: string;
}

const STATUS_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'aprovado', label: 'Aprovado', color: 'bg-blue-100 text-blue-700' },
  { value: 'faturado', label: 'Faturado', color: 'bg-green-100 text-green-700' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
];

export default function PedidosPage() {
  const { user, empresaId } = useAuth();
  const { toast } = useToast();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [detailPedido, setDetailPedido] = useState<Pedido | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [openClienteSearch, setOpenClienteSearch] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [pedidoStatus, setPedidoStatus] = useState('rascunho');

  // Items state
  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [openProdutoSearch, setOpenProdutoSearch] = useState<boolean[]>([]);
  const [produtoSearchByItem, setProdutoSearchByItem] = useState<string[]>([]);

  // Data lists
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState<any[]>([]);
  const [novaCondicao, setNovaCondicao] = useState('');
  const [condicoesOpen, setCondicoesOpen] = useState(true);

  // Load data
  useEffect(() => {
    if (empresaId) {
      loadPedidos();
      loadClientes();
      loadProdutos();
      loadCondicoes();
    }
  }, [empresaId]);

  const getSupabase = () => {
    return getSupabaseClient();
  };

  const loadPedidos = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      const parsed = (data || []).map((p: any) => ({
        ...p,
        clienteId: p.cliente_id || '',
        clienteNome: p.cliente_nome || '',
        dataPedido: p.data_pedido || p.criado_em,
        dataEntrega: p.data_entrega || '',
        condicaoPagamento: p.condicao_pagamento || '',
        valorTotal: p.valor_total || 0,
        itens: typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || []),
        criadoEm: p.criado_em,
      }));
      setPedidos(parsed);
    } catch (err: any) {
      console.error('Erro ao carregar pedidos:', err);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('clientes')
        .select('id, nome_razao_social, nome_fantasia, cnpj_cpf, tipo_pessoa')
        .eq('empresa_id', empresaId)
        .order('nome_razao_social');
      setClientes(data || []);
    } catch {
      // ignore
    }
  };

  const loadProdutos = async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('produtos')
        .select('id, nome, preco, custo, unidade, codigo_barras')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      setProdutos(data || []);
    } catch {
      // ignore
    }
  };

  const loadCondicoes = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('condicoes_pagamento')
        .select('id, nome, descricao, ativo')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      if (error) {
        console.error('Erro loadCondicoes:', error);
      }
      setCondicoesPagamento(data || []);
    } catch (err) {
      console.error('Erro loadCondicoes catch:', err);
      setCondicoesPagamento([]);
    }
  };

  const handleAddCondicao = async () => {
    if (!novaCondicao.trim() || !empresaId) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('condicoes_pagamento').insert({
        empresa_id: empresaId,
        nome: novaCondicao.trim(),
        ativo: true,
      }).select('id, nome');
      if (error) {
        console.error('Erro insert condicao:', error);
        toast({ variant: 'destructive', title: 'Erro ao adicionar condição', description: error.message });
        return;
      }
      setNovaCondicao('');
      await loadCondicoes();
      toast({ title: 'Condição adicionada com sucesso!' });
    } catch (err: any) {
      console.error('Erro handleAddCondicao:', err);
      toast({ variant: 'destructive', title: 'Erro ao adicionar condição', description: err.message });
    }
  };

  const handleDeleteCondicao = async (id: string) => {
    try {
      const supabase = getSupabase();
      await supabase.from('condicoes_pagamento').delete().eq('id', id);
      loadCondicoes();
      toast({ title: 'Condição removida' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover condição', description: err.message });
    }
  };

  // Filter clientes by search text
  const clientesFiltrados = useMemo(() => {
    if (!clienteSearch.trim()) return clientes;
    const term = clienteSearch.toLowerCase();
    return clientes.filter(c =>
      (c.nome_razao_social || '').toLowerCase().includes(term) ||
      (c.nome_fantasia || '').toLowerCase().includes(term) ||
      (c.cnpj_cpf || '').includes(term)
    );
  }, [clientes, clienteSearch]);

  // Item management
  const addItem = () => {
    const newIndex = itens.length;
    setItens([...itens, {
      id: Date.now().toString(),
      produtoId: '',
      produtoNome: '',
      quantidade: 1,
      precoUnitario: 0,
      subtotal: 0,
    }]);
    setOpenProdutoSearch(prev => [...prev, false]);
    setProdutoSearchByItem(prev => [...prev, '']);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...itens];
    (updated[index] as any)[field] = value;
    if (field === 'produtoId') {
      const prod = produtos.find(p => p.id === value);
      updated[index].produtoNome = prod?.nome || '';
      updated[index].precoUnitario = prod?.custo || prod?.preco || 0;
    }
    updated[index].subtotal = updated[index].quantidade * updated[index].precoUnitario;
    setItens(updated);
  };

  const removeItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
    setOpenProdutoSearch(prev => prev.filter((_, i) => i !== index));
    setProdutoSearchByItem(prev => prev.filter((_, i) => i !== index));
  };

  const totalItens = itens.reduce((acc, item) => acc + item.subtotal, 0);

  // Save
  const handleSave = async () => {
    if (!clienteId || !clienteNome) {
      toast({ variant: 'destructive', title: 'Cliente é obrigatório', description: 'Selecione um cliente para emissão de NF-e de saída.' });
      return;
    }
    if (itens.length === 0) {
      toast({ variant: 'destructive', title: 'Adicione ao menos um item' });
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabase();

      if (editingPedido) {
        const { error } = await supabase
          .from('pedidos')
          .update({
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            data_entrega: dataEntrega || null,
            condicao_pagamento: condicaoPagamento,
            observacoes,
            status: pedidoStatus,
            valor_total: totalItens,
            itens: JSON.stringify(itens),
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', editingPedido.id);
        if (error) throw error;
        toast({ title: 'Pedido atualizado com sucesso!' });
      } else {
        const { data: last } = await supabase
          .from('pedidos')
          .select('numero')
          .eq('empresa_id', empresaId)
          .order('numero', { ascending: false })
          .limit(1)
          .single();
        const nextNum = (last?.numero || 0) + 1;

        const { error } = await supabase
          .from('pedidos')
          .insert({
            empresa_id: empresaId,
            numero: nextNum,
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            data_pedido: new Date().toISOString(),
            data_entrega: dataEntrega || null,
            condicao_pagamento: condicaoPagamento,
            observacoes,
            status: pedidoStatus,
            valor_total: totalItens,
            itens: JSON.stringify(itens),
            criado_por: user?.id,
            criado_por_nome: user?.nome,
          });
        if (error) throw error;
        toast({ title: 'Pedido criado com sucesso!' });
      }
      setDialogOpen(false);
      resetForm();
      loadPedidos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar pedido', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este pedido?')) return;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('pedidos').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Pedido excluído' });
      loadPedidos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    }
  };

  // Edit
  // Filter produtos by search text per item
  const getProdutosFiltrados = (index: number) => {
    const term = (produtoSearchByItem[index] || '').toLowerCase().trim();
    if (!term) return produtos;
    return produtos.filter(p =>
      (p.nome || '').toLowerCase().includes(term) ||
      (p.codigo_barras || '').includes(term) ||
      (p.codigo || '').toLowerCase().includes(term)
    );
  };

  const handleEdit = (pedido: Pedido) => {
    setEditingPedido(pedido);
    setClienteId(pedido.clienteId || '');
    setClienteNome(pedido.clienteNome || '');
    setDataEntrega(pedido.dataEntrega ? pedido.dataEntrega.split('T')[0] : '');
    setCondicaoPagamento(pedido.condicaoPagamento || '');
    setObservacoes(pedido.observacoes || '');
    setPedidoStatus(pedido.status);
    setItens(pedido.itens || []);
    setOpenProdutoSearch((pedido.itens || []).map(() => false));
    setProdutoSearchByItem((pedido.itens || []).map(() => ''));
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPedido(null);
    setClienteId('');
    setClienteNome('');
    setOpenClienteSearch(false);
    setClienteSearch('');
    setDataEntrega('');
    setCondicaoPagamento('');
    setObservacoes('');
    setPedidoStatus('rascunho');
    setItens([]);
    setOpenProdutoSearch([]);
    setProdutoSearchByItem([]);
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    if (!opt) return null;
    return <Badge className={`${opt.color} text-xs border-0`}>{opt.label}</Badge>;
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '-'; } };

  // Export PDF
  const handleExportPDF = () => {
    const totalValor = pedidosFiltrados.reduce((acc, p) => acc + (p.valorTotal || 0), 0);
    const statusLabel = (status: string) => {
      const opt = STATUS_OPTIONS.find(s => s.value === status);
      return opt ? opt.label : status;
    };
    exportToPDF({
      title: 'Relatório de Pedidos',
      subtitle: `Listagem de pedidos ${statusFilter !== 'todos' ? `(${statusLabel(statusFilter)})` : '(todos os status)'}${search ? ` - Busca: "${search}"` : ''}`,
      columns: [
        { header: 'Nº', accessor: (row: any) => `#${row.numero}`, width: 20 },
        { header: 'Cliente', accessor: (row: any) => row.clienteNome || '-', width: 60 },
        { header: 'Data', accessor: (row: any) => formatDatePDF(row.criadoEm), width: 30 },
        { header: 'Valor Total', accessor: (row: any) => formatCurrencyPDF(row.valorTotal), width: 35 },
        { header: 'Status', accessor: (row: any) => statusLabel(row.status), width: 25 },
      ],
      data: pedidosFiltrados,
      filename: 'pedidos',
      orientation: 'landscape',
      totals: {
        label: 'TOTAL',
        columnTotals: { 3: formatCurrencyPDF(totalValor) },
      },
      summary: [
        { label: 'Total de Pedidos', value: pedidosFiltrados.length },
        { label: 'Valor Total', value: formatCurrencyPDF(totalValor) },
      ],
    });
  };

  // Filter
  const pedidosFiltrados = pedidos.filter(p => {
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter;
    const matchSearch = !search ||
      (p.clienteNome || '').toLowerCase().includes(search.toLowerCase()) ||
      String(p.numero).includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Pedidos' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                  <ShoppingCart className="h-7 w-7 text-blue-600" />
                  Pedidos
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie pedidos de venda
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Pedido
              </Button>
            </div>
          </div>

          {/* Condições de Pagamento */}
          <Collapsible open={condicoesOpen} onOpenChange={setCondicoesOpen}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${condicoesOpen ? '' : '-rotate-90'}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CardTitle className="text-base">Condições de Pagamento</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={novaCondicao}
                      onChange={(e) => setNovaCondicao(e.target.value)}
                      placeholder="Ex: 30/60/90 dias"
                      className="h-8 w-48 text-sm"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCondicao(); }}
                    />
                    <Button size="sm" onClick={handleAddCondicao} disabled={!novaCondicao.trim()}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  {condicoesPagamento.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma condição cadastrada</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {condicoesPagamento.map(c => (
                        <Badge key={c.id} variant="secondary" className="text-sm py-1 px-3 gap-1">
                          {c.nome}
                          <button onClick={() => handleDeleteCondicao(c.id)} className="ml-1 hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="relative flex-1 w-full md:max-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por cliente ou nº pedido..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : pedidosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Nenhum pedido encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidosFiltrados.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono font-medium">#{p.numero}</TableCell>
                          <TableCell>{p.clienteNome || '-'}</TableCell>
                          <TableCell className="text-sm">{formatDate(p.criadoEm)}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">{formatCurrency(p.valorTotal)}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(p.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailPedido(p)}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)}><Edit className="h-4 w-4 text-blue-600" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
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
        </div>

        {/* CREATE/EDIT DIALOG */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPedido ? 'Editar Pedido' : 'Novo Pedido'}</DialogTitle>
              <DialogDescription>Preencha os dados do pedido</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Header fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente <span className="text-red-500">*</span></Label>
                  <p className="text-xs text-muted-foreground -mt-1">Cliente para emissão de NF-e de saída</p>
                  <Popover open={openClienteSearch} onOpenChange={setOpenClienteSearch}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 w-full justify-start font-normal text-sm">
                        {clienteNome ? (
                          <span className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {clienteNome}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Selecionar cliente...</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar por nome ou CNPJ/CPF..."
                          value={clienteSearch}
                          onValueChange={setClienteSearch}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-y-auto">
                            {clientesFiltrados.map(c => (
                              <CommandItem
                                key={c.id}
                                value={c.nome_razao_social}
                                onSelect={() => {
                                  setClienteId(c.id);
                                  setClienteNome(c.nome_razao_social);
                                  setOpenClienteSearch(false);
                                  setClienteSearch('');
                                }}
                              >
                                <User className="mr-2 h-4 w-4" />
                                <div className="flex flex-col">
                                  <span>{c.nome_razao_social}</span>
                                  {c.nome_fantasia && (
                                    <span className="text-xs text-muted-foreground">{c.nome_fantasia}</span>
                                  )}
                                </div>
                                <span className="ml-auto text-xs text-muted-foreground">{c.cnpj_cpf}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Data Prevista Entrega</Label>
                  <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Condição de Pagamento</Label>
                  <Select value={condicaoPagamento} onValueChange={setCondicaoPagamento}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {condicoesPagamento.map(c => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={pedidoStatus} onValueChange={setPedidoStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Observações</Label>
                  <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações gerais" />
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Itens do Pedido</h3>
                  <Button onClick={addItem} size="sm" variant="outline" className="gap-1">
                    <Plus className="h-3 w-3" /> Adicionar Item
                  </Button>
                </div>
                {itens.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum item adicionado</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Produto</TableHead>
                          <TableHead className="text-xs text-center w-24">Qtd</TableHead>
                          <TableHead className="text-xs text-right w-32">Preço Unit.</TableHead>
                          <TableHead className="text-xs text-right w-32">Subtotal</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map((item, i) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Popover
                                open={openProdutoSearch[i] || false}
                                onOpenChange={(open) => {
                                  const updated = [...openProdutoSearch];
                                  updated[i] = open;
                                  setOpenProdutoSearch(updated);
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="h-8 text-xs justify-start font-normal w-full">
                                    {item.produtoNome || 'Selecionar produto...'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-0">
                                  <Command shouldFilter={false}>
                                    <CommandInput
                                      placeholder="Buscar produto por nome ou código..."
                                      value={produtoSearchByItem[i] || ''}
                                      onValueChange={(val) => {
                                        const updated = [...produtoSearchByItem];
                                        updated[i] = val;
                                        setProdutoSearchByItem(updated);
                                      }}
                                    />
                                    <CommandList>
                                      <CommandEmpty>Nenhum produto encontrado</CommandEmpty>
                                      <CommandGroup className="max-h-64 overflow-y-auto">
                                        {getProdutosFiltrados(i).map(p => (
                                            <CommandItem
                                              key={p.id}
                                              value={p.nome}
                                              onSelect={() => {
                                                updateItem(i, 'produtoId', p.id);
                                                const updated = [...openProdutoSearch];
                                                updated[i] = false;
                                                setOpenProdutoSearch(updated);
                                                const searchUpdated = [...produtoSearchByItem];
                                                searchUpdated[i] = '';
                                                setProdutoSearchByItem(searchUpdated);
                                              }}
                                            >
                                              <Package className="mr-2 h-4 w-4" />
                                              <span>{p.nome}</span>
                                              <span className="ml-auto text-xs text-muted-foreground">R$ {(p.preco || 0).toFixed(2)}</span>
                                            </CommandItem>
                                          ))
                                        }
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Input type="number" min="1" value={item.quantidade} onChange={(e) => updateItem(i, 'quantidade', parseFloat(e.target.value) || 1)} className="h-8 text-center text-xs" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" min="0" step="0.01" value={item.precoUnitario} onChange={(e) => updateItem(i, 'precoUnitario', parseFloat(e.target.value) || 0)} className="h-8 text-right text-xs" />
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm text-green-600">
                              {formatCurrency(item.subtotal)}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(i)}>
                                <X className="h-3 w-3 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {itens.length > 0 && (
                  <div className="flex justify-end p-3 bg-muted rounded-lg">
                    <span className="text-lg font-bold">Total: <span className="text-green-600">{formatCurrency(totalItens)}</span></span>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingPedido ? 'Salvar Alterações' : 'Criar Pedido'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DETAIL DIALOG */}
        <Dialog open={!!detailPedido} onOpenChange={(open) => { if (!open) setDetailPedido(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pedido #{detailPedido?.numero}</DialogTitle>
            </DialogHeader>
            {detailPedido && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-semibold text-sm mt-1">{detailPedido.clienteNome || '-'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(detailPedido.status)}</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p className="font-semibold text-sm mt-1">{formatDate(detailPedido.criadoEm)}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Entrega</p>
                    <p className="font-semibold text-sm mt-1">{detailPedido.dataEntrega ? formatDate(detailPedido.dataEntrega) : '-'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Pagamento</p>
                    <p className="font-semibold text-sm mt-1">{detailPedido.condicaoPagamento || '-'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="font-semibold text-sm mt-1 text-green-600">{formatCurrency(detailPedido.valorTotal)}</p>
                  </div>
                </div>
                {detailPedido.observacoes && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-sm mt-1">{detailPedido.observacoes}</p>
                  </div>
                )}
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Produto</TableHead>
                        <TableHead className="text-xs text-center">Qtd</TableHead>
                        <TableHead className="text-xs text-right">Preço Unit.</TableHead>
                        <TableHead className="text-xs text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailPedido.itens.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{item.produtoNome}</TableCell>
                          <TableCell className="text-sm text-center font-mono">{item.quantidade}</TableCell>
                          <TableCell className="text-sm text-right font-mono">{formatCurrency(item.precoUnitario)}</TableCell>
                          <TableCell className="text-sm text-right font-semibold">{formatCurrency(item.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
