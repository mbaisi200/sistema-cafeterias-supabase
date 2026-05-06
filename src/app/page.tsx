'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { AlertCircle, Settings } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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

export default function Home() {
  const { user, loading, isConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Redirect based on role
      switch (user.role) {
        case 'master':
          router.push('/master/dashboard');
          break;
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'funcionario':
          router.push('/pdv');
          break;
        default:
          router.push('/');
      }
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50/30 to-violet-50/20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="text-muted-foreground">Redirecionando...</p>
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
