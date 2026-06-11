'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

const cacheVersao = { versao: '', timestamp: 0 };
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';


interface Empresa {
  id: string;
  nome: string;
  cnpj?: string;
}

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const [exportando, setExportando] = useState(false);
  const [backupando, setBackupando] = useState(false);
  const [versaoSistema, setVersaoSistema] = useState('');

  // Restore state
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmpresas = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from('empresas').select('id, nome, cnpj').order('nome');
      if (data) setEmpresas(data);
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    if (restoreOpen) {
      fetchEmpresas();
    }
  }, [restoreOpen, fetchEmpresas]);

  useEffect(() => {
    if (cacheVersao.versao) {
      setVersaoSistema(cacheVersao.versao);
      return;
    }
    fetch(`/api/version`)
      .then(r => r.json())
      .then(d => {
        cacheVersao.versao = d.version;
        cacheVersao.timestamp = d.timestamp;
        setVersaoSistema(d.version);
      })
      .catch(() => setVersaoSistema('1.0.0'));
  }, []);

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

  const handleRestore = async () => {
    if (!restoreFile || !selectedEmpresaId) {
      toast({ title: 'Selecione um arquivo e uma empresa', variant: 'destructive' });
      return;
    }

    setRestoreLoading(true);
    setRestoreResult(null);

    try {
      const text = await restoreFile.text();
      const backup = JSON.parse(text);

      if (!backup.dados || !backup.metadados) {
        throw new Error('Arquivo JSON inválido. Use um arquivo gerado pelo Backup do Sistema.');
      }

      const res = await fetch('/api/master/restaurar-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup, targetEmpresaId: selectedEmpresaId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao restaurar');

      setRestoreResult(data);
      toast({ title: 'Restauração concluída', description: `${data.totalInseridos} registros restaurados.` });
    } catch (err) {
      toast({
        title: 'Erro ao restaurar',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setRestoreLoading(false);
    }
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
                  <Input value={versaoSistema || 'carregando...'} disabled />
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
                <Button variant="secondary" onClick={() => { setRestoreOpen(true); setRestoreResult(null); setRestoreFile(null); setSelectedEmpresaId(''); }}>
                  <Upload className="h-4 w-4 mr-2" />
                  Restaurar Backup
                </Button>
                <Button variant="destructive" onClick={handleLimparCache}>
                  Limpar Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog Restaurar Backup */}
        <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Restaurar Backup</DialogTitle>
              <DialogDescription>
                Selecione o arquivo JSON de backup e a empresa de destino.
                Os dados existentes da empresa serão substituídos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Arquivo */}
              <div className="space-y-2">
                <Label>Arquivo de Backup (JSON)</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                />
                {restoreFile && (
                  <p className="text-xs text-muted-foreground">
                    {restoreFile.name} ({(restoreFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <Label>Empresa de Destino</Label>
                <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nome}{emp.cnpj ? ` (${emp.cnpj})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aviso UUID */}
              <Alert variant="default" className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 text-sm">Sobre UUIDs</AlertTitle>
                <AlertDescription className="text-amber-700 text-xs">
                  O sistema irá remapear automaticamente o <code>empresa_id</code> dos registros.
                  Para referências a usuários (criado_por, vendedor_id, etc.), tentará
                  corresponder pelo email. Se o usuário foi excluído e recriado, as
                  referências serão apontadas para o novo usuário se o email for o mesmo.
                </AlertDescription>
              </Alert>

              {/* Resultado */}
              {restoreResult && (
                <div className="space-y-2">
                  {restoreResult.sucesso ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800 text-sm">Restauração concluída</AlertTitle>
                      <AlertDescription className="text-green-700 text-xs">
                        {restoreResult.totalInseridos} registros restaurados.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle className="text-sm">Erro na restauração</AlertTitle>
                      <AlertDescription className="text-xs">{restoreResult.error}</AlertDescription>
                    </Alert>
                  )}
                  {restoreResult.errosInsert && restoreResult.errosInsert.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Erros ao inserir ({restoreResult.errosInsert.length}):</p>
                      <ScrollArea className="h-24">
                        {restoreResult.errosInsert.map((e: string, i: number) => (
                          <p key={i} className="text-amber-600">{e}</p>
                        ))}
                      </ScrollArea>
                    </div>
                  )}
                  {restoreResult.aviso && (
                    <p className="text-xs text-amber-600">{restoreResult.aviso}</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRestoreOpen(false)}>
                Fechar
              </Button>
              <Button
                onClick={handleRestore}
                disabled={!restoreFile || !selectedEmpresaId || restoreLoading}
              >
                {restoreLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Restaurando...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Restaurar</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
