'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Wrench,
  CheckCircle,
  DollarSign,
  Clock,
  TrendingUp,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Servico {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  preco: number;
  duracao: number;
  comissao: number;
  ativo: boolean;
}

const CATEGORIAS = [
  'Cabelo',
  'Estética',
  'Manicure',
  'Pedicure',
  'Massagem',
  'Consultoria',
  'Manutenção',
  'Limpeza',
  'Outros',
];

const DURACOES = [15, 30, 45, 60, 90, 120, 150, 180];

function formatCurrency(v: number) {
  return v?.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' });
}

export function ServicosTab() {
  const { empresaId } = useAuth();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<Servico | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Servico | null>(null);

  const carregar = async () => {
    if (!empresaId) {
      setServicos([]);
      setLoading(false);
      return;
    }
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      if (error) throw error;
      setServicos(
        (data || []).map((s: any) => ({
          id: s.id,
          nome: s.nome,
          descricao: s.descricao || '',
          categoria: s.categoria || 'Outros',
          preco: parseFloat(s.preco) || 0,
          duracao: parseInt(s.duracao) || 30,
          comissao: parseFloat(s.comissao) || 0,
          ativo: s.ativo ?? true,
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [empresaId]);

  const filtered = useMemo(() => {
    return servicos.filter((s) => {
      const term = search.toLowerCase();
      const matchSearch =
        s.nome.toLowerCase().includes(term) ||
        s.descricao?.toLowerCase().includes(term) ||
        s.categoria.toLowerCase().includes(term);
      const matchCat = filterCategoria === 'todas' || s.categoria === filterCategoria;
      return matchSearch && matchCat;
    });
  }, [servicos, search, filterCategoria]);

  const totalServicos = servicos.length;
  const servicosAtivos = servicos.filter((s) => s.ativo).length;
  const valorMedio = servicos.length > 0
    ? servicos.reduce((acc, s) => acc + s.preco, 0) / servicos.length
    : 0;

  const limparForm = () => {
    setEditando(null);
    setTimeout(() => {
      const form = document.getElementById('servico-form') as HTMLFormElement;
      if (form) form.reset();
    }, 100);
  };

  const handleNovo = () => {
    limparForm();
    setDialogOpen(true);
  };

  const handleEditar = (s: Servico) => {
    setEditando(s);
    setDialogOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      const dados = {
        nome: (fd.get('nome') as string) || '',
        descricao: (fd.get('descricao') as string) || null,
        categoria: (fd.get('categoria') as string) || 'Outros',
        preco: parseFloat(fd.get('preco') as string) || 0,
        duracao: parseInt(fd.get('duracao') as string) || 30,
        comissao: parseFloat(fd.get('comissao') as string) || 0,
        ativo: fd.get('ativo') === 'on',
        empresa_id: empresaId,
      };

      const supabase = getSupabaseClient();

      if (editando) {
        const { error } = await supabase
          .from('servicos')
          .update(dados)
          .eq('id', editando.id);
        if (error) throw error;
        toast.success(`Serviço "${dados.nome}" atualizado!`);
      } else {
        const { error } = await supabase.from('servicos').insert(dados);
        if (error) throw error;
        toast.success(`Serviço "${dados.nome}" cadastrado!`);
      }
      setDialogOpen(false);
      limparForm();
      await carregar();
    } catch (err: unknown) {
      console.error('Erro ao salvar serviço:', err);
      let msg = 'Erro ao salvar serviço';
      if (err instanceof Error) msg = err.message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (s: Servico) => {
    setDeleteTarget(s);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('servicos')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success(`Serviço "${deleteTarget.nome}" excluído!`);
      await carregar();
    } catch {
      toast.error('Erro ao excluir serviço');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleAtivo = async (s: Servico) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('servicos')
        .update({ ativo: !s.ativo })
        .eq('id', s.id);
      if (error) throw error;
      toast.success(s.ativo ? `"${s.nome}" desativado` : `"${s.nome}" ativado`);
      await carregar();
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Serviços
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Catálogo de serviços ({servicosAtivos} ativo{servicosAtivos !== 1 ? 's' : ''})
          </p>
        </div>
        <Button onClick={handleNovo} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Novo Serviço
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Wrench className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{totalServicos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold text-green-600">{servicosAtivos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Médio</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(valorMedio)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtro */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, descrição ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Wrench className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Nenhum serviço encontrado</p>
              <p className="text-sm">Clique em &quot;Novo Serviço&quot; para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="hidden md:table-cell text-center">Duração</TableHead>
                    <TableHead className="hidden lg:table-cell text-center">Comissão</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0">
                            <Wrench className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{s.nome}</p>
                            {s.descricao && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{s.descricao}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(s.preco)}</TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {s.duracao} min
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        <span className="text-sm">{s.comissao > 0 ? `${s.comissao}%` : '-'}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={s.ativo ? 'bg-green-500' : 'bg-gray-500'}>
                          {s.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditar(s)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleAtivo(s)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {s.ativo ? 'Desativar' : 'Ativar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(s)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { limparForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editando ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editando ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>
          <form id="servico-form" onSubmit={handleSalvar} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Serviço *</Label>
              <Input
                id="nome"
                name="nome"
                placeholder="Ex: Corte de cabelo masculino"
                required
                defaultValue={editando?.nome || ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                name="descricao"
                placeholder="Descreva o serviço em detalhes..."
                rows={3}
                defaultValue={editando?.descricao || ''}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select name="categoria" defaultValue={editando?.categoria || 'Outros'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração (minutos)</Label>
                <Select name="duracao" defaultValue={String(editando?.duracao || 30)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURACOES.map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preco">Preço (R$) *</Label>
                <Input
                  id="preco"
                  name="preco"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  required
                  defaultValue={editando?.preco ? String(editando.preco) : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comissao">Comissão (%)</Label>
                <Input
                  id="comissao"
                  name="comissao"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="0"
                  defaultValue={editando?.comissao ? String(editando.comissao) : ''}
                />
                <p className="text-xs text-muted-foreground">Percentual de comissão para o prestador</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Serviço Ativo</Label>
                <p className="text-sm text-muted-foreground">Inativos não aparecem para OS</p>
              </div>
              <Switch name="ativo" defaultChecked={editando?.ativo ?? true} />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="min-w-[150px] bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {saving ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Excluir Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
