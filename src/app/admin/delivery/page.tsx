'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  MapPin, 
  Phone, 
  User, 
  Clock, 
  Package,
  ChefHat,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';

interface VendaDelivery {
  id: string;
  pedidoExternoId?: string;
  canal: string;
  status: string;
  nomeCliente?: string;
  telefoneCliente?: string;
  enderecoEntrega?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    referencia?: string;
  };
  subtotal: number;
  taxaEntrega: number;
  desconto: number;
  total: number;
  observacao?: string;
  criadoEm?: Date;
}

interface ItemVenda {
  id: string;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  observacao?: string;
}

const statusColors: Record<string, string> = {
  'aberta': 'bg-yellow-500',
  'em_preparo': 'bg-blue-500',
  'pronta': 'bg-green-500',
  'entregue': 'bg-gray-500',
  'cancelada': 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  'aberta': 'Aguardando',
  'em_preparo': 'Em Preparo',
  'pronta': 'Pronta',
  'entregue': 'Entregue',
  'cancelada': 'Cancelada',
};

const canalColors: Record<string, string> = {
  'ifood': 'bg-red-500',
  'rappi': 'bg-orange-500',
  'uber_eats': 'bg-green-500',
  'whatsapp': 'bg-emerald-500',
  'delivery': 'bg-purple-500',
};

