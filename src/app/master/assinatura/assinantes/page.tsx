'use client';

import { Suspense } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import {
  Search, Loader2, ExternalLink, CreditCard, Users, ArrowUpDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';

export default function AssinantesPageWrapper() {
  return (
    <Suspense fallback={
      <ProtectedRoute allowedRoles={['master']}>
        <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Assinantes' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    }>
      <AssinantesPage />
    </Suspense>
  );
}

interface Assinante {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  plano: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  validade: string | null;
  plano_id: string | null;
  planos: { id: string; nome: string; preco: number; stripe_price_id: string | null } | null;
}

function AssinantesPage() {
  const [assinantes, setAssinantes] = useState<Assinante[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [creatingCheckout, setCreatingCheckout] = useState<string | null>(null);
  const [creatingPortal, setCreatingPortal] = useState<string | null>(null);
  const [assigningPlan, setAssigningPlan] = useState<string | null>(null);
  const [planos, setPlanos] = useState<any[]>([]);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('empresas')
        .select(`
          id, nome, cnpj, email, telefone, plano, status,
          stripe_customer_id, stripe_subscription_id, subscription_status,
          subscription_current_period_end, validade, plano_id,
          planos!left(id, nome, preco, stripe_price_id)
        `)
        .order('nome', { ascending: true });

      if (error) throw error;
      setAssinantes(data || []);

      const { data: pData } = await supabase.from('planos').select('*').order('ordem');
      setPlanos(pData || []);
    } catch (error: unknown) {
      toast({
        variant: 'destructive', title: 'Erro ao carregar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: 'Assinatura criada!', description: 'A assinatura foi processada com sucesso.' });
      fetchData();
    }
    if (searchParams.get('canceled') === 'true') {
      toast({ title: 'Checkout cancelado', description: 'O processo de assinatura foi cancelado.' });
    }
  }, [searchParams, toast, fetchData]);

  const filtered = assinantes.filter(a => {
    const matchSearch = !search || a.nome.toLowerCase().includes(search.toLowerCase()) || a.cnpj?.includes(search) || a.email?.toLowerCase().includes(search.toLowerCase());
    let matchStatus = true;
    if (statusFilter === 'active') matchStatus = a.subscription_status === 'active';
    else if (statusFilter === 'inactive') matchStatus = !a.subscription_status || a.subscription_status === 'inactive' || a.subscription_status === 'canceled' || a.subscription_status === null;
    else if (statusFilter === 'past_due') matchStatus = a.subscription_status === 'past_due';
    else if (statusFilter === 'no_stripe') matchStatus = !a.stripe_customer_id;
    return matchSearch && matchStatus;
  });

  const handleAssignPlan = async (empresaId: string, planoId: string) => {
    setAssigningPlan(empresaId);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('empresas')
        .update({ plano_id: planoId })
        .eq('id', empresaId);
      if (error) throw error;
      toast({ title: 'Plano atribuído!', description: 'O plano foi atribuído à empresa.' });
      fetchData();
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setAssigningPlan(null);
    }
  };

  const handleCreateCheckout = async (empresaId: string) => {
    const empresa = assinantes.find(a => a.id === empresaId);
    const planoInfo = empresa?.planos || planos.find(p => p.id === empresa?.plano_id);
    if (!planoInfo?.preco) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Plano sem preço definido.' });
      return;
    }
    setCreatingCheckout(empresaId);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          email: empresa?.email,
          priceId: planoInfo?.stripe_price_id || undefined,
          planoNome: planoInfo?.nome || 'Assinatura',
          preco: planoInfo?.preco,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setCreatingCheckout(null);
    }
  };

  const handleCreatePortal = async (customerId: string) => {
    setCreatingPortal(customerId);
    try {
      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (error: unknown) {
      toast({
        variant: 'destructive', title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setCreatingPortal(null);
    }
  };

  const getStatusBadge = (subStatus: string | null) => {
    switch (subStatus) {
      case 'active': return <Badge className="bg-green-600">Ativa</Badge>;
      case 'past_due': return <Badge className="bg-red-600">Vencida</Badge>;
      case 'canceled':
      case 'unpaid':
      case 'incomplete_expired': return <Badge variant="secondary">Cancelada</Badge>;
      case 'incomplete':
      case 'trialing': return <Badge className="bg-yellow-500">Pendente</Badge>;
      default: return <Badge variant="outline">Sem assinatura</Badge>;
    }
  };

  const getEmpresaStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo': return <Badge className="bg-green-600">Ativo</Badge>;
      case 'bloqueado': return <Badge className="bg-red-600">Bloqueado</Badge>;
      default: return <Badge variant="secondary">Inativo</Badge>;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['master']}>
        <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Assinantes' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['master']}>
      <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Assinatura' }, { title: 'Assinantes' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Assinantes</h1>
              <p className="text-muted-foreground">Gerencie as assinaturas Stripe de todas as empresas</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Assinatura ativa</SelectItem>
                  <SelectItem value="past_due">Vencida</SelectItem>
                  <SelectItem value="inactive">Inativa/Cancelada</SelectItem>
                  <SelectItem value="no_stripe">Sem Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{assinantes.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Assinatura Ativa</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {assinantes.filter(a => a.subscription_status === 'active').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Vencidas</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {assinantes.filter(a => a.subscription_status === 'past_due').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Sem Stripe</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">
                  {assinantes.filter(a => !a.stripe_customer_id).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum assinante encontrado</p>
                <p className="text-sm text-muted-foreground">Nenhuma empresa corresponde aos filtros</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Empresas ({filtered.length})</CardTitle>
                <CardDescription>Status de assinatura Stripe de cada empresa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-52">Empresa</TableHead>
                        <TableHead className="w-24">Plano</TableHead>
                        <TableHead className="w-20 text-center">Status</TableHead>
                        <TableHead className="w-28">Assinatura Stripe</TableHead>
                        <TableHead className="w-28">Vencimento</TableHead>
                        <TableHead className="w-40 text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium truncate" title={emp.nome}>{emp.nome}</span>
                              <span className="text-xs text-muted-foreground">{emp.email || emp.cnpj || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {emp.planos ? (
                              <div>
                                <span className="font-medium">{emp.planos.nome}</span>
                                <span className="text-xs text-muted-foreground block">R$ {emp.planos.preco.toFixed(2)}</span>
                              </div>
                            ) : (
                              <span className="text-sm">{emp.plano ? emp.plano.charAt(0).toUpperCase() + emp.plano.slice(1) : '—'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {getEmpresaStatusBadge(emp.status)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(emp.subscription_status)}
                          </TableCell>
                          <TableCell>
                            {emp.subscription_current_period_end ? (
                              <span className="text-sm">
                                {new Date(emp.subscription_current_period_end).toLocaleDateString('pt-BR')}
                              </span>
                            ) : emp.validade ? (
                              <span className="text-xs text-muted-foreground">
                                {new Date(emp.validade).toLocaleDateString('pt-BR')}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-center">
                              {emp.subscription_status === 'active' ? (
                                <Button
                                  variant="outline" size="sm" className="h-8 text-xs"
                                  onClick={() => emp.stripe_customer_id && handleCreatePortal(emp.stripe_customer_id)}
                                  disabled={creatingPortal === emp.stripe_customer_id}
                                >
                                  {creatingPortal === emp.stripe_customer_id ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                  )}
                                  Portal
                                </Button>
                              ) : emp.plano_id ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                                    onClick={() => handleCreateCheckout(emp.id)}
                                    disabled={creatingCheckout === emp.id}
                                  >
                                    {creatingCheckout === emp.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <CreditCard className="h-3 w-3 mr-1" />
                                    )}
                                    Cobrar
                                  </Button>
                                </div>
                              ) : (
                                <Select
                                  onValueChange={(planoId) => handleAssignPlan(emp.id, planoId)}
                                  disabled={assigningPlan === emp.id}
                                >
                                  <SelectTrigger className="h-8 text-xs w-28">
                                    <SelectValue placeholder="Atribuir" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {planos.filter(p => p.ativo).map(p => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.nome} - R$ {p.preco.toFixed(2)}
                                      </SelectItem>
                                    ))}
                                    {planos.length === 0 && (
                                      <SelectItem value="__none__" disabled>Nenhum plano disponível</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
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
