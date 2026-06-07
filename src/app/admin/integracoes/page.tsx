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
  Bike,
  MessageCircle,
  Globe,
  Loader2,
  Settings,
  Link2,
  Database
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
    id: 'noventa-e-nove',
    nome: '99Food',
    descricao: 'Conecte seu cardápio ao 99Food e receba pedidos automaticamente via Open Delivery.',
    icone: (
      <svg viewBox="0 0 512 512" className="h-10 w-10 fill-current">
        <g transform="translate(0, 512) scale(0.1, -0.1)">
          <path d="M1509 4648 c-91 -52 -105 -173 -27 -245 24 -22 77 -47 85 -39 2 2 -7 27 -21 55 -32 62 -33 103 -4 131 45 41 87 22 128 -60 17 -33 35 -60 40 -60 5 0 14 18 21 39 40 134 -103 249 -222 179z"/>
          <path d="M3464 4651 c-42 -26 -72 -66 -80 -108 -7 -36 10 -113 25 -113 4 0 20 24 36 53 39 73 53 87 90 87 33 0 58 -20 69 -55 3 -12 -6 -45 -24 -84 -17 -35 -29 -66 -27 -68 8 -7 62 18 85 40 55 51 67 123 31 187 -41 72 -139 101 -205 61z"/>
          <path d="M1185 3403 c-121 -44 -196 -110 -249 -222 -28 -61 -31 -74 -31 -166 1 -128 24 -191 102 -275 50 -55 154 -120 190 -120 7 0 13 -2 13 -4 0 -3 -50 -80 -110 -173 -61 -92 -109 -175 -108 -183 3 -12 27 -16 133 -18 72 -1 139 0 151 2 14 4 82 99 208 291 103 158 193 300 201 318 66 159 24 341 -105 460 -76 71 -146 99 -260 104 -64 3 -97 -1 -135 -14z m199 -252 c91 -60 88 -194 -6 -251 -105 -64 -245 43 -214 164 8 31 53 85 80 96 38 16 109 11 140 -9z"/>
          <path d="M2075 3406 c-193 -61 -304 -219 -293 -420 9 -165 115 -305 275 -360 l34 -12 -115 -174 c-86 -130 -112 -178 -104 -187 15 -18 278 -18 300 0 26 20 379 568 395 611 40 112 34 236 -17 336 -28 55 -101 133 -154 164 -90 53 -230 71 -321 42z m189 -255 c94 -62 87 -203 -14 -253 -67 -34 -145 -13 -187 51 -42 62 -26 141 37 195 40 33 119 36 164 7z"/>
          <path d="M4057 1963 c-4 -3 -7 -71 -7 -150 0 -78 -3 -143 -7 -143 -5 0 -28 7 -53 16 -56 20 -179 20 -242 1 -106 -33 -218 -130 -263 -230 -49 -106 -49 -248 0 -354 35 -77 125 -167 204 -205 57 -28 79 -33 161 -36 76 -3 106 1 152 16 47 17 57 18 62 6 4 -11 30 -14 121 -14 l115 0 0 550 0 550 -118 0 c-65 0 -122 -3 -125 -7z m-109 -553 c130 -79 74 -280 -78 -280 -152 0 -208 201 -78 280 43 26 113 26 156 0z"/>
          <path d="M1110 1894 c-95 -26 -168 -86 -218 -179 l-27 -50 -3 -398 -3 -398 138 3 138 3 5 175 5 175 205 6 c113 3 206 6 208 7 1 1 1 53 0 115 l-3 112 -205 5 -205 5 -3 61 c-2 49 1 65 18 87 l21 27 222 0 c122 0 228 4 235 8 9 7 12 39 10 128 l-3 119 -240 2 c-186 1 -252 -2 -295 -13z"/>
          <path d="M1980 1698 c-129 -20 -258 -115 -314 -229 -104 -213 -13 -471 201 -572 129 -60 302 -47 418 33 212 146 247 447 74 635 -97 105 -240 156 -379 133z m152 -293 c92 -62 83 -212 -15 -258 -119 -57 -251 47 -217 172 10 40 50 87 85 102 42 17 109 10 147 -16z"/>
          <path d="M2896 1698 c-180 -24 -324 -168 -357 -356 -31 -174 69 -361 238 -443 57 -29 79 -34 158 -37 163 -7 283 52 375 184 92 132 92 335 0 468 -95 140 -247 207 -414 184z m144 -290 c124 -85 68 -278 -80 -278 -152 0 -208 201 -78 280 46 28 115 27 158 -2z"/>
        </g>
      </svg>
    ),
    disponivel: true,
    cor: 'text-purple-600',
    bgCor: 'bg-purple-50',
    recursos: [
      'Recebimento automático de pedidos',
      'Sincronização de cardápio (Open Delivery)',
      'Atualização de estoque em tempo real',
      'Gestão completa de pedidos',
    ],
  },
  {
    id: 'uber-eats',
    nome: 'Uber Eats',
    descricao: 'Conecte seu cardápio ao Uber Eats e receba pedidos automaticamente.',
    icone: <Bike className="h-10 w-10" />,
    disponivel: true,
    cor: 'text-green-500',
    bgCor: 'bg-green-50',
    recursos: [
      'Sincronização de cardápio',
      'Recebimento automático de pedidos',
      'Atualização de estoque em tempo real',
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

      // Carregar status do Uber Eats
      const { data: uberConfig } = await supabase
        .from('uber_eats_config')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      // Carregar status do 99Food
      const { data: noventaENoveConfig } = await supabase
        .from('noventa_e_nove_config')
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

      if (uberConfig) {
        status['uber-eats'] = {
          ativo: uberConfig.ativo || false,
          status: uberConfig.status || 'disconnected',
          totalPedidos: uberConfig.total_pedidos_recebidos || 0
        };
      } else {
        status['uber-eats'] = {
          ativo: false,
          status: 'disconnected'
        };
      }

      if (noventaENoveConfig) {
        status['noventa-e-nove'] = {
          ativo: noventaENoveConfig.ativo || false,
          status: noventaENoveConfig.status || 'disconnected',
          totalPedidos: noventaENoveConfig.total_pedidos_recebidos || 0
        };
      } else {
        status['noventa-e-nove'] = {
          ativo: false,
          status: 'disconnected'
        };
      }

      // Outras integrações (por enquanto desconectadas)
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

      {/* Importar Dados Card */}
      <Card className="mt-8 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-purple-100">
              <Database className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Importar Dados das Integrações</h3>
              <p className="text-muted-foreground mt-1">
                Importe produtos e pedidos existentes do iFood e Uber Eats para o sistema. Ideal para a primeira configuração ou sincronização manual.
              </p>
              <Link href="/admin/integracoes/importar">
                <Button className="mt-3 bg-purple-600 hover:bg-purple-700">
                  <Database className="h-4 w-4 mr-2" />
                  Importar Dados
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

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
