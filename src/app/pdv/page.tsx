'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutos, useCategorias, useMesas, useCaixa, useComandas, registrarLog } from '@/hooks/useSupabase';
import { CupomFiscalModal, imprimirCupomFiscal, DadosCupomFiscal } from '@/components/pdv/CupomFiscal';
import { BuscaCliente, ClienteEncontrado } from '@/components/pdv/BuscaCliente';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { getSupabaseClient, debitarEstoqueVenda } from '@/lib/supabase';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Coffee,
  LogOut,
  ArrowLeft,
  UtensilsCrossed,
  Package,
  User,
  Loader2,
  Truck,
  Printer,
  CheckCircle,
  Zap,
  TrendingUp,
  ClipboardList,
  UserPlus,
  X,
  FileText,
  Sun,
  Moon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ItemPedido {
  id: string;
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  codigo: string;
  unidade: string;
  atendenteId: string;
  atendenteNome: string;
  tipoVenda: 'balcao' | 'mesa' | 'delivery' | 'comanda';
  mesaNumero?: number;
  cliente?: string;
  criadoEm: Date;
}

interface DeliveryInfo {
  nome: string;
  telefone: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;
  observacao: string;
}

type TipoVenda = 'balcao' | 'mesa' | 'delivery' | 'comanda';

