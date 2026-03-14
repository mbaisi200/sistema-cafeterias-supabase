'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  ShoppingCart,
  Bike,
  MessageCircle,
  Globe,
  Building2,
  Loader2,
  Settings,
  Link2
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { collection, query, getDocs, where, orderBy } from '@supabase/supabase-js';

interface Empresa {
  id: string;
  nome: string;
  status?: string;
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [empresaNome, setEmpresaNome] = useState<string>('');
  const [integracoesStatus, setIntegracoesStatus] = useState<Record<string, IntegracaoStatus>>({});
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Carregar empresas
  useEffect(() => {
    const carregarEmpresas = async () => {
      try {
        const dbInstance = db();
        if (!dbInstance) return;

        const empresasQuery = query(
          collection(dbInstance, 'empresas'),
          orderBy('nome')
        );
        const snapshot = await getDocs(empresasQuery);
        
        const empresasLista: Empresa[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          empresasLista.push({
            id: doc.id,
            nome: data.nome || 'Sem nome',
            status: data.status
          });
        });

        setEmpresas(empresasLista);

        // Verificar se há empresa na URL
        const empresaUrl = searchParams.get('empresa');
        if (empresaUrl && empresasLista.find(e => e.id === empresaUrl)) {
          setEmpresaSelecionada(empresaUrl);
          const emp = empresasLista.find(e => e.id === empresaUrl);
          setEmpresaNome(emp?.nome || '');
        } else if (empresasLista.length > 0) {
          setEmpresaSelecionada(empresasLista[0].id);
          setEmpresaNome(empresasLista[0].nome);
        }
      } catch (error) {
        console.error('Erro ao carregar empresas:', error);
      } finally {
        setLoadingEmpresas(false);
      }
    };

    carregarEmpresas();
  }, [searchParams]);

  // Carregar status das integrações quando empresa for selecionada
  useEffect(() => {
    if (empresaSelecionada) {
      carregarStatusIntegracoes(empresaSelecionada);
    }
  }, [empresaSelecionada]);

  const carregarStatusIntegracoes = async (empresaId: string) => {
    setLoadingStatus(true);
    try {
      const dbInstance = db();
      if (!dbInstance) return;

      // Carregar status do iFood
      const ifoodQuery = query(
        collection(dbInstance, 'ifood_config'),
        where('empresaId', '==', empresaId)
      );
      const ifoodSnapshot = await getDocs(ifoodQuery);

      const status: Record<string, IntegracaoStatus> = {};

      if (!ifoodSnapshot.empty) {
        const config = ifoodSnapshot.docs[0].data();
        status['ifood'] = {
          ativo: config.ativo || false,
          status: config.status || 'disconnected',
          totalPedidos: config.totalPedidosRecebidos || 0
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
      setLoadingStatus(false);
    }
  };

  const handleEmpresaChange = (value: string) => {
    const emp = empresas.find(e => e.id === value);
    if (emp) {
      setEmpresaSelecionada(emp.id);
      setEmpresaNome(emp.nome);
      // Atualizar URL
      router.push(`/master/integracoes?empresa=${emp.id}`);
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

  if (loadingEmpresas) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Integrações</h1>
        <p className="text-muted-foreground mt-2">
          Conecte seu sistema com as principais plataformas de delivery e pagamento do mercado
        </p>
      </div>

      {/* Seleção de Empresa */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Selecionar Empresa
          </CardTitle>
          <CardDescription>
            Escolha a empresa para configurar as integrações
          </CardDescription>
        </CardHeader>
        <CardContent>
          {empresas.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhuma empresa cadastrada
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 w-full sm:w-auto space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Select value={empresaSelecionada} onValueChange={handleEmpresaChange}>
                  <SelectTrigger className="w-full sm:w-[400px]">
                    <SelectValue placeholder="Selecione uma empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                        {empresa.status && empresa.status !== 'ativo' && (
                          <span className="ml-2 text-xs text-muted-foreground">({empresa.status})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {empresaSelecionada && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Configurando: <strong>{empresaNome}</strong></span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integrações disponíveis */}
      {empresaSelecionada && (
        <>
          {loadingStatus ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : (
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
                        <Link href={`/master/integracoes/${integracao.id}?empresa=${empresaSelecionada}`}>
                          <Button className="w-full">
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
          )}
        </>
      )}

      {/* Nenhuma empresa selecionada */}
      {!empresaSelecionada && empresas.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Selecione uma empresa</p>
                <p className="text-sm text-amber-700">
                  Escolha uma empresa acima para visualizar e configurar as integrações disponíveis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    }>
      <IntegracoesContent />
    </Suspense>
  );
}
