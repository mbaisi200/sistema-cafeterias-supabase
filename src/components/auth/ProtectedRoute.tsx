'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, secoesPermitidas } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Rotas obrigatórias: sempre acessíveis independentemente das seções permitidas
  const mandatoryRoutes = ['/pdv', '/pdv-varejo', '/pdv-garcom', '/admin/caixa', '/admin/configuracoes/unidades'];

  // Rotas internas/sub-páginas que não possuem entrada própria no menu,
  // mas são acessadas a partir de outras seções ou são sempre necessárias
  const whitelistedRoutes = [
    '/admin/alterar-senha',      // Troca de senha (sempre disponível)
    '/admin/categorias',         // Sub-página de Produtos / Cadastros
    '/admin/configuracoes-cupom', // Sub-página de Cupons e NFEs
    '/admin/configuracoes/unidades', // Sub-página de Unidades
    '/admin/dispositivos',       // Sub-página de Funcionários
    '/admin/logs',               // Logs do sistema
  ];

  const isMandatoryRoute = mandatoryRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  const isWhitelistedRoute = whitelistedRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  // Verificar se o pathname está nas seções permitidas
  const isPermitted = secoesPermitidas.some(url =>
    pathname === url || (url !== '/' && pathname.startsWith(url + '/'))
  );

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
        return;
      }

      if (allowedRoles && !allowedRoles.includes(user.role)) {
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
        return;
      }

      // Verificar permissão de seção para admin/funcionario
      if (
        user.role !== 'master' &&
        secoesPermitidas.length > 0 &&
        !isPermitted &&
        !isMandatoryRoute &&
        !isWhitelistedRoute
      ) {
        router.push('/admin/dashboard');
      }
    }
  }, [user, loading, router, allowedRoles, pathname, secoesPermitidas, isPermitted, isMandatoryRoute, isWhitelistedRoute]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  // Verificar permissão de seção para admin/funcionario
  // Master sempre bypassa esta verificação
  if (
    user.role !== 'master' &&
    secoesPermitidas.length > 0 &&
    !isPermitted &&
    !isMandatoryRoute &&
    !isWhitelistedRoute
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <ShieldX className="h-12 w-12 text-destructive" />
          <p className="text-lg font-medium">Acesso negado</p>
          <p className="text-sm text-muted-foreground">Você não tem permissão para acessar esta seção.</p>
          <Button onClick={() => router.push('/admin/dashboard')} className="bg-blue-600 hover:bg-blue-700">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
