'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChefHat,
  Package,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  User,
  DollarSign,
  FileKey,
  AlertTriangle,
  Loader2,
  Printer
} from 'lucide-react';

// Tipos
type OrderStatus = 'PLACED' | 'CONFIRMED' | 'IN_PREPARATION' | 'READY_FOR_PICKUP' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | 'REJECTED';

interface IFoodOrder {
  id: string;
  order_id: string;
  short_order_number: string;
  venda_id: string;
  customer_name: string;
  customer_phone: string;
  customer_document: string;
  order_type: 'DELIVERY' | 'TAKEOUT' | 'INDOOR';
  ifood_status: OrderStatus;
  total: number;
  subtotal: number;
  taxa_entrega: number;
  desconto: number;
  forma_pagamento: string;
  is_prepaid: boolean;
  delivery_address: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    referencia: string;
  } | null;
  observacao: string;
  itens: Array<{
    id: string;
    nome: string;
    quantidade: number;
    preco_unitario: number;
    total: number;
    observacao: string;
  }>;
  criado_em: string;
  estimated_delivery_time: number;
  delivery_by: string;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  'PLACED': { label: 'Novo', color: 'bg-blue-500', icon: ShoppingBag },
  'CONFIRMED': { label: 'Confirmado', color: 'bg-yellow-500', icon: CheckCircle },
  'IN_PREPARATION': { label: 'Preparando', color: 'bg-orange-500', icon: ChefHat },
  'READY_FOR_PICKUP': { label: 'Pronto', color: 'bg-purple-500', icon: Package },
  'DISPATCHED': { label: 'Enviado', color: 'bg-indigo-500', icon: Truck },
  'DELIVERED': { label: 'Entregue', color: 'bg-green-500', icon: CheckCircle },
  'CANCELLED': { label: 'Cancelado', color: 'bg-red-500', icon: XCircle },
  'REJECTED': { label: 'Recusado', color: 'bg-red-600', icon: XCircle },
};

