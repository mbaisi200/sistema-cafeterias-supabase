'use client';

import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';
import {
  Plus,
  ChevronLeft,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Package,
  Truck,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  X,
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
  fornecedorId: string;
  fornecedorNome: string;
  cliente: string;
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
  const [fornecedorId, setFornecedorId] = useState('');
  const [cliente, setCliente] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [pedidoStatus, setPedidoStatus] = useState('rascunho');

  // Items state
  const [itens, setItens] = useState<PedidoItem[]>([]);

  // Data lists
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);

  // Load data
  useEffect(() => {
    if (empresaId) {
      loadPedidos();
      loadFornecedores();
      loadProdutos();
    }
  }, [empresaId]);

  const getSupabase = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, key);
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
        fornecedorId: p.fornecedor_id || '',
        fornecedorNome: p.fornecedor_nome || '',
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

  const loadFornecedores = async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      setFornecedores(data || []);
    } catch { /* ignore */ }
  };

  const loadProdutos = async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('produtos')
        .select('id, nome, preco, custo, unidade')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      setProdutos(data || []);
    } catch { /* ignore */ }
  };

  // Item management
  const addItem = () => {
    setItens([...itens, {
      id: Date.now().toString(),
      produtoId: '',
      produtoNome: '',
      quantidade: 1,
      precoUnitario: 0,
      subtotal: 0,
    }]);
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
  };

  const totalItens = itens.reduce((acc, item) => acc + item.subtotal, 0);

  // Save
  const handleSave = async () => {
    if (itens.length === 0) {
      toast({ variant: 'destructive', title: 'Adicione ao menos um item' });
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabase();
      const fornecedor = fornecedores.find(f => f.id === fornecedorId);

      if (editingPedido) {
        const { error } = await supabase
          .from('pedidos')
          .update({
            fornecedor_id: fornecedorId || null,
            fornecedor_nome: fornecedor?.nome || '',
            cliente,
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
            fornecedor_id: fornecedorId || null,
            fornecedor_nome: fornecedor?.nome || '',
            cliente,
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
  const handleEdit = (pedido: Pedido) => {
    setEditingPedido(pedido);
    setFornecedorId(pedido.fornecedorId);
    setCliente(pedido.cliente || '');
    setDataEntrega(pedido.dataEntrega ? pedido.dataEntrega.split('T')[0] : '');
    setCondicaoPagamento(pedido.condicaoPagamento || '');
    setObservacoes(pedido.observacoes || '');
    setPedidoStatus(pedido.status);
    setItens(pedido.itens || []);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPedido(null);
    setFornecedorId('');
    setCliente('');
    setDataEntrega('');
    setCondicaoPagamento('');
    setObservacoes('');
    setPedidoStatus('rascunho');
    setItens([]);
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    if (!opt) return null;
    return <Badge className={`${opt.color} text-xs border-0`}>{opt.label}</Badge>;
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '-'; } };

  // Filter
  const pedidosFiltrados = pedidos.filter(p => {
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter;
    const matchSearch = !search ||
      (p.fornecedorNome || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.cliente || '').toLowerCase().includes(search.toLowerCase()) ||
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
              <Link href="/admin">
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
                  Gerencie pedidos de compra e venda
                </p>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="relative flex-1 w-full md:max-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar pedido..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                        <TableHead>Fornecedor</TableHead>
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
                          <TableCell>{p.fornecedorNome || '-'}</TableCell>
                          <TableCell>{p.cliente || '-'}</TableCell>
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
                  <Label>Fornecedor</Label>
                  <Select value={fornecedorId} onValueChange={setFornecedorId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {fornecedores.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente (opcional)" />
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
                      <SelectItem value="a_vista">À Vista</SelectItem>
                      <SelectItem value="30_dias">30 Dias</SelectItem>
                      <SelectItem value="30_60">30/60 Dias</SelectItem>
                      <SelectItem value="30_60_90">30/60/90 Dias</SelectItem>
                      <SelectItem value="entrada_30">Entrada + 30 Dias</SelectItem>
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
                <div className="space-y-2">
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
                              <Select value={item.produtoId} onValueChange={(v) => updateItem(i, 'produtoId', v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  {produtos.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.nome} (R$ {(p.custo || p.preco || 0).toFixed(2)})</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                    <p className="text-xs text-muted-foreground">Fornecedor</p>
                    <p className="font-semibold text-sm mt-1">{detailPedido.fornecedorNome || '-'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-semibold text-sm mt-1">{detailPedido.cliente || '-'}</p>
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
                    <p className="font-semibold text-sm mt-1">{detailPedido.condicaoPagamento?.replace(/_/g, ' ') || '-'}</p>
                  </div>
                </div>
                {detailPedido.observacoes && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-sm mt-1">{detailPedido.observacoes}</p>
                  </div>
                )}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between items-center">
                  <p className="text-sm font-medium text-green-700">Valor Total</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(detailPedido.valorTotal)}</p>
                </div>
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
