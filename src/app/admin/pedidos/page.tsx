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
import { ToastAction } from '@/components/ui/toast';
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
import { exportToPDF, formatCurrencyPDF, formatDatePDF, fetchEmpresaPDFData } from '@/lib/export-pdf';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  FileSpreadsheet,
  ArrowRight,
  FileText,
  DollarSign,
  Save,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { PedidosListagemTab } from './PedidosListagemTab';

// ============================================================
// Types
// ============================================================
interface PedidoItem {
  id: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  total: number;
}

interface Pedido {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  subtotal: number;
  desconto: number;
  total: number;
  status: string;
  formaPagamento: string;
  condicaoPagamento: string;
  prazoEntrega: string;
  observacoes: string;
  itens: PedidoItem[];
  vendaId: string;
  dataAprovacao: string;
  criadoEm: string;
  criadoPorNome: string;
}

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-500 text-white border-0', icon: Clock },
  { value: 'aprovado', label: 'Aprovado', color: 'bg-blue-500 text-white border-0', icon: CheckCircle2 },
  { value: 'convertido', label: 'Convertido', color: 'bg-green-500 text-white border-0', icon: ArrowRight },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500 text-white border-0', icon: XCircle },
];

const FORMA_PAGAMENTO_OPTIONS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
];

// ============================================================
// Component
// ============================================================
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

  // Converter dialog
  const [converterDialogOpen, setConverterDialogOpen] = useState(false);
  const [converterPedido, setConverterPedido] = useState<Pedido | null>(null);
  const [converterFormaPagamento, setConverterFormaPagamento] = useState('');

  // Form state
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [openClienteSearch, setOpenClienteSearch] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [observacoes, setObservacoes] = useState('');

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

  const getSupabase = () => getSupabaseClient();

  // ============================================================
  // Data Loading
  // ============================================================
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
        subtotal: parseFloat(p.subtotal) || 0,
        desconto: parseFloat(p.desconto) || 0,
        total: parseFloat(p.total) || 0,
        formaPagamento: p.forma_pagamento || '',
        condicaoPagamento: p.condicao_pagamento || '',
        prazoEntrega: p.prazo_entrega || '',
        vendaId: p.venda_id || '',
        dataAprovacao: p.data_aprovacao || '',
        criadoPorNome: p.criado_por_nome || '',
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

  // ============================================================
  // Condicoes de Pagamento management
  // ============================================================
  const handleAddCondicao = async () => {
    if (!novaCondicao.trim() || !empresaId) return;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('condicoes_pagamento').insert({
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
      await supabase.from('condicoes_pagamento').update({ ativo: false }).eq('id', id);
      loadCondicoes();
      toast({ title: 'Condição inativada' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao inativar condição', description: err.message });
    }
  };

  // ============================================================
  // Filters
  // ============================================================
  const clientesFiltrados = useMemo(() => {
    if (!clienteSearch.trim()) return clientes;
    const term = clienteSearch.toLowerCase();
    return clientes.filter(c =>
      (c.nome_razao_social || '').toLowerCase().includes(term) ||
      (c.nome_fantasia || '').toLowerCase().includes(term) ||
      (c.cnpj_cpf || '').includes(term)
    );
  }, [clientes, clienteSearch]);

  const getProdutosFiltrados = (index: number) => {
    const term = (produtoSearchByItem[index] || '').toLowerCase().trim();
    if (!term) return produtos;
    return produtos.filter(p =>
      (p.nome || '').toLowerCase().includes(term) ||
      (p.codigo_barras || '').includes(term)
    );
  };

  const pedidosFiltrados = pedidos.filter(p => {
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter;
    const matchSearch = !search ||
      (p.clienteNome || '').toLowerCase().includes(search.toLowerCase()) ||
      String(p.numero).includes(search);
    return matchStatus && matchSearch;
  });

  // Stats
  const pedidosPendentes = pedidos.filter(p => p.status === 'pendente');
  const pedidosAprovados = pedidos.filter(p => p.status === 'aprovado');
  const totalPedidosPendentes = pedidosPendentes.reduce((acc, p) => acc + p.total, 0);

  // ============================================================
  // Item management
  // ============================================================
  const addItem = () => {
    const newIndex = itens.length;
    setItens([...itens, {
      id: Date.now().toString(),
      produtoId: '',
      produtoNome: '',
      quantidade: 1,
      precoUnitario: 0,
      desconto: 0,
      total: 0,
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
    // Recalculate total
    const total = (updated[index].precoUnitario * updated[index].quantidade) - (updated[index].desconto || 0);
    updated[index].total = total;
    setItens(updated);
  };

  const removeItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
    setOpenProdutoSearch(prev => prev.filter((_, i) => i !== index));
    setProdutoSearchByItem(prev => prev.filter((_, i) => i !== index));
  };

  const totalItens = itens.reduce((acc, item) => acc + item.total, 0);
  const totalDesconto = itens.reduce((acc, item) => acc + (item.desconto || 0), 0);

  // ============================================================
  // Save
  // ============================================================
  const handleSave = async () => {
    if (!clienteId || !clienteNome) {
      toast({ variant: 'destructive', title: 'Cliente é obrigatório' });
      return;
    }
    if (itens.length === 0) {
      toast({ variant: 'destructive', title: 'Adicione ao menos um item' });
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabase();
      const total = totalItens;
      const subtotal = itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
      const descontoTotal = totalDesconto;

      if (editingPedido) {
        const { error } = await supabase
          .from('pedidos')
          .update({
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            prazo_entrega: prazoEntrega || null,
            condicao_pagamento: condicaoPagamento,
            forma_pagamento: formaPagamento,
            observacoes,
            subtotal,
            desconto: descontoTotal,
            total,
            itens: JSON.stringify(itens),
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
            prazo_entrega: prazoEntrega || null,
            condicao_pagamento: condicaoPagamento,
            forma_pagamento: formaPagamento,
            observacoes,
            status: 'pendente',
            subtotal,
            desconto: descontoTotal,
            total,
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

  // ============================================================
  // Actions
  // ============================================================
  const handleDelete = async (id: string) => {
    try {
      const supabase = getSupabase();

      // Verificar se já foi emitida NF-e para este pedido
      const { data: nfe } = await supabase
        .from('nfe')
        .select('id, status')
        .eq('pedido_id', id)
        .in('status', ['pendente', 'autorizada', 'rejeitada', 'denegada', 'contingencia'])
        .maybeSingle();

      if (nfe) {
        toast({ variant: 'destructive', title: 'Pedido não pode ser excluído', description: 'Já possui NF-e vinculada. Cancele a NF-e antes de excluir o pedido.' });
        return;
      }

      if (!confirm('Deseja realmente excluir este pedido?')) return;
      const { error } = await supabase.from('pedidos').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Pedido excluído' });
      loadPedidos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    }
  };

  const handleAprovar = async (id: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('pedidos')
        .update({
          status: 'aprovado',
          data_aprovacao: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Pedido aprovado!', description: 'O pedido foi aprovado com sucesso.' });
      loadPedidos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao aprovar pedido', description: err.message });
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'cancelado' })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Pedido cancelado!', description: 'O pedido foi cancelado com sucesso.' });
      loadPedidos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao cancelar pedido', description: err.message });
    }
  };

  const handleConverter = async () => {
    if (!converterPedido || !converterFormaPagamento) return;
    setSaving(true);
    try {
      const supabase = getSupabase();

      // Create a venda from the pedido
      const { data: lastVenda } = await supabase
        .from('vendas')
        .select('id')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single();

          const { data: novaVenda, error: vendaError } = await supabase
            .from('vendas')
            .insert({
              empresa_id: empresaId,
              cliente_id: converterPedido.clienteId,
              cliente_nome: converterPedido.clienteNome,
              valor_total: converterPedido.total,
              forma_pagamento: converterFormaPagamento,
              status: 'finalizada',
              observacoes: `Convertido do Pedido #${converterPedido.numero}`,
              criado_por: user?.id,
              criado_por_nome: user?.nome,
            })
        .select('id')
        .single();

      if (vendaError) throw vendaError;

      // Create itens_venda from pedido items
      if (converterPedido.itens && converterPedido.itens.length > 0 && novaVenda) {
        const itensVenda = converterPedido.itens.map(item => ({
          empresa_id: empresaId,
          venda_id: novaVenda.id,
          produto_id: item.produtoId,
          produto_nome: item.produtoNome,
          quantidade: item.quantidade,
          preco_unitario: item.precoUnitario,
          subtotal: item.total,
        }));

        const { error: itensError } = await supabase
          .from('itens_venda')
          .insert(itensVenda);

        if (itensError) console.error('Erro ao criar itens_venda:', itensError);
      }

      // Update pedido status to convertido
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          status: 'convertido',
          venda_id: novaVenda?.id,
        })
        .eq('id', converterPedido.id);

      if (updateError) throw updateError;

      toast({
        title: 'Venda gerada com sucesso!',
        description: `Pedido #${converterPedido.numero} convertido em venda.`,
        action: (
          <ToastAction altText="Emitir NFe" onClick={() => window.open(`/admin/nfe/emitir?pedido_id=${converterPedido.id}`, '_blank')}>
            Emitir NFe
          </ToastAction>
        ),
      });
      setConverterDialogOpen(false);
      setConverterPedido(null);
      setConverterFormaPagamento('');
      loadPedidos();
    } catch (err: any) {
      console.error('Erro ao converter pedido:', err);
      toast({ variant: 'destructive', title: 'Erro ao converter pedido', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Edit
  // ============================================================
  const handleEdit = (pedido: Pedido) => {
    setEditingPedido(pedido);
    setClienteId(pedido.clienteId || '');
    setClienteNome(pedido.clienteNome || '');
    setPrazoEntrega(pedido.prazoEntrega ? pedido.prazoEntrega.split('T')[0] : '');
    setCondicaoPagamento(pedido.condicaoPagamento || '');
    setFormaPagamento(pedido.formaPagamento || '');
    setObservacoes(pedido.observacoes || '');
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
    setPrazoEntrega('');
    setCondicaoPagamento('');
    setFormaPagamento('');
    setObservacoes('');
    setItens([]);
    setOpenProdutoSearch([]);
    setProdutoSearchByItem([]);
  };

  // ============================================================
  // Status badge
  // ============================================================
  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    if (!opt) return <Badge>{status}</Badge>;
    const Icon = opt.icon;
    return (
      <Badge className={`${opt.color} text-xs`}>
        <Icon className="h-3 w-3 mr-1" />
        {opt.label}
      </Badge>
    );
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '-'; } };

  // ============================================================
  // Export PDF
  // ============================================================
  const handleExportPDF = async () => {
    const empresaInfo = await fetchEmpresaPDFData(empresaId);
    const totalValor = pedidosFiltrados.reduce((acc, p) => acc + (p.total || 0), 0);
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
        { header: 'Itens', accessor: (row: any) => (row.itens || []).length, width: 15 },
        { header: 'Data', accessor: (row: any) => formatDatePDF(row.criadoEm), width: 30 },
        { header: 'Valor Total', accessor: (row: any) => formatCurrencyPDF(row.total), width: 35 },
        { header: 'Status', accessor: (row: any) => statusLabel(row.status), width: 25 },
      ],
      data: pedidosFiltrados,
      filename: 'pedidos',
      orientation: 'landscape',
      totals: {
        label: 'TOTAL',
        columnTotals: { 4: formatCurrencyPDF(totalValor) },
      },
      summary: [
        { label: 'Total de Pedidos', value: pedidosFiltrados.length },
        { label: 'Valor Total', value: formatCurrencyPDF(totalValor) },
        { label: 'Pendentes', value: pedidosPendentes.length },
        { label: 'Aprovados', value: pedidosAprovados.length },
      ],
      ...empresaInfo,
    });
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Pedidos' }]}>
        <Tabs defaultValue="pedidos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pedidos" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="listagem" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Listagem
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pedidos" className="space-y-6">
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
                  Orçamentos e pré-vendas (ERP)
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Novo Pedido
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                    <p className="text-2xl font-bold">{pedidos.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold">{pedidosPendentes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aprovados</p>
                    <p className="text-2xl font-bold">{pedidosAprovados.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Pendente</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalPedidosPendentes)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                    <Button size="sm" onClick={handleAddCondicao} disabled={!novaCondicao.trim()} className="bg-blue-600 hover:bg-blue-700">
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
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lista de Pedidos</CardTitle>
              <CardDescription>{pedidosFiltrados.length} pedido(s) encontrado(s)</CardDescription>
            </CardHeader>
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
                        <TableHead className="text-center">Itens</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidosFiltrados.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono font-semibold">#{p.numero}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{p.clienteNome || '-'}</p>
                              <p className="text-xs text-muted-foreground">{p.condicaoPagamento}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{(p.itens || []).length}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">{formatCurrency(p.total)}</TableCell>
                          <TableCell className="text-sm">{formatDate(p.criadoEm)}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(p.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailPedido(p)} title="Ver detalhes">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {p.status === 'pendente' && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleAprovar(p.id)} title="Aprovar">
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Link href={`/admin/nfe/emitir?pedido_id=${p.id}`}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600" title="Emitir NF-e">
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleCancelar(p.id)} title="Cancelar">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)} title="Editar">
                                    <Edit className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(p.id)} title="Excluir">
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                              {p.status === 'aprovado' && (
                                <>
                                  <Link href={`/admin/nfe/emitir?pedido_id=${p.id}`}>
                                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-purple-600 hover:text-purple-700" title="Emitir NF-e">
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1 text-green-600 hover:text-green-700"
                                    onClick={() => { setConverterPedido(p); setConverterFormaPagamento(''); setConverterDialogOpen(true); }}
                                    title="Converter em Venda"
                                  >
                                    <FileText className="h-4 w-4" />
                                    <ArrowRight className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)} title="Editar">
                                    <Edit className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(p.id)} title="Excluir">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {(p.status === 'convertido' || p.status === 'cancelado') && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(p.id)} title="Excluir">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
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

          <TabsContent value="listagem" className="space-y-6">
            <PedidosListagemTab />
          </TabsContent>
        </Tabs>

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
                  <Label>Prazo de Entrega</Label>
                  <Input type="date" value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} />
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
                  <Label>Forma de Pagamento</Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {FORMA_PAGAMENTO_OPTIONS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Observações</Label>
                  <textarea
                    className="w-full min-h-[60px] p-3 border rounded-lg resize-none text-sm"
                    placeholder="Observações do pedido..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
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
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum item adicionado</p>
                    <p className="text-sm">Clique em &quot;Adicionar Item&quot; para começar</p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs">Produto</TableHead>
                          <TableHead className="text-xs text-center w-24">Qtd</TableHead>
                          <TableHead className="text-xs text-right w-32">Preço Unit.</TableHead>
                          <TableHead className="text-xs text-right w-28">Desconto</TableHead>
                          <TableHead className="text-xs text-right w-32">Total</TableHead>
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
                                      placeholder="Buscar produto por nome..."
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
                                        ))}
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
                            <TableCell>
                              <Input type="number" min="0" step="0.01" value={item.desconto || 0} onChange={(e) => updateItem(i, 'desconto', parseFloat(e.target.value) || 0)} className="h-8 text-right text-xs" />
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm text-green-600">
                              {formatCurrency(item.total)}
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
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(totalItens + totalDesconto)}</span>
                      </div>
                      {totalDesconto > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Desconto:</span>
                          <span>- {formatCurrency(totalDesconto)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-green-600">{formatCurrency(totalItens)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
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
              <DialogDescription>Detalhes do pedido</DialogDescription>
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
                    <p className="font-semibold text-sm mt-1">{detailPedido.prazoEntrega ? formatDate(detailPedido.prazoEntrega) : '-'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Condição Pagamento</p>
                    <p className="font-semibold text-sm mt-1">{detailPedido.condicaoPagamento || '-'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Forma Pagamento</p>
                    <p className="font-semibold text-sm mt-1">
                      {FORMA_PAGAMENTO_OPTIONS.find(f => f.value === detailPedido.formaPagamento)?.label || detailPedido.formaPagamento || '-'}
                    </p>
                  </div>
                </div>
                {detailPedido.observacoes && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-sm mt-1">{detailPedido.observacoes}</p>
                  </div>
                )}
                {detailPedido.itens && detailPedido.itens.length > 0 && (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Produto</TableHead>
                          <TableHead className="text-xs text-center">Qtd</TableHead>
                          <TableHead className="text-xs text-right">Preço Unit.</TableHead>
                          {detailPedido.itens.some(item => item.desconto > 0) && (
                            <TableHead className="text-xs text-right">Desconto</TableHead>
                          )}
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailPedido.itens.map((item, idx) => (
                          <TableRow key={item.id || idx}>
                            <TableCell className="text-sm">{item.produtoNome}</TableCell>
                            <TableCell className="text-sm text-center font-mono">{item.quantidade}</TableCell>
                            <TableCell className="text-sm text-right font-mono">{formatCurrency(item.precoUnitario)}</TableCell>
                            {detailPedido.itens.some(i => i.desconto > 0) && (
                              <TableCell className="text-sm text-right font-mono text-red-600">{item.desconto > 0 ? formatCurrency(item.desconto) : '-'}</TableCell>
                            )}
                            <TableCell className="text-sm text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">Total do Pedido:</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(detailPedido.total)}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* CONVERTER DIALOG */}
        <Dialog open={converterDialogOpen} onOpenChange={(open) => { if (!open) { setConverterDialogOpen(false); setConverterPedido(null); } }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Converter em Venda</DialogTitle>
              <DialogDescription>Revise os dados e confirme para gerar uma venda a partir deste pedido</DialogDescription>
            </DialogHeader>
            {converterPedido && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Revise os dados antes de converter</p>
                      <p className="text-sm text-blue-700">Uma venda será criada e o pedido será marcado como convertido.</p>
                    </div>
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Dados do Pedido #{converterPedido.numero}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Cliente</Label>
                        <p className="font-medium">{converterPedido.clienteNome || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Condição</Label>
                        <p className="font-medium">{converterPedido.condicaoPagamento || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Itens do Pedido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Preço Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {converterPedido.itens.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm font-medium">{item.produtoNome}</TableCell>
                            <TableCell className="text-right">{item.quantidade}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.precoUnitario)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <span className="font-semibold">Total:</span>
                      <span className="text-xl font-bold text-green-600">{formatCurrency(converterPedido.total)}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label>Forma de Pagamento <span className="text-red-500">*</span></Label>
                  <Select value={converterFormaPagamento} onValueChange={setConverterFormaPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMA_PAGAMENTO_OPTIONS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConverterDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleConverter}
                disabled={saving || !converterFormaPagamento}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" />Converter em Venda</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
