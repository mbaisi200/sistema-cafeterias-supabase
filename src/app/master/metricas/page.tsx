'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmpresas } from '@/hooks/useFirestore';
import { Loader2 } from 'lucide-react';

export default function MetricasPage() {
  const { empresas, loading } = useEmpresas();

  // Calcular métricas
  const totalEmpresas = empresas.length;
  const empresasAtivas = empresas.filter(e => e.status === 'ativo').length;
  const empresasPorPlano = {
    basico: empresas.filter(e => e.plano === 'basico').length,
    profissional: empresas.filter(e => e.plano === 'profissional').length,
    premium: empresas.filter(e => e.plano === 'premium').length,
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['master']}>
        <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Métricas' }]}>
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
          { title: 'Métricas' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Métricas do Sistema</h1>
            <p className="text-muted-foreground">
              Visão geral do uso e performance
            </p>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalEmpresas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{empresasAtivas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Retenção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {totalEmpresas > 0 ? ((empresasAtivas / totalEmpresas) * 100).toFixed(0) : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Empresas Premium</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{empresasPorPlano.premium}</div>
              </CardContent>
            </Card>
          </div>

          {/* Planos */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Plano</CardTitle>
              <CardDescription>Quantidade de empresas em cada plano</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded bg-gray-500" />
                    <span className="font-medium">Básico</span>
                  </div>
                  <div className="text-xl font-bold">{empresasPorPlano.basico}</div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded bg-blue-500" />
                    <span className="font-medium">Profissional</span>
                  </div>
                  <div className="text-xl font-bold">{empresasPorPlano.profissional}</div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded bg-amber-500" />
                    <span className="font-medium">Premium</span>
                  </div>
                  <div className="text-xl font-bold">{empresasPorPlano.premium}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
