'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function SetupMasterPage() {
  const [email, setEmail] = useState('baisinextel@gmail.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handlePromote = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Primeiro, promover para master
      const promoteResponse = await fetch('/api/setup/promote-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const promoteData = await promoteResponse.json();

      if (!promoteResponse.ok) {
        setResult({ success: false, message: promoteData.error });
        setLoading(false);
        return;
      }

      // Segundo, corrigir auth_user_id
      const fixResponse = await fetch('/api/fix-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const fixData = await fixResponse.json();

      if (fixResponse.ok) {
        setResult({
          success: true,
          message: `Usuário promovido a MASTER! auth_user_id: ${fixData.user?.auth_user_id || 'corrigido'}`
        });
      } else {
        setResult({
          success: true,
          message: `Usuário promovido a MASTER! (aviso: ${fixData.error})`
        });
      }
    } catch (error) {
      setResult({ success: false, message: 'Erro ao conectar com o servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Promover Usuário a Master</CardTitle>
          <CardDescription>
            Configure um usuário como administrador master do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do Usuário</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <Button
            className="w-full"
            onClick={handlePromote}
            disabled={loading || !email}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Promover a Master'
            )}
          </Button>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>{result.success ? 'Sucesso!' : 'Erro'}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          {result?.success && (
            <div className="text-sm text-muted-foreground text-center">
              <p>Agora faça login novamente para ver o menu de Clientes.</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => (window.location.href = '/')}
              >
                Ir para Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
