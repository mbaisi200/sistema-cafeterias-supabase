'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardCard } from '@/components/layout/DashboardCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useEmpresas } from '@/hooks/useFirestore';
import {
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export default function MasterDashboardPage() {
  const { user } = useAuth();
  const { empresas, loading } = useEmpresas();

  const stats = {
    totalClientes: empresas.length,
    clientesAtivos: empresas.filter(e => e.status === 'ativo').length,
    clientesInativos: empresas.filter(e => e.status === 'inativo').length,
    clientesBloqueados: empresas.filter(e => e.status === 'bloqueado').length,
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

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['master']}>
        <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Dashboard' }]}>
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
          { title: 'Dashboard' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Painel Master</h1>
              <p className="text-muted-foreground">
                Bem-vindo, {user?.nome}! Visão geral de todos os clientes.
              </p>
            </div>
            <Button asChild>
              <a href="/master/clientes">
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Clientes
              </a>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Total de Clientes"
              value={stats.totalClientes}
              description="Empresas cadastradas"
              icon={Building2}
            />
            <DashboardCard
              title="Clientes Ativos"
              value={stats.clientesAtivos}
              description={`${stats.totalClientes} total`}
              icon={CheckCircle2}
            />
            <DashboardCard
              title="Clientes Inativos"
              value={stats.clientesInativos}
              description="Aguardando pagamento"
              icon={AlertTriangle}
            />
            <DashboardCard
              title="Clientes Bloqueados"
              value={stats.clientesBloqueados}
              description="Acesso suspenso"
              icon={XCircle}
            />
          </div>

          {/* Status Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.clientesAtivos}</div>
                <Progress 
                  value={stats.totalClientes > 0 ? (stats.clientesAtivos / stats.totalClientes) * 100 : 0} 
                  className="mt-2 h-2" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalClientes > 0 ? ((stats.clientesAtivos / stats.totalClientes) * 100).toFixed(0) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Inativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.clientesInativos}</div>
                <Progress 
                  value={stats.totalClientes > 0 ? (stats.clientesInativos / stats.totalClientes) * 100 : 0} 
                  className="mt-2 h-2 bg-yellow-100 [&>div]:bg-yellow-500" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalClientes > 0 ? ((stats.clientesInativos / stats.totalClientes) * 100).toFixed(0) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Bloqueados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.clientesBloqueados}</div>
                <Progress 
                  value={stats.totalClientes > 0 ? (stats.clientesBloqueados / stats.totalClientes) * 100 : 0} 
                  className="mt-2 h-2 bg-red-100 [&>div]:bg-red-500" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalClientes > 0 ? ((stats.clientesBloqueados / stats.totalClientes) * 100).toFixed(0) : 0}% do total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Clients */}
          {empresas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhuma empresa cadastrada</p>
                <p className="text-sm text-muted-foreground">Vá em "Gerenciar Clientes" para adicionar</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>
                  Todas as empresas cadastradas no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {empresas.map((empresa) => (
                    <div
                      key={empresa.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold">
                          {empresa.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{empresa.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {empresa.cidade || 'Cidade não definida'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={planoCores[empresa.plano] || 'bg-gray-500'}>
                          {empresa.plano?.charAt(0).toUpperCase() + empresa.plano?.slice(1) || 'Sem plano'}
                        </Badge>
                        <Badge className={statusCores[empresa.status] || 'bg-gray-500'}>
                          {empresa.status?.charAt(0).toUpperCase() + empresa.status?.slice(1) || 'Indefinido'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
