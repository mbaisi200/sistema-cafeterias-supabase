'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Monitor,
  MoreHorizontal,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  UserCheck,
  UserX,
  RefreshCw,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

interface Dispositivo {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  device_id: string;
  device_name: string | null;
  user_agent: string | null;
  ip_address: string | null;
  ativo: boolean;
  ultimo_acesso: string;
  criado_em: string;
  atualizado_em: string;
}

export default function DispositivosPage() {
  const { empresaId, role } = useAuth();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [devices, setDevices] = useState<Dispositivo[]>([]);
  const [restringir, setRestringir] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDevices = async () => {
    if (!empresaId) return;
    try {
      setLoading(true);
      const response = await fetch('/api/dispositivos');
      if (!response.ok) throw new Error('Erro ao buscar dispositivos');
      const data = await response.json();
      setDevices(data.devices || []);
      setRestringir(data.restringir || false);
    } catch (error) {
      console.error('Erro ao buscar dispositivos:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os dispositivos.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [empresaId]);

  const handleToggleRestringir = async (value: boolean) => {
    setSavingConfig(true);
    try {
      const response = await fetch('/api/dispositivos/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restringir: value }),
      });
      const data = await response.json();
      if (response.ok) {
        setRestringir(data.restringir);
        toast({
          title: value ? 'Restrição ativada' : 'Restrição desativada',
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Erro ao atualizar configuração');
      }
    } catch (error: unknown) {
      console.error('Erro ao atualizar restrição:', error);
      const msg = error instanceof Error ? error.message : 'Erro ao atualizar';
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: msg,
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAprovar = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/dispositivos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'aprovar' }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Dispositivo aprovado',
          description: 'O dispositivo agora pode acessar o sistema.',
        });
        fetchDevices();
      } else {
        throw new Error(data.error || 'Erro ao aprovar');
      }
    } catch (error: unknown) {
      console.error('Erro ao aprovar:', error);
      const msg = error instanceof Error ? error.message : 'Erro ao aprovar';
      toast({ variant: 'destructive', title: 'Erro', description: msg });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevogar = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/dispositivos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'revogar' }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Dispositivo revogado',
          description: 'O dispositivo não poderá mais acessar o sistema.',
        });
        fetchDevices();
      } else {
        throw new Error(data.error || 'Erro ao revogar');
      }
    } catch (error: unknown) {
      console.error('Erro ao revogar:', error);
      const msg = error instanceof Error ? error.message : 'Erro ao revogar';
      toast({ variant: 'destructive', title: 'Erro', description: msg });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExcluir = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/dispositivos/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Dispositivo removido',
          description: 'O registro foi excluído permanentemente.',
        });
        fetchDevices();
      } else {
        throw new Error(data.error || 'Erro ao excluir');
      }
    } catch (error: unknown) {
      console.error('Erro ao excluir:', error);
      const msg = error instanceof Error ? error.message : 'Erro ao excluir';
      toast({ variant: 'destructive', title: 'Erro', description: msg });
    } finally {
      setActionLoading(null);
    }
  };

  // Stats
  const totalDevices = devices.length;
  const ativosDevices = devices.filter(d => d.ativo).length;
  const revogadosDevices = devices.filter(d => !d.ativo).length;
  const pendentesDevices = devices.filter(d => !d.ativo).length;

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // Get status badge
  const getStatusBadge = (ativo: boolean, criadoEm: string) => {
    // If not active and was just created (never been active), it's "pending"
    if (!ativo) {
      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
          <ShieldAlert className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
        <ShieldCheck className="h-3 w-3 mr-1" />
        Ativo
      </Badge>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'master']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Dispositivos' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
          { title: 'Dispositivos e Segurança' },
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
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Dispositivos e Segurança</h1>
                <p className="text-muted-foreground">
                  Controle de acesso por dispositivo
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchDevices} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Restriction Toggle */}
          <Card className={restringir ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className={`h-6 w-6 mt-0.5 ${restringir ? 'text-orange-600' : 'text-blue-600'}`} />
                  <div>
                    <p className="font-semibold text-sm">
                      Restringir acesso a dispositivos conhecidos
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {restringir
                        ? 'Novos dispositivos serão bloqueados até que um administrador os aprove manualmente. Funcionários não poderão acessar de dispositivos não registrados.'
                        : 'Novos dispositivos serão registrados automaticamente. Você pode revogar dispositivos individualmente a qualquer momento.'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={restringir}
                  onCheckedChange={handleToggleRestringir}
                  disabled={savingConfig}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalDevices}</p>
                    <p className="text-xs text-muted-foreground">Total de dispositivos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ativosDevices}</p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendentesDevices}</p>
                    <p className="text-xs text-muted-foreground">Pendentes de aprovação</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{revogadosDevices}</p>
                    <p className="text-xs text-muted-foreground">Revogados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Devices Table */}
          {devices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Monitor className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum dispositivo registrado</p>
                <p className="text-sm text-muted-foreground">
                  Os dispositivos serão registrados quando os usuários fizerem login
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Dispositivos Registrados ({devices.length})
                </CardTitle>
                <CardDescription>
                  {restringir
                    ? 'Dispositivos pendentes precisam ser aprovados para que possam acessar o sistema.'
                    : 'Todos os dispositivos são registrados automaticamente. Revogue individualmente se necessário.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead className="hidden md:table-cell">IP</TableHead>
                        <TableHead className="hidden lg:table-cell">Último Acesso</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((device) => (
                        <TableRow key={device.id} className={!device.ativo ? 'opacity-70' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Monitor className="h-4 w-4 text-gray-500" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {device.device_name || 'Dispositivo desconhecido'}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {device.device_id.substring(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {device.usuario_nome || '-'}
                            </p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {device.ip_address || '-'}
                            </code>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {formatDate(device.ultimo_acesso)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(device.ativo, device.criado_em)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={actionLoading === device.id}>
                                  {actionLoading === device.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!device.ativo && (
                                  <DropdownMenuItem onClick={() => handleAprovar(device.id)}>
                                    <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                                    <span className="text-green-600">Aprovar</span>
                                  </DropdownMenuItem>
                                )}
                                {device.ativo && (
                                  <DropdownMenuItem onClick={() => handleRevogar(device.id)}>
                                    <UserX className="mr-2 h-4 w-4 text-orange-600" />
                                    <span className="text-orange-600">Revogar</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir dispositivo?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o registro do dispositivo{' '}
                                        <strong>{device.device_name || device.device_id.substring(0, 8)}</strong>?
                                        Se a restrição estiver ativada, o usuário precisará de uma nova aprovação
                                        para acessar novamente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleExcluir(device.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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
