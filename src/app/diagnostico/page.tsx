'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Loader2, Bug } from 'lucide-react';

export default function DiagnosticoPage() {
  const [authUserId, setAuthUserId] = useState('');
  const [email] = useState('baisinextel@gmail.com');
  const [loading, setLoading] = useState(false);
  const [diagnostico, setDiagnostico] = useState<any>(null);
  const [fixResult, setFixResult] = useState<any>(null);

  useEffect(() => {
    // Capturar auth_user_id do console se disponível
    const stored = sessionStorage.getItem('last_auth_user_id');
    if (stored) {
      setAuthUserId(stored);
    }
  }, []);

  const handleDiagnostico = async () => {
    setLoading(true);
    setDiagnostico(null);
    setFixResult(null);

    try {
      const response = await fetch('/api/diagnose-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authUserId, email }),
      });

      const data = await response.json();
      setDiagnostico(data);
    } catch (error) {
      setDiagnostico({ error: 'Erro ao conectar' });
    } finally {
      setLoading(false);
    }
  };

  const handleFix = async () => {
    setLoading(true);
    setFixResult(null);

    try {
      const response = await fetch('/api/fix-auth-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authUserId, email }),
      });

      const data = await response.json();
      setFixResult(data);
    } catch (error) {
      setFixResult({ success: false, error: 'Erro ao conectar' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Diagnóstico de Usuário
          </CardTitle>
          <CardDescription>
            Ferramenta para diagnosticar e corrigir problemas de autenticação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="authUserId">Auth User ID (do console)</Label>
              <Input
                id="authUserId"
                value={authUserId}
                onChange={(e) => setAuthUserId(e.target.value)}
                placeholder="86554f01-4a15-4055-9c45-..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                readOnly
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleDiagnostico} disabled={loading || !authUserId}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Diagnosticar
            </Button>
            <Button variant="destructive" onClick={handleFix} disabled={loading || !authUserId}>
              Corrigir auth_user_id
            </Button>
          </div>

          {diagnostico && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resultado do Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-60">
                  {JSON.stringify(diagnostico, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {fixResult && (
            <Alert variant={fixResult.success ? 'default' : 'destructive'}>
              {fixResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{fixResult.success ? 'Sucesso!' : 'Erro'}</AlertTitle>
              <AlertDescription>
                {fixResult.message || fixResult.error}
                {fixResult.success && (
                  <div className="mt-2">
                    <p className="text-sm">Role: {fixResult.user?.role}</p>
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() => (window.location.href = '/')}
                    >
                      Ir para Login
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground bg-yellow-50 p-3 rounded">
            <strong>Instruções:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Abra o Console do navegador (F12)</li>
              <li>Faça login normalmente (vai dar erro)</li>
              <li>Copie o "auth_user_id" que aparece no console</li>
              <li>Cole no campo acima</li>
              <li>Clique em "Diagnosticar" para ver o problema</li>
              <li>Clique em "Corrigir" para arrumar</li>
              <li>Faça login novamente</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
