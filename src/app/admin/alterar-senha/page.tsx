'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';
import { KeyRound, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function AlterarSenhaPage() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    // Validações
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Preencha todos os campos.',
      });
      return;
    }

    if (novaSenha.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A nova senha deve ter pelo menos 6 caracteres.',
      });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A nova senha e a confirmação não coincidem.',
      });
      return;
    }

    setLoading(true);

    try {
      // No Supabase, precisamos verificar a senha atual fazendo login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: senhaAtual,
      });

      if (signInError) {
        throw new Error('A senha atual está incorreta.');
      }

      // Atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');

      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Sua nova senha foi salva.',
      });

    } catch (error: unknown) {
      console.error('Erro ao alterar senha:', error);
      let mensagem = 'Erro ao alterar senha';

      if (error instanceof Error) {
        if (error.message.includes('incorrect') || error.message.includes('invalid')) {
          mensagem = 'A senha atual está incorreta.';
        } else if (error.message.includes('weak')) {
          mensagem = 'A nova senha é muito fraca. Use pelo menos 6 caracteres.';
        } else if (error.message.includes('too many')) {
          mensagem = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
        } else {
          mensagem = error.message;
        }
      }

      toast({
        variant: 'destructive',
        title: 'Erro ao alterar senha',
        description: mensagem,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Admin' },
          { title: 'Alterar Senha' },
        ]}
      >
        <div className="max-w-lg mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <KeyRound className="h-8 w-8" />
                Alterar Senha
              </h1>
              <p className="text-muted-foreground mt-2">
                Altere sua senha de acesso ao sistema
              </p>
            </div>
          </div>

          {/* Info do usuário */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                  {user?.nome?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-medium text-lg">{user?.nome || 'Usuário'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle>Nova Senha</CardTitle>
              <CardDescription>
                Digite sua senha atual e a nova senha desejada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Senha Atual */}
                <div className="space-y-2">
                  <Label htmlFor="senhaAtual">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="senhaAtual"
                      type={showPasswords ? 'text' : 'password'}
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      placeholder="Digite sua senha atual"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Nova Senha */}
                <div className="space-y-2">
                  <Label htmlFor="novaSenha">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="novaSenha"
                      type={showPasswords ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-2">
                  <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmarSenha"
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Mostrar/Ocultar senhas */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-muted-foreground"
                >
                  {showPasswords ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Ocultar senhas
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Mostrar senhas
                    </>
                  )}
                </Button>

                {/* Mensagem de sucesso */}
                {success && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Senha alterada com sucesso! Use a nova senha no próximo login.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Aviso */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Importante:</strong> Após alterar a senha, você precisará usá-la no próximo acesso ao sistema.
                  </AlertDescription>
                </Alert>

                {/* Botão */}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Dicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dicas de Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Use pelo menos 6 caracteres
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Combine letras, números e símbolos
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Não use senhas óbvias como &quot;123456&quot; ou &quot;senha&quot;
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Não compartilhe sua senha com ninguém
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
