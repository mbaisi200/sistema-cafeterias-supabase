'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Loader2, RefreshCw, Clock, CheckCircle, ChefHat, Package,
  Bike, Home, XCircle, Phone, MapPin, DollarSign, AlertCircle, ShoppingBag
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface NoventaENovePedido {
  id: string;
  total: number;
  status: string;
  criado_em: string;
  nome_cliente: string;
  telefone_cliente: string;
  forma_pagamento: string;
  itens_venda: { nome: string; quantidade: number; preco_unitario: number; total: number }[];
  noventa_e_nove_pedidos: {
    order_id: string;
    display_id: string;
    ninety_nine_status: string;
    customer_name: string;
    order_type: string;
    dados_completos: any;
  }[];
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  aberta: { label: 'Aberto', color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> },
  em_preparo: { label: 'Em Preparo', color: 'bg-orange-500', icon: <ChefHat className="h-4 w-4" /> },
  pronta: { label: 'Pronto', color: 'bg-green-500', icon: <Package className="h-4 w-4" /> },
  saiu_para_entrega: { label: 'Saiu p/ Entrega', color: 'bg-purple-500', icon: <Bike className="h-4 w-4" /> },
  entregue: { label: 'Entregue', color: 'bg-green-600', icon: <Home className="h-4 w-4" /> },
  cancelada: { label: 'Cancelado', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> },
};

function NoventaENovePedidosContent() {
  const router = useRouter();
  const { empresaId } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<NoventaENovePedido[]>([]);
  const [sel, setSel] = useState<NoventaENovePedido | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (empresaId) loadPedidos();
  }, [empresaId]);

  useEffect(() => {
    const interval = setInterval(() => { if (empresaId) loadPedidos(); }, 30000);
    return () => clearInterval(interval);
  }, [empresaId]);

  const loadPedidos = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/noventa-e-nove/pedidos?empresaId=${empresaId}`);
      const json = await res.json();
      if (json.sucesso) setPedidos(json.data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const executarAcao = async (action: string, vendaId: string, orderId?: string) => {
    setProcessando(true);
    try {
      const res = await fetch('/api/noventa-e-nove/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, action, vendaId, orderId, motivo }),
      });
      const json = await res.json();
      if (json.sucesso) {
        toast({ title: 'Ação executada!', description: json.data?.message });
        loadPedidos();
        setCancelOpen(false);
        setMotivo('');
        setSel(null);
      } else {
        throw new Error(json.erro?.mensagem || 'Erro na ação');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setProcessando(false);
    }
  };

  const getOrderId = (p: NoventaENovePedido) => p.noventa_e_nove_pedidos?.[0]?.order_id || p.id;
  const getDisplayId = (p: NoventaENovePedido) => p.noventa_e_nove_pedidos?.[0]?.display_id || p.id.slice(0, 8);
  const getCustomerName = (p: NoventaENovePedido) => p.noventa_e_nove_pedidos?.[0]?.customer_name || p.nome_cliente;

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/admin/integracoes/noventa-e-nove')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Pedidos 99Food</h1>
          <p className="text-muted-foreground mt-1">Gerencie os pedidos recebidos via 99Food</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPedidos} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
      ) : pedidos.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum pedido 99Food ativo</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pedidos.map(p => {
            const sc = STATUS_MAP[p.status] || { label: p.status, color: 'bg-gray-500', icon: null };
            return (
              <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSel(p)}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        #{getDisplayId(p)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{getCustomerName(p)}</p>
                    </div>
                    <Badge className={sc.color}>{sc.icon}{sc.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" /> {getTimeAgo(p.criado_em)}
                    </div>
                    <span className="font-bold">{formatCurrency(p.total)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!sel && !cancelOpen} onOpenChange={v => { if (!v) setSel(null); }}>
        {sel && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Pedido #{getDisplayId(sel)}</DialogTitle>
              <DialogDescription>{getCustomerName(sel)} • {sel.telefone_cliente}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {sel.noventa_e_nove_pedidos?.[0]?.order_type && (
                  <Badge variant="outline">{sel.noventa_e_nove_pedidos[0].order_type}</Badge>
                )}
                <Badge className={STATUS_MAP[sel.status]?.color || 'bg-gray-500'}>
                  {STATUS_MAP[sel.status]?.icon} {STATUS_MAP[sel.status]?.label || sel.status}
                </Badge>
              </div>
              <div>
                <p className="font-medium mb-2">Itens</p>
                <div className="space-y-1">
                  {sel.itens_venda?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.quantidade}x {item.nome}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(sel.total)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Pagamento:</span> {sel.forma_pagamento}
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {['pendente', 'aberta'].includes(sel.status) && (
                  <>
                    <Button onClick={() => executarAcao('accept', sel.id, getOrderId(sel))} disabled={processando} className="flex-1 bg-blue-600">
                      <CheckCircle className="h-4 w-4 mr-2" /> Aceitar
                    </Button>
                    <Button variant="destructive" onClick={() => setCancelOpen(true)} disabled={processando}>
                      <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                    </Button>
                  </>
                )}
                {['em_preparo'].includes(sel.status) && (
                  <Button onClick={() => executarAcao('finish_preparation', sel.id, getOrderId(sel))} disabled={processando} className="w-full bg-blue-600">
                    <Package className="h-4 w-4 mr-2" /> Finalizar Preparo
                  </Button>
                )}
                {['pronta'].includes(sel.status) && (
                  <Button onClick={() => executarAcao('dispatch', sel.id, getOrderId(sel))} disabled={processando} className="w-full bg-blue-600">
                    <Bike className="h-4 w-4 mr-2" /> Despachar
                  </Button>
                )}
                {['saiu_para_entrega'].includes(sel.status) && (
                  <Button onClick={() => executarAcao('deliver', sel.id, getOrderId(sel))} disabled={processando} className="w-full bg-blue-600">
                    <Home className="h-4 w-4 mr-2" /> Entregue
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Pedido</DialogTitle>
            <DialogDescription>Informe o motivo da rejeição</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Motivo</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Produto indisponível..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button variant="destructive" onClick={() => sel && executarAcao('deny', sel.id, getOrderId(sel))} disabled={!motivo.trim() || processando}>
              {processando ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NoventaENovePedidosPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Integrações' }, { title: '99Food' }, { title: 'Pedidos' }]}>
        <NoventaENovePedidosContent />
      </MainLayout>
    </ProtectedRoute>
  );
}
