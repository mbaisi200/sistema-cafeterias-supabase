'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const [exportando, setExportando] = useState(false);
  const [backupando, setBackupando] = useState(false);

  const baixarArquivo = async (url: string, filename: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      const erro = await response.json();
      throw new Error(erro.error || 'Erro ao processar requisição');
    }

    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleExportar = async () => {
    try {
      setExportando(true);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await baixarArquivo(
        '/api/master/exportar-dados',
        `exportar-dados-completo-${timestamp}.json`
      );
      toast({ title: 'Exportação concluída', description: 'Arquivo baixado com sucesso.' });
    } catch (err) {
      toast({
        title: 'Erro ao exportar',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setExportando(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBackupando(true);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await baixarArquivo(
        '/api/master/exportar-dados?tipo=backup',
        `backup-sistema-${timestamp}.json`
      );
      toast({ title: 'Backup concluído', description: 'Arquivo baixado com sucesso.' });
    } catch (err) {
      toast({
        title: 'Erro ao fazer backup',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setBackupando(false);
    }
  };

  const handleLimparCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast({ title: 'Cache limpo', description: 'Cache local do navegador foi limpo.' });
  };

  return (
    <ProtectedRoute allowedRoles={['master']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Master' },
          { title: 'Configurações' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">
              Configurações gerais do sistema
            </p>
          </div>

          {/* Perfil */}
          <Card>
            <CardHeader>
              <CardTitle>Perfil do Master</CardTitle>
              <CardDescription>Informações da sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={user?.nome || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sistema */}
          <Card>
            <CardHeader>
              <CardTitle>Sistema</CardTitle>
              <CardDescription>Informações do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Versão do Sistema</Label>
                  <Input value="1.0.0" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Input value="Produção" disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
              <CardDescription>Ações disponíveis para o administrador master</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" onClick={handleExportar} disabled={exportando}>
                  {exportando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {exportando ? 'Exportando...' : 'Exportar Dados'}
                </Button>
                <Button variant="outline" onClick={handleBackup} disabled={backupando}>
                  {backupando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {backupando ? 'Gerando backup...' : 'Backup do Sistema'}
                </Button>
                <Button variant="destructive" onClick={handleLimparCache}>
                  Limpar Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
