'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, RefreshCw, Search, Package, CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { getSupabaseClient } from '@/lib/supabase';

interface ProdutoSync {
  id: string;
  produtoId: string;
  ninetyNineExternalCode: string;
  status: string;
  ninetyNineStatus: string;
  precoSincronizado: number;
  estoqueSincronizado: number;
  ultimoSyncEm: string;
  erroSync?: string;
  produtos: {
    id: string;
    nome: string;
    codigo: string;
    preco: number;
    categoria_nome?: string;
    ativo: boolean;
    ninety_nine_external_code?: string;
    ninety_nine_sync_status?: string;
  };
}

function NoventaENoveProdutosContent() {
  const router = useRouter();
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState<ProdutoSync[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (empresaId) loadProdutos();
  }, [empresaId]);

  const loadProdutos = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/noventa-e-nove/produtos?empresaId=${empresaId}`);
      const json = await res.json();
      if (json.sucesso) {
        setProdutos(json.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = produtos.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.produtos?.nome?.toLowerCase().includes(s) ||
           p.produtos?.codigo?.toLowerCase().includes(s) ||
           p.ninetyNineExternalCode?.toLowerCase().includes(s);
  });

  const totals = {
    total: produtos.length,
    synced: produtos.filter(p => p.status === 'synced').length,
    pending: produtos.filter(p => p.status === 'pending' || p.status === 'not_synced').length,
    error: produtos.filter(p => p.status === 'error').length,
  };

  const handleSyncProduct = async (produto: ProdutoSync) => {
    try {
      const res = await fetch('/api/noventa-e-nove/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          action: 'sync_product',
          produtoId: produto.produtoId,
          externalCode: produto.ninetyNineExternalCode,
          nome: produto.produtos?.nome,
          preco: produto.produtos?.preco,
          disponivel: produto.produtos?.ativo,
        }),
      });
      const json = await res.json();
      if (json.sucesso) {
        toast({ title: 'Produto sincronizado!' });
        loadProdutos();
      } else {
        throw new Error(json.erro?.mensagem);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
  };

  const handleSyncSelected = async () => {
    if (selected.size === 0) return;
    setSyncing(true);
    const selectedProdutos = produtos.filter(p => selected.has(p.id));
    try {
      const res = await fetch('/api/noventa-e-nove/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          action: 'sync_multiple',
          produtos: selectedProdutos.map(p => ({
            produtoId: p.produtoId,
            externalCode: p.ninetyNineExternalCode,
            nome: p.produtos?.nome,
            preco: p.produtos?.preco,
            disponivel: p.produtos?.ativo,
          })),
        }),
      });
      const json = await res.json();
      if (json.sucesso) {
        toast({ title: `${selected.size} produtos sincronizados!` });
        setSelected(new Set());
        loadProdutos();
      } else {
        throw new Error(json.erro?.mensagem);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleAvailability = async (produto: ProdutoSync, disponivel: boolean) => {
    try {
      const res = await fetch('/api/noventa-e-nove/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          action: 'update_availability',
          produtoId: produto.produtoId,
          externalCode: produto.ninetyNineExternalCode,
          disponivel,
        }),
      });
      const json = await res.json();
      if (json.sucesso) {
        toast({ title: disponivel ? 'Produto disponível' : 'Produto indisponível' });
        loadProdutos();
      } else {
        throw new Error(json.erro?.mensagem);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced': return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Sincronizado</Badge>;
      case 'pending': return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'error': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      default: return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Não sinc.</Badge>;
    }
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/admin/integracoes/noventa-e-nove')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Produtos 99Food</h1>
          <p className="text-muted-foreground mt-1">Sincronize produtos com o 99Food</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{totals.total}</div><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{totals.synced}</div><p className="text-xs text-muted-foreground">Sincronizados</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-600">{totals.pending}</div><p className="text-xs text-muted-foreground">Pendentes</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-600">{totals.error}</div><p className="text-xs text-muted-foreground">Erro</p></CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produtos..." className="pl-9" />
        </div>
        <Button variant="outline" onClick={loadProdutos} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        {selected.size > 0 && (
          <Button onClick={handleSyncSelected} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar Selecionados ({selected.size})
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
      ) : (
        <div className="border rounded-lg">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} className="h-4 w-4" />
                </TableHead>
                <TableHead className="w-48">Produto</TableHead>
                <TableHead className="w-20">Código</TableHead>
                <TableHead className="w-24 text-right">Preço</TableHead>
                <TableHead className="w-32">Status Sync</TableHead>
                <TableHead className="w-24 text-center">Disponível</TableHead>
                <TableHead className="w-28 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum produto encontrado</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4" /></TableCell>
                  <TableCell className="truncate" title={p.produtos?.nome}>{p.produtos?.nome || '---'}</TableCell>
                  <TableCell><code className="text-xs">{p.ninetyNineExternalCode}</code></TableCell>
                  <TableCell className="text-right whitespace-nowrap">{p.produtos?.preco?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell>{getStatusBadge(p.status)}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={p.ninetyNineStatus === 'AVAILABLE'}
                      onCheckedChange={v => handleToggleAvailability(p, v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="sm" onClick={() => handleSyncProduct(p)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function NoventaENoveProdutosPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Integrações' }, { title: '99Food' }, { title: 'Produtos' }]}>
        <NoventaENoveProdutosContent />
      </MainLayout>
    </ProtectedRoute>
  );
}
