'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { useFuncionarios } from '@/hooks/useFirestore';
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Loader2,
  UserCheck,
  UserX,
  Key,
  Copy,
  Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { maskPhone, unmask } from '@/lib/masks';
import { useAuth } from '@/contexts/AuthContext';

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  email?: string;
  telefone?: string;
  pin: string;
  perm_pdv?: boolean;
  perm_pdv_garcom?: boolean;
  perm_estoque?: boolean;
  perm_financeiro?: boolean;
  perm_relatorios?: boolean;
  perm_cancelar_venda?: boolean;
  perm_dar_desconto?: boolean;
  ativo: boolean;
}

export default function FuncionariosPage() {
  const { funcionarios, loading, adicionarFuncionario, atualizarFuncionario, excluirFuncionario } = useFuncionarios();
  const { user: currentUser, empresaId } = useAuth();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [telefoneValue, setTelefoneValue] = useState('');
  const [editandoFuncionario, setEditandoFuncionario] = useState<Funcionario | null>(null);
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Código da empresa (primeiros 8 caracteres do empresaId)
  useEffect(() => {
    if (empresaId) {
      setCodigoEmpresa(empresaId.substring(0, 8).toUpperCase());
    }
  }, [empresaId]);

  // Filtrar funcionários
  const filteredFuncionarios = funcionarios.filter(func => {
    const matchSearch = func.nome.toLowerCase().includes(search.toLowerCase()) ||
      (func.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      func.cargo.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = statusFilter === 'todos' || 
      (statusFilter === 'ativos' && func.ativo) ||
      (statusFilter === 'inativos' && !func.ativo);
    
    return matchSearch && matchStatus;
  });

  const contarPorStatus = {
    ativos: funcionarios.filter(f => f.ativo).length,
    inativos: funcionarios.filter(f => !f.ativo).length,
  };

  // Resetar formulário quando fechar dialog
  useEffect(() => {
    if (!dialogOpen) {
      setTelefoneValue('');
      setEditandoFuncionario(null);
    }
  }, [dialogOpen]);

  // Preencher formulário quando editar
  useEffect(() => {
    if (editandoFuncionario) {
      setTelefoneValue(editandoFuncionario.telefone || '');
    }
  }, [editandoFuncionario]);

  // Gerar PIN aleatório
  const gerarPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 4 dígitos
  };

  // Copiar código da empresa
  const copiarCodigoEmpresa = () => {
    navigator.clipboard.writeText(codigoEmpresa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Código copiado!' });
  };

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      // Validar PIN
      const pin = formData.get('pin') as string;
      if (!/^\d{4,6}$/.test(pin)) {
        toast({
          variant: 'destructive',
          title: 'PIN inválido',
          description: 'O PIN deve ter entre 4 e 6 dígitos numéricos.',
        });
        setSaving(false);
        return;
      }

      if (editandoFuncionario) {
        // Modo edição - atualizar funcionário existente
        await atualizarFuncionario(editandoFuncionario.id, {
          nome: formData.get('nome') as string,
          cargo: formData.get('cargo') as string,
          telefone: unmask(telefoneValue),
          pin: pin,
          perm_pdv: formData.get('perm_pdv') === 'on',
          perm_pdv_garcom: formData.get('perm_pdv_garcom') === 'on',
          perm_estoque: formData.get('perm_estoque') === 'on',
          perm_financeiro: formData.get('perm_financeiro') === 'on',
          perm_relatorios: formData.get('perm_relatorios') === 'on',
          perm_cancelar_venda: formData.get('perm_cancelar') === 'on',
          perm_dar_desconto: formData.get('perm_desconto') === 'on',
          ativo: formData.get('ativo') === 'on',
        });

        toast({
          title: 'Funcionário atualizado!',
          description: 'Os dados foram salvos com sucesso.',
        });
      } else {
        // Modo criação - criar novo funcionário SEM Firebase Auth
        if (!empresaId) {
          toast({
            variant: 'destructive',
            title: 'Erro de configuração',
            description: 'Seu usuário não está associado a uma empresa. Contate o administrador.',
          });
          setSaving(false);
          return;
        }

        // Criar documento do funcionário diretamente no Firestore
        await adicionarFuncionario({
          nome: formData.get('nome') as string,
          cargo: formData.get('cargo') as string,
          telefone: unmask(telefoneValue),
          pin: pin,
          perm_pdv: formData.get('perm_pdv') === 'on',
          perm_pdv_garcom: formData.get('perm_pdv_garcom') === 'on',
          perm_estoque: formData.get('perm_estoque') === 'on',
          perm_financeiro: formData.get('perm_financeiro') === 'on',
          perm_relatorios: formData.get('perm_relatorios') === 'on',
          perm_cancelar_venda: formData.get('perm_cancelar') === 'on',
          perm_dar_desconto: formData.get('perm_desconto') === 'on',
          ativo: formData.get('ativo') === 'on',
        });

        toast({
          title: 'Funcionário cadastrado!',
          description: `PIN de acesso: ${pin}. Anote e entregue ao funcionário.`,
        });
      }

      setDialogOpen(false);
      setTelefoneValue('');
      setEditandoFuncionario(null);
    } catch (error: unknown) {
      console.error('Erro ao salvar funcionário:', error);
      let mensagem = 'Erro ao salvar funcionário';
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

  const handleEditar = (funcionario: Funcionario) => {
    setEditandoFuncionario(funcionario);
    setDialogOpen(true);
  };

  const handleToggleAtivo = async (funcionario: Funcionario) => {
    try {
      await atualizarFuncionario(funcionario.id, { ativo: !funcionario.ativo });

      toast({
        title: funcionario.ativo ? 'Funcionário inativado' : 'Funcionário ativado',
        description: funcionario.ativo 
          ? 'O funcionário não poderá mais acessar o sistema.'
          : 'O funcionário pode acessar o sistema novamente.',
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
      });
    }
  };

  // Função para formatar telefone para exibição
  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (numbers.length === 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return phone;
  };

  // Mascarar PIN para exibição
  const maskPin = (pin: string) => {
    return '•'.repeat(pin.length);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Funcionários' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Admin' },
          { title: 'Funcionários' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Funcionários</h1>
              <p className="text-muted-foreground">
                Gerencie a equipe do seu estabelecimento
              </p>
            </div>
            
            {/* Código da Empresa */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Código da Empresa</p>
                    <p className="text-xl font-bold text-blue-800 tracking-wider">{codigoEmpresa}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copiarCodigoEmpresa}
                    className="border-blue-300 hover:bg-blue-100"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-blue-500 mt-2">
                  Compartilhe este código com seus funcionários para login
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Botão Novo Funcionário */}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditandoFuncionario(null);
              setTelefoneValue('');
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editandoFuncionario ? 'Editar Funcionário' : 'Cadastrar Funcionário'}
                </DialogTitle>
                <DialogDescription>
                  {editandoFuncionario 
                    ? 'Atualize os dados do funcionário'
                    : 'Cadastre um funcionário com PIN de acesso. Ele não precisa de email nem senha.'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSalvar}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome Completo</Label>
                      <Input 
                        id="nome" 
                        name="nome" 
                        placeholder="Nome do funcionário" 
                        required 
                        defaultValue={editandoFuncionario?.nome || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cargo">Cargo</Label>
                      <Input 
                        id="cargo" 
                        name="cargo" 
                        placeholder="Ex: Garçom, Atendente" 
                        required 
                        defaultValue={editandoFuncionario?.cargo || ''}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone (opcional)</Label>
                      <Input 
                        id="telefone" 
                        name="telefone" 
                        placeholder="(00) 00000-0000"
                        value={telefoneValue}
                        onChange={(e) => setTelefoneValue(maskPhone(e.target.value))}
                        maxLength={15}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (opcional)</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        placeholder="Para contato apenas" 
                        defaultValue={editandoFuncionario?.email || ''}
                      />
                    </div>
                  </div>

                  {/* Campo de PIN */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="pin" className="flex items-center gap-2 text-green-800">
                        <Key className="h-4 w-4" />
                        PIN de Acesso *
                      </Label>
                      {!editandoFuncionario && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const pinInput = document.getElementById('pin') as HTMLInputElement;
                            if (pinInput) {
                              pinInput.value = gerarPin();
                            }
                          }}
                        >
                          Gerar PIN
                        </Button>
                      )}
                    </div>
                    <Input 
                      id="pin" 
                      name="pin" 
                      type="text"
                      inputMode="numeric"
                      placeholder="4 a 6 dígitos" 
                      required 
                      minLength={4}
                      maxLength={6}
                      defaultValue={editandoFuncionario?.pin || ''}
                      className="text-center text-2xl tracking-widest bg-white"
                      onChange={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      }}
                    />
                    <p className="text-xs text-green-600 mt-2">
                      {editandoFuncionario 
                        ? 'Deixe o PIN atual para manter, ou altere para um novo.'
                        : 'Este PIN será usado pelo funcionário para fazer login no sistema.'
                      }
                    </p>
                  </div>
                    
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Permissões de Acesso
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_pdv" className="text-sm font-medium">Acesso ao PDV</Label>
                          <p className="text-[11px] text-muted-foreground">Ponto de venda completo (balcão, mesa, delivery)</p>
                        </div>
                        <Switch 
                          id="perm_pdv" 
                          name="perm_pdv" 
                          defaultChecked={editandoFuncionario?.perm_pdv ?? true}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_pdv_garcom" className="text-sm font-medium">PDV Garçon (Mobile)</Label>
                          <p className="text-[11px] text-muted-foreground">App mobile para garçons tirarem pedidos</p>
                        </div>
                        <Switch 
                          id="perm_pdv_garcom" 
                          name="perm_pdv_garcom"
                          defaultChecked={editandoFuncionario?.perm_pdv_garcom ?? false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_estoque" className="text-sm font-medium">Controle de Estoque</Label>
                          <p className="text-[11px] text-muted-foreground">Gerenciar entradas, saídas e saldos</p>
                        </div>
                        <Switch 
                          id="perm_estoque" 
                          name="perm_estoque"
                          defaultChecked={editandoFuncionario?.perm_estoque ?? false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_financeiro" className="text-sm font-medium">Área Financeira</Label>
                          <p className="text-[11px] text-muted-foreground">Contas a pagar/receber e fluxo de caixa</p>
                        </div>
                        <Switch 
                          id="perm_financeiro" 
                          name="perm_financeiro"
                          defaultChecked={editandoFuncionario?.perm_financeiro ?? false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_relatorios" className="text-sm font-medium">Relatórios</Label>
                          <p className="text-[11px] text-muted-foreground">Acessar relatórios de vendas e BI</p>
                        </div>
                        <Switch 
                          id="perm_relatorios" 
                          name="perm_relatorios"
                          defaultChecked={editandoFuncionario?.perm_relatorios ?? false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_cancelar" className="text-sm font-medium">Cancelar Vendas</Label>
                          <p className="text-[11px] text-muted-foreground">Permite cancelar vendas já realizadas</p>
                        </div>
                        <Switch 
                          id="perm_cancelar" 
                          name="perm_cancelar"
                          defaultChecked={editandoFuncionario?.perm_cancelar_venda ?? false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_desconto" className="text-sm font-medium">Dar Descontos</Label>
                          <p className="text-[11px] text-muted-foreground">Aplicar descontos em itens do pedido</p>
                        </div>
                        <Switch 
                          id="perm_desconto" 
                          name="perm_desconto"
                          defaultChecked={editandoFuncionario?.perm_dar_desconto ?? false}
                        />
                      </div>
                    </div>
                  </div>
                    
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="ativo" 
                      name="ativo" 
                      defaultChecked={editandoFuncionario?.ativo ?? true}
                    />
                    <Label htmlFor="ativo">Funcionário Ativo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => {
                    setDialogOpen(false);
                    setEditandoFuncionario(null);
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editandoFuncionario ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, cargo..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === 'todos' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('todos')}
                    className={statusFilter === 'todos' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  >
                    Todos ({funcionarios.length})
                  </Button>
                  <Button
                    variant={statusFilter === 'ativos' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('ativos')}
                    className={statusFilter === 'ativos' ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Ativos ({contarPorStatus.ativos})
                  </Button>
                  <Button
                    variant={statusFilter === 'inativos' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('inativos')}
                    className={statusFilter === 'inativos' ? 'bg-gray-500 hover:bg-gray-600' : ''}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Inativos ({contarPorStatus.inativos})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {filteredFuncionarios.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Shield className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum funcionário encontrado</p>
                <p className="text-sm text-muted-foreground">Clique em "Novo Funcionário" para começar</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Funcionários ({filteredFuncionarios.length})</CardTitle>
                <CardDescription>
                  Funcionários acessam o sistema com código da empresa + PIN
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead className="hidden md:table-cell">Contato</TableHead>
                        <TableHead>PIN</TableHead>
                        <TableHead className="hidden lg:table-cell">Permissões</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFuncionarios.map((func) => (
                        <TableRow key={func.id} className={!func.ativo ? 'opacity-60' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold">
                                {func.nome.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{func.nome}</p>
                                {func.email && (
                                  <p className="text-sm text-muted-foreground">{func.email}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{func.cargo}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{formatPhone(func.telefone || '')}</TableCell>
                          <TableCell>
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {maskPin(func.pin || '----')}
                            </code>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {func.perm_pdv && <Badge variant="secondary" className="text-xs">PDV</Badge>}
                              {func.perm_pdv_garcom && <Badge variant="secondary" className="text-xs">PDV Garçon</Badge>}
                              {func.perm_estoque && <Badge variant="secondary" className="text-xs">Estoque</Badge>}
                              {func.perm_financeiro && <Badge variant="secondary" className="text-xs">Financeiro</Badge>}
                              {func.perm_relatorios && <Badge variant="secondary" className="text-xs">Relatórios</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={func.ativo ? 'bg-green-500' : 'bg-gray-500'}>
                              {func.ativo ? 'Ativo' : 'Inativo'}
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
                                <DropdownMenuItem onClick={() => handleEditar(func)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleAtivo(func)}>
                                  {func.ativo ? (
                                    <>
                                      <UserX className="mr-2 h-4 w-4" />
                                      Inativar
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Ativar
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => excluirFuncionario(func.id)}
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
