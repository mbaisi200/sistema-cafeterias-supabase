'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  Store, 
  Bike, 
  ChefHat,
  Package,
  Home,
  Star,
  RefreshCw,
  AlertCircle,
  Share2
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
  empresa_id: string;
  endereco_entrega?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    pontoReferencia?: string;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_STEPS: { status: PedidoDeliveryStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'pendente', label: 'Recebido', icon: <Clock className="h-5 w-5" /> },
  { status: 'confirmado', label: 'Confirmado', icon: <CheckCircle2 className="h-5 w-5" /> },
  { status: 'em_preparacao', label: 'Em Preparação', icon: <ChefHat className="h-5 w-5" /> },
  { status: 'pronto', label: 'Pronto', icon: <Package className="h-5 w-5" /> },
  { status: 'saiu_para_entrega', label: 'Saiu para Entrega', icon: <Bike className="h-5 w-5" /> },
  { status: 'entregue', label: 'Entregue', icon: <Home className="h-5 w-5" /> },
];

function PedidoContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const pedidoId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [empresa, setEmpresa] = useState<{ nome: string; telefone?: string; endereco?: string } | null>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [avaliacaoOpen, setAvaliacaoOpen] = useState(false);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  useEffect(() => {
    if (pedidoId) loadPedido();
  }, [pedidoId]);

  useEffect(() => {
    if (!pedido || ['entregue', 'cancelado', 'rejeitado'].includes(pedido.status)) return;
    const interval = setInterval(loadPedido, 15000);
    return () => clearInterval(interval);
  }, [pedido]);

  const loadPedido = async () => {
    try {
      const { data, error } = await supabase
        .from('pedido_delivery')
        .select('*')
        .eq('id', pedidoId)
        .single();

      if (error) throw error;
      setPedido(data);

      const { data: empresaData } = await supabase
        .from('empresas')
        .select('nome, telefone, endereco')
        .eq('id', data.empresa_id)
        .single();
      setEmpresa(empresaData);

      const { data: itensData } = await supabase
        .from('pedido_delivery_itens')
        .select('*')
        .eq('pedido_id', pedidoId);
      setItens(itensData || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar o pedido.' });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = (): number => {
    if (!pedido) return 0;
    const index = STATUS_STEPS.findIndex(s => s.status === pedido.status);
    return index >= 0 ? index : 0;
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link copiado!', description: 'Compartilhe o link para acompanhar o pedido.' });
  };

  const handleEnviarAvaliacao = async () => {
    if (!pedido) return;
    setEnviandoAvaliacao(true);
    try {
      const { error } = await supabase
        .from('pedido_delivery_avaliacoes')
        .insert({
          pedido_id: pedido.id,
          empresa_id: pedido.empresa_id,
          nota_geral: nota,
          comentario: comentario || null,
          criado_em: new Date().toISOString(),
        });
      if (error) throw error;
      toast({ title: 'Avaliação enviada!', description: 'Obrigado por avaliar seu pedido.' });
      setAvaliacaoOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível enviar a avaliação.' });
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Pedido não encontrado</h2>
          <Button onClick={() => router.push('/')} className="mt-4">Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  const currentStep = getCurrentStepIndex();
  const isDelivery = pedido.tipo === 'delivery';
  const isFinalizado = ['entregue', 'cancelado', 'rejeitado'].includes(pedido.status);
  const isCancelado = pedido.status === 'cancelado' || pedido.status === 'rejeitado';

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Pedido</p>
              <h1 className="text-3xl font-bold">{pedido.codigo}</h1>
            </div>
            <Button variant="secondary" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" /> Compartilhar
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Status do Pedido</span>
              {isCancelado ? (
                <Badge variant="destructive">Cancelado</Badge>
              ) : isFinalizado ? (
                <Badge className="bg-green-500">Finalizado</Badge>
              ) : (
                <Button variant="ghost" size="sm" onClick={loadPedido}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isCancelado ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-6">
                  {STATUS_STEPS.map((step, index) => {
                    if (step.status === 'saiu_para_entrega' && !isDelivery) return null;
                    const isPast = index < currentStep;
                    const isCurrent = index === currentStep;
                    const isFuture = index > currentStep;

                    return (
                      <div key={step.status} className="flex items-start gap-4">
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                          isPast ? 'bg-green-500 text-white' :
                          isCurrent ? 'bg-orange-500 text-white animate-pulse' :
                          'bg-gray-200 text-gray-400'
                        }`}>
                          {isPast ? <CheckCircle2 className="h-5 w-5" /> : step.icon}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className={`font-medium ${isFuture ? 'text-gray-400' : ''}`}>{step.label}</p>
                          {isCurrent && !isFinalizado && (
                            <p className="text-sm text-muted-foreground">
                              {pedido.status === 'pendente' && 'Aguardando confirmação...'}
                              {pedido.status === 'confirmado' && 'Seu pedido foi confirmado!'}
                              {pedido.status === 'em_preparacao' && 'Estamos preparando seu pedido!'}
                              {pedido.status === 'pronto' && (isDelivery ? 'Aguardando entregador.' : 'Pronto para retirada!')}
                              {pedido.status === 'saiu_para_entrega' && 'Entregador a caminho!'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-muted-foreground">Este pedido foi {pedido.status === 'cancelado' ? 'cancelado' : 'rejeitado'}.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Empresa */}
        {empresa && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{empresa.nome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {empresa.telefone && (
                <a href={`tel:${empresa.telefone}`} className="flex items-center gap-2 hover:text-primary">
                  <Phone className="h-4 w-4" /> {empresa.telefone}
                </a>
              )}
              {empresa.endereco && (
                <p className="flex items-start gap-2 text-muted-foreground">
                  <Store className="h-4 w-4 mt-0.5" /> {empresa.endereco}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Endereço */}
        {isDelivery && pedido.endereco_entrega && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Endereço de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {pedido.endereco_entrega.logradouro}, {pedido.endereco_entrega.numero}
                {pedido.endereco_entrega.complemento && ` - ${pedido.endereco_entrega.complemento}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {pedido.endereco_entrega.bairro} - {pedido.endereco_entrega.cidade}/{pedido.endereco_entrega.estado}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Itens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {itens.map((item, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      <span className="text-muted-foreground">{item.quantidade}x</span> {item.produto_nome}
                    </p>
                    {item.observacoes && <p className="text-sm text-muted-foreground italic">{item.observacoes}</p>}
                  </div>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(pedido.subtotal)}</span></div>
              {pedido.taxa_entrega > 0 && <div className="flex justify-between"><span>Taxa de entrega</span><span>{formatCurrency(pedido.taxa_entrega)}</span></div>}
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(pedido.total)}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t text-sm">
              <span className="text-muted-foreground">Pagamento:</span> <span className="font-medium">{pedido.forma_pagamento}</span>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="space-y-3">
          {pedido.status === 'entregue' && (
            <Button onClick={() => setAvaliacaoOpen(true)} className="w-full" variant="outline">
              <Star className="h-4 w-4 mr-2" /> Avaliar Pedido
            </Button>
          )}
          <Button onClick={() => router.push(`/cardapio?empresa=${pedido.empresa_id}`)} className="w-full">
            Fazer Novo Pedido
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pedido realizado em {formatDate(pedido.criado_em)}
        </p>
      </div>

      {/* Modal Avaliação */}
      <Dialog open={avaliacaoOpen} onOpenChange={setAvaliacaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar Pedido</DialogTitle>
            <DialogDescription>Como foi sua experiência?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setNota(i)} className="p-1">
                  <Star className={`h-10 w-10 ${i <= nota ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Comentário (opcional)</Label>
              <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Conte-nos mais..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvaliacaoOpen(false)}>Cancelar</Button>
            <Button onClick={handleEnviarAvaliacao} disabled={enviandoAvaliacao}>
              {enviandoAvaliacao ? 'Enviando...' : 'Enviar Avaliação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PedidoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    }>
      <PedidoContent />
    </Suspense>
  );
}
