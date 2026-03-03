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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProdutos, useCategorias } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Star,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

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
}

export default function ProdutosPage() {
  const { produtos, loading: loadingProdutos, adicionarProduto, atualizarProduto, excluirProduto } = useProdutos();
  const { categorias, loading: loadingCategorias } = useCategorias();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoProduto, setEditandoProduto] = useState<Produto | null>(null);
  const [saving, setSaving] = useState(false);

  const loading = loadingProdutos || loadingCategorias;

  const filteredProdutos = produtos.filter(produto => {
    const searchLower = search.toLowerCase();
    const matchSearch = produto.nome.toLowerCase().includes(searchLower) ||
                       (produto.codigo && produto.codigo.toLowerCase().includes(searchLower)) ||
                       (produto.codigoBarras && produto.codigoBarras.includes(search));
    const matchCategoria = categoriaFilter === 'all' || produto.categoriaId === categoriaFilter;
    return matchSearch && matchCategoria;
  });

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const dados = {
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
      };

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
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar produto' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (produto: Produto) => {
    setEditandoProduto(produto);
    setDialogOpen(true);
  };

  const handleNovo = () => {
    setEditandoProduto(null);
    setDialogOpen(true);
  };

  const handleExcluir = async (id: string) => {
    try {
      await excluirProduto(id);
      toast({ title: 'Produto excluído!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir produto' });
    }
  };

  const getNomeCategoria = (categoriaId: string) => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.nome || 'Sem categoria';
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
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Produtos</h1>
              <p className="text-muted-foreground">Gerencie o cardápio do seu estabelecimento</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setEditandoProduto(null);
            }}>
              <Button onClick={handleNovo} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editandoProduto ? 'Editar Produto' : 'Cadastrar Produto'}</DialogTitle>
                  <DialogDescription>Preencha os dados do produto</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSalvar}>
                  <div className="grid gap-4 py-4">
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
                    <div className="flex items-center gap-6 pt-2">
                      <div className="flex items-center gap-2">
                        <Switch id="destaque" name="destaque" defaultChecked={editandoProduto?.destaque} />
                        <div>
                          <Label htmlFor="destaque">Destaque</Label>
                          <p className="text-xs text-muted-foreground">Aparece na tela inicial do PDV</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
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
          </div>

          {/* Filters */}
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

          {/* Products Table */}
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
                    <TableHead>Cód. Barras</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-center">Estoque</TableHead>
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
                        <span className="text-xs font-mono text-gray-600">
                          {produto.codigoBarras || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getNomeCategoria(produto.categoriaId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-green-600">
                          R$ {(produto.preco || 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{produto.estoqueAtual || 0}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {(produto.estoqueAtual || 0) <= (produto.estoqueMinimo || 0) ? (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1 w-fit mx-auto">
                            <AlertTriangle className="h-3 w-3" /> Baixo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs w-fit mx-auto">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditar(produto)}
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleExcluir(produto.id)}
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
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
