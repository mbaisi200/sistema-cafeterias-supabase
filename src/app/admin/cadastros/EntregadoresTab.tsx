'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
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
  Bike,
  Car,
  Footprints,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Entregador {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  veiculo: string;
  placa: string | null;
  ativo: boolean;
  observacao: string | null;
  criado_em: string;
}

const VEICULO_OPCOES = [
  { value: 'moto', label: 'Moto', icon: Bike },
  { value: 'carro', label: 'Carro', icon: Car },
  { value: 'bicicleta', label: 'Bicicleta', icon: Footprints },
  { value: 'outro', label: 'Outro', icon: Bike },
];

const VEICULO_LABELS: Record<string, string> = {
  moto: 'Moto',
  carro: 'Carro',
  bicicleta: 'Bicicleta',
  outro: 'Outro',
};

function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function EntregadoresTab() {
  const { empresaId } = useAuth();
  const supabase = getSupabaseClient();

  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<Entregador | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    veiculo: 'moto',
    placa: '',
    observacao: '',
  });

  const carregar = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('entregadores')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');
      if (data) setEntregadores(data as Entregador[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [empresaId]);

  const abrirDialog = (item?: Entregador) => {
    if (item) {
      setEditando(item);
      setFormData({
        nome: item.nome,
        telefone: item.telefone || '',
        cpf: item.cpf || '',
        veiculo: item.veiculo || 'moto',
        placa: item.placa || '',
        observacao: item.observacao || '',
      });
    } else {
      setEditando(null);
      setFormData({ nome: '', telefone: '', cpf: '', veiculo: 'moto', placa: '', observacao: '' });
    }
    setDialogOpen(true);
  };

  const salvar = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: formData.nome.trim(),
        telefone: formData.telefone,
        cpf: formData.cpf,
        veiculo: formData.veiculo,
        placa: formData.placa.toUpperCase(),
        observacao: formData.observacao,
      };

      if (editando) {
        const res = await fetch('/api/entregadores', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editando.id, ...payload }),
        });
        const json = await res.json();
        if (!json.sucesso) throw new Error(json.erro?.mensagem || 'Erro ao salvar');
        toast.success('Entregador atualizado');
      } else {
        const res = await fetch('/api/entregadores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.sucesso) throw new Error(json.erro?.mensagem || 'Erro ao salvar');
        toast.success('Entregador cadastrado');
      }

      setDialogOpen(false);
      carregar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const alternarAtivo = async (item: Entregador) => {
    try {
      const res = await fetch('/api/entregadores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, ativo: !item.ativo }),
      });
      const json = await res.json();
      if (!json.sucesso) throw new Error(json.erro?.mensagem);
      toast.success(item.ativo ? 'Entregador inativado' : 'Entregador ativado');
      carregar();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const excluir = async (id: string) => {
    try {
      const res = await fetch(`/api/entregadores?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.sucesso) throw new Error(json.erro?.mensagem);
      toast.success('Entregador excluído');
      carregar();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtrados = entregadores.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    (e.telefone || '').includes(search)
  );

  const VeiculoIcon = (veiculo: string) => {
    const opcao = VEICULO_OPCOES.find(o => o.value === veiculo);
    const Icon = opcao?.icon || Bike;
    return <Icon className="h-3.5 w-3.5" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Entregadores</CardTitle>
          <Button size="sm" onClick={() => abrirDialog()}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar entregador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bike className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum entregador encontrado</p>
          </div>
        ) : (
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Nome</TableHead>
                <TableHead className="w-32">Telefone</TableHead>
                <TableHead className="w-24">Veículo</TableHead>
                <TableHead className="w-20">Placa</TableHead>
                <TableHead className="w-20 text-center">Status</TableHead>
                <TableHead className="w-16 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="truncate font-medium" title={item.nome}>{item.nome}</TableCell>
                  <TableCell className="whitespace-nowrap">{item.telefone || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      {VeiculoIcon(item.veiculo)}
                      {VEICULO_LABELS[item.veiculo] || item.veiculo}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap uppercase">{item.placa || '-'}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <Badge variant={item.ativo ? 'default' : 'secondary'} className={item.ativo ? 'bg-emerald-600' : ''}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirDialog(item)}>
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alternarAtivo(item)}>
                          {item.ativo ? 'Inativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => excluir(item.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Entregador' : 'Novo Entregador'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome do entregador"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData(p => ({ ...p, telefone: formatTelefone(e.target.value) }))}
                  placeholder="(11) 99999-8888"
                />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData(p => ({ ...p, cpf: formatCpf(e.target.value) }))}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Veículo</Label>
                <Select value={formData.veiculo} onValueChange={(v) => setFormData(p => ({ ...p, veiculo: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEICULO_OPCOES.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Placa</Label>
                <Input
                  value={formData.placa}
                  onChange={(e) => setFormData(p => ({ ...p, placa: e.target.value }))}
                  placeholder="ABC-1234"
                  maxLength={8}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={formData.observacao}
                onChange={(e) => setFormData(p => ({ ...p, observacao: e.target.value }))}
                placeholder="Observações..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editando ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
