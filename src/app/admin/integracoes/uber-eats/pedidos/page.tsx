'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { useUberEatsPedidos, useUberEatsOperations } from '@/hooks/useUberEatsOperations';
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Bike,
  MapPin,
  Phone,
  ShoppingBag,
  User,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Ban,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const STATUS_CONFIG: Record<string, { label: string; color: string; darkColor: string; icon: any }> = {
  pendente: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800',
    darkColor: 'bg-yellow-900/30 text-yellow-400',
    icon: Clock,
  },
  aberta: {
    label: 'Aguardando',
    color: 'bg-blue-100 text-blue-800',
    darkColor: 'bg-blue-900/30 text-blue-400',
    icon: Clock,
  },
  em_preparo: {
    label: 'Em Preparo',
    color: 'bg-purple-100 text-purple-800',
    darkColor: 'bg-purple-900/30 text-purple-400',
    icon: Clock,
  },
  pronta: {
    label: 'Pronta',
    color: 'bg-green-100 text-green-800',
    darkColor: 'bg-green-900/30 text-green-400',
    icon: CheckCircle2,
  },
  saiu_para_entrega: {
    label: 'Saiu para Entrega',
    color: 'bg-indigo-100 text-indigo-800',
    darkColor: 'bg-indigo-900/30 text-indigo-400',
    icon: Bike,
  },
};

type OrdemStatus = 'aberta' | 'pendente' | 'em_preparo' | 'pronta' | 'saiu_para_entrega' | 'entregue' | 'cancelada';