export default function DeliveryPage() {
  const { empresaId } = useAuth();
  const [vendas, setVendas] = useState<VendaDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaDelivery | null>(null);
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (empresaId) {
      carregarVendas();
    }
  }, [empresaId]);

  const carregarVendas = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      // Buscar vendas de delivery
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'delivery')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      
      const vendasLista: VendaDelivery[] = (data || []).map((venda: any) => ({
        id: venda.id,
        pedidoExternoId: venda.pedido_externo_id,
        canal: venda.canal || 'delivery',
        status: venda.status || 'aberta',
        nomeCliente: venda.nome_cliente,
        telefoneCliente: venda.telefone_cliente,
        enderecoEntrega: venda.endereco_entrega,
        subtotal: venda.subtotal || 0,
        taxaEntrega: venda.taxa_entrega || 0,
        desconto: venda.desconto || 0,
        total: venda.total || 0,
        observacao: venda.observacao,
        criadoEm: venda.criado_em ? new Date(venda.criado_em) : undefined,
      }));

      setVendas(vendasLista);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarItens = async (vendaId: string) => {
    setLoadingItens(true);
    try {
      const { data, error } = await supabase
        .from('itens_venda')
        .select('*')
        .eq('venda_id', vendaId);

      if (error) throw error;
      
      const itensLista: ItemVenda[] = (data || []).map((item: any) => ({
        id: item.id,
        produtoNome: item.nome || 'Produto',
        quantidade: item.quantidade || 1,
        precoUnitario: item.preco_unitario || 0,
        observacao: item.observacao,
      }));

      setItensVenda(itensLista);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setLoadingItens(false);
    }
  };

  const handleSelecionarVenda = (venda: VendaDelivery) => {
    setVendaSelecionada(venda);
    carregarItens(venda.id);
  };

  const handleAtualizarStatus = async (novoStatus: string) => {
    if (!vendaSelecionada) return;
    
    setAtualizando(true);
    try {
      const { error } = await supabase
        .from('vendas')
        .update({
          status: novoStatus,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', vendaSelecionada.id);

      if (error) throw error;

      // Atualizar localmente
      setVendaSelecionada({ ...vendaSelecionada, status: novoStatus });
      setVendas(vendas.map(v => v.id === vendaSelecionada.id ? { ...v, status: novoStatus } : v));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setAtualizando(false);
    }
  };

  const formatarHorario = (data?: Date) => {
    if (!data) return '--:--';
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarData = (data?: Date) => {
    if (!data) return '--/--';
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Delivery' }]}>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Delivery' }]}>
        <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8 text-orange-500" />
            Pedidos Delivery
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os pedidos de delivery do iFood e outros canais
          </p>
        </div>
        <Button variant="outline" onClick={carregarVendas}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{vendas.filter(v => v.status === 'aberta').length}</p>
                <p className="text-xs text-muted-foreground">Aguardando</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{vendas.filter(v => v.status === 'em_preparo').length}</p>
                <p className="text-xs text-muted-foreground">Em Preparo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{vendas.filter(v => v.status === 'pronta').length}</p>
                <p className="text-xs text-muted-foreground">Prontas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{vendas.filter(v => v.canal === 'ifood').length}</p>
                <p className="text-xs text-muted-foreground">iFood Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de pedidos */}
      {vendas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum pedido de delivery</h3>
            <p className="text-muted-foreground">
              Os pedidos do iFood e outros canais de delivery aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Lista de vendas */}
          <div className="lg:col-span-2 space-y-3">
            {vendas.map((venda) => (
              <Card 
                key={venda.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  vendaSelecionada?.id === venda.id ? 'ring-2 ring-orange-500' : ''
                }`}
                onClick={() => handleSelecionarVenda(venda)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${canalColors[venda.canal] || 'bg-gray-500'} text-white`}>
                        {venda.canal === 'ifood' ? (
                          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                          </svg>
                        ) : (
                          <Truck className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">
                            #{venda.pedidoExternoId || venda.id.slice(-6).toUpperCase()}
                          </span>
                          <Badge className={statusColors[venda.status] || 'bg-gray-500'}>
                            {statusLabels[venda.status] || venda.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          <span>{venda.nomeCliente || 'Cliente'}</span>
                          {venda.telefoneCliente && (
                            <>
                              <span>•</span>
                              <Phone className="h-3 w-3" />
                              <span>{venda.telefoneCliente}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">R$ {venda.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatarData(venda.criadoEm)} às {formatarHorario(venda.criadoEm)}
                      </p>
                    </div>
                  </div>
                  
                  {venda.enderecoEntrega && (
                    <div className="mt-3 pt-3 border-t flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>
                        {venda.enderecoEntrega.logradouro}, {venda.enderecoEntrega.numero}
                        {venda.enderecoEntrega.complemento && ` - ${venda.enderecoEntrega.complemento}`}
                        {' - '}{venda.enderecoEntrega.bairro}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detalhes do pedido selecionado */}
          <div className="lg:col-span-1">
            {vendaSelecionada ? (
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>#{vendaSelecionada.pedidoExternoId || vendaSelecionada.id.slice(-6).toUpperCase()}</span>
                    <Badge className={statusColors[vendaSelecionada.status] || 'bg-gray-500'}>
                      {statusLabels[vendaSelecionada.status] || vendaSelecionada.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cliente */}
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Cliente</h4>
                    <p className="font-medium">{vendaSelecionada.nomeCliente || 'Não informado'}</p>
                    {vendaSelecionada.telefoneCliente && (
                      <p className="text-sm text-muted-foreground">{vendaSelecionada.telefoneCliente}</p>
                    )}
                  </div>

                  {/* Endereço */}
                  {vendaSelecionada.enderecoEntrega && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Endereço de Entrega</h4>
                      <p className="text-sm">
                        {vendaSelecionada.enderecoEntrega.logradouro}, {vendaSelecionada.enderecoEntrega.numero}
                        {vendaSelecionada.enderecoEntrega.complemento && ` - ${vendaSelecionada.enderecoEntrega.complemento}`}
                      </p>
                      <p className="text-sm">{vendaSelecionada.enderecoEntrega.bairro}</p>
                      {vendaSelecionada.enderecoEntrega.referencia && (
                        <p className="text-sm text-muted-foreground">Ref: {vendaSelecionada.enderecoEntrega.referencia}</p>
                      )}
                    </div>
                  )}

                  {/* Observação */}
                  {vendaSelecionada.observacao && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Observação</h4>
                      <p className="text-sm bg-yellow-50 p-2 rounded">{vendaSelecionada.observacao}</p>
                    </div>
                  )}

                  {/* Itens */}
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Itens do Pedido</h4>
                    {loadingItens ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : itensVenda.length > 0 ? (
                      <div className="space-y-2">
                        {itensVenda.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>
                              {item.quantidade}x {item.produtoNome}
                            </span>
                            <span>R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
                    )}
                  </div>

                  {/* Totais */}
                  <div className="pt-3 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>R$ {vendaSelecionada.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Entrega</span>
                      <span>R$ {vendaSelecionada.taxaEntrega.toFixed(2)}</span>
                    </div>
                    {vendaSelecionada.desconto > 0 && (
                      <div className="flex justify-between text-sm text-red-500">
                        <span>Desconto</span>
                        <span>-R$ {vendaSelecionada.desconto.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>R$ {vendaSelecionada.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="pt-3 border-t space-y-2">
                    {vendaSelecionada.status === 'aberta' && (
                      <Button 
                        className="w-full" 
                        onClick={() => handleAtualizarStatus('em_preparo')}
                        disabled={atualizando}
                      >
                        <ChefHat className="h-4 w-4 mr-2" />
                        Iniciar Preparo
                      </Button>
                    )}
                    {vendaSelecionada.status === 'em_preparo' && (
                      <Button 
                        className="w-full bg-green-500 hover:bg-green-600" 
                        onClick={() => handleAtualizarStatus('pronta')}
                        disabled={atualizando}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como Pronta
                      </Button>
                    )}
                    {vendaSelecionada.status === 'pronta' && (
                      <Button 
                        className="w-full bg-purple-500 hover:bg-purple-600" 
                        onClick={() => handleAtualizarStatus('entregue')}
                        disabled={atualizando}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Marcar como Entregue
                      </Button>
                    )}
                    {(vendaSelecionada.status === 'aberta' || vendaSelecionada.status === 'em_preparo') && (
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => handleAtualizarStatus('cancelada')}
                        disabled={atualizando}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar Pedido
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Selecione um pedido para ver os detalhes
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
