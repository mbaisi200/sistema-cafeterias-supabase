'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  UserCheck,
  Mail,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';

interface Vendedor {
  id: string;
  nome: string;
  endereco: string;
  numero: string;
  cidade: string;
  estado: string;
  cep: string;
  email: string;
  ativo: boolean;
  empresa_id: string;
  criado_em?: string;
}

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function formatCEP(cep?: string) {
  if (!cep) return '-';
  const nums = cep.replace(/\D/g, '');
  if (nums.length === 8) {
    return nums.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }
  return cep;
}

export function VendedoresTab() {
  const { empresaId } = useAuth();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editandoVendedor, setEditandoVendedor] = useState<Vendedor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vendedor | null>(null);

  // Carregar vendedores do Supabase
  const loadVendedores = async () => {
    if (!empresaId) {
      setVendedores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('vendedores')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true });
      if (error) throw error;
      setVendedores(data || []);
    } catch (error: unknown) {
      console.error('Erro ao carregar vendedores:', error);
      toast.error('Erro ao carregar vendedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  // Filtrar vendedores
  const filteredVendedores = vendedores.filter(v => {
    const searchLower = search.toLowerCase();
    return (
      v.nome.toLowerCase().includes(searchLower) ||
      (v.email?.toLowerCase().includes(searchLower) ?? false) ||
      (v.cidade?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  // Estatísticas
  const totalVendedores = vendedores.length;
  const vendedoresComEmail = vendedores.filter(v => v.email).length;

  // Resetar formulário quando fechar dialog
  useEffect(() => {
    if (!dialogOpen) {
      setEditandoVendedor(null);
    }
  }, [dialogOpen]);

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const supabase = getSupabaseClient();

    try {
      if (!empresaId) {
        toast.error('Empresa não definida');
        setSaving(false);
        return;
      }

      const dados = {
        nome: formData.get('nome') as string,
        endereco: (formData.get('endereco') as string) || null,
        numero: (formData.get('numero') as string) || null,
        cidade: (formData.get('cidade') as string) || null,
        estado: (formData.get('estado') as string) || null,
        cep: (formData.get('cep') as string) || null,
        email: (formData.get('email') as string) || null,
        ativo: true,
        empresa_id: empresaId,
      };

      if (editandoVendedor) {
        const { error } = await supabase
          .from('vendedores')
          .update(dados)
          .eq('id', editandoVendedor.id);
        if (error) throw error;
        toast.success(`${dados.nome} foi atualizado com sucesso.`);
      } else {
        const { error } = await supabase
          .from('vendedores')
          .insert(dados);
        if (error) throw error;
        toast.success(`${dados.nome} foi adicionado com sucesso.`);
      }

      setDialogOpen(false);
      setEditandoVendedor(null);
      loadVendedores();
    } catch (error: unknown) {
      console.error('Erro ao salvar vendedor:', error);
      let mensagem = 'Erro ao salvar vendedor';
      if (error instanceof Error) {
        mensagem = error.message;
      }
      toast.error(mensagem);
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (vendedor: Vendedor) => {
    setEditandoVendedor(vendedor);
    setDialogOpen(true);
  };

  const handleNovo = () => {
    setEditandoVendedor(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (vendedor: Vendedor) => {
    setDeleteTarget(vendedor);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('vendedores')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success(`${deleteTarget.nome} foi removido com sucesso.`);
      loadVendedores();
    } catch (error) {
      toast.error('Não foi possível excluir o vendedor.');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Vendedores</h2>
          <p className="text-muted-foreground">
            Gerencie os vendedores do seu estabelecimento
          </p>
        </div>
        <Button onClick={handleNovo} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Novo Vendedor
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <UserCheck className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vendedores</p>
              <p className="text-2xl font-bold">{totalVendedores}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Mail className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Com Email</p>
              <p className="text-2xl font-bold text-purple-600">{vendedoresComEmail}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditandoVendedor(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoVendedor ? 'Editar Vendedor' : 'Novo Vendedor'}
            </DialogTitle>
            <DialogDescription>
              {editandoVendedor
                ? 'Atualize os dados do vendedor'
                : 'Preencha os dados do novo vendedor'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvar}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  name="nome"
                  placeholder="Nome do vendedor"
                  required
                  defaultValue={editandoVendedor?.nome || ''}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    defaultValue={editandoVendedor?.email || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    name="cep"
                    placeholder="00000-000"
                    defaultValue={editandoVendedor?.cep || ''}
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco" className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Endereço
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      id="endereco"
                      name="endereco"
                      placeholder="Rua, Avenida, etc."
                      defaultValue={editandoVendedor?.endereco || ''}
                    />
                  </div>
                  <Input
                    id="numero"
                    name="numero"
                    placeholder="Nº"
                    defaultValue={editandoVendedor?.numero || ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    placeholder="Cidade"
                    defaultValue={editandoVendedor?.cidade || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select name="estado" defaultValue={editandoVendedor?.estado || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BR.map(est => (
                        <SelectItem key={est} value={est}>{est}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setDialogOpen(false);
                  setEditandoVendedor(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editandoVendedor ? 'Salvar Alterações' : 'Cadastrar Vendedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Vendedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>?
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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {filteredVendedores.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <UserCheck className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum vendedor encontrado</p>
            <p className="text-sm text-muted-foreground">
              Clique em &quot;Novo Vendedor&quot; para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Vendedores ({filteredVendedores.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Cidade/UF</TableHead>
                    <TableHead className="hidden xl:table-cell">CEP</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-[80px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendedores.map((vendedor) => (
                    <TableRow key={vendedor.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0">
                            <UserCheck className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{vendedor.nome}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm truncate block max-w-[180px]">
                          {vendedor.email || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">
                          {[vendedor.cidade, vendedor.estado].filter(Boolean).join('/') || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-sm font-mono">
                          {formatCEP(vendedor.cep)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={vendedor.ativo ? 'bg-green-500' : 'bg-gray-500'}>
                          {vendedor.ativo ? 'Ativo' : 'Inativo'}
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
                            <DropdownMenuItem onClick={() => handleEditar(vendedor)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteClick(vendedor)}
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
  );
}
