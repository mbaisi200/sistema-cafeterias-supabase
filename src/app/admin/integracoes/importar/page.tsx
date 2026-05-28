'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Database,
  Download,
  Image,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface LogEntry {
  tipo: string;
  mensagem: string;
  sucesso: boolean;
}

export default function ImportarPage() {
  const { empresaId } = useAuth();
  const { toast } = useToast();

  const [plataforma, setPlataforma] = useState<string>('ifood');
  const [tipo, setTipo] = useState<string>('ambos');
  const [processando, setProcessando] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [resultado, setResultado] = useState<{
    importados: number;
    imagens: number;
    pedidosCriados: number;
  } | null>(null);

  const handleImportar = async () => {
    if (!empresaId) return;

    setProcessando(true);
    setLogs([]);
    setResultado(null);

    try {
      const res = await fetch('/api/integracoes/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, plataforma, tipo }),
      });

      const data = await res.json();

      if (data.logs) setLogs(data.logs);

      if (data.sucesso) {
        setResultado({ importados: data.importados, imagens: data.imagens, pedidosCriados: data.pedidosCriados });
        toast({ title: 'Importação concluída', description: `${data.importados} produtos, ${data.pedidosCriados} pedidos` });
      } else {
        toast({ variant: 'destructive', title: 'Erro na importação', description: data.error || 'Erro desconhecido' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível conectar ao servidor' });
    } finally {
      setProcessando(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Integrações' }, { title: 'Importar Dados' }]}>
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Importar Dados</h1>
              <p className="text-sm text-muted-foreground">
                Importar produtos e/ou pedidos pendentes do iFood e Uber Eats
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração da Importação</CardTitle>
              <CardDescription>Selecione a plataforma e o que deseja importar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label>Plataforma</Label>
                <RadioGroup value={plataforma} onValueChange={setPlataforma} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ifood" id="ifood" />
                    <Label htmlFor="ifood" className="cursor-pointer">iFood</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="uber_eats" id="uber_eats" />
                    <Label htmlFor="uber_eats" className="cursor-pointer">Uber Eats</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ambas" id="ambas" />
                    <Label htmlFor="ambas" className="cursor-pointer">Ambas</Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>O que importar</Label>
                <RadioGroup value={tipo} onValueChange={setTipo} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="produtos" id="produtos" />
                    <Label htmlFor="produtos" className="cursor-pointer flex items-center gap-1">
                      <Image className="h-4 w-4" /> Produtos
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="pedidos" id="pedidos" />
                    <Label htmlFor="pedidos" className="cursor-pointer flex items-center gap-1">
                      <ShoppingBag className="h-4 w-4" /> Pedidos
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ambos" id="ambos" />
                    <Label htmlFor="ambos" className="cursor-pointer">Ambos</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-muted-foreground border border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 inline mr-1 text-blue-500" />
                Produtos importados serão vinculados pelo <strong>código externo</strong> da plataforma. Imagens serão baixadas e enviadas para o storage do Supabase. Pedidos pendentes virarão vendas no sistema.
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleImportar}
            disabled={processando}
            className="w-full"
            size="lg"
          >
            {processando ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Importando...</>
            ) : (
              <><Download className="h-5 w-5 mr-2" /> Iniciar Importação</>
            )}
          </Button>

          {resultado && (
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-600 mb-3">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Importação concluída</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-xl font-bold text-green-600">{resultado.importados}</div>
                    <div className="text-xs text-muted-foreground">Produtos</div>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{resultado.imagens}</div>
                    <div className="text-xs text-muted-foreground">Imagens</div>
                  </div>
                  <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <div className="text-xl font-bold text-orange-600">{resultado.pedidosCriados}</div>
                    <div className="text-xs text-muted-foreground">Pedidos</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Log da Importação</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-64">
                  <div className="space-y-1 p-4 pt-0">
                    {logs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        {log.sucesso ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <span className={log.sucesso ? '' : 'text-red-600'}>{log.mensagem}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
