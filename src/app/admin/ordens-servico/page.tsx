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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase';
import {
  Plus,
  ChevronLeft,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Wrench,
  CheckCircle,
  Clock,
  PlayCircle,
  XCircle,
  User,
  Download,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================
interface OrdemServicoItem {
  id?: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  total: number;
}

interface OrdemServico {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  descricao: string;
  tecnico: string;
  valorServicos: number;
  valorProdutos: number;
  valorTotal: number;
  status: string;
  ativo: boolean;
  dataAbertura: string;
  dataPrevisao: string;
  dataConclusao: string;
  dataAprovacao: string;
  observacoes: string;
  servicos: OrdemServicoItem[];
  produtos: any[];
  vendaId: string;
  criadoEm: string;
  criadoPorNome: string;
}

const STATUS_OPTIONS = [
  { value: 'aberta', label: 'Aberta', color: 'bg-yellow-500 text-white border-0', icon: Clock },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-500 text-white border-0', icon: PlayCircle },
  { value: 'concluida', label: 'Concluída', color: 'bg-green-500 text-white border-0', icon: CheckCircle },
  { value: 'aprovada', label: 'Aprovada', color: 'bg-violet-500 text-white border-0', icon: CheckCircle },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-red-500 text-white border-0', icon: XCircle },
  { value: 'convertida', label: 'Convertida', color: 'bg-emerald-600 text-white border-0', icon: CheckCircle },
];

// ============================================================
// Component
// ============================================================
export default function OrdensServicoPage() {
  const { user, empresaId } = useAuth();
  const { toast } = useToast();

  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [detailOS, setDetailOS] = useState<OrdemServico | null>(null);
  const [editingOS, setEditingOS] = useState<OrdemServico | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formNumero, setFormNumero] = useState(1001);
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [openClienteSearch, setOpenClienteSearch] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formTecnico, setFormTecnico] = useState('');
  const [formDataPrevisao, setFormDataPrevisao] = useState('');
  const [formValorTotal, setFormValorTotal] = useState(0);
  const [formStatus, setFormStatus] = useState('aberta');
  const [formObservacoes, setFormObservacoes] = useState('');

  // Data lists
  const [clientes, setClientes] = useState<any[]>([]);

  // Load data
  useEffect(() => {
    if (empresaId) {
      loadOrdens();
      loadClientes();
    }
  }, [empresaId]);

  const getSupabase = () => getSupabaseClient();

  // ============================================================
  // Data Loading
  // ============================================================
  const loadOrdens = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      const parsed = (data || []).map((o: any) => ({
        ...o,
        clienteId: o.cliente_id || '',
        clienteNome: o.cliente_nome || '',
        valorServicos: parseFloat(o.valor_servicos) || 0,
        valorProdutos: parseFloat(o.valor_produtos) || 0,
        valorTotal: parseFloat(o.valor_total) || 0,
        dataAbertura: o.data_abertura || '',
        dataPrevisao: o.data_previsao || '',
        dataConclusao: o.data_conclusao || '',
        dataAprovacao: o.data_aprovacao || '',
        vendaId: o.venda_id || '',
        criadoPorNome: o.criado_por_nome || '',
        servicos: typeof o.servicos === 'string' ? JSON.parse(o.servicos) : (o.servicos || []),
        produtos: typeof o.produtos === 'string' ? JSON.parse(o.produtos) : (o.produtos || []),
        criadoEm: o.criado_em,
      }));
      setOrdens(parsed);

      // Calculate next number
      const maxNum = (data || []).reduce((max: number, o: any) => Math.max(max, o.numero || 0), 0);
      setFormNumero(maxNum + 1);
    } catch (err: any) {
      console.error('Erro ao carregar ordens:', err);
      setOrdens([]);
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

  const ordensFiltradas = useMemo(() => {
    return ordens.filter(os => {
      if (!os.ativo) return false;
      const matchSearch = !search ||
        (os.descricao || '').toLowerCase().includes(search.toLowerCase()) ||
        (os.clienteNome || '').toLowerCase().includes(search.toLowerCase()) ||
        String(os.numero).includes(search);
      const matchStatus = statusFilter === 'todos' || os.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [ordens, search, statusFilter]);

  // Stats
  const osAbertas = ordens.filter(os => os.ativo && os.status === 'aberta');
  const osEmAndamento = ordens.filter(os => os.ativo && os.status === 'em_andamento');
  const osConcluidas = ordens.filter(os => os.ativo && os.status === 'concluida');
  const osAprovadas = ordens.filter(os => os.ativo && os.status === 'aprovada');

  // ============================================================
  // Actions
  // ============================================================
  const handleSaveOS = async () => {
    if (!clienteId || !clienteNome) {
      toast({ variant: 'destructive', title: 'Selecione um cliente' });
      return;
    }
    if (!formDescricao.trim()) {
      toast({ variant: 'destructive', title: 'Informe a descrição do serviço' });
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();
      const valorTotal = parseFloat(String(formValorTotal)) || 0;

      if (editingOS) {
        const { error } = await supabase
          .from('ordens_servico')
          .update({
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            descricao: formDescricao,
            tecnico: formTecnico,
            data_previsao: formDataPrevisao || null,
            valor_total: valorTotal,
            status: formStatus,
            observacoes: formObservacoes,
            servicos: JSON.stringify([{ descricao: formDescricao, quantidade: 1, valorUnitario: valorTotal, total: valorTotal }]),
          })
          .eq('id', editingOS.id);
        if (error) throw error;
        toast({ title: 'OS atualizada!', description: 'A ordem de serviço foi atualizada.' });
      } else {
        const { data: lastNum } = await supabase
          .from('ordens_servico')
          .select('numero')
          .eq('empresa_id', empresaId)
          .order('numero', { ascending: false })
          .limit(1)
          .single();
        const nextNum = (lastNum?.numero || 0) + 1;

        const { error } = await supabase
          .from('ordens_servico')
          .insert({
            empresa_id: empresaId,
            numero: nextNum,
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            descricao: formDescricao,
            tecnico: formTecnico,
            data_previsao: formDataPrevisao || null,
            valor_total: valorTotal,
            valor_servicos: valorTotal,
            status: formStatus,
            observacoes: formObservacoes,
            servicos: JSON.stringify([{ descricao: formDescricao, quantidade: 1, valorUnitario: valorTotal, total: valorTotal }]),
            criado_por: user?.id,
            criado_por_nome: user?.nome,
          });
        if (error) throw error;
        toast({ title: 'OS criada!', description: 'Nova ordem de serviço criada.' });
      }
      setFormOpen(false);
      resetForm();
      loadOrdens();
    } catch (err: any) {
      console.error('Erro ao salvar OS:', err);
      toast({ variant: 'destructive', title: 'Erro ao salvar OS', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOS = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta OS?')) return;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('ordens_servico')
        .update({ ativo: false })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'OS excluída!', description: 'Ordem de serviço removida.' });
      loadOrdens();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    }
  };

  const handleStatusChange = async (osId: string, novoStatus: string) => {
    try {
      const supabase = getSupabase();
      const updates: any = { status: novoStatus };

      if (novoStatus === 'concluida') {
        updates.data_conclusao = new Date().toISOString();
      }
      if (novoStatus === 'aprovada') {
        updates.data_aprovacao = new Date().toISOString();
      }

      const { error } = await supabase
        .from('ordens_servico')
        .update(updates)
        .eq('id', osId);

      if (error) throw error;
      toast({ title: 'Status atualizado!', description: 'O status da OS foi alterado com sucesso.' });
      loadOrdens();
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status.' });
    }
  };

  // ============================================================
  // Edit & Reset
  // ============================================================
  const handleEdit = (os: OrdemServico) => {
    setEditingOS(os);
    setFormNumero(os.numero);
    setClienteId(os.clienteId || '');
    setClienteNome(os.clienteNome || '');
    setFormDescricao(os.descricao || '');
    setFormTecnico(os.tecnico || '');
    setFormDataPrevisao(os.dataPrevisao ? os.dataPrevisao.split('T')[0] : '');
    setFormValorTotal(os.valorTotal || 0);
    setFormStatus(os.status || 'aberta');
    setFormObservacoes(os.observacoes || '');
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditingOS(null);
    setClienteId('');
    setClienteNome('');
    setOpenClienteSearch(false);
    setClienteSearch('');
    setFormDescricao('');
    setFormTecnico('');
    setFormDataPrevisao('');
    setFormValorTotal(0);
    setFormStatus('aberta');
    setFormObservacoes('');
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
  // Render
  // ============================================================
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Ordens de Serviço' }]}>
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
                  <Wrench className="h-7 w-7 text-violet-600" />
                  Ordens de Serviço
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gestão de ordens de serviço (OS)
                </p>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setFormOpen(true); }} className="gap-2 bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4" />
              Nova OS
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Abertas</p>
                    <p className="text-2xl font-bold">{osAbertas.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <PlayCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Em Andamento</p>
                    <p className="text-2xl font-bold">{osEmAndamento.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Concluídas</p>
                    <p className="text-2xl font-bold">{osConcluidas.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aprovadas</p>
                    <p className="text-2xl font-bold">{osAprovadas.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="relative flex-1 w-full md:max-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por descrição, cliente ou nº..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filtrar" />
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
              <CardTitle className="text-base">Ordens de Serviço</CardTitle>
              <CardDescription>{ordensFiltradas.length} encontrada(s)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : ordensFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Nenhuma OS encontrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Técnico</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordensFiltradas.map((os) => (
                        <TableRow key={os.id}>
                          <TableCell className="font-mono font-semibold">#{os.numero}</TableCell>
                          <TableCell>
                            <p className="font-medium">{os.clienteNome || '-'}</p>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{os.descricao}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">{formatCurrency(os.valorTotal)}</TableCell>
                          <TableCell className="text-sm">{formatDate(os.dataAbertura)}</TableCell>
                          <TableCell className="text-sm">{os.tecnico || '-'}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(os.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(os)} title="Editar">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailOS(os)} title="Ver detalhes">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteOS(os.id)} title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {os.status === 'aberta' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleStatusChange(os.id, 'em_andamento')} title="Iniciar">
                                  <PlayCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {os.status === 'em_andamento' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleStatusChange(os.id, 'concluida')} title="Concluir">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {os.status === 'concluida' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-violet-600" onClick={() => handleStatusChange(os.id, 'aprovada')} title="Aprovar">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
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
        </div>

        {/* CREATE/EDIT DIALOG */}
        <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOS ? 'Editar OS' : 'Nova Ordem de Serviço'}</DialogTitle>
              <DialogDescription>Preencha os dados da ordem de serviço</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={editingOS ? editingOS.numero : formNumero} disabled className="bg-muted" />
                </div>
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
              </div>

              <div className="space-y-2">
                <Label>Descrição <span className="text-red-500">*</span></Label>
                <textarea
                  className="w-full min-h-[80px] p-3 border rounded-lg resize-none text-sm"
                  placeholder="Descrição do serviço..."
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Técnico</Label>
                  <Input
                    placeholder="Nome do técnico"
                    value={formTecnico}
                    onChange={(e) => setFormTecnico(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Previsão</Label>
                  <Input
                    type="date"
                    value={formDataPrevisao}
                    onChange={(e) => setFormDataPrevisao(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Total (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formValorTotal || ''}
                    onChange={(e) => setFormValorTotal(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <textarea
                  className="w-full min-h-[60px] p-3 border rounded-lg resize-none text-sm"
                  placeholder="Observações..."
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSaveOS} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingOS ? 'Atualizar' : 'Criar OS'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DETAIL DIALOG */}
        <Dialog open={!!detailOS} onOpenChange={(open) => { if (!open) setDetailOS(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>OS #{detailOS?.numero}</DialogTitle>
              <DialogDescription>Detalhes da ordem de serviço</DialogDescription>
            </DialogHeader>
            {detailOS && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-semibold text-sm mt-1">{detailOS.clienteNome || '-'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Técnico</p>
                    <p className="font-semibold text-sm mt-1">{detailOS.tecnico || 'Não atribuído'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Abertura</p>
                    <p className="font-semibold text-sm mt-1">{formatDate(detailOS.dataAbertura)}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Previsão</p>
                    <p className="font-semibold text-sm mt-1">{detailOS.dataPrevisao ? formatDate(detailOS.dataPrevisao) : '-'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Conclusão</p>
                    <p className="font-semibold text-sm mt-1">{detailOS.dataConclusao ? formatDate(detailOS.dataConclusao) : '-'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(detailOS.status)}</div>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="text-sm mt-1">{detailOS.descricao}</p>
                </div>

                {detailOS.observacoes && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-sm mt-1">{detailOS.observacoes}</p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">Valor Total:</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(detailOS.valorTotal)}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
