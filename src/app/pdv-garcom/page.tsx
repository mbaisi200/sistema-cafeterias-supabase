'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutos, useCategorias, useMesas, useCaixa, registrarLog } from '@/hooks/useFirestore';
import { CupomFiscalModal, imprimirCupomFiscal, DadosCupomFiscal } from '@/components/pdv/CupomFiscal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  LogOut,
  UtensilsCrossed,
  Loader2,
  Printer,
  CheckCircle,
  X,
  ChefHat,
  ArrowLeft,
  Send,
  DollarSign,
  QrCode,
  StickyNote,
  Clock,
  ClipboardList,
  RefreshCw,
  CircleCheck,
  CircleDot,
  Eraser,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ============================================================
// Types
// ============================================================
interface ItemPedido {
  id: string;
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  codigo: string;
  unidade: string;
  isCombo?: boolean;
  atendenteId: string;
  atendenteNome: string;
  tipoVenda: 'balcao' | 'mesa';
  mesaNumero?: number;
  statusEnvio?: string;
  entregue?: boolean;
  criadoEm: Date;
  _optimistic?: boolean;
}

interface Comanda {
  mesa_id: string;
  mesa_numero: number;
  itens: any[];
  totalItens: number;
  totalValor: number;
  atendenteNome: string;
  todosEnviados: boolean;
}

