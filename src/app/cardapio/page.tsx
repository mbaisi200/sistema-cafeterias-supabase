'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  Clock, 
  Star, 
  Bike,
  Store,
  Coffee,
  AlertCircle
} from 'lucide-react';
import type { CarrinhoItem, ItemVariacao, ItemAdicional } from '@/types/delivery';

// Types
interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  preco_promocional?: number;
  imagem_url?: string;
  categoria_id: string;
  categoria_nome?: string;
  disponivel: boolean;
  destaque: boolean;
}

interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  icone?: string;
  cor?: string;
  ordem: number;
}

interface ProdutoOpcao {
  id: string;
  nome: string;
  tipo: 'variacao' | 'adicional' | 'obrigatorio';
  minimo_selecao: number;
  maximo_selecao: number;
  itens: { id: string; nome: string; preco_adicional: number }[];
}

interface EmpresaInfo {
  id: string;
  nome: string;
  logo_url?: string;
  endereco?: string;
  telefone?: string;
  delivery_ativo: boolean;
  retirada_ativo: boolean;
  taxa_entrega_padrao: number;
  pedido_minimo: number;
  tempo_preparo_min: number;
  tempo_preparo_max: number;
  aceita_dinheiro: boolean;
  aceita_cartao: boolean;
  aceita_pix: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ProdutoCard Component
function ProdutoCard({ produto, onAddToCart }: { produto: Produto; onAddToCart: (produto: Produto) => void }) {
  const precoExibir = produto.preco_promocional || produto.preco;
  const temPromocao = produto.preco_promocional && produto.preco_promocional < produto.preco;

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${!produto.disponivel ? 'opacity-60' : ''}`}>
      <div className="flex">
        {produto.imagem_url ? (
          <div className="w-28 h-28 flex-shrink-0">
            <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-28 h-28 flex-shrink-0 bg-gray-100 flex items-center justify-center">
            <Coffee className="h-10 w-10 text-gray-400" />
          </div>
        )}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm line-clamp-1">{produto.nome}</h3>
              {produto.destaque && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  <Star className="h-3 w-3 mr-1" /> Destaque
                </Badge>
              )}
            </div>
            {produto.descricao && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{produto.descricao}</p>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {temPromocao ? (
                <>
                  <span className="text-sm line-through text-muted-foreground">{formatCurrency(produto.preco)}</span>
                  <span className="font-bold text-green-600">{formatCurrency(produto.preco_promocional!)}</span>
                </>
              ) : (
                <span className="font-bold">{formatCurrency(produto.preco)}</span>
              )}
            </div>
            <Button size="sm" onClick={() => onAddToCart(produto)} disabled={!produto.disponivel} className="h-8">
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ProdutoModal Component
function ProdutoModal({
  produto,
  opcoes,
  open,
  onOpenChange,
  onConfirm,
}: {
  produto: Produto | null;
  opcoes: ProdutoOpcao[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (item: CarrinhoItem) => void;
}) {
  const [quantidade, setQuantidade] = useState(1);
  const [observacoes, setObservacoes] = useState('');
  const [selectedVariacoes, setSelectedVariacoes] = useState<Record<string, string>>({});
  const [selectedAdicionais, setSelectedAdicionais] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (open) {
      setQuantidade(1);
      setObservacoes('');
      setSelectedVariacoes({});
      setSelectedAdicionais({});
    }
  }, [open]);

  if (!produto) return null;

  const precoBase = produto.preco_promocional || produto.preco;

  const calcularTotal = (): number => {
    let total = precoBase;
    Object.entries(selectedVariacoes).forEach(([opcaoId, itemId]) => {
      const opcao = opcoes.find(o => o.id === opcaoId);
      const item = opcao?.itens.find(i => i.id === itemId);
      if (item) total += item.preco_adicional;
    });
    Object.entries(selectedAdicionais).forEach(([opcaoId, itemIds]) => {
      const opcao = opcoes.find(o => o.id === opcaoId);
      itemIds.forEach(itemId => {
        const item = opcao?.itens.find(i => i.id === itemId);
        if (item) total += item.preco_adicional;
      });
    });
    return total * quantidade;
  };

  const handleConfirm = () => {
    const variacoes: ItemVariacao[] = [];
    const adicionais: ItemAdicional[] = [];

    Object.entries(selectedVariacoes).forEach(([opcaoId, itemId]) => {
      const opcao = opcoes.find(o => o.id === opcaoId);
      const item = opcao?.itens.find(i => i.id === itemId);
      if (opcao && item) {
        variacoes.push({ nome: opcao.nome, valor: item.nome, preco: item.preco_adicional });
      }
    });

    Object.entries(selectedAdicionais).forEach(([opcaoId, itemIds]) => {
      const opcao = opcoes.find(o => o.id === opcaoId);
      itemIds.forEach(itemId => {
        const item = opcao?.itens.find(i => i.id === itemId);
        if (opcao && item) {
          adicionais.push({ id: item.id, nome: item.nome, quantidade: 1, preco: item.preco_adicional });
        }
      });
    });

    onConfirm({
      produtoId: produto.id,
      produtoNome: produto.nome,
      produtoDescricao: produto.descricao,
      produtoImagem: produto.imagem_url,
      precoBase,
      quantidade,
      variacoes: variacoes.length > 0 ? variacoes : undefined,
      adicionais: adicionais.length > 0 ? adicionais : undefined,
      observacoes: observacoes || undefined,
      total: calcularTotal(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produto.nome}</DialogTitle>
          {produto.descricao && <DialogDescription>{produto.descricao}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {produto.imagem_url && (
            <img src={produto.imagem_url} alt={produto.nome} className="w-full h-48 object-cover rounded-lg" />
          )}

          {opcoes.map(opcao => (
            <div key={opcao.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium">{opcao.nome}</Label>
                {opcao.minimo_selecao > 0 && (
                  <span className="text-xs text-muted-foreground">Obrigatório</span>
                )}
              </div>

              {opcao.tipo === 'variacao' || opcao.tipo === 'obrigatorio' ? (
                <RadioGroup
                  value={selectedVariacoes[opcao.id] || ''}
                  onValueChange={(value) => setSelectedVariacoes(prev => ({ ...prev, [opcao.id]: value }))}
                >
                  {opcao.itens.map(item => (
                    <div key={item.id} className="flex items-center justify-between space-x-2 py-2 border-b">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={item.id} id={item.id} />
                        <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.nome}</Label>
                      </div>
                      {item.preco_adicional > 0 && (
                        <span className="text-sm text-muted-foreground">+{formatCurrency(item.preco_adicional)}</span>
                      )}
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2">
                  {opcao.itens.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={item.id}
                          checked={selectedAdicionais[opcao.id]?.includes(item.id) || false}
                          onCheckedChange={(checked) => {
                            setSelectedAdicionais(prev => {
                              const current = prev[opcao.id] || [];
                              if (checked && current.length < opcao.maximo_selecao) {
                                return { ...prev, [opcao.id]: [...current, item.id] };
                              } else if (!checked) {
                                return { ...prev, [opcao.id]: current.filter(id => id !== item.id) };
                              }
                              return prev;
                            });
                          }}
                        />
                        <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.nome}</Label>
                      </div>
                      <span className="text-sm text-muted-foreground">+{formatCurrency(item.preco_adicional)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <Separator />

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Sem cebola, bem passado..."
              rows={2}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setQuantidade(Math.max(1, quantidade - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{quantidade}</span>
              <Button variant="outline" size="icon" onClick={() => setQuantidade(quantidade + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Total</span>
              <p className="font-bold text-lg">{formatCurrency(calcularTotal())}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full">
            Adicionar ao Carrinho - {formatCurrency(calcularTotal())}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// CarrinhoSheet Component
function CarrinhoSheet({
  carrinho,
  empresa,
  onUpdateQuantidade,
  onRemoveItem,
  onClearCart,
  onCheckout,
}: {
  carrinho: CarrinhoItem[];
  empresa: EmpresaInfo | null;
  onUpdateQuantidade: (index: number, quantidade: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}) {
  const subtotal = carrinho.reduce((sum, item) => sum + item.total, 0);
  const taxaEntrega = empresa?.taxa_entrega_padrao || 0;
  const total = subtotal + taxaEntrega;
  const pedidoMinimo = empresa?.pedido_minimo || 0;
  const atendeMinimo = subtotal >= pedidoMinimo;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="fixed bottom-4 right-4 h-14 rounded-full shadow-lg z-50" size="lg">
          <ShoppingCart className="h-5 w-5 mr-2" />
          {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
          <Badge variant="secondary" className="ml-2">{formatCurrency(subtotal)}</Badge>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Seu Carrinho
          </SheetTitle>
          <SheetDescription>
            {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {carrinho.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="font-medium">Carrinho vazio</h3>
              <p className="text-sm text-muted-foreground">Adicione produtos para começar</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {carrinho.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {item.produtoImagem ? (
                        <img src={item.produtoImagem} alt={item.produtoNome} className="w-16 h-16 object-cover rounded-lg" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Coffee className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1">{item.produtoNome}</h4>
                        {item.variacoes && item.variacoes.map((v, i) => (
                          <p key={i} className="text-xs text-muted-foreground">{v.nome}: {v.valor}</p>
                        ))}
                        {item.observacoes && (
                          <p className="text-xs text-muted-foreground italic">{item.observacoes}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantidade(index, item.quantidade - 1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium">{item.quantidade}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantidade(index, item.quantidade + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatCurrency(item.total)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemoveItem(index)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {carrinho.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            {!atendeMinimo && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Pedido mínimo: {formatCurrency(pedidoMinimo)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span>Taxa de entrega</span><span>{formatCurrency(taxaEntrega)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClearCart} className="flex-1">Limpar</Button>
              <Button onClick={onCheckout} disabled={!atendeMinimo} className="flex-1">Finalizar Pedido</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Main Page
export default function CardapioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const empresaId = searchParams.get('empresa') || '';

  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [opcoes, setOpcoes] = useState<ProdutoOpcao[]>([]);
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas');
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (empresaId) loadData();
  }, [empresaId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: empresaData } = await supabase.from('empresas').select('*').eq('id', empresaId).maybeSingle();

      if (empresaData) {
        const { data: configData } = await supabase.from('empresa_delivery_config').select('*').eq('empresa_id', empresaId).maybeSingle();

        setEmpresa({
          id: empresaData.id,
          nome: empresaData.nome,
          logo_url: empresaData.logo_url,
          endereco: empresaData.endereco,
          telefone: empresaData.telefone,
          delivery_ativo: configData?.delivery_ativo ?? true,
          retirada_ativo: configData?.retirada_ativo ?? true,
          taxa_entrega_padrao: configData?.taxa_entrega_padrao || 0,
          pedido_minimo: configData?.pedido_minimo || 0,
          tempo_preparo_min: configData?.tempo_preparo_min || 20,
          tempo_preparo_max: configData?.tempo_preparo_max || 45,
          aceita_dinheiro: configData?.aceita_dinheiro ?? true,
          aceita_cartao: configData?.aceita_cartao ?? true,
          aceita_pix: configData?.aceita_pix ?? true,
        });
      }

      const { data: categoriasData } = await supabase.from('categorias_cardapio').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('ordem');
      setCategorias(categoriasData || []);

      const { data: produtosData } = await supabase.from('produtos').select('id, nome, descricao, preco, preco_promocional, imagem_url, categoria_id, disponivel, destaque').eq('empresa_id', empresaId).eq('ativo', true).order('nome');
      setProdutos(produtosData || []);

      const { data: opcoesData } = await supabase.from('produto_opcoes').select('id, nome, tipo, minimo_selecao, maximo_selecao').eq('empresa_id', empresaId).eq('ativo', true);
      setOpcoes(opcoesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar o cardápio.' });
    } finally {
      setLoading(false);
    }
  };

  const produtosFiltrados = useMemo(() => {
    let filtered = produtos;
    if (categoriaAtiva !== 'todas') filtered = filtered.filter(p => p.categoria_id === categoriaAtiva);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.nome.toLowerCase().includes(term) || p.descricao?.toLowerCase().includes(term));
    }
    return filtered;
  }, [produtos, categoriaAtiva, searchTerm]);

  const produtosDestaque = useMemo(() => produtos.filter(p => p.destaque && p.disponivel), [produtos]);

  const handleAddToCart = (produto: Produto) => {
    if (opcoes.length > 0) {
      setProdutoSelecionado(produto);
      setModalOpen(true);
    } else {
      const item: CarrinhoItem = {
        produtoId: produto.id,
        produtoNome: produto.nome,
        produtoDescricao: produto.descricao,
        produtoImagem: produto.imagem_url,
        precoBase: produto.preco_promocional || produto.preco,
        quantidade: 1,
        total: produto.preco_promocional || produto.preco,
      };
      setCarrinho(prev => [...prev, item]);
      toast({ title: 'Adicionado!', description: `${produto.nome} foi adicionado ao carrinho.` });
    }
  };

  const handleConfirmItem = (item: CarrinhoItem) => {
    setCarrinho(prev => [...prev, item]);
    toast({ title: 'Adicionado!', description: `${item.produtoNome} foi adicionado ao carrinho.` });
  };

  const handleUpdateQuantidade = (index: number, quantidade: number) => {
    if (quantidade < 1) { handleRemoveItem(index); return; }
    setCarrinho(prev => prev.map((item, i) => {
      if (i === index) {
        const totalItem = (item.precoBase / item.quantidade) * quantidade;
        return { ...item, quantidade, total: totalItem };
      }
      return item;
    }));
  };

  const handleRemoveItem = (index: number) => setCarrinho(prev => prev.filter((_, i) => i !== index));
  const handleClearCart = () => setCarrinho([]);

  const handleCheckout = () => {
    localStorage.setItem('carrinho_delivery', JSON.stringify(carrinho));
    localStorage.setItem('empresa_delivery', JSON.stringify(empresa));
    router.push(`/cardapio/checkout?empresa=${empresaId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-48 bg-gray-200 animate-pulse" />
        <div className="container mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <div className="flex gap-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-24 rounded-full" />)}</div>
          <div className="grid gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
        </div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Coffee className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Empresa não encontrada</h2>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-orange-400 to-red-500" />
        <div className="container mx-auto px-4 -mt-12 relative z-10">
          <div className="flex items-end gap-4">
            {empresa.logo_url ? (
              <img src={empresa.logo_url} alt={empresa.nome} className="w-24 h-24 rounded-xl border-4 border-white shadow-lg object-cover bg-white" />
            ) : (
              <div className="w-24 h-24 rounded-xl border-4 border-white shadow-lg bg-white flex items-center justify-center">
                <Coffee className="h-10 w-10 text-orange-500" />
              </div>
            )}
            <div className="pb-2">
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">{empresa.nome}</h1>
              <div className="flex items-center gap-4 text-sm text-white/90 mt-1">
                <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> 4.8</span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {empresa.tempo_preparo_min}-{empresa.tempo_preparo_max} min</span>
                <span className="flex items-center gap-1"><Bike className="h-4 w-4" /> {empresa.taxa_entrega_padrao > 0 ? formatCurrency(empresa.taxa_entrega_padrao) : 'Grátis'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4 pb-4 overflow-x-auto">
            {empresa.delivery_ativo && <Badge variant="secondary" className="flex-shrink-0"><Bike className="h-3 w-3 mr-1" /> Entrega</Badge>}
            {empresa.retirada_ativo && <Badge variant="secondary" className="flex-shrink-0"><Store className="h-3 w-3 mr-1" /> Retirada</Badge>}
            {empresa.aceita_pix && <Badge variant="outline" className="flex-shrink-0">PIX</Badge>}
            {empresa.aceita_cartao && <Badge variant="outline" className="flex-shrink-0">Cartão</Badge>}
            {empresa.aceita_dinheiro && <Badge variant="outline" className="flex-shrink-0">Dinheiro</Badge>}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar no cardápio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        {/* Categorias */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4">
          <Button variant={categoriaAtiva === 'todas' ? 'default' : 'outline'} size="sm" className="rounded-full flex-shrink-0" onClick={() => setCategoriaAtiva('todas')}>Todas</Button>
          {categorias.map(cat => (
            <Button key={cat.id} variant={categoriaAtiva === cat.id ? 'default' : 'outline'} size="sm" className="rounded-full flex-shrink-0" onClick={() => setCategoriaAtiva(cat.id)}>
              {cat.icone && <span className="mr-1">{cat.icone}</span>}{cat.nome}
            </Button>
          ))}
        </div>

        {/* Destaques */}
        {categoriaAtiva === 'todas' && produtosDestaque.length > 0 && !searchTerm && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" /> Destaques</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {produtosDestaque.map(produto => <ProdutoCard key={produto.id} produto={produto} onAddToCart={handleAddToCart} />)}
            </div>
          </div>
        )}

        {/* Cardápio */}
        <div className="space-y-8">
          {categorias.map(categoria => {
            const produtosCategoria = produtosFiltrados.filter(p => p.categoria_id === categoria.id);
            if (produtosCategoria.length === 0) return null;
            return (
              <div key={categoria.id}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {categoria.icone && <span>{categoria.icone}</span>}{categoria.nome}
                </h2>
                <div className="grid gap-4">
                  {produtosCategoria.map(produto => <ProdutoCard key={produto.id} produto={produto} onAddToCart={handleAddToCart} />)}
                </div>
              </div>
            );
          })}

          {/* Produtos sem categoria */}
          {categoriaAtiva === 'todas' && (() => {
            const produtosSemCategoria = produtosFiltrados.filter(p => !p.categoria_id || !categorias.find(c => c.id === p.categoria_id));
            if (produtosSemCategoria.length === 0) return null;
            return (
              <div>
                <h2 className="text-lg font-semibold mb-4">Outros</h2>
                <div className="grid gap-4">
                  {produtosSemCategoria.map(produto => <ProdutoCard key={produto.id} produto={produto} onAddToCart={handleAddToCart} />)}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Sem resultados */}
        {produtosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium">Nenhum produto encontrado</h3>
            <p className="text-sm text-muted-foreground">Tente buscar por outro termo</p>
          </div>
        )}
      </div>

      {/* Modal de Produto */}
      <ProdutoModal produto={produtoSelecionado} opcoes={opcoes} open={modalOpen} onOpenChange={setModalOpen} onConfirm={handleConfirmItem} />

      {/* Carrinho */}
      {carrinho.length > 0 && (
        <CarrinhoSheet
          carrinho={carrinho}
          empresa={empresa}
          onUpdateQuantidade={handleUpdateQuantidade}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}
