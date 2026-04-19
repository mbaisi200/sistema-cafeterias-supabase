'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutos, useCategorias, useCaixa, registrarLog } from '@/hooks/useSupabase';
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
import { Card, CardContent } from '@/components/ui/card';
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
  QrCode,
  Tag,
  Percent,
  User,
  Loader2,
  CheckCircle,
  Barcode,
  Store,
  X,
  Package,
  ArrowLeft,
  LayoutGrid,
  List,
  PackageCheck,
  Clock,
  Receipt,
  Sparkles,
  TrendingUp,
  CircleDollarSign,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
  imagem?: string;
}

interface PagamentoItem {
  forma: string;
  valor: number;
}

const FORMAS_PAGAMENTO = [
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, cor: 'from-green-500 to-green-600' },
  { id: 'debito', label: 'Débito', icon: CreditCard, cor: 'from-blue-500 to-blue-600' },
  { id: 'credito', label: 'Crédito', icon: CreditCard, cor: 'from-purple-500 to-purple-600' },
  { id: 'pix', label: 'PIX', icon: QrCode, cor: 'from-pink-500 to-pink-600' },
];

const CORES_CATEGORIAS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

const fmt = (val: number | undefined | null) => (val || 0).toFixed(2);

export default function PDVVarejoPage() {
  const { user, empresaId, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { categorias, loading: loadingCategorias } = useCategorias();
  const { caixaAberto, abrirCaixa, fecharCaixa } = useCaixa();

  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [itensCarrinho, setItensCarrinho] = useState<ItemCarrinho[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteEncontrado | null>(null);

  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [dialogCupomFiscal, setDialogCupomFiscal] = useState(false);
  const [dialogDesconto, setDialogDesconto] = useState<string | null>(null);
  const [dialogAberturaCaixa, setDialogAberturaCaixa] = useState(false);
  const [processando, setProcessando] = useState(false);

  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<string>('');
  const [pagamentos, setPagamentos] = useState<PagamentoItem[]>([]);
  const [valorPagamentoAtual, setValorPagamentoAtual] = useState('');

  const [valorDescontoInput, setValorDescontoInput] = useState('');
  const [descontoTotalPercentual, setDescontoTotalPercentual] = useState(0);
  const [valorAberturaCaixa, setValorAberturaCaixa] = useState('');
  const [abrindoCaixa, setAbrindoCaixa] = useState(false);

  const [empresa, setEmpresa] = useState<{
    nome: string;
    cnpj: string;
    endereco: string;
    bairro: string;
    cidade: string;
    estado: string;
    telefone: string;
  } | null>(null);

  const [valorRecebido, setValorRecebido] = useState('');

  const [isMobile, setIsMobile] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);

  const [faixaPreco, setFaixaPreco] = useState<string>('todos');
  const [somenteComEstoque, setSomenteComEstoque] = useState(false);
  const [ordenacao, setOrdenacao] = useState<string>('nome-az');
  const [modoExibicao, setModoExibicao] = useState<'grid' | 'lista'>('grid');

  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loading = loadingProdutos || loadingCategorias;

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
    if (faixaPreco !== 'todos') {
      lista = lista.filter(p => {
        const preco = parseFloat(p.preco) || 0;
        switch (faixaPreco) {
          case 'ate-10': return preco <= 10;
          case '10-25': return preco > 10 && preco <= 25;
          case '25-50': return preco > 25 && preco <= 50;
          case 'acima-50': return preco > 50;
          default: return true;
        }
      });
    }
    if (somenteComEstoque) {
      lista = lista.filter(p => {
        if (!p.controlarEstoque) return true;
        return (parseFloat(p.estoqueAtual) || 0) > 0;
      });
    }
    lista = [...lista].sort((a, b) => {
      switch (ordenacao) {
        case 'nome-az': return (a.nome || '').localeCompare(b.nome || '');
        case 'nome-za': return (b.nome || '').localeCompare(a.nome || '');
        case 'menor-preco': return (parseFloat(a.preco) || 0) - (parseFloat(b.preco) || 0);
        case 'maior-preco': return (parseFloat(b.preco) || 0) - (parseFloat(a.preco) || 0);
        default: return 0;
      }
    });
    return lista;
  }, [produtos, categoriaAtiva, search, faixaPreco, somenteComEstoque, ordenacao]);

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
  }, [search, produtos]);

  const getCorCategoria = (categoriaId: string) => {
    const idx = (categorias || []).findIndex(c => c.id === categoriaId);
    return CORES_CATEGORIAS[idx % CORES_CATEGORIAS.length];
  };

  const getNomeCategoria = (categoriaId: string) => {
    const cat = (categorias || []).find(c => c.id === categoriaId);
    return cat?.nome || 'Sem categoria';
  };

  const subtotal = itensCarrinho.reduce((acc, item) => acc + ((item.preco || 0) * (item.quantidade || 0)), 0);
  const totalDescontoItens = itensCarrinho.reduce((acc, item) => {
    const descontoItem = ((item.preco || 0) * (item.quantidade || 0)) * ((item.descontoPercentual || 0) / 100);
    return acc + descontoItem;
  }, 0);
  const totalDescontoGeral = subtotal * (descontoTotalPercentual / 100);
  const totalFinal = subtotal - totalDescontoItens - totalDescontoGeral;
  const totalPago = pagamentos.reduce((acc, pg) => acc + (pg.valor || 0), 0);
  const troco = Math.max(0, totalPago - totalFinal);

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
        imagem: produto.imagem || '',
      }]);
    }
    toast({ 
      title: `${produto.nome} adicionado ao carrinho`,
      className: "bg-green-500 text-white border-green-600"
    });
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
    const item = itensCarrinho.find(i => i.id === itemId);
    setItensCarrinho(prev => prev.filter(item => item.id !== itemId));
    if (item) {
      toast({ 
        title: `${item.nome} removido`,
        className: "bg-red-500 text-white border-red-600"
      });
    }
  };

  const limparCarrinho = () => {
    setItensCarrinho([]);
    setClienteSelecionado(null);
    setDescontoTotalPercentual(0);
    toast({ title: 'Carrinho limpo' });
  };

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

  const finalizarVenda = async (dadosCupom: DadosCupomFiscal, formaPagamento: string) => {
    if (itensCarrinho.length === 0) {
      toast({ variant: 'destructive', title: 'Adicione itens ao carrinho' });
      return;
    }

    setProcessando(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase não inicializado');

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

        await supabase
          .from('caixas')
          .update({
            valor_atual: (caixaAberto.valor_atual || 0) + totalFinal,
            total_vendas: (caixaAberto.total_vendas || 0) + totalFinal,
            total_entradas: (caixaAberto.total_entradas || 0) + totalFinal,
          })
          .eq('id', caixaAberto.id);
      }

      await registrarLog({
        empresaId: empresaId || '',
        usuarioId: user?.id || '',
        usuarioNome: user?.nome || '',
        acao: 'VENDA_VAREJO_FINALIZADA',
        detalhes: `Venda varejo de ${itensCarrinho.length} itens - R$ ${fmt(totalFinal)}${dadosCupom.cpfCliente ? ` - CPF: ${dadosCupom.cpfCliente}` : ''}`,
        tipo: 'venda',
      });

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

      toast({ 
        title: '🎉 Venda finalizada com sucesso!',
        description: `R$ ${fmt(totalFinal)} - ${itensCarrinho.length} itens`,
        className: "bg-green-500 text-white border-green-600"
      });
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
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="relative">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <Store className="h-10 w-10 text-white" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2"
              >
                <Loader2 className="h-6 w-6 text-blue-400" />
              </motion.div>
            </div>
            <h2 className="text-xl font-bold text-white mt-6">Carregando PDV Varejo</h2>
            <p className="text-blue-300 text-sm mt-1">Preparando sua experiência...</p>
          </motion.div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50">
        
        {/* HEADER */}
        <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 px-4 py-3 shrink-0 shadow-xl border-b border-blue-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:inline-flex h-10 w-10 p-0 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl"
                onClick={() => router.push('/admin/dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-slate-900 flex items-center justify-center">
                    <PackageCheck className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-white text-lg leading-tight">PDV Varejo</p>
                  <p className="text-blue-300 text-xs leading-tight">{empresa?.nome || 'Carregando...'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Info do Caixa */}
              <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl ${
                caixaAberto 
                  ? 'bg-green-500/20 border border-green-500/30' 
                  : 'bg-red-500/20 border border-red-500/30'
              }`}>
                <div className={`h-2.5 w-2.5 rounded-full ${caixaAberto ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className={`text-xs font-semibold ${caixaAberto ? 'text-green-300' : 'text-red-300'}`}>
                  {caixaAberto ? 'Caixa Aberto' : 'Caixa Fechado'}
                </span>
                {caixaAberto && (
                  <span className="text-green-200 text-xs font-bold ml-1">
                    R$ {fmt(caixaAberto.valor_atual)}
                  </span>
                )}
              </div>

              {/* Info do Usuário */}
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-white text-xs font-medium">{user?.nome || 'Usuário'}</p>
                  <p className="text-blue-300 text-[10px]">Operador</p>
                </div>
              </div>

              {/* Botões */}
              {!caixaAberto ? (
                <Button
                  size="sm"
                  className="h-10 px-4 bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg shadow-green-500/30 rounded-xl"
                  onClick={() => setDialogAberturaCaixa(true)}
                >
                  <CircleDollarSign className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Abrir Caixa</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-10 px-4 bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg rounded-xl"
                  onClick={() => fecharCaixa(caixaAberto.valor_atual || 0)}
                >
                  <span className="hidden sm:inline">Fechar</span>
                </Button>
              )}

              {/* Carrinho Mobile */}
              {isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="relative h-10 w-10 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => setShowCartMobile(true)}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {itensCarrinho.length > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white text-xs font-bold shadow-lg"
                    >
                      {itensCarrinho.length}
                    </motion.div>
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl"
                onClick={handleLogout}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: Produtos */}
          <div className={`${isMobile && showCartMobile ? 'hidden' : 'flex'} flex-1 flex-col min-w-0`}>
            
            {/* Busca + Cliente */}
            <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-blue-100 shadow-sm space-y-3 overflow-visible relative z-[9997]">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar produto por nome, código ou código de barras..."
                  className="pl-14 pr-12 h-12 text-sm bg-white border-2 border-blue-100 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
                {search && (
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}
                  >
                    <X className="h-4 w-4 text-gray-500" />
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

            {/* Barra de Status e Filtros */}
            <div className="px-4 py-3 bg-white/60 backdrop-blur-sm border-b border-blue-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    <span className="font-semibold text-blue-600">{produtosFiltrados.length}</span> produtos
                  </span>
                  {search && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      Busca: "{search}"
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Toggle estoque */}
                  <Button
                    variant={somenteComEstoque ? "default" : "outline"}
                    size="sm"
                    className={`h-8 text-xs ${somenteComEstoque ? 'bg-green-500 hover:bg-green-600' : ''} rounded-lg`}
                    onClick={() => setSomenteComEstoque(prev => !prev)}
                  >
                    <PackageCheck className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">Com estoque</span>
                  </Button>

                  {/* Ordenação */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-lg"
                    onClick={() => {
                      const next = ordenacao === 'nome-az' ? 'nome-za' : ordenacao === 'nome-za' ? 'menor-preco' : ordenacao === 'menor-preco' ? 'maior-preco' : 'nome-az';
                      setOrdenacao(next);
                    }}
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">
                      {ordenacao === 'nome-az' ? 'A-Z' : ordenacao === 'nome-za' ? 'Z-A' : ordenacao === 'menor-preco' ? 'Menor' : 'Maior'}
                    </span>
                  </Button>

                  {/* Visualização */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                    <Button
                      variant={modoExibicao === 'grid' ? "default" : "ghost"}
                      size="sm"
                      className={`h-7 w-7 p-0 rounded-md ${modoExibicao === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}
                      onClick={() => setModoExibicao('grid')}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant={modoExibicao === 'lista' ? "default" : "ghost"}
                      size="sm"
                      className={`h-7 w-7 p-0 rounded-md ${modoExibicao === 'lista' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}
                      onClick={() => setModoExibicao('lista')}
                    >
                      <List className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Categorias */}
            <div className="px-4 py-3 bg-white/40 backdrop-blur-sm border-b border-blue-100">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCategoriaAtiva('todos')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                    categoriaAtiva === 'todos'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Todos ({produtos?.length || 0})
                </motion.button>
                {(categorias || []).map((cat: any, idx: number) => {
                  const cor = CORES_CATEGORIAS[idx % CORES_CATEGORIAS.length];
                  const count = (produtos || []).filter(p => p.categoriaId === cat.id).length;
                  return (
                    <motion.button
                      key={cat.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCategoriaAtiva(cat.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                        categoriaAtiva === cat.id
                          ? 'text-white shadow-lg'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                      style={categoriaAtiva === cat.id ? { 
                        background: `linear-gradient(to right, ${cor}, ${cor}dd)`,
                        boxShadow: `0 4px 12px ${cor}40`
                      } : {}}
                    >
                      {cat.nome} ({count})
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Grid/Lista de Produtos */}
            <ScrollArea className="flex-1">
              {modoExibicao === 'grid' ? (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {produtosFiltrados.map((produto: any, idx: number) => {
                    const estoque = parseFloat(produto.estoqueAtual) || 0;
                    const semEstoque = produto.controlarEstoque && estoque <= 0;
                    const cor = getCorCategoria(produto.categoriaId);
                    return (
                      <motion.button
                        key={produto.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={semEstoque}
                        onClick={() => adicionarProduto(produto)}
                        className={`relative flex flex-col p-4 rounded-2xl border-2 text-left transition-all ${
                          semEstoque
                            ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                            : 'bg-white border-transparent hover:border-blue-300 cursor-pointer shadow-md hover:shadow-xl'
                        }`}
                        style={!semEstoque ? { 
                          boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
                        } : {}}
                      >
                        {semEstoque && (
                          <div className="absolute top-2 right-2">
                            <Badge className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200">
                              Esgotado
                            </Badge>
                          </div>
                        )}
                        <div 
                          className="w-full h-2 rounded-full mb-3"
                          style={{ backgroundColor: cor }}
                        />
                        <div className="flex-1 min-h-[60px]">
                          <span className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight">
                            {produto.nome}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Barcode className="h-3 w-3 text-gray-400" />
                          <span className="text-[10px] text-gray-400 truncate max-w-[80px]">
                            {produto.codigoBarras || produto.codigo || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <span className="text-lg font-bold text-blue-600">
                            R$ {fmt(produto.preco)}
                          </span>
                          {!semEstoque && (
                            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                              <Plus className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                  {produtosFiltrados.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400"
                    >
                      <div className="h-24 w-24 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                        <Package className="h-12 w-12" />
                      </div>
                      <p className="text-lg font-medium text-gray-500">Nenhum produto encontrado</p>
                      <p className="text-sm mt-1">Tente buscar por outro termo</p>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {produtosFiltrados.map((produto: any, idx: number) => {
                    const estoque = parseFloat(produto.estoqueAtual) || 0;
                    const semEstoque = produto.controlarEstoque && estoque <= 0;
                    const cor = getCorCategoria(produto.categoriaId);
                    return (
                      <motion.button
                        key={produto.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        disabled={semEstoque}
                        onClick={() => adicionarProduto(produto)}
                        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all ${
                          semEstoque
                            ? 'opacity-50 cursor-not-allowed bg-gray-50'
                            : 'hover:bg-blue-50 cursor-pointer active:bg-blue-100'
                        }`}
                      >
                        <div 
                          className="w-1.5 h-12 rounded-full shrink-0"
                          style={{ backgroundColor: cor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800 truncate">{produto.nome}</span>
                            {semEstoque && (
                              <Badge className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Esgotado</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-gray-400">{produto.codigo || produto.codigoBarras || '—'}</span>
                            {produto.controlarEstoque && (
                              <span className={`text-[11px] font-medium ${estoque > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                Estoque: {Math.floor(estoque)} {produto.unidade || 'UN'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-lg font-bold text-blue-600">R$ {fmt(produto.preco)}</span>
                          {!semEstoque && (
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                              <Plus className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                  {produtosFiltrados.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-16 text-gray-400"
                    >
                      <Package className="h-16 w-16 mb-3" />
                      <p className="text-lg font-medium text-gray-500">Nenhum produto encontrado</p>
                    </motion.div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* RIGHT: Carrinho */}
          <div className={`${isMobile ? (showCartMobile ? 'flex' : 'hidden') : 'flex'} w-full lg:w-[420px] xl:w-[480px] flex-col bg-white border-l border-gray-200 shrink-0 shadow-2xl`}>
            
            {/* Header do carrinho */}
            <div className="px-5 py-4 border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800 text-lg">Carrinho</h2>
                    <p className="text-xs text-gray-500">
                      {itensCarrinho.length} {itensCarrinho.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {itensCarrinho.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 rounded-lg"
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
                      className="h-9 w-9 p-0"
                      onClick={() => setShowCartMobile(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de itens */}
            <ScrollArea className="flex-1">
              {itensCarrinho.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="h-28 w-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4"
                  >
                    <ShoppingCart className="h-14 w-14 text-gray-300" />
                  </motion.div>
                  <p className="text-lg font-semibold text-gray-500">Carrinho vazio</p>
                  <p className="text-sm text-gray-400 mt-1">Adicione produtos para começar</p>
                  <div className="flex items-center gap-2 mt-4 text-blue-500">
                    <Barcode className="h-4 w-4" />
                    <span className="text-xs">Escaneie ou busque um produto</span>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {itensCarrinho.map((item, idx) => {
                      const itemTotal = ((item.preco || 0) * (item.quantidade || 0)) * (1 - (item.descontoPercentual || 0) / 100);
                      return (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: idx * 0.05 }}
                          className="px-5 py-4 group hover:bg-blue-50/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{item.nome}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  R$ {fmt(item.preco)} x {item.quantidade} {item.unidade}
                                </span>
                                {item.descontoPercentual > 0 && (
                                  <Badge className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0 rounded-full">
                                    -{item.descontoPercentual}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-blue-600">
                                R$ {fmt(itemTotal)}
                              </p>
                              {item.descontoPercentual > 0 && (
                                <p className="text-[10px] text-gray-400 line-through">
                                  R$ {fmt((item.preco || 0) * (item.quantidade || 0))}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-0.5">
                              <button
                                className="h-8 w-8 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm"
                                onClick={() => alterarQtd(item.id, -1)}
                              >
                                <Minus className="h-4 w-4 text-gray-600" />
                              </button>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantidade}
                                onChange={(e) => setQtd(item.id, parseInt(e.target.value) || 1)}
                                className="h-8 w-14 text-center text-sm font-bold bg-white border-0"
                              />
                              <button
                                className="h-8 w-8 rounded-lg bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors shadow-sm"
                                onClick={() => alterarQtd(item.id, 1)}
                              >
                                <Plus className="h-4 w-4 text-white" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                className="h-8 w-8 rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                                onClick={() => { setDialogDesconto(item.id); setValorDescontoInput(item.descontoPercentual.toString()); }}
                              >
                                <Percent className="h-4 w-4 text-orange-500" />
                              </button>
                              <button
                                className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                                onClick={() => removerItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>

            {/* Rodapé do carrinho */}
            {itensCarrinho.length > 0 && (
              <div className="border-t-2 border-gray-100 bg-gradient-to-b from-gray-50 to-white p-5 space-y-4">
                
                {/* Cliente */}
                {clienteSelecionado && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 text-sm bg-blue-50 rounded-xl p-3 border border-blue-100"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{clienteSelecionado.nome_razao_social}</p>
                      <p className="text-xs text-gray-500">{clienteSelecionado.cnpj_cpf || 'CPF não informado'}</p>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">Cliente</Badge>
                  </motion.div>
                )}

                {/* Desconto total */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Desconto no total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {descontoTotalPercentual > 0 && (
                      <span className="text-sm font-semibold text-orange-600">
                        -R$ {fmt(totalDescontoGeral)}
                      </span>
                    )}
                    <button
                      className="h-9 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 flex items-center gap-1 transition-colors border border-orange-200"
                      onClick={() => { setDialogDesconto('total'); setValorDescontoInput(descontoTotalPercentual.toString()); }}
                    >
                      <Percent className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-600">
                        {descontoTotalPercentual > 0 ? `${descontoTotalPercentual}%` : 'Aplicar'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Resumo de valores */}
                <div className="bg-white rounded-2xl p-4 border border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal ({itensCarrinho.reduce((acc, i) => acc + i.quantidade, 0)} itens)</span>
                    <span>R$ {fmt(subtotal)}</span>
                  </div>
                  {(totalDescontoItens + totalDescontoGeral) > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Descontos</span>
                      <span>- R$ {fmt(totalDescontoItens + totalDescontoGeral)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200">
                    <span className="text-gray-800">Total</span>
                    <span className="text-blue-600">R$ {fmt(totalFinal)}</span>
                  </div>
                </div>

                {/* Botão finalizar */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button
                    className={`w-full h-14 text-base font-bold rounded-2xl shadow-lg transition-all ${
                      caixaAberto 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-green-500/30' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={() => setDialogPagamento(true)}
                    disabled={!caixaAberto}
                  >
                    {caixaAberto ? (
                      <>
                        <CreditCard className="h-5 w-5 mr-2" />
                        Finalizar Venda — R$ {fmt(totalFinal)}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-5 w-5 mr-2" />
                        Abra o caixa para vender
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* DIÁLOGOS */}

        {/* Abertura de Caixa */}
        <Dialog open={dialogAberturaCaixa} onOpenChange={setDialogAberturaCaixa}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <CircleDollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Abrir Caixa</DialogTitle>
                  <DialogDescription>Informe o valor inicial do caixa</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Valor Inicial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valorAberturaCaixa}
                  onChange={(e) => setValorAberturaCaixa(e.target.value)}
                  className="h-12 text-lg rounded-xl"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                {[0, 10, 50, 100].map(val => (
                  <Button
                    key={val}
                    variant="outline"
                    className="flex-1 h-10 rounded-xl"
                    onClick={() => setValorAberturaCaixa(val.toString())}
                  >
                    R$ {val}
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setDialogAberturaCaixa(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-green-500 hover:bg-green-600 rounded-xl"
                onClick={handleAbrirCaixa}
                disabled={abrindoCaixa}
              >
                {abrindoCaixa && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Abrir Caixa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Desconto */}
        <Dialog open={dialogDesconto !== null} onOpenChange={() => setDialogDesconto(null)}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-orange-500" />
                {dialogDesconto === 'total' ? 'Desconto no Total' : 'Desconto no Item'}
              </DialogTitle>
              <DialogDescription>Informe o percentual de desconto (0 a 100%)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Desconto (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="0"
                  value={valorDescontoInput}
                  onChange={(e) => setValorDescontoInput(e.target.value)}
                  className="h-12 text-lg text-center rounded-xl"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && dialogDesconto && (
                    dialogDesconto === 'total'
                      ? aplicarDescontoTotal()
                      : aplicarDescontoItem(dialogDesconto)
                  )}
                />
              </div>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(val => (
                  <Button
                    key={val}
                    variant="outline"
                    className="flex-1 h-10 rounded-xl"
                    onClick={() => setValorDescontoInput(val.toString())}
                  >
                    {val}%
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setDialogDesconto(null)}>
                Cancelar
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 rounded-xl"
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

        {/* Pagamento */}
        <Dialog open={dialogPagamento} onOpenChange={setDialogPagamento}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="h-5 w-5 text-blue-500" />
                Pagamento
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4 pt-2">
                <span className="text-lg font-bold text-blue-600">Total: R$ {fmt(totalFinal)}</span>
                <span className="text-orange-600 font-medium">Restante: R$ {fmt(Math.max(0, totalFinal - totalPago))}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {pagamentos.length === 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Selecione a forma de pagamento</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {FORMAS_PAGAMENTO.map(fp => (
                      <motion.button
                        key={fp.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => abrirCupomFiscal(fp.id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all`}
                      >
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${fp.cor} flex items-center justify-center shadow-md`}>
                          <fp.icon className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{fp.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {pagamentos.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Pagamentos</Label>
                  {pagamentos.map((pg, idx) => {
                    const forma = FORMAS_PAGAMENTO.find(f => f.id === pg.forma);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white rounded-xl px-4 py-3 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${forma?.cor || 'from-gray-400 to-gray-500'} flex items-center justify-center`}>
                            {forma && <forma.icon className="h-4 w-4 text-white" />}
                          </div>
                          <span className="text-sm font-medium">{forma?.label || pg.forma}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">R$ {fmt(pg.valor)}</span>
                          <button
                            className="h-7 w-7 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                            onClick={() => removerPagamento(idx)}
                          >
                            <X className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalPago < totalFinal && pagamentos.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-gray-200">
                  <Label className="text-sm font-semibold">Adicionar pagamento</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Valor"
                      value={valorPagamentoAtual}
                      onChange={(e) => setValorPagamentoAtual(e.target.value)}
                      className="flex-1 h-11 rounded-xl"
                    />
                    <div className="flex gap-1">
                      {FORMAS_PAGAMENTO.map(fp => (
                        <Button
                          key={fp.id}
                          size="sm"
                          className={`h-11 px-3 rounded-xl bg-gradient-to-br ${fp.cor} hover:opacity-90 text-white`}
                          onClick={() => adicionarPagamento(fp.id)}
                        >
                          <fp.icon className="h-4 w-4" />
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {pagamentos.some(p => p.forma === 'dinheiro') && totalPago > totalFinal && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4 text-center"
                >
                  <p className="text-sm text-green-600 font-medium">Troco para o cliente</p>
                  <p className="text-3xl font-bold text-green-700">R$ {fmt(troco)}</p>
                </motion.div>
              )}
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button variant="outline" className="rounded-xl" onClick={() => setDialogPagamento(false)}>
                Cancelar
              </Button>
              {pagamentos.length > 0 && (
                <Button
                  className="bg-green-500 hover:bg-green-600 rounded-xl"
                  onClick={handleFinalizarComPagamentos}
                  disabled={totalPago < totalFinal}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Confirmar Pagamento
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cupom Fiscal */}
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
