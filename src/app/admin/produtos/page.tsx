'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProdutos, useCategorias, useCombos } from '@/hooks/useSupabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Star,
  AlertTriangle,
  Loader2,
  FolderOpen,
  GripVertical,
  MoreHorizontal,
  ShoppingCart,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Info,
  Layers,
  Settings2,
  Download,
  ChevronLeft,
  Camera,
  ImageIcon,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { exportToPDF, formatCurrencyPDF } from '@/lib/export-pdf';

const colorOptions = [
  '#f97316', '#3b82f6', '#22c55e', '#ec4899', '#eab308', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16', '#6366f1', '#14b8a6',
];

interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  codigo?: string;
  codigoBarras?: string;
  categoriaId: string;
  preco: number;
  custo?: number;
  unidade?: string;
  unidadesPorCaixa?: number;
  precoUnidade?: number;
  estoqueMinimo?: number;
  estoqueAtual?: number;
  destaque?: boolean;
  ativo?: boolean;
  disponivelIfood?: boolean;
  ifoodExternalCode?: string;
  ifoodSyncStatus?: 'synced' | 'pending' | 'error' | 'not_synced';
  ifoodProductId?: string;
  // NFE/NFCe fiscal fields
  ncm?: string;
  cest?: string;
  cfop?: string;
  cst?: string;
  csosn?: string;
  origem?: string;
  unidadeTributavel?: string;
  icms?: number;
  ipiAliquota?: number;
  pisAliquota?: number;
  cofinsAliquota?: number;
  isCombo?: boolean;
  comboPreco?: number;
}

