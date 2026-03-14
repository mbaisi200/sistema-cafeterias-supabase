'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
import { useEmpresas } from '@/hooks/useFirestore';
import { getSupabaseClient } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Eye,
  Ban,
  CheckCircle,
  Loader2,
  UserPlus,
  Building2,
  KeyRound,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { maskCNPJ, maskPhone, unmask } from '@/lib/masks';

interface Cliente {
  id: string;
  nome: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  plano?: string;
  status?: string;
  adminNome?: string;
  adminEmail?: string;
  adminId?: string;
}

export default function ClientesPage() {
  const { empresas, loading, adicionarEmpresa, atualizarEmpresa } = useEmpresas();
  const [search, setSearch] = useState('');
  const [planoFilter, setPlanoFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteComAdmin, setClienteComAdmin] = useState<Cliente[]>([]);
  const { toast } = useToast();

  // Estados controlados para máscaras
  const [cnpjValue, setCnpjValue] = useState('');
  const [telefoneValue, setTelefoneValue] = useState('');

  // Estados para edição
  const [editCnpjValue, setEditCnpjValue] = useState('');
  const [editTelefoneValue, setEditTelefoneValue] = useState('');

  // Carregar dados dos admins das empresas
  useEffect(() => {
    const carregarAdmins = async () => {
      if (empresas.length === 0) return;

      try {
        const supabase = getSupabaseClient();
        
        const { data: usuarios, error } = await supabase
          .from('usuarios')
          .select('id, nome, email, empresa_id')
          .eq('role', 'admin');
        
        if (error) throw error;
        
        const adminsMap: Record<string, { nome: string; email: string; id: string }> = {};
        usuarios?.forEach((usuario) => {
          if (usuario.empresa_id) {
            adminsMap[usuario.empresa_id] = {
              nome: usuario.nome || '',
              email: usuario.email || '',
              id: usuario.id,
            };
          }
        });

        const empresasComAdmin = empresas.map(empresa => ({
          ...empresa,
          adminNome: adminsMap[empresa.id]?.nome || 'Não encontrado',
          adminEmail: adminsMap[empresa.id]?.email || 'Não encontrado',
          adminId: adminsMap[empresa.id]?.id || null,
        }));

        setClienteComAdmin(empresasComAdmin);
      } catch (error) {
        console.error('Erro ao carregar admins:', error);
        setClienteComAdmin(empresas);
      }
    };

    carregarAdmins();
  }, [empresas]);

  const filteredClientes = clienteComAdmin.filter(cliente => {
    const matchSearch = cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
                       (cliente.cnpj && cliente.cnpj.includes(search)) ||
                       (cliente.adminEmail && cliente.adminEmail.toLowerCase().includes(search.toLowerCase()));
    const matchPlano = planoFilter === 'all' || cliente.plano === planoFilter;
    const matchStatus = statusFilter === 'all' || cliente.status === statusFilter;
    return matchSearch && matchPlano && matchStatus;
  });

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const empresaId = await adicionarEmpresa({
        nome: formData.get('nome') as string,
        cnpj: unmask(cnpjValue),
        email: formData.get('email') as string,
        telefone: unmask(telefoneValue),
        cidade: formData.get('cidade') as string,
        estado: formData.get('estado') as string,
        plano: formData.get('plano') as string,
      });

      const adminNome = formData.get('admin_nome') as string;
      const adminEmail = formData.get('admin_email') as string;
      const adminSenha = formData.get('admin_senha') as string;

      const supabase = getSupabaseClient();

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminSenha,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Criar registro na tabela usuarios
        const { error: userError } = await supabase
          .from('usuarios')
          .insert({
            id: authData.user.id,
            auth_user_id: authData.user.id,
            email: adminEmail,
            nome: adminNome,
            role: 'admin',
            empresa_id: empresaId,
            ativo: true,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          });

        if (userError) throw userError;
      }

      toast({
        title: 'Cliente cadastrado com sucesso!',
        description: `Empresa e usuário admin criados. O admin pode logar com o email ${adminEmail}`,
      });

      setDialogOpen(false);
      setCnpjValue('');
      setTelefoneValue('');
      
    } catch (error: unknown) {
      console.error('Erro ao salvar cliente:', error);
      let mensagem = 'Erro ao cadastrar cliente';
      if (error instanceof Error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          mensagem = 'Este email já está cadastrado no sistema';
        } else {
          mensagem = error.message;
        }
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar',
        description: mensagem,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCliente) return;
    
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      await atualizarEmpresa(selectedCliente.id, {
        nome: formData.get('nome') as string,
        cnpj: unmask(editCnpjValue),
        email: formData.get('email') as string,
        telefone: unmask(editTelefoneValue),
        cidade: formData.get('cidade') as string,
        estado: formData.get('estado') as string,
        plano: formData.get('plano') as string,
      });

      // Atualizar nome do admin se necessário
      const novoAdminNome = formData.get('admin_nome') as string;
      if (novoAdminNome && selectedCliente.adminId && novoAdminNome !== selectedCliente.adminNome) {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('usuarios')
          .update({
            nome: novoAdminNome,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', selectedCliente.adminId);

        if (error) throw error;
      }

      toast({
        title: 'Cliente atualizado com sucesso!',
        description: 'Os dados foram salvos.',
      });

      setEditDialogOpen(false);
      
    } catch (error: unknown) {
      console.error('Erro ao editar cliente:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao editar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setEditCnpjValue(formatCNPJ(cliente.cnpj || ''));
    setEditTelefoneValue(formatPhone(cliente.telefone || ''));
    setEditDialogOpen(true);
  };

  const openViewDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setViewDialogOpen(true);
  };

  const openResetPasswordDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setNewPassword('');
    setConfirmPassword('');
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedCliente?.adminId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'ID do administrador não encontrado',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'As senhas não coincidem',
      });
      return;
    }

    setResettingPassword(true);

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: selectedCliente.adminId,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao redefinir senha');
      }

      toast({
        title: 'Senha alterada!',
        description: `A senha do administrador ${selectedCliente.adminNome} foi alterada com sucesso.`,
      });

      setResetPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: unknown) {
      console.error('Erro ao redefinir senha:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao redefinir senha',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setResettingPassword(false);
    }
  };



  const planoCores: Record<string, string> = {
    basico: 'bg-gray-500',
    profissional: 'bg-blue-500',
    premium: 'bg-amber-500',
  };

  const statusCores: Record<string, string> = {
    ativo: 'bg-green-500',
    inativo: 'bg-yellow-500',
    bloqueado: 'bg-red-500',
  };

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return '';
    const numbers = cnpj.replace(/\D/g, '');
    if (numbers.length !== 14) return cnpj;
    return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (numbers.length === 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return phone;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['master']}>
        <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Clientes' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
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
          { title: 'Clientes' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Gestão de Clientes</h1>
              <p className="text-muted-foreground">
                Gerencie todas as empresas cadastradas no sistema
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setCnpjValue('');
                setTelefoneValue('');
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                  <DialogDescription>
                    Preencha os dados da empresa e do administrador
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSalvar}>
                  <div className="space-y-6 py-4">
                    {/* Dados da Empresa */}
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        📋 Dados da Empresa
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nome">Nome da Empresa *</Label>
                          <Input id="nome" name="nome" placeholder="Ex: Café Central" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cnpj">CNPJ</Label>
                          <Input 
                            id="cnpj" 
                            name="cnpj" 
                            placeholder="00.000.000/0000-00"
                            value={cnpjValue}
                            onChange={(e) => setCnpjValue(maskCNPJ(e.target.value))}
                            maxLength={18}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email da Empresa *</Label>
                          <Input id="email" name="email" type="email" placeholder="contato@empresa.com" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefone">Telefone</Label>
                          <Input 
                            id="telefone" 
                            name="telefone" 
                            placeholder="(00) 00000-0000"
                            value={telefoneValue}
                            onChange={(e) => setTelefoneValue(maskPhone(e.target.value))}
                            maxLength={15}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cidade">Cidade</Label>
                          <Input id="cidade" name="cidade" placeholder="São Paulo" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="estado">Estado</Label>
                          <Select name="estado">
                            <SelectTrigger>
                              <SelectValue placeholder="UF" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SP">São Paulo</SelectItem>
                              <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                              <SelectItem value="MG">Minas Gerais</SelectItem>
                              <SelectItem value="PR">Paraná</SelectItem>
                              <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="plano">Plano *</Label>
                          <Select name="plano" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basico">Básico</SelectItem>
                              <SelectItem value="profissional">Profissional</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Dados do Administrador */}
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Dados do Administrador
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Este usuário terá acesso completo ao painel administrativo da empresa.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="admin_nome">Nome do Administrador *</Label>
                          <Input id="admin_nome" name="admin_nome" placeholder="Ex: João Silva" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="admin_email">Email do Administrador *</Label>
                          <Input id="admin_email" name="admin_email" type="email" placeholder="admin@empresa.com" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="admin_senha">Senha *</Label>
                          <Input id="admin_senha" name="admin_senha" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="admin_senha_conf">Confirmar Senha *</Label>
                          <Input id="admin_senha_conf" name="admin_senha_conf" type="password" placeholder="Repita a senha" required minLength={6} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => {
                      setDialogOpen(false);
                      setCnpjValue('');
                      setTelefoneValue('');
                    }}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Cadastrar Cliente
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, CNPJ ou email do admin..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={planoFilter} onValueChange={setPlanoFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Planos</SelectItem>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {filteredClientes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Search className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum cliente encontrado</p>
                <p className="text-sm text-muted-foreground">Clique em "Novo Cliente" para adicionar</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Clientes ({filteredClientes.length})</CardTitle>
                <CardDescription>
                  Lista de todas as empresas cadastradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientes.map((cliente) => (
                        <TableRow key={cliente.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold">
                                {cliente.nome.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{cliente.nome}</p>
                                <p className="text-sm text-muted-foreground">{cliente.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{cliente.adminNome}</p>
                              <p className="text-sm text-muted-foreground">{cliente.adminEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>{cliente.cidade || '-'}/{cliente.estado || '-'}</TableCell>
                          <TableCell>
                            <Badge className={planoCores[cliente.plano] || 'bg-gray-500'}>
                              {cliente.plano?.charAt(0).toUpperCase() + cliente.plano?.slice(1) || 'Sem plano'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusCores[cliente.status] || 'bg-gray-500'}>
                              {cliente.status?.charAt(0).toUpperCase() + cliente.status?.slice(1) || 'Indefinido'}
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
                                <DropdownMenuItem onClick={() => openViewDialog(cliente)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(cliente)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openResetPasswordDialog(cliente)}>
                                  <KeyRound className="mr-2 h-4 w-4" />
                                  Redefinir Senha
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {cliente.status === 'ativo' ? (
                                  <DropdownMenuItem 
                                    className="text-yellow-600"
                                    onClick={() => atualizarEmpresa(cliente.id, { status: 'bloqueado' })}
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Bloquear
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    className="text-green-600"
                                    onClick={() => atualizarEmpresa(cliente.id, { status: 'ativo' })}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Ativar
                                  </DropdownMenuItem>
                                )}
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

        {/* Dialog Visualizar */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalhes do Cliente
              </DialogTitle>
            </DialogHeader>
            {selectedCliente && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedCliente.nome.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedCliente.nome}</h3>
                    <p className="text-muted-foreground">{selectedCliente.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">CNPJ</Label>
                    <p className="font-medium">{formatCNPJ(selectedCliente.cnpj || '') || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{formatPhone(selectedCliente.telefone || '') || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cidade</Label>
                    <p className="font-medium">{selectedCliente.cidade || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    <p className="font-medium">{selectedCliente.estado || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Plano</Label>
                    <p className="font-medium">
                      <Badge className={planoCores[selectedCliente.plano] || 'bg-gray-500'}>
                        {selectedCliente.plano?.charAt(0).toUpperCase() + selectedCliente.plano?.slice(1) || 'Sem plano'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="font-medium">
                      <Badge className={statusCores[selectedCliente.status] || 'bg-gray-500'}>
                        {selectedCliente.status?.charAt(0).toUpperCase() + selectedCliente.status?.slice(1) || 'Indefinido'}
                      </Badge>
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Administrador
                  </Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="font-medium">{selectedCliente.adminNome}</p>
                    <p className="text-sm text-muted-foreground">{selectedCliente.adminEmail}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Fechar
              </Button>
              <Button onClick={() => {
                setViewDialogOpen(false);
                if (selectedCliente) openEditDialog(selectedCliente);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Editar */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Cliente
              </DialogTitle>
              <DialogDescription>
                Altere os dados da empresa e do administrador
              </DialogDescription>
            </DialogHeader>
            {selectedCliente && (
              <form onSubmit={handleEditar}>
                <div className="space-y-6 py-4">
                  {/* Dados da Empresa */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Dados da Empresa
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_nome">Nome da Empresa *</Label>
                        <Input 
                          id="edit_nome" 
                          name="nome" 
                          defaultValue={selectedCliente.nome}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_cnpj">CNPJ</Label>
                        <Input 
                          id="edit_cnpj" 
                          name="cnpj" 
                          placeholder="00.000.000/0000-00"
                          value={editCnpjValue}
                          onChange={(e) => setEditCnpjValue(maskCNPJ(e.target.value))}
                          maxLength={18}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_email">Email da Empresa *</Label>
                        <Input 
                          id="edit_email" 
                          name="email" 
                          type="email" 
                          defaultValue={selectedCliente.email}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_telefone">Telefone</Label>
                        <Input 
                          id="edit_telefone" 
                          name="telefone" 
                          placeholder="(00) 00000-0000"
                          value={editTelefoneValue}
                          onChange={(e) => setEditTelefoneValue(maskPhone(e.target.value))}
                          maxLength={15}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_cidade">Cidade</Label>
                        <Input 
                          id="edit_cidade" 
                          name="cidade" 
                          defaultValue={selectedCliente.cidade}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_estado">Estado</Label>
                        <Select name="estado" defaultValue={selectedCliente.estado}>
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SP">São Paulo</SelectItem>
                            <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                            <SelectItem value="MG">Minas Gerais</SelectItem>
                            <SelectItem value="PR">Paraná</SelectItem>
                            <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_plano">Plano *</Label>
                        <Select name="plano" required defaultValue={selectedCliente.plano}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basico">Básico</SelectItem>
                            <SelectItem value="profissional">Profissional</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Dados do Administrador */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Dados do Administrador
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_admin_nome">Nome do Administrador</Label>
                        <Input 
                          id="edit_admin_nome" 
                          name="admin_nome" 
                          defaultValue={selectedCliente.adminNome !== 'Não encontrado' ? selectedCliente.adminNome : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_admin_email">Email do Administrador</Label>
                        <Input 
                          id="edit_admin_email" 
                          name="admin_email" 
                          type="email" 
                          value={selectedCliente.adminEmail}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Para alterar a senha, use a opção &quot;Redefinir Senha&quot; no menu de ações do cliente.
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar Alterações
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog Redefinir Senha */}
        <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Redefinir Senha do Administrador
              </DialogTitle>
              <DialogDescription>
                Digite a nova senha para o administrador
              </DialogDescription>
            </DialogHeader>
            {selectedCliente && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{selectedCliente.adminNome}</p>
                  <p className="text-sm text-muted-foreground">{selectedCliente.adminEmail}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">Nova Senha *</Label>
                  <Input
                    id="new_password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirmar Senha *</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setResetPasswordDialogOpen(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleResetPassword}
                disabled={resettingPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              >
                {resettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Redefinir Senha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </MainLayout>
    </ProtectedRoute>
  );
}
