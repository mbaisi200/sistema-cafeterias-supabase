'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export function SubscriptionBanner() {
  const { role, subscriptionStatus, subscriptionCurrentPeriodEnd, empresaValidade } = useAuth();

  if (role === 'master') return null;

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

  const dataVencimento = subscriptionCurrentPeriodEnd || empresaValidade;

  if (!subscriptionStatus && !empresaValidade) return null;

  const isPastDue = subscriptionStatus === 'past_due';
  const isIncomplete = subscriptionStatus === 'incomplete' || subscriptionStatus === 'incomplete_expired';

  const isExpiredStripe = subscriptionStatus === 'active' && diasRestantes !== null && diasRestantes <= 0;
  const isExpiredLegado = !subscriptionStatus && empresaValidade && diasRestantes !== null && diasRestantes <= 0;

  const showSoonStripe = subscriptionStatus === 'active' && diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 7;
  const showSoonLegado = !subscriptionStatus && empresaValidade && diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 7;

  if (isPastDue) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Assinatura Vencida</AlertTitle>
        <AlertDescription>
          Sua assinatura está vencida. Regularize o pagamento para continuar usando o sistema.
        </AlertDescription>
      </Alert>
    );
  }

  if (isIncomplete) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Pagamento Pendente</AlertTitle>
        <AlertDescription>
          O pagamento da sua assinatura não foi concluído. Tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  if (isExpiredStripe || isExpiredLegado) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Assinatura Expirada</AlertTitle>
        <AlertDescription>
          Sua assinatura expirou{dataVencimento ? ` em ${new Date(dataVencimento).toLocaleDateString('pt-BR')}` : ''}. Renove para continuar usando o sistema.
        </AlertDescription>
      </Alert>
    );
  }

  if (showSoonStripe || showSoonLegado) {
    return (
      <Alert className="border-amber-200 bg-amber-50 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Assinatura Próxima do Vencimento</AlertTitle>
        <AlertDescription className="text-amber-700">
          Sua assinatura vence em {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
          {dataVencimento ? ` (${new Date(dataVencimento).toLocaleDateString('pt-BR')})` : ''}.
          Renove para não perder o acesso.
        </AlertDescription>
      </Alert>
    );
  }

  // Caso legacy sem stripe: apenas mostra aviso se estiver perto de vencer
  if (!subscriptionStatus && empresaValidade) {
    return null;
  }

  return null;
}
