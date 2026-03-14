'use client';

import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCaixa, registrarLog } from './useSupabase';

interface ItemPedido {
  id: string;
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  observacao?: string;
}

export function useVendasPDV() {
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [processando, setProcessando] = useState(false);
  const { empresaId, user } = useAuth();
  const { caixaAberto, registrarVenda: registrarVendaCaixa } = useCaixa();
  const supabase = getSupabaseClient();

  // Adicionar item
  const adicionarItem = useCallback((produto: { id: string; nome: string; preco: number }) => {
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
      }]);
    }
  }, [itensPedido]);

  // Alterar quantidade
  const alterarQuantidade = useCallback((itemId: string, delta: number) => {
    setItensPedido(itensPedido => {
      const item = itensPedido.find(i => i.id === itemId);
      if (!item) return itensPedido;
      
      const novaQtd = item.quantidade + delta;
      if (novaQtd <= 0) {
        return itensPedido.filter(i => i.id !== itemId);
      }
      return itensPedido.map(i => 
        i.id === itemId ? { ...i, quantidade: novaQtd } : i
      );
    });
  }, []);

  // Remover item
  const removerItem = useCallback((itemId: string) => {
    setItensPedido(itensPedido => itensPedido.filter(i => i.id !== itemId));
  }, []);

  // Limpar pedido
  const limparPedido = useCallback(() => {
    setItensPedido([]);
  }, []);

  // Total do pedido
  const total = itensPedido.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

  // Finalizar venda
  const finalizarVenda = useCallback(async (formaPagamento: string, tipoVenda: string = 'balcao', dadosAdicionais?: {
    nomeCliente?: string;
    cpfCliente?: string;
    mesaId?: string;
    mesaNumero?: number;
  }) => {
    if (itensPedido.length === 0) {
      throw new Error('Adicione itens ao pedido');
    }

    if (!empresaId || !user) {
      throw new Error('Usuário não autenticado');
    }

    setProcessando(true);
    try {
      // Criar venda
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          empresa_id: empresaId,
          tipo: tipoVenda,
          canal: tipoVenda,
          status: 'fechada',
          total,
          forma_pagamento: formaPagamento,
          nome_cliente: dadosAdicionais?.nomeCliente,
          mesa_id: dadosAdicionais?.mesaId,
          criado_por: user.id,
          criado_por_nome: user.nome,
        })
        .select()
        .single();

      if (vendaError) throw vendaError;

      // Criar itens de venda
      const itensVenda = itensPedido.map(item => ({
        empresa_id: empresaId,
        venda_id: venda.id,
        produto_id: item.produtoId,
        nome: item.nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco,
        total: item.preco * item.quantidade,
        observacao: item.observacao,
      }));

      const { error: itensError } = await supabase
        .from('itens_venda')
        .insert(itensVenda);

      if (itensError) throw itensError;

      // Criar pagamento
      const { error: pagamentoError } = await supabase
        .from('pagamentos')
        .insert({
          empresa_id: empresaId,
          venda_id: venda.id,
          forma_pagamento: formaPagamento,
          valor: total,
        });

      if (pagamentoError) throw pagamentoError;

      // Registrar no caixa
      if (caixaAberto) {
        await registrarVendaCaixa(total, formaPagamento, venda.id);
      }

      // Registrar log
      await registrarLog({
        empresaId,
        usuarioId: user.id,
        usuarioNome: user.nome,
        acao: 'VENDA_FINALIZADA',
        detalhes: `Venda de ${itensPedido.length} itens - R$ ${total.toFixed(2)}`,
        tipo: 'venda',
      });

      // Limpar pedido
      setItensPedido([]);

      return venda.id;
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      throw error;
    } finally {
      setProcessando(false);
    }
  }, [itensPedido, total, empresaId, user, supabase, caixaAberto, registrarVendaCaixa]);

  return {
    itensPedido,
    total,
    processando,
    adicionarItem,
    alterarQuantidade,
    removerItem,
    limparPedido,
    finalizarVenda,
  };
}
