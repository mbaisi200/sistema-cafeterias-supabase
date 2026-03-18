'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCategorias, useProdutos } from '@/hooks/useFirestore';
import { useState } from 'react';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  FolderOpen,
  GripVertical,
  Loader2,
} from 'lucide-react';

const colorOptions = [
  '#f97316', '#3b82f6', '#22c55e', '#ec4899', '#eab308', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16', '#6366f1', '#14b8a6',
];

export default function CategoriasPage() {
  const { categorias, loading, adicionarCategoria, excluirCategoria } = useCategorias();
  const { produtos } = useProdutos();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#f97316');
  const [saving, setSaving] = useState(false);

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      await adicionarCategoria({
        nome: formData.get('nome') as string,
        cor: selectedColor,
      });
      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
    } finally {
      setSaving(false);
    }
  };

  const getProdutosPorCategoria = (categoriaId: string) => {
    return produtos.filter(p => p.categoriaId === categoriaId && p.ativo).length;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Categorias' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Admin' },
          { title: 'Categorias' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Categorias</h1>
              <p className="text-muted-foreground">
                Organize os produtos do cardápio por categorias
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Categoria</DialogTitle>
                  <DialogDescription>
                    Crie uma nova categoria para organizar seus produtos
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSalvar}>
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
                    <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Salvar Categoria
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

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

          {/* Categories List */}
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
                              onClick={() => excluirCategoria(categoria.id)}
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
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
