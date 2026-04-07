'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  Wrench,
  CheckCircle,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowDownCircle,
  ChevronLeft,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  preco: number;
  duracao: number;
  comissao: number;
  ativo: boolean;
  empresa_id: string;
  criado_em: string;
  atualizado_em: string;
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

export default function ServicosPage() {
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();
  const { toast } = useToast();

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editandoServico, setEditandoServico] = useState<Servico | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Servico | null>(null);

  // Financeiro dialog state
  const [financeiroDialogOpen, setFinanceiroDialogOpen] = useState(false);
  const [financeiroSaving, setFinanceiroSaving] = useState(false);
  const [servicoParaConta, setServicoParaConta] = useState<Servico | null>(null);

  // Form state for financeiro dialog
  const [finVencimento, setFinVencimento] = useState('');
  const [finFornecedor, setFinFornecedor] = useState('');

  // Carregar serviços
  const carregarServicos = async () => {
    if (!empresaId) {
      setServicos([]);
      setLoading(false);
      return;
    }

    try {
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
          preco: s.preco || 0,
          duracao: s.duracao || 30,
          comissao: s.comissao || 0,
          ativo: s.ativo ?? true,
          empresa_id: s.empresa_id,
          criado_em: s.criado_em,
          atualizado_em: s.atualizado_em,
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarServicos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  // Filtrar serviços
  const filteredServicos = useMemo(() => {
    return servicos.filter((s) => {
      const searchLower = search.toLowerCase();
      const matchSearch =
        s.nome.toLowerCase().includes(searchLower) ||
        s.descricao?.toLowerCase().includes(searchLower) ||
        s.categoria.toLowerCase().includes(searchLower);
      const matchCategoria =
        filterCategoria === 'todas' || s.categoria === filterCategoria;
      return matchSearch && matchCategoria;
    });
  }, [servicos, search, filterCategoria]);

  // Estatísticas
  const totalServicos = servicos.length;
  const servicosAtivos = servicos.filter((s) => s.ativo).length;
  const valorMedio =
    servicos.length > 0
      ? servicos.reduce((acc, s) => acc + s.preco, 0) / servicos.length
      : 0;
  const receitaMensalEstimada = servicosAtivos > 0
    ? servicos.filter(s => s.ativo).reduce((acc, s) => acc + s.preco * 20, 0) // estimativa de 20 atendimentos/mês
    : 0;

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);

    try {
      const dados = {
        nome: formData.get('nome') as string,
        descricao: (formData.get('descricao') as string) || null,
        categoria: formData.get('categoria') as string || 'Outros',
        preco: parseFloat(formData.get('preco') as string) || 0,
        duracao: parseInt(formData.get('duracao') as string) || 30,
        comissao: parseFloat(formData.get('comissao') as string) || 0,
        ativo: formData.get('ativo') === 'on',
        empresa_id: empresaId,
      };

      if (editandoServico) {
        const { error } = await supabase
          .from('servicos')
          .update(dados)
          .eq('id', editandoServico.id);

        if (error) throw error;

        toast({
          title: 'Serviço atualizado!',
          description: `${dados.nome} foi atualizado com sucesso.`,
        });
      } else {
        const { error } = await supabase
          .from('servicos')
          .insert(dados);

        if (error) throw error;

        toast({
          title: 'Serviço cadastrado!',
          description: `${dados.nome} foi adicionado com sucesso.`,
        });
      }

      setDialogOpen(false);
      setEditandoServico(null);
      await carregarServicos();
    } catch (error: unknown) {
      console.error('Erro ao salvar serviço:', error);
      let mensagem = 'Erro ao salvar serviço';
      if (error instanceof Error) {
        mensagem = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: mensagem,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (servico: Servico) => {
    setEditandoServico(servico);
    setDialogOpen(true);
  };

  const handleNovo = () => {
    setEditandoServico(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (servico: Servico) => {
    setDeleteTarget(servico);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('servicos')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      toast({
        title: 'Serviço excluído!',
        description: `${deleteTarget.nome} foi removido com sucesso.`,
      });

      await carregarServicos();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o serviço.',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleAtivo = async (servico: Servico) => {
    try {
      const { error } = await supabase
        .from('servicos')
        .update({ ativo: !servico.ativo })
        .eq('id', servico.id);

      if (error) throw error;

      toast({
        title: servico.ativo ? 'Serviço desativado' : 'Serviço ativado',
        description: `${servico.nome} foi ${servico.ativo ? 'desativado' : 'ativado'} com sucesso.`,
      });

      await carregarServicos();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível alterar o status do serviço.',
      });
    }
  };

  // Financeiro integration
  const handleGerarContaReceber = (servico: Servico) => {
    setServicoParaConta(servico);
    setFinVencimento('');
    setFinFornecedor('');
    setFinanceiroDialogOpen(true);
  };

  const handleSalvarContaReceber = async () => {
    if (!servicoParaConta || !empresaId) return;
    setFinanceiroSaving(true);

    try {
      const vencimento = finVencimento
        ? new Date(finVencimento + 'T00:00:00').toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 dias por padrão

      const { error } = await supabase
        .from('contas')
        .insert({
          tipo: 'receber',
          descricao: `Serviço: ${servicoParaConta.nome}`,
          valor: servicoParaConta.preco,
          vencimento,
          categoria: 'servicos',
          fornecedor: finFornecedor || null,
          empresa_id: empresaId,
          status: 'pendente',
        });

      if (error) throw error;

      toast({
        title: 'Conta a receber gerada!',
        description: `Conta para "${servicoParaConta.nome}" no valor de ${formatCurrency(servicoParaConta.preco)} foi criada.`,
      });

      setFinanceiroDialogOpen(false);
      setServicoParaConta(null);
    } catch (error: unknown) {
      console.error('Erro ao gerar conta:', error);
      let mensagem = 'Erro ao gerar conta a receber';
      if (error instanceof Error) {
        mensagem = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: mensagem,
      });
    } finally {
      setFinanceiroSaving(false);
    }
  };

  // Resetar formulário quando fechar dialog
  useEffect(() => {
    if (!dialogOpen) {
      setEditandoServico(null);
    }
  }, [dialogOpen]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'master']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Serviços' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Admin' },
          { title: 'Serviços' },
        ]}
      >
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
                <h1 className="text-3xl font-bold">Serviços</h1>
                <p className="text-muted-foreground">
                  Gerencie o catálogo de serviços do seu estabelecimento
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleNovo} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Novo Serviço
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Wrench className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Serviços</p>
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
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(valorMedio)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receita Mensal Est.</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(receitaMensalEstimada)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dialog Create/Edit */}
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditandoServico(null);
              }
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editandoServico ? 'Editar Serviço' : 'Novo Serviço'}
                </DialogTitle>
                <DialogDescription>
                  {editandoServico
                    ? 'Atualize os dados do serviço'
                    : 'Preencha os dados do novo serviço'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSalvar}>
                <div className="space-y-4 py-4">
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Serviço *</Label>
                    <Input
                      id="nome"
                      name="nome"
                      placeholder="Ex: Corte de cabelo masculino"
                      required
                      defaultValue={editandoServico?.nome || ''}
                    />
                  </div>

                  {/* Descrição */}
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      name="descricao"
                      placeholder="Descreva o serviço em detalhes..."
                      rows={3}
                      defaultValue={editandoServico?.descricao || ''}
                    />
                  </div>

                  {/* Categoria e Duração */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoria">Categoria</Label>
                      <Select
                        name="categoria"
                        defaultValue={editandoServico?.categoria || 'Outros'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duracao">Duração (minutos)</Label>
                      <Select
                        name="duracao"
                        defaultValue={String(editandoServico?.duracao || 30)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {DURACOES.map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              {d} min
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Preço e Comissão */}
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
                        defaultValue={editandoServico?.preco || ''}
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
                        defaultValue={editandoServico?.comissao || ''}
                      />
                      <p className="text-xs text-muted-foreground">
                        Percentual de comissão para o prestador do serviço
                      </p>
                    </div>
                  </div>

                  {/* Ativo */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Serviço Ativo</Label>
                      <p className="text-sm text-muted-foreground">
                        Serviços inativos não aparecem para agendamento
                      </p>
                    </div>
                    <Switch
                      name="ativo"
                      defaultChecked={editandoServico?.ativo ?? true}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditandoServico(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {editandoServico ? 'Salvar Alterações' : 'Cadastrar Serviço'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir{' '}
                  <strong>{deleteTarget?.nome}</strong>?
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Financeiro Dialog - Gerar Conta a Receber */}
          <Dialog
            open={financeiroDialogOpen}
            onOpenChange={(open) => {
              setFinanceiroDialogOpen(open);
              if (!open) {
                setServicoParaConta(null);
              }
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Gerar Conta a Receber</DialogTitle>
                <DialogDescription>
                  Crie uma conta a receber com base neste serviço
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Info do serviço */}
                <div className="rounded-lg bg-blue-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-800">
                      {servicoParaConta?.nome}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600">Valor:</span>
                    <span className="font-bold text-blue-800">
                      {formatCurrency(servicoParaConta?.preco || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600">Categoria:</span>
                    <span className="text-blue-800">Serviços</span>
                  </div>
                </div>

                {/* Vencimento */}
                <div className="space-y-2">
                  <Label htmlFor="finVencimento">Vencimento</Label>
                  <Input
                    id="finVencimento"
                    type="date"
                    value={finVencimento}
                    onChange={(e) => setFinVencimento(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Padrão: 30 dias a partir de hoje
                  </p>
                </div>

                {/* Cliente */}
                <div className="space-y-2">
                  <Label htmlFor="finFornecedor">Cliente (opcional)</Label>
                  <Input
                    id="finFornecedor"
                    placeholder="Nome do cliente"
                    value={finFornecedor}
                    onChange={(e) => setFinFornecedor(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setFinanceiroDialogOpen(false);
                    setServicoParaConta(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={financeiroSaving}
                  onClick={handleSalvarContaReceber}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {financeiroSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Gerar Conta a Receber
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
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
                      <SelectItem value="todas">Todas as categorias</SelectItem>
                      {CATEGORIAS.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {filteredServicos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum serviço encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Clique em &quot;Novo Serviço&quot; para começar
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Serviços ({filteredServicos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[220px]">Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead className="hidden md:table-cell text-center">
                          Duração
                        </TableHead>
                        <TableHead className="hidden lg:table-cell text-center">
                          Comissão
                        </TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-[100px] text-center">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredServicos.map((servico) => (
                        <TableRow key={servico.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0">
                                <Wrench className="h-5 w-5 text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {servico.nome}
                                </p>
                                {servico.descricao && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                    {servico.descricao}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{servico.categoria}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(servico.preco)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-center">
                            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {servico.duracao} min
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-center">
                            <span className="text-sm">
                              {servico.comissao > 0
                                ? `${servico.comissao}%`
                                : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={
                                servico.ativo
                                  ? 'bg-green-500'
                                  : 'bg-gray-500'
                              }
                            >
                              {servico.ativo ? 'Ativo' : 'Inativo'}
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
                                <DropdownMenuItem
                                  onClick={() => handleEditar(servico)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleAtivo(servico)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  {servico.ativo ? 'Desativar' : 'Ativar'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleGerarContaReceber(servico)}
                                >
                                  <DollarSign className="mr-2 h-4 w-4" />
                                  Gerar Conta a Receber
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteClick(servico)}
                                >
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
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
