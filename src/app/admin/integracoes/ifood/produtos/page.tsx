'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Package,
  RefreshCw as Sync,
  DollarSign,
  Filter,
  ArrowUpDown,
  Camera,
  Trash2,
  ImageIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'sonner';

interface Produto {
  id: string;
  nome: string;
  codigo?: string;
  preco: number;
  estoque_atual: number;
  ativo: boolean;
  foto?: string | null;
  categoria?: {
    id: string;
    nome: string;
  };
  ifood_sync?: {
    id: string;
    ifood_product_id?: string;
    ifood_external_code: string;
    status: 'synced' | 'pending' | 'error' | 'not_synced';
    ifood_status?: 'AVAILABLE' | 'UNAVAILABLE' | 'HIDDEN';
    ultimo_sync_em?: string;
    erro_sync?: string;
    preco_sincronizado?: number;
  };
}

function ProdutoImageUpload({
  produto,
  empresaId,
  onUpdated,
}: {
  produto: Produto;
  empresaId: string;
  onUpdated: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo inválido. Use JPEG, PNG, WebP ou GIF.');
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 5MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('empresaId', empresaId);
      formData.append('produtoId', produto.id);

      const response = await fetch('/api/produto-imagem', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Foto do produto atualizada!');
        setImgError(false);
        onUpdated();
      } else {
        toast.error(data.error || 'Erro ao fazer upload da foto');
      }
    } catch {
      toast.error('Erro de conexão ao enviar foto');
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!produto.foto) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/produto-imagem', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          produtoId: produto.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Foto removida!');
        setImgError(false);
        onUpdated();
      } else {
        toast.error(data.error || 'Erro ao remover foto');
      }
    } catch {
      toast.error('Erro de conexão ao remover foto');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative flex-shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleUpload}
      />

      {/* Thumbnail / Upload button */}
      <button
        type="button"
        className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-muted hover:border-primary transition-colors flex items-center justify-center bg-muted/30 flex-shrink-0"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || deleting}
        title={produto.foto ? 'Alterar foto' : 'Adicionar foto'}
      >
        {uploading || deleting ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : produto.foto && !imgError ? (
          <img
            src={produto.foto}
            alt={produto.nome}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Camera className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Hover overlay */}
        {!uploading && !deleting && (
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-4 w-4 text-white" />
          </div>
        )}
      </button>

      {/* Remove button (only if has image) */}
      {produto.foto && !uploading && (
        <button
          type="button"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors"
          onClick={handleRemove}
          disabled={deleting}
          title="Remover foto"
        >
          {deleting ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  );
}

function ProdutosIFoodContent() {
  const router = useRouter();
  const { empresaId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
  const [ifoodAtivo, setIFoodAtivo] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (empresaId) {
      carregarProdutos();
    }
  }, [empresaId]);

  const carregarProdutos = async () => {
    if (!empresaId) return;

    setLoading(true);
    try {
      // Buscar produtos
      const { data: produtosData, error } = await supabase
        .from('produtos')
        .select(`
          id,
          nome,
          codigo,
          preco,
          estoque_atual,
          ativo,
          foto,
          categoria:categorias(id, nome)
        `)
        .eq('empresa_id', empresaId)
        .order('nome');

      if (error) throw error;

      // Buscar sincronização iFood
      const { data: syncData } = await supabase
        .from('ifood_produtos_sync')
        .select('*')
        .eq('empresa_id', empresaId);

      // Mapear sincronização para produtos
      const produtosComSync: Produto[] = (produtosData || []).map(p => {
        const sync = syncData?.find(s => s.produto_id === p.id);
        return {
          ...p,
          ifood_sync: sync ? {
            id: sync.id,
            ifood_product_id: sync.ifood_product_id,
            ifood_external_code: sync.ifood_external_code,
            status: sync.status || 'not_synced',
            ifood_status: sync.ifood_status,
            ultimo_sync_em: sync.ultimo_sync_em,
            erro_sync: sync.erro_sync,
            preco_sincronizado: sync.preco_sincronizado,
          } : undefined,
        };
      });

      setProdutos(produtosComSync);

      // Verificar se iFood está ativo
      const { data: config } = await supabase
        .from('ifood_config')
        .select('ativo, status')
        .eq('empresa_id', empresaId)
        .single();

      setIFoodAtivo(config?.ativo && config?.status === 'connected');
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const sincronizarProduto = async (produtoId: string) => {
    setSincronizando(true);
    try {
      const response = await fetch('/api/ifood/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_product',
          empresaId,
          produtoId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Produto sincronizado com sucesso!');
        carregarProdutos();
      } else {
        toast.error(data.error || 'Erro ao sincronizar');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setSincronizando(false);
    }
  };

  const sincronizarSelecionados = async () => {
    if (produtosSelecionados.length === 0) return;

    setSincronizando(true);
    try {
      const response = await fetch('/api/ifood/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_multiple',
          empresaId,
          produtos: produtosSelecionados,
        }),
      });

      const data = await response.json();

      const sucesso = data.results?.filter((r: any) => r.success).length || 0;
      const total = data.results?.length || 0;

      toast.success(`${sucesso} de ${total} produtos sincronizados!`);
      setProdutosSelecionados([]);
      carregarProdutos();
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setSincronizando(false);
    }
  };

  const atualizarDisponibilidade = async (produtoId: string, disponivel: boolean) => {
    try {
      const response = await fetch('/api/ifood/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_availability',
          empresaId,
          produtoId,
          disponivel,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Disponibilidade atualizada!');
        carregarProdutos();
      } else {
        toast.error(data.error || 'Erro ao atualizar');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    }
  };

  const toggleSelecao = (produtoId: string) => {
    setProdutosSelecionados(prev =>
      prev.includes(produtoId)
        ? prev.filter(id => id !== produtoId)
        : [...prev, produtoId]
    );
  };

  const toggleSelecaoTodos = () => {
    if (produtosSelecionados.length === produtosFiltrados.length) {
      setProdutosSelecionados([]);
    } else {
      setProdutosSelecionados(produtosFiltrados.map(p => p.id));
    }
  };

  // Filtrar produtos
  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.codigo && p.codigo.toLowerCase().includes(busca.toLowerCase()));

    const matchStatus = filtroStatus === 'todos' ||
      (filtroStatus === 'synced' && p.ifood_sync?.status === 'synced') ||
      (filtroStatus === 'not_synced' && !p.ifood_sync || p.ifood_sync?.status === 'not_synced') ||
      (filtroStatus === 'error' && p.ifood_sync?.status === 'error') ||
      (filtroStatus === 'available' && p.ifood_sync?.ifood_status === 'AVAILABLE') ||
      (filtroStatus === 'unavailable' && p.ifood_sync?.ifood_status === 'UNAVAILABLE');

    return matchBusca && matchStatus;
  });

  const getStatusBadge = (produto: Produto) => {
    if (!produto.ifood_sync || produto.ifood_sync.status === 'not_synced') {
      return <Badge variant="outline">Não sincronizado</Badge>;
    }

    switch (produto.ifood_sync.status) {
      case 'synced':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Sincronizado
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Pendente
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return <Badge variant="outline">{produto.ifood_sync.status}</Badge>;
    }
  };

  const getDisponibilidadeBadge = (produto: Produto) => {
    if (!produto.ifood_sync || !produto.ifood_sync.ifood_status) return null;

    switch (produto.ifood_sync.ifood_status) {
      case 'AVAILABLE':
        return <Badge className="bg-green-100 text-green-800">Disponível</Badge>;
      case 'UNAVAILABLE':
        return <Badge className="bg-red-100 text-red-800">Indisponível</Badge>;
      case 'HIDDEN':
        return <Badge className="bg-gray-100 text-gray-800">Oculto</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/integracoes/ifood')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-red-500" />
              Sincronização de Produtos
            </h1>
            <p className="text-muted-foreground">
              Sincronize seus produtos com o cardápio do iFood
            </p>
          </div>
        </div>
        <Button onClick={carregarProdutos} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Aviso se iFood não está ativo */}
      {!ifoodAtivo && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            A integração com iFood não está ativa. Configure as credenciais na{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => router.push('/admin/integracoes/ifood')}
            >
              página de configuração
            </Button>
            .
          </AlertDescription>
        </Alert>
      )}

      {/* Filtros e ações em massa */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Busca */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro de status */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="synced">Sincronizados</option>
                <option value="not_synced">Não sincronizados</option>
                <option value="error">Com erro</option>
                <option value="available">Disponíveis</option>
                <option value="unavailable">Indisponíveis</option>
              </select>
            </div>

            {/* Ações em massa */}
            {produtosSelecionados.length > 0 && (
              <Button
                onClick={sincronizarSelecionados}
                disabled={sincronizando || !ifoodAtivo}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sincronizando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sync className="h-4 w-4 mr-2" />
                )}
                Sincronizar ({produtosSelecionados.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de produtos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Produtos ({produtosFiltrados.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                id="selecionar-todos"
                checked={produtosSelecionados.length === produtosFiltrados.length && produtosFiltrados.length > 0}
                onCheckedChange={toggleSelecaoTodos}
              />
              <Label htmlFor="selecionar-todos" className="text-sm cursor-pointer">
                Selecionar todos
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {produtosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum produto encontrado
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {produtosFiltrados.map((produto) => (
                <div
                  key={produto.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={produtosSelecionados.includes(produto.id)}
                    onCheckedChange={() => toggleSelecao(produto.id)}
                  />

                  {/* Product photo upload */}
                  {empresaId && (
                    <ProdutoImageUpload
                      produto={produto}
                      empresaId={empresaId}
                      onUpdated={carregarProdutos}
                    />
                  )}

                  {/* Info do produto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{produto.nome}</span>
                      {produto.codigo && (
                        <span className="text-xs text-muted-foreground">
                          ({produto.codigo})
                        </span>
                      )}
                      {produto.foto && (
                        <ImageIcon className="h-3 w-3 text-green-500 flex-shrink-0" title="Possui foto" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{produto.categoria?.nome || 'Sem categoria'}</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">
                        R$ {produto.preco.toFixed(2)}
                      </span>
                      {produto.ifood_sync?.preco_sincronizado &&
                        produto.ifood_sync.preco_sincronizado !== produto.preco && (
                        <span className="text-orange-600 text-xs">
                          (iFood: R$ {produto.ifood_sync.preco_sincronizado.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(produto)}
                    {getDisponibilidadeBadge(produto)}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {produto.ifood_sync?.status === 'synced' && (
                      <Switch
                        checked={produto.ifood_sync?.ifood_status === 'AVAILABLE'}
                        onCheckedChange={(checked) => atualizarDisponibilidade(produto.id, checked)}
                        disabled={!ifoodAtivo}
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sincronizarProduto(produto.id)}
                      disabled={sincronizando || !ifoodAtivo}
                      title="Sincronizar com iFood (inclui foto)"
                    >
                      {sincronizando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sync className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{produtos.length}</div>
            <p className="text-sm text-muted-foreground">Total de produtos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {produtos.filter(p => p.ifood_sync?.status === 'synced').length}
            </div>
            <p className="text-sm text-muted-foreground">Sincronizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {produtos.filter(p => !p.ifood_sync || p.ifood_sync.status === 'not_synced').length}
            </div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {produtos.filter(p => p.ifood_sync?.status === 'error').length}
            </div>
            <p className="text-sm text-muted-foreground">Com erro</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProdutosIFoodPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[
        { title: 'Integrações', href: '/admin/integracoes' },
        { title: 'iFood', href: '/admin/integracoes/ifood' },
        { title: 'Produtos' },
      ]}>
        <ProdutosIFoodContent />
      </MainLayout>
    </ProtectedRoute>
  );
}
