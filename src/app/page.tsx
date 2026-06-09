'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, AlertTriangle, Settings, CreditCard, CheckCircle2, Loader2, ExternalLink, LogOut, ArrowRight, CalendarDays } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function SessionExpiredAlert() {
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('session_expired');

  if (!sessionExpired) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Sua sessão expirou. Por favor, faça login novamente.
      </AlertDescription>
    </Alert>
  );
}

function SupabaseNotConfiguredAlert() {
  const router = useRouter();
  
  return (
    <Alert className="border-amber-200 bg-amber-50">
      <Settings className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Configuração Necessária</AlertTitle>
      <AlertDescription className="text-amber-700">
        <p className="mb-3">
          O Supabase não está configurado. Para usar o sistema, configure as variáveis de ambiente:
        </p>
        <ul className="list-disc list-inside text-sm mb-3 space-y-1">
          <li><code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code></li>
          <li><code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
          <li><code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code></li>
        </ul>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-amber-300 text-amber-700 hover:bg-amber-100"
          onClick={() => router.push('/setup')}
        >
          Ir para página de configuração
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function SubscriptionCard({ empresaId, email, onSkip }: { empresaId: string; email?: string; onSkip?: () => void }) {
  const [plano, setPlano] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [subscriptionCurrentPeriodEnd, setSubscriptionCurrentPeriodEnd] = useState<string | null>(null);
  const [empresaValidade, setEmpresaValidade] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { logout } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: empresa } = await supabase
        .from('empresas')
        .select('plano_id, subscription_status, stripe_customer_id, stripe_subscription_id, subscription_current_period_end, validade, planos!left(id, nome, descricao, preco, stripe_price_id, destaque)')
        .eq('id', empresaId)
        .single();

      if (empresa) {
        setSubscriptionStatus(empresa.subscription_status);
        setStripeCustomerId(empresa.stripe_customer_id);
        setSubscriptionCurrentPeriodEnd(empresa.subscription_current_period_end);
        setEmpresaValidade(empresa.validade);
        if (empresa.planos) setPlano(empresa.planos);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // Refetch ao montar ou quando voltar do Stripe
  useEffect(() => { fetchData(); }, [fetchData]);

  // Refetch se veio do Stripe (success ou cancel na URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('success')) {
      // Poll 5 vezes para aguardar o webhook processar
      let attempts = 0;
      const poll = setInterval(() => {
        fetchData();
        attempts++;
        if (attempts >= 5) clearInterval(poll);
      }, 2000);
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('canceled');
      window.history.replaceState({}, '', url.toString());
      return () => clearInterval(poll);
    }
    if (params.has('canceled')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('canceled');
      window.history.replaceState({}, '', url.toString());
    }
  }, [fetchData]);

  const handleAssinar = async () => {
    if (!plano) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          email,
          planoNome: plano.nome,
          preco: plano.preco,
          priceId: plano.stripe_price_id,
        }),
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  const isActive = subscriptionStatus === 'active';
  const isPastDue = subscriptionStatus === 'past_due';
  const isIncomplete = subscriptionStatus === 'incomplete' || subscriptionStatus === 'incomplete_expired';

  const hoje = Date.now();
  const diasRestantes = (() => {
    if (subscriptionCurrentPeriodEnd) {
      return Math.ceil((new Date(subscriptionCurrentPeriodEnd).getTime() - hoje) / (1000 * 60 * 60 * 24));
    }
    if (empresaValidade) {
      return Math.ceil((new Date(empresaValidade).getTime() - hoje) / (1000 * 60 * 60 * 24));
    }
    return null;
  })();

  const isLoaded = !loading;

  // Se a assinatura está ativa e não está perto de vencer, redireciona silenciosamente
  useEffect(() => {
    if (!isLoaded) return;
    if (!plano) return;
    if (!subscriptionStatus && !empresaValidade) return;
    if (subscriptionStatus === 'past_due' || subscriptionStatus === 'incomplete' || subscriptionStatus === 'incomplete_expired') return;
    if (diasRestantes !== null && diasRestantes <= 7) return;
    if (onSkip) onSkip();
  }, [isLoaded, plano, subscriptionStatus, empresaValidade, diasRestantes, onSkip]);

  if (loading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!plano) {
    return (
      <Card className="max-w-md mx-auto border-amber-200">
        <CardContent className="flex flex-col items-center py-8 text-center">
          <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
          <p className="font-medium">Aguardando plano</p>
          <p className="text-sm text-muted-foreground mt-1">
            O administrador ainda não definiu um plano para sua empresa.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`max-w-md mx-auto ${plano.destaque ? 'border-cyan-400 shadow-lg shadow-cyan-400/10' : ''}`}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <CreditCard className="h-8 w-8 text-cyan-500" />
        </div>
        <CardTitle className="text-xl">Assinatura</CardTitle>
        <CardDescription>
          {isActive ? 'Sua assinatura está ativa' : 'Escolha seu plano para acessar o sistema'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPastDue && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Assinatura Vencida</AlertTitle>
            <AlertDescription>
              Sua assinatura está vencida. Regularize o pagamento para continuar usando o sistema.
            </AlertDescription>
          </Alert>
        )}
        {isIncomplete && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pagamento Pendente</AlertTitle>
            <AlertDescription>
              O pagamento da sua assinatura não foi concluído. Tente novamente.
            </AlertDescription>
          </Alert>
        )}
        {isActive && diasRestantes !== null && diasRestantes <= 7 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Assinatura Próxima do Vencimento</AlertTitle>
            <AlertDescription className="text-amber-700">
              Sua assinatura vence em {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}. 
              Renove para não perder o acesso.
            </AlertDescription>
          </Alert>
        )}
        {isActive && diasRestantes !== null && diasRestantes <= 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Assinatura Expirada</AlertTitle>
            <AlertDescription>
              Sua assinatura expirou. Renove para continuar usando o sistema.
            </AlertDescription>
          </Alert>
        )}
        <div className="text-center mb-2">
          <Badge variant="outline" className="text-sm px-3 py-1">{plano.nome}</Badge>
        </div>
        <div className="text-center">
          <span className="text-3xl font-bold">R$ {Number(plano.preco).toFixed(2)}</span>
          <span className="text-muted-foreground">/mês</span>
          {isActive && (
            <div className="mt-2">
              <Badge className="bg-green-600">Assinatura Ativa</Badge>
            </div>
          )}
        </div>
        {(subscriptionCurrentPeriodEnd || empresaValidade) && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>
              Vencimento:{' '}
              <span className="font-medium text-foreground">
                {new Intl.DateTimeFormat('pt-BR').format(
                  new Date(subscriptionCurrentPeriodEnd || empresaValidade!)
                )}
              </span>
            </span>
            {diasRestantes !== null && (
              <span className={`font-medium ${diasRestantes <= 0 ? 'text-red-500' : diasRestantes <= 7 ? 'text-amber-500' : 'text-foreground'}`}>
                {diasRestantes <= 0 ? `${Math.abs(diasRestantes)} dias atrasado` : `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`}
              </span>
            )}
          </div>
        )}
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Acesso completo ao sistema</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Suporte técnico</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Atualizações mensais</li>
        </ul>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {isActive && stripeCustomerId && (
          <Button className="w-full" variant="outline" onClick={handlePortal} disabled={portalLoading}>
            {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
            Gerenciar Pagamento
          </Button>
        )}
        <Button
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
          onClick={handleAssinar}
          disabled={checkoutLoading}
        >
          {checkoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
          {isActive ? 'Pagar / Renovar' : 'Assinar Agora'}
        </Button>
        {onSkip && (
          <Button variant="outline" size="sm" className="w-full" onClick={onSkip}>
            <ArrowRight className="mr-2 h-4 w-4" /> Ir para o Painel
          </Button>
        )}
        <Button variant="ghost" size="sm" className="w-full" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Home() {
  const { user, loading, isConfigured, empresaId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role === 'master') {
      router.push('/master/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50/30 to-violet-50/20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    if (user.role === 'master') {
      return null; // will redirect via useEffect
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50/30 to-violet-50/20 p-4">
        <div className="w-full max-w-md">
          <SubscriptionCard
            empresaId={empresaId!}
            email={user.email}
            onSkip={() => router.push(user.role === 'admin' ? '/admin/dashboard' : '/pdv')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50/30 to-violet-50/20 p-4">
      <div className="w-full max-w-md space-y-4">
        <Suspense fallback={null}>
          <SessionExpiredAlert />
        </Suspense>
        {!isConfigured && <SupabaseNotConfiguredAlert />}
        <LoginForm />
      </div>
    </div>
  );
}
