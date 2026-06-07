'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient, debitarEstoqueVenda, reporEstoqueVenda } from '@/lib/supabase';
import { imprimirCupomFiscal } from '@/components/pdv/CupomFiscal';
import type { ConfiguracoesCupom } from '@/hooks/useSupabase';
import { configuracoesCupomPadrao } from '@/hooks/useSupabase';
import {
  Clock,
  CheckCircle,
  ChefHat,
  Package,
  Bike,
  Home,
  XCircle,
  Phone,
  MapPin,
  RefreshCw,
  Eye,
  Timer,
  DollarSign,
  AlertCircle,
  ChevronLeft,
  Store,
  Globe,
  ExternalLink,
  UtensilsCrossed,
  Settings,
} from 'lucide-react';

type Origem = 'cardapio' | 'ifood' | 'uber_eats' | 'noventa_e_nove';

interface PedidoItem {
  nome: string;
  produto_nome?: string;
  produto_id?: string;
  quantidade: number;
  total?: number;
  preco_unitario?: number;
}

interface Pedido {
  id: string;
  codigo: string;
  tipo: 'delivery' | 'retirada' | 'consumo_local';
  status: string;
  subtotal: number;
  taxa_entrega: number;
  total: number;
  forma_pagamento: string;
  troco_para?: number;
  troco?: number;
  observacoes?: string;
  criado_em: string;
  endereco_entrega?: any;
  cliente?: { nome: string; telefone: string };
  itens?: PedidoItem[];
  origem: Origem;
  venda_id?: string;
}

const ORIGEM_CONFIG: Record<Origem, { label: string; color: string; icon: React.ReactNode }> = {
  cardapio: { label: 'Cardápio', color: 'bg-blue-500', icon: <Store className="h-3 w-3" /> },
  ifood: { label: 'iFood', color: 'bg-red-500', icon: <Globe className="h-3 w-3" /> },
  uber_eats: { label: 'Uber Eats', color: 'bg-green-600', icon: <Globe className="h-3 w-3" /> },
  noventa_e_nove: { label: '99Food', color: 'bg-purple-600', icon: <Globe className="h-3 w-3" /> },
};

function formatCurrency(value: number | undefined | null): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'pendente': { label: 'Pendente', color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> },
  'confirmado': { label: 'Confirmado', color: 'bg-blue-500', icon: <CheckCircle className="h-4 w-4" /> },
  'em_preparacao': { label: 'Em Preparação', color: 'bg-orange-500', icon: <ChefHat className="h-4 w-4" /> },
  'pronto': { label: 'Pronto', color: 'bg-green-500', icon: <Package className="h-4 w-4" /> },
  'saiu_para_entrega': { label: 'Saiu para Entrega', color: 'bg-purple-500', icon: <Bike className="h-4 w-4" /> },
  'entregue': { label: 'Entregue', color: 'bg-green-600', icon: <Home className="h-4 w-4" /> },
  'cancelado': { label: 'Cancelado', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> },
  'rejeitado': { label: 'Rejeitado', color: 'bg-red-600', icon: <XCircle className="h-4 w-4" /> },
  'aberta': { label: 'Aguardando', color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> },
  'em_preparo': { label: 'Em Preparo', color: 'bg-orange-500', icon: <ChefHat className="h-4 w-4" /> },
  'pronta': { label: 'Pronta', color: 'bg-green-500', icon: <Package className="h-4 w-4" /> },
};

function getNextStatus(pedido: Pedido): { nextStatus: string; label: string; icon: React.ReactNode } | null {
  const { status, tipo } = pedido;
  switch (status) {
    case 'pendente':
      return { nextStatus: 'em_preparacao', label: 'Iniciar Preparo', icon: <ChefHat className="h-3 w-3" /> };
    case 'em_preparacao':
      return { nextStatus: 'pronto', label: 'Pronto', icon: <Package className="h-3 w-3" /> };
    case 'pronto':
      if (tipo === 'delivery') return { nextStatus: 'saiu_para_entrega', label: 'Saiu p/ Entrega', icon: <Bike className="h-3 w-3" /> };
      return { nextStatus: 'entregue', label: 'Entregue', icon: <Home className="h-3 w-3" /> };
    case 'saiu_para_entrega':
      return { nextStatus: 'entregue', label: 'Entregue', icon: <Home className="h-3 w-3" /> };
    default:
      return null;
  }
}

