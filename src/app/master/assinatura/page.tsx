'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { getSupabaseClient } from '@/lib/supabase';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, CreditCard, ArrowUpDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  recursos: Record<string, any>;
  destaque: boolean;
  ordem: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  empresas_count?: number;
}

const emptyForm = {
  nome: '',
  descricao: '',
  preco: '',
  stripe_price_id: '',
  stripe_product_id: '',
  destaque: false,
  ordem: '0',
  ativo: true,
};

export default function AssinaturaPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sortBy, setSortBy] = useState('ordem');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();

  const fetchPlanos = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;

      const { data: empresas } = await supabase
        .from('empresas')
        .select('plano_id');

      const countMap: Record<string, number> = {};
      empresas?.forEach((emp: { plano_id: string | null }) => {
        if (emp.plano_id) {
          countMap[emp.plano_id] = (countMap[emp.plano_id] || 0) + 1;
        }
      });

      const enriched = (data || []).map((p: Plano) => ({
        ...p,
        empresas_count: countMap[p.id] || 0,
      }));

      setPlanos(enriched);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar planos',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchPlanos(); }, [fetchPlanos]);

  const filteredPlanos = useMemo(() =>
    planos.filter(p => p.nome.toLowerCase().includes(search.toLowerCase())),
    [planos, search]
  );

  const sortedPlanos = useMemo(() => {
    return [...filteredPlanos].sort((a, b) => {
      let aVal: any = a[sortBy as keyof Plano];
      let bVal: any = b[sortBy as keyof Plano];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (sortBy === 'preco') { aVal = Number(aVal); bVal = Number(bVal); }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPlanos, sortBy, sortDir]);

  const handleSort = (column: string) => {
    if (sortBy === column) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortDir('asc'); }
  };

  const SortHeader = ({ column, children, className }: { column: string; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort(column)}>
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortBy === column ? 'text-blue-600' : 'text-muted-foreground/50'}`} />
      </button>
    </TableHead>
  );

  const openCreate = () => {
    setEditingPlano(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (plano: Plano) => {
    setEditingPlano(plano);
    setForm({
      nome: plano.nome,
      descricao: plano.descricao || '',
      preco: String(plano.preco),
      stripe_price_id: plano.stripe_price_id || '',
      stripe_product_id: plano.stripe_product_id || '',
      destaque: plano.destaque,
      ordem: String(plano.ordem),
      ativo: plano.ativo,
    });
    setDialogOpen(true);
  };

  const openDelete = (plano: Plano) => {
    setSelectedPlano(plano);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.preco) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Nome e Preço são obrigatórios.' });
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseClient();

      if (editingPlano) {
        const { error } = await supabase.from('planos').update({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          preco: parseFloat(form.preco),
          stripe_price_id: form.stripe_price_id.trim() || null,
          stripe_product_id: form.stripe_product_id.trim() || null,
          destaque: form.destaque,
          ordem: parseInt(form.ordem) || 0,
          ativo: form.ativo,
          atualizado_em: new Date().toISOString(),
        }).eq('id', editingPlano.id);
        if (error) throw error;
        toast({ title: 'Plano atualizado!', description: `"${form.nome}" foi atualizado.` });
      } else {
        const { error } = await supabase.from('planos').insert({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          preco: parseFloat(form.preco),
          stripe_price_id: form.stripe_price_id.trim() || null,
          stripe_product_id: form.stripe_product_id.trim() || null,
          destaque: form.destaque,
          ordem: parseInt(form.ordem) || 0,
          ativo: true,
        });
        if (error) throw error;
        toast({ title: 'Plano criado!', description: `"${form.nome}" foi criado.` });
      }

      setDialogOpen(false);
      fetchPlanos();
    } catch (error: unknown) {
      toast({
        variant: 'destructive', title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (plano: Plano) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('planos').update({
        ativo: !plano.ativo,
        atualizado_em: new Date().toISOString(),
      }).eq('id', plano.id);
      if (error) throw error;
      toast({ title: plano.ativo ? 'Plano desativado' : 'Plano ativado' });
      fetchPlanos();
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  };

  const handleDelete = async () => {
    if (!selectedPlano) return;
    setDeleting(true);
    try {
      const supabase = getSupabaseClient();

      const { count } = await supabase.from('empresas')
        .select('*', { count: 'exact', head: true })
        .eq('plano_id', selectedPlano.id);

      if (count && count > 0) {
        await supabase.from('planos').update({ ativo: false }).eq('id', selectedPlano.id);
        toast({ title: 'Plano inativado!', description: `"${selectedPlano.nome}" foi inativado (${count} empresa(s) vinculada(s)).` });
      } else {
        await supabase.from('planos').delete().eq('id', selectedPlano.id);
        toast({ title: 'Plano excluído!', description: `"${selectedPlano.nome}" foi excluído permanentemente.` });
      }

      setDeleteDialogOpen(false);
      setSelectedPlano(null);
      fetchPlanos();
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['master']}>
        <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Assinatura' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['master']}>
      <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Planos de Assinatura' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Planos de Assinatura</h1>
              <p className="text-muted-foreground">Gerencie os planos disponíveis para assinatura via Stripe</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) { setEditingPlano(null); setForm(emptyForm); }
            }}>
              <DialogTrigger asChild>
                <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Plano
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingPlano ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
                  <DialogDescription>
                    {editingPlano ? 'Atualize os dados do plano abaixo.' : 'Preencha os dados para criar um novo plano.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input id="nome" placeholder="Ex: Básico" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea id="descricao" placeholder="Descrição do plano..." value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="preco">Preço (R$) *</Label>
                      <Input id="preco" type="number" step="0.01" placeholder="99.90" value={form.preco} onChange={e => setForm({ ...form, preco: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ordem">Ordem</Label>
                      <Input id="ordem" type="number" placeholder="0" value={form.ordem} onChange={e => setForm({ ...form, ordem: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stripe_price_id">Stripe Price ID</Label>
                    <Input id="stripe_price_id" placeholder="price_xxxxxxxxxxxxx" value={form.stripe_price_id} onChange={e => setForm({ ...form, stripe_price_id: e.target.value })} />
                    <p className="text-xs text-muted-foreground">ID do preço no Stripe (criado no Dashboard do Stripe)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.destaque} onCheckedChange={c => setForm({ ...form, destaque: c })} />
                    <Label>{form.destaque ? 'Destaque' : 'Plano normal'}</Label>
                  </div>
                  {editingPlano && (
                    <div className="flex items-center gap-3">
                      <Switch checked={form.ativo} onCheckedChange={c => setForm({ ...form, ativo: c })} />
                      <Label>{form.ativo ? 'Ativo' : 'Inativo'}</Label>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingPlano(null); setForm(emptyForm); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingPlano ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar planos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {filteredPlanos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum plano encontrado</p>
                <p className="text-sm text-muted-foreground">Clique em &quot;Novo Plano&quot; para adicionar</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Planos ({filteredPlanos.length})</CardTitle>
                <CardDescription>Lista de todos os planos de assinatura</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <SortHeader column="ordem" className="w-16 text-center">#</SortHeader>
                        <SortHeader column="nome">Nome</SortHeader>
                        <SortHeader column="preco" className="w-24 text-right">Preço</SortHeader>
                        <TableHead className="w-28">Stripe Price</TableHead>
                        <SortHeader column="destaque" className="w-20 text-center">Destaque</SortHeader>
                        <SortHeader column="empresas_count" className="w-20 text-center">Empresas</SortHeader>
                        <SortHeader column="ativo" className="w-20 text-center">Status</SortHeader>
                        <TableHead className="w-16 text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPlanos.map((plano, idx) => (
                        <TableRow key={plano.id}>
                          <TableCell className="text-center text-muted-foreground">{plano.ordem || idx + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{plano.nome}</p>
                              {plano.descricao && <p className="text-xs text-muted-foreground truncate">{plano.descricao}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {plano.preco.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {plano.stripe_price_id ? (
                              <span className="text-xs text-muted-foreground truncate block" title={plano.stripe_price_id}>
                                {plano.stripe_price_id}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {plano.destaque ? <Badge className="bg-amber-500">Destaque</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{plano.empresas_count || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {plano.ativo ? <Badge className="bg-green-600">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEdit(plano)} className="cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggle(plano)} className="cursor-pointer">
                                  <Switch checked={plano.ativo} className="mr-2" onClick={e => e.stopPropagation()} />
                                  {plano.ativo ? 'Desativar' : 'Ativar'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDelete(plano)}
                                  disabled={(plano.empresas_count || 0) > 0}
                                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                  {(plano.empresas_count || 0) > 0 && <span className="text-xs ml-1">(em uso)</span>}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delete Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir plano</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir &quot;{selectedPlano?.nome}&quot;? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