export default function ProdutosPage() {
  const { produtos, loading: loadingProdutos, adicionarProduto, atualizarProduto, excluirProduto, refetch: refetchProdutos } = useProdutos();
  const { categorias, loading: loadingCategorias, adicionarCategoria, excluirCategoria } = useCategorias();
  const { toast } = useToast();
  const { empresaId } = useAuth();
  
  // Estados de Produtos
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoProduto, setEditandoProduto] = useState<Produto | null>(null);
  const [saving, setSaving] = useState(false);

  // Estados de Categorias
  const [dialogCategoriaOpen, setDialogCategoriaOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#f97316');

  // Estados de Sincronização iFood
  const [syncing, setSyncing] = useState(false);
  const [ifoodConfig, setIfoodConfig] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Estados de Combos
  const { obterItensCombo, salvarComboItens, loading: loadingCombos } = useCombos();
  const [dialogComboOpen, setDialogComboOpen] = useState(false);
  const [comboProdutoSelecionado, setComboProdutoSelecionado] = useState<Produto | null>(null);
  const [comboItensState, setComboItensState] = useState<Array<{ itemProdutoId: string; quantidade: number; custoIncluido: boolean }>>([]);
  const [savingCombo, setSavingCombo] = useState(false);
  const [comboSearch, setComboSearch] = useState('');

  // Estado de foto do produto
  const [produtoFoto, setProdutoFoto] = useState<string | null>(null);
  const [fotoUploading, setFotoUploading] = useState(false);
  const [fotoDeleting, setFotoDeleting] = useState(false);
  const [fotoError, setFotoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar foto do produto ao abrir dialog de edição
  useEffect(() => {
    if (editandoProduto && dialogOpen) {
      setProdutoFoto(null);
      setFotoError(false);
      loadProdutoFoto(editandoProduto.id);
    } else if (!dialogOpen) {
      setProdutoFoto(null);
      setFotoError(false);
    }
  }, [editandoProduto, dialogOpen]);

  const loadProdutoFoto = async (produtoId: string) => {
    if (!empresaId) return;
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('produtos')
        .select('foto')
        .eq('id', produtoId)
        .single();
      if (data?.foto) setProdutoFoto(data.foto);
    } catch (error) {
      console.error('Erro ao carregar foto:', error);
    }
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editandoProduto || !empresaId) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Tipo inválido. Use JPEG, PNG, WebP ou GIF.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Arquivo muito grande. Máximo: 5MB.' });
      return;
    }

    setFotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('empresaId', empresaId);
      formData.append('produtoId', editandoProduto.id);

      const res = await fetch('/api/produto-imagem', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setProdutoFoto(data.url);
        setFotoError(false);
        toast({ title: 'Foto atualizada!' });
      } else {
        toast({ variant: 'destructive', title: data.error || 'Erro ao enviar foto' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erro de conexão ao enviar foto' });
    } finally {
      setFotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFotoRemove = async () => {
    if (!editandoProduto || !empresaId) return;
    setFotoDeleting(true);
    try {
      const res = await fetch('/api/produto-imagem', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, produtoId: editandoProduto.id }),
      });
      const data = await res.json();
      if (data.success) {
        setProdutoFoto(null);
        setFotoError(false);
        toast({ title: 'Foto removida!' });
      } else {
        toast({ variant: 'destructive', title: data.error || 'Erro ao remover foto' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erro de conexão ao remover foto' });
    } finally {
      setFotoDeleting(false);
    }
  };

  const loading = loadingProdutos || loadingCategorias;

  // Carregar configuração iFood
  useEffect(() => {
    const loadIfoodConfig = async () => {
      if (!empresaId) return;
      try {
        const res = await fetch('/api/ifood/config');
        if (res.ok) {
          const data = await res.json();
          setIfoodConfig(data.config);
        }
      } catch (error) {
        console.error('Erro ao carregar config iFood:', error);
      }
    };
    loadIfoodConfig();
  }, [empresaId]);

  const filteredProdutos = produtos.filter(produto => {
    const searchLower = search.toLowerCase();
    const matchSearch = produto.nome.toLowerCase().includes(searchLower) ||
                       (produto.codigo && produto.codigo.toLowerCase().includes(searchLower)) ||
                       (produto.codigoBarras && produto.codigoBarras.includes(search));
    const matchCategoria = categoriaFilter === 'all' || produto.categoriaId === categoriaFilter;
    return matchSearch && matchCategoria;
  });

  // Produtos marcados para iFood
  const produtosIfood = produtos.filter(p => p.disponivelIfood);

  // Handlers de Produtos
  const handleSalvarProduto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const dados: any = {
        nome: formData.get('nome') as string,
        descricao: formData.get('descricao') as string,
        codigo: formData.get('codigo') as string,
        codigoBarras: formData.get('codigoBarras') as string,
        categoriaId: formData.get('categoria') as string,
        preco: parseFloat(formData.get('preco') as string) || 0,
        custo: parseFloat(formData.get('custo') as string) || 0,
        unidade: formData.get('unidade') as string || 'un',
        unidadesPorCaixa: parseInt(formData.get('unidadesPorCaixa') as string) || 0,
        precoUnidade: parseFloat(formData.get('precoUnidade') as string) || 0,
        estoqueMinimo: parseInt(formData.get('estoqueMinimo') as string) || 0,
        destaque: formData.get('destaque') === 'on',
        disponivelIfood: formData.get('disponivelIfood') === 'on',
        isCombo: formData.get('isCombo') === 'on',
        comboPreco: parseFloat(formData.get('comboPreco') as string) || 0,
        // NFE/NFCe fiscal fields
        ncm: formData.get('ncm') as string || '00000000',
        cest: formData.get('cest') as string || '',
        cfop: formData.get('cfop') as string || '5102',
        cst: formData.get('cst') as string || '00',
        csosn: formData.get('csosn') as string || '102',
        origem: formData.get('origem') as string || '0',
        unidadeTributavel: formData.get('unidadeTributavel') as string || 'UN',
        icms: parseFloat(formData.get('icms') as string) || 0,
        ipiAliquota: parseFloat(formData.get('ipiAliquota') as string) || 0,
        pisAliquota: parseFloat(formData.get('pisAliquota') as string) || 0,
        cofinsAliquota: parseFloat(formData.get('cofinsAliquota') as string) || 0,
      };

      // Gerar código externo para iFood se não existir
      if (dados.disponivelIfood && !editandoProduto?.ifoodExternalCode) {
        dados.ifoodExternalCode = `PROD-${Date.now()}`;
        dados.ifoodSyncStatus = 'pending';
      }

      if (editandoProduto) {
        await atualizarProduto(editandoProduto.id, dados);
        toast({ title: 'Produto atualizado!' });
      } else {
        await adicionarProduto({
          ...dados,
          estoqueAtual: 0,
          ativo: true,
        });
        toast({ title: 'Produto cadastrado!' });
      }
      
      setDialogOpen(false);
      setEditandoProduto(null);
      refetchProdutos();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar produto' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditarProduto = (produto: Produto) => {
    setEditandoProduto(produto);
    setDialogOpen(true);
  };

  const handleNovoProduto = () => {
    setEditandoProduto(null);
    setDialogOpen(true);
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: 'Relatório de Produtos',
      subtitle: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      orientation: 'landscape',
      columns: [
        { header: 'Produto', accessor: (row: any) => row.nome, width: 50 },
        { header: 'Código', accessor: (row: any) => row.codigo || row.codigoBarras || '-', width: 30 },
        { header: 'Categoria', accessor: (row: any) => getNomeCategoria(row.categoriaId), width: 35 },
        { header: 'Preço', accessor: (row: any) => formatCurrencyPDF(row.preco), width: 25 },
        { header: 'Custo', accessor: (row: any) => formatCurrencyPDF(row.custo || 0), width: 25 },
        { header: 'Estoque', accessor: (row: any) => row.estoqueAtual ?? 0, width: 20, totalize: true },
        { header: 'Status', accessor: (row: any) => row.ativo ? 'Ativo' : 'Inativo', width: 20 },
      ],
      data: filteredProdutos,
      filename: `produtos-${new Date().toISOString().slice(0, 10)}`,
      totals: { label: 'TOTAL GERAL' },
      summary: [
        { label: 'Total de Produtos', value: filteredProdutos.length },
        { label: 'Produtos Ativos', value: filteredProdutos.filter((p: any) => p.ativo).length },
        { label: 'Produtos Inativos', value: filteredProdutos.filter((p: any) => !p.ativo).length },
      ],
    });
  };

  const handleExcluirProduto = async (id: string) => {
    try {
      await excluirProduto(id);
      toast({ title: 'Produto excluído!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir produto' });
    }
  };

  // Toggle iFood para produto
  const handleToggleIfood = async (produto: Produto, checked: boolean) => {
    try {
      const updateData: any = {
        disponivelIfood: checked,
      };
      
      if (checked && !produto.ifoodExternalCode) {
        updateData.ifoodExternalCode = `PROD-${Date.now()}`;
        updateData.ifoodSyncStatus = 'pending';
      }
      
      await atualizarProduto(produto.id, updateData);
      toast({ 
        title: checked ? 'Produto marcado para iFood' : 'Produto removido do iFood',
        description: checked ? 'Sincronize com o iFood para atualizar o catálogo' : ''
      });
      refetchProdutos();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar produto' });
    }
  };

  // Sincronizar produtos com iFood
  const handleSyncIfood = async () => {
    if (!ifoodConfig?.merchantId) {
      toast({ variant: 'destructive', title: 'Configure a integração iFood primeiro' });
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch('/api/ifood/sync-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          produtos: produtosIfood.map(p => ({
            id: p.id,
            externalCode: p.ifoodExternalCode || `PROD-${p.id}`,
            name: p.nome,
            description: p.descricao,
            price: p.preco,
            categoryId: p.categoriaId,
            categoryName: categorias.find(c => c.id === p.categoriaId)?.nome || 'Outros',
          }))
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        toast({ 
          title: 'Sincronização concluída!', 
          description: `${data.synced} produtos sincronizados, ${data.errors} erros` 
        });
        refetchProdutos();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na sincronização', description: error.message });
    } finally {
      setSyncing(false);
    }
  };

  // Handlers de Categorias
  const handleSalvarCategoria = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      await adicionarCategoria({
        nome: formData.get('nome') as string,
        cor: selectedColor,
      });
      toast({ title: 'Categoria cadastrada!' });
      setDialogCategoriaOpen(false);
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar categoria' });
    } finally {
      setSaving(false);
    }
  };

  const handleExcluirCategoria = async (id: string) => {
    try {
      await excluirCategoria(id);
      toast({ title: 'Categoria excluída!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir categoria' });
    }
  };

  const getNomeCategoria = (categoriaId: string) => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.nome || 'Sem categoria';
  };

  const getProdutosPorCategoria = (categoriaId: string) => {
    return produtos.filter(p => p.categoriaId === categoriaId && p.ativo).length;
  };

  const getIfoodStatusBadge = (produto: Produto) => {
    if (!produto.disponivelIfood) return null;
    
    switch (produto.ifoodSyncStatus) {
      case 'synced':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Sincronizado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'error':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      default:
        return <Badge className="bg-gray-500"><Clock className="h-3 w-3 mr-1" />Não sincronizado</Badge>;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Produtos' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Produtos' }]}>
        <Tabs defaultValue="produtos" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Produtos & Categorias</h1>
                <p className="text-muted-foreground">Gerencie o cardápio do seu estabelecimento</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button onClick={handleNovoProduto} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </div>
          </div>
          <TabsList>
            <TabsTrigger value="produtos">
              <Package className="h-4 w-4 mr-2" />
              Produtos ({produtos.length})
            </TabsTrigger>
            <TabsTrigger value="categorias">
              <FolderOpen className="h-4 w-4 mr-2" />
              Categorias ({categorias.length})
            </TabsTrigger>
            <TabsTrigger value="ifood">
              <ShoppingCart className="h-4 w-4 mr-2" />
              iFood ({produtosIfood.length})
            </TabsTrigger>
            <TabsTrigger value="combos">
              <Layers className="h-4 w-4 mr-2" />
              Combos ({produtos.filter(p => p.isCombo).length})
            </TabsTrigger>
          </TabsList>

          {/* Tab Produtos */}
          <TabsContent value="produtos" className="space-y-6">
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setEditandoProduto(null);
            }}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editandoProduto ? 'Editar Produto' : 'Cadastrar Produto'}</DialogTitle>
                  <DialogDescription>Preencha os dados do produto</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSalvarProduto}>
                  <Tabs defaultValue="geral" className="mt-2">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="geral" className="gap-2">
                        <Package className="h-4 w-4" />
                        Dados Gerais
                      </TabsTrigger>
                      <TabsTrigger value="fiscal" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Dados Fiscais (NF-e/NFC-e)
                      </TabsTrigger>
                    </TabsList>

                    {/* TAB: Dados Gerais */}
                    <TabsContent value="geral" className="mt-4">
                      <div className="grid gap-4 py-2">
                        {/* Foto do Produto */}
                        <div className="space-y-2">
                          <Label>Foto do Produto</Label>
                          <div className="flex items-center gap-4">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              onChange={handleFotoUpload}
                            />
                            {editandoProduto ? (
                              <button
                                type="button"
                                className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors flex items-center justify-center bg-muted/20 flex-shrink-0"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={fotoUploading || fotoDeleting}
                              >
                                {fotoUploading || fotoDeleting ? (
                                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                ) : produtoFoto && !fotoError ? (
                                  <img
                                    src={produtoFoto}
                                    alt="Foto do produto"
                                    className="w-full h-full object-cover"
                                    onError={() => setFotoError(true)}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                    <Camera className="h-6 w-6" />
                                    <span className="text-[10px]">Adicionar foto</span>
                                  </div>
                                )}
                                {!fotoUploading && !fotoDeleting && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Upload className="h-5 w-5 text-white" />
                                  </div>
                                )}
                              </button>
                            ) : (
                              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center bg-muted/10 flex-shrink-0">
                                <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                                  <ImageIcon className="h-6 w-6" />
                                  <span className="text-[10px]">Salve primeiro</span>
                                </div>
                              </div>
                            )}
                            <div className="flex flex-col gap-2">
                              <p className="text-xs text-muted-foreground">
                                {produtoFoto ? 'Clique na imagem para trocar a foto' : 'Clique no quadro para adicionar uma foto ao produto'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Formatos: JPEG, PNG, WebP, GIF — Máximo: 5MB
                              </p>
                              {produtoFoto && editandoProduto && (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="w-fit"
                                  onClick={handleFotoRemove}
                                  disabled={fotoDeleting}
                                >
                                  {fotoDeleting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                                  Remover foto
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="nome">Nome</Label>
                            <Input id="nome" name="nome" placeholder="Nome do produto" required defaultValue={editandoProduto?.nome || ''} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="codigo">Código Interno</Label>
                            <Input id="codigo" name="codigo" placeholder="Ex: PROD001" defaultValue={editandoProduto?.codigo || ''} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="codigoBarras">Código de Barras <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                          <Input
                            id="codigoBarras"
                            name="codigoBarras"
                            placeholder="Ex: 7891234567890"
                            defaultValue={editandoProduto?.codigoBarras || ''}
                          />
                          <p className="text-xs text-muted-foreground">Use um leitor de código de barras ou digite manualmente</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="descricao">Descrição</Label>
                          <Input id="descricao" name="descricao" placeholder="Descrição do produto" defaultValue={editandoProduto?.descricao || ''} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="categoria">Categoria</Label>
                            <Select name="categoria" required defaultValue={editandoProduto?.categoriaId || ''}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {categorias.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="preco">Preço de Venda</Label>
                            <Input id="preco" name="preco" type="number" step="0.01" placeholder="0.00" required defaultValue={editandoProduto?.preco || ''} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="custo">Custo</Label>
                            <Input id="custo" name="custo" type="number" step="0.01" placeholder="0.00" defaultValue={editandoProduto?.custo || ''} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="unidade">Unidade</Label>
                            <Select name="unidade" defaultValue={editandoProduto?.unidade || 'un'}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="un">Unidade</SelectItem>
                                <SelectItem value="cx">Caixa</SelectItem>
                                <SelectItem value="kg">Quilograma</SelectItem>
                                <SelectItem value="lt">Litro</SelectItem>
                                <SelectItem value="ml">Mililitro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="unidadesPorCaixa">Unidades/Caixa</Label>
                            <Input id="unidadesPorCaixa" name="unidadesPorCaixa" type="number" placeholder="Ex: 12" defaultValue={editandoProduto?.unidadesPorCaixa || ''} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="estoqueMinimo">Estoque Mínimo</Label>
                            <Input id="estoqueMinimo" name="estoqueMinimo" type="number" placeholder="0" defaultValue={editandoProduto?.estoqueMinimo || ''} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="precoUnidade">Preço/Unidade</Label>
                            <Input id="precoUnidade" name="precoUnidade" type="number" step="0.01" placeholder="0.00" defaultValue={editandoProduto?.precoUnidade || ''} />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 pt-2">
                          <div className="flex items-center gap-2">
                            <Switch id="destaque" name="destaque" defaultChecked={editandoProduto?.destaque} />
                            <div>
                              <Label htmlFor="destaque">Destaque</Label>
                              <p className="text-xs text-muted-foreground">Aparece na tela inicial do PDV</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch id="disponivelIfood" name="disponivelIfood" defaultChecked={editandoProduto?.disponivelIfood} />
                            <div>
                              <Label htmlFor="disponivelIfood" className="flex items-center gap-1">
                                <ShoppingCart className="h-4 w-4 text-red-500" />
                                Enviar para iFood
                              </Label>
                              <p className="text-xs text-muted-foreground">Incluir no catálogo do iFood</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch id="isCombo" name="isCombo" defaultChecked={editandoProduto?.isCombo} />
                            <div>
                              <Label htmlFor="isCombo" className="flex items-center gap-1">
                                <Layers className="h-4 w-4 text-purple-500" />
                                É Combo?
                              </Label>
                              <p className="text-xs text-muted-foreground">Produto virtual com itens agregados</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* TAB: Dados Fiscais (NFE/NFCe) */}
                    <TabsContent value="fiscal" className="mt-4">
                      <div className="grid gap-4 py-2">
                        {/* Info banner */}
                        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">Dados para emissão de NF-e / NFC-e</p>
                            <p className="text-xs text-blue-600 mt-0.5">
                              Preencha os campos fiscais para automatizar a emissão de notas fiscais.
                              Os valores padrão serão usados caso não preenchidos. Consulte seu contador em caso de dúvidas.
                            </p>
                          </div>
                        </div>

                        {/* Classificação Fiscal */}
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Classificação Fiscal</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="ncm">
                                NCM
                                <span className="text-xs text-muted-foreground font-normal ml-1">(8 dígitos)</span>
                              </Label>
                              <Input
                                id="ncm"
                                name="ncm"
                                placeholder="00000000"
                                maxLength={8}
                                defaultValue={editandoProduto?.ncm || '00000000'}
                              />
                              <p className="text-xs text-muted-foreground">Nomenclatura Comum do Mercosul</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cest">
                                CEST
                                <span className="text-xs text-muted-foreground font-normal ml-1">(7 dígitos)</span>
                              </Label>
                              <Input
                                id="cest"
                                name="cest"
                                placeholder="Ex: 0100100"
                                maxLength={7}
                                defaultValue={editandoProduto?.cest || ''}
                              />
                              <p className="text-xs text-muted-foreground">Código Espec. Subst. Tributária</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cfop">
                                CFOP
                                <span className="text-xs text-muted-foreground font-normal ml-1">(4 dígitos)</span>
                              </Label>
                              <Input
                                id="cfop"
                                name="cfop"
                                placeholder="5102"
                                maxLength={4}
                                defaultValue={editandoProduto?.cfop || '5102'}
                              />
                              <p className="text-xs text-muted-foreground">Código Fiscal de Operações</p>
                            </div>
                          </div>
                        </div>

                        {/* Situação Tributária */}
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Situação Tributária</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="cst">
                                CST
                                <span className="text-xs text-muted-foreground font-normal ml-1">(Regime Normal)</span>
                              </Label>
                              <Input
                                id="cst"
                                name="cst"
                                placeholder="00"
                                maxLength={3}
                                defaultValue={editandoProduto?.cst || '00'}
                              />
                              <p className="text-xs text-muted-foreground">Cód. Situação Tributária</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="csosn">
                                CSOSN
                                <span className="text-xs text-muted-foreground font-normal ml-1">(Simples)</span>
                              </Label>
                              <Input
                                id="csosn"
                                name="csosn"
                                placeholder="102"
                                maxLength={3}
                                defaultValue={editandoProduto?.csosn || '102'}
                              />
                              <p className="text-xs text-muted-foreground">Situação Operação Simples</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="origem">Origem</Label>
                              <Select name="origem" defaultValue={editandoProduto?.origem || '0'}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0 - Nacional</SelectItem>
                                  <SelectItem value="1">1 - Importado direto</SelectItem>
                                  <SelectItem value="2">2 - Importado (merc. interno)</SelectItem>
                                  <SelectItem value="3">3 - Nacional (MF 40%)</SelectItem>
                                  <SelectItem value="4">4 - Nacional (MF 70%)</SelectItem>
                                  <SelectItem value="5">5 - Nacional (proc. produtivo)</SelectItem>
                                  <SelectItem value="6">6 - Importado (proc. produtivo)</SelectItem>
                                  <SelectItem value="7">7 - Nacional (MF 60%)</SelectItem>
                                  <SelectItem value="8">8 - Nacional (sem similar)</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">Origem da mercadoria (tabela IBGE)</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="unidadeTributavel">Unidade Tributável</Label>
                              <Select name="unidadeTributavel" defaultValue={editandoProduto?.unidadeTributavel || 'UN'}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="UN">UN - Unidade</SelectItem>
                                  <SelectItem value="KG">KG - Quilograma</SelectItem>
                                  <SelectItem value="LT">LT - Litro</SelectItem>
                                  <SelectItem value="L">L - Litro (abrev.)</SelectItem>
                                  <SelectItem value="M">M - Metro</SelectItem>
                                  <SelectItem value="M2">M2 - Metro Quadrado</SelectItem>
                                  <SelectItem value="M3">M3 - Metro Cúbico</SelectItem>
                                  <SelectItem value="MM">MM - Milímetro</SelectItem>
                                  <SelectItem value="CX">CX - Caixa</SelectItem>
                                  <SelectItem value="PCT">PCT - Pacote</SelectItem>
                                  <SelectItem value="ML">ML - Mililitro</SelectItem>
                                  <SelectItem value="G">G - Grama</SelectItem>
                                  <SelectItem value="KWH">KWH - Quilowatt-hora</SelectItem>
                                  <SelectItem value="SC">SC - Saco</SelectItem>
                                  <SelectItem value="FD">FD - Fardo</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">Unidade de medida fiscal</p>
                            </div>
                          </div>
                        </div>

                        {/* Alíquotas de Impostos */}
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Alíquotas de Impostos (%)</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="icms" className="flex items-center gap-1">
                                ICMS
                                <span className="text-xs text-muted-foreground font-normal">%</span>
                              </Label>
                              <Input
                                id="icms"
                                name="icms"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0.00"
                                defaultValue={editandoProduto?.icms || ''}
                              />
                              <p className="text-xs text-muted-foreground">Imposto sobre Circ. Merc. Serviços</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ipiAliquota" className="flex items-center gap-1">
                                IPI
                                <span className="text-xs text-muted-foreground font-normal">%</span>
                              </Label>
                              <Input
                                id="ipiAliquota"
                                name="ipiAliquota"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0.00"
                                defaultValue={editandoProduto?.ipiAliquota || ''}
                              />
                              <p className="text-xs text-muted-foreground">Imposto Prod. Industrializados</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="pisAliquota" className="flex items-center gap-1">
                                PIS
                                <span className="text-xs text-muted-foreground font-normal">%</span>
                              </Label>
                              <Input
                                id="pisAliquota"
                                name="pisAliquota"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0.00"
                                defaultValue={editandoProduto?.pisAliquota || ''}
                              />
                              <p className="text-xs text-muted-foreground">Programa Integração Social</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cofinsAliquota" className="flex items-center gap-1">
                                COFINS
                                <span className="text-xs text-muted-foreground font-normal">%</span>
                              </Label>
                              <Input
                                id="cofinsAliquota"
                                name="cofinsAliquota"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0.00"
                                defaultValue={editandoProduto?.cofinsAliquota || ''}
                              />
                              <p className="text-xs text-muted-foreground">Financiamento Seguridade Social</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <DialogFooter className="mt-4 pt-4 border-t">
                    <Button variant="outline" type="button" onClick={() => { setDialogOpen(false); setEditandoProduto(null); }}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {editandoProduto ? 'Salvar Alterações' : 'Cadastrar Produto'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Filtros */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar por nome ou código..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Categorias</SelectItem>
                      {categorias.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Produtos */}
            {filteredProdutos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <Package className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhum produto cadastrado</p>
                  <p className="text-sm text-muted-foreground">Clique em "Novo Produto" para começar</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Produto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Estoque</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-center">iFood</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-[100px] text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdutos.map((produto) => (
                      <TableRow key={produto.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0">
                              <Package className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{produto.nome}</p>
                                {produto.destaque && (
                                  <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {produto.descricao || 'Sem descrição'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {produto.codigo || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getNomeCategoria(produto.categoriaId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-mono ${(produto.estoqueAtual || 0) <= (produto.estoqueMinimo || 0) ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                            {produto.estoqueAtual || 0} {produto.unidade || 'un'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-green-600">
                            R$ {(produto.preco || 0).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={produto.disponivelIfood}
                            onCheckedChange={(checked) => handleToggleIfood(produto, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {getIfoodStatusBadge(produto)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditarProduto(produto)}
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleExcluirProduto(produto.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Tab Categorias */}
          <TabsContent value="categorias" className="space-y-6">
            <Dialog open={dialogCategoriaOpen} onOpenChange={setDialogCategoriaOpen}>
              <div className="flex justify-end">
                <Button onClick={() => setDialogCategoriaOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </div>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Categoria</DialogTitle>
                  <DialogDescription>
                    Crie uma nova categoria para organizar seus produtos
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSalvarCategoria}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome da Categoria</Label>
                      <Input id="nome" name="nome" placeholder="Ex: Bebidas Quentes" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Cor</Label>
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={`h-8 w-8 rounded-full transition-all ${
                              selectedColor === color
                                ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                                : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setDialogCategoriaOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Salvar Categoria
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Info Card */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Dica</p>
                    <p className="text-sm text-muted-foreground">
                      As categorias são exibidas no PDV na ordem de criação.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Categorias */}
            {categorias.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhuma categoria cadastrada</p>
                  <p className="text-sm text-muted-foreground">Clique em "Nova Categoria" para começar</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Categorias ({categorias.length})</CardTitle>
                  <CardDescription>
                    Lista de todas as categorias cadastradas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categorias.map((categoria, index) => (
                      <div
                        key={categoria.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: categoria.cor }}
                          >
                            <FolderOpen className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{categoria.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {getProdutosPorCategoria(categoria.id)} produtos ativos
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">Ordem: {index + 1}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleExcluirCategoria(categoria.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab iFood */}
          <TabsContent value="ifood" className="space-y-6">
            {/* Header iFood */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-red-500" />
                  Produtos no iFood
                </h2>
                <p className="text-sm text-muted-foreground">
                  Gerencie quais produtos serão sincronizados com o iFood
                </p>
              </div>
              <Button 
                onClick={handleSyncIfood} 
                disabled={syncing || produtosIfood.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sincronizar com iFood
              </Button>
            </div>

            {/* Status iFood */}
            {!ifoodConfig?.merchantId && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">Integração iFood não configurada</p>
                      <p className="text-sm text-yellow-700">
                        Configure suas credenciais do iFood em Integrações para sincronizar produtos.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de produtos iFood */}
            {produtosIfood.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhum produto marcado para iFood</p>
                  <p className="text-sm text-muted-foreground">
                    Marque produtos na aba "Produtos" para enviá-los ao iFood
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Produtos marcados para iFood ({produtosIfood.length})</CardTitle>
                  <CardDescription>
                    Estes produtos serão enviados para o catálogo do iFood
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead className="text-center">Status Sync</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtosIfood.map((produto) => (
                        <TableRow key={produto.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Package className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{produto.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  Código: {produto.ifoodExternalCode || produto.codigo || '-'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getNomeCategoria(produto.categoriaId)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            R$ {(produto.preco || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getIfoodStatusBadge(produto)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Combos */}
          <TabsContent value="combos" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-500" />
                Gerenciamento de Combos
              </h2>
              <p className="text-sm text-muted-foreground">
                Crie combos combinando produtos existentes. Ao vender um combo, o estoque dos itens componentes será reduzido automaticamente.
              </p>
            </div>

            {/* Info */}
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-800">Como funcionam os combos?</p>
                    <p className="text-sm text-purple-700">
                      1. Edite um produto e ative "É Combo?" na aba Dados Gerais.
                      2. Volte aqui e clique em "Configurar Itens" para definir os componentes.
                      3. Ao vender o combo no PDV, o estoque dos itens será reduzido automaticamente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de combos */}
            {produtos.filter(p => p.isCombo).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <Layers className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhum combo criado</p>
                  <p className="text-sm text-muted-foreground">
                    Edite um produto e ative a opção "É Combo?" para começar
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Combos cadastrados ({produtos.filter(p => p.isCombo).length})</CardTitle>
                  <CardDescription>
                    Configure os itens de cada combo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Combo</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead className="text-center">Itens</TableHead>
                        <TableHead className="w-[160px] text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtos.filter(p => p.isCombo).map((combo) => (
                        <TableRow key={combo.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center flex-shrink-0">
                                <Layers className="h-5 w-5 text-purple-400" />
                              </div>
                              <div>
                                <p className="font-medium">{combo.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {combo.codigo || '-'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            R$ {(combo.preco || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-purple-600 border-purple-200">
                              <Settings2 className="h-3 w-3 mr-1" />
                              Configurar
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setComboProdutoSelecionado(combo);
                                setComboItensState([]);
                                setComboSearch('');
                                const itens = await obterItensCombo(combo.id);
                                setComboItensState(itens.map(i => ({
                                  itemProdutoId: i.itemProdutoId,
                                  quantidade: i.quantidade,
                                  custoIncluido: i.custoIncluido,
                                })));
                                setDialogComboOpen(true);
                              }}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <Settings2 className="mr-2 h-4 w-4" />
                              Configurar Itens
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog: Configurar Itens do Combo */}
        <Dialog open={dialogComboOpen} onOpenChange={(open) => {
          setDialogComboOpen(open);
          if (!open) setComboProdutoSelecionado(null);
        }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                <span className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-purple-500" />
                  Configurar Itens do Combo
                </span>
              </DialogTitle>
              <DialogDescription>
                {comboProdutoSelecionado?.nome}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Busca de produtos */}
              <div className="space-y-2">
                <Label>Adicionar Produto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto por nome ou código..."
                    value={comboSearch}
                    onChange={(e) => setComboSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Lista de produtos disponíveis para adicionar */}
                {comboSearch.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {produtos
                      .filter(p => 
                        !p.isCombo && 
                        p.id !== comboProdutoSelecionado?.id &&
                        !comboItensState.some(ci => ci.itemProdutoId === p.id) &&
                        (
                          p.nome.toLowerCase().includes(comboSearch.toLowerCase()) || 
                          (p.codigo && p.codigo.toLowerCase().includes(comboSearch.toLowerCase()))
                        )
                      )
                      .slice(0, 10)
                      .map((produto) => (
                        <button
                          key={produto.id}
                          type="button"
                          onClick={() => {
                            setComboItensState([...comboItensState, {
                              itemProdutoId: produto.id,
                              quantidade: 1,
                              custoIncluido: true,
                            }]);
                            setComboSearch('');
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-accent flex items-center justify-between border-b last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{produto.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                R$ {(produto.preco || 0).toFixed(2)} · Estoque: {(produto.estoqueAtual || 0).toFixed(1)} {produto.unidade || 'un'}
                              </p>
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Itens atuais do combo */}
              <div className="space-y-2">
                <Label>Itens do Combo ({comboItensState.length})</Label>
                {comboItensState.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum item adicionado</p>
                    <p className="text-xs">Busque e adicione produtos acima</p>
                  </div>
                ) : (
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {comboItensState.map((item, index) => {
                      const produto = produtos.find(p => p.id === item.itemProdutoId);
                      return (
                        <div key={item.itemProdutoId} className="flex items-center gap-3 p-3 border-b last:border-b-0">
                          <div className="h-8 w-8 rounded bg-purple-50 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-purple-600">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{produto?.nome || 'Produto não encontrado'}</p>
                            <p className="text-xs text-muted-foreground">
                              R$ {(produto?.preco || 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</Label>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={item.quantidade}
                                onChange={(e) => {
                                  const newItens = [...comboItensState];
                                  newItens[index] = { ...newItens[index], quantidade: parseFloat(e.target.value) || 0 };
                                  setComboItensState(newItens);
                                }}
                                className="w-20 h-8 text-xs"
                              />
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <Checkbox
                                checked={item.custoIncluido}
                                onCheckedChange={(checked) => {
                                  const newItens = [...comboItensState];
                                  newItens[index] = { ...newItens[index], custoIncluido: checked };
                                  setComboItensState(newItens);
                                }}
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Baixa estoque</span>
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newItens = comboItensState.filter((_, i) => i !== index);
                                setComboItensState(newItens);
                              }}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Preview do custo total */}
              {comboItensState.length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Custo estimado dos itens (soma):</span>
                    <span className="font-semibold">
                      R$ {comboItensState.reduce((acc, item) => {
                        const produto = produtos.find(p => p.id === item.itemProdutoId);
                        return acc + ((produto?.custo || 0) * item.quantidade);
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => setDialogComboOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={savingCombo || comboItensState.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
                  if (!comboProdutoSelecionado) return;
                  setSavingCombo(true);
                  try {
                    await salvarComboItens(comboProdutoSelecionado.id, comboItensState);
                    toast({ title: 'Itens do combo salvo com sucesso!' });
                    setDialogComboOpen(false);
                    refetchProdutos();
                  } catch (error) {
                    console.error('Erro ao salvar itens do combo:', error);
                    toast({ variant: 'destructive', title: 'Erro ao salvar itens do combo' });
                  } finally {
                    setSavingCombo(false);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savingCombo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Itens
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