function PedidosUberEatsContent() {
  const router = useRouter();
  const { empresaId } = useAuth();
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';

  const { pedidos, loading, carregarPedidos } = useUberEatsPedidos(empresaId);
  const { aceitarPedido, rejeitarPedido, iniciarPreparacao, finalizarPreparacao, despacharPedido, marcarEntregue, loading: actionLoading, loadingAction } = useUberEatsOperations({
    empresaId: empresaId || '',
    onSuccess: (action) => {
      carregarPedidos();
    },
    onError: (error) => {
      console.error('Erro na operação:', error);
    },
  });

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [rejeitarVendaId, setRejeitarVendaId] = useState<string | null>(null);

  useEffect(() => {
    if (empresaId) {
      carregarPedidos();
    }
  }, [empresaId]);

  const pedidosFiltrados = pedidos.filter((p: any) => {
    const matchBusca = !busca ||
      (p.nome_cliente || '').toLowerCase().includes(busca.toLowerCase()) ||
      (p.uber_eats_pedidos?.display_id || '').toLowerCase().includes(busca.toLowerCase()) ||
      (p.uber_eats_pedidos?.order_id || '').toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todas' || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const toggleExpandido = (id: string) => {
    setExpandido(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAceitar = async (vendaId: string, orderId?: string) => {
    await aceitarPedido(vendaId, orderId);
  };

  const handleRejeitar = async () => {
    if (!rejeitarVendaId) return;
    await rejeitarPedido(rejeitarVendaId, motivoRejeicao || 'Rejeitado manualmente');
    setRejeitarVendaId(null);
    setMotivoRejeicao('');
  };

  const podeAceitar = (status: string) => status === 'aberta' || status === 'pendente';
  const podeRejeitar = (status: string) => status === 'aberta' || status === 'pendente';
  const podeIniciarPreparo = (status: string) => status === 'aberta' || status === 'pendente';
  const podeFinalizarPreparo = (status: string) => status === 'em_preparo';
  const podeDespachar = (status: string) => status === 'pronta';
  const podeEntregar = (status: string) => status === 'saiu_para_entrega';

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) return <Badge variant="outline">{status}</Badge>;
    const Icon = cfg.icon;
    return (
      <Badge className={`${darkMode ? cfg.darkColor : cfg.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const formatTempo = (data: string) => {
    const diff = Date.now() - new Date(data).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const horas = Math.floor(mins / 60);
    const resto = mins % 60;
    return `${horas}h${resto > 0 ? resto + 'm' : ''}`;
  };

  return (
    <div className={`container mx-auto py-6 px-4 max-w-6xl ${darkMode ? 'text-[#e2e8f0]' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/integracoes/uber-eats')}
            className={darkMode ? 'hover:bg-white/5' : ''}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-green-500" />
              Pedidos Uber Eats
            </h1>
            <p className="text-muted-foreground">
              Gerencie pedidos recebidos do Uber Eats manualmente
            </p>
          </div>
        </div>
        <Button onClick={carregarPedidos} variant="outline" className={darkMode ? 'border-white/10 hover:bg-white/5' : ''}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Card className={`mb-6 ${darkMode ? 'bg-[#1e1e32] border-white/10' : ''}`}>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou pedido..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className={`pl-10 ${darkMode ? 'bg-[#1a1a2e] border-white/10' : ''}`}
                />
              </div>
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className={`border rounded-md px-3 py-2 text-sm ${darkMode ? 'bg-[#1a1a2e] border-white/10 text-[#e2e8f0]' : ''}`}
            >
              <option value="todas">Todas</option>
              <option value="pendente">Pendentes</option>
              <option value="aberta">Aguardando</option>
              <option value="em_preparo">Em Preparo</option>
              <option value="pronta">Prontas</option>
              <option value="saiu_para_entrega">Saiu para Entrega</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-lg font-medium">Nenhum pedido encontrado</p>
            <p className="text-sm">Os pedidos recebidos do Uber Eats aparecerão aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pedidosFiltrados.map((pedido: any) => {
            const uberOrder = pedido.uber_eats_pedidos?.[0];
            const isAcaivel = podeAceitar(pedido.status) || podeRejeitar(pedido.status);
            const estaAtivo = !['entregue', 'cancelada', 'saiu_para_entrega'].includes(pedido.status);
            const isExpanded = expandido[pedido.id];

            return (
              <Card
                key={pedido.id}
                className={`transition-all ${
                  darkMode
                    ? 'bg-[#1e1e32] border-white/10 hover:border-white/20'
                    : 'hover:shadow-md'
                } ${isAcaivel ? 'ring-2 ring-yellow-400/50' : ''}`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-muted-foreground">
                          #{uberOrder?.display_id || uberOrder?.order_id?.slice(0, 8) || pedido.id.slice(0, 8)}
                        </span>
                        {getStatusBadge(pedido.status)}
                        {isAcaivel && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600 animate-pulse">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Ação necessária
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium truncate">{pedido.nome_cliente || uberOrder?.customer_name || 'Cliente'}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          R$ {Number(pedido.total || 0).toFixed(2)}
                        </span>
                        <span>{formatTempo(pedido.criado_em)} atrás</span>
                        {uberOrder?.order_type && (
                          <Badge variant="outline" className="text-xs">
                            {uberOrder.order_type === 'DELIVERY' ? 'Entrega' : 'Retirada'}
                          </Badge>
                        )}
                        <span className="text-xs">
                          {new Date(pedido.criado_em).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {podeAceitar(pedido.status) && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleAceitar(pedido.id, uberOrder?.order_id)}
                          disabled={actionLoading && loadingAction === 'accept'}
                        >
                          {actionLoading && loadingAction === 'accept' ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                          )}
                          Aceitar
                        </Button>
                      )}

                      {podeRejeitar(pedido.status) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejeitarVendaId(pedido.id)}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Rejeitar Pedido</AlertDialogTitle>
                              <AlertDialogDescription>
                                Informe o motivo da rejeição do pedido #{uberOrder?.display_id || pedido.id.slice(0, 8)}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                              <Label htmlFor="motivo">Motivo</Label>
                              <Input
                                id="motivo"
                                value={motivoRejeicao}
                                onChange={(e) => setMotivoRejeicao(e.target.value)}
                                placeholder="Ex: Produto indisponível, fora do horário..."
                                className={darkMode ? 'bg-[#1a1a2e] border-white/10' : ''}
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => { setRejeitarVendaId(null); setMotivoRejeicao(''); }}>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleRejeitar}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={actionLoading && loadingAction === 'deny'}
                              >
                                {actionLoading && loadingAction === 'deny' ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : null}
                                Rejeitar Pedido
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {podeIniciarPreparo(pedido.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => iniciarPreparacao(pedido.id, uberOrder?.order_id)}
                          disabled={actionLoading && loadingAction === 'start_preparation'}
                          className={darkMode ? 'border-white/10 hover:bg-white/5' : ''}
                        >
                          {actionLoading && loadingAction === 'start_preparation' ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : null}
                          Iniciar Preparo
                        </Button>
                      )}

                      {podeFinalizarPreparo(pedido.status) && (
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => finalizarPreparacao(pedido.id, uberOrder?.order_id)}
                          disabled={actionLoading && loadingAction === 'finish_preparation'}
                        >
                          {actionLoading && loadingAction === 'finish_preparation' ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                          )}
                          Finalizar Preparo
                        </Button>
                      )}

                      {podeDespachar(pedido.status) && (
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => despacharPedido(pedido.id, uberOrder?.order_id)}
                          disabled={actionLoading && loadingAction === 'dispatch'}
                        >
                          {actionLoading && loadingAction === 'dispatch' ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Bike className="h-4 w-4 mr-1" />
                          )}
                          Despachar
                        </Button>
                      )}

                      {podeEntregar(pedido.status) && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => marcarEntregue(pedido.id, uberOrder?.order_id)}
                          disabled={actionLoading && loadingAction === 'deliver'}
                        >
                          {actionLoading && loadingAction === 'deliver' ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                          )}
                          Entregue
                        </Button>
                      )}

                      {estaAtivo && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleExpandido(pedido.id)}
                          className={darkMode ? 'hover:bg-white/5' : ''}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && estaAtivo && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <ShoppingBag className="h-4 w-4" />
                            Itens do Pedido
                          </h4>
                          <div className="space-y-1">
                            {(pedido.itens_venda || []).map((item: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm py-1">
                                <span>
                                  {item.quantidade}x {item.nome}
                                </span>
                                <span className="text-muted-foreground">
                                  R$ {Number(item.total || 0).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between text-sm font-medium">
                            <span>Total</span>
                            <span>R$ {Number(pedido.total || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            Detalhes da Entrega
                          </h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {pedido.entrega_logradouro && (
                              <p>
                                {pedido.entrega_logradouro}, {pedido.entrega_numero || 'S/N'}
                                {pedido.entrega_bairro && ` - ${pedido.entrega_bairro}`}
                              </p>
                            )}
                            {pedido.entrega_cidade && <p>{pedido.entrega_cidade}</p>}
                            {pedido.entrega_cep && <p>CEP: {pedido.entrega_cep}</p>}
                            {pedido.telefone_cliente && (
                              <p className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {pedido.telefone_cliente}
                              </p>
                            )}
                            {uberOrder?.order_type && (
                              <Badge variant="outline" className="mt-2">
                                {uberOrder.order_type === 'DELIVERY' ? 'Delivery' : 'Retirada no Local'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PedidosUberEatsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[
        { title: 'Integrações', href: '/admin/integracoes' },
        { title: 'Uber Eats', href: '/admin/integracoes/uber-eats' },
        { title: 'Pedidos' },
      ]}>
        <PedidosUberEatsContent />
      </MainLayout>
    </ProtectedRoute>
  );
}
