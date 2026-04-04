'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useProdutos, useFornecedores, useCategorias } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  Warehouse,
  Plus,
  Loader2,
  ArrowUp,
  ArrowDown,
  History,
  Search,
  Filter,
  Layers,
  Check,
  X,
  Download,
} from 'lucide-react';
import { exportToPDF } from '@/lib/export-pdf';

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

interface LoteItem {
  produtoId: string;
  produtoNome: string;
  quantidade: string;
  estoqueAtual: number;
  unidade: string;
}

export default function EstoquePage() {
  const { produtos, loading: loadingProdutos, atualizarProduto } = useProdutos();
  const { fornecedores, loading: loadingFornecedores } = useFornecedores();
  const { categorias } = useCategorias();
  const { user, empresaId } = useAuth();
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'baixo' | 'normal'>('todos');
  const [filterCategoria, setFilterCategoria] = useState<string>('todos');
  const [dialogEntrada, setDialogEntrada] = useState(false);
  const [dialogSaida, setDialogSaida] = useState(false);
  const [dialogHistorico, setDialogHistorico] = useState(false);
  const [dialogLote, setDialogLote] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Formulário de entrada
  const [quantidade, setQuantidade] = useState('');
  const [tipoEntrada, setTipoEntrada] = useState<'unidade' | 'caixa'>('unidade');
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState('');
  const [fornecedorOutro, setFornecedorOutro] = useState('');
  const [documentoRef, setDocumentoRef] = useState('');
  const [observacao, setObservacao] = useState('');
  
  // Formulário de lote
  const [loteSearch, setLoteSearch] = useState('');
  const [loteFornecedorSelecionado, setLoteFornecedorSelecionado] = useState('');
  const [loteFornecedorOutro, setLoteFornecedorOutro] = useState('');
  const [loteDocumentoRef, setLoteDocumentoRef] = useState('');
  const [loteObservacao, setLoteObservacao] = useState('');
  const [loteItens, setLoteItens] = useState<LoteItem[]>([]);
  const [selectAllLote, setSelectAllLote] = useState(false);
  
  // Movimentações
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);

  // Fornecedor resolvido (nome do registry ou texto livre)
  const fornecedorResolvido = useMemo(() => {
    if (fornecedorSelecionado === '__outro__') {
      return fornecedorOutro.trim();
    }
    if (fornecedorSelecionado) {
      const f = fornecedores.find(f => f.id === fornecedorSelecionado);
      return f?.nome || fornecedorSelecionado;
    }
    return '';
  }, [fornecedorSelecionado, fornecedorOutro, fornecedores]);

  const loteFornecedorResolvido = useMemo(() => {
    if (loteFornecedorSelecionado === '__outro__') {
      return loteFornecedorOutro.trim();
    }
    if (loteFornecedorSelecionado) {
      const f = fornecedores.find(f => f.id === loteFornecedorSelecionado);
      return f?.nome || loteFornecedorSelecionado;
    }
    return '';
  }, [loteFornecedorSelecionado, loteFornecedorOutro, fornecedores]);

  // Carregar movimentações
  const carregarMovimentacoes = useCallback(() => {
    if (!empresaId) return;
    
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoadingMovimentacoes(true);
    
    // Buscar movimentações
    supabase
      .from('estoque_movimentos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('criado_em', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao carregar movimentações:', error);
          setLoadingMovimentacoes(false);
          return;
        }
        
        const movimentacoes = (data || []).map(item => ({
          id: item.id,
          produtoId: item.produto_id,
          produtoNome: item.produto_nome,
          tipo: item.tipo,
          quantidade: item.quantidade,
          estoqueAnterior: item.estoque_anterior,
          estoqueNovo: item.estoque_novo,
          observacao: item.observacao,
          fornecedor: item.fornecedor,
          documentoRef: item.documento_ref,
          criadoPor: item.criado_por,
          criadoPorNome: item.criado_por_nome,
          criadoEm: item.criado_em ? new Date(item.criado_em) : undefined,
        })) as MovimentacaoEstoque[];
        
        setMovimentacoes(movimentacoes);
        setLoadingMovimentacoes(false);
      });
  }, [empresaId]);

  useEffect(() => {
    carregarMovimentacoes();
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
    
    const matchCategoria = filterCategoria === 'todos' || produto.categoriaId === filterCategoria;
    
    return matchSearch && matchStatus && matchCategoria;
  });

  const produtosBaixoEstoque = produtos.filter(p => (p.estoqueAtual || 0) <= (p.estoqueMinimo || 0));

  // ===== LOTE: Produtos filtrados para o dialog de lote =====
  const loteProdutosFiltrados = useMemo(() => {
    if (!loteSearch.trim()) return produtos;
    const q = loteSearch.toLowerCase();
    return produtos.filter(p =>
      p.nome.toLowerCase().includes(q) ||
      (p.codigo && p.codigo.toLowerCase().includes(q)) ||
      (p.codigoBarras && p.codigoBarras.includes(q))
    );
  }, [produtos, loteSearch]);

  const loteItensMap = useMemo(() => {
    const map: Record<string, LoteItem> = {};
    loteItens.forEach(item => { map[item.produtoId] = item; });
    return map;
  }, [loteItens]);

  // Abrir dialog de entrada
  const handleEntrada = (produto: any) => {
    setProdutoSelecionado(produto);
    setQuantidade('');
    setTipoEntrada('unidade');
    setFornecedorSelecionado('');
    setFornecedorOutro('');
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

  // Abrir dialog de lote
  const handleAbrirLote = () => {
    setLoteSearch('');
    setLoteFornecedorSelecionado('');
    setLoteFornecedorOutro('');
    setLoteDocumentoRef('');
    setLoteObservacao('');
    setLoteItens([]);
    setSelectAllLote(false);
    setDialogLote(true);
  };

  // Toggle de seleção de produto no lote
  const toggleLoteProduto = (produto: any, checked: boolean) => {
    if (checked) {
      if (!loteItensMap[produto.id]) {
        setLoteItens(prev => [...prev, {
          produtoId: produto.id,
          produtoNome: produto.nome,
          quantidade: '',
          estoqueAtual: produto.estoqueAtual || 0,
          unidade: produto.unidade || 'un',
        }]);
      }
    } else {
      setLoteItens(prev => prev.filter(i => i.produtoId !== produto.id));
    }
  };

  // Atualizar quantidade de item no lote
  const updateLoteQuantidade = (produtoId: string, qtd: string) => {
    setLoteItens(prev => prev.map(item =>
      item.produtoId === produtoId ? { ...item, quantidade: qtd } : item
    ));
  };

  // Selecionar todos no lote
  const handleSelectAllLote = (checked: boolean) => {
    setSelectAllLote(checked);
    if (checked) {
      const novosItens: LoteItem[] = [];
      loteProdutosFiltrados.forEach(p => {
        if (!loteItensMap[p.id]) {
          novosItens.push({
            produtoId: p.id,
            produtoNome: p.nome,
            quantidade: '',
            estoqueAtual: p.estoqueAtual || 0,
            unidade: p.unidade || 'un',
          });
        }
      });
      setLoteItens(prev => [...prev, ...novosItens]);
    } else {
      setLoteItens([]);
    }
  };

  // Remover item do lote
  const removeLoteItem = (produtoId: string) => {
    setLoteItens(prev => prev.filter(i => i.produtoId !== produtoId));
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
    const supabase = getSupabaseClient();
    if (!supabase || !empresaId) return;

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
      const { error } = await supabase
        .from('estoque_movimentos')
        .insert({
          empresa_id: empresaId,
          produto_id: produtoSelecionado.id,
          produto_nome: produtoSelecionado.nome,
          tipo: 'entrada',
          quantidade: qtd,
          quantidade_informada: qtdInformada,
          tipo_entrada: tipoEntrada,
          unidades_por_caixa: tipoEntrada === 'caixa' ? unidadesPorCaixa : null,
          estoque_anterior: estoqueAnterior,
          estoque_novo: estoqueNovo,
          fornecedor: fornecedorResolvido || null,
          documento_ref: documentoRef || null,
          observacao: observacao || null,
          criado_por: user?.id,
          criado_por_nome: user?.nome,
          criado_em: new Date().toISOString(),
        });
      
      if (error) throw error;

      const mensagem = tipoEntrada === 'caixa' 
        ? `✓ Entrada de ${qtdInformada} caixas (${qtd} unidades) registrada`
        : `✓ Entrada de ${qtd} unidades registrada`;
      toast({ title: mensagem });
      setDialogEntrada(false);
      setProdutoSelecionado(null);
      carregarMovimentacoes(); // Recarregar movimentações
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      toast({ variant: 'destructive', title: 'Erro ao registrar entrada' });
    } finally {
      setSaving(false);
    }
  };

  // Registrar entrada em lote
  const registrarEntradaLote = async () => {
    // Validar: pelo menos um item com quantidade
    const itensValidos = loteItens.filter(i => i.quantidade && parseFloat(i.quantidade) > 0);
    if (itensValidos.length === 0) {
      toast({ variant: 'destructive', title: 'Selecione ao menos um produto com quantidade' });
      return;
    }

    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase || !empresaId) return;

    try {
      const movimentos = itensValidos.map(item => {
        const qtd = parseFloat(item.quantidade);
        const estoqueAnterior = item.estoqueAtual;
        const estoqueNovo = estoqueAnterior + qtd;
        return {
          empresa_id: empresaId,
          produto_id: item.produtoId,
          produto_nome: item.produtoNome,
          tipo: 'entrada',
          quantidade: qtd,
          quantidade_informada: qtd,
          tipo_entrada: 'unidade',
          unidades_por_caixa: null,
          estoque_anterior: estoqueAnterior,
          estoque_novo: estoqueNovo,
          fornecedor: loteFornecedorResolvido || null,
          documento_ref: loteDocumentoRef || null,
          observacao: loteObservacao || null,
          criado_por: user?.id,
          criado_por_nome: user?.nome,
          criado_em: new Date().toISOString(),
        };
      });

      // Inserir todas as movimentações
      const { error } = await supabase
        .from('estoque_movimentos')
        .insert(movimentos);

      if (error) throw error;

      // Atualizar estoque de cada produto
      for (const item of itensValidos) {
        const qtd = parseFloat(item.quantidade);
        const estoqueNovo = item.estoqueAtual + qtd;
        await atualizarProduto(item.produtoId, { estoqueAtual: estoqueNovo });
      }

      toast({ title: `✓ Entrada em lote: ${itensValidos.length} produto(s) registrados` });
      setDialogLote(false);
      carregarMovimentacoes();
    } catch (error) {
      console.error('Erro ao registrar entrada em lote:', error);
      toast({ variant: 'destructive', title: 'Erro ao registrar entrada em lote' });
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
    const supabase = getSupabaseClient();
    if (!supabase || !empresaId) return;

    try {
      const estoqueAnterior = estoqueAtual;
      const estoqueNovo = estoqueAnterior - qtd;

      // Atualizar produto
      await atualizarProduto(produtoSelecionado.id, {
        estoqueAtual: estoqueNovo,
      });

      // Registrar movimentação
      const { error } = await supabase
        .from('estoque_movimentos')
        .insert({
          empresa_id: empresaId,
          produto_id: produtoSelecionado.id,
          produto_nome: produtoSelecionado.nome,
          tipo: 'saida',
          quantidade: qtd,
          estoque_anterior: estoqueAnterior,
          estoque_novo: estoqueNovo,
          observacao: observacao || null,
          criado_por: user?.id,
          criado_por_nome: user?.nome,
          criado_em: new Date().toISOString(),
        });
      
      if (error) throw error;

      toast({ title: `✓ Saída de ${qtd} unidades registrada` });
      setDialogSaida(false);
      setProdutoSelecionado(null);
      carregarMovimentacoes(); // Recarregar movimentações
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

  // Exportar PDF
  const handleExportPDF = () => {
    const totalItens = produtosFiltrados.length;
    const itensAbaixoMinimo = produtosFiltrados.filter(
      (p) => (p.estoqueAtual || 0) <= (p.estoqueMinimo || 0)
    ).length;

    exportToPDF({
      title: 'Relatório de Estoque',
      subtitle: filterStatus !== 'todos' || filterCategoria !== 'todos'
        ? `Filtros: Status ${filterStatus} | Categoria ${filterCategoria}`
        : undefined,
      columns: [
        { header: 'Produto', accessor: (row: any) => row.nome || '-', width: 60 },
        { header: 'Código', accessor: (row: any) => row.codigo || row.codigoBarras || '-', width: 30 },
        { header: 'Unidade', accessor: (row: any) => row.unidade || 'un', width: 20 },
        { header: 'Estoque Atual', accessor: (row: any) => row.estoqueAtual || 0, width: 25, totalize: true },
        { header: 'Estoque Mínimo', accessor: (row: any) => row.estoqueMinimo || 0, width: 25 },
        {
          header: 'Status',
          accessor: (row: any) =>
            (row.estoqueAtual || 0) <= (row.estoqueMinimo || 0) ? 'BAIXO' : 'Normal',
          width: 20,
        },
      ],
      data: produtosFiltrados,
      filename: `relatorio-estoque-${new Date().toISOString().slice(0, 10)}`,
      orientation: 'landscape',
      totals: {
        label: 'TOTAL GERAL',
      },
      summary: [
        { label: 'Total de Produtos', value: totalItens },
        { label: 'Itens Abaixo do Mínimo', value: itensAbaixoMinimo },
      ],
    });
  };

  if (loadingProdutos || loadingFornecedores) {
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

  // Helper: renderizar select de fornecedor (reutilizável)
  const renderFornecedorSelect = (
    value: string,
    onChange: (val: string) => void,
    outroValue: string,
    onOutroChange: (val: string) => void,
  ) => (
    <div className="space-y-2">
      <Label htmlFor="fornecedor">Fornecedor</Label>
      {fornecedores.length > 0 ? (
        <>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id="fornecedor">
              <SelectValue placeholder="Selecione o fornecedor (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {fornecedores.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  <div className="flex items-center gap-2">
                    <span>{f.nome}</span>
                    {f.cnpj && (
                      <span className="text-xs text-muted-foreground">
                        ({f.cnpj})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="__outro__">
                <span className="italic text-muted-foreground">Outro...</span>
              </SelectItem>
            </SelectContent>
          </Select>
          {value === '__outro__' && (
            <Input
              placeholder="Digite o nome do fornecedor"
              value={outroValue}
              onChange={(e) => onOutroChange(e.target.value)}
              className="mt-1"
            />
          )}
        </>
      ) : (
        <div className="space-y-2">
          <Input
            id="fornecedor"
            placeholder="Nome do fornecedor (opcional)"
            value={outroValue}
            onChange={(e) => onOutroChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Nenhum fornecedor cadastrado.{' '}
            <a href="/admin/fornecedores" className="text-blue-600 hover:underline">
              Cadastrar fornecedores
            </a>
          </p>
        </div>
      )}
    </div>
  );

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
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline"
                onClick={handleAbrirLote}
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Entrada em Lote
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { setProdutoSelecionado(null); setDialogHistorico(true); }}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                Histórico Geral
              </Button>
              <Button 
                variant="outline"
                onClick={handleExportPDF}
                className="gap-2"
                disabled={produtosFiltrados.length === 0}
              >
                <Download className="h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
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
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Todas as Categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as Categorias</SelectItem>
                    {categorias.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.cor || '#6B7280' }}
                          />
                          <span>{cat.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
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
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700" asChild>
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
                              className="h-8 px-2 text-blue-600 hover:bg-blue-50"
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

              {renderFornecedorSelect(
                fornecedorSelecionado,
                setFornecedorSelecionado,
                fornecedorOutro,
                setFornecedorOutro,
              )}

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
                className="bg-blue-600 hover:bg-blue-700"
                onClick={registrarEntrada}
                disabled={saving || !quantidade || parseFloat(quantidade) <= 0}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Confirmar Entrada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG ENTRADA EM LOTE */}
        <Dialog open={dialogLote} onOpenChange={(open) => {
          setDialogLote(open);
          if (!open) {
            setLoteItens([]);
            setSelectAllLote(false);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Layers className="h-5 w-5" />
                Entrada em Lote
              </DialogTitle>
              <DialogDescription>
                Selecione múltiplos produtos e registre a entrada de estoque de uma vez
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden flex flex-col gap-4 py-2">
              {/* Campos compartilhados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderFornecedorSelect(
                  loteFornecedorSelecionado,
                  setLoteFornecedorSelecionado,
                  loteFornecedorOutro,
                  setLoteFornecedorOutro,
                )}
                <div className="space-y-2">
                  <Label htmlFor="loteDocumento">Documento / Nota Fiscal</Label>
                  <Input
                    id="loteDocumento"
                    placeholder="Ex: NF 12345 (opcional)"
                    value={loteDocumentoRef}
                    onChange={(e) => setLoteDocumentoRef(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loteObservacao">Observação (aplicada a todos)</Label>
                <Textarea
                  id="loteObservacao"
                  placeholder="Observação opcional..."
                  value={loteObservacao}
                  onChange={(e) => setLoteObservacao(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Busca e Selecionar Todos */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={loteSearch}
                    onChange={(e) => setLoteSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm shrink-0">
                  <Checkbox
                    id="selectAllLote"
                    checked={selectAllLote}
                    onCheckedChange={handleSelectAllLote}
                  />
                  <Label htmlFor="selectAllLote" className="cursor-pointer whitespace-nowrap">
                    {loteItens.length > 0 
                      ? `${loteItens.length} selecionado(s)` 
                      : 'Selecionar todos'}
                  </Label>
                </div>
              </div>

              {/* Lista de produtos selecionados com quantidades */}
              {loteItens.length > 0 && (
                <div className="border rounded-lg">
                  <div className="bg-muted/50 px-3 py-2 border-b">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Produtos selecionados ({loteItens.length})
                    </p>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <Table>
                      <TableBody>
                        {loteItens.map(item => (
                          <TableRow key={item.produtoId}>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium text-sm">{item.produtoNome}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground py-2 w-24 text-center">
                              Atual: {item.estoqueAtual}
                            </TableCell>
                            <TableCell className="py-2 w-32">
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="Qtd *"
                                value={item.quantidade}
                                onChange={(e) => updateLoteQuantidade(item.produtoId, e.target.value)}
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell className="py-2 w-10">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={() => removeLoteItem(item.produtoId)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Tabela de produtos disponíveis */}
              <div className="border rounded-lg flex-1 min-h-0">
                <ScrollArea className="h-[250px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Estoque</TableHead>
                        <TableHead className="w-32">Quantidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loteProdutosFiltrados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Nenhum produto encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        loteProdutosFiltrados.map(produto => {
                          const isChecked = !!loteItensMap[produto.id];
                          return (
                            <TableRow key={produto.id} className={isChecked ? 'bg-green-50' : ''}>
                              <TableCell>
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => toggleLoteProduto(produto, !!checked)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="font-medium text-sm">{produto.nome}</span>
                                  {produto.codigo && (
                                    <span className="text-xs text-muted-foreground">
                                      ({produto.codigo})
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {produto.estoqueAtual || 0} {produto.unidade || 'un'}
                              </TableCell>
                              <TableCell>
                                {isChecked && (
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="Qtd *"
                                    value={loteItensMap[produto.id]?.quantidade || ''}
                                    onChange={(e) => updateLoteQuantidade(produto.id, e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogLote(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={registrarEntradaLote}
                disabled={saving || loteItens.filter(i => i.quantidade && parseFloat(i.quantidade) > 0).length === 0}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Layers className="h-4 w-4 mr-2" />}
                Confirmar Lote ({loteItens.filter(i => i.quantidade && parseFloat(i.quantidade) > 0).length} produto(s))
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
                      <TableHead>Detalhes</TableHead>
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
                        <TableCell className="text-sm max-w-[200px]">
                          <div className="space-y-0.5">
                            {mov.fornecedor && (
                              <p className="text-xs">
                                <span className="text-muted-foreground">Fornecedor: </span>
                                <span className="font-medium">{mov.fornecedor}</span>
                              </p>
                            )}
                            {mov.documentoRef && (
                              <p className="text-xs">
                                <span className="text-muted-foreground">Doc: </span>
                                <span className="font-medium">{mov.documentoRef}</span>
                              </p>
                            )}
                            {mov.observacao && (
                              <p className="text-xs text-muted-foreground truncate">{mov.observacao}</p>
                            )}
                            {!mov.fornecedor && !mov.documentoRef && !mov.observacao && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
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
