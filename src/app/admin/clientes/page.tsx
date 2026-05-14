'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  RefreshCw,
  Building2,
  User,
  FileText,
  Download,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF, fetchEmpresaPDFData } from '@/lib/export-pdf';

interface Cliente {
  id: string;
  tipo_pessoa: string;
  cnpj_cpf: string;
  nome_razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  indicador_ie: number;
  email?: string;
  telefone?: string;
  celular?: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigo_municipio: string;
  municipio: string;
  uf: string;
  cep: string;
  observacoes?: string;
  ativo: boolean;
  criado_em: string;
}

export default function ClientesPage() {
  const { empresaId } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>('ativos');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(false);
  const [clienteEdit, setClienteEdit] = useState<Cliente | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Estados de exclusão / inativação
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [clienteHasHistory, setClienteHasHistory] = useState(false);
  const [checkingClienteHistory, setCheckingClienteHistory] = useState(false);
  const [clienteAtivo, setClienteAtivo] = useState(true);

  // Form
  const [tipoPessoa, setTipoPessoa] = useState('2');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [nomeRazao, setNomeRazao] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [indicadorIE, setIndicadorIE] = useState('9');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [celular, setCelular] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [codigoMunicipio, setCodigoMunicipio] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('');
  const [cep, setCep] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [buscandoCEP, setBuscandoCEP] = useState(false);
  const cepTimerRef = useRef<NodeJS.Timeout | null>(null);

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (busca) params.append('busca', busca);
      if (filtroAtivo === 'ativos') params.append('ativo', 'true');
      else if (filtroAtivo === 'inativos') params.append('ativo', 'false');
      const res = await fetch(`/api/clientes?${params.toString()}`);
      const data = await res.json();
      if (data.sucesso) setClientes(data.clientes || []);
    } catch {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [empresaId, busca, filtroAtivo]);

  useEffect(() => { carregar(); }, [carregar]);

  const limparForm = () => {
    setTipoPessoa('2');
    setCnpjCpf('');
    setNomeRazao('');
    setNomeFantasia('');
    setInscricaoEstadual('');
    setIndicadorIE('9');
    setEmail('');
    setTelefone('');
    setCelular('');
    setLogradouro('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCodigoMunicipio('');
    setMunicipio('');
    setUf('');
    setCep('');
    setObservacoes('');
    setClienteAtivo(true);
  };

  const preencherForm = (c: Cliente) => {
    setTipoPessoa(c.tipo_pessoa || '2');
    setCnpjCpf(c.cnpj_cpf || '');
    setNomeRazao(c.nome_razao_social || '');
    setNomeFantasia(c.nome_fantasia || '');
    setInscricaoEstadual(c.inscricao_estadual || '');
    setIndicadorIE(String(c.indicador_ie || '9'));
    setEmail(c.email || '');
    setTelefone(c.telefone || '');
    setCelular(c.celular || '');
    setLogradouro(c.logradouro || '');
    setNumero(c.numero || '');
    setComplemento(c.complemento || '');
    setBairro(c.bairro || '');
    setCodigoMunicipio(c.codigo_municipio || '');
    setMunicipio(c.municipio || '');
    setUf(c.uf || '');
    setCep(c.cep || '');
    setObservacoes(c.observacoes || '');
    setClienteAtivo(c.ativo ?? true);
  };

  const handleNovo = () => {
    limparForm();
    setEditando(false);
    setClienteEdit(null);
    setDialogOpen(true);
  };

  const handleEditar = (c: Cliente) => {
    preencherForm(c);
    setEditando(true);
    setClienteEdit(c);
    setDialogOpen(true);
  };

  const handleSalvar = async () => {
    if (!nomeRazao.trim()) {
      toast.error('Nome/Razão Social é obrigatório');
      return;
    }

    setSalvando(true);
    try {
      const body = {
        tipo_pessoa: tipoPessoa,
        cnpj_cpf: cnpjCpf,
        nome_razao_social: nomeRazao,
        nome_fantasia: nomeFantasia || undefined,
        inscricao_estadual: inscricaoEstadual || undefined,
        indicador_ie: parseInt(indicadorIE),
        email: email || undefined,
        telefone: telefone || undefined,
        celular: celular || undefined,
        logradouro,
        numero,
        complemento: complemento || undefined,
        bairro,
        codigo_municipio: codigoMunicipio,
        municipio,
        uf,
        cep,
        observacoes: observacoes || undefined,
        ativo: clienteAtivo,
      };

      const res = await fetch(editando ? '/api/clientes' : '/api/clientes', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando ? { id: clienteEdit?.id, ...body } : body),
      });
      const data = await res.json();

      if (data.sucesso) {
        toast.success(editando ? 'Cliente atualizado!' : 'Cliente cadastrado!');
        setDialogOpen(false);
        carregar();
      } else {
        toast.error(data.erro?.mensagem || 'Erro ao salvar');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setSalvando(false);
    }
  };

  const verificarClienteEmUso = async (clienteId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/clientes/vendas-count?id=${clienteId}`);
      const data = await res.json();
      return (data.count || 0) > 0;
    } catch {
      return false;
    }
  };

  const handleDeleteClick = async (cliente: Cliente) => {
    setClienteToDelete(cliente);
    setCheckingClienteHistory(true);
    setClienteHasHistory(false);
    setDeleteDialogOpen(true);
    const hasHistory = await verificarClienteEmUso(cliente.id);
    setClienteHasHistory(hasHistory);
    setCheckingClienteHistory(false);
  };

  const confirmInactivate = async () => {
    if (!clienteToDelete) return;
    try {
      const url = clienteHasHistory
        ? `/api/clientes?id=${clienteToDelete.id}`
        : `/api/clientes?id=${clienteToDelete.id}&force=true`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (data.sucesso) {
        toast.success(clienteHasHistory ? 'Cliente inativado para preservar o histórico!' : 'Cliente excluído permanentemente!');
        setDeleteDialogOpen(false);
        setClienteToDelete(null);
        carregar();
      } else {
        toast.error(data.erro?.mensagem || 'Erro ao remover');
      }
    } catch {
      toast.error('Erro de conexão');
    }
  };

  const mascaraCPFCNPJ = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 11) {
      return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/(-\s*)$/, '');
    }
    return apenasNumeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/(-\s*)$/, '');
  };

  const mascaraCEP = (valor: string) => valor.replace(/\D/g, '').replace(/(\d{5})(\d{0,3})/, '$1-$2');
  const mascaraFone = (valor: string) => valor.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/(-\s*)$/, '');

  const buscarCEP = useCallback(async (cepLimpo: string) => {
    if (cepLimpo.length !== 8) return;
    setBuscandoCEP(true);
    try {
      const res = await fetch(`/api/cep/${cepLimpo}`);
      const data = await res.json();
      if (!data.sucesso) {
        toast.error(data.erro?.mensagem || 'CEP não encontrado');
        return;
      }
      setLogradouro(data.logradouro || '');
      setComplemento(data.complemento || '');
      setBairro(data.bairro || '');
      setMunicipio(data.localidade || '');
      setUf(data.uf || '');
      setCodigoMunicipio(data.ibge || '');
      toast.success('Endereço preenchido via CEP');
    } catch {
      toast.error('Erro ao buscar CEP. Verifique sua conexão.');
    } finally {
      setBuscandoCEP(false);
    }
  }, []);

  // Auto-search CEP with debounce when 8 digits are typed
  useEffect(() => {
    if (cepTimerRef.current) clearTimeout(cepTimerRef.current);
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      cepTimerRef.current = setTimeout(() => buscarCEP(cepLimpo), 500);
    }
    return () => {
      if (cepTimerRef.current) clearTimeout(cepTimerRef.current);
    };
  }, [cep, buscarCEP]);

  const labelIE = indicadorIE === '2' ? 'Isento' : indicadorIE === '1' ? 'Contribuinte ICMS' : 'Não Contribuinte';

  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Clientes', href: '/admin/clientes' }]}>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-7 w-7" />
                  Clientes
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Cadastro de clientes para emissão de NF-e ({clientes.length} cliente{clientes.length !== 1 ? 's' : ''})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={async () => {
                const empresaInfo = await fetchEmpresaPDFData(empresaId);
                if (clientes.length === 0) {
                  toast.error('Nenhum cliente para exportar');
                  return;
                }
                exportToPDF({
                  title: 'Relatório de Clientes',
                  subtitle: `Busca: ${busca || 'Todos os clientes'}`,
                  columns: [
                    { header: 'Tipo', accessor: (c) => c.tipo_pessoa === '1' ? 'PJ' : 'PF', width: 15 },
                    { header: 'CNPJ/CPF', accessor: (c) => {
                      const v = c.cnpj_cpf.replace(/\D/g, '');
                      return v.length <= 11
                        ? v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
                        : v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
                    }, width: 35 },
                    { header: 'Nome/Razão Social', accessor: (c) => c.nome_razao_social, width: 60 },
                    { header: 'Município/UF', accessor: (c) => `${c.municipio}/${c.uf}`, width: 40 },
                    { header: 'Telefone', accessor: (c) => c.telefone || c.celular || '-', width: 30 },
                    { header: 'E-mail', accessor: (c) => c.email || '-', width: 50 },
                    { header: 'Status', accessor: (c) => c.ativo ? 'Ativo' : 'Inativo', width: 20 },
                  ],
                  data: clientes,
                  filename: `clientes-${new Date().toISOString().slice(0, 10)}`,
                  orientation: 'landscape',
                  summary: [
                    { label: 'Total de clientes', value: clientes.length },
                    { label: 'Ativos', value: clientes.filter(c => c.ativo).length },
                    { label: 'Inativos', value: clientes.filter(c => !c.ativo).length },
                  ],
                  ...empresaInfo,
                });
              }}>
                <Download className="h-4 w-4" /> Exportar PDF
              </Button>
              <Button onClick={handleNovo} className="gap-2">
                <Plus className="h-4 w-4" /> Novo Cliente
              </Button>
            </div>
          </div>

      {/* Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ/CPF, e-mail ou telefone..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ToggleGroup type="single" value={filtroAtivo} onValueChange={(v) => v && setFiltroAtivo(v as 'todos' | 'ativos' | 'inativos')}>
                <ToggleGroupItem value="ativos" className="text-xs h-8 px-3 data-[state=on]:bg-green-100 data-[state=on]:text-green-700">Ativos</ToggleGroupItem>
                <ToggleGroupItem value="inativos" className="text-xs h-8 px-3 data-[state=on]:bg-gray-200 data-[state=on]:text-gray-700">Inativos</ToggleGroupItem>
                <ToggleGroupItem value="todos" className="text-xs h-8 px-3 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700">Todos</ToggleGroupItem>
              </ToggleGroup>
              <Button variant="outline" size="icon" onClick={carregar}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando...</span>
            </div>
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Nenhum cliente cadastrado</p>
              <p className="text-sm">Clique em &quot;Novo Cliente&quot; para começar</p>
              <Button className="mt-4 gap-2" onClick={handleNovo}>
                <Plus className="h-4 w-4" /> Novo Cliente
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>CNPJ / CPF</TableHead>
                    <TableHead>Razão Social / Nome</TableHead>
                    <TableHead>IE</TableHead>
                    <TableHead>Município / UF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Badge variant={c.tipo_pessoa === '1' ? 'default' : 'secondary'} className="gap-1">
                          {c.tipo_pessoa === '1' ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          {c.tipo_pessoa === '1' ? 'PJ' : 'PF'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {c.tipo_pessoa === '1'
                          ? c.cnpj_cpf.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
                          : c.cnpj_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={c.nome_razao_social}>
                        {c.nome_razao_social}
                        {c.nome_fantasia && <p className="text-xs text-muted-foreground">{c.nome_fantasia}</p>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.indicador_ie === 1 ? c.inscricao_estadual || '-' : c.indicador_ie === 2 ? 'Isento' : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{c.municipio}/{c.uf}</TableCell>
                      <TableCell className="text-sm">{c.telefone || c.celular || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{c.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={c.ativo ? 'default' : 'secondary'}>
                          {c.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
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
                            <DropdownMenuItem onClick={() => handleEditar(c)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {c.ativo ? (
                              <DropdownMenuItem
                                className="text-orange-600"
                                onClick={() => handleDeleteClick(c)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Inativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={async () => {
                                  try {
                                    const res = await fetch('/api/clientes', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: c.id, ativo: true }),
                                    });
                                    const data = await res.json();
                                    if (data.sucesso) {
                                      toast.success(`${c.nome_razao_social} foi ativado novamente.`);
                                      carregar();
                                    } else {
                                      toast.error(data.erro?.mensagem || 'Erro ao ativar');
                                    }
                                  } catch {
                                    toast.error('Erro de conexão');
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Ativar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteClick(c)}
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
          )}
        </CardContent>
      </Card>

      {/* Dialog: Confirmar Exclusão / Inativação */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {checkingClienteHistory ? 'Verificando...' : clienteHasHistory ? 'Cliente não pode ser excluído' : 'Excluir Cliente'}
            </DialogTitle>
          </DialogHeader>

          {checkingClienteHistory ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : clienteHasHistory ? (
            <>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Cliente possui lançamentos anteriores</p>
                  <p className="mt-1">
                    O cliente <strong>{clienteToDelete?.nome_razao_social}</strong> possui <strong>vendas</strong> e/ou outros lançamentos no sistema.
                  </p>
                  <p className="mt-2">
                    Para <strong>preservar o histórico</strong> das movimentações, este cliente não pode ser excluído permanentemente.
                    Ele será <strong>inativado</strong> — ficará oculto da listagem, mas os relatórios
                    anteriores continuarão exibindo os dados corretamente.
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={confirmInactivate}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Inativar Cliente
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div className="text-sm text-red-800">
                  <p>Confirma a exclusão permanente de <strong>{clienteToDelete?.nome_razao_social}</strong>?</p>
                  <p className="mt-1">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={confirmInactivate}>
                  Excluir Permanentemente
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editando ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editando ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Tipo + CPF/CNPJ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select value={tipoPessoa} onValueChange={setTipoPessoa}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Pessoa Física (CPF)</SelectItem>
                    <SelectItem value="1">Pessoa Jurídica (CNPJ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tipoPessoa === '1' ? 'CNPJ' : 'CPF'}</Label>
                <Input
                  value={cnpjCpf}
                  onChange={(e) => setCnpjCpf(mascaraCPFCNPJ(e.target.value))}
                  placeholder={tipoPessoa === '1' ? '00.000.000/0000-00' : '000.000.000-00'}
                  maxLength={tipoPessoa === '1' ? 18 : 14}
                />
              </div>
            </div>
            {/* Razão Social / Nome Completo */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Razão Social / Nome Completo *</Label>
                <Input
                  value={nomeRazao}
                  onChange={(e) => setNomeRazao(e.target.value)}
                  placeholder={tipoPessoa === '1' ? 'Razão Social' : 'Nome Completo'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome Fantasia</Label>
                <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} placeholder="Nome fantasia (opcional)" />
              </div>
              <div>
                <Label>Indicador IE *</Label>
                <Select value={indicadorIE} onValueChange={(v) => { setIndicadorIE(v); if (v === '2') setInscricaoEstadual(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Contribuinte ICMS</SelectItem>
                    <SelectItem value="2">2 - Contribuinte Isento de ICMS</SelectItem>
                    <SelectItem value="9">9 - Não Contribuinte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Inscrição Estadual</Label>
                <Input
                  value={inscricaoEstadual}
                  onChange={(e) => setInscricaoEstadual(e.target.value)}
                  placeholder={indicadorIE === '2' ? 'Isento' : 'Inscrição Estadual'}
                  disabled={indicadorIE === '2'}
                />
              </div>
              <div>
                <Label>Inscrição Municipal</Label>
                <Input value={''} onChange={() => {}} placeholder="Opcional" disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={telefone} onChange={(e) => setTelefone(mascaraFone(e.target.value))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label>Celular</Label>
                <Input value={celular} onChange={(e) => setCelular(mascaraFone(e.target.value))} placeholder="(00) 00000-0000" />
              </div>
            </div>

            {/* Endereço */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Endereço</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>CEP *</Label>
                <div className="relative">
                  <Input value={cep} onChange={(e) => setCep(mascaraCEP(e.target.value))} placeholder="00000-000" maxLength={9} />
                  {buscandoCEP && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Logradouro *</Label>
                <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} placeholder="Rua, Av, etc." />
              </div>
              <div>
                <Label>Número *</Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Complemento</Label>
                <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} />
              </div>
              <div>
                <Label>Bairro *</Label>
                <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Município *</Label>
                <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
              </div>
              <div>
                <Label>UF *</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Código Município IBGE</Label>
                <Input value={codigoMunicipio} onChange={(e) => setCodigoMunicipio(e.target.value)} placeholder="3550308" />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} placeholder="Observações internas sobre o cliente" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <Label htmlFor="clienteAtivo" className="text-sm font-medium">Cliente Ativo</Label>
                <p className="text-[11px] text-muted-foreground">Inative para ocultar o cliente sem perder o histórico</p>
              </div>
              <Switch
                id="clienteAtivo"
                checked={clienteAtivo}
                onCheckedChange={setClienteAtivo}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvando || !nomeRazao.trim()} className="min-w-[150px]">
              {salvando ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
