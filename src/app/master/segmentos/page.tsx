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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { getSupabaseClient } from '@/lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  Layers,
  Building2,
  Coffee,
  UtensilsCrossed,
  Scissors,
  ShoppingBag,
  Stethoscope,
  Wrench,
  Dumbbell,
  ShoppingCart,
  Store,
  Bike,
  PawPrint,
  Settings,
  Heart,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Icon mapping for preview
const iconMap: Record<string, LucideIcon> = {
  Coffee,
  UtensilsCrossed,
  Scissors,
  ShoppingBag,
  Stethoscope,
  Wrench,
  Dumbbell,
  ShoppingCart,
  Building2,
  Store,
  Bike,
  PawPrint,
  Settings,
  Heart,
  Layers,
  WashingMachine,
};

const availableIcons = Object.keys(iconMap);

interface Segmento {
  id: string;
  nome: string;
  nome_marca: string;
  descricao: string | null;
  icone: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  empresas_count?: number;
}

const emptyForm = {
  nome: '',
  nome_marca: '',
  descricao: '',
  icone: '',
  ativo: true,
};

export default function SegmentosPage() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingSegmento, setEditingSegmento] = useState<Segmento | null>(null);
  const [selectedSegmento, setSelectedSegmento] = useState<Segmento | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [secoesDisponiveis, setSecoesDisponiveis] = useState<any[]>([]);
  const [secoesSelecionadas, setSecoesSelecionadas] = useState<Set<string>>(new Set());
  const [loadingSecoes, setLoadingSecoes] = useState(false);
  const { toast } = useToast();

  const fetchSegmentos = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('segmentos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      // Fetch empresas count per segmento
      const { data: empresas, error: empError } = await supabase
        .from('empresas')
        .select('segmento_id');

      if (empError) throw empError;

      // Build count map
      const countMap: Record<string, number> = {};
      empresas?.forEach((emp: { segmento_id: string | null }) => {
        if (emp.segmento_id) {
          countMap[emp.segmento_id] = (countMap[emp.segmento_id] || 0) + 1;
        }
      });

      const enrichedData = (data || []).map((seg: Segmento) => ({
        ...seg,
        empresas_count: countMap[seg.id] || 0,
      }));

      setSegmentos(enrichedData);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar segmentos',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSegmentos();
  }, [fetchSegmentos]);

  useEffect(() => {
    const loadSecoes = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase
        .from('secoes_menu')
        .select('*')
        .eq('ativo', true)
        .order('grupo, ordem');
      setSecoesDisponiveis(data || []);
    };
    loadSecoes();
  }, []);

  const toggleSecao = (secaoId: string) => {
    setSecoesSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(secaoId)) {
        next.delete(secaoId);
      } else {
        next.add(secaoId);
      }
      return next;
    });
  };

  const filteredSegmentos = segmentos.filter((seg) =>
    seg.nome.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateDialog = () => {
    setEditingSegmento(null);
    setForm(emptyForm);
    // Default: all sections selected for new segment
    setSecoesSelecionadas(new Set(secoesDisponiveis.map((s: any) => s.id)));
    setDialogOpen(true);
  };

  const openEditDialog = async (segmento: Segmento) => {
    setEditingSegmento(segmento);
    setForm({
      nome: segmento.nome,
      nome_marca: segmento.nome_marca,
      descricao: segmento.descricao || '',
      icone: segmento.icone || '',
      ativo: segmento.ativo,
    });

    // Load this segment's sections
    try {
      setLoadingSecoes(true);
      const supabase = getSupabaseClient();
      const { data: segSecoes } = await supabase
        .from('segmento_secoes')
        .select('secao_id, ativo')
        .eq('segmento_id', segmento.id);

      if (segSecoes && segSecoes.length > 0) {
        const ativos = new Set(
          segSecoes.filter((s: any) => s.ativo).map((s: any) => s.secao_id)
        );
        setSecoesSelecionadas(ativos);
      } else {
        // Default: all selected
        setSecoesSelecionadas(new Set(secoesDisponiveis.map((s: any) => s.id)));
      }
    } catch (error) {
      setSecoesSelecionadas(new Set(secoesDisponiveis.map((s: any) => s.id)));
    } finally {
      setLoadingSecoes(false);
    }

    setDialogOpen(true);
  };

  const openDeleteDialog = (segmento: Segmento) => {
    setSelectedSegmento(segmento);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.nome_marca.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Nome e Nome da Marca são obrigatórios.',
      });
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      let savedId = editingSegmento?.id;

      if (editingSegmento) {
        const { error } = await supabase
          .from('segmentos')
          .update({
            nome: form.nome.trim(),
            nome_marca: form.nome_marca.trim(),
            descricao: form.descricao.trim() || null,
            icone: form.icone.trim() || null,
            ativo: form.ativo,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', editingSegmento.id);

        if (error) throw error;
        toast({
          title: 'Segmento atualizado!',
          description: `"${form.nome}" foi atualizado com sucesso.`,
        });
      } else {
        const { data, error } = await supabase.from('segmentos').insert({
          nome: form.nome.trim(),
          nome_marca: form.nome_marca.trim(),
          descricao: form.descricao.trim() || null,
          icone: form.icone.trim() || null,
          ativo: true,
        }).select('id').single();

        if (error) throw error;
        savedId = data?.id;
        toast({
          title: 'Segmento criado!',
          description: `"${form.nome}" foi criado com sucesso.`,
        });
      }

      // Save segmento_secoes
      if (savedId && secoesDisponiveis.length > 0) {
        // Delete existing and re-insert
        await supabase.from('segmento_secoes').delete().eq('segmento_id', savedId);

        const secoesToSave = secoesDisponiveis.map((secao: any) => ({
          segmento_id: savedId,
          secao_id: secao.id,
          ativo: secoesSelecionadas.has(secao.id),
        }));

        if (secoesToSave.length > 0) {
          await supabase.from('segmento_secoes').insert(secoesToSave);
        }
      }

      setDialogOpen(false);
      setSecoesSelecionadas(new Set());
      fetchSegmentos();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (segmento: Segmento) => {
    setTogglingId(segmento.id);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('segmentos')
        .update({
          ativo: !segmento.ativo,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', segmento.id);

      if (error) throw error;

      toast({
        title: segmento.ativo ? 'Segmento desativado' : 'Segmento ativado',
        description: `"${segmento.nome}" agora está ${segmento.ativo ? 'inativo' : 'ativo'}.`,
      });

      fetchSegmentos();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedSegmento) return;
    setDeleting(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('segmentos')
        .update({ ativo: false })
        .eq('id', selectedSegmento.id);

      if (error) throw error;

      toast({
        title: 'Segmento inativado!',
        description: `"${selectedSegmento.nome}" foi inativado com sucesso.`,
      });

      setDeleteDialogOpen(false);
      setSelectedSegmento(null);
      fetchSegmentos();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro ao inativar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setDeleting(false);
    }
  };

  const getIconComponent = (iconName: string | null): LucideIcon => {
    if (!iconName) return Layers;
    return iconMap[iconName] || Layers;
  };

  const getIconPreview = (iconName: string | null) => {
    const IconComponent = getIconComponent(iconName);
    return <IconComponent className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['master']}>
        <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Segmentos' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
          { title: 'Segmentos' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Segmentos</h1>
              <p className="text-muted-foreground">
                Gerencie os segmentos disponíveis para cadastro de empresas
              </p>
            </div>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setEditingSegmento(null);
                  setForm(emptyForm);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Segmento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingSegmento ? 'Editar Segmento' : 'Novo Segmento'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSegmento
                      ? 'Atualize os dados do segmento abaixo.'
                      : 'Preencha os dados para criar um novo segmento.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label htmlFor="seg-nome">Nome *</Label>
                    <Input
                      id="seg-nome"
                      placeholder="Ex: Cafeterias"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    />
                  </div>

                  {/* Nome da Marca */}
                  <div className="space-y-2">
                    <Label htmlFor="seg-marca">Nome da Marca *</Label>
                    <Input
                      id="seg-marca"
                      placeholder="Ex: Gestão Café"
                      value={form.nome_marca}
                      onChange={(e) => setForm({ ...form, nome_marca: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome exibido no cabeçalho da sidebar das empresas deste segmento
                    </p>
                  </div>

                  {/* Descrição */}
                  <div className="space-y-2">
                    <Label htmlFor="seg-descricao">Descrição</Label>
                    <Textarea
                      id="seg-descricao"
                      placeholder="Descrição opcional do segmento..."
                      value={form.descricao}
                      onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Ícone */}
                  <div className="space-y-2">
                    <Label htmlFor="seg-icone">Ícone</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg border bg-muted/50">
                        {getIconPreview(form.icone || null)}
                      </div>
                      <div className="flex-1">
                        <Input
                          id="seg-icone"
                          placeholder="Ex: Coffee, ShoppingBag, Scissors..."
                          value={form.icone}
                          onChange={(e) =>
                            setForm({ ...form, icone: e.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Ícones disponíveis:{' '}
                          {availableIcons.map((name) => (
                            <button
                              key={name}
                              type="button"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline mx-0.5"
                              onClick={() => setForm({ ...form, icone: name })}
                            >
                              {name}
                            </button>
                          ))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status (only when editing) */}
                  {editingSegmento && (
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={form.ativo}
                        onCheckedChange={(checked) =>
                          setForm({ ...form, ativo: checked })
                        }
                      />
                      <Label>{form.ativo ? 'Ativo' : 'Inativo'}</Label>
                    </div>
                  )}

                  <Separator />

                  {/* Seções do Menu */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Seções do Menu</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setSecoesSelecionadas(new Set(secoesDisponiveis.map((s: any) => s.id)))}
                        >
                          Todas
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setSecoesSelecionadas(new Set())}
                        >
                          Nenhuma
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecione quais seções do menu serão liberadas para as empresas deste segmento.
                    </p>

                    {loadingSecoes ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      ['principal', 'atalho_rapido', 'subsecao'].map((grupo) => {
                        const grupoSecoes = secoesDisponiveis.filter((s: any) => s.grupo === grupo);
                        if (grupoSecoes.length === 0) return null;

                        return (
                          <div key={grupo}>
                            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">
                              {grupo === 'principal' ? '📋 Menu Principal' : grupo === 'atalho_rapido' ? '⚡ Atalho Rápido' : '🔧 Sub-seções dos Produtos'}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {grupoSecoes.map((secao: any) => (
                                <div
                                  key={secao.id}
                                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                                    secoesSelecionadas.has(secao.id) ? 'border-blue-300 bg-blue-50' : 'border-muted'
                                  } cursor-pointer`}
                                  onClick={() => toggleSecao(secao.id)}
                                >
                                  <Checkbox
                                    checked={secoesSelecionadas.has(secao.id)}
                                    onCheckedChange={() => toggleSecao(secao.id)}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">{secao.nome}</span>
                                      {secao.obrigatoria && (
                                        <Badge variant="secondary" className="text-[10px] px-1">Obrigatória</Badge>
                                      )}
                                    </div>
                                    {secao.descricao && (
                                      <p className="text-xs text-muted-foreground">{secao.descricao}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingSegmento(null);
                      setForm(emptyForm);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingSegmento ? 'Salvar Alterações' : 'Criar Segmento'}
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
                <Input
                  placeholder="Buscar por nome do segmento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {filteredSegmentos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Layers className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum segmento encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Clique em &quot;Novo Segmento&quot; para adicionar
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Segmentos ({filteredSegmentos.length})</CardTitle>
                <CardDescription>
                  Lista de todos os segmentos cadastrados no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Nome Marca</TableHead>
                        <TableHead className="hidden md:table-cell">Descrição</TableHead>
                        <TableHead className="text-center">Empresas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSegmentos.map((segmento) => {
                        const IconComp = getIconComponent(segmento.icone);
                        return (
                          <TableRow key={segmento.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50 text-blue-600">
                                  <IconComp className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-medium">{segmento.nome}</p>
                                  {segmento.icone && (
                                    <p className="text-xs text-muted-foreground">
                                      {segmento.icone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-blue-700">
                                {segmento.nome_marca}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                              <span className="text-muted-foreground text-sm">
                                {segmento.descricao || '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">
                                {segmento.empresas_count || 0}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {segmento.ativo ? (
                                <Badge className="bg-green-600 hover:bg-green-700">
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300">
                                  Inativo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openEditDialog(segmento)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggle(segmento)}
                                    disabled={togglingId === segmento.id}
                                    className="cursor-pointer"
                                  >
                                    {togglingId === segmento.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Switch
                                        checked={segmento.ativo}
                                        className="mr-2"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    )}
                                    {segmento.ativo ? 'Desativar' : 'Ativar'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(segmento)}
                                    disabled={(segmento.empresas_count || 0) > 0}
                                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                    {(segmento.empresas_count || 0) > 0 && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        (em uso)
                                      </span>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir segmento</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o segmento &quot;{selectedSegmento?.nome}&quot;?
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
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
