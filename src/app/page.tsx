'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export default function Home() {
  const { user, loading } = useAuth();
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="w-full max-w-md space-y-4">
        <Suspense fallback={null}>
          <SessionExpiredAlert />
        </Suspense>
        <LoginForm />
      </div>
    </div>
  );
}
