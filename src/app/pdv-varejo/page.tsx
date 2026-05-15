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
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { getSupabaseClient, debitarEstoqueVenda } from '@/lib/supabase';
import {
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
  PackageCheck,
  CircleDollarSign,
  Receipt,
  ShieldCheck,
  Undo2,
  FolderOpen,
  FileText,

  Monitor,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface ItemCarrinho {
  id: string;
  produtoId: string;
  nome: string;
  preco: number;
  precoOriginal: number;
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

const fmt = (val: number | undefined | null) => (val || 0).toFixed(2);

export default function PDVVarejoPage() {
  const { user, empresaId, nomeMarca, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { categorias, loading: loadingCategorias } = useCategorias();
  const { caixaAberto, abrirCaixa, fecharCaixa } = useCaixa();

  const [codigoInput, setCodigoInput] = useState('');
  const [quantidadeInput, setQuantidadeInput] = useState('1');
  const [precoInput, setPrecoInput] = useState('');
  const [itensCarrinho, setItensCarrinho] = useState<ItemCarrinho[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteEncontrado | null>(null);
  const [clientesList, setClientesList] = useState<ClienteEncontrado[]>([]);

  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [dialogCupomFiscal, setDialogCupomFiscal] = useState(false);
  const [dialogDesconto, setDialogDesconto] = useState<string | null>(null);
  const [dialogAberturaCaixa, setDialogAberturaCaixa] = useState(false);
  const [dialogDevolucao, setDialogDevolucao] = useState(false);
  const [dialogAbrirPedido, setDialogAbrirPedido] = useState(false);
  const [dialogObservacao, setDialogObservacao] = useState(false);
  const [dialogCliente, setDialogCliente] = useState(false);
  const [processando, setProcessando] = useState(false);

  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<string>('');
  const [pagamentos, setPagamentos] = useState<PagamentoItem[]>([]);
  const [valorPagamentoAtual, setValorPagamentoAtual] = useState('');

  const [valorDescontoInput, setValorDescontoInput] = useState('');
  const [descontoTotalPercentual, setDescontoTotalPercentual] = useState(0);
  const [editTotalFinal, setEditTotalFinal] = useState(false);
  const [editTotalFinalValue, setEditTotalFinalValue] = useState('');
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
  const [devolucaoCodigo, setDevolucaoCodigo] = useState('');
  const [devolucaoQtd, setDevolucaoQtd] = useState('1');
  const [observacao, setObservacao] = useState('');
  const [buscaResults, setBuscaResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(-1);

  const codigoInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (!empresaId) return;
    const carregarClientes = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('clientes')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('ativo', true);
        if (data) setClientesList(data);
      } catch (err) {
        console.error('Erro ao carregar clientes:', err);
      }
    };
    carregarClientes();
  }, [empresaId]);

  useEffect(() => {
    if (!codigoInput.trim()) {
      setBuscaResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(() => {
      const q = codigoInput.trim().toLowerCase();
      const results = (produtos || [])
        .filter(p =>
          p.nome.toLowerCase().includes(q) ||
          (p.codigo && p.codigo.toLowerCase().includes(q)) ||
          (p.codigoBarras && p.codigoBarras.toLowerCase().includes(q))
        )
        .slice(0, 15);
      setBuscaResults(results);
      setShowDropdown(results.length > 0 && q.length > 0);
      setSelectedDropdownIndex(-1);
    }, 150);
    return () => clearTimeout(timer);
  }, [codigoInput, produtos]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          codigoInputRef.current && !codigoInputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loading = loadingProdutos || loadingCategorias;

  const subtotal = itensCarrinho.reduce((acc, item) => acc + ((item.preco || 0) * (item.quantidade || 0)), 0);
  const totalDescontoItens = itensCarrinho.reduce((acc, item) => {
    const descontoItem = ((item.preco || 0) * (item.quantidade || 0)) * ((item.descontoPercentual || 0) / 100);
    return acc + descontoItem;
  }, 0);
  const totalDescontoGeral = subtotal * (descontoTotalPercentual / 100);
  const totalFinal = subtotal - totalDescontoItens - totalDescontoGeral;
  const totalPago = pagamentos.reduce((acc, pg) => acc + (pg.valor || 0), 0);
  const troco = Math.max(0, totalPago - totalFinal);
  const totalItens = itensCarrinho.reduce((acc, i) => acc + i.quantidade, 0);

  const adicionarProduto = (produto: any, qtd?: number, precoCustom?: number) => {
    if (!produto.preco || produto.preco <= 0) {
      toast({ variant: 'destructive', title: 'Produto sem preço definido' });
      return;
    }
    const qtde = qtd || parseFloat(quantidadeInput) || 1;
    const preco = precoCustom || parseFloat(precoInput) || produto.preco;

    const existente = itensCarrinho.find(item => item.produtoId === produto.id);
    if (existente) {
      setItensCarrinho(itensCarrinho.map(item =>
        item.id === existente.id
          ? { ...item, quantidade: item.quantidade + qtde }
          : item
      ));
    } else {
      const novoItem: ItemCarrinho = {
        id: Date.now().toString(),
        produtoId: produto.id,
        nome: produto.nome,
        preco: preco,
        precoOriginal: produto.preco,
        quantidade: qtde,
        codigo: produto.codigo || '',
        codigoBarras: produto.codigoBarras || '',
        unidade: produto.unidade || 'UN',
        descontoPercentual: 0,
        imagem: produto.imagem || '',
      };
      setItensCarrinho([...itensCarrinho, novoItem]);
      setSelectedItemId(novoItem.id);
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

  const setPrecoItem = (itemId: string, novoPreco: number) => {
    if (novoPreco <= 0) {
      toast({ variant: 'destructive', title: 'Preço deve ser maior que zero' });
      return;
    }
    setItensCarrinho(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, preco: novoPreco, descontoPercentual: 0 } : item
      )
    );
  };

  const removerItem = (itemId: string) => {
    const item = itensCarrinho.find(i => i.id === itemId);
    setItensCarrinho(prev => prev.filter(item => item.id !== itemId));
    if (selectedItemId === itemId) setSelectedItemId(null);
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
    setSelectedItemId(null);
    setObservacao('');
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
          observacao: observacao || null,
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

      if (itensError) throw itensError;

      for (const item of itensCarrinho) {
        await debitarEstoqueVenda(supabase, empresaId, item.produtoId, item.quantidade, user?.id, user?.nome, vendaId);
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

      if (pagError) throw pagError;

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

        if (movError) throw movError;

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
          softwareName: nomeMarca || undefined,
        });
      }

      toast({
        title: 'Venda finalizada com sucesso!',
        description: `R$ ${fmt(totalFinal)} - ${itensCarrinho.length} itens`,
        className: "bg-green-500 text-white border-green-600"
      });
      setDialogCupomFiscal(false);
      setDialogPagamento(false);
      setItensCarrinho([]);
      setClienteSelecionado(null);
      setDescontoTotalPercentual(0);
      setPagamentos([]);
      setSelectedItemId(null);
      setObservacao('');
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

  const selecionarProdutoBusca = (produto: any) => {
    adicionarProduto(produto);
    setCodigoInput('');
    setQuantidadeInput('1');
    setPrecoInput('');
    setShowDropdown(false);
    setBuscaResults([]);
    codigoInputRef.current?.focus();
  };

  const handleCodigoSubmit = () => {
    if (!codigoInput.trim()) return;
    const q = codigoInput.trim().toLowerCase();

    const produtoExato = (produtos || []).find(p =>
      p.codigoBarras?.toLowerCase() === q ||
      p.codigo?.toLowerCase() === q
    );
    if (produtoExato) {
      selecionarProdutoBusca(produtoExato);
      return;
    }

    const nameResults = (produtos || []).filter(p =>
      p.nome.toLowerCase().includes(q) ||
      (p.codigo && p.codigo.toLowerCase().includes(q)) ||
      (p.codigoBarras && p.codigoBarras.toLowerCase().includes(q))
    );

    if (nameResults.length === 1) {
      selecionarProdutoBusca(nameResults[0]);
      return;
    }

    if (nameResults.length > 1) {
      setBuscaResults(nameResults.slice(0, 15));
      setShowDropdown(true);
      setSelectedDropdownIndex(-1);
      return;
    }

    toast({ variant: 'destructive', title: 'Produto não encontrado', description: `"${codigoInput.trim()}" não localizado` });
    setShowDropdown(false);
  };

  const processarDevolucao = () => {
    if (!devolucaoCodigo.trim()) return;
    const codigo = devolucaoCodigo.trim();
    const produto = (produtos || []).find(p =>
      p.codigoBarras === codigo || p.codigo === codigo
    );
    if (!produto) {
      toast({ variant: 'destructive', title: 'Produto não encontrado' });
      return;
    }
    const qtd = parseFloat(devolucaoQtd) || 1;
    adicionarProduto(produto, -qtd);
    setDialogDevolucao(false);
    setDevolucaoCodigo('');
    setDevolucaoQtd('1');
  };

  const handleremoveSelected = () => {
    if (selectedItemId) {
      removerItem(selectedItemId);
    } else {
      toast({ title: 'Selecione um item na tabela para remover' });
    }
  };

  // Refs para atalhos de teclado (evita stale closures + funciona com diálogos abertos)
  const handleKeyRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  handleKeyRef.current = (e: KeyboardEvent) => {
    if (e.key === 'F4') { e.preventDefault(); if (itensCarrinho.length > 0) setDialogPagamento(true); }
    if (e.key === 'F2') { e.preventDefault(); handleremoveSelected(); }
    if (e.key === 'F3') { e.preventDefault(); if (selectedItemId) { setDialogDesconto(selectedItemId); const item = itensCarrinho.find(i => i.id === selectedItemId); setValorDescontoInput((item?.descontoPercentual || 0).toString()); } else { setDialogDesconto('total'); setValorDescontoInput(descontoTotalPercentual.toString()); } }
    if (e.key === 'F8') { e.preventDefault(); setDialogDevolucao(true); }
    if (e.key === 'F10') { e.preventDefault(); setDialogAbrirPedido(true); }
    if (e.ctrlKey && e.key === 'F12') { e.preventDefault(); setDialogObservacao(true); }
    if (e.ctrlKey && e.key === 'F5') { e.preventDefault(); setDialogCliente(true); }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKeyRef.current?.(e);
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, []);

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
      <div className={`h-screen flex flex-col ${darkMode ? 'bg-[#1a1a2e]' : 'bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50'}`}>

        {/* HEADER - POS Retail Style */}
        <header className={`${darkMode ? 'bg-gradient-to-r from-[#0f172a] via-blue-950 to-slate-900 border-white/10' : 'bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 border-blue-800/30'} px-4 py-2 shrink-0 shadow-xl border-b`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl"
                onClick={() => router.push('/admin/dashboard')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                <div className={`h-2.5 w-2.5 rounded-full ${caixaAberto ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className={`text-xs font-bold uppercase ${caixaAberto ? 'text-green-300' : 'text-red-300'}`}>
                  {caixaAberto ? 'Caixa Aberto' : 'Caixa Fechado'}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                <User className="h-3.5 w-3.5 text-blue-300" />
                <span className="text-xs text-blue-200 font-medium">{user?.nome || 'Operador'}</span>
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                <Monitor className="h-3.5 w-3.5 text-blue-300" />
                <span className="text-xs text-blue-200 font-medium">PDV 001</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {clienteSelecionado ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30"
                >
                  <User className="h-3.5 w-3.5 text-blue-300" />
                  <span className="text-xs text-blue-200 font-medium truncate max-w-[120px]">
                    {clienteSelecionado.nome_razao_social}
                  </span>
                  <button onClick={() => setClienteSelecionado(null)}>
                    <X className="h-3 w-3 text-blue-300 hover:text-white" />
                  </button>
                </motion.div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl text-xs"
                  onClick={() => setDialogCliente(true)}
                >
                  <User className="h-3.5 w-3.5 mr-1" />
                  Cliente
                </Button>
              )}
              {!caixaAberto ? (
                <Button
                  size="sm"
                  className="h-8 px-3 bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg shadow-green-500/30 rounded-xl text-xs"
                  onClick={() => setDialogAberturaCaixa(true)}
                >
                  <CircleDollarSign className="h-3.5 w-3.5 mr-1" />
                  Abrir Caixa
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-8 px-3 bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg rounded-xl text-xs"
                  onClick={() => fecharCaixa(caixaAberto.valor_atual || 0)}
                >
                  Fechar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl"
                onClick={handleLogout}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT - POS Retail Layout */}
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">

          {/* Product Code Input Row */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-gray-200'} border shadow-sm`}>
              <Barcode className={`h-5 w-5 ${darkMode ? 'text-teal-400' : 'text-blue-500'}`} />
              <span className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Código
              </span>
            </div>
            <div className="flex-1 relative" ref={dropdownRef}>
              <Input
                ref={codigoInputRef}
                placeholder="Digite ou escaneie o código do produto..."
                className={`h-12 text-lg font-mono tracking-wider ${darkMode ? 'bg-[#1e1e32] border-white/20 focus:border-teal-400 focus:ring-teal-400/10' : 'bg-white border-2 border-blue-100 focus:border-blue-500 focus:ring-blue-500/10'} rounded-xl transition-all`}
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedDropdownIndex(prev =>
                      prev < buscaResults.length - 1 ? prev + 1 : 0
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedDropdownIndex(prev =>
                      prev > 0 ? prev - 1 : buscaResults.length - 1
                    );
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (showDropdown && selectedDropdownIndex >= 0 && buscaResults[selectedDropdownIndex]) {
                      selecionarProdutoBusca(buscaResults[selectedDropdownIndex]);
                    } else {
                      handleCodigoSubmit();
                    }
                  } else if (e.key === 'Escape') {
                    setShowDropdown(false);
                  }
                }}
                autoFocus
              />
              {codigoInput && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                  onClick={() => { setCodigoInput(''); setShowDropdown(false); codigoInputRef.current?.focus(); }}
                >
                  <X className="h-3.5 w-3.5 text-gray-500" />
                </button>
              )}

              {showDropdown && buscaResults.length > 0 && (
                <div className={`absolute left-0 right-0 top-full mt-1 z-[9999] rounded-xl border shadow-2xl overflow-hidden ${
                  darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-xs px-4 py-2 font-semibold uppercase tracking-wider border-b ${
                    darkMode ? 'text-gray-400 border-white/10 bg-[#1a1a2e]' : 'text-gray-500 border-gray-100 bg-gray-50'
                  }`}>
                    {buscaResults.length} produto{buscaResults.length !== 1 ? 's' : ''} encontrado{buscaResults.length !== 1 ? 's' : ''}
                  </div>
                  {buscaResults.map((produto: any, idx: number) => (
                    <button
                      key={produto.id}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                        idx === selectedDropdownIndex
                          ? darkMode ? 'bg-blue-600/20 text-blue-200' : 'bg-blue-50 text-blue-700'
                          : darkMode ? 'hover:bg-white/5 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
                      } ${idx !== buscaResults.length - 1 ? (darkMode ? 'border-b border-white/5' : 'border-b border-gray-100') : ''}`}
                      onClick={() => selecionarProdutoBusca(produto)}
                      onMouseEnter={() => setSelectedDropdownIndex(idx)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{produto.nome}</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                          {produto.codigo || produto.codigoBarras || 'Sem código'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className={`text-sm font-bold ${darkMode ? 'text-teal-400' : 'text-blue-600'}`}>
                          R$ {fmt(produto.preco)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-gray-200'} border shadow-sm`}>
                <span className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Qtd</span>
                <Input
                  type="number"
                  min="1"
                  value={quantidadeInput}
                  onChange={(e) => setQuantidadeInput(e.target.value)}
                  className={`h-9 w-16 text-center text-sm font-bold ${darkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-gray-50 border-gray-200'} rounded-lg`}
                />
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-gray-200'} border shadow-sm`}>
                <span className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Preço"
                  value={precoInput}
                  onChange={(e) => setPrecoInput(e.target.value)}
                  className={`h-9 w-24 text-sm font-bold ${darkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-gray-50 border-gray-200'} rounded-lg`}
                />
              </div>
            </div>
          </div>

          {/* Cart Table */}
          <div className={`flex-1 rounded-2xl overflow-hidden border ${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-gray-200'} shadow-md`}>
            <ScrollArea className="h-full">
              {itensCarrinho.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`h-24 w-24 rounded-full ${darkMode ? 'bg-[#1a1a2e]' : 'bg-gray-100'} flex items-center justify-center mb-4`}
                  >
                    <ShoppingCart className={`h-12 w-12 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  </motion.div>
                  <p className={`text-lg font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Carrinho vazio</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                    Escaneie ou digite o código do produto
                  </p>
                  <div className="flex items-center gap-4 mt-6 text-xs">
                    <kbd className={`px-2 py-1 rounded ${darkMode ? 'bg-[#1a1a2e] text-gray-400 border-white/10' : 'bg-gray-100 text-gray-500 border-gray-200'} border font-mono`}>F4</kbd>
                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Finalizar</span>
                    <kbd className={`px-2 py-1 rounded ${darkMode ? 'bg-[#1a1a2e] text-gray-400 border-white/10' : 'bg-gray-100 text-gray-500 border-gray-200'} border font-mono`}>F2</kbd>
                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Remover</span>
                  </div>
                </div>
              ) : (
                <table className={`w-full ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  <thead>
                    <tr className={`${darkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-gray-50 border-gray-200'} border-b text-xs uppercase tracking-wider`}>
                      <th className={`text-left py-3 px-4 font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Código</th>
                      <th className={`text-left py-3 px-4 font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Descrição</th>
                      <th className={`text-center py-3 px-4 font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Qtde</th>
                      <th className={`text-right py-3 px-2 font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Valor Un.</th>
                      <th className={`text-center py-3 px-2 font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>%Desc</th>
                      <th className={`text-right py-3 px-4 font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total</th>
                      <th className={`text-center py-3 px-2 font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}></th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {itensCarrinho.map((item, idx) => {
                        const isSelected = item.id === selectedItemId;
                        const itemTotal = ((item.preco || 0) * (item.quantidade || 0)) * (1 - (item.descontoPercentual || 0) / 100);
                        return (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20, height: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            onClick={() => setSelectedItemId(item.id)}
                            className={`cursor-pointer border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-blue-50/50'} transition-colors ${isSelected ? (darkMode ? 'bg-blue-900/20 ring-2 ring-inset ring-blue-500/30' : 'bg-blue-50 ring-2 ring-inset ring-blue-300/50') : ''}`}
                          >
                            <td className="py-3 px-4">
                              <span className={`text-sm font-mono ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {item.codigo || item.codigoBarras || '—'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{item.nome}</span>
                                {item.descontoPercentual > 0 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDialogDesconto(item.id); setValorDescontoInput(item.descontoPercentual.toString()); }}
                                    className="hover:opacity-80 transition-opacity"
                                  >
                                    <Badge className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0 rounded-full cursor-pointer">
                                      -{item.descontoPercentual}%
                                    </Badge>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  className={`h-7 w-7 rounded-lg ${darkMode ? 'bg-[#1a1a2e] hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} flex items-center justify-center transition-colors`}
                                  onClick={(e) => { e.stopPropagation(); alterarQtd(item.id, -1); }}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantidade}
                                  onChange={(e) => setQtd(item.id, parseInt(e.target.value) || 1)}
                                  className={`h-7 w-14 text-center text-sm font-bold ${darkMode ? 'bg-[#1a1a2e] border-white/10 text-gray-100' : 'bg-white border-gray-200'} rounded-lg`}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  className={`h-7 w-7 rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} text-white flex items-center justify-center transition-colors`}
                                  onClick={(e) => { e.stopPropagation(); alterarQtd(item.id, 1); }}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className={`py-3 px-2 text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              R$ {fmt(item.preco)}
                            </td>
                            <td className={`py-3 px-2 text-center text-sm font-mono ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {item.descontoPercentual > 0 ? (
                                <span className="text-orange-500 font-semibold">
                                  {item.descontoPercentual.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className={`py-3 px-4 text-right text-sm font-bold ${darkMode ? 'text-teal-400' : 'text-blue-600'}`}>
                              R$ {fmt(itemTotal)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  className={`h-7 w-7 rounded-lg ${darkMode ? 'bg-orange-500/20 hover:bg-orange-500/40 text-orange-400' : 'bg-orange-50 hover:bg-orange-100 text-orange-500'} flex items-center justify-center transition-colors`}
                                  onClick={(e) => { e.stopPropagation(); setDialogDesconto(item.id); setValorDescontoInput(item.descontoPercentual.toString()); }}
                                  title="Desconto no item"
                                >
                                  <Percent className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  className={`h-7 w-7 rounded-lg ${darkMode ? 'bg-red-500/20 hover:bg-red-500/40 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-500'} flex items-center justify-center transition-colors`}
                                  onClick={(e) => { e.stopPropagation(); removerItem(item.id); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </ScrollArea>
          </div>

          {/* Summary + Cliente Info */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {clienteSelecionado ? (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${darkMode ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}
                >
                  <User className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  <span className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    {clienteSelecionado.nome_razao_social}
                  </span>
                  <button onClick={() => setClienteSelecionado(null)}>
                    <X className={`h-3.5 w-3.5 ${darkMode ? 'text-blue-400 hover:text-blue-200' : 'text-blue-400 hover:text-blue-600'}`} />
                  </button>
                </motion.div>
              ) : (
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <button className="hover:text-blue-500 transition-colors" onClick={() => setDialogCliente(true)}>
                    Cliente: Ctrl+F5
                  </button>
                </span>
              )}
            </div>

            <div className={`flex items-center gap-4 px-4 py-2 rounded-xl ${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-gray-200'} border shadow-sm`}>
              <div className="text-center">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Itens</span>
                <p className={`text-sm font-bold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{totalItens}</p>
              </div>
              <div className={`w-px h-8 ${darkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
              <div className="text-center">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Subtotal</span>
                <p className={`text-sm font-bold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>R$ {fmt(subtotal)}</p>
              </div>
              <div className={`w-px h-8 ${darkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
              <button
                type="button"
                className="text-center"
                onClick={() => { setDialogDesconto('total'); setValorDescontoInput(descontoTotalPercentual.toString()); }}
              >
                <span className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-500'}`}>Desconto</span>
                <div className="flex items-baseline justify-center gap-1">
                  <p className={`text-sm font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    -R$ {fmt(totalDescontoItens + totalDescontoGeral)}
                  </p>
                  {descontoTotalPercentual > 0 && (
                    <span className={`text-xs font-bold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                      ({descontoTotalPercentual.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </button>
              <div className={`w-px h-8 ${darkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
              <div className="text-center">
                <span className={`text-xs ${darkMode ? 'text-teal-400' : 'text-blue-500'}`}>Total</span>
                <div className="mt-0.5">
                  {editTotalFinal ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editTotalFinalValue}
                      onChange={(e) => setEditTotalFinalValue(e.target.value)}
                      className={`h-8 w-20 text-right text-sm font-bold ${darkMode ? 'bg-[#1a1a2e] border-teal-400 text-teal-300' : 'bg-white border-blue-400 text-blue-700'} rounded-lg px-1`}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          const t = parseFloat(editTotalFinalValue);
                          if (t > 0 && subtotal > 0) {
                            const pct = Math.max(0, ((subtotal - t) / subtotal) * 100);
                            setDescontoTotalPercentual(pct);
                          }
                          setEditTotalFinal(false);
                        }
                        if (e.key === 'Escape') setEditTotalFinal(false);
                      }}
                      onBlur={() => {
                        const t = parseFloat(editTotalFinalValue);
                        if (t > 0 && subtotal > 0) {
                          const pct = Math.max(0, ((subtotal - t) / subtotal) * 100);
                          setDescontoTotalPercentual(pct);
                        }
                        setEditTotalFinal(false);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={`text-lg font-bold hover:underline cursor-pointer ${darkMode ? 'text-teal-400' : 'text-blue-600'}`}
                      onClick={() => {
                        setEditTotalFinalValue(totalFinal.toFixed(2));
                        setEditTotalFinal(true);
                      }}
                    >
                      R$ {fmt(totalFinal)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - ordered by F-key */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            <Button
              className="h-10 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 text-xs"
              onClick={handleremoveSelected}
              disabled={!selectedItemId}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remover
              <kbd className="ml-1.5 px-1 py-0.5 rounded bg-black/20 text-[10px] font-mono">F2</kbd>
            </Button>
            <Button
              className="h-10 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 text-xs"
              onClick={() => {
                if (selectedItemId) {
                  const item = itensCarrinho.find(i => i.id === selectedItemId);
                  setDialogDesconto(selectedItemId);
                  setValorDescontoInput((item?.descontoPercentual || 0).toString());
                } else {
                  setDialogDesconto('total');
                  setValorDescontoInput(descontoTotalPercentual.toString());
                }
              }}
              disabled={itensCarrinho.length === 0}
            >
              <Percent className="h-3.5 w-3.5 mr-1" />
              Desc.
              <kbd className="ml-1.5 px-1 py-0.5 rounded bg-black/20 text-[10px] font-mono">F3</kbd>
            </Button>
            <Button
              className="h-10 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 text-xs"
              onClick={() => setDialogPagamento(true)}
              disabled={itensCarrinho.length === 0 || !caixaAberto}
            >
              <Receipt className="h-3.5 w-3.5 mr-1" />
              Finalizar
              <kbd className="ml-1.5 px-1 py-0.5 rounded bg-black/20 text-[10px] font-mono">F4</kbd>
            </Button>
            <Button
              className="h-10 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 text-xs"
              onClick={() => setDialogCliente(true)}
            >
              <User className="h-3.5 w-3.5 mr-1" />
              Cliente
              <kbd className="ml-1.5 px-1 py-0.5 rounded bg-black/20 text-[10px] font-mono">⌃F5</kbd>
            </Button>
            <Button
              className="h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 text-xs"
              onClick={() => setDialogDevolucao(true)}
            >
              <Undo2 className="h-3.5 w-3.5 mr-1" />
              Devolução
              <kbd className="ml-1.5 px-1 py-0.5 rounded bg-black/20 text-[10px] font-mono">F8</kbd>
            </Button>
            <Button
              className="h-10 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 text-xs"
              onClick={() => setDialogAbrirPedido(true)}
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1" />
              Pedido
              <kbd className="ml-1.5 px-1 py-0.5 rounded bg-black/20 text-[10px] font-mono">F10</kbd>
            </Button>
            <Button
              className={`h-10 rounded-xl text-xs font-bold shadow-lg ${
                observacao
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-yellow-500/20'
                  : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-gray-500/20'
              }`}
              onClick={() => setDialogObservacao(true)}
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              Obs.
              <kbd className="ml-1.5 px-1 py-0.5 rounded bg-black/20 text-[10px] font-mono">⌃F12</kbd>
            </Button>
          </div>
        </div>

        {/* CLIENTE SEARCH - Dialog */}
        <Dialog open={dialogCliente} onOpenChange={setDialogCliente}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Identificar Cliente
              </DialogTitle>
              <DialogDescription>Busque por nome, CPF ou CNPJ</DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <BuscaCliente
                clientes={clientesList}
                onSelect={(c) => { setClienteSelecionado(c); setDialogCliente(false); }}
                selected={null}
                placeholder="Buscar cliente por nome ou CPF/CNPJ..."
                label=""
                showActions={false}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setDialogCliente(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <DialogDescription>
                {dialogDesconto === 'total'
                  ? 'Informe o percentual de desconto no total da venda (0 a 100%)'
                  : 'Informe o percentual de desconto para este item (0 a 100%)'}
              </DialogDescription>
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
                        className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all"
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
          clienteInicial={clienteSelecionado}
          softwareName={nomeMarca}
/>

        {/* F8 - Devolução */}
        <Dialog open={dialogDevolucao} onOpenChange={setDialogDevolucao}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Undo2 className="h-5 w-5 text-blue-500" />
                Devolução
              </DialogTitle>
              <DialogDescription>Informe o código do produto e a quantidade a devolver</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Código do Produto</Label>
                <Input
                  placeholder="Código ou código de barras"
                  className="h-11 text-lg rounded-xl"
                  value={devolucaoCodigo}
                  onChange={(e) => setDevolucaoCodigo(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={devolucaoQtd}
                  onChange={(e) => setDevolucaoQtd(e.target.value)}
                  className="h-11 text-lg text-center rounded-xl"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => { setDialogDevolucao(false); setDevolucaoCodigo(''); setDevolucaoQtd('1'); }}>
                Cancelar
              </Button>
              <Button
                className="bg-blue-500 hover:bg-blue-600 rounded-xl"
                onClick={processarDevolucao}
              >
                Processar Devolução
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* F10 - Abrir Pedido */}
        <Dialog open={dialogAbrirPedido} onOpenChange={setDialogAbrirPedido}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-purple-500" />
                Abrir Pedido
              </DialogTitle>
              <DialogDescription>Carregar um pedido pendente ou salvo</DialogDescription>
            </DialogHeader>
            <div className="py-8 text-center">
              <FolderOpen className="h-16 w-16 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">Nenhum pedido pendente</p>
              <p className="text-gray-400 text-sm mt-1">Disponível em breve</p>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl w-full" onClick={() => setDialogAbrirPedido(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ctrl+F12 - Observação */}
        <Dialog open={dialogObservacao} onOpenChange={setDialogObservacao}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                Observação da Venda
              </DialogTitle>
              <DialogDescription>Adicione uma observação para esta venda</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <textarea
                className={`w-full min-h-[100px] p-3 rounded-xl border text-sm ${darkMode ? 'bg-[#1a1a2e] border-white/10 text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}
                placeholder="Observação..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setDialogObservacao(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-blue-500 hover:bg-blue-600 rounded-xl"
                onClick={() => setDialogObservacao(false)}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </ProtectedRoute>
  );
}
