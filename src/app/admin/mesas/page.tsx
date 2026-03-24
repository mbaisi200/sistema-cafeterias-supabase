'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useMesas } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import {
  Plus,
  UtensilsCrossed,
  Users,
  CircleDot,
  Loader2,
  Edit,
  Trash2,
  Unlock,
} from 'lucide-react';

type StatusMesa = 'livre' | 'ocupada' | 'reservada' | 'manutencao';

interface Mesa {
  id: string;
  numero: number;
  capacidade: number;
  status: StatusMesa;
}

const statusConfig: Record<StatusMesa, { label: string; color: string; bgColor: string }> = {
  livre: { label: 'Livre', color: 'text-green-600', bgColor: 'bg-green-100 border-green-300' },
  ocupada: { label: 'Ocupada', color: 'text-red-600', bgColor: 'bg-red-100 border-red-300' },
  reservada: { label: 'Reservada', color: 'text-blue-600', bgColor: 'bg-blue-100 border-blue-300' },
  manutencao: { label: 'Manutenção', color: 'text-yellow-600', bgColor: 'bg-yellow-100 border-yellow-300' },
};

export default function MesasPage() {
  const { mesas, loading, adicionarMesa, atualizarMesa, excluirMesa } = useMesas();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoMesa, setEditandoMesa] = useState<Mesa | null>(null);
  const [excluindoMesa, setExcluindoMesa] = useState<Mesa | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  const filteredMesas = mesas.filter(mesa => 
    statusFilter === 'all' || mesa.status === statusFilter
  );

  const stats = {
    total: mesas.length,
    livres: mesas.filter(m => m.status === 'livre').length,
    ocupadas: mesas.filter(m => m.status === 'ocupada').length,
    reservadas: mesas.filter(m => m.status === 'reservada').length,
    manutencao: mesas.filter(m => m.status === 'manutencao').length,
  };

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      if (editandoMesa) {
        // Modo edição
        await atualizarMesa(editandoMesa.id, {
          numero: parseInt(formData.get('numero') as string) || 0,
          capacidade: parseInt(formData.get('capacidade') as string) || 4,
          status: formData.get('status') as StatusMesa || 'livre',
        });
        toast({ title: 'Mesa atualizada!' });
      } else {
        // Modo criação
        await adicionarMesa({
          numero: parseInt(formData.get('numero') as string) || 0,
          capacidade: parseInt(formData.get('capacidade') as string) || 4,
          status: formData.get('status') as StatusMesa || 'livre',
        });
        toast({ title: 'Mesa cadastrada!' });
      }
      setDialogOpen(false);
      setEditandoMesa(null);
    } catch (error) {
      console.error('Erro ao salvar mesa:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar mesa' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (mesa: Mesa) => {
    setEditandoMesa(mesa);
    setDialogOpen(true);
  };

  const handleExcluir = async () => {
    if (!excluindoMesa) return;
    
    try {
      await excluirMesa(excluindoMesa.id);
      toast({ title: 'Mesa excluída!' });
      setExcluindoMesa(null);
    } catch (error) {
      console.error('Erro ao excluir mesa:', error);
      toast({ variant: 'destructive', title: 'Erro ao excluir mesa' });
    }
  };

  const handleLiberarMesa = async (mesa: Mesa) => {
    try {
      await atualizarMesa(mesa.id, { status: 'livre' });
      toast({ title: `Mesa ${mesa.numero} liberada!` });
    } catch (error) {
      console.error('Erro ao liberar mesa:', error);
      toast({ variant: 'destructive', title: 'Erro ao liberar mesa' });
    }
  };

  const abrirNovo = () => {
    setEditandoMesa(null);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Mesas' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
          { title: 'Mesas' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Mesas</h1>
              <p className="text-muted-foreground">
                Gerencie as mesas do seu estabelecimento
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setEditandoMesa(null);
            }}>
              <DialogTrigger asChild>
                <Button onClick={abrirNovo} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Mesa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editandoMesa ? 'Editar Mesa' : 'Cadastrar Mesa'}
                  </DialogTitle>
                  <DialogDescription>
                    {editandoMesa 
                      ? 'Atualize os dados da mesa'
                      : 'Adicione uma nova mesa ao estabelecimento'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSalvar}>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="numero">Número da Mesa</Label>
                        <Input 
                          id="numero" 
                          name="numero" 
                          type="number" 
                          placeholder="Ex: 1" 
                          required 
                          defaultValue={editandoMesa?.numero || ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="capacidade">Capacidade</Label>
                        <Input 
                          id="capacidade" 
                          name="capacidade" 
                          type="number" 
                          placeholder="Ex: 4" 
                          required 
                          defaultValue={editandoMesa?.capacidade || ''}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue={editandoMesa?.status || 'livre'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="livre">Livre</SelectItem>
                          <SelectItem value="ocupada">Ocupada</SelectItem>
                          <SelectItem value="reservada">Reservada</SelectItem>
                          <SelectItem value="manutencao">Manutenção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => {
                      setDialogOpen(false);
                      setEditandoMesa(null);
                    }}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {editandoMesa ? 'Salvar Alterações' : 'Cadastrar Mesa'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.livres}</p>
                  <p className="text-sm text-green-600">Livres</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.ocupadas}</p>
                  <p className="text-sm text-red-600">Ocupadas</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.reservadas}</p>
                  <p className="text-sm text-blue-600">Reservadas</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{stats.manutencao}</p>
                  <p className="text-sm text-yellow-600">Manutenção</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Mesas</SelectItem>
                    <SelectItem value="livre">Livres</SelectItem>
                    <SelectItem value="ocupada">Ocupadas</SelectItem>
                    <SelectItem value="reservada">Reservadas</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Mesas Grid */}
          {filteredMesas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <UtensilsCrossed className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhuma mesa cadastrada</p>
                <p className="text-sm text-muted-foreground">Clique em "Nova Mesa" para começar</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredMesas.map((mesa) => (
                <Card
                  key={mesa.id}
                  className={`transition-all hover:shadow-md ${statusConfig[mesa.status as StatusMesa]?.bgColor || ''}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-14 w-14 rounded-full bg-white border-2 flex items-center justify-center mb-2">
                        <UtensilsCrossed className={`h-7 w-7 ${statusConfig[mesa.status as StatusMesa]?.color || ''}`} />
                      </div>
                      <p className="text-xl font-bold">Mesa {mesa.numero}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Users className="h-3 w-3" />
                        <span>{mesa.capacidade} lugares</span>
                      </div>
                      <Badge
                        className={`mt-2 ${statusConfig[mesa.status as StatusMesa]?.color || ''} bg-white`}
                        variant="outline"
                      >
                        <CircleDot className="h-3 w-3 mr-1" />
                        {statusConfig[mesa.status as StatusMesa]?.label || 'Indefinido'}
                      </Badge>
                      
                      {/* Botões de Ação */}
                      <div className="flex gap-2 mt-4">
                        {mesa.status !== 'livre' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLiberarMesa(mesa)}
                            className="border-green-300 text-green-600 hover:bg-green-50"
                            title="Liberar mesa"
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditar(mesa)}
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          title="Editar mesa"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExcluindoMesa(mesa)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          title="Excluir mesa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={!!excluindoMesa} onOpenChange={() => setExcluindoMesa(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Mesa</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a <strong>Mesa {excluindoMesa?.numero}</strong>?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleExcluir}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
