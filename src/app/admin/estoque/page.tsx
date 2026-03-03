'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProdutos } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, Timestamp, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  AlertTriangle,
  Warehouse,
  Plus,
  Minus,
  Loader2,
  ArrowUp,
  ArrowDown,
  History,
  Search,
  Filter,
} from 'lucide-react';

interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  produtoNome: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  estoqueAnterior: number;
  estoqueNovo: number;
  observacao?: string;
  fornecedor?: string;
  documentoRef?: string;
  criadoPor: string;
  criadoPorNome: string;
  criadoEm: Date;
}

export default function EstoquePage() {
  const { produtos, loading: loadingProdutos, atualizarProduto } = useProdutos();
  const { user, empresaId } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'baixo' | 'normal'>('todos');
  const [dialogEntrada, setDialogEntrada] = useState(false);
  const [dialogSaida, setDialogSaida] = useState(false);
  const [dialogHistorico, setDialogHistorico] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Formulário de entrada
  const [quantidade, setQuantidade] = useState('');
  const [tipoEntrada, setTipoEntrada] = useState<'unidade' | 'caixa'>('unidade');
  const [fornecedor, setFornecedor] = useState('');
  const [documentoRef, setDocumentoRef] = useState('');
  const [observacao, setObservacao] = useState('');
  
  // Movimentações
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);

  // Carregar movimentações
  const carregarMovimentacoes = useCallback(() => {
    if (!empresaId) return;
    
    const dbInstance = db();
    if (!dbInstance) return;

    setLoadingMovimentacoes(true);
    
    const q = query(
      collection(dbInstance, 'movimentacoes_estoque'),
      where('empresaId', '==', empresaId),
      orderBy('criadoEm', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm?.toDate(),
      })) as MovimentacaoEstoque[];
      
      setMovimentacoes(data.slice(0, 50)); // Últimas 50 movimentações
      setLoadingMovimentacoes(false);
    }, (error) => {
      console.error('Erro ao carregar movimentações:', error);
      setLoadingMovimentacoes(false);
    });

    return unsubscribe;
  }, [empresaId]);

  useEffect(() => {
    const unsubscribe = carregarMovimentacoes();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [carregarMovimentacoes]);

  // Filtros
  const produtosFiltrados = produtos.filter(produto => {
    const matchSearch = produto.nome.toLowerCase().includes(search.toLowerCase()) ||
                       (produto.codigo && produto.codigo.toLowerCase().includes(search.toLowerCase())) ||
                       (produto.codigoBarras && produto.codigoBarras.includes(search));
    
    const estoqueBaixo = (produto.estoqueAtual || 0) <= (produto.estoqueMinimo || 0);
    const matchStatus = filterStatus === 'todos' || 
                       (filterStatus === 'baixo' && estoqueBaixo) ||
                       (filterStatus === 'normal' && !estoqueBaixo);
    
    return matchSearch && matchStatus;
  });

  const produtosBaixoEstoque = produtos.filter(p => (p.estoqueAtual || 0) <= (p.estoqueMinimo || 0));

  // Abrir dialog de entrada
  const handleEntrada = (produto: any) => {
    setProdutoSelecionado(produto);
    setQuantidade('');
    setTipoEntrada('unidade');
    setFornecedor('');
    setDocumentoRef('');
    setObservacao('');
    setDialogEntrada(true);
  };

  // Abrir dialog de saída
  const handleSaida = (produto: any) => {
    setProdutoSelecionado(produto);
    setQuantidade('');
    setObservacao('');
    setDialogSaida(true);
  };

  // Registrar entrada no estoque
  const registrarEntrada = async () => {
    if (!produtoSelecionado || !quantidade || parseFloat(quantidade) <= 0) {
      toast({ variant: 'destructive', title: 'Informe a quantidade' });
      return;
    }

    // Validar se o produto tem unidadesPorCaixa quando for entrada por caixa
    if (tipoEntrada === 'caixa' && !produtoSelecionado.unidadesPorCaixa) {
      toast({ variant: 'destructive', title: 'Este produto não tem unidades por caixa cadastrada' });
      return;
    }

    setSaving(true);
    const dbInstance = db();
    if (!dbInstance || !empresaId) return;

    try {
      const qtdInformada = parseFloat(quantidade);
      const unidadesPorCaixa = produtoSelecionado.unidadesPorCaixa || 1;
      // Calcula a quantidade real em unidades
      const qtd = tipoEntrada === 'caixa' ? qtdInformada * unidadesPorCaixa : qtdInformada;
      const estoqueAnterior = produtoSelecionado.estoqueAtual || 0;
      const estoqueNovo = estoqueAnterior + qtd;

      // Atualizar produto
      await atualizarProduto(produtoSelecionado.id, {
        estoqueAtual: estoqueNovo,
      });

      // Registrar movimentação
      await addDoc(collection(dbInstance, 'movimentacoes_estoque'), {
        empresaId,
        produtoId: produtoSelecionado.id,
        produtoNome: produtoSelecionado.nome,
        tipo: 'entrada',
        quantidade: qtd,
        quantidadeInformada: qtdInformada,
        tipoEntrada: tipoEntrada,
        unidadesPorCaixa: tipoEntrada === 'caixa' ? unidadesPorCaixa : null,
        estoqueAnterior,
        estoqueNovo,
        fornecedor: fornecedor || null,
        documentoRef: documentoRef || null,
        observacao: observacao || null,
        criadoPor: user?.id,
        criadoPorNome: user?.nome,
        criadoEm: Timestamp.now(),
      });

      const mensagem = tipoEntrada === 'caixa' 
        ? `✓ Entrada de ${qtdInformada} caixas (${qtd} unidades) registrada`
        : `✓ Entrada de ${qtd} unidades registrada`;
      toast({ title: mensagem });
      setDialogEntrada(false);
      setProdutoSelecionado(null);
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      toast({ variant: 'destructive', title: 'Erro ao registrar entrada' });
    } finally {
      setSaving(false);
    }
  };

  // Registrar saída do estoque
  const registrarSaida = async () => {
    if (!produtoSelecionado || !quantidade || parseFloat(quantidade) <= 0) {
      toast({ variant: 'destructive', title: 'Informe a quantidade' });
      return;
    }

    const qtd = parseFloat(quantidade);
    const estoqueAtual = produtoSelecionado.estoqueAtual || 0;

    if (qtd > estoqueAtual) {
      toast({ variant: 'destructive', title: 'Quantidade maior que o estoque disponível' });
      return;
    }

    setSaving(true);
    const dbInstance = db();
    if (!dbInstance || !empresaId) return;

    try {
      const estoqueAnterior = estoqueAtual;
      const estoqueNovo = estoqueAnterior - qtd;

      // Atualizar produto
      await atualizarProduto(produtoSelecionado.id, {
        estoqueAtual: estoqueNovo,
      });

      // Registrar movimentação
      await addDoc(collection(dbInstance, 'movimentacoes_estoque'), {
        empresaId,
        produtoId: produtoSelecionado.id,
        produtoNome: produtoSelecionado.nome,
        tipo: 'saida',
        quantidade: qtd,
        estoqueAnterior,
        estoqueNovo,
        observacao: observacao || null,
        criadoPor: user?.id,
        criadoPorNome: user?.nome,
        criadoEm: Timestamp.now(),
      });

      toast({ title: `✓ Saída de ${qtd} unidades registrada` });
      setDialogSaida(false);
      setProdutoSelecionado(null);
    } catch (error) {
      console.error('Erro ao registrar saída:', error);
      toast({ variant: 'destructive', title: 'Erro ao registrar saída' });
    } finally {
      setSaving(false);
    }
  };

  // Ver histórico do produto
  const verHistorico = (produto: any) => {
    setProdutoSelecionado(produto);
    setDialogHistorico(true);
  };

  const movimentacoesProduto = produtoSelecionado 
    ? movimentacoes.filter(m => m.produtoId === produtoSelecionado.id)
    : [];

  if (loadingProdutos) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Estoque' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Estoque' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Controle de Estoque</h1>
              <p className="text-muted-foreground">
                Gerencie o estoque do seu estabelecimento
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setDialogHistorico(true)}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              Histórico Geral
            </Button>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Produtos</p>
                    <p className="text-2xl font-bold">{produtos.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <ArrowUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entradas (Hoje)</p>
                    <p className="text-2xl font-bold">
                      {movimentacoes.filter(m => 
                        m.tipo === 'entrada' && 
                        m.criadoEm && 
                        new Date(m.criadoEm).toDateString() === new Date().toDateString()
                      ).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <ArrowDown className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saídas (Hoje)</p>
                    <p className="text-2xl font-bold">
                      {movimentacoes.filter(m => 
                        m.tipo === 'saida' && 
                        m.criadoEm && 
                        new Date(m.criadoEm).toDateString() === new Date().toDateString()
                      ).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className={produtosBaixoEstoque.length > 0 ? 'border-yellow-300' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                    <p className="text-2xl font-bold text-yellow-600">{produtosBaixoEstoque.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, código ou código de barras..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="baixo">Estoque Baixo</SelectItem>
                    <SelectItem value="normal">Estoque Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Alertas */}
          {produtosBaixoEstoque.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-800">
                      Atenção: {produtosBaixoEstoque.length} produtos com estoque baixo
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Alguns produtos estão abaixo do estoque mínimo. Faça a reposição.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Produtos */}
          {produtos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Warehouse className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum produto cadastrado</p>
                <p className="text-sm text-muted-foreground">Cadastre produtos para gerenciar o estoque</p>
                <Button className="mt-4" asChild>
                  <a href="/admin/produtos">
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Produtos
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-center">Estoque Atual</TableHead>
                    <TableHead className="text-center">Estoque Mínimo</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosFiltrados.map((produto) => {
                    const estoqueBaixo = (produto.estoqueAtual || 0) <= (produto.estoqueMinimo || 0);
                    return (
                      <TableRow key={produto.id} className={estoqueBaixo ? 'bg-yellow-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{produto.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {produto.unidade || 'un'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {produto.codigo || produto.codigoBarras || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${estoqueBaixo ? 'text-red-600' : ''}`}>
                            {produto.estoqueAtual || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm">{produto.estoqueMinimo || 0}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {estoqueBaixo ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Baixo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-green-600 hover:bg-green-50"
                              onClick={() => handleEntrada(produto)}
                            >
                              <ArrowUp className="h-4 w-4 mr-1" />
                              Entrada
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-red-600 hover:bg-red-50"
                              onClick={() => handleSaida(produto)}
                              disabled={(produto.estoqueAtual || 0) <= 0}
                            >
                              <ArrowDown className="h-4 w-4 mr-1" />
                              Saída
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => verHistorico(produto)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>

        {/* DIALOG ENTRADA DE ESTOQUE */}
        <Dialog open={dialogEntrada} onOpenChange={setDialogEntrada}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <ArrowUp className="h-5 w-5" />
                Entrada de Estoque
              </DialogTitle>
              <DialogDescription>
                Registre a entrada de produtos no estoque
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium">{produtoSelecionado?.nome}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-muted-foreground">
                    Estoque atual: <span className="font-bold">{produtoSelecionado?.estoqueAtual || 0}</span> {produtoSelecionado?.unidade || 'un'}
                  </p>
                  {produtoSelecionado?.unidadesPorCaixa > 0 && (
                    <p className="text-xs text-muted-foreground">
                      1 caixa = {produtoSelecionado.unidadesPorCaixa} un
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="tipoEntrada">Tipo de Entrada</Label>
                  <Select value={tipoEntrada} onValueChange={(v: 'unidade' | 'caixa') => setTipoEntrada(v)}>
                    <SelectTrigger id="tipoEntrada">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidade">Unidade</SelectItem>
                      <SelectItem value="caixa" disabled={!produtoSelecionado?.unidadesPorCaixa}>
                        Caixa
                        {!produtoSelecionado?.unidadesPorCaixa && ' (não config.)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantidade">
                    Quantidade {tipoEntrada === 'caixa' ? '(caixas)' : '(unidades)'} *
                  </Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    step="1"
                    placeholder={tipoEntrada === 'caixa' ? 'Ex: 5' : 'Ex: 10'}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                  />
                </div>
              </div>

              {/* Cálculo da conversão */}
              {quantidade && parseFloat(quantidade) > 0 && tipoEntrada === 'caixa' && produtoSelecionado?.unidadesPorCaixa > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-700">
                      {quantidade} caixa(s) × {produtoSelecionado.unidadesPorCaixa} un
                    </span>
                    <span className="font-bold text-blue-800">
                      = {(parseFloat(quantidade) * produtoSelecionado.unidadesPorCaixa)} unidades
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input
                  id="fornecedor"
                  placeholder="Nome do fornecedor (opcional)"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documento">Documento / Nota Fiscal</Label>
                <Input
                  id="documento"
                  placeholder="Ex: NF 12345 (opcional)"
                  value={documentoRef}
                  onChange={(e) => setDocumentoRef(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  placeholder="Observação opcional..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={2}
                />
              </div>

              {quantidade && parseFloat(quantidade) > 0 && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-sm text-green-700">
                    Novo estoque: <span className="font-bold">
                      {(produtoSelecionado?.estoqueAtual || 0) + (tipoEntrada === 'caixa' 
                        ? parseFloat(quantidade) * (produtoSelecionado?.unidadesPorCaixa || 1) 
                        : parseFloat(quantidade))}
                    </span> {produtoSelecionado?.unidade || 'un'}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogEntrada(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={registrarEntrada}
                disabled={saving || !quantidade || parseFloat(quantidade) <= 0}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Confirmar Entrada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG SAÍDA DE ESTOQUE */}
        <Dialog open={dialogSaida} onOpenChange={setDialogSaida}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <ArrowDown className="h-5 w-5" />
                Saída de Estoque
              </DialogTitle>
              <DialogDescription>
                Registre a saída de produtos do estoque
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium">{produtoSelecionado?.nome}</p>
                <p className="text-sm text-muted-foreground">
                  Estoque atual: <span className="font-bold">{produtoSelecionado?.estoqueAtual || 0}</span> {produtoSelecionado?.unidade || 'un'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidadeSaida">Quantidade *</Label>
                <Input
                  id="quantidadeSaida"
                  type="number"
                  min="1"
                  max={produtoSelecionado?.estoqueAtual || 0}
                  step="1"
                  placeholder="Ex: 5"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacaoSaida">Motivo / Observação</Label>
                <Textarea
                  id="observacaoSaida"
                  placeholder="Ex: Produto vencido, quebra, etc."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={2}
                />
              </div>

              {quantidade && parseFloat(quantidade) > 0 && (
                <div className={`rounded-lg p-3 border ${parseFloat(quantidade) > (produtoSelecionado?.estoqueAtual || 0) ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                  <p className={`text-sm ${parseFloat(quantidade) > (produtoSelecionado?.estoqueAtual || 0) ? 'text-red-700' : 'text-blue-700'}`}>
                    Novo estoque: <span className="font-bold">{Math.max(0, (produtoSelecionado?.estoqueAtual || 0) - parseFloat(quantidade))}</span> {produtoSelecionado?.unidade || 'un'}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogSaida(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={registrarSaida}
                disabled={saving || !quantidade || parseFloat(quantidade) <= 0 || parseFloat(quantidade) > (produtoSelecionado?.estoqueAtual || 0)}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Confirmar Saída
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG HISTÓRICO */}
        <Dialog open={dialogHistorico} onOpenChange={setDialogHistorico}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                {produtoSelecionado ? `Histórico: ${produtoSelecionado.nome}` : 'Histórico de Movimentações'}
              </DialogTitle>
              <DialogDescription>
                Últimas movimentações de estoque
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto">
              {(produtoSelecionado ? movimentacoesProduto : movimentacoes).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mb-2 opacity-30" />
                  <p>Nenhuma movimentação registrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      {!produtoSelecionado && <TableHead>Produto</TableHead>}
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-center">Anterior</TableHead>
                      <TableHead className="text-center">Novo</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(produtoSelecionado ? movimentacoesProduto : movimentacoes).map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell className="text-sm">
                          {mov.criadoEm?.toLocaleDateString('pt-BR')} {mov.criadoEm?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        {!produtoSelecionado && (
                          <TableCell className="font-medium">{mov.produtoNome}</TableCell>
                        )}
                        <TableCell>
                          {mov.tipo === 'entrada' ? (
                            <Badge className="bg-green-500 text-xs">Entrada</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Saída</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {mov.quantidade}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {mov.estoqueAnterior}
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {mov.estoqueNovo}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                          {mov.observacao || mov.fornecedor || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
