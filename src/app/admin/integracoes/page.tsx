'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft,
  ArrowRight,
  ShoppingCart,
  Bike,
  MessageCircle,
  Globe,
  Loader2,
  Settings,
  Link2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';

interface IntegracaoStatus {
  ativo: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  totalPedidos?: number;
}

const integracoesDisponiveis = [
  {
    id: 'ifood',
    nome: 'iFood',
    descricao: 'Receba pedidos do iFood automaticamente no seu sistema. Sincronize cardápio, estoque e gerencie seus pedidos de delivery.',
    icone: (
      <svg viewBox="0 0 24 24" className="h-10 w-10 fill-current">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    ),
    disponivel: true,
    cor: 'text-red-500',
    bgCor: 'bg-red-50',
    recursos: [
      'Recebimento automático de pedidos',
      'Sincronização de cardápio',
      'Atualização de estoque em tempo real',
      'Solicitação de entregador',
    ],
  },
  {
    id: 'rappi',
    nome: 'Rappi',
    descricao: 'Integre com o Rappi para receber pedidos e gerenciar seu delivery de forma centralizada.',
    icone: <ShoppingCart className="h-10 w-10" />,
    disponivel: false,
    cor: 'text-orange-500',
    bgCor: 'bg-orange-50',
    recursos: [
      'Recebimento automático de pedidos',
      'Gestão centralizada de pedidos',
      'Sincronização de produtos',
    ],
  },
  {
    id: 'uber_eats',
    nome: 'Uber Eats',
    descricao: 'Conecte seu estabelecimento ao Uber Eats e gerencie todos os pedidos em um só lugar.',
    icone: <Bike className="h-10 w-10" />,
    disponivel: false,
    cor: 'text-green-500',
    bgCor: 'bg-green-50',
    recursos: [
      'Integração de pedidos',
      'Sincronização de menu',
      'Atualização de status',
    ],
  },
  {
    id: 'whatsapp',
    nome: 'WhatsApp Business',
    descricao: 'Receba pedidos via WhatsApp e integre diretamente ao seu sistema de gestão.',
    icone: <MessageCircle className="h-10 w-10" />,
    disponivel: false,
    cor: 'text-emerald-500',
    bgCor: 'bg-emerald-50',
    recursos: [
      'Recebimento de pedidos via chat',
      'Respostas automáticas',
      'Integração com catálogo',
    ],
  },
  {
    id: 'mercado_pago',
    nome: 'Mercado Pago',
    descricao: 'Receba pagamentos online com Mercado Pago e tenha conciliação automática.',
    icone: <Globe className="h-10 w-10" />,
    disponivel: false,
    cor: 'text-blue-500',
    bgCor: 'bg-blue-50',
    recursos: [
      'Pagamentos online',
      'PIX automático',
      'Conciliação financeira',
    ],
  },
];

function IntegracoesContent() {
  const { empresaId, empresaNome } = useAuth();
  const [integracoesStatus, setIntegracoesStatus] = useState<Record<string, IntegracaoStatus>>({});
  const [loading, setLoading] = useState(true);

  // Carregar status das integrações
  useEffect(() => {
    if (empresaId) {
      carregarStatusIntegracoes();
    }
  }, [empresaId]);

  const carregarStatusIntegracoes = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const supabase = getSupabaseClient();

      // Carregar status do iFood
      const { data: ifoodConfig, error } = await supabase
        .from('ifood_config')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      const status: Record<string, IntegracaoStatus> = {};

      if (ifoodConfig) {
        status['ifood'] = {
          ativo: ifoodConfig.ativo || false,
          status: ifoodConfig.status || 'disconnected',
          totalPedidos: ifoodConfig.total_pedidos_recebidos || 0
        };
      } else {
        status['ifood'] = {
          ativo: false,
          status: 'disconnected'
        };
      }

      // Outras integrações (por enquanto desconectadas)
      status['rappi'] = { ativo: false, status: 'disconnected' };
      status['uber_eats'] = { ativo: false, status: 'disconnected' };
      status['whatsapp'] = { ativo: false, status: 'disconnected' };
      status['mercado_pago'] = { ativo: false, status: 'disconnected' };

      setIntegracoesStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (integracaoId: string) => {
    const status = integracoesStatus[integracaoId];
    if (!status) {
      return <Badge variant="outline">Não configurado</Badge>;
    }

    switch (status.status) {
      case 'connected':
        return (
          <Badge className="bg-green-500">
            <Link2 className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'disconnected':
        return <Badge variant="outline">Desconectado</Badge>;
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="outline">Não configurado</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Integrações</h1>
          <p className="text-muted-foreground mt-2">
            Conecte seu sistema com as principais plataformas de delivery e pagamento do mercado
          </p>
          {empresaNome && (
            <p className="text-sm text-muted-foreground mt-1">
              Empresa: <strong>{empresaNome}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Integrações disponíveis */}
      <div className="grid gap-6 md:grid-cols-2">
        {integracoesDisponiveis.map((integracao) => {
          const status = integracoesStatus[integracao.id];
          
          return (
            <Card key={integracao.id} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${integracao.bgCor} ${integracao.cor}`}>
                    {integracao.icone}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(integracao.id)}
                    {status?.totalPedidos !== undefined && status.totalPedidos > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {status.totalPedidos} pedidos
                      </span>
                    )}
                  </div>
                </div>
                <CardTitle className="text-xl mt-4">{integracao.nome}</CardTitle>
                <CardDescription className="text-sm">
                  {integracao.descricao}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {integracao.recursos.map((recurso, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{recurso}</span>
                    </div>
                  ))}
                </div>
                
                {integracao.disponivel ? (
                  <Link href={`/admin/integracoes/${integracao.id}`}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Settings className="h-4 w-4 mr-2" />
                      {status?.status === 'connected' ? 'Gerenciar' : 'Configurar'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Disponível em breve
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="mt-8 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-orange-100">
              <ExternalLink className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Precisa de uma integração específica?</h3>
              <p className="text-muted-foreground mt-1">
                Entre em contato conosco para solicitar a integração com outras plataformas. 
                Estamos constantemente expandindo nossas parcerias para oferecer mais opções aos nossos clientes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function IntegracoesPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Integrações' }]}>
        <IntegracoesContent />
      </MainLayout>
    </ProtectedRoute>
  );
}
