'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutos, useCategorias, useMesas, useCaixa, useComandas, registrarLog } from '@/hooks/useFirestore';
import { CupomFiscalModal, imprimirCupomFiscal, DadosCupomFiscal } from '@/components/pdv/CupomFiscal';
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
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { useVendasPDV } from '@/hooks/useVendasPDV';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ItemPedido {
  id: string;
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
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
  const [dialogPerguntaCPF, setDialogPerguntaCPF] = useState(false);
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<string>('');
  const [cpfClientePreVenda, setCpfClientePreVenda] = useState('');
  const [nomeClientePreVenda, setNomeClientePreVenda] = useState('');
  const [pagamentos, setPagamentos] = useState<Array<{forma: string; valor: number}>>([]);
  const [valorPagamentoAtual, setValorPagamentoAtual] = useState('');
  const [empresa, setEmpresa] = useState<{
    nome: string;
    cnpj: string;
    endereco: string;
  } | null>(null);

  // Carregar dados da empresa
  useEffect(() => {
    const carregarEmpresa = async () => {
      if (!empresaId) return;
      
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('nome, cnpj, endereco')
          .eq('id', empresaId)
          .single();
        
        if (!error && data) {
          setEmpresa({
            nome: data.nome || 'Sistema PDV',
            cnpj: data.cnpj || '',
            endereco: data.endereco || '',
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
      }
    };

    carregarEmpresa();
  }, [empresaId]);

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
      criadoEm: item.adicionado_em ? new Date(item.adicionado_em) : (item.adicionadoEm ? new Date(item.adicionadoEm) : new Date()),
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

  // Mesas organizadas por status
  const mesasOrdenadas = useMemo(() => {
    return (mesas || []).sort((a, b) => a.numero - b.numero);
  }, [mesas]);

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

    // Para mesa e delivery, salva no Supabase com atualização otimista
    if (tipoVenda === 'mesa' || tipoVenda === 'delivery') {
      // Gerar ID temporário para atualização otimista
      const tempId = 'temp_' + Date.now();
      const novoItem: ItemPedido = {
        id: tempId,
        produtoId: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        quantidade: 1,
        atendenteId: user?.id || '',
        atendenteNome: user?.nome || '',
        tipoVenda: tipoVenda,
        mesaNumero: numeroMesaSelecionada || undefined,
        criadoEm: new Date(),
      };
      
      // Atualização otimista - adiciona localmente primeiro
      setItensPedido(prev => [...prev, novoItem]);
      
      try {
        const { data, error } = await supabase
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
            atendente_id: user?.id,
            atendente_nome: user?.nome,
            tipo_venda: tipoVenda,
            criado_em: new Date().toISOString(),
          })
          .select('id')
          .single();
        
        if (error) throw error;
        
        // Substituir ID temporário pelo ID real do banco
        if (data?.id) {
          setItensPedido(prev => prev.map(item => 
            item.id === tempId ? { ...item, id: data.id } : item
          ));
        }
        
        // Se a mesa estava livre, marcar como ocupada
        if (tipoVenda === 'mesa' && mesaSelecionada) {
          const mesaAtual = mesas.find(m => m.id === mesaSelecionada);
          if (mesaAtual && mesaAtual.status === 'livre') {
            await atualizarMesa(mesaSelecionada, { status: 'ocupada' });
          }
        }
      } catch (error) {
        console.error('Erro ao salvar produto:', error);
        // Reverter atualização otimista em caso de erro
        setItensPedido(prev => prev.filter(item => item.id !== tempId));
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
      // Atualização otimista
      if (novaQtd <= 0) {
        setItensPedido(prev => prev.filter(item => item.id !== itemId));
      } else {
        setItensPedido(prev => prev.map(item => 
          item.id === itemId ? { ...item, quantidade: novaQtd } : item
        ));
      }
      
      if (novaQtd <= 0) {
        await supabase.from('pedidos_temp').delete().eq('id', itemId);
      } else {
        await supabase.from('pedidos_temp').update({ quantidade: novaQtd }).eq('id', itemId);
      }
      
      // Verificar se a mesa ficou vazia para liberar
      if (tipoVenda === 'mesa' && mesaSelecionada && novaQtd <= 0) {
        const { data: itensRestantes } = await supabase
          .from('pedidos_temp')
          .select('id')
          .eq('mesa_id', mesaSelecionada)
          .limit(1);
        
        if (!itensRestantes || itensRestantes.length === 0) {
          await atualizarMesa(mesaSelecionada, { status: 'livre' });
          setItensPedido([]);
        }
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
      // Atualização otimista - remove localmente primeiro
      setItensPedido(prev => prev.filter(item => item.id !== itemId));
      
      await supabase.from('pedidos_temp').delete().eq('id', itemId);
      
      // Verificar se a mesa ficou vazia para liberar
      if (tipoVenda === 'mesa' && mesaSelecionada) {
        const { data: itensRestantes } = await supabase
          .from('pedidos_temp')
          .select('id')
          .eq('mesa_id', mesaSelecionada)
          .limit(1);
        
        if (!itensRestantes || itensRestantes.length === 0) {
          await atualizarMesa(mesaSelecionada, { status: 'livre' });
          setItensPedido([]);
        }
      }
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
    if ((tipoVenda === 'mesa' || tipoVenda === 'delivery') && mesaSelecionada) {
      const supabase = getSupabaseClient();
      if (supabase) {
        // Deletar todos os itens da mesa no banco
        await supabase
          .from('pedidos_temp')
          .delete()
          .eq('mesa_id', mesaSelecionada);
        
        // Liberar a mesa
        if (tipoVenda === 'mesa') {
          await atualizarMesa(mesaSelecionada, { status: 'livre' });
        }
      }
    }
    setItensPedido([]);
    if (tipoVenda === 'delivery') {
      setDeliverySelecionado('');
      setDeliveryInfo({ nome: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '', observacao: '' });
    }
    if (tipoVenda === 'comanda') {
      setComandaSelecionada(null);
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

        // Mapear tipo de venda para o schema
        const tipoVendaMap: Record<string, string> = {
          'balcao': 'balcao',
          'mesa': 'mesa',
          'delivery': 'delivery',
          'comanda': 'comanda',
        };

        // Mapear forma de pagamento para o schema
        const formaPagamentoMap: Record<string, string> = {
          'dinheiro': 'dinheiro',
          'cartao_credito': 'cartao_credito',
          'cartao_debito': 'cartao_debito',
          'pix': 'pix',
          'voucher': 'voucher',
          'ifood_online': 'ifood_online',
        };

        // Criar venda com campos corretos do schema
        const vendaInsert: any = {
          empresa_id: empresaId,
          tipo: tipoVendaMap[tipoVenda] || 'balcao',
          canal: tipoVenda === 'delivery' ? 'delivery' : tipoVenda,
          status: 'fechada',
          mesa_id: mesaSelecionada || null,
          subtotal: total,
          total: total,
          forma_pagamento: formaPagamentoMap[formaPagamento] || 'dinheiro',
          nome_cliente: dadosCupom.nomeCliente || (tipoVenda === 'delivery' ? deliveryInfo.nome : null),
          telefone_cliente: tipoVenda === 'delivery' ? deliveryInfo.telefone : null,
          observacao: dadosCupom.cpfCliente ? `CPF: ${dadosCupom.cpfCliente}` : null,
          criado_por: user?.id,
          criado_por_nome: user?.nome,
          fechado_em: new Date().toISOString(),
        };

        // Adicionar campos de entrega se for delivery
        if (tipoVenda === 'delivery' && deliveryInfo) {
          vendaInsert.entrega_logradouro = deliveryInfo.endereco;
          vendaInsert.entrega_numero = deliveryInfo.numero;
          vendaInsert.entrega_complemento = deliveryInfo.complemento;
          vendaInsert.entrega_bairro = deliveryInfo.bairro;
          vendaInsert.entrega_cidade = deliveryInfo.cidade;
          vendaInsert.entrega_cep = deliveryInfo.cep;
          vendaInsert.entrega_referencia = deliveryInfo.observacao;
          vendaInsert.pedido_externo_id = deliverySelecionado;
        }

        // Criar venda
        const { data: vendaData, error: vendaError } = await supabase
          .from('vendas')
          .insert(vendaInsert)
          .select('id')
          .single();

        if (vendaError) throw vendaError;
        vendaId = vendaData.id;

        // Criar itens de venda com campos corretos
        const itensVenda = itensPedido.map(item => ({
          empresa_id: empresaId,
          venda_id: vendaData.id,
          produto_id: item.produtoId,
          nome: item.nome,
          preco_unitario: item.preco,
          quantidade: item.quantidade,
          total: item.preco * item.quantidade,
          observacao: null,
        }));

        const { error: itensError } = await supabase
          .from('itens_venda')
          .insert(itensVenda);
        
        if (itensError) console.error('Erro ao criar itens:', itensError);

        // Criar pagamento(s) com campos corretos
        const pagamentosParaSalvar = pagamentos.length > 0 ? pagamentos : [{ forma: formaPagamento, valor: total }];
        const pagamentosInsert = pagamentosParaSalvar.map(pg => ({
          empresa_id: empresaId,
          venda_id: vendaData.id,
          forma_pagamento: formaPagamentoMap[pg.forma] || 'dinheiro',
          valor: pg.valor,
          troco: 0,
          observacao: dadosCupom.cpfCliente ? `CPF: ${dadosCupom.cpfCliente}` : null,
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
              valor_atual: (caixaAberto.valorAtual || 0) + total,
              total_vendas: (caixaAberto.totalVendas || 0) + total,
              total_entradas: (caixaAberto.totalEntradas || 0) + total,
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
            })),
            total,
            formaPagamento,
            tamanhoCupom: dadosCupom.tamanhoCupom,
            codigoVenda: vendaId.slice(-8).toUpperCase(),
            configuracoes: dadosCupom.configuracoes,
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

  // Logout
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
        <div className="flex items-center justify-center h-screen bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
      <div className="h-screen flex flex-col bg-background">
        
        {/* HEADER */}
        <header className="bg-background border-b border-border px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-primary font-bold shadow-sm">
              {user?.nome?.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">{user?.nome}</p>
              <p className="text-xs text-muted-foreground">Ponto de Venda</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${caixaAberto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} shadow-sm`}>
              <CheckCircle className="h-4 w-4" />
              {caixaAberto ? 'Caixa Aberto' : 'Caixa Fechado'}
            </div>

            {!caixaAberto ? (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm"
                onClick={() => abrirCaixa(0)}
              >
                Abrir Caixa
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
                onClick={() => fecharCaixa(caixaAberto.valorAtual || 0)}
              >
                Fechar Caixa
              </Button>
            )}

            <Badge className="bg-muted text-primary px-4 py-2 text-sm font-bold shadow-sm">
              {getTipoVendaLabel()}
            </Badge>

            <Button 
              variant="destructive" 
              onClick={handleLogout} 
              className="gap-2 bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              SAIR
            </Button>
          </div>
        </header>

        {/* SELEÇÃO DE TIPO DE VENDA */}
        <div className="bg-muted border-b border-border px-6 py-3 flex gap-3 items-center shadow-sm overflow-x-auto">
          <span className="text-sm font-bold text-foreground uppercase whitespace-nowrap">Tipo de Venda:</span>
          <Button
            variant={tipoVenda === 'balcao' ? 'default' : 'outline'}
            size="sm"
            className={`font-bold transition-all whitespace-nowrap ${tipoVenda === 'balcao' ? 'bg-primary hover:bg-primary/90 text-white shadow-sm' : 'border border-border text-primary hover:bg-muted'}`}
            onClick={() => trocarTipoVenda('balcao')}
          >
            <Package className="h-4 w-4 mr-2" />
            Balcão
          </Button>
          <Button
            variant={tipoVenda === 'mesa' ? 'default' : 'outline'}
            size="sm"
            className={`font-bold transition-all whitespace-nowrap ${tipoVenda === 'mesa' ? 'bg-primary hover:bg-primary/90 text-white shadow-sm' : 'border border-border text-primary hover:bg-muted'}`}
            onClick={() => trocarTipoVenda('mesa')}
          >
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            Mesa
          </Button>
          <Button
            variant={tipoVenda === 'comanda' ? 'default' : 'outline'}
            size="sm"
            className={`font-bold transition-all whitespace-nowrap ${tipoVenda === 'comanda' ? 'bg-primary hover:bg-primary/90 text-white shadow-sm' : 'border border-border text-primary hover:bg-muted'}`}
            onClick={() => trocarTipoVenda('comanda')}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Comanda
          </Button>
          <Button
            variant={tipoVenda === 'delivery' ? 'default' : 'outline'}
            size="sm"
            className={`font-bold transition-all whitespace-nowrap ${tipoVenda === 'delivery' ? 'bg-primary hover:bg-primary/90 text-white shadow-sm' : 'border border-border text-primary hover:bg-muted'}`}
            onClick={() => trocarTipoVenda('delivery')}
          >
            <Truck className="h-4 w-4 mr-2" />
            Delivery
          </Button>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 flex overflow-hidden gap-4 p-4">
          
          {/* COLUNA ESQUERDA - MESAS (se selecionado) */}
          {tipoVenda === 'mesa' && (
            <div className="w-48 bg-background rounded-lg shadow-sm border border-border flex flex-col overflow-hidden">
              <div className="bg-muted border-b border-border px-4 py-3 text-primary font-bold">
                MESAS
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {mesasOrdenadas.map(mesa => (
                    <button
                      key={mesa.id}
                      onClick={() => selecionarMesa(mesa.id, mesa.numero, mesa.status)}
                      className={`w-full p-3 rounded-lg font-bold transition-all transform hover:scale-105 ${
                        mesaSelecionada === mesa.id
                          ? 'bg-primary text-white shadow-md'
                          : mesa.status === 'livre'
                          ? 'bg-green-50 text-green-700 hover:shadow-sm'
                          : 'bg-red-50 text-red-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">Mesa {mesa.numero}</span>
                        <Badge className={`text-xs font-bold ${mesa.status === 'livre' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                          {mesa.status === 'livre' ? 'Livre' : 'Ocupada'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* COLUNA ESQUERDA - COMANDAS (se selecionado) */}
          {tipoVenda === 'comanda' && (
            <div className="w-56 bg-background rounded-lg shadow-sm border border-border flex flex-col overflow-hidden">
              <div className="bg-muted border-b border-border px-4 py-3 flex items-center justify-between">
                <span className="text-primary font-bold">COMANDAS</span>
                <Button 
                  size="sm" 
                  className="h-7 bg-green-600 hover:bg-green-700"
                  onClick={() => setDialogComanda(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1 p-3">
                {comandas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
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
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-purple-50 text-purple-700 hover:shadow-sm'
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
          <div className="flex-1 flex flex-col overflow-hidden bg-background rounded-lg shadow-sm border border-border">
            
            {/* CATEGORIAS */}
            <div className="bg-muted px-4 py-3 flex gap-2 overflow-x-auto border-b border-border">
              <Button
                size="sm"
                variant={categoriaAtiva === 'todos' ? 'default' : 'outline'}
                className={`font-bold whitespace-nowrap transition-all ${categoriaAtiva === 'todos' ? 'bg-primary text-white shadow-sm' : 'bg-background text-primary border border-border hover:bg-muted'}`}
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
                  className={`font-bold whitespace-nowrap transition-all ${categoriaAtiva === cat.id ? 'shadow-md' : 'bg-background hover:shadow-md'}`}
                  onClick={() => setCategoriaAtiva(cat.id)}
                >
                  {cat.nome}
                </Button>
              ))}
            </div>

            {/* BUSCA */}
            <div className="p-4 border-b border-border bg-background">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="🔍 Buscar por nome ou código de barras..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border border-border focus:border-primary rounded-lg font-semibold"
                  autoFocus
                />
              </div>
            </div>

            {/* GRID PRODUTOS */}
            <div className="flex-1 overflow-y-auto p-4">
              {produtosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Package className="h-20 w-20 mb-4 opacity-30" />
                  <p className="text-lg font-bold">Nenhum produto cadastrado</p>
                  <p className="text-sm">O admin precisa cadastrar produtos primeiro</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {(produtosFiltrados || []).map(produto => {
                    const corCategoria = getCorCategoria(produto.categoriaId);
                    return (
                      <button
                        key={produto.id}
                        className="group bg-background rounded-lg p-3 hover:shadow-md active:scale-95 transition-all border border-border hover:border-border overflow-hidden relative"
                        onClick={() => adicionarProduto(produto)}
                      >
                        {/* Fundo gradiente no hover */}
                        <div className="absolute inset-0 bg-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10">
                          <div 
                            className="h-14 rounded-lg flex items-center justify-center mb-2 shadow-md transition-transform group-hover:scale-110"
                            style={{ backgroundColor: `${corCategoria}25` }}
                          >
                            <Coffee className="h-7 w-7 transition-transform group-hover:rotate-12" style={{ color: corCategoria }} />
                          </div>
                          <p className="text-sm font-bold truncate text-foreground group-hover:text-primary">{produto.nome}</p>
                          <p className="text-base font-extrabold text-green-600 mt-1">
                            R$ {(produto.preco || 0).toFixed(2)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA - CARRINHO */}
          <div className="w-80 lg:w-96 bg-background rounded-lg shadow-sm border border-border flex flex-col overflow-hidden h-full">
            
            {/* HEADER CARRINHO */}
            <div className="bg-muted border-b border-border px-3 py-3 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  PEDIDO
                </h2>
                {itensPedido.length > 0 && (
                  <Badge className="bg-muted text-primary font-bold text-lg px-3 py-1">
                    {itensPedido.length}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-semibold">
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
                  className="w-full mt-3 bg-purple-600 hover:bg-purple-700"
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
                  className="w-full mt-3 border border-border text-primary hover:bg-muted font-bold"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Comanda
                </Button>
              )}
            </div>

            {/* ITENS DO CARRINHO */}
            <ScrollArea className="flex-1 p-3 min-h-0 h-0">
              {itensPedido.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                  <p className="font-bold text-muted-foreground text-sm">Carrinho vazio</p>
                  <p className="text-xs text-muted-foreground mt-1">Clique nos produtos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(itensPedido || []).map((item, index) => (
                    <div key={item.id} className="bg-muted rounded-lg p-2 border border-border hover:border-border transition-all shadow-sm">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold bg-primary text-white px-1.5 py-0.5 rounded-full shrink-0">#{index + 1}</span>
                            <p className="font-bold text-foreground text-sm truncate">{item.nome}</p>
                          </div>
                        </div>
                        <button
                          className="text-muted-foreground hover:text-red-600 hover:bg-destructive/10 p-1 rounded transition-all shrink-0"
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
                          <span className="w-7 text-center font-bold text-base text-foreground">{item.quantidade}</span>
                          <button
                            className="w-7 h-7 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center font-bold transition-all shadow-sm"
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
            <div className="p-3 border-t border-border space-y-2 bg-background shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-foreground">TOTAL:</span>
                <span className="text-2xl font-extrabold text-green-600">
                  R$ {total.toFixed(2)}
                </span>
              </div>
              
              <Button
                className="w-full h-11 text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={itensPedido.length === 0 || processando || (tipoVenda === 'comanda' && !comandaSelecionada)}
                onClick={() => setDialogPerguntaCPF(true)}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {processando ? 'Processando...' : 'FINALIZAR VENDA'}
              </Button>

              {itensPedido.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border border-red-300 text-red-600 hover:bg-destructive/10 font-bold h-9"
                  onClick={limparPedido}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Limpar Carrinho
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DIALOG NOVA COMANDA */}
      <Dialog open={dialogComanda} onOpenChange={setDialogComanda}>
        <DialogContent className="max-w-md border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <ClipboardList className="h-6 w-6" />
              Nova Comanda
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
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
                className="border border-border focus:border-purple-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Observação</Label>
              <Textarea 
                value={observacaoComanda}
                onChange={(e) => setObservacaoComanda(e.target.value)}
                placeholder="Ex: Mesa 5, Aniversário, etc."
                rows={2}
                className="border border-border focus:border-purple-500"
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
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Criar Comanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG DELIVERY */}
      <Dialog open={dialogDelivery} onOpenChange={setDialogDelivery}>
        <DialogContent className="max-w-lg border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Truck className="h-6 w-6" />
              Novo Delivery
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">Preencha os dados do cliente</DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Nome *</Label>
                <Input 
                  value={deliveryInfo.nome} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, nome: e.target.value})}
                  className="border border-border focus:border-primary rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Telefone *</Label>
                <Input 
                  value={deliveryInfo.telefone} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, telefone: e.target.value})}
                  className="border border-border focus:border-primary rounded-lg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="font-bold">Endereço *</Label>
                <Input 
                  value={deliveryInfo.endereco} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, endereco: e.target.value})}
                  className="border border-border focus:border-primary rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Número *</Label>
                <Input 
                  value={deliveryInfo.numero} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, numero: e.target.value})}
                  className="border border-border focus:border-primary rounded-lg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Complemento</Label>
                <Input 
                  value={deliveryInfo.complemento} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, complemento: e.target.value})}
                  className="border border-border focus:border-primary rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Bairro *</Label>
                <Input 
                  value={deliveryInfo.bairro} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, bairro: e.target.value})}
                  className="border border-border focus:border-primary rounded-lg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">Cidade *</Label>
                <Input 
                  value={deliveryInfo.cidade} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, cidade: e.target.value})}
                  className="border border-border focus:border-primary rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">CEP</Label>
                <Input 
                  value={deliveryInfo.cep} 
                  onChange={(e) => setDeliveryInfo({...deliveryInfo, cep: e.target.value})}
                  className="border border-border focus:border-primary rounded-lg"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="font-bold">Observação</Label>
              <Textarea 
                value={deliveryInfo.observacao} 
                onChange={(e) => setDeliveryInfo({...deliveryInfo, observacao: e.target.value})}
                rows={2}
                className="border border-border focus:border-primary rounded-lg"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogDelivery(false)} 
              className="flex-1 border border-border hover:bg-muted font-bold"
            >
              Cancelar
            </Button>
            <Button 
              onClick={iniciarDelivery} 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm"
            >
              <Truck className="h-4 w-4 mr-2" />
              Iniciar Delivery
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG PERGUNTA CPF */}
      <Dialog open={dialogPerguntaCPF} onOpenChange={setDialogPerguntaCPF}>
        <DialogContent className="max-w-md border border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl text-center font-bold text-foreground flex items-center justify-center gap-2">
              <User className="h-6 w-6 text-primary" />
              CPF na Nota?
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              O cliente deseja incluir CPF no cupom fiscal?
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center py-4 bg-muted rounded-lg border border-border">
            <p className="text-3xl font-extrabold text-green-600">R$ {total.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">{itensPedido.length} itens</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="font-bold text-sm">CPF do Cliente</Label>
              <Input
                placeholder="Digite o CPF (opcional)"
                value={cpfClientePreVenda}
                onChange={(e) => {
                  const valor = e.target.value.replace(/\D/g, '');
                  if (valor.length <= 11) {
                    let formatado = valor;
                    if (valor.length > 3) formatado = valor.slice(0, 3) + '.' + valor.slice(3);
                    if (valor.length > 6) formatado = formatado.slice(0, 7) + '.' + formatado.slice(7);
                    if (valor.length > 9) formatado = formatado.slice(0, 11) + '-' + formatado.slice(11);
                    setCpfClientePreVenda(formatado);
                  }
                }}
                className="text-center text-lg font-mono border-border focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-sm">Nome do Cliente</Label>
              <Input
                placeholder="Nome (opcional)"
                value={nomeClientePreVenda}
                onChange={(e) => setNomeClientePreVenda(e.target.value)}
                className="border-border focus:border-primary"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button 
              variant="outline"
              onClick={() => {
                setCpfClientePreVenda('');
                setNomeClientePreVenda('');
                setDialogPerguntaCPF(false);
                setDialogPagamento(true);
              }} 
              className="h-14 font-bold border-border hover:bg-muted"
            >
              <X className="h-5 w-5 mr-2" />
              Sem CPF
            </Button>
            <Button 
              onClick={() => {
                setDialogPerguntaCPF(false);
                setDialogPagamento(true);
              }} 
              className="h-14 font-bold bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG PAGAMENTO */}
      <Dialog open={dialogPagamento} onOpenChange={setDialogPagamento}>
        <DialogContent className="max-w-lg border border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center font-bold text-foreground">
              Forma de Pagamento
            </DialogTitle>
            <DialogDescription className="text-center font-semibold text-foreground">{getTipoVendaLabel()}</DialogDescription>
          </DialogHeader>
          
          {/* Resumo do pagamento */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="py-3 bg-muted rounded-lg border border-border">
              <p className="text-xs text-muted-foreground uppercase font-medium">Total</p>
              <p className="text-2xl font-extrabold text-primary">R$ {total.toFixed(2)}</p>
            </div>
            <div className={`py-3 rounded-lg border ${totalPago >= total ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
              <p className="text-xs text-muted-foreground uppercase font-medium">Pago</p>
              <p className={`text-2xl font-extrabold ${totalPago >= total ? 'text-green-600' : 'text-orange-600'}`}>R$ {totalPago.toFixed(2)}</p>
            </div>
          </div>

          {/* Lista de pagamentos adicionados */}
          {pagamentos.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Pagamentos adicionados:</p>
              <div className="space-y-2">
                {pagamentos.map((pg, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted rounded-lg p-3 border">
                    <div className="flex items-center gap-2">
                      <Badge className={
                        pg.forma === 'dinheiro' ? 'bg-green-500' :
                        pg.forma === 'credito' ? 'bg-muted0' :
                        pg.forma === 'debito' ? 'bg-indigo-500' : 'bg-cyan-500'
                      }>
                        {pg.forma === 'dinheiro' ? 'Dinheiro' :
                         pg.forma === 'credito' ? 'Crédito' :
                         pg.forma === 'debito' ? 'Débito' : 'PIX'}
                      </Badge>
                      <span className="font-bold text-foreground">R$ {pg.valor.toFixed(2)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-destructive/10"
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
              <p className="text-sm font-medium text-muted-foreground">Adicionar pagamento:</p>
              
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
                  className="h-14 text-xs font-bold bg-green-600 hover:bg-green-700 text-white" 
                  onClick={() => adicionarPagamento('dinheiro')} 
                >
                  <div className="flex flex-col items-center">
                    <Banknote className="h-5 w-5 mb-1" />
                    DINHEIRO
                  </div>
                </Button>
                <Button 
                  size="sm"
                  className="h-14 text-xs font-bold bg-primary hover:bg-primary/90 text-white" 
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
              className="flex-1 border border-border hover:bg-muted font-bold text-foreground"
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
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
        }))}
        nomeEmpresa={empresa?.nome || 'Sistema PDV'}
        cnpjEmpresa={empresa?.cnpj || ''}
        enderecoEmpresa={empresa?.endereco || ''}
        processando={processando}
        cpfPrePreenchido={cpfClientePreVenda}
        nomePrePreenchido={nomeClientePreVenda}
      />

    </ProtectedRoute>
  );
}
