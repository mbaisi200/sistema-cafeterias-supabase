'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  UserCheck,
  UserX,
  Key,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
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

export function FuncionariosTab() {
  const { empresaId } = useAuth();
  const supabase = getSupabaseClient();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [telefoneValue, setTelefoneValue] = useState('');
  const [editandoFuncionario, setEditandoFuncionario] = useState<Funcionario | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    cargo: '',
    email: '',
    telefone: '',
    pin: '',
    perm_pdv: true,
    perm_pdv_garcom: true,
    perm_estoque: false,
    perm_financeiro: false,
    perm_relatorios: false,
    perm_cancelar_venda: false,
    perm_dar_desconto: false,
    ativo: true,
  });

  useEffect(() => {
    if (empresaId) {
      loadFuncionarios();
    }
  }, [empresaId]);

  const loadFuncionarios = async () => {
    if (!supabase || !empresaId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');
    
    if (error) {
      toast.error('Erro ao carregar funcionários');
    } else {
      setFuncionarios(data || []);
    }
    setLoading(false);
  };

  const filteredFuncionarios = funcionarios.filter(f =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    f.cargo?.toLowerCase().includes(search.toLowerCase()) ||
    f.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (funcionario?: Funcionario) => {
    if (funcionario) {
      setEditandoFuncionario(funcionario);
      setFormData({
        nome: funcionarios.nome || '',
        cargo: funcionarios.cargo || '',
        email: funcionarios.email || '',
        telefone: funcionarios.telefone || '',
        pin: funcionarios.pin || '',
        perm_pdv: funcionarios.perm_pdv ?? true,
        perm_pdv_garcom: funcionarios.perm_pdv_garcom ?? true,
        perm_estoque: funcionarios.perm_estoque ?? false,
        perm_financeiro: funcionarios.perm_financeiro ?? false,
        perm_relatorios: funcionarios.perm_relatorios ?? false,
        perm_cancelar_venda: funcionarios.perm_cancelar_venda ?? false,
        perm_dar_desconto: funcionarios.perm_dar_desconto ?? false,
        ativo: funcionarios.ativo ?? true,
      });
      setTelefoneValue(funcionarios.telefone || '');
    } else {
      setEditandoFuncionario(null);
      const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
      setFormData({
        nome: '',
        cargo: '',
        email: '',
        telefone: '',
        pin: randomPin,
        perm_pdv: true,
        perm_pdv_garcom: true,
        perm_estoque: false,
        perm_financeiro: false,
        perm_relatorios: false,
        perm_cancelar_venda: false,
        perm_dar_desconto: false,
        ativo: true,
      });
      setTelefoneValue('');
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!supabase || !empresaId) return;
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.cargo.trim()) {
      toast.error('Cargo é obrigatório');
      return;
    }

    setSaving(true);

    const payload = {
      ...formData,
      empresa_id: empresaId,
      telefone: telefoneValue,
    };

    let error;
    if (editandoFuncionario) {
      ({ error } = await supabase
        .from('funcionarios')
        .update(payload)
        .eq('id', editandoFuncionario.id));
    } else {
      ({ error } = await supabase
        .from('funcionarios')
        .insert([payload]));
    }

    setSaving(false);

    if (error) {
      toast.error('Erro ao salvar funcionário: ' + error.message);
    } else {
      toast.success(editandoFuncionario ? 'Funcionário atualizado!' : 'Funcionário cadastrado!');
      setDialogOpen(false);
      loadFuncionarios();
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('funcionarios')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir funcionário');
    } else {
      toast.success('Funcionário excluído');
      loadFuncionarios();
    }
  };

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    toast.success('PIN copiado!');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar funcionários..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Funcionário
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredFuncionarios.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum funcionário encontrado
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFuncionarios.map((func) => (
                <TableRow key={func.id}>
                  <TableCell className="font-medium">{func.nome}</TableCell>
                  <TableCell>{func.cargo}</TableCell>
                  <TableCell>{func.email || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {func.pin}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyPin(func.pin)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={func.ativo ? 'default' : 'secondary'}>
                      {func.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleOpenDialog(func)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(func.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do funcionário
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo *</Label>
                <Input
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  placeholder="Ex: Garçom, Caixa"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefoneValue}
                  onChange={(e) => setTelefoneValue(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN de Acesso</Label>
              <div className="flex gap-2">
                <Input
                  id="pin"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  placeholder="4 dígitos"
                  maxLength={4}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                    setFormData({ ...formData, pin: randomPin });
                  }}
                >
                  <Key className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <Label>Permissões</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="perm_pdv" className="cursor-pointer">PDV</Label>
                  <Switch
                    id="perm_pdv"
                    checked={formData.perm_pdv}
                    onCheckedChange={(checked) => setFormData({ ...formData, perm_pdv: checked })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="perm_pdv_garcom" className="cursor-pointer">PDV Garçon</Label>
                  <Switch
                    id="perm_pdv_garcom"
                    checked={formData.perm_pdv_garcom}
                    onCheckedChange={(checked) => setFormData({ ...formData, perm_pdv_garcom: checked })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="perm_estoque" className="cursor-pointer">Estoque</Label>
                  <Switch
                    id="perm_estoque"
                    checked={formData.perm_estoque}
                    onCheckedChange={(checked) => setFormData({ ...formData, perm_estoque: checked })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="perm_financeiro" className="cursor-pointer">Financeiro</Label>
                  <Switch
                    id="perm_financeiro"
                    checked={formData.perm_financeiro}
                    onCheckedChange={(checked) => setFormData({ ...formData, perm_financeiro: checked })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="perm_relatorios" className="cursor-pointer">Relatórios</Label>
                  <Switch
                    id="perm_relatorios"
                    checked={formData.perm_relatorios}
                    onCheckedChange={(checked) => setFormData({ ...formData, perm_relatorios: checked })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="perm_cancelar_venda" className="cursor-pointer">Cancelar Venda</Label>
                  <Switch
                    id="perm_cancelar_venda"
                    checked={formData.perm_cancelar_venda}
                    onCheckedChange={(checked) => setFormData({ ...formData, perm_cancelar_venda: checked })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="perm_dar_desconto" className="cursor-pointer">Dar Desconto</Label>
                  <Switch
                    id="perm_dar_desconto"
                    checked={formData.perm_dar_desconto}
                    onCheckedChange={(checked) => setFormData({ ...formData, perm_dar_desconto: checked })}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label htmlFor="ativo" className="cursor-pointer">Funcionário ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editandoFuncionario ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}