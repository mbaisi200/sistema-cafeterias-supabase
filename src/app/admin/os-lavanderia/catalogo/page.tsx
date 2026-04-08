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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase';
import {
  Plus,
  ChevronLeft,
  Search,
  Edit,
  Trash2,
  Loader2,
  WashingMachine,
  Shirt,
  Sparkles,
  PackageSearch,
  CheckCircle2,
  XCircle,
  Tag,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================
interface ItemCatalogo {
  id: string;
  descricao: string;
  categoria: string;
  ativo: boolean;
  criado_em: string;
}

interface ServicoCatalogo {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  ativo: boolean;
  criado_em: string;
}

const CATEGORIAS = [
  { value: 'Roupas', label: 'Roupas' },
  { value: 'Cama/Banho', label: 'Cama/Banho' },
  { value: 'Tapetes', label: 'Tapetes' },
  { value: 'Cortinas', label: 'Cortinas' },
  { value: 'Couro', label: 'Couro' },
  { value: 'Outros', label: 'Outros' },
];

const CATEGORIA_ICONS: Record<string, string> = {
  'Roupas': 'bg-sky-100 text-sky-700',
  'Cama/Banho': 'bg-violet-100 text-violet-700',
  'Tapetes': 'bg-amber-100 text-amber-700',
  'Cortinas': 'bg-emerald-100 text-emerald-700',
  'Couro': 'bg-orange-100 text-orange-700',
  'Outros': 'bg-gray-100 text-gray-700',
};

// ============================================================
// Component
// ============================================================
export default function CatalogoLavanderiaPage() {
  const { empresaId } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('itens');

  // --- Itens do Catálogo ---
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [itensLoading, setItensLoading] = useState(true);
  const [itensSearch, setItensSearch] = useState('');

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemCatalogo | null>(null);
  const [itemSaving, setItemSaving] = useState(false);

  // Form fields - Itens
  const [itemDescricao, setItemDescricao] = useState('');
  const [itemCategoria, setItemCategoria] = useState('');
  const [itemAtivo, setItemAtivo] = useState(true);

  // --- Serviços e Preços ---
  const [servicos, setServicos] = useState<ServicoCatalogo[]>([]);
  const [servicosLoading, setServicosLoading] = useState(true);
  const [servicosSearch, setServicosSearch] = useState('');

  const [servicoDialogOpen, setServicoDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<ServicoCatalogo | null>(null);
  const [servicoSaving, setServicoSaving] = useState(false);

  // Form fields - Serviços
  const [servicoNome, setServicoNome] = useState('');
  const [servicoDescricao, setServicoDescricao] = useState('');
  const [servicoPreco, setServicoPreco] = useState('');
  const [servicoAtivo, setServicoAtivo] = useState(true);

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'item' | 'servico';
    id: string;
    nome: string;
  }>({ open: false, type: 'item', id: '', nome: '' });

  const getSupabase = () => getSupabaseClient();

  // ============================================================
  // Data Loading
  // ============================================================
  useEffect(() => {
    if (empresaId) {
      loadItens();
      loadServicos();
    }
  }, [empresaId]);

  const loadItens = async () => {
    setItensLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('lavanderia_itens_catalogo')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setItens((data || []).map((row: any) => ({
        id: row.id,
        descricao: row.descricao || '',
        categoria: row.categoria || '',
        ativo: row.ativo ?? true,
        criado_em: row.criado_em || '',
      })));
    } catch (err: any) {
      console.error('Erro ao carregar itens do catálogo:', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar itens', description: err.message });
    } finally {
      setItensLoading(false);
    }
  };

  const loadServicos = async () => {
    setServicosLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('lavanderia_servicos_catalogo')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setServicos((data || []).map((row: any) => ({
        id: row.id,
        nome: row.nome || '',
        descricao: row.descricao || null,
        preco: parseFloat(row.preco) || 0,
        ativo: row.ativo ?? true,
        criado_em: row.criado_em || '',
      })));
    } catch (err: any) {
      console.error('Erro ao carregar serviços do catálogo:', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar serviços', description: err.message });
    } finally {
      setServicosLoading(false);
    }
  };

  // ============================================================
  // Filters
  // ============================================================
  const itensFiltrados = useMemo(() => {
    if (!itensSearch.trim()) return itens;
    const term = itensSearch.toLowerCase();
    return itens.filter(item =>
      item.descricao.toLowerCase().includes(term) ||
      item.categoria.toLowerCase().includes(term)
    );
  }, [itens, itensSearch]);

  const servicosFiltrados = useMemo(() => {
    if (!servicosSearch.trim()) return servicos;
    const term = servicosSearch.toLowerCase();
    return servicos.filter(servico =>
      servico.nome.toLowerCase().includes(term) ||
      (servico.descricao || '').toLowerCase().includes(term)
    );
  }, [servicos, servicosSearch]);

  const totalItens = itens.length;
  const totalItensAtivos = itens.filter(i => i.ativo).length;
  const totalServicos = servicos.length;
  const totalServicosAtivos = servicos.filter(s => s.ativo).length;

  // ============================================================
  // Itens CRUD
  // ============================================================
  const openNewItemDialog = () => {
    setEditingItem(null);
    setItemDescricao('');
    setItemCategoria('');
    setItemAtivo(true);
    setItemDialogOpen(true);
  };

  const openEditItemDialog = (item: ItemCatalogo) => {
    setEditingItem(item);
    setItemDescricao(item.descricao);
    setItemCategoria(item.categoria);
    setItemAtivo(item.ativo);
    setItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemDescricao.trim()) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Informe a descrição do item.' });
      return;
    }
    if (!itemCategoria) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Selecione a categoria.' });
      return;
    }

    setItemSaving(true);
    try {
      const supabase = getSupabase();

      if (editingItem) {
        const { error } = await supabase
          .from('lavanderia_itens_catalogo')
          .update({
            descricao: itemDescricao.trim(),
            categoria: itemCategoria,
            ativo: itemAtivo,
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: 'Item atualizado!', description: `"${itemDescricao.trim()}" foi atualizado com sucesso.` });
      } else {
        const { error } = await supabase
          .from('lavanderia_itens_catalogo')
          .insert({
            empresa_id: empresaId,
            descricao: itemDescricao.trim(),
            categoria: itemCategoria,
            ativo: itemAtivo,
          });
        if (error) throw error;
        toast({ title: 'Item criado!', description: `"${itemDescricao.trim()}" foi adicionado ao catálogo.` });
      }

      setItemDialogOpen(false);
      loadItens();
    } catch (err: any) {
      console.error('Erro ao salvar item:', err);
      toast({ variant: 'destructive', title: 'Erro ao salvar item', description: err.message });
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('lavanderia_itens_catalogo')
        .delete()
        .eq('id', deleteDialog.id);
      if (error) throw error;
      toast({ title: 'Item excluído!', description: `"${deleteDialog.nome}" foi removido do catálogo.` });
      setDeleteDialog({ open: false, type: 'item', id: '', nome: '' });
      loadItens();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir item', description: err.message });
    }
  };

  // ============================================================
  // Serviços CRUD
  // ============================================================
  const openNewServicoDialog = () => {
    setEditingServico(null);
    setServicoNome('');
    setServicoDescricao('');
    setServicoPreco('');
    setServicoAtivo(true);
    setServicoDialogOpen(true);
  };

  const openEditServicoDialog = (servico: ServicoCatalogo) => {
    setEditingServico(servico);
    setServicoNome(servico.nome);
    setServicoDescricao(servico.descricao || '');
    setServicoPreco(servico.preco > 0 ? String(servico.preco) : '');
    setServicoAtivo(servico.ativo);
    setServicoDialogOpen(true);
  };

  const handleSaveServico = async () => {
    if (!servicoNome.trim()) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Informe o nome do serviço.' });
      return;
    }

    const precoNum = parseFloat(servicoPreco.replace(',', '.'));
    if (isNaN(precoNum) || precoNum < 0) {
      toast({ variant: 'destructive', title: 'Valor inválido', description: 'Informe um preço válido.' });
      return;
    }

    setServicoSaving(true);
    try {
      const supabase = getSupabase();

      if (editingServico) {
        const { error } = await supabase
          .from('lavanderia_servicos_catalogo')
          .update({
            nome: servicoNome.trim(),
            descricao: servicoDescricao.trim() || null,
            preco: precoNum,
            ativo: servicoAtivo,
          })
          .eq('id', editingServico.id);
        if (error) throw error;
        toast({ title: 'Serviço atualizado!', description: `"${servicoNome.trim()}" foi atualizado com sucesso.` });
      } else {
        const { error } = await supabase
          .from('lavanderia_servicos_catalogo')
          .insert({
            empresa_id: empresaId,
            nome: servicoNome.trim(),
            descricao: servicoDescricao.trim() || null,
            preco: precoNum,
            ativo: servicoAtivo,
          });
        if (error) throw error;
        toast({ title: 'Serviço criado!', description: `"${servicoNome.trim()}" foi adicionado ao catálogo.` });
      }

      setServicoDialogOpen(false);
      loadServicos();
    } catch (err: any) {
      console.error('Erro ao salvar serviço:', err);
      toast({ variant: 'destructive', title: 'Erro ao salvar serviço', description: err.message });
    } finally {
      setServicoSaving(false);
    }
  };

  const handleDeleteServico = async () => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('lavanderia_servicos_catalogo')
        .delete()
        .eq('id', deleteDialog.id);
      if (error) throw error;
      toast({ title: 'Serviço excluído!', description: `"${deleteDialog.nome}" foi removido do catálogo.` });
      setDeleteDialog({ open: false, type: 'servico', id: '', nome: '' });
      loadServicos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir serviço', description: err.message });
    }
  };

  // ============================================================
  // Helpers
  // ============================================================
  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '-'; }
  };

  const getCategoriaBadge = (categoria: string) => {
    const classes = CATEGORIA_ICONS[categoria] || 'bg-gray-100 text-gray-700';
    return (
      <Badge variant="secondary" className={`text-xs font-medium ${classes}`}>
        {categoria}
      </Badge>
    );
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'OS Lavanderia' }, { title: 'Catálogo' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/os-lavanderia">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center">
                    <WashingMachine className="h-6 w-6 text-sky-600" />
                  </div>
                  Catálogo da Lavanderia
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie itens de peças e tipos de serviços disponíveis
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-sky-100 flex items-center justify-center">
                    <Shirt className="h-6 w-6 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Itens no Catálogo</p>
                    <p className="text-2xl font-bold">{totalItens}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Itens Ativos</p>
                    <p className="text-2xl font-bold">{totalItensAtivos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Serviços Cadastrados</p>
                    <p className="text-2xl font-bold">{totalServicos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Serviços Ativos</p>
                    <p className="text-2xl font-bold">{totalServicosAtivos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="itens" className="gap-2">
                <Shirt className="h-4 w-4" />
                Itens do Catálogo
              </TabsTrigger>
              <TabsTrigger value="servicos" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Serviços e Preços
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* TAB 1: Itens do Catálogo */}
            {/* ============================================================ */}
            <TabsContent value="itens" className="space-y-4">
              {/* Search + Create */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="relative flex-1 w-full md:max-w-[400px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por descrição ou categoria..."
                        value={itensSearch}
                        onChange={(e) => setItensSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={openNewItemDialog} className="gap-2 bg-sky-600 hover:bg-sky-700">
                      <Plus className="h-4 w-4" />
                      Novo Item
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shirt className="h-5 w-5 text-sky-600" />
                    Itens do Catálogo
                  </CardTitle>
                  <CardDescription>
                    {itensFiltrados.length} item(ns) encontrado(s)
                    {itensSearch && ` para "${itensSearch}"`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {itensLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : itensFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <PackageSearch className="h-12 w-12 mb-4 opacity-30" />
                      <p className="text-lg font-medium">Nenhum item encontrado</p>
                      <p className="text-sm">
                        {itensSearch
                          ? 'Tente alterar os termos da busca'
                          : 'Clique em "Novo Item" para adicionar ao catálogo'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="hidden md:table-cell">Criado em</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itensFiltrados.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <p className="font-medium">{item.descricao}</p>
                                <p className="text-xs text-muted-foreground sm:hidden">{item.categoria}</p>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {getCategoriaBadge(item.categoria)}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.ativo ? (
                                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inativo
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                {formatDate(item.criado_em)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditItemDialog(item)}
                                    title="Editar item"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() =>
                                      setDeleteDialog({
                                        open: true,
                                        type: 'item',
                                        id: item.id,
                                        nome: item.descricao,
                                      })
                                    }
                                    title="Excluir item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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

            {/* ============================================================ */}
            {/* TAB 2: Serviços e Preços */}
            {/* ============================================================ */}
            <TabsContent value="servicos" className="space-y-4">
              {/* Search + Create */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="relative flex-1 w-full md:max-w-[400px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome do serviço..."
                        value={servicosSearch}
                        onChange={(e) => setServicosSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={openNewServicoDialog} className="gap-2 bg-sky-600 hover:bg-sky-700">
                      <Plus className="h-4 w-4" />
                      Novo Serviço
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-sky-600" />
                    Serviços e Preços
                  </CardTitle>
                  <CardDescription>
                    {servicosFiltrados.length} serviço(s) encontrado(s)
                    {servicosSearch && ` para "${servicosSearch}"`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {servicosLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : servicosFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <PackageSearch className="h-12 w-12 mb-4 opacity-30" />
                      <p className="text-lg font-medium">Nenhum serviço encontrado</p>
                      <p className="text-sm">
                        {servicosSearch
                          ? 'Tente alterar os termos da busca'
                          : 'Clique em "Novo Serviço" para adicionar ao catálogo'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                            <TableHead className="text-right">Preço</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="hidden md:table-cell">Criado em</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {servicosFiltrados.map((servico) => (
                            <TableRow key={servico.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4 text-muted-foreground hidden sm:block" />
                                  <p className="font-medium">{servico.nome}</p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[250px] truncate">
                                {servico.descricao || <span className="italic">-</span>}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                {servico.preco > 0
                                  ? formatCurrency(servico.preco)
                                  : <span className="text-muted-foreground font-normal">-</span>
                                }
                              </TableCell>
                              <TableCell className="text-center">
                                {servico.ativo ? (
                                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inativo
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                {formatDate(servico.criado_em)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditServicoDialog(servico)}
                                    title="Editar serviço"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() =>
                                      setDeleteDialog({
                                        open: true,
                                        type: 'servico',
                                        id: servico.id,
                                        nome: servico.nome,
                                      })
                                    }
                                    title="Excluir serviço"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
        </div>

        {/* ============================================================ */}
        {/* ITEM CREATE/EDIT DIALOG */}
        {/* ============================================================ */}
        <Dialog
          open={itemDialogOpen}
          onOpenChange={(open) => {
            setItemDialogOpen(open);
            if (!open) {
              setEditingItem(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shirt className="h-5 w-5 text-sky-600" />
                {editingItem ? 'Editar Item do Catálogo' : 'Novo Item do Catálogo'}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Altere os dados do item abaixo.'
                  : 'Preencha os dados para adicionar um novo item ao catálogo de peças.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="item-descricao">Descrição *</Label>
                <Input
                  id="item-descricao"
                  placeholder="Ex: Camisa social branca, Edredom queen..."
                  value={itemDescricao}
                  onChange={(e) => setItemDescricao(e.target.value)}
                  maxLength={200}
                />
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="item-categoria">Categoria *</Label>
                <Select value={itemCategoria} onValueChange={setItemCategoria}>
                  <SelectTrigger id="item-categoria">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ativo */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Item ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Itens inativos não aparecem como opção nas OS
                  </p>
                </div>
                <Switch checked={itemAtivo} onCheckedChange={setItemAtivo} />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setItemDialogOpen(false)}
                disabled={itemSaving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveItem}
                disabled={itemSaving}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {itemSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingItem ? (
                  'Atualizar Item'
                ) : (
                  'Criar Item'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* SERVIÇO CREATE/EDIT DIALOG */}
        {/* ============================================================ */}
        <Dialog
          open={servicoDialogOpen}
          onOpenChange={(open) => {
            setServicoDialogOpen(open);
            if (!open) {
              setEditingServico(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sky-600" />
                {editingServico ? 'Editar Serviço' : 'Novo Serviço'}
              </DialogTitle>
              <DialogDescription>
                {editingServico
                  ? 'Altere os dados do serviço abaixo.'
                  : 'Preencha os dados para cadastrar um novo tipo de serviço.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="servico-nome">Nome do Serviço *</Label>
                <Input
                  id="servico-nome"
                  placeholder="Ex: Lavar e Passar, Lavagem a Seco..."
                  value={servicoNome}
                  onChange={(e) => setServicoNome(e.target.value)}
                  maxLength={150}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="servico-descricao">Descrição</Label>
                <Input
                  id="servico-descricao"
                  placeholder="Descrição opcional do serviço (ex: para peças delicadas)"
                  value={servicoDescricao}
                  onChange={(e) => setServicoDescricao(e.target.value)}
                  maxLength={300}
                />
              </div>

              {/* Preço */}
              <div className="space-y-2">
                <Label htmlFor="servico-preco">Preço (R$) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    id="servico-preco"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={servicoPreco}
                    onChange={(e) => setServicoPreco(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Ativo */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Serviço ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Serviços inativos não aparecem como opção nas OS
                  </p>
                </div>
                <Switch checked={servicoAtivo} onCheckedChange={setServicoAtivo} />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setServicoDialogOpen(false)}
                disabled={servicoSaving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveServico}
                disabled={servicoSaving}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {servicoSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingServico ? (
                  'Atualizar Serviço'
                ) : (
                  'Criar Serviço'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* DELETE CONFIRMATION DIALOG */}
        {/* ============================================================ */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, type: 'item', id: '', nome: '' });
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir permanentemente{' '}
                <strong className="text-foreground">
                  &quot;{deleteDialog.nome}&quot;
                </strong>
                ?
                <br />
                Esta ação não pode ser desfeita. O registro será removido definitivamente do banco de dados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteDialog.type === 'item') {
                    handleDeleteItem();
                  } else {
                    handleDeleteServico();
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Sim, Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
