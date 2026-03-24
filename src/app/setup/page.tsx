'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Database, Shield } from 'lucide-react';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ step: string; success: boolean; message: string }[]>([]);

  const runSetup = async () => {
    setLoading(true);
    setResults([]);

    const steps = [
      {
        step: 'Configurando RLS na tabela usuarios...',
        action: async () => {
          const res = await fetch('/api/setup/rls', { method: 'POST' });
          return res.json();
        }
      },
      {
        step: 'Verificando usuário master...',
        action: async () => {
          const res = await fetch('/api/setup/master', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'baisinextel@gmail.com',
              password: 'Master@2024!',
              nome: 'Master Admin'
            })
          });
          return res.json();
        }
      }
    ];

    for (const step of steps) {
      try {
        const result = await step.action();
        setResults(prev => [...prev, {
          step: step.step,
          success: result.success || result.message?.includes('sucesso'),
          message: result.message || result.error || JSON.stringify(result)
        }]);
      } catch (error) {
        setResults(prev => [...prev, {
          step: step.step,
          success: false,
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }]);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Database className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Configuração do Sistema</CardTitle>
          <CardDescription>
            Configure as políticas de segurança e usuários iniciais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Aviso */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Configuração Necessária</p>
                <p className="text-sm text-amber-700 mt-1">
                  Este processo configura as políticas de segurança (RLS) e cria o usuário master.
                  Execute apenas uma vez.
                </p>
              </div>
            </div>
          </div>

          {/* Botão */}
          <Button
            onClick={runSetup}
            disabled={loading}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Configurando...
              </>
            ) : (
              <>
                <Database className="mr-2 h-5 w-5" />
                Executar Configuração
              </>
            )}
          </Button>

          {/* Resultados */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                Resultados
              </h3>
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div>
                      <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                        {result.step}
                      </p>
                      <p className={`text-sm mt-1 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Credenciais */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">Credenciais Master</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Email:</strong> baisinextel@gmail.com</p>
              <p><strong>Senha:</strong> Master@2024!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