export default function PDVPage() {
  const { user, empresaId, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { resolvedTheme, setTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { categorias, loading: loadingCategorias } = useCategorias();
  const { mesas, loading: loadingMesas, atualizarMesa } = useMesas();
  const { caixaAberto, abrirCaixa, fecharCaixa } = useCaixa();
  const { 
    comandas, 
    loading: loadingComandas, 
    criarComanda, 
    adicionarItem: adicionarItemComanda,
    removerItem: removerItemComanda,
    alterarQuantidadeItem: alterarQtdItemComanda,
    fecharComanda: finalizarComanda 
  } = useComandas();
  
  // Estados
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [tipoVenda, setTipoVenda] = useState<TipoVenda>('balcao');
  const [mesaSelecionada, setMesaSelecionada] = useState<string>('');
  const [numeroMesaSelecionada, setNumeroMesaSelecionada] = useState<number>(0);
  const [deliverySelecionado, setDeliverySelecionado] = useState<string>('');
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    nome: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '', observacao: '',
  });
  const [deliveryCliente, setDeliveryCliente] = useState<ClienteEncontrado | null>(null);
  const [comandaSelecionada, setComandaSelecionada] = useState<any>(null);
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [dialogDelivery, setDialogDelivery] = useState(false);
  const [dialogComanda, setDialogComanda] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [novoClienteComanda, setNovoClienteComanda] = useState('');
  const [observacaoComanda, setObservacaoComanda] = useState('');
  
  // Estados para Cupom Fiscal
  const [dialogCupomFiscal, setDialogCupomFiscal] = useState(false);
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<string>('');
  const [pagamentos, setPagamentos] = useState<Array<{forma: string; valor: number}>>([]);
  const [valorPagamentoAtual, setValorPagamentoAtual] = useState('');
  const [empresa, setEmpresa] = useState<{
    nome: string;
    cnpj: string;
    endereco: string;
    bairro: string;
    cidade: string;
    estado: string;
    telefone: string;
  } | null>(null);

  // Caixa dialog states
  const [dialogAberturaCaixa, setDialogAberturaCaixa] = useState(false);
  const [valorAberturaCaixa, setValorAberturaCaixa] = useState('');
  const [abrindoCaixa, setAbrindoCaixa] = useState(false);

  // Mobile responsiveness states
  const [isMobile, setIsMobile] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [showSidePanelMobile, setShowSidePanelMobile] = useState(false);

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
          // Montar logradouro completo (rua + número + complemento)
          const partesLogradouro = [
            data.logradouro,
            data.numero,
            data.complemento,
          ].filter(Boolean);

          const logradouroCompleto = partesLogradouro.length > 0
            ? partesLogradouro.join(', ')
            : '';

          setEmpresa({
            nome: data.nome || 'Sistema PDV',
            cnpj: data.cnpj || '',
            endereco: logradouroCompleto,
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

  // Mobile detection via media query
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loading = loadingProdutos || loadingCategorias || loadingMesas || loadingComandas;

  // Carregar pedidos da mesa selecionada
  useEffect(() => {
    if (tipoVenda !== 'mesa' || !mesaSelecionada || !empresaId) {
      if (tipoVenda !== 'comanda') {
        setItensPedido([]);
      }
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const carregarPedidos = async () => {
      const { data, error } = await supabase
        .from('pedidos_temp')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('mesa_id', mesaSelecionada)
        .order('criado_em', { ascending: true });
      
      if (!error && data) {
        const itens = data.map(item => ({
          id: item.id,
          produtoId: item.produto_id,
          nome: item.nome,
          preco: item.preco,
          quantidade: item.quantidade,
          codigo: item.codigo || '',
          unidade: item.unidade || 'UN',
          isCombo: item.is_combo || false,
          atendenteId: item.atendente_id,
          atendenteNome: item.atendente_nome,
          tipoVenda: item.tipo_venda,
          mesaNumero: item.mesa_numero,
          cliente: item.cliente,
          criadoEm: new Date(item.criado_em),
        })) as ItemPedido[];
        
        setItensPedido(itens);
      }
    };

    carregarPedidos();
    // Polling a cada 5 segundos para atualizar (substituto do onSnapshot)
    const interval = setInterval(carregarPedidos, 5000);
    
    return () => clearInterval(interval);
  }, [tipoVenda, mesaSelecionada, empresaId]);

  // Carregar itens da comanda selecionada
  useEffect(() => {
    if (tipoVenda !== 'comanda' || !comandaSelecionada) {
      return;
    }

    const itens = (comandaSelecionada.itens || []).map((item: any) => ({
      id: item.id,
      produtoId: item.produto_id || item.produtoId,
      nome: item.nome,
      preco: item.preco,
      quantidade: item.quantidade,
      atendenteId: item.adicionado_por || item.adicionadoPor || '',
      atendenteNome: item.adicionado_por_nome || item.adicionadoPorNome || '',
      tipoVenda: 'comanda' as const,
      cliente: comandaSelecionada.nome_cliente || comandaSelecionada.nomeCliente,
      criadoEm: item.adicionado_em ? new Date(item.adicionado_em) : (item.adicionadoEm?.toDate() || new Date()),
    }));

    setItensPedido(itens);
  }, [tipoVenda, comandaSelecionada]);

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

  // Derive occupied mesas from pedidos_temp (polling + optimistic updates)
  // Polling every 3s guarantees sync even without Supabase Realtime enabled
  const [mesasOcupadas, setMesasOcupadas] = useState<Set<string>>(new Set());

  const carregarMesasOcupadas = useCallback(async () => {
    if (!empresaId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('pedidos_temp')
        .select('mesa_id')
        .eq('empresa_id', empresaId)
        .not('mesa_id', 'is', null);

      if (!error && data) {
        const ocupadas = new Set(data.map((row: any) => row.mesa_id));
        setMesasOcupadas(ocupadas);
      }
    } catch (err) {
      console.error('Erro ao carregar mesas ocupadas:', err);
    }
  }, [empresaId]);

  // Polling every 3 seconds (guaranteed sync, no dependency on Realtime)
  useEffect(() => {
    carregarMesasOcupadas();
    const interval = setInterval(carregarMesasOcupadas, 3000);
    return () => clearInterval(interval);
  }, [empresaId, carregarMesasOcupadas]);

  // Helper: optimistically mark a mesa as occupied (instant, no DB wait)
  const marcarMesaOcupada = useCallback((mesaId: string) => {
    setMesasOcupadas(prev => {
      if (prev.has(mesaId)) return prev;
      const next = new Set(prev);
      next.add(mesaId);
      return next;
    });
  }, []);

  // Helper: optimistically mark a mesa as free (instant, no DB wait)
  const marcarMesaLivre = useCallback((mesaId: string) => {
    setMesasOcupadas(prev => {
      if (!prev.has(mesaId)) return prev;
      const next = new Set(prev);
      next.delete(mesaId);
      return next;
    });
  }, []);

  // Mesas organizadas por status (derived from pedidos_temp)
  const mesasOrdenadas = useMemo(() => {
    return (mesas || []).map((m: any) => ({
      ...m,
      status: mesasOcupadas.has(m.id) ? 'ocupada' : 'livre',
    })).sort((a: any, b: any) => a.numero - b.numero);
  }, [mesas, mesasOcupadas]);

  // Total do pedido
  const total = (itensPedido || []).reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

  // Total pago nos pagamentos múltiplos
  const totalPago = pagamentos.reduce((acc, pg) => acc + pg.valor, 0);

  // Adicionar pagamento à lista
  const adicionarPagamento = (forma: string) => {
    const valor = parseFloat(valorPagamentoAtual) || 0;
    if (valor <= 0) {
      toast({ variant: 'destructive', title: 'Informe o valor do pagamento' });
      return;
    }
    if (totalPago + valor > total + 0.01) { // tolerância de 1 centavo
      toast({ variant: 'destructive', title: 'Valor excede o total da venda' });
      return;
    }
    setPagamentos([...pagamentos, { forma, valor }]);
    setValorPagamentoAtual('');
  };

  // Remover pagamento da lista
  const removerPagamento = (index: number) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };

  // Auto-fill payment amount when dialog opens or when payments change
  useEffect(() => {
    if (dialogPagamento) {
      const restante = total - totalPago;
      setValorPagamentoAtual(restante > 0 ? restante.toFixed(2) : '');
      // Reset payments when dialog opens fresh (no prior payments)
      if (totalPago === 0) {
        setPagamentos([]);
      }
    }
  }, [dialogPagamento]);

  // Finalizar com múltiplos pagamentos
  const handleFinalizarComPagamentos = () => {
    if (totalPago < total) {
      toast({ variant: 'destructive', title: 'Pagamento incompleto' });
      return;
    }
    // Define a forma de pagamento como a primeira (para compatibilidade)
    // Mas salva todos os pagamentos na venda
    setFormaPagamentoSelecionada(pagamentos[0]?.forma || 'dinheiro');
    setDialogPagamento(false);
    setDialogCupomFiscal(true);
  };

  // Função auxiliar para obter cor da categoria
  const getCorCategoria = (categoriaId: string) => {
    const categoria = categorias?.find(c => c.id === categoriaId);
    return categoria?.cor || '#3B82F6';
  };

  // Função auxiliar para obter label do tipo de venda
  const getTipoVendaLabel = () => {
    switch (tipoVenda) {
      case 'mesa': return `Mesa ${numeroMesaSelecionada}`;
      case 'delivery': return 'Delivery';
      case 'comanda': return comandaSelecionada ? `Comanda #${comandaSelecionada.numero}` : 'Comanda';
      default: return 'Balcão';
    }
  };

  // Adicionar produto
  const adicionarProduto = async (produto: typeof produtos[0]) => {
    if (!produto.preco || produto.preco <= 0) {
      toast({ variant: 'destructive', title: 'Produto sem preço definido' });
      return;
    }

    if (tipoVenda === 'mesa' && !mesaSelecionada) {
      toast({ variant: 'destructive', title: 'Selecione uma mesa primeiro' });
      return;
    }

    if (tipoVenda === 'delivery' && !deliverySelecionado) {
      toast({ variant: 'destructive', title: 'Inicie um delivery primeiro' });
      setDialogDelivery(true);
      return;
    }

    if (tipoVenda === 'comanda' && !comandaSelecionada) {
      toast({ variant: 'destructive', title: 'Selecione ou crie uma comanda primeiro' });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Para mesa e delivery, salva no Supabase
    if (tipoVenda === 'mesa' || tipoVenda === 'delivery') {
      try {
        const { error } = await supabase
          .from('pedidos_temp')
          .insert({
            empresa_id: empresaId,
            mesa_id: mesaSelecionada || null,
            mesa_numero: numeroMesaSelecionada || null,
            delivery_id: deliverySelecionado || null,
            delivery_info: tipoVenda === 'delivery' ? deliveryInfo : null,
            produto_id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: 1,
            codigo: produto.codigo || '',
            unidade: produto.unidade || 'UN',
            atendente_id: user?.id,
            atendente_nome: user?.nome,
            tipo_venda: tipoVenda,
            criado_em: new Date().toISOString(),
          });
        
        if (error) throw error;
        
        // OPTIMISTIC: mark mesa as occupied immediately (no DB wait)
        if (tipoVenda === 'mesa' && mesaSelecionada) {
          marcarMesaOcupada(mesaSelecionada);
        }
        
        // Also update mesa.status in DB for any other consumers
        if (tipoVenda === 'mesa' && mesaSelecionada) {
          const mesaAtual = mesas.find(m => m.id === mesaSelecionada);
          if (mesaAtual && mesaAtual.status === 'livre') {
            atualizarMesa(mesaSelecionada, { status: 'ocupada' })
              .catch(() => {}); // fire-and-forget, optimistic already done
          }
        }
      } catch (error) {
        console.error('Erro ao salvar produto:', error);
        toast({ variant: 'destructive', title: 'Erro ao adicionar produto' });
        return;
      }
    } else if (tipoVenda === 'comanda') {
      // Para comanda, adiciona ao documento da comanda
      try {
        await adicionarItemComanda(comandaSelecionada.id, {
          produtoId: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: 1,
        });

        // Atualizar a comanda selecionada localmente
        const { data: comandaAtualizada } = await supabase
          .from('comandas')
          .select('*')
          .eq('id', comandaSelecionada.id)
          .single();
        
        if (comandaAtualizada) {
          setComandaSelecionada({
            id: comandaAtualizada.id,
            ...comandaAtualizada,
          });
        }
      } catch (error) {
        console.error('Erro ao adicionar item na comanda:', error);
        toast({ variant: 'destructive', title: 'Erro ao adicionar item' });
        return;
      }
    } else {
      // Para balcão, mantém local
      const existente = itensPedido.find(item => item.produtoId === produto.id);
      
      if (existente) {
        setItensPedido(itensPedido.map(item => 
          item.id === existente.id 
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        ));
      } else {
        setItensPedido([...itensPedido, {
          id: Date.now().toString(),
          produtoId: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: 1,
          codigo: produto.codigo || '',
          unidade: produto.unidade || 'UN',
          isCombo: produto.isCombo || false,
          atendenteId: user?.id || '',
          atendenteNome: user?.nome || '',
          tipoVenda: 'balcao',
          criadoEm: new Date(),
        }]);
      }
    }

    toast({ title: `✓ ${produto.nome} adicionado` });
  };

  // Busca por código de barras - adiciona automaticamente quando encontra
  useEffect(() => {
    if (!search || search.length < 8) return; // Códigos de barras geralmente têm pelo menos 8 dígitos
    
    // Verifica se é um código de barras (apenas números)
    const isCodigoBarras = /^[0-9]{8,}$/.test(search);
    
    if (isCodigoBarras) {
      const produtoEncontrado = (produtos || []).find(p => p.codigoBarras === search);
      
      if (produtoEncontrado) {
        // Adiciona o produto automaticamente
        adicionarProduto(produtoEncontrado);
        setSearch(''); // Limpa a busca
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, produtos]);

  // Alterar quantidade
  const alterarQtd = async (itemId: string, delta: number, quantidadeAtual: number) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const novaQtd = quantidadeAtual + delta;
    
    if (tipoVenda === 'mesa' || tipoVenda === 'delivery') {
      if (novaQtd <= 0) {
        await supabase.from('pedidos_temp').delete().eq('id', itemId);
      } else {
        await supabase.from('pedidos_temp').update({ quantidade: novaQtd }).eq('id', itemId);
      }
    } else if (tipoVenda === 'comanda') {
      try {
        await alterarQtdItemComanda(comandaSelecionada.id, itemId, novaQtd);
        
        // Atualizar a comanda selecionada localmente
        const { data: comandaAtualizada } = await supabase
          .from('comandas')
          .select('*')
          .eq('id', comandaSelecionada.id)
          .single();
        
        if (comandaAtualizada) {
          setComandaSelecionada({
            id: comandaAtualizada.id,
            ...comandaAtualizada,
          });
        }
      } catch (error) {
        console.error('Erro ao alterar quantidade:', error);
      }
    } else {
      if (novaQtd <= 0) {
        setItensPedido(itensPedido.filter(item => item.id !== itemId));
      } else {
        setItensPedido(itensPedido.map(item => 
          item.id === itemId ? { ...item, quantidade: novaQtd } : item
        ));
      }
    }
  };

  // Remover item
  const removerItem = async (itemId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (tipoVenda === 'mesa' || tipoVenda === 'delivery') {
      await supabase.from('pedidos_temp').delete().eq('id', itemId);
    } else if (tipoVenda === 'comanda') {
      try {
        await removerItemComanda(comandaSelecionada.id, itemId);
        
        // Atualizar a comanda selecionada localmente
        const { data: comandaAtualizada } = await supabase
          .from('comandas')
          .select('*')
          .eq('id', comandaSelecionada.id)
          .single();
        
        if (comandaAtualizada) {
          setComandaSelecionada({
            id: comandaAtualizada.id,
            ...comandaAtualizada,
          });
        }
      } catch (error) {
        console.error('Erro ao remover item:', error);
      }
    } else {
      setItensPedido(itensPedido.filter(item => item.id !== itemId));
    }
  };

  // Limpar pedido
  const limparPedido = async () => {
    const supabase = getSupabaseClient();

    if (tipoVenda === 'mesa' && mesaSelecionada && empresaId && supabase) {
      try {
        // Delete ALL pedidos_temp items for this mesa (not just local state items)
        const { error: delError } = await supabase
          .from('pedidos_temp')
          .delete()
          .eq('empresa_id', empresaId)
          .eq('mesa_id', mesaSelecionada);

        if (delError) {
          console.error('Erro ao limpar pedido:', delError);
          toast({ variant: 'destructive', title: 'Erro ao limpar pedido' });
          return;
        }

        // OPTIMISTIC: mark mesa as free immediately (no DB wait)
        marcarMesaLivre(mesaSelecionada);

        // Also update mesa.status in DB for other consumers
        try {
          await atualizarMesa(mesaSelecionada, { status: 'livre' });
        } catch (err) {
          console.error('Erro ao liberar mesa:', err);
        }

        // Clear local cart state
        setItensPedido([]);
        toast({ title: '✓ Pedido limpo e mesa liberada' });
      } catch (error) {
        console.error('Erro ao limpar pedido:', error);
        toast({ variant: 'destructive', title: 'Erro ao limpar pedido' });
      }
    } else if (tipoVenda === 'delivery' && mesaSelecionada && supabase) {
      const deletePromises = itensPedido.map(item =>
        supabase.from('pedidos_temp').delete().eq('id', item.id)
      );
      await Promise.all(deletePromises);
      setDeliverySelecionado('');
      setDeliveryInfo({ nome: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '', observacao: '' });
      setDeliveryCliente(null);
      setItensPedido([]);
      toast({ title: '✓ Pedido limpo' });
    } else if (tipoVenda === 'comanda') {
      setComandaSelecionada(null);
      setItensPedido([]);
    } else {
      setItensPedido([]);
    }
  };

  // Selecionar mesa
  const selecionarMesa = async (mesaId: string, numero: number, status: string) => {
    setMesaSelecionada(mesaId);
    setNumeroMesaSelecionada(numero);
    setTipoVenda('mesa');
    setDeliverySelecionado('');
    setComandaSelecionada(null);
  };

  // Selecionar comanda
  const selecionarComanda = (comanda: any) => {
    setComandaSelecionada(comanda);
    setTipoVenda('comanda');
    setMesaSelecionada('');
    setNumeroMesaSelecionada(0);
    setDeliverySelecionado('');
  };

  // Criar nova comanda
  const handleCriarComanda = async () => {
    if (!novoClienteComanda.trim()) {
      toast({ variant: 'destructive', title: 'Informe o nome do cliente' });
      return;
    }

    try {
      const result = await criarComanda(novoClienteComanda, observacaoComanda);
      
      toast({ title: `Comanda #${result.numero} criada para ${novoClienteComanda}` });
      
      setDialogComanda(false);
      setNovoClienteComanda('');
      setObservacaoComanda('');
      
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
      toast({ variant: 'destructive', title: 'Erro ao criar comanda' });
    }
  };

  // Iniciar delivery
  const iniciarDelivery = () => {
    if (!deliveryInfo.nome) {
      toast({ variant: 'destructive', title: 'Informe o nome do cliente' });
      return;
    }
    const deliveryId = 'DEL_' + Date.now();
    setDeliverySelecionado(deliveryId);
    setTipoVenda('delivery');
    setDialogDelivery(false);
    toast({ title: `Delivery iniciado para: ${deliveryInfo.nome}` });
  };

  // Trocar tipo de venda
  const trocarTipoVenda = (novoTipo: TipoVenda) => {
    if (novoTipo === 'mesa') {
      setMesaSelecionada('');
      setNumeroMesaSelecionada(0);
      setItensPedido([]);
      setComandaSelecionada(null);
    } else if (novoTipo === 'balcao') {
      setMesaSelecionada('');
      setNumeroMesaSelecionada(0);
      setDeliverySelecionado('');
      setComandaSelecionada(null);
      setItensPedido([]);
      setDeliveryInfo({ nome: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '', observacao: '' });
    } else if (novoTipo === 'delivery') {
      setMesaSelecionada('');
      setNumeroMesaSelecionada(0);
      setItensPedido([]);
      setComandaSelecionada(null);
      setDialogDelivery(true);
    } else if (novoTipo === 'comanda') {
      setMesaSelecionada('');
      setNumeroMesaSelecionada(0);
      setDeliverySelecionado('');
      setItensPedido([]);
    }
    setTipoVenda(novoTipo);
  };

  // Abrir modal de cupom fiscal com forma de pagamento selecionada
  const abrirCupomFiscal = (formaPagamento: string, pagamentosMultiplos?: Array<{forma: string; valor: number}>) => {
    setFormaPagamentoSelecionada(formaPagamento);
    setDialogPagamento(false);
    setDialogCupomFiscal(true);
    // Se vier de múltiplos pagamentos, mantém o estado
    if (pagamentosMultiplos && pagamentosMultiplos.length > 0) {
      // Os pagamentos já foram setados anteriormente
    }
  };

  // Finalizar venda com dados do cupom fiscal
  const finalizarVenda = async (dadosCupom: DadosCupomFiscal, formaPagamento: string) => {
    if (itensPedido.length === 0) {
      toast({ variant: 'destructive', title: 'Adicione itens ao pedido' });
      return;
    }

    setProcessando(true);
    try {
      let vendaId = '';
      
      if (tipoVenda === 'comanda') {
        // Finalizar comanda
        await finalizarComanda(comandaSelecionada.id, formaPagamento);
        
        // Log
        await registrarLog({
          empresaId: empresaId || '',
          usuarioId: user?.id || '',
          usuarioNome: user?.nome || '',
          acao: 'COMANDA_FECHADA',
          detalhes: `Comanda #${comandaSelecionada.numero} - ${comandaSelecionada.nomeCliente} - R$ ${total.toFixed(2)}`,
          tipo: 'venda',
        });

        toast({ title: '✓ Comanda fechada com sucesso!' });
        setComandaSelecionada(null);
      } else {
        // Criar venda no Supabase
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase não inicializado');

        // Criar venda - usando campos do schema correto
        const { data: vendaData, error: vendaError } = await supabase
          .from('vendas')
          .insert({
            empresa_id: empresaId,
            tipo: tipoVenda, // campo correto do schema
            canal: tipoVenda === 'delivery' ? 'delivery' : tipoVenda, // campo correto do schema
            status: 'fechada', // valor válido do CHECK constraint
            mesa_id: mesaSelecionada || null,
            total,
            forma_pagamento: formaPagamento,
            cliente_id: dadosCupom.clienteId || deliveryCliente?.id || null,
            nome_cliente: dadosCupom.nomeCliente || deliveryInfo?.nome || null,
            cpf_cliente: dadosCupom.cpfCliente || null,
            telefone_cliente: dadosCupom.cliente?.telefone || dadosCupom.cliente?.celular || deliveryInfo?.telefone || null,
            // Campos de entrega para delivery
            entrega_logradouro: tipoVenda === 'delivery' ? deliveryInfo?.endereco : null,
            entrega_numero: tipoVenda === 'delivery' ? deliveryInfo?.numero : null,
            entrega_complemento: tipoVenda === 'delivery' ? deliveryInfo?.complemento : null,
            entrega_bairro: tipoVenda === 'delivery' ? deliveryInfo?.bairro : null,
            entrega_cidade: tipoVenda === 'delivery' ? deliveryInfo?.cidade : null,
            entrega_cep: tipoVenda === 'delivery' ? deliveryInfo?.cep : null,
            observacao: tipoVenda === 'delivery' ? deliveryInfo?.observacao : null,
            criado_por: user?.id,
            criado_por_nome: user?.nome,
            criado_em: new Date().toISOString(),
            fechado_em: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (vendaError) throw vendaError;
        vendaId = vendaData.id;

        // Criar itens de venda - usando campos do schema correto
        const itensVenda = itensPedido.map(item => ({
          empresa_id: empresaId,
          venda_id: vendaData.id,
          produto_id: item.produtoId,
          nome: item.nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco, // campo correto do schema
          total: item.preco * item.quantidade,
        }));

        const { error: itensError } = await supabase
          .from('itens_venda')
          .insert(itensVenda);
        
        if (itensError) console.error('Erro ao criar itens:', itensError);

        // Baixar estoque de TODOS os itens + movimentação
        const itensNormais = itensPedido.filter(item => !item.isCombo);
        for (const item of itensNormais) {
          await debitarEstoqueVenda(supabase, empresaId, item.produtoId, item.quantidade, user?.id, user?.nome, vendaData.id);
        }

        // Baixar estoque dos itens componentes dos combos
        const combosVendidos = itensPedido.filter(item => item.isCombo);
        if (combosVendidos.length > 0) {
          const comboIds = combosVendidos.map(item => item.produtoId);
          const { data: comboData } = await supabase
            .from('combo_itens')
            .select('combo_produto_id, item_produto_id, quantidade, custo_incluido')
            .in('combo_produto_id', comboIds);

          if (comboData) {
            const reducoes = new Map<string, number>();
            for (const ci of comboData) {
              if (!ci.custo_incluido) continue;
              const comboVendido = combosVendidos.find(i => i.produtoId === ci.combo_produto_id);
              if (comboVendido) {
                reducoes.set(ci.item_produto_id, (reducoes.get(ci.item_produto_id) || 0) + ci.quantidade * comboVendido.quantidade);
              }
            }
            for (const [prodId, qtdTotal] of reducoes) {
              await debitarEstoqueVenda(supabase, empresaId, prodId, qtdTotal, user?.id, user?.nome, vendaData.id, `Combo venda ${vendaData.id.slice(-8)}`);
            }
          }
        }

        // Criar pagamento(s) - usando campos do schema correto
        const pagamentosParaSalvar = pagamentos.length > 0 ? pagamentos : [{ forma: formaPagamento, valor: total }];
        const pagamentosInsert = pagamentosParaSalvar.map(pg => ({
          empresa_id: empresaId,
          venda_id: vendaData.id,
          forma_pagamento: pg.forma,
          valor: pg.valor,
        }));

        const { error: pagamentosError } = await supabase
          .from('pagamentos')
          .insert(pagamentosInsert);
        
        if (pagamentosError) console.error('Erro ao criar pagamentos:', pagamentosError);

        // Limpar pedidos temporários
        if (tipoVenda === 'mesa' || tipoVenda === 'delivery') {
          const deletePromises = itensPedido.map(item => 
            supabase.from('pedidos_temp').delete().eq('id', item.id)
          );
          await Promise.all(deletePromises);
        }

        // Liberar mesa
        if (tipoVenda === 'mesa' && mesaSelecionada) {
          await atualizarMesa(mesaSelecionada, { status: 'livre' });
        }

        // Registrar no caixa (se houver)
        if (caixaAberto) {
          const { error: movError } = await supabase
            .from('movimentacoes_caixa')
            .insert({
              caixa_id: caixaAberto.id,
              empresa_id: empresaId,
              tipo: 'venda',
              valor: total,
              forma_pagamento: formaPagamento,
              venda_id: vendaData.id,
              descricao: `Venda - ${getTipoVendaLabel()}`,
              usuario_id: user?.id,
              usuario_nome: user?.nome,
              criado_em: new Date().toISOString(),
            });
          
          if (movError) console.error('Erro ao registrar movimentação:', movError);

          const { error: caixaError } = await supabase
            .from('caixas')
            .update({
              valor_atual: (caixaAberto.valor_atual || 0) + total,
              total_vendas: (caixaAberto.total_vendas || 0) + total,
              total_entradas: (caixaAberto.total_entradas || 0) + total,
            })
            .eq('id', caixaAberto.id);
          
          if (caixaError) console.error('Erro ao atualizar caixa:', caixaError);
        }

        // Log
        await registrarLog({
          empresaId: empresaId || '',
          usuarioId: user?.id || '',
          usuarioNome: user?.nome || '',
          acao: 'VENDA_FINALIZADA',
          detalhes: `Venda de ${itensPedido.length} itens - R$ ${total.toFixed(2)}${dadosCupom.cpfCliente ? ` - CPF: ${dadosCupom.cpfCliente}` : ''}`,
          tipo: 'venda',
        });

        // Imprimir cupom fiscal se solicitado
        if (dadosCupom.imprimirCupom) {
          imprimirCupomFiscal({
            nomeEmpresa: empresa?.nome || 'Sistema PDV',
            cnpjEmpresa: empresa?.cnpj || '',
            enderecoEmpresa: empresa?.endereco || '',
            cpfCliente: dadosCupom.cpfCliente,
            nomeCliente: dadosCupom.nomeCliente,
            itens: itensPedido.map(item => ({
              nome: item.nome,
              quantidade: item.quantidade,
              preco: item.preco,
              codigo: item.codigo || '',
              unidade: item.unidade || 'UN',
            })),
            total,
            formaPagamento,
            tamanhoCupom: dadosCupom.tamanhoCupom,
            codigoVenda: vendaId.slice(-8).toUpperCase(),
            configuracoes: dadosCupom.configuracoes,
            cliente: dadosCupom.cliente || deliveryCliente || undefined,
            bairroEmpresa: empresa?.bairro || '',
            cidadeEmpresa: empresa?.cidade || '',
            ufEmpresa: empresa?.estado || '',
            vendedor: user?.nome || 'ADMINISTRADOR',
          });
        }

        toast({ title: '✓ Venda finalizada com sucesso!' });
      }

      setDialogCupomFiscal(false);
      setDialogPagamento(false);
      setItensPedido([]);
      setMesaSelecionada('');
      setNumeroMesaSelecionada(0);
      
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      toast({ variant: 'destructive', title: 'Erro ao finalizar venda' });
    } finally {
      setProcessando(false);
    }
  };

  // Imprimir comanda
  const imprimirComanda = () => {
    window.print();
  };

  // Abrir caixa com tratamento de erro
  const handleAbrirCaixa = async () => {
    const valor = parseFloat(valorAberturaCaixa) || 0;
    if (valor < 0) {
      toast({ variant: 'destructive', title: 'Informe um valor válido' });
      return;
    }

    setAbrindoCaixa(true);
    try {
      await abrirCaixa(valor, '');
      toast({ title: '✓ Caixa aberto com sucesso!' });
      setDialogAberturaCaixa(false);
      setValorAberturaCaixa('');
    } catch (error: any) {
      console.error('Erro ao abrir caixa:', error);
      const msg = error?.message || 'Erro desconhecido';
      toast({
        variant: 'destructive',
        title: 'Erro ao abrir caixa',
        description: msg.includes('406')
          ? 'Permissão negada. Execute o script SQL de correção (fix-caixas-rls.sql) no Supabase.'
          : msg,
      });
    } finally {
      setAbrindoCaixa(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-[#1a1a2e] dark:to-[#1e2235]">
          <Loader2 className={`h-12 w-12 animate-spin ${darkMode ? 'text-teal-400' : 'text-orange-500'}`} />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
      <div className={`h-screen flex flex-col ${darkMode ? 'bg-[#1a1a2e]' : 'bg-white'}`}>
        
        {/* HEADER */}
        <header className={`${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-blue-100'} px-3 py-1.5 flex items-center justify-between shrink-0 shadow-sm`}>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${darkMode ? 'text-yellow-400 hover:text-yellow-300 hover:bg-white/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}
              onClick={() => setTheme(darkMode ? 'light' : 'dark')}
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
              onClick={() => router.push('/admin/dashboard')}
              title="Voltar ao menu"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shadow-sm text-sm">
              {user?.nome?.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm leading-tight">{user?.nome}</p>
              <p className="text-[10px] text-gray-500 leading-tight">Ponto de Venda</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${caixaAberto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} shadow-sm`}>
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{caixaAberto ? 'Caixa Aberto' : 'Caixa Fechado'}</span>
            </div>

            {!caixaAberto ? (
              <Button
                size="sm"
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm inline-flex"
                onClick={() => setDialogAberturaCaixa(true)}
              >
                Abrir Caixa
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm inline-flex"
                onClick={() => fecharCaixa(caixaAberto.valor_atual || 0)}
              >
                Fechar Caixa
              </Button>
            )}

            <Badge className="bg-blue-100 text-blue-700 px-2 sm:px-3 py-1 text-xs font-bold shadow-sm">
              {getTipoVendaLabel()}
            </Badge>

            {/* Botão carrinho mobile no header - sempre visível */}
            {isMobile && (
              <Button
                variant="outline"
                onClick={() => setShowCartMobile(true)}
                className="gap-1 h-7 text-xs font-bold shadow-sm border-blue-300 text-blue-600 hover:bg-blue-50 relative"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {itensPedido.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-green-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {itensPedido.length}
                  </span>
                )}
                <span className="hidden sm:inline">Pedido</span>
              </Button>
            )}

            <Button 
              variant="destructive" 
              onClick={handleLogout} 
              className="gap-1 h-7 text-xs bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">SAIR</span>
            </Button>
          </div>
        </header>

        {/* SELEÇÃO DE TIPO DE VENDA */}
        <div className={`${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-blue-50 border-blue-100'} px-3 py-1.5 flex gap-2 items-center shadow-sm overflow-x-auto`}>
          <span className={`text-xs font-bold uppercase whitespace-nowrap ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Tipo:</span>
          <Button
            variant={tipoVenda === 'balcao' ? 'default' : 'outline'}
            size="sm"
            className={`h-7 text-xs font-bold transition-all whitespace-nowrap ${tipoVenda === 'balcao' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'border border-blue-300 text-blue-600 hover:bg-blue-50'}`}
            onClick={() => trocarTipoVenda('balcao')}
          >
            <Package className="h-3.5 w-3.5 mr-1" />
            Balcão
          </Button>
          <Button
            variant={tipoVenda === 'mesa' ? 'default' : 'outline'}
            size="sm"
            className={`h-7 text-xs font-bold transition-all whitespace-nowrap ${tipoVenda === 'mesa' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'border border-blue-300 text-blue-600 hover:bg-blue-50'}`}
            onClick={() => trocarTipoVenda('mesa')}
          >
            <UtensilsCrossed className="h-3.5 w-3.5 mr-1" />
            Mesa
          </Button>
          <Button
            variant={tipoVenda === 'comanda' ? 'default' : 'outline'}
            size="sm"
            className={`h-7 text-xs font-bold transition-all whitespace-nowrap ${tipoVenda === 'comanda' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'border border-blue-300 text-blue-600 hover:bg-blue-50'}`}
            onClick={() => trocarTipoVenda('comanda')}
          >
            <ClipboardList className="h-3.5 w-3.5 mr-1" />
            Comanda
          </Button>
          <Button
            variant={tipoVenda === 'delivery' ? 'default' : 'outline'}
            size="sm"
            className={`h-7 text-xs font-bold transition-all whitespace-nowrap ${tipoVenda === 'delivery' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'border border-blue-300 text-blue-600 hover:bg-blue-50'}`}
            onClick={() => trocarTipoVenda('delivery')}
          >
            <Truck className="h-3.5 w-3.5 mr-1" />
            Delivery
          </Button>

          {/* Mobile trigger for mesas/comandas side panel */}
          {isMobile && (tipoVenda === 'mesa' || tipoVenda === 'comanda') && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs font-bold transition-all whitespace-nowrap border border-blue-300 text-blue-600 hover:bg-blue-50 lg:hidden"
              onClick={() => setShowSidePanelMobile(true)}
            >
              {tipoVenda === 'mesa' ? (
                <><UtensilsCrossed className="h-3.5 w-3.5 mr-1" /> Mesas</>
              ) : (
                <><ClipboardList className="h-3.5 w-3.5 mr-1" /> Comandas</>
              )}
            </Button>
          )}
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 flex overflow-hidden gap-2 p-2">
          
          {/* COLUNA ESQUERDA - MESAS (se selecionado) - DESKTOP ONLY */}
          {!isMobile && tipoVenda === 'mesa' && (
            <div className={`w-40 ${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-blue-100'} rounded-lg shadow-sm flex flex-col overflow-hidden`}>
              <div className={`${darkMode ? 'bg-[#1a1a2e] border-white/10 text-teal-400' : 'bg-blue-50 border-blue-100 text-blue-700'} px-3 py-2 font-bold text-xs border-b`}>
                MESAS
              </div>
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1.5">
                  {mesasOrdenadas.map(mesa => (
                    <button
                      key={mesa.id}
                      onClick={() => selecionarMesa(mesa.id, mesa.numero, mesa.status)}
                      className={`w-full p-2 rounded-lg font-bold transition-all transform hover:scale-105 ${
                        mesaSelecionada === mesa.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : mesa.status === 'livre'
                          ? darkMode ? 'bg-green-900/30 text-green-400 hover:shadow-sm' : 'bg-green-50 text-green-700 hover:shadow-sm'
                          : darkMode ? 'bg-red-900/30 text-red-400 hover:shadow-sm' : 'bg-red-50 text-red-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Mesa {mesa.numero}</span>
                        <Badge className={`text-[10px] font-bold ${mesa.status === 'livre' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                          {mesa.status === 'livre' ? 'Livre' : 'Ocupada'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* COLUNA ESQUERDA - COMANDAS (se selecionado) - DESKTOP ONLY */}
          {!isMobile && tipoVenda === 'comanda' && (
            <div className={`w-48 ${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-blue-100'} rounded-lg shadow-sm flex flex-col overflow-hidden`}>
              <div className={`${darkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-blue-50 border-blue-100'} px-4 py-3 flex items-center justify-between border-b`}>
                <span className={`${darkMode ? 'text-teal-400' : 'text-blue-700'} font-bold`}>COMANDAS</span>
                <Button 
                  size="sm" 
                  className="h-7 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setDialogComanda(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1 p-3">
                {comandas.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma comanda aberta</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-3"
                      onClick={() => setDialogComanda(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Nova Comanda
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {comandas.map(comanda => (
                      <button
                        key={comanda.id}
                        onClick={() => selecionarComanda(comanda)}
                        className={`w-full p-3 rounded-lg font-bold transition-all transform hover:scale-105 text-left ${
                          comandaSelecionada?.id === comanda.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : darkMode ? 'bg-purple-900/30 text-purple-400 hover:shadow-sm' : 'bg-purple-50 text-purple-700 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg">#{comanda.numero}</span>
                          <Badge className="bg-purple-500 text-white text-xs">
                            R$ {(comanda.total || 0).toFixed(2)}
                          </Badge>
                        </div>
                        <p className="text-sm truncate opacity-80">{comanda.nomeCliente}</p>
                        <p className="text-xs opacity-60">
                          {comanda.itens?.length || 0} itens
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* COLUNA CENTRAL - PRODUTOS */}
          <div className={`flex-1 flex flex-col overflow-hidden ${darkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-white border-blue-100'} rounded-lg shadow-sm`}>
            
            {/* CATEGORIAS */}
            <div className={`${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-blue-50 border-blue-100'} px-3 py-1.5 flex gap-1.5 overflow-x-auto border-b`}>
              <Button
                size="sm"
                variant={categoriaAtiva === 'todos' ? 'default' : 'outline'}
                className={`h-7 text-xs font-bold whitespace-nowrap transition-all ${categoriaAtiva === 'todos' ? 'bg-blue-600 text-white shadow-sm' : darkMode ? 'bg-[#1a1a2e] text-teal-400 border-white/20 hover:bg-[#2a2a42]' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                onClick={() => setCategoriaAtiva('todos')}
              >
                Todos
              </Button>
              {(categorias || []).map(cat => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={categoriaAtiva === cat.id ? 'default' : 'outline'}
                  style={categoriaAtiva === cat.id ? { backgroundColor: cat.cor, color: 'white' } : { borderColor: cat.cor, color: cat.cor }}
                  className={`h-7 text-xs font-bold whitespace-nowrap transition-all ${categoriaAtiva === cat.id ? 'shadow-md' : darkMode ? 'bg-[#1a1a2e] hover:shadow-md' : 'bg-white hover:shadow-md'}`}
                  onClick={() => setCategoriaAtiva(cat.id)}
                >
                  {cat.nome}
                </Button>
              ))}
            </div>

            {/* BUSCA */}
            <div className={`px-3 py-2 ${darkMode ? 'border-white/10 bg-[#1a1a2e]' : 'border-blue-100 bg-white'} border-b`}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="🔍 Buscar produto ou código de barras..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm border border-blue-200 focus:border-blue-500 rounded-lg font-semibold"
                  autoFocus
                />
              </div>
            </div>

            {/* GRID PRODUTOS */}
            <div className="flex-1 overflow-y-auto p-2">
              {produtosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Package className="h-16 w-16 mb-3 opacity-30" />
                  <p className="text-base font-bold">Nenhum produto cadastrado</p>
                  <p className="text-xs">O admin precisa cadastrar produtos primeiro</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                  {(produtosFiltrados || []).map(produto => {
                    const corCategoria = getCorCategoria(produto.categoriaId);
                    return (
                      <button
                        key={produto.id}
                        className={`group rounded-lg p-2.5 hover:shadow-md active:scale-95 transition-all border-2 ${darkMode ? 'bg-[#1e1e32] hover:border-teal-400' : 'bg-white hover:border-blue-300'} overflow-hidden relative text-left`}
                        style={{ borderLeftWidth: '5px', borderLeftColor: corCategoria }}
                        onClick={() => adicionarProduto(produto)}
                      >
                        <p className={`text-sm font-bold group-hover:text-blue-600 leading-snug ${darkMode ? 'text-slate-200' : 'text-gray-800'}`} style={{ lineHeight: '1.25' }}>{produto.nome}</p>
                        <p className="text-base font-extrabold text-green-600 mt-1 leading-tight">
                          R$ {(produto.preco || 0).toFixed(2)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA - CARRINHO - DESKTOP ONLY */}
          {!isMobile && (
          <div className={`w-64 ${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-blue-100'} rounded-lg shadow-sm flex flex-col overflow-hidden h-full`}>
            
            {/* HEADER CARRINHO */}
            <div className={`${darkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-blue-50 border-blue-100'} px-2 py-2 shrink-0 border-b`}>
              <div className="flex items-center justify-between mb-0.5">
                <h2 className={`text-sm font-bold flex items-center gap-1.5 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  PEDIDO
                </h2>
                {itensPedido.length > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 font-bold text-xs px-2 py-0.5">
                    {itensPedido.length}
                  </Badge>
                )}
              </div>
              <p className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                {getTipoVendaLabel()}
                {tipoVenda === 'comanda' && comandaSelecionada && (
                  <span className="ml-2 text-purple-600">
                    - {comandaSelecionada.nomeCliente}
                  </span>
                )}
              </p>
              
              {tipoVenda === 'comanda' && !comandaSelecionada && (
                <Button 
                  size="sm" 
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setDialogComanda(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Nova Comanda
                </Button>
              )}

              {(tipoVenda === 'delivery' || tipoVenda === 'comanda') && itensPedido.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={imprimirComanda}
                  className="w-full mt-3 border border-blue-300 text-blue-600 hover:bg-blue-50 font-bold"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Comanda
                </Button>
              )}
            </div>

            {/* ITENS DO CARRINHO */}
            <ScrollArea className="flex-1 p-3 min-h-0 h-0">
              {itensPedido.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                  <p className="font-bold text-gray-600 text-sm">Carrinho vazio</p>
                  <p className="text-xs text-gray-500 mt-1">Clique nos produtos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(itensPedido || []).map((item, index) => (
                    <div key={item.id} className={`${darkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-blue-50 border-blue-100'} rounded-lg p-2 hover:border-blue-300 transition-all shadow-sm`}>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full shrink-0">#{index + 1}</span>
                            <p className="font-bold text-gray-800 text-sm truncate">{item.nome}</p>
                          </div>
                        </div>
                        <button
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-all shrink-0"
                          onClick={() => removerItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center font-bold transition-all shadow-sm"
                            onClick={() => alterarQtd(item.id, -1, item.quantidade)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center font-bold text-base text-gray-800">{item.quantidade}</span>
                          <button
                            className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold transition-all shadow-sm"
                            onClick={() => alterarQtd(item.id, 1, item.quantidade)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="font-bold text-base text-green-600">
                          R$ {(item.preco * item.quantidade).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* TOTAL E FINALIZAR */}
            <div className={`p-2 ${darkMode ? 'border-white/10 bg-[#1e1e32]' : 'border-blue-100 bg-white'} space-y-1.5 shrink-0`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700">TOTAL:</span>
                <span className="text-xl font-extrabold text-green-600">
                  R$ {total.toFixed(2)}
                </span>
              </div>
              
              <Button
                className="w-full h-9 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={itensPedido.length === 0 || processando || (tipoVenda === 'comanda' && !comandaSelecionada)}
                onClick={() => setDialogPagamento(true)}
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                {processando ? 'Processando...' : 'FINALIZAR VENDA'}
              </Button>

              {itensPedido.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border border-red-300 text-red-600 hover:bg-red-50 font-bold h-7 text-xs"
                  onClick={limparPedido}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpar Carrinho
                </Button>
              )}
            </div>
          </div>
          )}
        </div>

        {/* MOBILE FLOATING CART BUTTON - aparece quando há itens no carrinho */}
        {isMobile && itensPedido.length > 0 && (
          <button
            onClick={() => setShowCartMobile(true)}
            className="fixed bottom-4 right-4 z-50 bg-green-600 text-white rounded-full shadow-2xl flex items-center gap-2 px-4 py-3 font-bold text-sm hover:bg-green-700 active:scale-95 transition-all border-2 border-green-400"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>{itensPedido.length}</span>
            <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
              R$ {total.toFixed(2)}
            </span>
          </button>
        )}

        {/* MOBILE FLOATING CART BUTTON - quando carrinho vazio */}
        {isMobile && itensPedido.length === 0 && (
          <button
            onClick={() => setShowCartMobile(true)}
            className="fixed bottom-4 right-4 z-50 bg-white text-blue-600 rounded-full shadow-lg flex items-center gap-1.5 px-3 py-2.5 font-bold text-xs hover:bg-blue-50 active:scale-95 transition-all border-2 border-blue-200"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Pedido</span>
          </button>
        )}

        {/* MOBILE CART SHEET */}
        <Sheet open={showCartMobile && isMobile} onOpenChange={setShowCartMobile}>
          <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col">
            <SheetHeader className={`${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-blue-50 border-blue-100'} px-4 py-3 shrink-0`}>
              <SheetTitle className={`flex items-center gap-2 text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                PEDIDO
                {itensPedido.length > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 font-bold text-xs px-2 py-0.5">
                    {itensPedido.length}
                  </Badge>
                )}
              </SheetTitle>
            </SheetHeader>

            <div className={`px-4 py-2 ${darkMode ? 'border-white/10 bg-[#1a1a2e]' : 'border-blue-100 bg-white'} shrink-0`}>
              <p className="text-xs text-gray-600 font-semibold">
                {getTipoVendaLabel()}
                {tipoVenda === 'comanda' && comandaSelecionada && (
                  <span className="ml-2 text-purple-600">
                    - {comandaSelecionada.nomeCliente}
                  </span>
                )}
              </p>
              {tipoVenda === 'comanda' && !comandaSelecionada && (
                <Button
                  size="sm"
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => { setShowCartMobile(false); setDialogComanda(true); }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Nova Comanda
                </Button>
              )}
              {(tipoVenda === 'delivery' || tipoVenda === 'comanda') && itensPedido.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={imprimirComanda}
                  className="w-full mt-2 border border-blue-300 text-blue-600 hover:bg-blue-50 font-bold"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Comanda
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 p-3">
              {itensPedido.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                  <p className="font-bold text-gray-600 text-sm">Carrinho vazio</p>
                  <p className="text-xs text-gray-500 mt-1">Clique nos produtos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(itensPedido || []).map((item, index) => (
                    <div key={item.id} className={`${darkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-blue-50 border-blue-100'} rounded-lg p-2 hover:border-blue-300 transition-all shadow-sm`}>
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full shrink-0">#{index + 1}</span>
                            <p className="font-bold text-gray-800 text-sm truncate">{item.nome}</p>
                          </div>
                        </div>
                        <button
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-all shrink-0"
                          onClick={() => removerItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center font-bold transition-all shadow-sm"
                            onClick={() => alterarQtd(item.id, -1, item.quantidade)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center font-bold text-base text-gray-800">{item.quantidade}</span>
                          <button
                            className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold transition-all shadow-sm"
                            onClick={() => alterarQtd(item.id, 1, item.quantidade)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="font-bold text-base text-green-600">
                          R$ {(item.preco * item.quantidade).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className={`p-3 ${darkMode ? 'border-white/10 bg-[#1e1e32]' : 'border-blue-100 bg-white'} space-y-1.5 shrink-0`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700">TOTAL:</span>
                <span className="text-xl font-extrabold text-green-600">
                  R$ {total.toFixed(2)}
                </span>
              </div>
              <Button
                className="w-full h-9 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={itensPedido.length === 0 || processando || (tipoVenda === 'comanda' && !comandaSelecionada)}
                onClick={() => { setShowCartMobile(false); setDialogPagamento(true); }}
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                {processando ? 'Processando...' : 'FINALIZAR VENDA'}
              </Button>
              {itensPedido.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border border-red-300 text-red-600 hover:bg-red-50 font-bold h-7 text-xs"
                  onClick={limparPedido}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpar Carrinho
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* MOBILE SIDE PANEL SHEET (MESAS / COMANDAS) */}
        <Sheet open={showSidePanelMobile && isMobile && (tipoVenda === 'mesa' || tipoVenda === 'comanda')} onOpenChange={setShowSidePanelMobile}>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            {tipoVenda === 'mesa' && (
              <>
                <SheetHeader className={`${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-blue-50 border-blue-100'} px-4 py-3 shrink-0`}>
                  <SheetTitle className={`${darkMode ? 'text-teal-400' : 'text-blue-700'} font-bold text-sm`}>MESAS</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-1.5">
                    {mesasOrdenadas.map(mesa => (
                      <button
                        key={mesa.id}
                        onClick={() => { selecionarMesa(mesa.id, mesa.numero, mesa.status); setShowSidePanelMobile(false); }}
                        className={`w-full p-2 rounded-lg font-bold transition-all transform hover:scale-105 ${
                          mesaSelecionada === mesa.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : mesa.status === 'livre'
                            ? darkMode ? 'bg-green-900/30 text-green-400 hover:shadow-sm' : 'bg-green-50 text-green-700 hover:shadow-sm'
                            : darkMode ? 'bg-red-900/30 text-red-400 hover:shadow-sm' : 'bg-red-50 text-red-700 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Mesa {mesa.numero}</span>
                          <Badge className={`text-[10px] font-bold ${mesa.status === 'livre' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                            {mesa.status === 'livre' ? 'Livre' : 'Ocupada'}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
            {tipoVenda === 'comanda' && (
              <>
                <SheetHeader className={`${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-blue-50 border-blue-100'} px-4 py-3 shrink-0`}>
                  <div className="flex items-center justify-between w-full">
                    <SheetTitle className={`${darkMode ? 'text-teal-400' : 'text-blue-700'} font-bold text-sm`}>COMANDAS</SheetTitle>
                    <Button
                      size="sm"
                      className="h-7 bg-blue-600 hover:bg-blue-700"
                      onClick={() => { setShowSidePanelMobile(false); setDialogComanda(true); }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </SheetHeader>
                <ScrollArea className="flex-1 p-3">
                  {comandas.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma comanda aberta</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => { setShowSidePanelMobile(false); setDialogComanda(true); }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Nova Comanda
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {comandas.map(comanda => (
                        <button
                          key={comanda.id}
                          onClick={() => { selecionarComanda(comanda); setShowSidePanelMobile(false); }}
                          className={`w-full p-3 rounded-lg font-bold transition-all transform hover:scale-105 text-left ${
                            comandaSelecionada?.id === comanda.id
                              ? 'bg-blue-600 text-white shadow-md'
                              : darkMode ? 'bg-purple-900/30 text-purple-400 hover:shadow-sm' : 'bg-purple-50 text-purple-700 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-lg">#{comanda.numero}</span>
                            <Badge className="bg-purple-500 text-white text-xs">
                              R$ {(comanda.total || 0).toFixed(2)}
                            </Badge>
                          </div>
                          <p className="text-sm truncate opacity-80">{comanda.nomeCliente}</p>
                          <p className="text-xs opacity-60">
                            {comanda.itens?.length || 0} itens
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>

      {/* DIALOG NOVA COMANDA */}
      <Dialog open={dialogComanda} onOpenChange={setDialogComanda}>
        <DialogContent className="max-w-md border border-blue-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <ClipboardList className="h-6 w-6" />
              Nova Comanda
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Crie uma comanda para controlar os pedidos do cliente
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Nome do Cliente *</Label>
              <Input 
                value={novoClienteComanda}
                onChange={(e) => setNovoClienteComanda(e.target.value)}
                placeholder="Ex: João da Silva"
                className="border border-blue-200 focus:border-purple-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Observação</Label>
              <Textarea 
                value={observacaoComanda}
                onChange={(e) => setObservacaoComanda(e.target.value)}
                placeholder="Ex: Mesa 5, Aniversário, etc."
                rows={2}
                className="border border-blue-200 focus:border-purple-500"
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setDialogComanda(false);
                setNovoClienteComanda('');
                setObservacaoComanda('');
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCriarComanda}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Criar Comanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG DELIVERY */}
      <Dialog open={dialogDelivery} onOpenChange={(open) => { if (!open) setDeliveryCliente(null); setDialogDelivery(open); }}>
        <DialogContent className={`max-w-lg ${darkMode ? 'border-white/10 bg-[#1e1e32]' : 'border-blue-200 bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${darkMode ? 'text-teal-400' : 'text-blue-600'}`}>
              <Truck className="h-6 w-6" />
              Novo Delivery
            </DialogTitle>
            <DialogDescription className={`${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Identifique o cliente e preencha o endereço de entrega</DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {/* Busca de Cliente no Delivery */}
            <BuscaCliente
              onSelect={(cliente) => {
                setDeliveryCliente(cliente);
                if (cliente) {
                  setDeliveryInfo({
                    ...deliveryInfo,
                    nome: cliente.nome_razao_social,
                    telefone: cliente.telefone || cliente.celular || deliveryInfo.telefone,
                    endereco: cliente.logradouro || deliveryInfo.endereco,
                    numero: cliente.numero || deliveryInfo.numero,
                    complemento: cliente.complemento || deliveryInfo.complemento,
                    bairro: cliente.bairro || deliveryInfo.bairro,
                    cidade: cliente.municipio || deliveryInfo.cidade,
                    cep: cliente.cep || deliveryInfo.cep,
                  });
                }
              }}
              selected={deliveryCliente}
              placeholder="Buscar cliente cadastrado por nome ou CPF..."
              label="Buscar Cliente Cadastrado"
              showActions={false}
            />

            {deliveryCliente && (
              <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-green-400 bg-green-900/20 border-green-900/30' : 'text-green-600 bg-green-50 border-green-200'} px-3 py-2 rounded-lg border`}>
                <CheckCircle className="h-3.5 w-3.5" />
                Dados preenchidos automaticamente. Edite se necessário.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Nome *</Label>
                <Input 
                  value={deliveryInfo.nome} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, nome: e.target.value})}
                  className="border border-blue-200 focus:border-blue-500 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Telefone *</Label>
                <Input 
                  value={deliveryInfo.telefone} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, telefone: e.target.value})}
                  className="border border-blue-200 focus:border-blue-500 rounded-lg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="font-bold">Endereço *</Label>
                <Input 
                  value={deliveryInfo.endereco} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, endereco: e.target.value})}
                  className="border border-blue-200 focus:border-blue-500 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Número *</Label>
                <Input 
                  value={deliveryInfo.numero} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, numero: e.target.value})}
                  className="border border-blue-200 focus:border-blue-500 rounded-lg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Complemento</Label>
                <Input 
                  value={deliveryInfo.complemento} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, complemento: e.target.value})}
                  className="border border-blue-200 focus:border-blue-500 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Bairro *</Label>
                <Input 
                  value={deliveryInfo.bairro} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, bairro: e.target.value})}
                  className="border border-blue-200 focus:border-blue-500 rounded-lg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Cidade *</Label>
                <Input 
                  value={deliveryInfo.cidade} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, cidade: e.target.value})}
                  className="border border-blue-200 focus:border-blue-500 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">CEP</Label>
                <Input 
                  value={deliveryInfo.cep} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, cep: e.target.value})}
                  className="border border-blue-200 focus:border-blue-500 rounded-lg"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="font-bold">Observação</Label>
              <Textarea 
                value={deliveryInfo.observacao} 
                onChange={(e) => setDeliveryInfo({...deliveryInfo, observacao: e.target.value})}
                rows={2}
                className="border border-blue-200 focus:border-blue-500 rounded-lg"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogDelivery(false)} 
              className="flex-1 border border-gray-300 hover:bg-gray-100 font-bold"
            >
              Cancelar
            </Button>
            <Button 
              onClick={iniciarDelivery} 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
            >
              <Truck className="h-4 w-4 mr-2" />
              Iniciar Delivery
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG PAGAMENTO */}
      <Dialog open={dialogPagamento} onOpenChange={setDialogPagamento}>
        <DialogContent className={`max-w-lg border ${darkMode ? 'border-white/10 bg-[#1e1e32]' : 'border-blue-200 bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`text-2xl text-center font-bold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
              Forma de Pagamento
            </DialogTitle>
            <DialogDescription className={`text-center font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-700'}`}>{getTipoVendaLabel()}</DialogDescription>
          </DialogHeader>
          
          {/* Resumo do pagamento */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className={`py-3 rounded-lg border ${darkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-blue-50 border-blue-100'}`}>
              <p className="text-xs text-gray-500 uppercase font-medium">Total</p>
              <p className="text-2xl font-extrabold text-blue-600">R$ {total.toFixed(2)}</p>
            </div>
            <div className={`py-3 rounded-lg border ${totalPago >= total ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
              <p className="text-xs text-gray-500 uppercase font-medium">Pago</p>
              <p className={`text-2xl font-extrabold ${totalPago >= total ? 'text-green-600' : 'text-orange-600'}`}>R$ {totalPago.toFixed(2)}</p>
            </div>
          </div>

          {/* Lista de pagamentos adicionados */}
          {pagamentos.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Pagamentos adicionados:</p>
              <div className="space-y-2">
                {pagamentos.map((pg, index) => (
                  <div key={index} className={`flex items-center justify-between ${darkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-gray-50 border'} rounded-lg p-3`}>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        pg.forma === 'dinheiro' ? 'bg-green-500' :
                        pg.forma === 'credito' ? 'bg-blue-500' :
                        pg.forma === 'debito' ? 'bg-indigo-500' : 'bg-cyan-500'
                      }>
                        {pg.forma === 'dinheiro' ? 'Dinheiro' :
                         pg.forma === 'credito' ? 'Crédito' :
                         pg.forma === 'debito' ? 'Débito' : 'PIX'}
                      </Badge>
                      <span className={`font-bold ${darkMode ? 'text-slate-200' : 'text-gray-700'}`}>R$ {pg.valor.toFixed(2)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                      onClick={() => removerPagamento(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saldo restante */}
          {totalPago < total && (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 text-center">
              <p className="text-sm text-orange-700 font-medium">Falta pagar:</p>
              <p className="text-xl font-bold text-orange-600">R$ {(total - totalPago).toFixed(2)}</p>
            </div>
          )}

          {/* Troco */}
          {totalPago > total && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
              <p className="text-sm text-green-700 font-medium">Troco:</p>
              <p className="text-xl font-bold text-green-600">R$ {(totalPago - total).toFixed(2)}</p>
            </div>
          )}

          {/* Adicionar pagamento */}
          {totalPago < total && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium text-gray-600">Adicionar pagamento:</p>
              
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Valor"
                  value={valorPagamentoAtual}
                  onChange={(e) => setValorPagamentoAtual(e.target.value)}
                  className="text-lg font-bold text-center"
                />
                <Button 
                  variant="outline"
                  onClick={() => setValorPagamentoAtual((total - totalPago).toFixed(2))}
                  className="font-bold"
                >
                  Valor Total
                </Button>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <Button 
                  size="sm"
                  className="h-14 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white" 
                  onClick={() => adicionarPagamento('dinheiro')} 
                >
                  <div className="flex flex-col items-center">
                    <Banknote className="h-5 w-5 mb-1" />
                    DINHEIRO
                  </div>
                </Button>
                <Button 
                  size="sm"
                  className="h-14 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white" 
                  onClick={() => adicionarPagamento('credito')} 
                >
                  <div className="flex flex-col items-center">
                    <CreditCard className="h-5 w-5 mb-1" />
                    CRÉDITO
                  </div>
                </Button>
                <Button 
                  size="sm"
                  className="h-14 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white" 
                  onClick={() => adicionarPagamento('debito')} 
                >
                  <div className="flex flex-col items-center">
                    <CreditCard className="h-5 w-5 mb-1" />
                    DÉBITO
                  </div>
                </Button>
                <Button 
                  size="sm"
                  className="h-14 text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white" 
                  onClick={() => adicionarPagamento('pix')} 
                >
                  <div className="flex flex-col items-center">
                    <Smartphone className="h-5 w-5 mb-1" />
                    PIX
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setDialogPagamento(false);
                setPagamentos([]);
                setValorPagamentoAtual('');
              }} 
              className="flex-1 border border-gray-300 hover:bg-gray-100 font-bold text-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              disabled={totalPago < total || processando}
              onClick={handleFinalizarComPagamentos}
            >
              {processando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Pagamento
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG CUPOM FISCAL */}
      <CupomFiscalModal
        open={dialogCupomFiscal}
        onOpenChange={setDialogCupomFiscal}
        onConfirmar={finalizarVenda}
        formaPagamento={formaPagamentoSelecionada}
        total={total}
        itens={itensPedido.map(item => ({
          nome: item.nome,
          quantidade: item.quantidade,
          preco: item.preco,
          codigo: item.codigo,
          unidade: item.unidade,
        }))}
        nomeEmpresa={empresa?.nome || 'Sistema PDV'}
        cnpjEmpresa={empresa?.cnpj || ''}
        enderecoEmpresa={empresa?.endereco || ''}
        processando={processando}
        bairroEmpresa={empresa?.bairro || ''}
        cidadeEmpresa={empresa?.cidade || ''}
        ufEmpresa={empresa?.estado || ''}
        vendedor={user?.nome || 'ADMINISTRADOR'}
      />

      {/* DIALOG ABERTURA DE CAIXA */}
      <Dialog open={dialogAberturaCaixa} onOpenChange={setDialogAberturaCaixa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              Abrir Caixa
            </DialogTitle>
            <DialogDescription>
              Informe o valor inicial em dinheiro no caixa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor Inicial (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={valorAberturaCaixa}
                onChange={(e) => setValorAberturaCaixa(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberturaCaixa(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAbrirCaixa} disabled={abrindoCaixa} className="bg-blue-600 hover:bg-blue-700">
              {abrindoCaixa && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Abrir Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </ProtectedRoute>
  );
}