function OrderCard({ order, onAction, loading }: { 
  order: IFoodOrder; 
  onAction: (action: string, orderId: string, data?: any) => Promise<void>;
  loading: boolean;
}) {
  const config = statusConfig[order.ifood_status] || statusConfig['PLACED'];
  const IconComponent = config.icon;
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleAction = async (action: string) => {
    if (action === 'cancel') {
      setCancelDialogOpen(true);
    } else {
      await onAction(action, order.order_id);
    }
  };

  const handleConfirmCancel = async () => {
    await onAction('cancel', order.order_id, { reason: cancelReason });
    setCancelDialogOpen(false);
    setCancelReason('');
  };

  return (
    <>
      <Card className="relative overflow-hidden">
        {/* Status indicator */}
        <div className={`absolute top-0 left-0 w-1 h-full ${config.color}`} />
        
        <CardContent className="p-4 pl-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">#{order.short_order_number || order.order_id.slice(-6)}</span>
                <Badge className={config.color}>{config.label}</Badge>
                {order.order_type === 'TAKEOUT' && (
                  <Badge variant="outline">Retirada</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatTime(order.criado_em)} • {order.order_type === 'DELIVERY' ? 'Delivery' : order.order_type === 'TAKEOUT' ? 'Retirada' : 'Local'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{formatCurrency(order.total)}</p>
              <p className="text-sm text-muted-foreground">
                {order.forma_pagamento} {order.is_prepaid && '(Pago)'}
              </p>
            </div>
          </div>

          {/* Customer info */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{order.customer_name}</span>
            {order.customer_phone && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer_phone}</span>
              </>
            )}
          </div>

          {/* Delivery address */}
          {order.delivery_address && order.order_type === 'DELIVERY' && (
            <div className="flex items-start gap-2 mb-3 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {order.delivery_address.logradouro}, {order.delivery_address.numero}
                {order.delivery_address.complemento && ` - ${order.delivery_address.complemento}`}
                <br />
                {order.delivery_address.bairro} - {order.delivery_address.cidade}/{order.delivery_address.estado}
              </span>
            </div>
          )}

          {/* Items preview */}
          <div className="text-sm mb-3">
            {order.itens?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.quantidade}x {item.nome}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}
            {order.itens?.length > 3 && (
              <span className="text-muted-foreground">+{order.itens.length - 3} itens</span>
            )}
          </div>

          {/* Observation */}
          {order.observacao && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-sm">
              <strong>Obs:</strong> {order.observacao}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {order.ifood_status === 'PLACED' && (
              <>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleAction('confirm')}
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aceitar
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleAction('cancel')}
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Recusar
                </Button>
              </>
            )}
            
            {order.ifood_status === 'CONFIRMED' && (
              <Button 
                size="sm" 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => handleAction('startPreparation')}
                disabled={loading}
              >
                <ChefHat className="h-4 w-4 mr-1" />
                Iniciar Preparo
              </Button>
            )}
            
            {order.ifood_status === 'IN_PREPARATION' && (
              <Button 
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => handleAction('ready')}
                disabled={loading}
              >
                <Package className="h-4 w-4 mr-1" />
                Pronto
              </Button>
            )}
            
            {order.ifood_status === 'READY_FOR_PICKUP' && order.order_type === 'DELIVERY' && (
              <Button 
                size="sm" 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => handleAction('dispatch')}
                disabled={loading}
              >
                <Truck className="h-4 w-4 mr-1" />
                Despachar
              </Button>
            )}
            
            {order.ifood_status === 'READY_FOR_PICKUP' && order.order_type === 'TAKEOUT' && (
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleAction('delivered')}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Entregue
              </Button>
            )}
            
            {order.ifood_status === 'DISPATCHED' && (
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleAction('delivered')}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Entregue
              </Button>
            )}
            
            {!['DELIVERED', 'CANCELLED', 'REJECTED'].includes(order.ifood_status) && order.ifood_status !== 'PLACED' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleAction('cancel')}
                disabled={loading}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Pedido</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Motivo do cancelamento..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel} disabled={!cancelReason || loading}>
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function DeliveryPage() {
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<IFoodOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [ifoodConnected, setIfoodConnected] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);

    try {
      // Buscar vendas do canal iFood
      const { data: vendas, error } = await supabase
        .from('vendas')
        .select(`
          *,
          itens:itens_venda(*)
        `)
        .eq('empresa_id', empresaId)
        .eq('canal', 'ifood')
        .order('criado_em', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Buscar dados extras do iFood
      const { data: ifoodPedidos } = await supabase
        .from('ifood_pedidos')
        .select('*')
        .eq('empresa_id', empresaId);

      // Mapear pedidos
      const mappedOrders: IFoodOrder[] = (vendas || []).map(venda => {
        const ifoodData = ifoodPedidos?.find(p => p.venda_id === venda.id);
        
        return {
          id: venda.id,
          order_id: ifoodData?.order_id || venda.pedido_externo_id || venda.id,
          short_order_number: ifoodData?.short_order_number || venda.pedido_externo_id?.slice(-6) || '',
          venda_id: venda.id,
          customer_name: venda.nome_cliente || 'Cliente',
          customer_phone: venda.telefone_cliente || '',
          customer_document: '',
          order_type: venda.order_type || 'DELIVERY',
          ifood_status: mapStatus(venda.status, ifoodData?.ifood_status),
          total: venda.total || 0,
          subtotal: venda.subtotal || 0,
          taxa_entrega: venda.taxa_entrega || 0,
          desconto: venda.desconto || 0,
          forma_pagamento: venda.forma_pagamento || 'ifood_online',
          is_prepaid: venda.forma_pagamento === 'ifood_online',
          delivery_address: venda.entrega_logradouro ? {
            logradouro: venda.entrega_logradouro,
            numero: venda.entrega_numero || '',
            complemento: venda.entrega_complemento || '',
            bairro: venda.entrega_bairro || '',
            cidade: venda.entrega_cidade || '',
            estado: venda.entrega_estado || '',
            cep: venda.entrega_cep || '',
            referencia: venda.entrega_referencia || '',
          } : null,
          observacao: venda.observacao || '',
          itens: (venda.itens || []).map((item: any) => ({
            id: item.id,
            nome: item.nome,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            total: item.total || item.preco_unitario * item.quantidade,
            observacao: item.observacao || '',
          })),
          criado_em: venda.criado_em,
          estimated_delivery_time: ifoodData?.estimated_delivery_time || 30,
          delivery_by: ifoodData?.delivery_by || 'RESTAURANTE',
        };
      });

      setOrders(mappedOrders);

      // Verificar conexão iFood
      const { data: ifoodConfig } = await supabase
        .from('ifood_config')
        .select('status')
        .eq('empresa_id', empresaId)
        .maybeSingle();
      
      setIfoodConnected(ifoodConfig?.status === 'connected');
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os pedidos.',
      });
    } finally {
      setLoading(false);
    }
  }, [empresaId, supabase, toast]);

  const mapStatus = (vendaStatus: string, ifoodStatus?: string): OrderStatus => {
    if (ifoodStatus) return ifoodStatus as OrderStatus;
    
    switch (vendaStatus) {
      case 'aberta': return 'PLACED';
      case 'fechada': return 'DELIVERED';
      case 'cancelada': return 'CANCELLED';
      default: return 'PLACED';
    }
  };

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleAction = async (action: string, orderId: string, data?: any) => {
    if (!empresaId || !user) return;
    setActionLoading(orderId);

    try {
      const order = orders.find(o => o.order_id === orderId);
      if (!order) return;

      let newStatus: OrderStatus = order.ifood_status;
      
      switch (action) {
        case 'confirm':
          newStatus = 'CONFIRMED';
          break;
        case 'startPreparation':
          newStatus = 'IN_PREPARATION';
          break;
        case 'ready':
          newStatus = 'READY_FOR_PICKUP';
          break;
        case 'dispatch':
          newStatus = 'DISPATCHED';
          break;
        case 'delivered':
          newStatus = 'DELIVERED';
          break;
        case 'cancel':
          newStatus = 'CANCELLED';
          break;
      }

      // Atualizar status na venda
      const vendaStatus = newStatus === 'DELIVERED' ? 'fechada' : 
                          newStatus === 'CANCELLED' ? 'cancelada' : 'aberta';
      
      await supabase
        .from('vendas')
        .update({ 
          status: vendaStatus,
          atualizado_em: new Date().toISOString() 
        })
        .eq('id', order.venda_id);

      // Atualizar status no iFood pedidos
      await supabase
        .from('ifood_pedidos')
        .update({ 
          ifood_status: newStatus,
          atualizado_em: new Date().toISOString() 
        })
        .eq('order_id', orderId);

      // Registrar log
      await supabase
        .from('ifood_logs')
        .insert({
          empresa_id: empresaId,
          tipo: 'order_' + action,
          order_id: orderId,
          detalhes: `Pedido ${action} - ${newStatus}`,
          dados: data,
          sucesso: true,
          criado_em: new Date().toISOString(),
        });

      toast({
        title: 'Status atualizado!',
        description: `Pedido #${order.short_order_number} - ${statusConfig[newStatus].label}`,
      });

      // Recarregar pedidos
      loadOrders();
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o pedido.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Filtrar pedidos
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.short_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'new':
        return ['PLACED'].includes(order.ifood_status);
      case 'preparing':
        return ['CONFIRMED', 'IN_PREPARATION'].includes(order.ifood_status);
      case 'ready':
        return ['READY_FOR_PICKUP', 'DISPATCHED'].includes(order.ifood_status);
      case 'finished':
        return ['DELIVERED', 'CANCELLED', 'REJECTED'].includes(order.ifood_status);
      default:
        return true;
    }
  });

  // Contadores
  const counts = {
    all: orders.length,
    new: orders.filter(o => o.ifood_status === 'PLACED').length,
    preparing: orders.filter(o => ['CONFIRMED', 'IN_PREPARATION'].includes(o.ifood_status)).length,
    ready: orders.filter(o => ['READY_FOR_PICKUP', 'DISPATCHED'].includes(o.ifood_status)).length,
    finished: orders.filter(o => ['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.ifood_status)).length,
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Delivery' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Truck className="h-8 w-8 text-orange-600" />
                Delivery
              </h1>
              <p className="text-muted-foreground">
                Gerencie pedidos do iFood e delivery
              </p>
            </div>
            <div className="flex items-center gap-2">
              {ifoodConnected ? (
                <Badge className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  iFood Conectado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  iFood Desconectado
                </Badge>
              )}
              <Button variant="outline" size="icon" onClick={loadOrders} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou nome do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                Todos ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="new">
                Novos ({counts.new})
              </TabsTrigger>
              <TabsTrigger value="preparing">
                Preparando ({counts.preparing})
              </TabsTrigger>
              <TabsTrigger value="ready">
                Prontos ({counts.ready})
              </TabsTrigger>
              <TabsTrigger value="finished">
                Finalizados ({counts.finished})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pedido encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onAction={handleAction}
                      loading={actionLoading === order.order_id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
