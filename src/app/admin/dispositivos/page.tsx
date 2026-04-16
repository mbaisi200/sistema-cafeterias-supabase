'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Tv,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  Search,
  User,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
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
  tipo?: 'funcionario' | 'admin';
}

function getDeviceIcon(userAgent: string | null): React.ReactNode {
  if (!userAgent) return <Monitor className="h-5 w-5" />;
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return <Smartphone className="h-5 w-5" />;
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return <Tablet className="h-5 w-5" />;
  }
  if (ua.includes('mac') || ua.includes('windows') || ua.includes('linux')) {
    return <Laptop className="h-5 w-5" />;
  }
  return <Monitor className="h-5 w-5" />;
}

function getDeviceType(userAgent: string | null): string {
  if (!userAgent) return 'Desktop';
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android')) return 'Celular Android';
  if (ua.includes('iphone') || ua.includes('ios')) return 'iPhone';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'Tablet';
  if (ua.includes('mac')) return 'Mac';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('linux')) return 'Linux';
  return 'Desktop';
}

export default function DispositivosPage() {
  const { empresaId, role } = useAuth();
  const { toast } = useToast();

  const [devices, setDevices] = useState<Dispositivo[]>([]);
  const [funcionarios, setFuncionarios] = useState<{ id: string; nome: string; cargo: string }[]>([]);
  const [restringir, setRestringir] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'pendentes' | 'revogados'>('todos');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; deviceId: string; action: 'aprovar' | 'revogar' | 'excluir'; deviceName: string } | null>(null);

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

  const fetchFuncionarios = async () => {
    if (!empresaId) return;
    try {
      const { data } = await fetch(`/api/funcionarios?empresa=${empresaId}`).then(r => r.json()).catch(() => ({ data: null }));
      if (data) setFuncionarios(data);
    } catch {
      console.error('Erro ao buscar funcionários');
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchFuncionarios();
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
      toast({ variant: 'destructive', title: 'Erro', description: msg });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAction = async () => {
    if (!confirmDialog) return;
    const { deviceId, action } = confirmDialog;
    setActionLoading(deviceId);
    
    try {
      let response;
      if (action === 'excluir') {
        response = await fetch(`/api/dispositivos/${deviceId}`, { method: 'DELETE' });
      } else {
        response = await fetch(`/api/dispositivos/${deviceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao: action }),
        });
      }
      
      const data = await response.json();
      if (response.ok) {
        toast({
          title: action === 'aprovar' ? 'Dispositivo aprovado' : 
                 action === 'revogar' ? 'Acesso revogado' : 'Dispositivo removido',
          description: data.message,
        });
        fetchDevices();
      } else {
        throw new Error(data.error || 'Erro ao executar ação');
      }
    } catch (error: unknown) {
      console.error('Erro ao executar ação:', error);
      const msg = error instanceof Error ? error.message : 'Erro ao executar ação';
      toast({ variant: 'destructive', title: 'Erro', description: msg });
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

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

  const getStatusBadge = (ativo: boolean, criadoEm: string, atualizadoEm: string) => {
    const criado = new Date(criadoEm).getTime();
    const atualizado = new Date(atualizadoEm).getTime();
    const isRevogado = !ativo && criado !== atualizado;

    if (ativo) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Autorizado
        </Badge>
      );
    }
    if (isRevogado) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 gap-1">
          <XCircle className="h-3 w-3" />
          Revogado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 gap-1">
        <ShieldAlert className="h-3 w-3" />
        Pendente
      </Badge>
    );
  };

  const getStatusDescription = (ativo: boolean, criadoEm: string, atualizadoEm: string) => {
    const criado = new Date(criadoEm).getTime();
    const atualizado = new Date(atualizadoEm).getTime();
    const isRevogado = !ativo && criado !== atualizado;

    if (ativo) return 'Dispositivo autorizado a acessar o sistema';
    if (isRevogado) return 'Acesso foi revogado pelo administrador';
    return 'Aguardando aprovação para acessar o sistema';
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      (device.usuario_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (device.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      device.device_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const created = new Date(device.criado_em).getTime();
    const updated = new Date(device.atualizado_em).getTime();
    const isRevogado = !device.ativo && created !== updated;
    
    let matchesStatus = true;
    if (statusFilter === 'ativos') matchesStatus = device.ativo;
    else if (statusFilter === 'pendentes') matchesStatus = !device.ativo && created === updated;
    else if (statusFilter === 'revogados') matchesStatus = isRevogado;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: devices.length,
    ativos: devices.filter(d => d.ativo).length,
    pendentes: devices.filter(d => !d.ativo && new Date(d.criado_em).getTime() === new Date(d.atualizado_em).getTime()).length,
    revogados: devices.filter(d => !d.ativo && new Date(d.criado_em).getTime() !== new Date(d.atualizado_em).getTime()).length,
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
          { title: 'Dispositivos' },
        ]}
      >
        <div className="space-y-6">
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
                <h1 className="text-3xl font-bold">Controle de Dispositivos</h1>
                <p className="text-muted-foreground">
                  Autorize dispositivos para acesso de funcionários
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchDevices} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          <Card className={restringir ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  {restringir ? (
                    <ShieldAlert className="h-6 w-6 text-orange-600 mt-0.5" />
                  ) : (
                    <ShieldCheck className="h-6 w-6 text-green-600 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">
                        {restringir ? 'Modo Restrito Ativado' : 'Modo Permissivo'}
                      </p>
                      <Badge variant={restringir ? 'destructive' : 'default'} className="text-xs">
                        {restringir ? 'Requer autorização' : 'Livre acesso'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {restringir
                        ? 'Novos dispositivos precisarão de sua aprovação para acessar o sistema. Recomendado para controle de presença.'
                        : 'Todos os dispositivos são autorizados automaticamente. Altere para o modo restrito para maior controle.'
                      }
                    </p>
                  </div>
                </div>
                <Button
                  variant={restringir ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleToggleRestringir(!restringir)}
                  disabled={savingConfig}
                  className={restringir ? 'border-orange-300 hover:bg-orange-100' : 'bg-green-600 hover:bg-green-700'}
                >
                  {savingConfig ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : restringir ? (
                    'Desativar Restrição'
                  ) : (
                    'Ativar Restrição'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('todos')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('ativos')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.ativos}</p>
                    <p className="text-xs text-muted-foreground">Autorizados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('pendentes')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pendentes}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('revogados')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.revogados}</p>
                    <p className="text-xs text-muted-foreground">Revogados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por usuário ou dispositivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={statusFilter === 'todos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('todos')}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={statusFilter === 'ativos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('ativos')}
                    className={statusFilter === 'ativos' ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    Autorizados
                  </Button>
                  <Button
                    variant={statusFilter === 'pendentes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('pendentes')}
                    className={statusFilter === 'pendentes' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  >
                    Pendentes
                  </Button>
                  <Button
                    variant={statusFilter === 'revogados' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('revogados')}
                    className={statusFilter === 'revogados' ? 'bg-red-500 hover:bg-red-600' : ''}
                  >
                    Revogados
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {filteredDevices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Shield className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  {searchTerm || statusFilter !== 'todos' 
                    ? 'Nenhum dispositivo encontrado' 
                    : 'Nenhum dispositivo registrado'
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || statusFilter !== 'todos'
                    ? 'Tente ajustar sua busca ou filtro'
                    : 'Dispositivos serão registrados quando os funcionários acessarem o sistema'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Dispositivos ({filteredDevices.length})
                </CardTitle>
                <CardDescription>
                  {restringir
                    ? 'Aprovar dispositivos pendentes para permitir o acesso dos funcionários'
                    : 'Gerencie os dispositivos que acessam o sistema'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredDevices.map((device) => (
                    <div
                      key={device.id}
                      className={`p-4 rounded-lg border ${
                        device.ativo 
                          ? 'bg-green-50 border-green-200' 
                          : new Date(device.criado_em).getTime() !== new Date(device.atualizado_em).getTime()
                            ? 'bg-red-50 border-red-200'
                            : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                            device.ativo 
                              ? 'bg-green-100' 
                              : new Date(device.criado_em).getTime() !== new Date(device.atualizado_em).getTime()
                                ? 'bg-red-100'
                                : 'bg-orange-100'
                          }`}>
                            {getDeviceIcon(device.user_agent)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {device.device_name || getDeviceType(device.user_agent)}
                              </p>
                              {getStatusBadge(device.ativo, device.criado_em, device.atualizado_em)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {device.usuario_nome || 'Usuário desconhecido'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Smartphone className="h-3 w-3" />
                                {getDeviceType(device.user_agent)}
                              </span>
                              <span>
                                Último acesso: {formatDate(device.ultimo_acesso)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {getStatusDescription(device.ativo, device.criado_em, device.atualizado_em)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!device.ativo && new Date(device.criado_em).getTime() === new Date(device.atualizado_em).getTime() && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => setConfirmDialog({
                                open: true,
                                deviceId: device.id,
                                action: 'aprovar',
                                deviceName: device.device_name || getDeviceType(device.user_agent),
                              })}
                              disabled={actionLoading === device.id}
                            >
                              {actionLoading === device.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Aprovar
                                </>
                              )}
                            </Button>
                          )}
                          {device.ativo && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-orange-300 text-orange-600 hover:bg-orange-100"
                              onClick={() => setConfirmDialog({
                                open: true,
                                deviceId: device.id,
                                action: 'revogar',
                                deviceName: device.device_name || getDeviceType(device.user_agent),
                              })}
                              disabled={actionLoading === device.id}
                            >
                              {actionLoading === device.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Revogar
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setConfirmDialog({
                              open: true,
                              deviceId: device.id,
                              action: 'excluir',
                              deviceName: device.device_name || getDeviceType(device.user_agent),
                            })}
                            disabled={actionLoading === device.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-blue-800">Como funciona o controle de dispositivos?</p>
                  <ul className="text-xs text-blue-600 mt-2 space-y-1">
                    <li>• Quando um funcionário acessa o sistema de um novo dispositivo, ele fica pendente de aprovação</li>
                    <li>• Você pode autorizar ou revogar o acesso a qualquer momento</li>
                    <li>• Dispositivos revogados precisarão de nova aprovação para acessar novamente</li>
                    <li>• O modo restrito exige aprovação para todos os novos dispositivos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirmDialog?.action === 'aprovar' && 'Aprovar dispositivo'}
                {confirmDialog?.action === 'revogar' && 'Revogar acesso'}
                {confirmDialog?.action === 'excluir' && 'Excluir dispositivo'}
              </DialogTitle>
              <DialogDescription>
                {confirmDialog?.action === 'aprovar' && (
                  <>Tem certeza que deseja autorizar o dispositivo <strong>{confirmDialog?.deviceName}</strong> a acessar o sistema?</>
                )}
                {confirmDialog?.action === 'revogar' && (
                  <>Tem certeza que deseja revogar o acesso do dispositivo <strong>{confirmDialog?.deviceName}</strong>? O funcionário precisará de uma nova autorização.</>
                )}
                {confirmDialog?.action === 'excluir' && (
                  <>Tem certeza que deseja excluir o dispositivo <strong>{confirmDialog?.deviceName}</strong>? Esta ação não pode ser desfeita.</>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog(null)}>
                Cancelar
              </Button>
              <Button
                variant={confirmDialog?.action === 'excluir' ? 'destructive' : 'default'}
                className={confirmDialog?.action === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={handleAction}
                disabled={actionLoading !== null}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : confirmDialog?.action === 'aprovar' ? (
                  'Aprovar'
                ) : confirmDialog?.action === 'revogar' ? (
                  'Revogar'
                ) : (
                  'Excluir'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
