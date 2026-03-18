'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coffee, Loader2, User, Shield } from 'lucide-react';

type LoginTab = 'admin' | 'funcionario';

export function LoginForm() {
  const [tab, setTab] = useState<LoginTab>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginFuncionario } = useAuth();
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao fazer login. Verifique suas credenciais.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFuncionarioLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginFuncionario(codigoEmpresa.toUpperCase(), pin);
      router.push('/pdv');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao fazer login. Verifique o código e PIN.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-blue-100">
      <CardHeader className="text-center bg-blue-50 border-b border-blue-100">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center">
            <Coffee className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Sistema de Gestão</CardTitle>
        <CardDescription>
          Cafeterias e Restaurantes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            type="button"
            variant={tab === 'admin' ? 'default' : 'outline'}
            className={`flex-1 ${tab === 'admin' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-300 text-blue-600'}`}
            onClick={() => { setTab('admin'); setError(''); }}
          >
            <Shield className="h-4 w-4 mr-2" />
            Admin/Master
          </Button>
          <Button
            type="button"
            variant={tab === 'funcionario' ? 'default' : 'outline'}
            className={`flex-1 ${tab === 'funcionario' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-300 text-blue-600'}`}
            onClick={() => { setTab('funcionario'); setError(''); }}
          >
            <User className="h-4 w-4 mr-2" />
            Funcionário
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form Admin/Master */}
        {tab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
            
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-blue-600 hover:text-blue-700"
                onClick={() => router.push('/recuperar-senha')}
              >
                Esqueceu sua senha?
              </Button>
            </div>
          </form>
        )}

        {/* Form Funcionário */}
        {tab === 'funcionario' && (
          <form onSubmit={handleFuncionarioLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigoEmpresa">Código da Empresa</Label>
              <Input
                id="codigoEmpresa"
                type="text"
                placeholder="Ex: ABC12345"
                value={codigoEmpresa}
                onChange={(e) => setCodigoEmpresa(e.target.value.toUpperCase())}
                required
                disabled={loading}
                maxLength={8}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Código fornecido pelo seu gerente (8 caracteres)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pin">PIN de Acesso</Label>
              <Input
                id="pin"
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                disabled={loading}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Seu PIN pessoal de 4 a 6 dígitos
              </p>
            </div>
            
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
