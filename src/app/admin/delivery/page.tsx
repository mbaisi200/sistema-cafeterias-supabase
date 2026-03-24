'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  Clock, 
  CheckCircle, 
  ChefHat, 
  Package, 
  Bike, 
  Home, 
  XCircle,
  Phone,
  MapPin,
  RefreshCw,
  Eye,
  Timer,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import type { PedidoDeliveryStatus } from '@/types/delivery';

interface Pedido {
  id: string;
  codigo: string;
  tipo: 'delivery' | 'retirada' | 'consumo_local';
  status: PedidoDeliveryStatus;
  subtotal: number;
  taxa_entrega: number;
  total: number;
  forma_pagamento: string;
  troco_para?: number;
  troco?: number;
  observacoes?: string;
  criado_em: string;
  endereco_entrega?: any;
  cliente?: { nome: string; telefone: string };
  itens?: any[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

const STATUS_CONFIG: Record<PedidoDeliveryStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'pendente': { label: 'Pendente', color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> },
  'confirmado': { label: 'Confirmado', color: 'bg-blue-500', icon: <CheckCircle className="h-4 w-4" /> },
  'em_preparacao': { label: 'Em Preparação', color: 'bg-orange-500', icon: <ChefHat className="h-4 w-4" /> },
  'pronto': { label: 'Pronto', color: 'bg-green-500', icon: <Package className="h-4 w-4" /> },
  'saiu_para_entrega': { label: 'Saiu para Entrega', color: 'bg-purple-500', icon: <Bike className="h-4 w-4" /> },
  'entregue': { label: 'Entregue', color: 'bg-green-600', icon: <Home className="h-4 w-4" /> },
  'cancelado': { label: 'Cancelado', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> },
  'rejeitado': { label: 'Rejeitado', color: 'bg-red-600', icon: <XCircle className="h-4 w-4" /> },
};

export default function DeliveryAdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { empresaId } = useAuth();
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (empresaId) loadPedidos();
  }, [empresaId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (empresaId) loadPedidos();
    }, 30000);
    return () => clearInterval(interval);
  }, [empresaId]);

  const loadPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('pedido_delivery')
        .select('*')
        .eq('empresa_id', empresaId)
        .in('status', ['pendente', 'confirmado', 'em_preparacao', 'pronto', 'saiu_para_entrega'])
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPedidoDetalhes = async (pedidoId: string) => {
    const { data: itens } = await supabase
      .from('pedido_delivery_itens')
      .select('*')
      .eq('pedido_id', pedidoId);
    return itens || [];
  };

  const handleVerPedido = async (pedido: Pedido) => {
    const itens = await loadPedidoDetalhes(pedido.id);
    setPedidoSelecionado({ ...pedido, itens });
    setModalOpen(true);
  };

  const atualizarStatus = async (pedido: Pedido, novoStatus: PedidoDeliveryStatus) => {
    setProcessando(true);
    try {
      const now = new Date().toISOString();
      const updateData: any = { status: novoStatus, atualizado_em: now };

      if (novoStatus === 'confirmado') updateData.data_confirmacao = now;
      if (novoStatus === 'em_preparacao') updateData.data_preparacao_inicio = now;
      if (novoStatus === 'pronto') updateData.data_preparacao_fim = now;
      if (novoStatus === 'saiu_para_entrega') updateData.data_saida_entrega = now;
      if (novoStatus === 'entregue') updateData.data_entrega = now;

      const { error } = await supabase
        .from('pedido_delivery')
        .update(updateData)
        .eq('id', pedido.id);

      if (error) throw error;

      await supabase.from('pedido_delivery_historico').insert({
        pedido_id: pedido.id,
        status_anterior: pedido.status,
        status_novo: novoStatus,
        usuario_tipo: 'admin',
        criado_em: now,
      });

      toast({ title: 'Status atualizado!', description: `Pedido ${pedido.codigo} atualizado para ${STATUS_CONFIG[novoStatus].label}` });
      loadPedidos();
      setModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status.' });
    } finally {
      setProcessando(false);
    }
  };

  const handleCancelar = async () => {
    if (!pedidoSelecionado || !motivoCancelamento.trim()) return;
    setProcessando(true);
    try {
      const now = new Date().toISOString();
      await supabase
        .from('pedido_delivery')
        .update({
          status: 'cancelado',
          motivo_cancelamento: motivoCancelamento,
          data_cancelamento: now,
          atualizado_em: now,
        })
        .eq('id', pedidoSelecionado.id);

      await supabase.from('pedido_delivery_historico').insert({
        pedido_id: pedidoSelecionado.id,
        status_anterior: pedidoSelecionado.status,
        status_novo: 'cancelado',
        observacao: motivoCancelamento,
        usuario_tipo: 'admin',
        criado_em: now,
      });

      toast({ title: 'Pedido cancelado', description: `Pedido ${pedidoSelecionado.codigo} foi cancelado.` });
      setCancelDialogOpen(false);
      setModalOpen(false);
      setMotivoCancelamento('');
      loadPedidos();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível cancelar o pedido.' });
    } finally {
      setProcessando(false);
    }
  };

  const pedidosPendentes = pedidos.filter(p => p.status === 'pendente');
  const pedidosEmPreparacao = pedidos.filter(p => ['confirmado', 'em_preparacao'].includes(p.status));
  const pedidosProntos = pedidos.filter(p => ['pronto', 'saiu_para_entrega'].includes(p.status));

  const PedidoCard = ({ pedido }: { pedido: Pedido }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleVerPedido(pedido)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{pedido.codigo}</span>
              <Badge className={STATUS_CONFIG[pedido.status].color}>
                {STATUS_CONFIG[pedido.status].label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{getTimeAgo(pedido.criado_em)}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">{formatCurrency(pedido.total)}</p>
            <p className="text-xs text-muted-foreground">{pedido.tipo === 'delivery' ? 'Entrega' : 'Retirada'}</p>
          </div>
        </div>
        <Separator className="my-2" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{pedido.cliente?.telefone || 'N/A'}</span>
          </div>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-1" /> Ver
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Delivery' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">Pedidos de Delivery</h1>
                <Badge className="bg-green-500 animate-pulse">NOVO</Badge>
              </div>
              <p className="text-muted-foreground">Gerencie os pedidos recebidos pelo cardápio online</p>
            </div>
            <Button variant="outline" onClick={loadPedidos}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600">{pedidosPendentes.length}</div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">{pedidosEmPreparacao.length}</div>
                <p className="text-sm text-muted-foreground">Em Preparação</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{pedidosProntos.length}</div>
                <p className="text-sm text-muted-foreground">Prontos/Enviando</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pendentes">
            <TabsList>
              <TabsTrigger value="pendentes" className="relative">
                Pendentes
                {pedidosPendentes.length > 0 && (
                  <Badge className="ml-2 bg-yellow-500">{pedidosPendentes.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="preparacao">Em Preparação</TabsTrigger>
              <TabsTrigger value="prontos">Prontos</TabsTrigger>
            </TabsList>

            <TabsContent value="pendentes" className="space-y-4">
              {loading ? (
                <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
              ) : pedidosPendentes.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum pedido pendente</CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pedidosPendentes.map(p => <PedidoCard key={p.id} pedido={p} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="preparacao" className="space-y-4">
              {pedidosEmPreparacao.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum pedido em preparação</CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pedidosEmPreparacao.map(p => <PedidoCard key={p.id} pedido={p} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="prontos" className="space-y-4">
              {pedidosProntos.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum pedido pronto</CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pedidosProntos.map(p => <PedidoCard key={p.id} pedido={p} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal Detalhes do Pedido */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Pedido {pedidoSelecionado?.codigo}</DialogTitle>
              <DialogDescription>
                {pedidoSelecionado?.cliente?.nome} • {pedidoSelecionado?.cliente?.telefone}
              </DialogDescription>
            </DialogHeader>

            {pedidoSelecionado && (
              <div className="space-y-4">
                {/* Status atual */}
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_CONFIG[pedidoSelecionado.status].color}>
                    {STATUS_CONFIG[pedidoSelecionado.status].icon}
                    <span className="ml-1">{STATUS_CONFIG[pedidoSelecionado.status].label}</span>
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(pedidoSelecionado.criado_em)}
                  </span>
                </div>

                {/* Endereço */}
                {pedidoSelecionado.tipo === 'delivery' && pedidoSelecionado.endereco_entrega && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Endereço de Entrega
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pedidoSelecionado.endereco_entrega.logradouro}, {pedidoSelecionado.endereco_entrega.numero}
                      {pedidoSelecionado.endereco_entrega.complemento && ` - ${pedidoSelecionado.endereco_entrega.complemento}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {pedidoSelecionado.endereco_entrega.bairro}
                    </p>
                  </div>
                )}

                {/* Itens */}
                <div>
                  <p className="font-medium mb-2">Itens</p>
                  <div className="space-y-2">
                    {pedidoSelecionado.itens?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.quantidade}x {item.produto_nome}</span>
                        <span>{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Totais */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(pedidoSelecionado.subtotal)}</span></div>
                  {pedidoSelecionado.taxa_entrega > 0 && <div className="flex justify-between"><span>Entrega</span><span>{formatCurrency(pedidoSelecionado.taxa_entrega)}</span></div>}
                  <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(pedidoSelecionado.total)}</span></div>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Pagamento:</span> {pedidoSelecionado.forma_pagamento}
                  {pedidoSelecionado.troco_para && ` (Troco para ${formatCurrency(pedidoSelecionado.troco_para)})`}
                </div>

                {pedidoSelecionado.observacoes && (
                  <div className="p-3 bg-yellow-50 rounded-lg text-sm">
                    <strong>Observações:</strong> {pedidoSelecionado.observacoes}
                  </div>
                )}

                {/* Ações */}
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {pedidoSelecionado.status === 'pendente' && (
                    <>
                      <Button onClick={() => atualizarStatus(pedidoSelecionado, 'confirmado')} disabled={processando} className="flex-1">
                        <CheckCircle className="h-4 w-4 mr-2" /> Confirmar
                      </Button>
                      <Button variant="destructive" onClick={() => setCancelDialogOpen(true)} disabled={processando}>
                        <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                      </Button>
                    </>
                  )}
                  {pedidoSelecionado.status === 'confirmado' && (
                    <Button onClick={() => atualizarStatus(pedidoSelecionado, 'em_preparacao')} disabled={processando} className="w-full">
                      <ChefHat className="h-4 w-4 mr-2" /> Iniciar Preparo
                    </Button>
                  )}
                  {pedidoSelecionado.status === 'em_preparacao' && (
                    <Button onClick={() => atualizarStatus(pedidoSelecionado, 'pronto')} disabled={processando} className="w-full">
                      <Package className="h-4 w-4 mr-2" /> Pronto
                    </Button>
                  )}
                  {pedidoSelecionado.status === 'pronto' && pedidoSelecionado.tipo === 'delivery' && (
                    <Button onClick={() => atualizarStatus(pedidoSelecionado, 'saiu_para_entrega')} disabled={processando} className="w-full">
                      <Bike className="h-4 w-4 mr-2" /> Saiu para Entrega
                    </Button>
                  )}
                  {pedidoSelecionado.status === 'saiu_para_entrega' && (
                    <Button onClick={() => atualizarStatus(pedidoSelecionado, 'entregue')} disabled={processando} className="w-full">
                      <Home className="h-4 w-4 mr-2" /> Entregue
                    </Button>
                  )}
                  {pedidoSelecionado.status === 'pronto' && pedidoSelecionado.tipo === 'retirada' && (
                    <Button onClick={() => atualizarStatus(pedidoSelecionado, 'entregue')} disabled={processando} className="w-full">
                      <CheckCircle className="h-4 w-4 mr-2" /> Entregue ao Cliente
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog Cancelamento */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Pedido</DialogTitle>
              <DialogDescription>Informe o motivo do cancelamento</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Produto indisponível, cliente desistiu..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Voltar</Button>
              <Button variant="destructive" onClick={handleCancelar} disabled={!motivoCancelamento.trim() || processando}>
                {processando ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
