'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, CreditCard, CheckCircle2, ExternalLink, AlertCircle, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function AdminAssinaturaPage() {
  const { user, empresaId, refreshUser } = useAuth();
  const [plano, setPlano] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    try {
      const supabase = getSupabaseClient();
      const { data: empresa } = await supabase
        .from('empresas')
        .select('plano_id, subscription_status, stripe_customer_id, stripe_subscription_id, planos!left(id, nome, descricao, preco, stripe_price_id, destaque)')
        .eq('id', empresaId)
        .single();

      if (empresa) {
        setSubscriptionStatus(empresa.subscription_status);
        setStripeCustomerId(empresa.stripe_customer_id);
        setStripeSubscriptionId(empresa.stripe_subscription_id);
        if (empresa.planos) {
          setPlano(empresa.planos);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssinar = async () => {
    if (!plano || !empresaId) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, email: user?.email, preco: plano.preco, planoNome: plano.nome, priceId: plano.stripe_price_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    if (!stripeCustomerId) return;
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: stripeCustomerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (subscriptionStatus) {
      case 'active': return <Badge className="bg-green-600 text-white">Ativa</Badge>;
      case 'past_due': return <Badge className="bg-red-600 text-white">Vencida</Badge>;
      case 'canceled':
      case 'unpaid': return <Badge variant="secondary">Cancelada</Badge>;
      default: return <Badge variant="outline">Pendente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#1e2235] to-[#16213e]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const isActive = subscriptionStatus === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8f0ed] via-[#eaeae6] to-[#f0eddd] dark:from-[#1a1a2e] dark:via-[#1e2235] dark:to-[#16213e]">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CreditCard className="h-8 w-8 text-cyan-500" />
            <h1 className="text-3xl font-bold">Assinatura</h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            {isActive
              ? 'Sua assinatura está ativa. Gerencie o pagamento pelo Stripe Portal.'
              : plano
                ? 'Seu plano foi definido pelo administrador. Clique em "Assinar" para ativar.'
                : 'Aguardando definição do plano pelo administrador.'}
          </p>
        </div>

        {!plano ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="flex flex-col items-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum plano atribuído</p>
              <p className="text-sm text-muted-foreground">
                O administrador ainda não definiu um plano para sua empresa.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-md mx-auto">
            <Card className={plano.destaque ? 'border-cyan-400 shadow-lg shadow-cyan-400/10' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plano.nome}</CardTitle>
                  {getStatusBadge()}
                </div>
                {plano.descricao && <CardDescription>{plano.descricao}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-3xl font-bold">R$ {Number(plano.preco).toFixed(2)}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Acesso completo ao sistema
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Suporte técnico
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Atualizações mensais
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                {isActive ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handlePortal}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    Gerenciar Pagamento
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
                    onClick={handleAssinar}
                    disabled={checkoutLoading || !plano.stripe_price_id}
                  >
                    {checkoutLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    Assinar Agora
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="w-full" onClick={() => router.push('/')}>
                  Voltar ao login
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