export default function DeliveryAdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [processando, setProcessando] = useState(false);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [ifoodConnected, setIfoodConnected] = useState(false);
  const [uberConnected, setUberConnected] = useState(false);
  const [noventaENoveConnected, setNoventaENoveConnected] = useState(false);
  const [empresaPrint, setEmpresaPrint] = useState<{ nome: string; cnpj: string; endereco: string; telefone: string; logo_url?: string } | null>(null);
  const [cupomConfig, setCupomConfig] = useState<ConfiguracoesCupom>(configuracoesCupomPadrao);

  useEffect(() => {
    if (empresaId) {
      loadPedidos();
      loadIntegrationStatus();
      loadEmpresaData();
    }
  }, [empresaId]);

  const loadEmpresaData = async () => {
    const { data: emp } = await supabase.from('empresas').select('nome, cnpj, endereco, telefone, logo_url').eq('id', empresaId).single();
    if (emp) {
      setEmpresaPrint({ nome: emp.nome, cnpj: emp.cnpj || '', endereco: emp.endereco || '', telefone: emp.telefone || '' , logo_url: emp.logo_url || undefined });
    }
    const { data: cfg } = await supabase.from('cupom_config').select('*').eq('empresa_id', empresaId).maybeSingle();
    if (cfg) {
      setCupomConfig({
        nomeEmpresa: cfg.nome_empresa || '',
        cnpj: cfg.cnpj || '',
        endereco: cfg.endereco || '',
        telefone: cfg.telefone || '',
        mensagemRodape: cfg.mensagem_rodape || 'Obrigado pela preferência!',
        mostrarCPF: cfg.mostrar_cpf !== false,
        mostrarData: cfg.mostrar_data !== false,
        mostrarHora: cfg.mostrar_hora !== false,
        mostrarVendedor: cfg.mostrar_vendedor !== false,
        mostrarDesconto: cfg.mostrar_desconto !== false,
        tamanhoFonte: cfg.tamanho_fonte || 12,
        larguraPapel: cfg.largura_papel || 58,
        espacamentoLinhas: cfg.espacamento_linhas || 1.4,
        margemSuperior: cfg.margem_superior || 2,
        margemInferior: cfg.margem_inferior || 2,
        margemEsquerda: cfg.margem_esquerda || 2,
        margemDireita: cfg.margem_direita || 2,
        intensidadeImpressao: cfg.intensidade_impressao || 'escura',
        imprimirAutomatico: cfg.imprimir_automatico !== false,
        vias: cfg.vias || 1,
      });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (empresaId) loadPedidos();
    }, 30000);
    return () => clearInterval(interval);
  }, [empresaId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (empresaId) autoCleanupProntos();
    }, 60000);
    autoCleanupProntos();
    return () => clearInterval(interval);
  }, [empresaId]);

  const loadIntegrationStatus = async () => {
    setIntegrationsLoading(true);
    try {
      const { data: ifoodCfg } = await supabase
        .from('ifood_config')
        .select('status')
        .eq('empresa_id', empresaId)
        .maybeSingle();
      const { data: uberCfg } = await supabase
        .from('uber_eats_config')
        .select('status')
        .eq('empresa_id', empresaId)
        .maybeSingle();
      const { data: noventaENoveCfg } = await supabase
        .from('noventa_e_nove_config')
        .select('status')
        .eq('empresa_id', empresaId)
        .maybeSingle();
      setIfoodConnected(ifoodCfg?.status === 'connected');
      setUberConnected(uberCfg?.status === 'connected');
      setNoventaENoveConnected(noventaENoveCfg?.status === 'connected');
    } catch (e) {
      console.error('Erro ao carregar status integrações:', e);
    } finally {
      setIntegrationsLoading(false);
    }
  };

  const loadPedidos = async () => {
    try {
      const supabase = getSupabaseClient();

      const { data: pedidosDelivery, error: err1 } = await supabase
        .from('pedido_delivery')
        .select('*')
        .eq('empresa_id', empresaId)
        .in('status', ['pendente', 'confirmado', 'em_preparacao', 'pronto', 'saiu_para_entrega'])
        .order('criado_em', { ascending: false });

      if (err1) throw err1;

      const { data: vendas, error: err2 } = await supabase
        .from('vendas')
        .select('id, tipo, canal, status, subtotal, taxa_entrega, total, forma_pagamento, pedido_externo_id, nome_cliente, telefone_cliente, entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro, entrega_cidade, entrega_estado, entrega_cep, observacao, criado_em')
        .eq('empresa_id', empresaId)
        .in('canal', ['ifood', 'uber_eats', 'noventa_e_nove'])
        .not('status', 'in', '("fechada","cancelada","finalizada")')
        .order('criado_em', { ascending: false });

      if (err2) throw err2;

      const integrados: Pedido[] = (vendas || []).map(v => ({
        id: v.id,
        codigo: v.pedido_externo_id || v.id.slice(0, 8),
        tipo: 'delivery' as const,
        status: v.status === 'aberta' ? 'pendente' : v.status,
        subtotal: v.subtotal || 0,
        taxa_entrega: v.taxa_entrega || 0,
        total: v.total || 0,
        forma_pagamento: v.forma_pagamento || 'online',
        observacoes: v.observacao || '',
        criado_em: v.criado_em,
        endereco_entrega: v.entrega_logradouro ? {
          logradouro: v.entrega_logradouro,
          numero: v.entrega_numero,
          complemento: v.entrega_complemento,
          bairro: v.entrega_bairro,
          cidade: v.entrega_cidade,
          estado: v.entrega_estado,
          cep: v.entrega_cep,
        } : null,
        cliente: v.nome_cliente ? { nome: v.nome_cliente, telefone: v.telefone_cliente || '' } : undefined,
        origem: v.canal as Origem,
        venda_id: v.id,
      }));

      const todos = [
        ...(pedidosDelivery || []).map((p: any) => ({ ...p, origem: 'cardapio' as Origem })),
        ...integrados,
      ];

      todos.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

      const pedidoIds = pedidosDelivery?.map(p => p.id) || [];
      const vendaIds = vendas?.map(v => v.id) || [];

      const itensMap: Record<string, PedidoItem[]> = {};

      try {
        if (pedidoIds.length > 0) {
          const { data: itens, error: itensErr } = await supabase
            .from('pedido_delivery_itens')
            .select('pedido_id, produto_nome, quantidade')
            .in('pedido_id', pedidoIds);
          if (itensErr) {
            console.error('Erro ao carregar itens delivery:', itensErr);
          } else {
            itens?.forEach(i => {
              if (!itensMap[i.pedido_id]) itensMap[i.pedido_id] = [];
              itensMap[i.pedido_id].push({ nome: i.produto_nome, produto_nome: i.produto_nome, quantidade: i.quantidade });
            });
          }
        }
      } catch (e) {
        console.error('Erro ao carregar itens delivery:', e);
      }

      try {
        if (vendaIds.length > 0) {
          const { data: itensVenda, error: itensVendaErr } = await supabase
            .from('itens_venda')
            .select('venda_id, nome, quantidade, total')
            .in('venda_id', vendaIds);
          if (itensVendaErr) {
            console.error('Erro ao carregar itens venda:', itensVendaErr);
          } else {
            itensVenda?.forEach(i => {
              if (!itensMap[i.venda_id]) itensMap[i.venda_id] = [];
              itensMap[i.venda_id].push({ nome: i.nome, produto_nome: i.nome, quantidade: i.quantidade, total: i.total });
            });
          }
        }
      } catch (e) {
        console.error('Erro ao carregar itens venda:', e);
      }

      const todosComItens = todos.map(p => ({
        ...p,
        itens: itensMap[p.id] || itensMap[p.venda_id || ''] || [],
      }));

      setPedidos(todosComItens);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const autoCleanupProntos = async () => {
    if (!empresaId) return;
    const limite = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const supabase = getSupabaseClient();
    let alterou = false;

    const { data: prontosDelivery } = await supabase
      .from('pedido_delivery')
      .select('id, tipo, status')
      .eq('empresa_id', empresaId)
      .in('status', ['pronto', 'saiu_para_entrega'])
      .lt('atualizado_em', limite);
    if (prontosDelivery?.length) {
      for (const p of prontosDelivery) {
        const prox = p.status === 'saiu_para_entrega' ? 'entregue' : (p.tipo === 'delivery' ? 'saiu_para_entrega' : 'entregue');
        await supabase.from('pedido_delivery').update({ status: prox, atualizado_em: new Date().toISOString() }).eq('id', p.id);
      }
      alterou = true;
    }

    const { data: prontasVendas } = await supabase
      .from('vendas')
      .select('id')
      .eq('empresa_id', empresaId)
      .in('canal', ['ifood', 'uber_eats', 'noventa_e_nove'])
      .in('status', ['pronta', 'saiu_para_entrega'])
      .lt('atualizado_em', limite);
    if (prontasVendas?.length) {
      for (const v of prontasVendas) {
        await supabase.from('vendas').update({ status: 'entregue', atualizado_em: new Date().toISOString() }).eq('id', v.id);
      }
      alterou = true;
    }

    if (alterou) loadPedidos();
  };

  const loadPedidoDetalhes = async (pedido: Pedido) => {
    if (pedido.origem === 'cardapio') {
      const { data: itens } = await supabase
        .from('pedido_delivery_itens')
        .select('*')
        .eq('pedido_id', pedido.id);
      return (itens || []).map((i: any) => ({
        ...i,
        produto_id: i.produto_id || null,
        produto_nome: i.produto_nome || i.nome,
      }));
    } else {
      const { data: itens } = await supabase
        .from('itens_venda')
        .select('*')
        .eq('venda_id', pedido.venda_id || pedido.id);
      return (itens || []).map((i: any) => ({
        ...i,
        quantidade: i.quantidade,
        produto_id: i.produto_id || null,
        produto_nome: i.nome || i.produto_nome,
        total: i.total,
      }));
    }
  };

  const handleVerPedido = async (pedido: Pedido) => {
    const itens = await loadPedidoDetalhes(pedido);
    setPedidoSelecionado({ ...pedido, itens });
    setModalOpen(true);
  };

  const handlePrintCupom = async (pedido: Pedido, vendaId: string) => {
    // Abrir janela de impressão SINCRONAMENTE antes do await para evitar bloqueio de pop-up
    let printWindow: Window | null = null;
    try { printWindow = window.open('', '_blank', 'width=400,height=600'); } catch {}

    const itens = await loadPedidoDetalhes(pedido);
    const emp = empresaPrint;
    const cfg = cupomConfig;
    imprimirCupomFiscal({
      nomeEmpresa: emp?.nome || cfg.nomeEmpresa || 'Empresa',
      cnpjEmpresa: emp?.cnpj || cfg.cnpj || '',
      enderecoEmpresa: emp?.endereco || cfg.endereco || '',
      cpfCliente: '',
      nomeCliente: pedido.cliente?.nome || '',
      itens: itens.map(i => ({
        nome: i.produto_nome || i.nome,
        quantidade: i.quantidade || 0,
        preco: i.total && i.quantidade ? i.total / i.quantidade : 0,
      })),
      total: pedido.total || 0,
      formaPagamento: pedido.forma_pagamento || '',
      tamanhoCupom: (cfg.larguraPapel || 58) <= 58 ? '58mm' : '80mm',
      codigoVenda: vendaId.slice(0, 8),
      configuracoes: cfg,
      logoUrl: emp?.logo_url,
    }, printWindow);
  };

  const handlePrintCozinha = async (pedido: Pedido) => {
    const itens = await loadPedidoDetalhes(pedido);
    const cfg = cupomConfig;
    const largura = cfg.larguraPapel || 58;
    const is58mm = largura <= 58;
    const tamanhoFonte = cfg.tamanhoFonte || 12;
    const lineHeight = cfg.espacamentoLinhas || 1.4;
    const mt = cfg.margemSuperior || 2;
    const mb = cfg.margemInferior || 2;

    const origemLabel = ORIGEM_CONFIG[pedido.origem]?.label || pedido.origem;
    const dataHora = new Date().toLocaleString('pt-BR');

    const linha = (t: string) => `<div style="font-size:${tamanhoFonte}px;line-height:${lineHeight};padding:0;margin:0;white-space:pre-wrap">${t}</div>`;

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comanda Cozinha</title>
<style>
@page { margin: ${mt}mm ${mb}mm; size: ${largura}mm auto; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Courier New', monospace; font-size: ${tamanhoFonte}px; width: ${largura}mm; padding: 2mm; }
table { width: 100%; border-collapse: collapse; }
td { vertical-align: top; }
hr { border: none; border-top: 1px dashed #000; margin: 2px 0; }
.t-center { text-align: center; }
.t-bold { font-weight: bold; }
.t-small { font-size: ${Math.max(tamanhoFonte - 2, 8)}px; }
</style></head><body>
${linha(`<div class="t-center t-bold">${cfg.nomeEmpresa || 'COZINHA'}</div>`)}
${linha(`<div class="t-center t-small">Comanda de Preparo</div>`)}
<hr>
${linha(`<b>Pedido:</b> #${pedido.codigo}`)}
${linha(`<b>Origem:</b> ${origemLabel}`)}
${pedido.cliente?.nome ? linha(`<b>Cliente:</b> ${pedido.cliente.nome}`) : ''}
${pedido.observacoes ? linha(`<b>Obs:</b> ${pedido.observacoes}`) : ''}
<hr>
${linha('<b>ITENS</b>')}`;

    itens.forEach(i => {
      const nome = i.produto_nome || i.nome;
      const qtd = i.quantidade || 0;
      html += linha(`${qtd}x ${nome}`);
    });

    html += `<hr>
${linha(`<div class="t-small">${dataHora}</div>`)}
${linha('<div class="t-center t-small">--- Cozinha ---</div>')}
</body></html>`;

    const win = window.open('', '_blank', `width=${Math.min(largura * 4 + 40, 500)},height=600`);
    if (!win) { alert('Habilite pop-ups para imprimir a comanda de cozinha.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const atualizarStatus = async (pedido: Pedido, novoStatus: string) => {
    setProcessando(true);
    try {
      const now = new Date().toISOString();
      const updateData: any = { status: novoStatus, atualizado_em: now };

      if (novoStatus === 'em_preparacao') updateData.data_preparacao_inicio = now;
      if (novoStatus === 'pronto') updateData.data_preparacao_fim = now;
      if (novoStatus === 'saiu_para_entrega') updateData.data_saida_entrega = now;
      if (novoStatus === 'entregue') updateData.data_entrega = now;

      if (pedido.origem === 'cardapio') {
        const { error } = await supabase
          .from('pedido_delivery')
          .update(updateData)
          .eq('id', pedido.id);

        if (error) throw error;

        await supabase.from('pedido_delivery_historico').insert({
          pedido_id: pedido.id,
          status_anterior: pedido.status,
          status_novo: novoStatus,
          usuario_tipo: 'admin',
          criado_em: now,
        });

        // Se entregue, criar venda + itens_venda + caixa (se dinheiro)
        if (novoStatus === 'em_preparacao') {
          handlePrintCozinha(pedido);
        }

        if (novoStatus === 'entregue' && !pedido.venda_id) {
          const { data: venda, error: vendaErr } = await supabase
            .from('vendas')
            .insert({
              empresa_id: empresaId,
              tipo: 'delivery',
              canal: 'delivery',
              status: 'fechada',
              subtotal: pedido.subtotal || 0,
              taxa_entrega: pedido.taxa_entrega || 0,
              total: pedido.total || 0,
              forma_pagamento: pedido.forma_pagamento || 'dinheiro',
              nome_cliente: pedido.cliente?.nome || null,
              telefone_cliente: pedido.cliente?.telefone || null,
              entrega_logradouro: pedido.endereco_entrega?.logradouro || null,
              entrega_numero: pedido.endereco_entrega?.numero || null,
              entrega_complemento: pedido.endereco_entrega?.complemento || null,
              entrega_bairro: pedido.endereco_entrega?.bairro || null,
              entrega_cidade: pedido.endereco_entrega?.cidade || null,
              entrega_cep: pedido.endereco_entrega?.cep || null,
              observacao: pedido.observacoes || null,
              criado_por: user?.id || null,
              criado_por_nome: user?.nome || null,
              criado_em: now,
              fechado_em: now,
            })
            .select('id')
            .single();

          if (vendaErr) throw vendaErr;

          // Criar itens_venda + baixar estoque
          const itens = await loadPedidoDetalhes(pedido);
          if (itens.length > 0) {
            const itensVenda = itens.map(i => ({
              empresa_id: empresaId,
              venda_id: venda.id,
              produto_id: i.produto_id || null,
              nome: i.produto_nome || i.nome,
              quantidade: i.quantidade || 0,
              preco_unitario: i.preco_unitario || (i.total && i.quantidade ? i.total / i.quantidade : 0),
              total: i.total || 0,
            }));

            const { error: itensErr } = await supabase
              .from('itens_venda')
              .insert(itensVenda);
            if (itensErr) throw itensErr;

            // Baixar estoque para cada item com produto_id
            for (const item of itensVenda) {
              if (item.produto_id) {
                await debitarEstoqueVenda(
                  supabase,
                  empresaId,
                  item.produto_id,
                  item.quantidade,
                  user?.id || null,
                  user?.nome || null,
                  venda.id,
                  `Venda Delivery - ${pedido.codigo}`,
                );
              }
            }
          }

          // Vincular venda_id ao pedido delivery
          await supabase
            .from('pedido_delivery')
            .update({ venda_id: venda.id })
            .eq('id', pedido.id);

          // Se pagamento for dinheiro, registrar no caixa
          const fp = (pedido.forma_pagamento || '').toLowerCase();
          if (fp === 'dinheiro' || fp.includes('dinheiro')) {
            const { data: caixaAberto } = await supabase
              .from('caixas')
              .select('id, valor_atual, total_vendas, total_entradas')
              .eq('empresa_id', empresaId)
              .eq('status', 'aberto')
              .maybeSingle();

            if (caixaAberto) {
              await supabase
                .from('movimentacoes_caixa')
                .insert({
                  caixa_id: caixaAberto.id,
                  empresa_id: empresaId,
                  tipo: 'venda',
                  valor: pedido.total || 0,
                  forma_pagamento: 'dinheiro',
                  venda_id: venda.id,
                  descricao: `Venda Delivery - ${pedido.codigo}`,
                  usuario_id: user?.id || null,
                  usuario_nome: user?.nome || null,
                  criado_em: now,
                });

              await supabase
                .from('caixas')
                .update({
                  valor_atual: (caixaAberto.valor_atual || 0) + (pedido.total || 0),
                  total_vendas: (caixaAberto.total_vendas || 0) + (pedido.total || 0),
                  total_entradas: (caixaAberto.total_entradas || 0) + (pedido.total || 0),
                })
                .eq('id', caixaAberto.id);
            }
          }

          // Imprimir cupom
          handlePrintCupom(pedido, venda.id);
        }
      } else {
        const { error } = await supabase
          .from('vendas')
          .update({ status: novoStatus })
          .eq('id', pedido.venda_id || pedido.id);

        if (error) {
          if (error.message?.includes('vendas_status_check') || error.code === '23514') {
            toast({
              variant: 'destructive',
              title: 'Restrição no banco',
              description: 'A tabela vendas precisade uma constraint para aceitar este status. Execute no SQL Editor:\n\nALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_status_check;\nALTER TABLE vendas ADD CONSTRAINT vendas_status_check CHECK (status IN (\'aberta\',\'fechada\',\'cancelada\',\'finalizada\',\'pendente\',\'confirmado\',\'em_preparacao\',\'pronto\',\'saiu_para_entrega\',\'entregue\'));'
            });
          } else {
            throw error;
          }
          return;
        }

        if (novoStatus === 'em_preparacao') {
          handlePrintCozinha(pedido);
        }
      }

      if (pedido.origem !== 'cardapio') {
        fetch('/api/delivery/notify-integration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresaId,
            vendaId: pedido.venda_id || pedido.id,
            orderExternalId: pedido.codigo,
            origem: pedido.origem,
            status: novoStatus,
          }),
        }).catch(() => {});

        if (novoStatus === 'entregue') {
          handlePrintCupom(pedido, pedido.venda_id || pedido.id);
        }
      }

      toast({ title: 'Status atualizado!', description: `Pedido ${pedido.codigo} atualizado para ${STATUS_CONFIG[novoStatus].label}` });
      loadPedidos();
      setModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status.' });
    } finally {
      setProcessando(false);
    }
  };

  const reporEstoqueCancelamento = async (vendaId: string) => {
    const { data: itens } = await supabase
      .from('itens_venda')
      .select('produto_id, quantidade')
      .eq('venda_id', vendaId);
    if (!itens?.length) return;
    for (const item of itens) {
      if (item.produto_id) {
        await reporEstoqueVenda(supabase, empresaId, item.produto_id, item.quantidade, user?.id, user?.nome, vendaId, `Cancelamento Delivery - ${pedidoSelecionado?.codigo}`);
      }
    }
  };

  const handleCancelar = async () => {
    if (!pedidoSelecionado || !motivoCancelamento.trim()) return;
    setProcessando(true);
    try {
      const now = new Date().toISOString();

      if (pedidoSelecionado.origem === 'cardapio') {
        await supabase
          .from('pedido_delivery')
          .update({ status: 'cancelado', motivo_cancelamento: motivoCancelamento, data_cancelamento: now, atualizado_em: now })
          .eq('id', pedidoSelecionado.id);

        await supabase.from('pedido_delivery_historico').insert({
          pedido_id: pedidoSelecionado.id,
          status_anterior: pedidoSelecionado.status,
          status_novo: 'cancelado',
          observacao: motivoCancelamento,
          usuario_tipo: 'admin',
          criado_em: now,
        });

        // Se já tinha venda gerada, cancelar venda + repor estoque
        if (pedidoSelecionado.venda_id) {
          await reporEstoqueCancelamento(pedidoSelecionado.venda_id);
          await supabase.from('vendas').update({ status: 'cancelada', motivo_cancelamento: motivoCancelamento, cancelado_em: now, atualizado_em: now }).eq('id', pedidoSelecionado.venda_id);
        }
      } else {
        // iFood / Uber Eats — atualizar vendas
        const vendaId = pedidoSelecionado.venda_id || pedidoSelecionado.id;
        await supabase
          .from('vendas')
          .update({ status: 'cancelada', motivo_cancelamento: motivoCancelamento, cancelado_em: now, atualizado_em: now })
          .eq('id', vendaId);

        await reporEstoqueCancelamento(vendaId);

        // Notificar integração
        fetch('/api/delivery/notify-integration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresaId,
            vendaId,
            orderExternalId: pedidoSelecionado.codigo,
            origem: pedidoSelecionado.origem,
            status: 'cancelado',
            motivo: motivoCancelamento,
          }),
        }).catch(() => {});
      }

      toast({ title: 'Pedido cancelado', description: `Pedido ${pedidoSelecionado.codigo} foi cancelado.` });
      setCancelDialogOpen(false);
      setModalOpen(false);
      setMotivoCancelamento('');
      loadPedidos();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível cancelar o pedido.' });
    } finally {
      setProcessando(false);
    }
  };

  const pedidosPendentes = pedidos.filter(p => p.status === 'pendente');
  const pedidosEmPreparacao = pedidos.filter(p => ['confirmado', 'em_preparacao'].includes(p.status));
  const pedidosProntos = pedidos.filter(p => ['pronto', 'saiu_para_entrega'].includes(p.status));

  const ifoodPendentes = pedidosPendentes.filter(p => p.origem === 'ifood');
  const uberPendentes = pedidosPendentes.filter(p => p.origem === 'uber_eats');
  const noventaENovePendentes = pedidosPendentes.filter(p => p.origem === 'noventa_e_nove');
  const cardapioPendentes = pedidosPendentes.filter(p => p.origem === 'cardapio');
  const ifoodPreparacao = pedidosEmPreparacao.filter(p => p.origem === 'ifood');
  const uberPreparacao = pedidosEmPreparacao.filter(p => p.origem === 'uber_eats');
  const noventaENovePreparacao = pedidosEmPreparacao.filter(p => p.origem === 'noventa_e_nove');
  const cardapioPreparacao = pedidosEmPreparacao.filter(p => p.origem === 'cardapio');
  const ifoodProntos = pedidosProntos.filter(p => p.origem === 'ifood');
  const uberProntos = pedidosProntos.filter(p => p.origem === 'uber_eats');
  const noventaENoveProntos = pedidosProntos.filter(p => p.origem === 'noventa_e_nove');
  const cardapioProntos = pedidosProntos.filter(p => p.origem === 'cardapio');
  const integracoesPendentes = pedidosPendentes.filter(p => p.origem !== 'cardapio');

  return (
    <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Delivery' }]}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start md:items-center justify-between gap-2 flex-wrap md:flex-nowrap">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold truncate">Delivery</h1>
                  <Badge className="bg-green-500 animate-pulse text-[10px] px-1.5 py-0 shrink-0">NOVO</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">Cardápio Online, iFood e Uber Eats</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/admin/delivery/config">
                <Button variant="outline" size="sm" className="h-8 text-xs md:text-sm">
                  <Settings className="h-3.5 w-3.5 md:mr-1" /> <span className="hidden md:inline">Config</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="h-8 text-xs md:text-sm" onClick={loadPedidos}>
                <RefreshCw className="h-3.5 w-3.5 md:mr-1" /> <span className="hidden md:inline">Atualizar</span>
              </Button>
            </div>
          </div>

          {/* Banner de Integrações */}
          <Card className={`border-0 shadow-sm ${
            integracoesPendentes.length > 0
              ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-l-4 border-l-orange-400'
              : 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#1e1e32] dark:to-[#1a1a2e]'
          }`}>
            <CardContent className="p-2.5 flex items-start md:items-center justify-between gap-2 flex-wrap md:flex-nowrap">
              <div className="flex items-center gap-1.5 md:gap-2 text-xs flex-wrap">
                <UtensilsCrossed className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">Integrações:</span>
                <Link href="/admin/integracoes/ifood">
                  <Badge className={`cursor-pointer whitespace-nowrap ${ifoodConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
                    <Globe className="h-2.5 w-2.5 mr-0.5" />
                    iFood {ifoodConnected ? '✅' : '❌'}
                  </Badge>
                </Link>
                <Link href="/admin/integracoes/uber-eats">
                  <Badge className={`cursor-pointer whitespace-nowrap ${uberConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 dark:bg-gray-700'}`}>
                    <Globe className="h-2.5 w-2.5 mr-0.5" />
                    Uber Eats {uberConnected ? '✅' : '❌'}
                  </Badge>
                </Link>
                <Link href="/admin/integracoes/noventa-e-nove">
                  <Badge className={`cursor-pointer whitespace-nowrap ${noventaENoveConnected ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 dark:bg-gray-700'}`}>
                    <Globe className="h-2.5 w-2.5 mr-0.5" />
                    99Food {noventaENoveConnected ? '✅' : '❌'}
                  </Badge>
                </Link>
                {integracoesPendentes.length > 0 && (
                  <Badge variant="outline" className="border-orange-300 text-orange-600 dark:text-orange-400 text-[10px] whitespace-nowrap">
                    {integracoesPendentes.length} pendente(s)
                  </Badge>
                )}
              </div>
              <Link href="/admin/integracoes">
                <Button variant="ghost" size="sm" className="h-6 text-xs shrink-0">
                  <ExternalLink className="h-3 w-3 mr-1" /> Gerenciar
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{pedidosPendentes.length}</div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">{pedidosEmPreparacao.length}</div>
                <p className="text-xs text-muted-foreground">Preparação</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{pedidosProntos.length}</div>
                <p className="text-xs text-muted-foreground">Prontos</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pendentes">
            <TabsList>
              <TabsTrigger value="pendentes" className="relative text-xs">
                Pendentes
                {pedidosPendentes.length > 0 && (
                  <Badge className="ml-1.5 bg-yellow-500 text-[10px] h-4 px-1">{pedidosPendentes.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="preparacao" className="text-xs">Em Preparação</TabsTrigger>
              <TabsTrigger value="prontos" className="text-xs">Prontos</TabsTrigger>
            </TabsList>

            <TabsContent value="pendentes" className="space-y-3">
              {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
              ) : pedidosPendentes.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Nenhum pedido pendente</CardContent></Card>
              ) : (
                <div className="space-y-4">
                  <SecaoPedidos titulo="iFood" icon={<Globe className="h-3.5 w-3.5 text-red-500" />} pedidos={ifoodPendentes} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                  <SecaoPedidos titulo="Uber Eats" icon={<Globe className="h-3.5 w-3.5 text-green-600" />} pedidos={uberPendentes} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                  <SecaoPedidos titulo="99Food" icon={<Globe className="h-3.5 w-3.5 text-purple-600" />} pedidos={noventaENovePendentes} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                  <SecaoPedidos titulo="Cardápio Online" icon={<Store className="h-3.5 w-3.5 text-blue-500" />} pedidos={cardapioPendentes} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="preparacao" className="space-y-3">
              {pedidosEmPreparacao.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Nenhum pedido em preparação</CardContent></Card>
              ) : (
                <div className="space-y-4">
                  <SecaoPedidos titulo="iFood" icon={<Globe className="h-3.5 w-3.5 text-red-500" />} pedidos={ifoodPreparacao} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                  <SecaoPedidos titulo="Uber Eats" icon={<Globe className="h-3.5 w-3.5 text-green-600" />} pedidos={uberPreparacao} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                  <SecaoPedidos titulo="99Food" icon={<Globe className="h-3.5 w-3.5 text-purple-600" />} pedidos={noventaENovePreparacao} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                  <SecaoPedidos titulo="Cardápio Online" icon={<Store className="h-3.5 w-3.5 text-blue-500" />} pedidos={cardapioPreparacao} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="prontos" className="space-y-3">
              {pedidosProntos.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Nenhum pedido pronto</CardContent></Card>
              ) : (
                <div className="space-y-4">
                  <SecaoPedidos titulo="iFood" icon={<Globe className="h-3.5 w-3.5 text-red-500" />} pedidos={ifoodProntos} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                  <SecaoPedidos titulo="Uber Eats" icon={<Globe className="h-3.5 w-3.5 text-green-600" />} pedidos={uberProntos} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                  <SecaoPedidos titulo="99Food" icon={<Globe className="h-3.5 w-3.5 text-purple-600" />} pedidos={noventaENoveProntos} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                  <SecaoPedidos titulo="Cardápio Online" icon={<Store className="h-3.5 w-3.5 text-blue-500" />} pedidos={cardapioProntos} onVer={handleVerPedido} onStatusChange={atualizarStatus} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal Detalhes do Pedido */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Pedido {pedidoSelecionado?.codigo}</DialogTitle>
              <DialogDescription>
                {pedidoSelecionado?.cliente?.nome} • {pedidoSelecionado?.cliente?.telefone}
              </DialogDescription>
            </DialogHeader>

            {pedidoSelecionado && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={ORIGEM_CONFIG[pedidoSelecionado.origem].color}>
                    <span className="flex items-center gap-1">
                      {ORIGEM_CONFIG[pedidoSelecionado.origem].icon}
                      {ORIGEM_CONFIG[pedidoSelecionado.origem].label}
                    </span>
                  </Badge>
                  <Badge className={STATUS_CONFIG[pedidoSelecionado.status]?.color || 'bg-gray-500'}>
                    {STATUS_CONFIG[pedidoSelecionado.status]?.icon}
                    <span className="ml-1">{STATUS_CONFIG[pedidoSelecionado.status]?.label || pedidoSelecionado.status}</span>
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(pedidoSelecionado.criado_em)}
                  </span>
                </div>

                {pedidoSelecionado.tipo === 'delivery' && pedidoSelecionado.endereco_entrega && (
                  <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                    <p className="font-medium flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" /> Endereço de Entrega
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pedidoSelecionado.endereco_entrega.logradouro}, {pedidoSelecionado.endereco_entrega.numero}
                      {pedidoSelecionado.endereco_entrega.complemento && ` - ${pedidoSelecionado.endereco_entrega.complemento}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {pedidoSelecionado.endereco_entrega.bairro}
                    </p>
                  </div>
                )}

                <div>
                  <p className="font-medium mb-2">Itens</p>
                  <div className="space-y-2">
                    {pedidoSelecionado.itens?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.quantidade}x {item.produto_nome}</span>
                        <span>{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(pedidoSelecionado.subtotal)}</span></div>
                  {pedidoSelecionado.taxa_entrega > 0 && <div className="flex justify-between"><span>Entrega</span><span>{formatCurrency(pedidoSelecionado.taxa_entrega)}</span></div>}
                  <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(pedidoSelecionado.total)}</span></div>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Pagamento:</span> {pedidoSelecionado.forma_pagamento}
                  {pedidoSelecionado.troco_para && ` (Troco para ${formatCurrency(pedidoSelecionado.troco_para)})`}
                </div>

                {pedidoSelecionado.observacoes && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg text-sm">
                    <strong>Observações:</strong> {pedidoSelecionado.observacoes}
                  </div>
                )}

                <Separator />
                <div className="flex flex-wrap gap-2">
                  {pedidoSelecionado.status === 'pendente' && (
                    <>
                      <Button onClick={() => atualizarStatus(pedidoSelecionado, 'em_preparacao')} disabled={processando} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        <ChefHat className="h-4 w-4 mr-2" /> Iniciar Preparo
                      </Button>
                      <Button variant="destructive" onClick={() => setCancelDialogOpen(true)} disabled={processando}>
                        <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                      </Button>
                    </>
                  )}
                  {pedidoSelecionado.status === 'em_preparacao' && (
                    <Button onClick={() => atualizarStatus(pedidoSelecionado, 'pronto')} disabled={processando} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Package className="h-4 w-4 mr-2" /> Pronto
                    </Button>
                  )}
                  {pedidoSelecionado.status === 'pronto' && pedidoSelecionado.tipo === 'delivery' && (
                    <Button onClick={() => atualizarStatus(pedidoSelecionado, 'saiu_para_entrega')} disabled={processando} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Bike className="h-4 w-4 mr-2" /> Saiu para Entrega
                    </Button>
                  )}
                  {pedidoSelecionado.status === 'saiu_para_entrega' && (
                    <Button onClick={() => atualizarStatus(pedidoSelecionado, 'entregue')} disabled={processando} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Home className="h-4 w-4 mr-2" /> Entregue
                    </Button>
                  )}
                  {pedidoSelecionado.status === 'pronto' && pedidoSelecionado.tipo === 'retirada' && (
                    <Button onClick={() => atualizarStatus(pedidoSelecionado, 'entregue')} disabled={processando} className="w-full bg-blue-600 hover:bg-blue-700">
                      <CheckCircle className="h-4 w-4 mr-2" /> Entregue ao Cliente
                    </Button>
                  )}
                  {!['pendente', 'em_preparacao', 'pronto', 'saiu_para_entrega'].includes(pedidoSelecionado.status) && (
                    <Button variant="destructive" onClick={() => setCancelDialogOpen(true)} disabled={processando} className="flex-1">
                      <XCircle className="h-4 w-4 mr-2" /> Cancelar Pedido
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Pedido</DialogTitle>
              <DialogDescription>Informe o motivo do cancelamento</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Produto indisponível, cliente desistiu..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Voltar</Button>
              <Button variant="destructive" onClick={handleCancelar} disabled={!motivoCancelamento.trim() || processando}>
                {processando ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}

function SecaoPedidos({
  titulo,
  icon,
  pedidos,
  onVer,
  onStatusChange,
  formatCurrency,
  getTimeAgo,
}: {
  titulo: string;
  icon: React.ReactNode;
  pedidos: Pedido[];
  onVer: (p: Pedido) => void;
  onStatusChange: (p: Pedido, status: string) => Promise<void>;
  formatCurrency: (v: number) => string;
  getTimeAgo: (d: string) => string;
}) {
  if (pedidos.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground font-medium">
        {icon}
        <span>{titulo} ({pedidos.length})</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {pedidos.map(p => (
          <PedidoCard key={p.id} pedido={p} onVer={onVer} onStatusChange={onStatusChange} formatCurrency={formatCurrency} getTimeAgo={getTimeAgo} />
        ))}
      </div>
    </div>
  );
}

function PedidoCard({
  pedido,
  onVer,
  onStatusChange,
  formatCurrency,
  getTimeAgo,
}: {
  pedido: Pedido;
  onVer: (p: Pedido) => void;
  onStatusChange: (p: Pedido, status: string) => Promise<void>;
  formatCurrency: (v: number) => string;
  getTimeAgo: (d: string) => string;
}) {
  const supabase = getSupabaseClient();
  const [itensFallback, setItensFallback] = useState<PedidoItem[]>([]);

  const itensCard = pedido.itens && pedido.itens.length > 0 ? pedido.itens : itensFallback;

  useEffect(() => {
    if (pedido.itens && pedido.itens.length > 0) {
      setItensFallback([]);
      return;
    }
    if (!pedido.id) return;
    let cancelled = false;
    (async () => {
      try {
        let data: any[] | null = null;
        if (pedido.origem === 'cardapio') {
          const res = await supabase.from('pedido_delivery_itens')
            .select('produto_nome, quantidade')
            .eq('pedido_id', pedido.id);
          data = res.data;
        } else {
          const res = await supabase.from('itens_venda')
            .select('nome, quantidade')
            .eq('venda_id', pedido.venda_id || pedido.id);
          data = res.data;
        }
        if (!cancelled && data && data.length > 0) {
          setItensFallback(data.map(i => ({
            nome: i.produto_nome || i.nome,
            produto_nome: i.produto_nome || i.nome,
            quantidade: i.quantidade,
          })));
        }
      } catch (e) {
        console.error('Erro ao carregar itens:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [pedido.id, pedido.venda_id, pedido.origem, pedido.itens]);

  const maxItems = 3;
  const previewItens = itensCard.slice(0, maxItems);
  const hasMore = itensCard.length > maxItems;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden border-l-[5px]"
      style={{
        borderLeftColor:
          pedido.origem === 'cardapio' ? '#3b82f6' :
          pedido.origem === 'ifood' ? '#ef4444' : '#16a34a',
      }}
      onClick={() => onVer(pedido)}
    >
      <CardContent className="p-2.5">
        {/* Linha 1: Origem + Código + Status */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <Badge className={`${ORIGEM_CONFIG[pedido.origem].color} text-[10px] h-4 px-1.5 border-0 shrink-0`}>
              <span className="flex items-center gap-0.5">
                {ORIGEM_CONFIG[pedido.origem].icon}
                {ORIGEM_CONFIG[pedido.origem].label}
              </span>
            </Badge>
            <span className="font-bold text-xs truncate">{pedido.codigo}</span>
          </div>
          <Badge className={`${STATUS_CONFIG[pedido.status]?.color || 'bg-gray-500'} text-[10px] h-4 px-1.5 border-0 shrink-0`}>
            {STATUS_CONFIG[pedido.status]?.label || pedido.status}
          </Badge>
        </div>

        {/* Linha 2: Cliente + Telefone + Total */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 flex-1">
            {pedido.cliente?.nome ? (
              <>
                <span className="font-medium truncate">{pedido.cliente.nome}</span>
                <span className="shrink-0">{pedido.cliente.telefone || ''}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">Sem cliente</span>
            )}
          </div>
          <span className="font-bold text-xs whitespace-nowrap">{formatCurrency(pedido.total)}</span>
        </div>

        {/* Linha 3: Endereço */}
        {pedido.endereco_entrega?.logradouro && (
          <div className="flex items-start gap-1 text-[11px] text-muted-foreground mb-1">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="truncate">
              {pedido.endereco_entrega.logradouro}, {pedido.endereco_entrega.numero}
              {pedido.endereco_entrega.bairro && ` - ${pedido.endereco_entrega.bairro}`}
            </span>
          </div>
        )}

        {/* Linha 4: Itens (preview) */}
        {previewItens.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {previewItens.map((item, i) => (
              <Badge key={i} variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-gray-200 dark:border-white/10">
                {item.quantidade}x {item.nome}
              </Badge>
            ))}
            {hasMore && (
              <span className="text-[10px] text-muted-foreground self-center">
                +{itensCard.length - maxItems}
              </span>
            )}
          </div>
        )}

        {/* Linha 5: Tempo + Botões */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] text-muted-foreground">{getTimeAgo(pedido.criado_em)}</span>
          <div className="flex items-center gap-1">
            {(() => {
              const next = getNextStatus(pedido);
              if (next) {
                return (
                  <Button
                    size="sm"
                    className="h-6 text-[10px] px-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={(e) => { e.stopPropagation(); onStatusChange(pedido, next.nextStatus); }}
                  >
                    {next.icon}
                    <span className="ml-1">{next.label}</span>
                  </Button>
                );
              }
              return null;
            })()}
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={(e) => { e.stopPropagation(); onVer(pedido); }}>
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
