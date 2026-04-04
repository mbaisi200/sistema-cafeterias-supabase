'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutos, useCategorias, useCaixa, registrarLog } from '@/hooks/useFirestore';
import { CupomFiscalModal, imprimirCupomFiscal, DadosCupomFiscal } from '@/components/pdv/CupomFiscal';
import { BuscaCliente, ClienteEncontrado } from '@/components/pdv/BuscaCliente';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  QrCode,
  Tag,
  Percent,
  User,
  Loader2,
  Printer,
  CheckCircle,
  Barcode,
  Store,
  ChevronDown,
  X,
  Package,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ItemCarrinho {
  id: string;
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  codigo: string;
  codigoBarras: string;
  unidade: string;
  descontoPercentual: number;
}

interface PagamentoItem {
  forma: string;
  valor: number;
}

const FORMAS_PAGAMENTO = [
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { id: 'debito', label: 'Débito', icon: CreditCard },
  { id: 'credito', label: 'Crédito', icon: CreditCard },
  { id: 'pix', label: 'PIX', icon: QrCode },
];

const CORES_CATEGORIAS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

// Função segura para formatar valores monetários
const fmt = (val: number | undefined | null) => (val || 0).toFixed(2);

export default function PDVVarejoPage() {
  const { user, empresaId, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { categorias, loading: loadingCategorias } = useCategorias();
  const { caixaAberto, abrirCaixa, fecharCaixa } = useCaixa();

  // Estados do carrinho
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [itensCarrinho, setItensCarrinho] = useState<ItemCarrinho[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteEncontrado | null>(null);

  // Diálogos
  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [dialogCupomFiscal, setDialogCupomFiscal] = useState(false);
  const [dialogDesconto, setDialogDesconto] = useState<string | null>(null); // itemId or 'total'
  const [dialogAberturaCaixa, setDialogAberturaCaixa] = useState(false);
  const [processando, setProcessando] = useState(false);

  // Pagamento
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<string>('');
  const [pagamentos, setPagamentos] = useState<PagamentoItem[]>([]);
  const [valorPagamentoAtual, setValorPagamentoAtual] = useState('');

  // Desconto
  const [valorDescontoInput, setValorDescontoInput] = useState('');
  const [descontoTotalPercentual, setDescontoTotalPercentual] = useState(0);

  // Caixa
  const [valorAberturaCaixa, setValorAberturaCaixa] = useState('');
  const [abrindoCaixa, setAbrindoCaixa] = useState(false);

  // Empresa para cupom
  const [empresa, setEmpresa] = useState<{
    nome: string;
    cnpj: string;
    endereco: string;
    bairro: string;
    cidade: string;
    estado: string;
    telefone: string;
  } | null>(null);

  // Troco
  const [valorRecebido, setValorRecebido] = useState('');

  // Mobile
  const [isMobile, setIsMobile] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);

  // Ref para foco automático no input de busca
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados da empresa
  useEffect(() => {
    const carregarEmpresa = async () => {
      if (!empresaId) return;
      const supabase = getSupabaseClient();
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('nome, cnpj, telefone, logradouro, numero, complemento, bairro, cidade, estado')
          .eq('id', empresaId)
          .single();
        if (!error && data) {
          const partesLogradouro = [data.logradouro, data.numero, data.complemento].filter(Boolean);
          setEmpresa({
            nome: data.nome || 'Sistema PDV',
            cnpj: data.cnpj || '',
            endereco: partesLogradouro.join(', '),
            bairro: data.bairro || '',
            cidade: data.cidade || '',
            estado: data.estado || '',
            telefone: data.telefone || '',
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
      }
    };
    carregarEmpresa();
  }, [empresaId]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loading = loadingProdutos || loadingCategorias;

  // Produtos filtrados
  const produtosFiltrados = useMemo(() => {
    let lista = produtos || [];
    if (categoriaAtiva !== 'todos') {
      lista = lista.filter(p => p.categoriaId === categoriaAtiva);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      lista = lista.filter(p =>
        p.nome.toLowerCase().includes(searchLower) ||
        (p.codigoBarras && p.codigoBarras.includes(search)) ||
        (p.codigo && p.codigo.toLowerCase().includes(searchLower))
      );
    }
    return lista;
  }, [produtos, categoriaAtiva, search]);

  // Busca por código de barras — adiciona automaticamente
  useEffect(() => {
    if (!search || search.length < 8) return;
    const isCodigoBarras = /^[0-9]{8,}$/.test(search);
    if (isCodigoBarras) {
      const produtoEncontrado = (produtos || []).find(p => p.codigoBarras === search);
      if (produtoEncontrado) {
        adicionarProduto(produtoEncontrado);
        setSearch('');
        searchInputRef.current?.focus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, produtos]);

  // Cor da categoria
  const getCorCategoria = (categoriaId: string) => {
    const idx = (categorias || []).findIndex(c => c.id === categoriaId);
    return CORES_CATEGORIAS[idx % CORES_CATEGORIAS.length];
  };

  // Subtotal sem desconto
  const subtotal = itensCarrinho.reduce((acc, item) => acc + ((item.preco || 0) * (item.quantidade || 0)), 0);

  // Total do desconto por item
  const totalDescontoItens = itensCarrinho.reduce((acc, item) => {
    const descontoItem = ((item.preco || 0) * (item.quantidade || 0)) * ((item.descontoPercentual || 0) / 100);
    return acc + descontoItem;
  }, 0);

  // Total com desconto total + descontos por item
  const totalDescontoGeral = subtotal * (descontoTotalPercentual / 100);
  const totalFinal = subtotal - totalDescontoItens - totalDescontoGeral;

  // Total pago
  const totalPago = pagamentos.reduce((acc, pg) => acc + (pg.valor || 0), 0);

  // Troco (para pagamento em dinheiro)
  const troco = Math.max(0, totalPago - totalFinal);

  // === Funções do carrinho ===

  const adicionarProduto = (produto: any) => {
    if (!produto.preco || produto.preco <= 0) {
      toast({ variant: 'destructive', title: 'Produto sem preço definido' });
      return;
    }

    const existente = itensCarrinho.find(item => item.produtoId === produto.id);
    if (existente) {
      setItensCarrinho(itensCarrinho.map(item =>
        item.id === existente.id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ));
    } else {
      setItensCarrinho([...itensCarrinho, {
        id: Date.now().toString(),
        produtoId: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        quantidade: 1,
        codigo: produto.codigo || '',
        codigoBarras: produto.codigoBarras || '',
        unidade: produto.unidade || 'UN',
        descontoPercentual: 0,
      }]);
    }
    toast({ title: `${produto.nome} adicionado` });
  };

  const alterarQtd = (itemId: string, delta: number) => {
    setItensCarrinho(prev => {
      return prev.map(item => {
        if (item.id !== itemId) return item;
        const novaQtd = item.quantidade + delta;
        if (novaQtd <= 0) return item;
        return { ...item, quantidade: novaQtd };
      });
    });
  };

  const setQtd = (itemId: string, novaQtd: number) => {
    if (novaQtd <= 0) {
      removerItem(itemId);
      return;
    }
    setItensCarrinho(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantidade: novaQtd } : item
      )
    );
  };

  const removerItem = (itemId: string) => {
    setItensCarrinho(prev => prev.filter(item => item.id !== itemId));
  };

  const limparCarrinho = () => {
    setItensCarrinho([]);
    setClienteSelecionado(null);
    setDescontoTotalPercentual(0);
  };

  // === Desconto ===

  const aplicarDescontoItem = (itemId: string) => {
    const valor = parseFloat(valorDescontoInput) || 0;
    if (valor < 0 || valor > 100) {
      toast({ variant: 'destructive', title: 'Desconto deve ser entre 0% e 100%' });
      return;
    }
    setItensCarrinho(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, descontoPercentual: valor } : item
      )
    );
    setDialogDesconto(null);
    setValorDescontoInput('');
  };

  const aplicarDescontoTotal = () => {
    const valor = parseFloat(valorDescontoInput) || 0;
    if (valor < 0 || valor > 100) {
      toast({ variant: 'destructive', title: 'Desconto deve ser entre 0% e 100%' });
      return;
    }
    setDescontoTotalPercentual(valor);
    setDialogDesconto(null);
    setValorDescontoInput('');
  };

  // === Pagamento ===

  const adicionarPagamento = (forma: string) => {
    const valor = parseFloat(valorPagamentoAtual) || 0;
    if (valor <= 0) {
      toast({ variant: 'destructive', title: 'Informe o valor do pagamento' });
      return;
    }
    if (totalPago + valor > totalFinal + 0.01) {
      toast({ variant: 'destructive', title: 'Valor excede o total da venda' });
      return;
    }
    setPagamentos([...pagamentos, { forma, valor }]);
    setValorPagamentoAtual('');
  };

  const removerPagamento = (index: number) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (dialogPagamento) {
      const restante = totalFinal - totalPago;
      setValorPagamentoAtual(restante > 0 ? fmt(restante) : '');
      if (totalPago === 0) {
        setPagamentos([]);
        setValorRecebido('');
      }
    }
  }, [dialogPagamento]);

  const handleFinalizarComPagamentos = () => {
    if (totalPago < totalFinal) {
      toast({ variant: 'destructive', title: 'Pagamento incompleto' });
      return;
    }
    setFormaPagamentoSelecionada(pagamentos[0]?.forma || 'dinheiro');
    setDialogPagamento(false);
    setDialogCupomFiscal(true);
  };

  const abrirCupomFiscal = (formaPagamento: string) => {
    setFormaPagamentoSelecionada(formaPagamento);
    setDialogPagamento(false);
    setDialogCupomFiscal(true);
  };

  // === Finalizar venda ===

  const finalizarVenda = async (dadosCupom: DadosCupomFiscal, formaPagamento: string) => {
    if (itensCarrinho.length === 0) {
      toast({ variant: 'destructive', title: 'Adicione itens ao carrinho' });
      return;
    }

    setProcessando(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase não inicializado');

      // Criar venda
      const { data: vendaData, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          empresa_id: empresaId,
          tipo: 'balcao',
          canal: 'varejo',
          status: 'fechada',
          total: totalFinal,
          desconto: totalDescontoItens + totalDescontoGeral,
          forma_pagamento: formaPagamento,
          cliente_id: clienteSelecionado?.id || null,
          nome_cliente: dadosCupom.nomeCliente || clienteSelecionado?.nome_razao_social || null,
          cpf_cliente: dadosCupom.cpfCliente || clienteSelecionado?.cnpj_cpf || null,
          telefone_cliente: clienteSelecionado?.telefone || null,
          criado_por: user?.id,
          criado_por_nome: user?.nome,
          criado_em: new Date().toISOString(),
          fechado_em: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (vendaError) throw vendaError;
      const vendaId = vendaData.id;

      // Criar itens de venda
      const itensVenda = itensCarrinho.map(item => ({
        empresa_id: empresaId,
        venda_id: vendaId,
        produto_id: item.produtoId,
        nome: item.nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco,
        desconto: item.descontoPercentual,
        total: (item.preco * item.quantidade) * (1 - item.descontoPercentual / 100),
      }));

      const { error: itensError } = await supabase
        .from('itens_venda')
        .insert(itensVenda);

      if (itensError) console.error('Erro ao criar itens:', itensError);

      // Baixar estoque
      for (const item of itensCarrinho) {
        try {
          await supabase.rpc('decrementar_estoque_produto', {
            p_produto_id: item.produtoId,
            p_quantidade: item.quantidade,
          }).catch(async () => {
            const { data: prod } = await supabase
              .from('produtos')
              .select('estoque_atual')
              .eq('id', item.produtoId)
              .single();
            if (prod) {
              await supabase
                .from('produtos')
                .update({ estoque_atual: Math.max(0, parseFloat(prod.estoque_atual) - item.quantidade) })
                .eq('id', item.produtoId);
            }
          });
        } catch (err) {
          console.error('Erro ao baixar estoque:', err);
        }
      }

      // Criar pagamentos
      const pagamentosParaSalvar = pagamentos.length > 0 ? pagamentos : [{ forma: formaPagamento, valor: totalFinal }];
      const pagamentosInsert = pagamentosParaSalvar.map(pg => ({
        empresa_id: empresaId,
        venda_id: vendaId,
        forma_pagamento: pg.forma,
        valor: pg.valor,
      }));

      const { error: pagError } = await supabase
        .from('pagamentos')
        .insert(pagamentosInsert);

      if (pagError) console.error('Erro ao criar pagamentos:', pagError);

      // Registrar no caixa
      if (caixaAberto) {
        const { error: movError } = await supabase
          .from('movimentacoes_caixa')
          .insert({
            caixa_id: caixaAberto.id,
            empresa_id: empresaId,
            tipo: 'venda',
            valor: totalFinal,
            forma_pagamento: formaPagamento,
            venda_id: vendaId,
            descricao: `Venda Varejo - ${itensCarrinho.length} itens`,
            usuario_id: user?.id,
            usuario_nome: user?.nome,
            criado_em: new Date().toISOString(),
          });

        if (movError) console.error('Erro ao registrar movimentação:', movError);

        const { error: caixaError } = await supabase
          .from('caixas')
          .update({
            valor_atual: (caixaAberto.valor_atual || 0) + totalFinal,
            total_vendas: (caixaAberto.total_vendas || 0) + totalFinal,
            total_entradas: (caixaAberto.total_entradas || 0) + totalFinal,
          })
          .eq('id', caixaAberto.id);

        if (caixaError) console.error('Erro ao atualizar caixa:', caixaError);
      }

      // Log
      await registrarLog({
        empresaId: empresaId || '',
        usuarioId: user?.id || '',
        usuarioNome: user?.nome || '',
        acao: 'VENDA_VAREJO_FINALIZADA',
        detalhes: `Venda varejo de ${itensCarrinho.length} itens - R$ ${fmt(totalFinal)}${dadosCupom.cpfCliente ? ` - CPF: ${dadosCupom.cpfCliente}` : ''}`,
        tipo: 'venda',
      });

      // Imprimir cupom fiscal
      if (dadosCupom.imprimirCupom) {
        imprimirCupomFiscal({
          nomeEmpresa: empresa?.nome || 'PDV Varejo',
          cnpjEmpresa: empresa?.cnpj || '',
          enderecoEmpresa: empresa?.endereco || '',
          cpfCliente: dadosCupom.cpfCliente,
          nomeCliente: dadosCupom.nomeCliente,
          itens: itensCarrinho.map(item => ({
            nome: item.nome,
            quantidade: item.quantidade,
            preco: item.preco,
            codigo: item.codigo || item.codigoBarras || '',
            unidade: item.unidade || 'UN',
          })),
          total: totalFinal,
          formaPagamento,
          tamanhoCupom: dadosCupom.tamanhoCupom,
          codigoVenda: vendaId.slice(-8).toUpperCase(),
          configuracoes: dadosCupom.configuracoes,
          cliente: clienteSelecionado || undefined,
          bairroEmpresa: empresa?.bairro || '',
          cidadeEmpresa: empresa?.cidade || '',
          ufEmpresa: empresa?.estado || '',
          vendedor: user?.nome || 'OPERADOR',
        });
      }

      toast({ title: 'Venda finalizada com sucesso!' });
      setDialogCupomFiscal(false);
      setDialogPagamento(false);
      setItensCarrinho([]);
      setClienteSelecionado(null);
      setDescontoTotalPercentual(0);
      setPagamentos([]);
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      toast({ variant: 'destructive', title: 'Erro ao finalizar venda' });
    } finally {
      setProcessando(false);
    }
  };

  // Caixa
  const handleAbrirCaixa = async () => {
    const valor = parseFloat(valorAberturaCaixa) || 0;
    if (valor < 0) {
      toast({ variant: 'destructive', title: 'Informe um valor válido' });
      return;
    }
    setAbrindoCaixa(true);
    try {
      await abrirCaixa(valor, '');
      toast({ title: 'Caixa aberto com sucesso!' });
      setDialogAberturaCaixa(false);
      setValorAberturaCaixa('');
    } catch (error: any) {
      console.error('Erro ao abrir caixa:', error);
      toast({ variant: 'destructive', title: 'Erro ao abrir caixa', description: error?.message || 'Erro desconhecido' });
    } finally {
      setAbrindoCaixa(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
      <div className="h-screen flex flex-col bg-gray-50">

        {/* HEADER */}
        <header className="bg-white border-b border-blue-100 px-3 py-2 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm leading-tight">PDV Varejo</p>
              <p className="text-[10px] text-gray-500 leading-tight">Ponto de Venda — Varejo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${caixaAberto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} shadow-sm`}>
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{caixaAberto ? 'Caixa Aberto' : 'Caixa Fechado'}</span>
            </div>

            {!caixaAberto ? (
              <Button
                size="sm"
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                onClick={() => setDialogAberturaCaixa(true)}
              >
                Abrir Caixa
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
                onClick={() => fecharCaixa(caixaAberto.valor_atual || 0)}
              >
                Fechar Caixa
              </Button>
            )}

            {/* Botão carrinho mobile */}
            {isMobile && (
              <Button
                variant="outline"
                size="sm"
                className="relative h-7"
                onClick={() => setShowCartMobile(true)}
              >
                <ShoppingCart className="h-4 w-4" />
                {itensCarrinho.length > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-blue-600 text-white">
                    {itensCarrinho.length}
                  </Badge>
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-gray-500 hover:text-red-600"
              onClick={handleLogout}
            >
              Sair
            </Button>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT: Produtos */}
          <div className={`${isMobile && showCartMobile ? 'hidden' : 'flex'} flex-1 flex-col min-w-0`}>

            {/* Busca + Cliente */}
            <div className="p-3 bg-white border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar produto por nome, código ou código de barras..."
                  className="pl-9 pr-10 h-10 text-sm bg-gray-50 border-gray-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
                {search && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
              <BuscaCliente
                onSelect={setClienteSelecionado}
                selected={clienteSelecionado}
                placeholder="Buscar cliente por nome ou CPF/CNPJ (opcional)"
                label=""
                showActions={true}
              />
            </div>

            {/* Categorias */}
            <div className="px-3 py-2 bg-white border-b border-gray-100">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setCategoriaAtiva('todos')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    categoriaAtiva === 'todos'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                {(categorias || []).map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaAtiva(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                      categoriaAtiva === cat.id
                        ? 'text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={categoriaAtiva === cat.id ? { backgroundColor: getCorCategoria(cat.id) } : {}}
                  >
                    {cat.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Produtos */}
            <ScrollArea className="flex-1">
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {produtosFiltrados.map((produto: any) => {
                  const estoque = parseFloat(produto.estoque_atual) || 0;
                  const semEstoque = produto.controlar_estoque && estoque <= 0;
                  return (
                    <button
                      key={produto.id}
                      disabled={semEstoque}
                      onClick={() => adicionarProduto(produto)}
                      className={`relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all hover:shadow-md active:scale-[0.97] ${
                        semEstoque
                          ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                          : 'bg-white border-gray-100 hover:border-blue-300 cursor-pointer'
                      }`}
                    >
                      {semEstoque && (
                        <Badge className="absolute top-1.5 right-1.5 text-[9px] bg-red-100 text-red-600 px-1.5 py-0">
                          Esgotado
                        </Badge>
                      )}
                      {produto.categoriaId && (
                        <div
                          className="w-full h-1 rounded-full mb-2"
                          style={{ backgroundColor: getCorCategoria(produto.categoriaId) }}
                        />
                      )}
                      <span className="text-xs font-medium text-gray-700 line-clamp-2 leading-tight min-h-[2rem]">
                        {produto.nome}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <Barcode className="h-3 w-3 text-gray-400" />
                        <span className="text-[10px] text-gray-400 truncate max-w-[100px]">
                          {produto.codigoBarras || produto.codigo || '—'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-blue-600 mt-auto pt-1">
                        R$ {fmt(produto.preco)}
                      </span>
                    </button>
                  );
                })}
                {produtosFiltrados.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
                    <Package className="h-12 w-12 mb-2" />
                    <p className="text-sm">Nenhum produto encontrado</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: Carrinho */}
          <div className={`${isMobile ? (showCartMobile ? 'flex' : 'hidden') : 'flex'} w-full lg:w-[400px] xl:w-[420px] flex-col bg-white border-l border-gray-200 shrink-0`}>
            {/* Header do carrinho */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-blue-50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-gray-800 text-sm">Carrinho</h2>
                <Badge variant="secondary" className="text-xs">
                  {itensCarrinho.length} {itensCarrinho.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {itensCarrinho.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={limparCarrinho}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Limpar
                  </Button>
                )}
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => setShowCartMobile(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Lista de itens */}
            <ScrollArea className="flex-1">
              {itensCarrinho.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
                  <ShoppingCart className="h-16 w-16 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Carrinho vazio</p>
                  <p className="text-xs mt-1">Escanee ou busque um produto</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {itensCarrinho.map(item => {
                    const itemTotal = ((item.preco || 0) * (item.quantidade || 0)) * (1 - (item.descontoPercentual || 0) / 100);
                    return (
                      <div key={item.id} className="px-4 py-2.5 group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.nome}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500">
                                R$ {fmt(item.preco)} x {item.unidade}
                              </span>
                              {item.descontoPercentual > 0 && (
                                <Badge className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0">
                                  -{item.descontoPercentual}%
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-gray-800">
                              R$ {fmt(itemTotal)}
                            </p>
                            {item.descontoPercentual > 0 && (
                              <p className="text-[10px] text-gray-400 line-through">
                                R$ {fmt((item.preco || 0) * (item.quantidade || 0))}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                              onClick={() => alterarQtd(item.id, -1)}
                            >
                              <Minus className="h-3.5 w-3.5 text-gray-600" />
                            </button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) => setQtd(item.id, parseInt(e.target.value) || 1)}
                              className="h-7 w-14 text-center text-sm font-semibold"
                            />
                            <button
                              className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                              onClick={() => alterarQtd(item.id, 1)}
                            >
                              <Plus className="h-3.5 w-3.5 text-blue-600" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="h-7 w-7 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center transition-colors"
                              onClick={() => { setDialogDesconto(item.id); setValorDescontoInput(item.descontoPercentual.toString()); }}
                              title="Desconto"
                            >
                              <Percent className="h-3.5 w-3.5 text-orange-500" />
                            </button>
                            <button
                              className="h-7 w-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                              onClick={() => removerItem(item.id)}
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Rodapé do carrinho: Resumo + Botão finalizar */}
            {itensCarrinho.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-2">
                {/* Desconto total */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-600">Desconto no total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {descontoTotalPercentual > 0 && (
                      <span className="text-xs font-semibold text-orange-600">
                        -R$ {fmt(totalDescontoGeral)}
                      </span>
                    )}
                    <button
                      className="h-7 px-2.5 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center gap-1 transition-colors"
                      onClick={() => { setDialogDesconto('total'); setValorDescontoInput(descontoTotalPercentual.toString()); }}
                    >
                      <Percent className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-xs font-medium text-orange-600">
                        {descontoTotalPercentual > 0 ? `${descontoTotalPercentual}%` : 'Aplicar'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Resumo de valores */}
                <div className="space-y-1 pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Subtotal</span>
                    <span>R$ {fmt(subtotal)}</span>
                  </div>
                  {(totalDescontoItens + totalDescontoGeral) > 0 && (
                    <div className="flex justify-between text-xs text-orange-600">
                      <span>Descontos</span>
                      <span>- R$ {fmt(totalDescontoItens + totalDescontoGeral)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-800 pt-1">
                    <span>Total</span>
                    <span className="text-blue-600">R$ {fmt(totalFinal)}</span>
                  </div>
                </div>

                {/* Cliente */}
                {clienteSelecionado && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-white rounded-lg p-2">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    <span className="truncate">{clienteSelecionado.nome_razao_social}</span>
                    <span className="text-gray-400 shrink-0">{clienteSelecionado.cnpj_cpf}</span>
                  </div>
                )}

                {/* Botão finalizar */}
                <Button
                  className="w-full h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md rounded-xl"
                  onClick={() => setDialogPagamento(true)}
                  disabled={!caixaAberto}
                >
                  {caixaAberto ? (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Finalizar Venda — R$ {fmt(totalFinal)}
                    </>
                  ) : (
                    'Abra o caixa para vender'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ========== DIÁLOGOS ========== */}

        {/* Diálogo: Abertura de Caixa */}
        <Dialog open={dialogAberturaCaixa} onOpenChange={setDialogAberturaCaixa}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Abrir Caixa</DialogTitle>
              <DialogDescription>Informe o valor inicial do caixa (opcional)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Valor Inicial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valorAberturaCaixa}
                  onChange={(e) => setValorAberturaCaixa(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogAberturaCaixa(false)}>Cancelar</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleAbrirCaixa}
                disabled={abrindoCaixa}
              >
                {abrindoCaixa && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Abrir Caixa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo: Desconto */}
        <Dialog open={dialogDesconto !== null} onOpenChange={() => setDialogDesconto(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {dialogDesconto === 'total' ? 'Desconto no Total' : 'Desconto no Item'}
              </DialogTitle>
              <DialogDescription>Informe o percentual de desconto (0 a 100%)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="0"
                  value={valorDescontoInput}
                  onChange={(e) => setValorDescontoInput(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && (
                    dialogDesconto === 'total'
                      ? aplicarDescontoTotal()
                      : aplicarDescontoItem(dialogDesconto)
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogDesconto(null)}>Cancelar</Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => {
                  if (dialogDesconto === 'total') {
                    aplicarDescontoTotal();
                  } else if (dialogDesconto) {
                    aplicarDescontoItem(dialogDesconto);
                  }
                }}
              >
                Aplicar Desconto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo: Pagamento */}
        <Dialog open={dialogPagamento} onOpenChange={setDialogPagamento}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pagamento</DialogTitle>
              <DialogDescription>
                Total: <span className="font-bold text-blue-600">R$ {fmt(totalFinal)}</span>
                {' — '}Restante: <span className="font-bold text-orange-600">R$ {fmt(Math.max(0, totalFinal - totalPago))}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Seletor de forma de pagamento rápida (sem múltiplos) */}
              {pagamentos.length === 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Forma de Pagamento</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {FORMAS_PAGAMENTO.map(fp => (
                      <button
                        key={fp.id}
                        onClick={() => abrirCupomFiscal(fp.id)}
                        className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                      >
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <fp.icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{fp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pagamentos múltiplos */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Pagamentos</Label>
                {pagamentos.map((pg, idx) => {
                  const forma = FORMAS_PAGAMENTO.find(f => f.id === pg.forma);
                  return (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          {forma && <forma.icon className="h-4 w-4 text-blue-600" />}
                        </div>
                        <span className="text-sm font-medium">{forma?.label || pg.forma}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">R$ {fmt(pg.valor)}</span>
                        <button
                          className="h-6 w-6 rounded bg-red-100 hover:bg-red-200 flex items-center justify-center"
                          onClick={() => removerPagamento(idx)}
                        >
                          <X className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Adicionar pagamento */}
              {totalPago < totalFinal && pagamentos.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <Label className="text-sm font-semibold">Adicionar Pagamento</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Valor"
                      value={valorPagamentoAtual}
                      onChange={(e) => setValorPagamentoAtual(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex gap-1">
                      {FORMAS_PAGAMENTO.map(fp => (
                        <button
                          key={fp.id}
                          onClick={() => adicionarPagamento(fp.id)}
                          className="h-10 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 transition-colors"
                          title={fp.label}
                        >
                          <fp.icon className="h-4 w-4" />
                          <span className="hidden sm:inline text-xs">{fp.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Troco para dinheiro */}
              {pagamentos.some(p => p.forma === 'dinheiro') && totalPago > totalFinal && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600">Troco</p>
                  <p className="text-xl font-bold text-green-700">R$ {fmt(troco)}</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setDialogPagamento(false)}>Cancelar</Button>
              {pagamentos.length > 0 && (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleFinalizarComPagamentos}
                  disabled={totalPago < totalFinal}
                >
                  Confirmar Pagamento
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo: Cupom Fiscal */}
        <CupomFiscalModal
          open={dialogCupomFiscal}
          onOpenChange={setDialogCupomFiscal}
          onConfirmar={finalizarVenda}
          formaPagamento={formaPagamentoSelecionada}
          total={totalFinal}
          itens={itensCarrinho.map(item => ({
            nome: item.nome,
            quantidade: item.quantidade,
            preco: item.preco,
            codigo: item.codigo || item.codigoBarras || '',
            unidade: item.unidade || 'UN',
          }))}
          nomeEmpresa={empresa?.nome || 'PDV Varejo'}
          cnpjEmpresa={empresa?.cnpj || ''}
          enderecoEmpresa={empresa?.endereco || ''}
          processando={processando}
          pagamentosMultiplos={pagamentos.length > 1 ? pagamentos : undefined}
        />

      </div>
    </ProtectedRoute>
  );
}