// ============================================================
// Helper: generate temp UUID
// ============================================================
function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================
// Main Component
// ============================================================
export default function PDVGarcomPage() {
  const { user, empresaId, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { categorias, loading: loadingCategorias } = useCategorias();
  const { mesas, loading: loadingMesas, atualizarMesa } = useMesas();
  const { caixaAberto, abrirCaixa } = useCaixa();

  // ── Screen States ──
  const [tela, setTela] = useState<'mesas' | 'produtos'>('mesas');

  // ── Mesa State ──
  const [mesaSelecionada, setMesaSelecionada] = useState<string>('');
  const [numeroMesaSelecionada, setNumeroMesaSelecionada] = useState<number>(0);

  // ── Cart State ──
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [showCart, setShowCart] = useState(false);

  // ── Product Navigation ──
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos');
  const [search, setSearch] = useState('');

  // ── Payment State ──
  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [dialogCupomFiscal, setDialogCupomFiscal] = useState(false);
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<string>('');
  const [pagamentos, setPagamentos] = useState<Array<{ forma: string; valor: number }>>([]);
  const [valorPagamentoAtual, setValorPagamentoAtual] = useState('');
  const [processando, setProcessando] = useState(false);

  // ── Caixa State (independente do hook - verifica via API com service role) ──
  const [caixaStatus, setCaixaStatus] = useState<any | null>(null);
  const [caixaVerificado, setCaixaVerificado] = useState(false);

  // Verificar caixa aberto via API (independente de RLS/ sessão Supabase)
  const verificarCaixaAberto = useCallback(async () => {
    if (!empresaId) {
      setCaixaStatus(null);
      setCaixaVerificado(false);
      return;
    }
    try {
      const response = await fetch('/api/caixa-aberto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId }),
      });
      if (response.ok) {
        const result = await response.json();
        setCaixaStatus(result.caixa || null);
        setCaixaVerificado(true);
        console.log('[PDV-Garçom] Caixa verificado via API:', result.caixa ? 'ABERTO id=' + result.caixa.id : 'FECHADO');
        console.log('[PDV-Garçom] Debug API:', JSON.stringify(result.debug || {}));
      } else {
        console.error('[PDV-Garçom] API caixa-aberto retornou status:', response.status);
      }
    } catch (e) {
      console.warn('[PDV-Garçom] Erro ao verificar caixa:', e);
    }
  }, [empresaId]);

  // Verificar caixa ao carregar e a cada 30 segundos
  useEffect(() => {
    verificarCaixaAberto();
    const interval = setInterval(verificarCaixaAberto, 30000);
    return () => clearInterval(interval);
  }, [verificarCaixaAberto]);

  // Derivar: caixa está aberto se o hook OU a API diz que sim
  const caixaEstaAberto = caixaAberto || caixaStatus;

  // ── Caixa Dialog ──
  const [dialogCaixa, setDialogCaixa] = useState(false);
  const [valorAberturaCaixa, setValorAberturaCaixa] = useState('0');

  // ── Comandas State (for mesas screen) ──
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loadingComandas, setLoadingComandas] = useState(false);
  const [lastComandaRefresh, setLastComandaRefresh] = useState<number>(Date.now());

  // ── Adding product indicator ──
  const [adicionandoIds, setAdicionandoIds] = useState<Set<string>>(new Set());

  // ── Bounce animation for added products ──
  const [bounceProdutoId, setBounceProdutoId] = useState<string | null>(null);

  // ── Empresa Data ──
  const [empresa, setEmpresa] = useState<{
    nome: string;
    cnpj: string;
    endereco: string;
    bairro: string;
    cidade: string;
    estado: string;
    telefone: string;
  } | null>(null);

  // ============================================================
  // Load empresa data
  // ============================================================
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
          const partes = [data.logradouro, data.numero, data.complemento].filter(Boolean);
          setEmpresa({
            nome: data.nome || 'PDV',
            cnpj: data.cnpj || '',
            endereco: partes.join(', '),
            bairro: data.bairro || '',
            cidade: data.cidade || '',
            estado: data.estado || '',
            telefone: data.telefone || '',
          });
        }
      } catch (err) {
        console.error('Erro ao carregar empresa:', err);
      }
    };
    carregarEmpresa();
  }, [empresaId]);

  // ============================================================
  // Load comandas (all active pedidos_temp for empresa) for mesas screen
  // ============================================================
  const carregarComandas = useCallback(async () => {
    if (!empresaId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoadingComandas(true);
    try {
      const { data, error } = await supabase
        .from('pedidos_temp')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: true });

      if (!error && data) {
        // Group by mesa_id
        const grouped = new Map<string, any[]>();
        for (const item of data) {
          const key = item.mesa_id;
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          grouped.get(key)!.push(item);
        }

        const result: Comanda[] = [];
        grouped.forEach((itens: any[], mesaId: string) => {
          const totalItens = itens.reduce((acc: number, i: any) => acc + (i.quantidade || 1), 0);
          const totalValor = itens.reduce((acc: number, i: any) => acc + (i.preco || 0) * (i.quantidade || 1), 0);
          const todosEnviados = itens.every((i: any) => i.status_envio === 'enviado_cozinha');
          const atendente = itens[0]?.atendente_nome || '';

          result.push({
            mesa_id: mesaId,
            mesa_numero: itens[0]?.mesa_numero || 0,
            itens,
            totalItens,
            totalValor,
            atendenteNome: atendente,
            todosEnviados,
          });
        });

        // Sort by mesa number
        result.sort((a, b) => a.mesa_numero - b.mesa_numero);
        setComandas(result);
      }
      // Se data.length === 0, mantém o último estado (não limpa comandas)
    } catch (err) {
      console.error('Erro ao carregar comandas:', err);
      // Em caso de erro de rede, mantém o último estado conhecido
    } finally {
      setLoadingComandas(false);
    }
  }, [empresaId]);

  // Load comandas ALWAYS (not just on mesas screen) + auto-refresh every 5s
  // This ensures mesa status derived from comandas is always up-to-date
  useEffect(() => {
    carregarComandas();
    const interval = setInterval(carregarComandas, 5000);
    return () => clearInterval(interval);
  }, [empresaId, carregarComandas, lastComandaRefresh]);

  // ============================================================
  // Load pedidos for selected mesa
  // ============================================================
  useEffect(() => {
    if (!mesaSelecionada || !empresaId) {
      setItensPedido([]);
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
        // Only update from server if there are no optimistic items, or merge intelligently
        setItensPedido((prev) => {
          const optimisticIds = new Set(prev.filter((i) => i._optimistic).map((i) => i.id));
          const serverItems = data.map((item) => ({
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
            tipoVenda: 'mesa' as const,
            mesaNumero: item.mesa_numero,
            statusEnvio: item.status_envio || '',
            entregue: item.status_entrega === 'entregue',
            criadoEm: new Date(item.criado_em),
            _optimistic: false,
          })) as ItemPedido[];

          // If no optimistic items, just use server data
          if (optimisticIds.size === 0) return serverItems;

          // Otherwise, keep optimistic items that haven't appeared in server yet
          const serverProductIds = new Set(serverItems.map((i) => i.produtoId));
          const remainingOptimistic = prev.filter(
            (i) => i._optimistic && !serverItems.some((s) => s.produtoId === i.produtoId && s.nome === i.nome)
          );

          return [...serverItems, ...remainingOptimistic];
        });
      }
    };

    carregarPedidos();
    const interval = setInterval(carregarPedidos, 5000);
    return () => clearInterval(interval);
  }, [mesaSelecionada, empresaId]);

  // ============================================================
  // Auto-fill valorPagamentoAtual when dialog opens or totalPago changes
  // ============================================================
  const total = useMemo(() => itensPedido.reduce((acc, item) => acc + item.preco * item.quantidade, 0), [itensPedido]);
  const totalPago = useMemo(() => pagamentos.reduce((acc, pg) => acc + pg.valor, 0), [pagamentos]);
  const restante = Math.max(0, total - totalPago);

  useEffect(() => {
    if (dialogPagamento) {
      setValorPagamentoAtual(restante > 0 ? restante.toFixed(2) : total.toFixed(2));
    }
  }, [dialogPagamento, restante, total]);

  // ============================================================
  // Computed values
  // ============================================================
  const loading = loadingProdutos || loadingCategorias || loadingMesas;

  // Derive mesa status from actual pedidos_temp data (comandas)
  // If a mesa has active items in pedidos_temp, it's occupied; otherwise, free.
  // This is ALWAYS correct regardless of the mesas.status column.
  const mesasOrdenadas = useMemo(() => {
    const mesaHasItems = new Set<string>();
    for (const comanda of comandas) {
      mesaHasItems.add(comanda.mesa_id);
    }
    return (mesas || []).map((m) => ({
      ...m,
      status: mesaHasItems.has(m.id) ? 'ocupada' : 'livre',
    })).sort((a, b) => a.numero - b.numero);
  }, [mesas, comandas]);

  // Build a map of mesa_id -> item count from comandas
  const mesaItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const comanda of comandas) {
      counts.set(comanda.mesa_id, comanda.totalItens);
    }
    return counts;
  }, [comandas]);

  const produtosFiltrados = useMemo(() => {
    let lista = produtos || [];
    if (categoriaAtiva !== 'todos') {
      lista = lista.filter((p) => p.categoriaId === categoriaAtiva);
    }
    if (search) {
      const s = search.toLowerCase();
      lista = lista.filter(
        (p) =>
          p.nome.toLowerCase().includes(s) ||
          (p.codigoBarras && p.codigoBarras.includes(search)) ||
          (p.codigo && p.codigo.toLowerCase().includes(s))
      );
    }
    return lista;
  }, [produtos, categoriaAtiva, search]);

  const getCorCategoria = useCallback(
    (categoriaId: string) => {
      const categoria = categorias?.find((c) => c.id === categoriaId);
      return categoria?.cor || '#16a34a';
    },
    [categorias]
  );

  const itemCount = useMemo(() => itensPedido.reduce((acc, i) => acc + i.quantidade, 0), [itensPedido]);

  // ============================================================
  // Actions
  // ============================================================
  const selecionarMesa = (mesaId: string, numero: number) => {
    setMesaSelecionada(mesaId);
    setNumeroMesaSelecionada(numero);
    setTela('produtos');
    setCategoriaAtiva('todos');
    setSearch('');
  };

  const voltarParaMesas = () => {
    setTela('mesas');
    setMesaSelecionada('');
    setNumeroMesaSelecionada(0);
    setItensPedido([]);
    setCategoriaAtiva('todos');
    setSearch('');
    setShowCart(false);
    setPagamentos([]);
    setLastComandaRefresh(Date.now());
  };

  const adicionarProduto = async (produto: (typeof produtos)[0]) => {
    if (!produto.preco || produto.preco <= 0) {
      toast({ variant: 'destructive', title: 'Produto sem preço definido' });
      return;
    }
    if (!mesaSelecionada) {
      toast({ variant: 'destructive', title: 'Selecione uma mesa primeiro' });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Generate temp ID for optimistic update
    const tempId = generateTempId();

    // Optimistic local state update - add item IMMEDIATELY
    const optimisticItem: ItemPedido = {
      id: tempId,
      produtoId: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      quantidade: 1,
      codigo: produto.codigo || '',
      unidade: produto.unidade || 'UN',
      isCombo: produto.isCombo || false,
      atendenteId: user?.id || '',
      atendenteNome: user?.nome || '',
      tipoVenda: 'mesa',
      mesaNumero: numeroMesaSelecionada,
      statusEnvio: '',
      criadoEm: new Date(),
      _optimistic: true,
    };

    setItensPedido((prev) => [...prev, optimisticItem]);

    // Track adding state
    setAdicionandoIds((prev) => new Set(prev).add(tempId));

    // Trigger bounce animation
    setBounceProdutoId(produto.id);
    setTimeout(() => setBounceProdutoId(null), 300);

    // Fire Supabase INSERT in the background
    try {
      const { error } = await supabase
        .from('pedidos_temp')
        .insert({
          empresa_id: empresaId,
          mesa_id: mesaSelecionada,
          mesa_numero: numeroMesaSelecionada,
          produto_id: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: 1,
          codigo: produto.codigo || '',
          unidade: produto.unidade || 'UN',
          atendente_id: user?.id,
          atendente_nome: user?.nome,
          tipo_venda: 'mesa',
          criado_em: new Date().toISOString(),
        });

      if (error) throw error;

      // Mark optimistic item as confirmed (polling will sync real ID)
      setItensPedido((prev) =>
        prev.map((item) =>
          item.id === tempId ? { ...item, _optimistic: false } : item
        )
      );

      // Mark mesa as occupied in DB (for other components that use mesas.status)
      // Await this so the DB update happens as fast as possible
      await atualizarMesa(mesaSelecionada, { status: 'ocupada' })
        .catch(err => console.error('Erro ao ocupar mesa no DB:', err));

      // OPTIMISTIC: update comandas state immediately so mesa status reflects NOW
      setComandas((prev) => {
        const existing = prev.find((c) => c.mesa_id === mesaSelecionada);
        if (existing) {
          // Mesa already has a comanda, update counts
          return prev.map((c) =>
            c.mesa_id === mesaSelecionada
              ? {
                  ...c,
                  totalItens: c.totalItens + 1,
                  totalValor: c.totalValor + (produto.preco || 0),
                }
              : c
          );
        } else {
          // Create new comanda entry for this mesa
          const newComanda: Comanda = {
            mesa_id: mesaSelecionada,
            mesa_numero: numeroMesaSelecionada,
            itens: [{ nome: produto.nome, preco: produto.preco, quantidade: 1 }],
            totalItens: 1,
            totalValor: produto.preco || 0,
            atendenteNome: user?.nome || '',
            todosEnviados: false,
          };
          return [...prev, newComanda].sort((a, b) => a.mesa_numero - b.mesa_numero);
        }
      });

      // Also trigger background refresh to sync real data
      setLastComandaRefresh(Date.now());
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      // Rollback: remove the optimistic item
      setItensPedido((prev) => prev.filter((item) => item.id !== tempId));
      toast({ variant: 'destructive', title: 'Erro ao adicionar produto' });
    } finally {
      // Clear adding state
      setAdicionandoIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  };

  const alterarQtd = async (itemId: string, delta: number, quantidadeAtual: number) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const novaQtd = quantidadeAtual + delta;

    if (novaQtd <= 0) {
      // Otimistic: remove item do estado local IMEDIATAMENTE
      const itemParaRemover = itensPedido.find((i) => i.id === itemId);
      setItensPedido((prev) => prev.filter((i) => i.id !== itemId));

      // Otimistic: atualizar comandas localmente
      if (itemParaRemover) {
        const currentComanda = comandas.find((c) => c.mesa_id === mesaSelecionada);
        if (currentComanda && currentComanda.totalItens <= 1) {
          setComandas((prev) => prev.filter((c) => c.mesa_id !== mesaSelecionada));
        } else if (currentComanda) {
          setComandas((prev) =>
            prev.map((c) =>
              c.mesa_id === mesaSelecionada
                ? { ...c, totalItens: Math.max(0, c.totalItens - (itemParaRemover.quantidade || 1)), totalValor: Math.max(0, c.totalValor - (itemParaRemover.preco * itemParaRemover.quantidade)) }
                : c
            )
          );
        }
      }

      // Deletar no servidor em background
      supabase.from('pedidos_temp').delete().eq('id', itemId).catch((err) => {
        console.error('Erro ao deletar item:', err);
        toast({ variant: 'destructive', title: 'Erro ao remover item' });
      });
    } else {
      // Otimistic: atualizar quantidade localmente
      setItensPedido((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantidade: novaQtd } : i))
      );
      await supabase.from('pedidos_temp').update({ quantidade: novaQtd }).eq('id', itemId);
    }
  };

  const removerItem = async (itemId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Otimistic: remove item do estado local IMEDIATAMENTE
    const itemParaRemover = itensPedido.find((i) => i.id === itemId);
    setItensPedido((prev) => prev.filter((i) => i.id !== itemId));

    // Otimistic: atualizar comandas localmente
    if (itemParaRemover) {
      const currentComanda = comandas.find((c) => c.mesa_id === mesaSelecionada);
      if (currentComanda && currentComanda.totalItens <= 1) {
        setComandas((prev) => prev.filter((c) => c.mesa_id !== mesaSelecionada));
      } else if (currentComanda) {
        setComandas((prev) =>
          prev.map((c) =>
            c.mesa_id === mesaSelecionada
              ? { ...c, totalItens: Math.max(0, c.totalItens - (itemParaRemover.quantidade || 1)), totalValor: Math.max(0, c.totalValor - (itemParaRemover.preco * itemParaRemover.quantidade)) }
              : c
          )
        );
      }
    }

    // Deletar no servidor em background
    supabase.from('pedidos_temp').delete().eq('id', itemId).catch((err) => {
      console.error('Erro ao deletar item:', err);
      toast({ variant: 'destructive', title: 'Erro ao remover item' });
    });
  };

  const limparPedido = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !mesaSelecionada || !empresaId) return;

    try {
      // Delete ALL items for this mesa by mesa_id
      const { error: delError } = await supabase
        .from('pedidos_temp')
        .delete()
        .eq('empresa_id', empresaId)
        .eq('mesa_id', mesaSelecionada);

      if (delError) throw delError;

      // Free mesa in DB (for other components that use mesas.status)
      supabase
        .from('mesas')
        .update({ status: 'livre' })
        .eq('id', mesaSelecionada)
        .then(({ error }) => {
          if (error) console.error('Erro ao liberar mesa no DB (limpar):', error);
        });

      // OPTIMISTIC: remove comanda for this mesa immediately
      setComandas((prev) => prev.filter((c) => c.mesa_id !== mesaSelecionada));

      // Clear local state and go back to mesas
      setItensPedido([]);
      setShowCart(false);
      setPagamentos([]);
      setMesaSelecionada('');
      setNumeroMesaSelecionada(0);
      setTela('mesas');
      setLastComandaRefresh(Date.now());

      toast({ title: '✓ Pedido limpo e mesa liberada' });
    } catch (error) {
      console.error('Erro ao limpar pedido:', error);
      toast({ variant: 'destructive', title: 'Erro ao limpar pedido' });
    }
  };

  const marcarEntregue = async (itemId: string, entregue: boolean) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Optimistic update
    setItensPedido((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, entregue } : item))
    );

    try {
      const { error } = await supabase
        .from('pedidos_temp')
        .update({ status_entrega: entregue ? 'entregue' : 'pendente' })
        .eq('id', itemId);

      if (error) {
        // Column might not exist, handle gracefully
        const errorMsg = (error as any)?.message || String(error);
        if (errorMsg.includes('status_entrega') || errorMsg.includes('column') || errorMsg.includes('does not exist')) {
          // Keep optimistic state locally even if column doesn't exist
          console.warn('Coluna status_entrega não encontrada. Controle de entrega funciona localmente.');
        } else {
          // Rollback on real error
          setItensPedido((prev) =>
            prev.map((item) => (item.id === itemId ? { ...item, entregue: !entregue } : item))
          );
        }
      }
    } catch {
      setItensPedido((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, entregue: !entregue } : item))
      );
    }
  };

  const enviarParaCozinha = async () => {
    if (itensPedido.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum item para enviar' });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // Use single batch update with .in() instead of sequential loop
      const itemIds = itensPedido.map((item) => item.id);

      const { error } = await supabase
        .from('pedidos_temp')
        .update({ status_envio: 'enviado_cozinha' })
        .in('id', itemIds);

      if (error) {
        // Handle the case where status_envio column might not exist
        const errorMsg = (error as any)?.message || String(error);
        if (errorMsg.includes('status_envio') || errorMsg.includes('column') || errorMsg.includes('does not exist')) {
          console.warn('Coluna status_envio não encontrada na tabela pedidos_temp. Ação de enviar para cozinha foi logada.');
          toast({
            title: '⚠️ Coluna status_envio não encontrada',
            description: 'Adicione a coluna status_envio (text) à tabela pedidos_temp para habilitar o rastreamento.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        // Immediately update local state to reflect the change
        setItensPedido((prev) =>
          prev.map((item) => ({ ...item, statusEnvio: 'enviado_cozinha' }))
        );
      }

      toast({ title: `✓ Pedido da Mesa ${numeroMesaSelecionada} enviado para a cozinha!` });

      // Log the action (fire-and-forget)
      registrarLog({
        empresaId: empresaId || '',
        usuarioId: user?.id || '',
        usuarioNome: user?.nome || '',
        acao: 'PEDIDO_ENVIADO_Cozinha',
        detalhes: `Mesa ${numeroMesaSelecionada} - ${itensPedido.length} itens - R$ ${total.toFixed(2)}`,
        tipo: 'venda',
      }).catch((err) => console.error('Erro ao registrar log:', err));
    } catch (error) {
      console.error('Erro ao enviar para cozinha:', error);
      toast({ variant: 'destructive', title: 'Erro ao enviar para cozinha' });
    }
  };

  const imprimirComanda = () => {
    window.print();
  };

  // ── Payment Functions ──
  const adicionarPagamento = (forma: string) => {
    const valor = parseFloat(valorPagamentoAtual) || 0;
    if (valor <= 0) {
      toast({ variant: 'destructive', title: 'Informe o valor do pagamento' });
      return;
    }
    if (totalPago + valor > total + 0.01) {
      toast({ variant: 'destructive', title: 'Valor excede o total' });
      return;
    }
    setPagamentos([...pagamentos, { forma, valor }]);
    setValorPagamentoAtual('');
    // Auto-fill remaining
    const novoRestante = Math.max(0, total - (totalPago + valor));
    setValorPagamentoAtual(novoRestante > 0.005 ? novoRestante.toFixed(2) : '0.00');
  };

  const removerPagamento = (index: number) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };

  const handleFinalizarComPagamentos = () => {
    if (totalPago < total) {
      toast({ variant: 'destructive', title: 'Pagamento incompleto' });
      return;
    }
    setFormaPagamentoSelecionada(pagamentos[0]?.forma || 'dinheiro');
    setDialogPagamento(false);
    setDialogCupomFiscal(true);
  };

  const finalizarVenda = async (dadosCupom: DadosCupomFiscal, formaPagamento: string) => {
    if (itensPedido.length === 0) {
      toast({ variant: 'destructive', title: 'Adicione itens ao pedido' });
      return;
    }

    setProcessando(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase não inicializado');

      // Create venda
      const { data: vendaData, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          empresa_id: empresaId,
          tipo: 'mesa',
          canal: 'mesa',
          status: 'fechada',
          mesa_id: mesaSelecionada || null,
          total,
          forma_pagamento: formaPagamento,
          nome_cliente: dadosCupom.nomeCliente || null,
          cpf_cliente: dadosCupom.cpfCliente || null,
          telefone_cliente: dadosCupom.cliente?.telefone || dadosCupom.cliente?.celular || null,
          criado_por: user?.id,
          criado_por_nome: user?.nome,
          criado_em: new Date().toISOString(),
          fechado_em: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (vendaError) throw vendaError;

      // Create venda items
      const itensVenda = itensPedido.map((item) => ({
        empresa_id: empresaId,
        venda_id: vendaData.id,
        produto_id: item.produtoId,
        nome: item.nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco,
        total: item.preco * item.quantidade,
      }));

      const { error: itensError } = await supabase.from('itens_venda').insert(itensVenda);
      if (itensError) console.error('Erro ao criar itens:', itensError);

      // Handle combo stock
      try {
        const combosVendidos = itensPedido.filter((item) => item.isCombo);
        if (combosVendidos.length > 0) {
          const comboIds = combosVendidos.map((item) => item.produtoId);
          const { data: comboData, error: comboError } = await supabase
            .from('combo_itens')
            .select('combo_produto_id, item_produto_id, quantidade, custo_incluido')
            .in('combo_produto_id', comboIds);

          if (!comboError && comboData) {
            const reducoes = new Map<string, number>();
            for (const ci of comboData) {
              if (!ci.custo_incluido) continue;
              const comboVendido = combosVendidos.find((i) => i.produtoId === ci.combo_produto_id);
              if (comboVendido) {
                const qtd = ci.quantidade * comboVendido.quantidade;
                reducoes.set(ci.item_produto_id, (reducoes.get(ci.item_produto_id) || 0) + qtd);
              }
            }
            for (const [prodId, qtdTotal] of reducoes) {
              await supabase
                .rpc('decrementar_estoque_produto', {
                  p_produto_id: prodId,
                  p_quantidade: qtdTotal,
                })
                .catch(async () => {
                  const { data: prod } = await supabase
                    .from('produtos')
                    .select('estoque_atual')
                    .eq('id', prodId)
                    .single();
                  if (prod) {
                    await supabase
                      .from('produtos')
                      .update({ estoque_atual: Math.max(0, parseFloat(prod.estoque_atual) - qtdTotal) })
                      .eq('id', prodId);
                  }
                });
            }
          }
        }
      } catch (err) {
        console.error('Erro ao baixar estoque dos combos:', err);
      }

      // Create payments
      const pagamentosParaSalvar = pagamentos.length > 0 ? pagamentos : [{ forma: formaPagamento, valor: total }];
      const pagamentosInsert = pagamentosParaSalvar.map((pg) => ({
        empresa_id: empresaId,
        venda_id: vendaData.id,
        forma_pagamento: pg.forma,
        valor: pg.valor,
      }));

      const { error: pagError } = await supabase.from('pagamentos').insert(pagamentosInsert);
      if (pagError) console.error('Erro ao criar pagamentos:', pagError);

      // Clear temp pedidos
      const deletePromises = itensPedido.map((item) => supabase.from('pedidos_temp').delete().eq('id', item.id));
      await Promise.all(deletePromises);

      // Free mesa in DB (for other components that use mesas.status)
      if (mesaSelecionada) {
        supabase
          .from('mesas')
          .update({ status: 'livre' })
          .eq('id', mesaSelecionada)
          .then(({ error }) => {
            if (error) console.error('Erro ao liberar mesa no DB (finalizar):', error);
          });
      }

      // OPTIMISTIC: remove comanda for this mesa immediately
      const mesaIdToFree = mesaSelecionada;
      setComandas((prev) => prev.filter((c) => c.mesa_id !== mesaIdToFree));

      // Register in caixa (usar API com service role para bypass RLS do funcionário)
      const caixaIdParaRegistrar = caixaEstaAberto?.id || null;

      if (caixaIdParaRegistrar) {
        try {
          await fetch('/api/caixa-registrar-venda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empresaId,
              caixaId: caixaIdParaRegistrar,
              valor: total,
              formaPagamento,
              vendaId: vendaData.id,
              descricao: `Venda - Mesa ${numeroMesaSelecionada}`,
              usuarioId: user?.id,
              usuarioNome: user?.nome,
            }),
          });
        } catch (e) {
          console.warn('[PDV-Garçom] Não conseguiu registrar venda no caixa:', e);
        }
      } else {
        console.warn('[PDV-Garçom] Nenhum caixa aberto encontrado para registrar venda');
      }

      // Log
      await registrarLog({
        empresaId: empresaId || '',
        usuarioId: user?.id || '',
        usuarioNome: user?.nome || '',
        acao: 'VENDA_FINALIZADA',
        detalhes: `Venda Mesa ${numeroMesaSelecionada} - ${itensPedido.length} itens - R$ ${total.toFixed(2)}`,
        tipo: 'venda',
      });

      // Print cupom if requested
      if (dadosCupom.imprimirCupom) {
        imprimirCupomFiscal({
          nomeEmpresa: empresa?.nome || 'PDV',
          cnpjEmpresa: empresa?.cnpj || '',
          enderecoEmpresa: empresa?.endereco || '',
          cpfCliente: dadosCupom.cpfCliente,
          nomeCliente: dadosCupom.nomeCliente,
          itens: itensPedido.map((item) => ({
            nome: item.nome,
            quantidade: item.quantidade,
            preco: item.preco,
            codigo: item.codigo || '',
            unidade: item.unidade || 'UN',
          })),
          total,
          formaPagamento,
          tamanhoCupom: dadosCupom.tamanhoCupom,
          codigoVenda: vendaData.id.slice(-8).toUpperCase(),
          configuracoes: dadosCupom.configuracoes,
          cliente: dadosCupom.cliente || undefined,
          bairroEmpresa: empresa?.bairro || '',
          cidadeEmpresa: empresa?.cidade || '',
          ufEmpresa: empresa?.estado || '',
          vendedor: user?.nome || 'GARÇOM',
          pagamentosMultiplos: pagamentos.length > 0 ? pagamentos : undefined,
        });
      }

      toast({ title: '✓ Venda finalizada com sucesso!' });

      // Reset state
      setDialogCupomFiscal(false);
      setDialogPagamento(false);
      setShowCart(false);
      setPagamentos([]);
      setItensPedido([]);
      setMesaSelecionada('');
      setNumeroMesaSelecionada(0);
      setTela('mesas');
      setLastComandaRefresh(Date.now());
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      toast({ variant: 'destructive', title: 'Erro ao finalizar venda' });
    } finally {
      setProcessando(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // ============================================================
  // Loading
  // ============================================================
  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <Loader2 className="h-12 w-12 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    );
  }

  // ============================================================
  // Render - Fullscreen Mobile Experience
  // ============================================================
  return (
    <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
      <div className="h-[100dvh] flex flex-col bg-gray-50 select-none overflow-hidden">
        {/* ── HEADER ── */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-3">
            {tela === 'produtos' && (
              <button
                onClick={voltarParaMesas}
                className="p-2 -ml-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
            )}
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-base shadow-sm">
              {user?.nome?.charAt(0)}
            </div>
            <div className="flex flex-col">
              <p className="font-bold text-gray-800 text-sm leading-tight">{user?.nome}</p>
              <span className="text-[11px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full w-fit mt-0.5">
                Garçom
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                // Verificar caixa antes de abrir dialog
                await verificarCaixaAberto();
                setDialogCaixa(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                caixaEstaAberto
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{caixaEstaAberto ? 'Caixa Aberto' : 'Abrir Caixa'}</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm('Deseja realmente sair do sistema?')) {
                  handleLogout();
                }
              }}
              className="p-2 rounded-xl hover:bg-red-50 active:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
              title="Sair do sistema"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* ── MESA INFO BAR (when in product view) ── */}
        {tela === 'produtos' && (
          <div className="bg-green-600 text-white px-4 py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              <span className="font-bold text-base">Mesa {numeroMesaSelecionada}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-100 text-sm">
                {itemCount} {itemCount === 1 ? 'item' : 'itens'}
              </span>
              <span className="font-bold text-lg">R$ {total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {tela === 'mesas' ? (
            // ── MESA SELECTION SCREEN (with Comandas) ──
            <MesaSelectionView
              mesas={mesasOrdenadas}
              mesaSelecionada={mesaSelecionada}
              mesaItemCounts={mesaItemCounts}
              onSelectMesa={selecionarMesa}
              comandas={comandas}
              loadingComandas={loadingComandas}
              onRefreshComandas={() => setLastComandaRefresh(Date.now())}
            />
          ) : (
            // ── PRODUCT VIEW ──
            <ProdutoView
              categorias={categorias || []}
              categoriaAtiva={categoriaAtiva}
              setCategoriaAtiva={setCategoriaAtiva}
              search={search}
              setSearch={setSearch}
              produtos={produtosFiltrados}
              getCorCategoria={getCorCategoria}
              onAddProduto={adicionarProduto}
              adicionandoIds={adicionandoIds}
              bounceProdutoId={bounceProdutoId}
            />
          )}
        </div>

        {/* ── FLOATING CART BUTTON ── */}
        {tela === 'produtos' && itemCount > 0 && (
          <div className="absolute bottom-6 right-4 z-20">
            <button
              onClick={() => setShowCart(true)}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-2xl shadow-lg shadow-green-600/30 px-5 py-4 flex items-center gap-3 transition-all active:scale-95"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 bg-white text-green-600 text-[10px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                  {itemCount}
                </span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[11px] text-green-100 leading-tight">Ver Pedido</span>
                <span className="font-extrabold text-lg leading-tight">R$ {total.toFixed(2)}</span>
              </div>
            </button>
          </div>
        )}

        {/* ── CART BOTTOM SHEET ── */}
        {showCart && (
          <CartBottomSheet
            itensPedido={itensPedido}
            total={total}
            mesaNumero={numeroMesaSelecionada}
            onClose={() => setShowCart(false)}
            onAlterarQtd={alterarQtd}
            onRemoverItem={removerItem}
            onLimparPedido={() => {
              limparPedido();
            }}
            onMarcarEntregue={marcarEntregue}
            onEnviarCozinha={() => {
              enviarParaCozinha();
              setShowCart(false);
            }}
            onImprimirComanda={imprimirComanda}
            onPedirConta={async () => {
              setShowCart(false);
              toast({
                title: `📋 Conta solicitada - Mesa ${numeroMesaSelecionada}`,
                description: 'Finalize o pagamento no PDV principal (caixa).',
              });
            }}
          />
        )}

        {/* ── PAYMENT DIALOG ── */}
        {dialogPagamento && (
          <PaymentDialog
            total={total}
            totalPago={totalPago}
            restante={restante}
            valorPagamentoAtual={valorPagamentoAtual}
            setValorPagamentoAtual={setValorPagamentoAtual}
            pagamentos={pagamentos}
            onAdicionarPagamento={adicionarPagamento}
            onRemoverPagamento={removerPagamento}
            onFinalizar={handleFinalizarComPagamentos}
            onClose={() => {
              setDialogPagamento(false);
              setPagamentos([]);
            }}
          />
        )}

        {/* ── CUPOM FISCAL MODAL ── */}
        <CupomFiscalModal
          open={dialogCupomFiscal}
          onOpenChange={(open) => {
            setDialogCupomFiscal(open);
            if (!open) setPagamentos([]);
          }}
          onConfirmar={finalizarVenda}
          formaPagamento={formaPagamentoSelecionada}
          total={total}
          itens={itensPedido.map((item) => ({
            nome: item.nome,
            quantidade: item.quantidade,
            preco: item.preco,
            codigo: item.codigo || '',
            unidade: item.unidade || 'UN',
          }))}
          nomeEmpresa={empresa?.nome}
          cnpjEmpresa={empresa?.cnpj}
          enderecoEmpresa={empresa?.endereco}
          processando={processando}
          pagamentosMultiplos={pagamentos.length > 1 ? pagamentos : undefined}
          bairroEmpresa={empresa?.bairro}
          cidadeEmpresa={empresa?.cidade}
          ufEmpresa={empresa?.estado}
          vendedor={user?.nome}
        />

        {/* ── CAIXA DIALOG ── */}
        {dialogCaixa && (
          <CaixaDialog
            caixaAberto={!!caixaEstaAberto}
            caixaValor={caixaEstaAberto?.valor_atual || caixaEstaAberto?.valorAtual || 0}
            valorAbertura={valorAberturaCaixa}
            setValorAbertura={setValorAberturaCaixa}
            onAbrirCaixa={async () => {
              // Re-verificar via API antes de tentar abrir
              await verificarCaixaAberto();
              if (caixaEstaAberto) {
                toast({ title: 'Caixa já está aberto com R$ ' + (caixaEstaAberto.valor_atual || caixaEstaAberto.valorAtual || 0).toFixed(2) });
                setDialogCaixa(false);
                return;
              }
              try {
                const valor = parseFloat(valorAberturaCaixa) || 0;
                console.log('[PDV-Garçom] Abrindo caixa com valor:', valor);
                const caixaId = await abrirCaixa(valor);
                console.log('[PDV-Garçom] Caixa aberto com sucesso, ID:', caixaId);
                toast({ title: '✓ Caixa aberto com sucesso!' });
                setDialogCaixa(false);
                // Atualizar estado local
                await verificarCaixaAberto();
              } catch (err: any) {
                console.error('[PDV-Garçom] Erro ao abrir caixa:', err);
                toast({ variant: 'destructive', title: err.message || 'Erro ao abrir caixa', description: 'Verifique o console para detalhes.' });
              }
            }}
            onClose={() => setDialogCaixa(false)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// ============================================================
// Sub-component: Mesa Selection View (with Comandas)
// ============================================================
function MesaSelectionView({
  mesas,
  mesaSelecionada,
  mesaItemCounts,
  onSelectMesa,
  comandas,
  loadingComandas,
  onRefreshComandas,
}: {
  mesas: any[];
  mesaSelecionada: string;
  mesaItemCounts: Map<string, number>;
  onSelectMesa: (id: string, numero: number) => void;
  comandas: Comanda[];
  loadingComandas: boolean;
  onRefreshComandas: () => void;
}) {
  const livres = mesas.filter((m) => m.status === 'livre');
  const ocupadas = mesas.filter((m) => m.status === 'ocupada');

  const renderMesaGrid = (lista: any[], label: string, colorClass: string) => {
    if (lista.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">{label}</span>
          <span className="text-xs text-gray-400">({lista.length})</span>
        </div>
        <div className="grid grid-cols-3 gap-3 px-1">
          {lista.map((mesa) => {
            const itemCount = mesaItemCounts.get(mesa.id) || 0;
            return (
              <button
                key={mesa.id}
                onClick={() => onSelectMesa(mesa.id, mesa.numero)}
                className={`relative rounded-2xl p-4 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-sm border-2 ${
                  mesaSelecionada === mesa.id
                    ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-600/30'
                    : mesa.status === 'livre'
                    ? 'bg-white border-gray-200 hover:border-green-300 hover:shadow-md'
                    : 'bg-red-50 border-red-200 hover:border-red-300'
                }`}
              >
                {/* Item count badge for occupied mesas */}
                {itemCount > 0 && (
                  <span className={`absolute -top-2 -right-2 text-[10px] font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-sm ${
                    mesaSelecionada === mesa.id
                      ? 'bg-white text-green-600'
                      : 'bg-green-600 text-white'
                  }`}>
                    {itemCount}
                  </span>
                )}
                <UtensilsCrossed className={`h-6 w-6 ${mesaSelecionada === mesa.id ? 'text-white' : mesa.status === 'livre' ? 'text-green-600' : 'text-red-500'}`} />
                <span className={`font-extrabold text-xl ${mesaSelecionada === mesa.id ? 'text-white' : 'text-gray-800'}`}>
                  {mesa.numero}
                </span>
                <span className={`text-[10px] font-semibold uppercase ${mesaSelecionada === mesa.id ? 'text-green-100' : mesa.status === 'livre' ? 'text-green-600' : 'text-red-500'}`}>
                  {mesa.status === 'livre' ? 'Livre' : 'Ocupada'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800">Selecionar Mesa</h1>
        <p className="text-sm text-gray-500 mt-1">Toque na mesa para iniciar o pedido</p>
      </div>
      {renderMesaGrid(livres, 'Mesas Livres', 'bg-green-500')}
      {renderMesaGrid(ocupadas, 'Mesas Ocupadas', 'bg-red-500')}
      {mesas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <UtensilsCrossed className="h-16 w-16 mb-4 opacity-40" />
          <p className="text-lg font-semibold">Nenhuma mesa cadastrada</p>
          <p className="text-sm mt-1">Cadastre mesas nas configurações</p>
        </div>
      )}

      {/* ── COMANDAS ATIVAS SECTION ── */}
      {comandas.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-green-600" />
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Comandas Ativas</span>
              <span className="text-xs text-gray-400">({comandas.length})</span>
            </div>
            <button
              onClick={onRefreshComandas}
              disabled={loadingComandas}
              className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 text-gray-500 hover:text-green-600 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loadingComandas ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2">
            {comandas.map((comanda) => (
              <div
                key={comanda.mesa_id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <UtensilsCrossed className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-800 text-sm">Mesa {comanda.mesa_numero}</p>
                      <p className="text-[11px] text-gray-400">
                        {comanda.atendenteNome && <span>{comanda.atendenteNome} (garçom)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-green-600 text-base">
                      R$ {comanda.totalValor.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {comanda.totalItens} {comanda.totalItens === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {/* Status badge */}
                  {comanda.todosEnviados ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-bold">
                      <CheckCircle className="h-3 w-3" />
                      Enviado à Cozinha
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold">
                      <Clock className="h-3 w-3" />
                      Pendente
                    </span>
                  )}
                  <button
                    onClick={() => onSelectMesa(comanda.mesa_id, comanda.mesa_numero)}
                    className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 active:scale-95 transition-all"
                  >
                    Ver Pedido
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty comandas state */}
      {comandas.length === 0 && !loadingComandas && mesas.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3 px-1">
            <ClipboardList className="h-5 w-5 text-gray-300" />
            <span className="text-sm font-bold text-gray-300 uppercase tracking-wide">Comandas Ativas</span>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
            <p className="text-sm text-gray-400 font-medium">Nenhuma comanda ativa no momento</p>
            <p className="text-xs text-gray-300 mt-1">Os pedidos ativos aparecerão aqui</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-component: Product View (with bounce animation)
// ============================================================
function ProdutoView({
  categorias,
  categoriaAtiva,
  setCategoriaAtiva,
  search,
  setSearch,
  produtos,
  getCorCategoria,
  onAddProduto,
  adicionandoIds,
  bounceProdutoId,
}: {
  categorias: any[];
  categoriaAtiva: string;
  setCategoriaAtiva: (id: string) => void;
  search: string;
  setSearch: (v: string) => void;
  produtos: any[];
  getCorCategoria: (id: string) => string;
  onAddProduto: (p: any) => void;
  adicionandoIds: Set<string>;
  bounceProdutoId: string | null;
}) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Search Bar */}
      <div className="px-4 pt-3 pb-2 bg-white border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoriaAtiva('todos')}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              categoriaAtiva === 'todos'
                ? 'bg-green-600 text-white shadow-sm shadow-green-600/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaAtiva(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                categoriaAtiva === cat.id
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={
                categoriaAtiva === cat.id
                  ? { backgroundColor: cat.cor, boxShadow: `0 2px 8px ${cat.cor}40` }
                  : { borderLeft: `3px solid ${cat.cor}` }
              }
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: categoriaAtiva === cat.id ? 'white' : cat.cor }}
              />
              {cat.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {produtos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {produtos.map((produto) => {
              const corCat = getCorCategoria(produto.categoriaId);
              const isBouncing = bounceProdutoId === produto.id;
              return (
                <button
                  key={produto.id}
                  onClick={() => onAddProduto(produto)}
                  className={`bg-white rounded-2xl p-3 text-left shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group ${
                    isBouncing
                      ? 'animate-[bounce_0.3s_ease-in-out]'
                      : 'active:scale-[0.97]'
                  }`}
                  style={{ borderLeftWidth: '4px', borderLeftColor: corCat }}
                >
                  <div className="flex-1 min-h-0">
                    <p className="font-bold text-sm text-gray-800 leading-tight line-clamp-2 mb-2">{produto.nome}</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-lg font-extrabold text-green-600">
                          R$ {produto.preco?.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                        <Plus className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                  {/* Adicionando overlay indicator */}
                  {isBouncing && (
                    <div className="absolute inset-0 bg-green-50/60 flex items-center justify-center rounded-2xl pointer-events-none">
                      <div className="bg-white/90 rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin text-green-600" />
                        <span className="text-[10px] font-bold text-green-700">adicionando...</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Search className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-semibold">Nenhum produto encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Sub-component: Cart Bottom Sheet
// ============================================================
function CartBottomSheet({
  itensPedido,
  total,
  mesaNumero,
  onClose,
  onAlterarQtd,
  onRemoverItem,
  onLimparPedido,
  onMarcarEntregue,
  onEnviarCozinha,
  onImprimirComanda,
  onPedirConta,
}: {
  itensPedido: ItemPedido[];
  total: number;
  mesaNumero: number;
  onClose: () => void;
  onAlterarQtd: (id: string, delta: number, qtd: number) => void;
  onRemoverItem: (id: string) => void;
  onLimparPedido: () => void;
  onMarcarEntregue: (id: string, entregue: boolean) => void;
  onEnviarCozinha: () => void;
  onImprimirComanda: () => void;
  onPedirConta: () => void;
}) {
  const naoEntregues = itensPedido.filter((i) => !i.entregue).length;
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);
  const { toast } = useToast();
  const itensEnviadosCozinha = itensPedido.some((i) => i.statusEnvio === 'enviado_cozinha');

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col animate-slide-up max-h-[85dvh] min-h-0 overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between border-b border-gray-100">
          <div>
            <h2 className="text-lg font-extrabold text-gray-800">Pedido - Mesa {mesaNumero}</h2>
            <p className="text-sm text-gray-500">
              {itensPedido.length} {itensPedido.length === 1 ? 'item' : 'itens'}
              {naoEntregues > 0 && (
                <span className="text-orange-600 font-semibold ml-1">({naoEntregues} {naoEntregues === 1 ? 'pendente' : 'pendentes'})</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-green-100 text-green-700 text-xs font-bold hover:bg-green-200 active:scale-95 transition-all flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Adicionar Itens
            </button>
            <div className="text-right">
              <p className="text-xl font-extrabold text-green-600">R$ {total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Items - usando div nativa em vez de ScrollArea para compatibilidade mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 overscroll-contain -webkit-overflow-scrolling-touch">
          <div className="space-y-2">
            {itensPedido.map((item) => (
              <div
                key={item.id}
                className={`relative flex items-center gap-3 rounded-xl p-3 border transition-all ${
                  item.entregue
                    ? 'bg-green-50 border-green-200'
                    : 'bg-orange-50 border-orange-200'
                }`}
              >
                {/* Delivery status left bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                  item.entregue ? 'bg-green-500' : 'bg-orange-400'
                }`} />

                {/* Delivery toggle button */}
                <button
                  onClick={() => onMarcarEntregue(item.id, !item.entregue)}
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    item.entregue
                      ? 'bg-green-500 text-white'
                      : 'bg-white border-2 border-orange-300 text-orange-400'
                  }`}
                  title={item.entregue ? 'Clique para marcar como pendente' : 'Clique para marcar como entregue'}
                >
                  {item.entregue ? (
                    <CircleCheck className="h-5 w-5" />
                  ) : (
                    <CircleDot className="h-5 w-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-bold text-sm truncate ${item.entregue ? 'text-green-800' : 'text-gray-800'}`}>
                      {item.nome}
                    </p>
                    {item._optimistic && (
                      <Loader2 className="h-3 w-3 animate-spin text-green-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    R$ {item.preco.toFixed(2)} x {item.quantidade} ={' '}
                    <span className="font-bold text-gray-700">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onAlterarQtd(item.id, -1, item.quantidade)}
                    className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 active:scale-90 transition-all"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center font-extrabold text-sm text-gray-800">{item.quantidade}</span>
                  <button
                    onClick={() => onAlterarQtd(item.id, 1, item.quantidade)}
                    className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-green-50 hover:border-green-200 hover:text-green-600 active:scale-90 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => onRemoverItem(item.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {itensPedido.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">Pedido vazio</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {itensPedido.length > 0 && (
          <div className="px-5 pb-6 pt-3 border-t border-gray-100 space-y-2">
            {/* Delivery summary bar */}
            {naoEntregues > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl border border-orange-200">
                <CircleDot className="h-4 w-4 text-orange-500 shrink-0" />
                <p className="text-xs font-semibold text-orange-700">
                  {naoEntregues} {naoEntregues === 1 ? 'item pendente' : 'itens pendentes'} para entrega
                </p>
              </div>
            )}

            {/* Secondary Actions Row */}
            <div className="flex gap-2">
              <button
                onClick={onEnviarCozinha}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-orange-100 text-orange-700 font-bold text-xs hover:bg-orange-200 active:scale-[0.98] transition-all"
              >
                <ChefHat className="h-3.5 w-3.5" />
                Cozinha
              </button>
              <button
                onClick={onImprimirComanda}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs hover:bg-blue-200 active:scale-[0.98] transition-all"
              >
                <Printer className="h-3.5 w-3.5" />
                Comanda
              </button>
              {confirmarLimpar ? (
                <button
                  onClick={() => { onLimparPedido(); setConfirmarLimpar(false); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 active:scale-[0.98] transition-all animate-pulse"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Confirmar?
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (itensEnviadosCozinha) {
                      toast({
                        variant: 'destructive',
                        title: 'Não é possível limpar',
                        description: 'Existem itens já enviados à cozinha. Finalize a venda para encerrar o pedido.',
                      });
                      return;
                    }
                    setConfirmarLimpar(true);
                  }}
                  disabled={itensEnviadosCozinha}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    itensEnviadosCozinha
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-[0.98]'
                  }`}
                  title={itensEnviadosCozinha ? 'Itens já enviados à cozinha' : 'Limpar pedido'}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Limpar
                </button>
              )}
            </div>

            {/* Pedir Conta Button - o pagamento é feito apenas no PDV principal */}
            <button
              onClick={onPedirConta}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-green-600 text-white font-extrabold text-base shadow-lg shadow-green-600/30 hover:bg-green-700 active:scale-[0.98] transition-all"
            >
              <ClipboardList className="h-5 w-5" />
              Pedir Conta - Mesa {mesaNumero}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// Sub-component: Payment Dialog (Bottom Sheet)
// ============================================================
function PaymentDialog({
  total,
  totalPago,
  restante,
  valorPagamentoAtual,
  setValorPagamentoAtual,
  pagamentos,
  onAdicionarPagamento,
  onRemoverPagamento,
  onFinalizar,
  onClose,
}: {
  total: number;
  totalPago: number;
  restante: number;
  valorPagamentoAtual: string;
  setValorPagamentoAtual: (v: string) => void;
  pagamentos: Array<{ forma: string; valor: number }>;
  onAdicionarPagamento: (forma: string) => void;
  onRemoverPagamento: (index: number) => void;
  onFinalizar: () => void;
  onClose: () => void;
}) {
  const formasPagamento = [
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'bg-green-100 text-green-700 hover:bg-green-200 active:bg-green-300', border: 'border-green-200' },
    { id: 'credito', label: 'Crédito', icon: CreditCard, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:bg-blue-300', border: 'border-blue-200' },
    { id: 'debito', label: 'Débito', icon: CreditCard, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 active:bg-purple-300', border: 'border-purple-200' },
    { id: 'pix', label: 'PIX', icon: QrCode, color: 'bg-teal-100 text-teal-700 hover:bg-teal-200 active:bg-teal-300', border: 'border-teal-200' },
  ];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col animate-slide-up max-h-[90dvh]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-gray-800">Pagamento</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 px-5 pb-4">
          <div className="space-y-4">
            {/* Total Summary */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500 font-medium">Total</span>
                <span className="text-lg font-extrabold text-gray-800">R$ {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500 font-medium">Pago</span>
                <span className="text-lg font-bold text-green-600">R$ {totalPago.toFixed(2)}</span>
              </div>
              {totalPago > total && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500 font-medium">Troco</span>
                  <span className="text-lg font-bold text-orange-600">R$ {(totalPago - total).toFixed(2)}</span>
                </div>
              )}
              {restante > 0.005 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Restante</span>
                  <span className="text-lg font-extrabold text-red-600">R$ {restante.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Payment Method Selection */}
            {restante > 0.005 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Valor do pagamento</p>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={valorPagamentoAtual}
                    onChange={(e) => setValorPagamentoAtual(e.target.value)}
                    className="w-full h-14 pl-10 pr-4 rounded-xl border-2 border-green-200 bg-green-50 text-xl font-extrabold text-green-700 text-center focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    inputMode="decimal"
                  />
                </div>

                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mt-4">Forma de pagamento</p>
                <div className="space-y-2">
                  {formasPagamento.map((fp) => {
                    const Icon = fp.icon;
                    return (
                      <button
                        key={fp.id}
                        onClick={() => onAdicionarPagamento(fp.id)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 ${fp.border} ${fp.color} font-bold text-base transition-all active:scale-[0.98]`}
                      >
                        <Icon className="h-6 w-6 shrink-0" />
                        <span>{fp.label}</span>
                        <span className="ml-auto text-sm font-semibold opacity-70">
                          R$ {parseFloat(valorPagamentoAtual || '0').toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment List */}
            {pagamentos.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Pagamentos registrados</p>
                <div className="space-y-1.5">
                  {pagamentos.map((pg, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"
                    >
                      <div>
                        <p className="font-bold text-sm text-gray-700 capitalize">
                          {pg.forma === 'pix' ? 'PIX' : pg.forma === 'credito' ? 'Crédito' : pg.forma === 'debito' ? 'Débito' : 'Dinheiro'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-green-600">R$ {pg.valor.toFixed(2)}</span>
                        <button
                          onClick={() => onRemoverPagamento(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Finalize Button */}
        <div className="px-5 pb-6 pt-3 border-t border-gray-100">
          <button
            onClick={onFinalizar}
            disabled={totalPago < total}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-extrabold text-base shadow-lg transition-all active:scale-[0.98] ${
              totalPago >= total
                ? 'bg-green-600 text-white shadow-green-600/30 hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            <CheckCircle className="h-5 w-5" />
            {totalPago >= total
              ? `Confirmar R$ ${totalPago.toFixed(2)}`
              : `Faltam R$ ${restante.toFixed(2)}`}
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Sub-component: Caixa Dialog
// ============================================================
function CaixaDialog({
  caixaAberto,
  caixaValor,
  valorAbertura,
  setValorAbertura,
  onAbrirCaixa,
  onClose,
}: {
  caixaAberto: boolean;
  caixaValor: number;
  valorAbertura: string;
  setValorAbertura: (v: string) => void;
  onAbrirCaixa: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col animate-slide-up">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="px-5 pb-3">
          <h2 className="text-xl font-extrabold text-gray-800">Caixa</h2>
        </div>
        <div className="px-5 pb-6">
          {caixaAberto ? (
            <div className="bg-green-50 rounded-2xl p-5 border border-green-100 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-2xl font-extrabold text-green-700">R$ {caixaValor.toFixed(2)}</p>
              <p className="text-sm text-green-600 font-semibold mt-1">Caixa aberto</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-600">Informe o valor inicial para abrir o caixa:</p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={valorAbertura}
                  onChange={(e) => setValorAbertura(e.target.value)}
                  className="w-full h-14 pl-10 pr-4 rounded-xl border-2 border-gray-200 bg-gray-50 text-xl font-extrabold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  inputMode="decimal"
                />
              </div>
              <button
                onClick={onAbrirCaixa}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-green-600 text-white font-extrabold text-base shadow-lg shadow-green-600/30 hover:bg-green-700 active:scale-[0.98] transition-all"
              >
                <CheckCircle className="h-5 w-5" />
                Abrir Caixa
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
