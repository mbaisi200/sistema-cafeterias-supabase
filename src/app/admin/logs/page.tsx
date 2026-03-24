'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLogs } from '@/hooks/useFirestore';
import { useState } from 'react';
import {
  Search,
  History,
  Loader2,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  DollarSign,
  MoreHorizontal,
  Filter,
} from 'lucide-react';

export default function LogsPage() {
  const { logs, loading } = useLogs();
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');

  const filteredLogs = logs.filter(log => {
    const matchSearch = log.acao?.toLowerCase().includes(search.toLowerCase()) ||
      log.usuarioNome?.toLowerCase().includes(search.toLowerCase()) ||
      log.detalhes?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoFilter === 'todos' || log.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const getTipoBadge = (tipo: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      venda: { color: 'bg-green-500', icon: <ShoppingCart className="h-3 w-3" />, label: 'Venda' },
      produto: { color: 'bg-blue-500', icon: <Package className="h-3 w-3" />, label: 'Produto' },
      estoque: { color: 'bg-amber-500', icon: <Warehouse className="h-3 w-3" />, label: 'Estoque' },
      funcionario: { color: 'bg-purple-500', icon: <Users className="h-3 w-3" />, label: 'Funcionário' },
      financeiro: { color: 'bg-red-500', icon: <DollarSign className="h-3 w-3" />, label: 'Financeiro' },
      outro: { color: 'bg-gray-500', icon: <MoreHorizontal className="h-3 w-3" />, label: 'Outro' },
    };
    const config = configs[tipo] || configs.outro;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: Date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Logs' }]}>
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
          { title: 'Logs' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Histórico de Atividades</h1>
              <p className="text-muted-foreground">
                Acompanhe todas as ações realizadas no sistema
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por ação, usuário ou detalhes..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    <SelectItem value="venda">Vendas</SelectItem>
                    <SelectItem value="produto">Produtos</SelectItem>
                    <SelectItem value="estoque">Estoque</SelectItem>
                    <SelectItem value="funcionario">Funcionários</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="outro">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {filteredLogs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <History className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum registro encontrado</p>
                <p className="text-sm text-muted-foreground">
                  As atividades aparecerão aqui conforme forem sendo realizadas
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Registros ({filteredLogs.length})</CardTitle>
                <CardDescription>
                  Histórico de todas as ações realizadas no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(log.dataHora)}
                          </TableCell>
                          <TableCell>
                            {getTipoBadge(log.tipo)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.acao}
                          </TableCell>
                          <TableCell>
                            {log.usuarioNome || 'Sistema'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground">
                            {log.detalhes || '-'}
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
