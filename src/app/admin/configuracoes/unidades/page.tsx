'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { Plus, Trash2, Loader2, Ruler } from 'lucide-react';

interface Unidade {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

export default function UnidadesPage() {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaUnidade, setNovaUnidade] = useState({ nome: '', descricao: '' });

  useEffect(() => {
    if (empresaId) {
      loadUnidades();
    } else {
      setLoading(false);
    }
  }, [empresaId]);

  const loadUnidades = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');

      if (!error && data) {
        setUnidades(data);
      }
    } catch (err) {
    }
    setLoading(false);
  };

  const handleSalvar = async () => {
    if (!empresaId || !novaUnidade.nome.trim()) {
      toast({ variant: 'destructive', title: 'Nome é obrigatório' });
      return;
    }
    
    setSaving(true);
    const supabase = getSupabaseClient();
    
    const { error } = await supabase.from('unidades').insert({
      empresa_id: empresaId,
      nome: novaUnidade.nome.trim().toLowerCase(),
      descricao: novaUnidade.descricao.trim(),
      ativo: true,
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } else {
      toast({ title: 'Unidade cadastrada!' });
      setDialogOpen(false);
      setNovaUnidade({ nome: '', descricao: '' });
      loadUnidades();
    }
    setSaving(false);
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('unidades').delete().eq('id', id);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir' });
    } else {
      toast({ title: 'Unidade excluída!' });
      loadUnidades();
    }
  };

  const handleToggle = async (unidade: Unidade) => {
    const supabase = getSupabaseClient();
    await supabase.from('unidades').update({ ativo: !unidade.ativo }).eq('id', unidade.id);
    loadUnidades();
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  const unidadesAtivas = unidades.filter(u => u.ativo);
  const unidadesInativas = unidades.filter(u => !u.ativo);

  return (
    <ProtectedRoute>
      <MainLayout breadcrumbs={[
        { title: 'Admin' },
        { title: 'Configurações' },
        { title: 'Unidades' }
      ]}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Unidades de Medida</h1>
              <p className="text-muted-foreground">Gerencie as unidades disponíveis nos produtos</p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova Unidade
            </Button>
          </div>

          {dialogOpen && (
            <Card>
              <CardHeader>
                <CardTitle>Nova Unidade</CardTitle>
                <CardDescription>Adicione uma nova unidade de medida</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Sigla</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: pct (para pacote)"
                      value={novaUnidade.nome}
                      onChange={(e) => setNovaUnidade({ ...novaUnidade, nome: e.target.value.toLowerCase() })}
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Input
                      id="descricao"
                      placeholder="Ex: Pacote"
                      value={novaUnidade.descricao}
                      onChange={(e) => setNovaUnidade({ ...novaUnidade, descricao: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSalvar} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {unidades.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-48">
                <Ruler className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhuma unidade cadastrada</p>
                <p className="text-sm text-muted-foreground">Clique em "Nova Unidade" para começar</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {unidadesAtivas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Unidades Ativas ({unidadesAtivas.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {unidadesAtivas.map((unidade) => (
                        <div key={unidade.id} className="flex items-center gap-2">
                          <Badge className="bg-green-500 hover:bg-green-600 px-3 py-1">
                            {unidade.nome.toUpperCase()} - {unidade.descricao || unidade.nome}
                          </Badge>
                          <Switch checked={unidade.ativo} onCheckedChange={() => handleToggle(unidade)} />
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleExcluir(unidade.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {unidadesInativas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-muted-foreground">Inativas ({unidadesInativas.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {unidadesInativas.map((unidade) => (
                        <div key={unidade.id} className="flex items-center gap-2">
                          <Badge variant="outline" className="px-3 py-1">
                            {unidade.nome.toUpperCase()} - {unidade.descricao || unidade.nome}
                          </Badge>
                          <Switch checked={unidade.ativo} onCheckedChange={() => handleToggle(unidade)} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}