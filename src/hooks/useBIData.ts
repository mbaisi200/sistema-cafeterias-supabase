'use client';

import { useState, useMemo, useCallback } from 'react';
import { FiltrosBI, KPI, ProdutoVendido, ProdutoLucroBruto } from '@/types/bi';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, startOfQuarter, endOfQuarter, format, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Venda {
  id: string;
  total?: number;
  subtotal?: number;
  status: string;
  formaPagamento?: string;
  tipo?: string;
  tipoVenda?: string;
  canal?: string;
  criadoEm?: Date;
  criadoPorNome?: string;
  itens?: Array<{
    produtoId: string;
    nome?: string;
    preco?: number;
    precoUnitario?: number;
    quantidade: number;
    categoriaId?: string;
  }>;
}

interface Produto {
  id: string;
  nome: string;
  categoriaId?: string;
  preco?: number;
  custo?: number;
}

interface Categoria {
  id: string;
  nome: string;
}

interface Movimentacao {
  tipo: string;
  valor: number;
  formaPagamento?: string;
}

export function useBIData(vendas: Venda[], produtos: Produto[], categorias: Categoria[], movimentacoes: Movimentacao[]) {
  const [filtros, setFiltros] = useState<FiltrosBI>({
    periodo: 'mes',
    categorias: [],
    formasPagamento: [],
    tiposVenda: [],
    produtos: [],
    status: [],
    canais: [],
  });

  // Criar mapa de produtos para lookup rápido
  const produtosMap = useMemo(() => {
    const map = new Map<string, Produto>();
    produtos.forEach(p => map.set(p.id, p));
    return map;
  }, [produtos]);

  // Criar mapa de categorias para lookup rápido
  const categoriasMap = useMemo(() => {
    const map = new Map<string, Categoria>();
    categorias.forEach(c => map.set(c.id, c));
    return map;
  }, [categorias]);

  // Obter intervalo de datas
  const obterIntervaloDatas = useCallback(() => {
    const agora = new Date();
    switch (filtros.periodo) {
      case 'hoje': return { inicio: startOfDay(agora), fim: endOfDay(agora) };
      case 'ontem': const ontem = subDays(agora, 1); return { inicio: startOfDay(ontem), fim: endOfDay(ontem) };
      case 'semana': return { inicio: startOfWeek(agora, { locale: ptBR }), fim: endOfWeek(agora, { locale: ptBR }) };
      case 'mes': return { inicio: startOfMonth(agora), fim: endOfMonth(agora) };
      case 'trimestre': return { inicio: startOfQuarter(agora), fim: endOfQuarter(agora) };
      case 'ano': return { inicio: startOfYear(agora), fim: endOfYear(agora) };
      case 'personalizado': return { inicio: filtros.dataInicio || startOfMonth(agora), fim: filtros.dataFim || endOfDay(agora) };
      default: return { inicio: startOfDay(agora), fim: endOfDay(agora) };
    }
  }, [filtros]);

  // Período anterior para comparação
  const obterPeriodoAnterior = useCallback(() => {
    const { inicio, fim } = obterIntervaloDatas();
    const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    return { inicio: subDays(inicio, dias), fim: subDays(inicio, 1) };
  }, [obterIntervaloDatas]);

  // Filtrar vendas
  const vendasFiltradas = useMemo(() => {
    const { inicio, fim } = obterIntervaloDatas();
    return vendas.filter(venda => {
      if (!venda.criadoEm || !isWithinInterval(venda.criadoEm, { start: inicio, end: fim })) return false;
      if (filtros.formasPagamento.length > 0 && !filtros.formasPagamento.includes(venda.formaPagamento || '')) return false;
      if (filtros.tiposVenda.length > 0 && !filtros.tiposVenda.includes(venda.tipo || venda.tipoVenda || '')) return false;
      if (filtros.status.length > 0 && !filtros.status.includes(venda.status)) return false;
      if (filtros.canais && filtros.canais.length > 0 && !filtros.canais.includes(venda.canal || '')) return false;
      // Filtro por produto
      if (filtros.produtos.length > 0) {
        const temProdutoFiltrado = venda.itens?.some(item => filtros.produtos.includes(item.produtoId));
        if (!temProdutoFiltrado) return false;
      }
      return true;
    });
  }, [vendas, filtros, obterIntervaloDatas]);

  // Vendas do período anterior
  const vendasPeriodoAnterior = useMemo(() => {
    const { inicio, fim } = obterPeriodoAnterior();
    return vendas.filter(venda => {
      if (!venda.criadoEm || !isWithinInterval(venda.criadoEm, { start: inicio, end: fim })) return false;
      return true;
    });
  }, [vendas, obterPeriodoAnterior]);

  // Vendas concluídas
  const vendasConcluidas = useMemo(() => 
    vendasFiltradas.filter(v => v.status === 'fechada' || v.status === 'finalizada'),
    [vendasFiltradas]
  );

  // Total de vendas
  const totalVendas = useMemo(() => 
    vendasConcluidas.reduce((acc, v) => acc + (v.total || 0), 0),
    [vendasConcluidas]
  );

  // Calcular KPIs
  const kpis = useMemo((): KPI[] => {
    const vendasAnterioresConcluidas = vendasPeriodoAnterior.filter(v => v.status === 'fechada' || v.status === 'finalizada');
    
    const totalVendasAnterior = vendasAnterioresConcluidas.reduce((acc, v) => acc + (v.total || 0), 0);
    const qtdVendas = vendasConcluidas.length;
    const qtdVendasAnterior = vendasAnterioresConcluidas.length;
    const ticketMedio = qtdVendas > 0 ? totalVendas / qtdVendas : 0;
    const ticketMedioAnterior = qtdVendasAnterior > 0 ? totalVendasAnterior / qtdVendasAnterior : 0;
    const vendasCanceladas = vendasFiltradas.filter(v => v.status === 'cancelada').length;

    const calcularVariacao = (atual: number, anterior: number) => {
      if (anterior === 0) return atual > 0 ? 100 : 0;
      return ((atual - anterior) / anterior) * 100;
    };

    return [
      { titulo: 'Faturamento Total', valor: totalVendas, variacao: calcularVariacao(totalVendas, totalVendasAnterior), formato: 'moeda' as const, cor: 'emerald' as const },
      { titulo: 'Quantidade de Vendas', valor: qtdVendas, variacao: calcularVariacao(qtdVendas, qtdVendasAnterior), formato: 'numero' as const, cor: 'blue' as const },
      { titulo: 'Ticket Médio', valor: ticketMedio, variacao: calcularVariacao(ticketMedio, ticketMedioAnterior), formato: 'moeda' as const, cor: 'violet' as const },
      { titulo: 'Produtos Ativos', valor: produtos.length, formato: 'numero' as const, cor: 'amber' as const },
      { titulo: 'Vendas Canceladas', valor: vendasCanceladas, formato: 'numero' as const, cor: 'red' as const },
    ];
  }, [vendasConcluidas, vendasPeriodoAnterior, produtos.length, totalVendas, vendasFiltradas]);

  // Vendas por dia
  const vendasPorDia = useMemo(() => {
    const { inicio, fim } = obterIntervaloDatas();
    const dias: Date[] = [];
    let current = new Date(inicio);
    while (current <= fim) {
      dias.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dias.map(dia => {
      const vendasDia = vendasConcluidas.filter(v => {
        if (!v.criadoEm) return false;
        return startOfDay(v.criadoEm).getTime() === startOfDay(dia).getTime();
      });
      return {
        data: format(dia, 'dd/MM', { locale: ptBR }),
        valor: vendasDia.reduce((acc, v) => acc + (v.total || 0), 0),
        quantidade: vendasDia.length
      };
    });
  }, [vendasConcluidas, obterIntervaloDatas]);

  // Vendas por forma de pagamento
  const vendasPorFormaPagamento = useMemo(() => {
    const formasNomes: Record<string, string> = { dinheiro: 'Dinheiro', credito: 'Crédito', debito: 'Débito', pix: 'PIX', voucher: 'Voucher', cartao_credito: 'Crédito', cartao_debito: 'Débito' };
    
    const porForma = vendasConcluidas.reduce((acc, v) => {
      const forma = v.formaPagamento || 'outros';
      if (!acc[forma]) acc[forma] = { valor: 0, quantidade: 0 };
      acc[forma].valor += v.total || 0;
      acc[forma].quantidade += 1;
      return acc;
    }, {} as Record<string, { valor: number; quantidade: number }>);

    return Object.entries(porForma).map(([forma, dados]) => ({
      forma: formasNomes[forma] || forma,
      valor: dados.valor,
      quantidade: dados.quantidade,
      percentual: totalVendas > 0 ? (dados.valor / totalVendas) * 100 : 0
    })).sort((a, b) => b.valor - a.valor);
  }, [vendasConcluidas, totalVendas]);

  // Vendas por tipo
  const vendasPorTipo = useMemo(() => {
    const tiposNomes: Record<string, string> = { balcao: 'Balcão', mesa: 'Mesa', comanda: 'Comanda', delivery: 'Delivery' };
    
    const porTipo = vendasConcluidas.reduce((acc, v) => {
      const tipo = v.tipo || v.tipoVenda || 'outros';
      if (!acc[tipo]) acc[tipo] = { valor: 0, quantidade: 0 };
      acc[tipo].valor += v.total || 0;
      acc[tipo].quantidade += 1;
      return acc;
    }, {} as Record<string, { valor: number; quantidade: number }>);

    return Object.entries(porTipo).map(([tipo, dados]) => ({
      tipo: tiposNomes[tipo] || tipo,
      valor: dados.valor,
      quantidade: dados.quantidade,
      percentual: totalVendas > 0 ? (dados.valor / totalVendas) * 100 : 0
    })).sort((a, b) => b.valor - a.valor);
  }, [vendasConcluidas, totalVendas]);

  // Vendas por canal (iFood, Rappi, Balcão, etc.)
  const vendasPorCanal = useMemo(() => {
    const canaisNomes: Record<string, string> = {
      balcao: 'Balcão',
      mesa: 'Mesa',
      delivery: 'Delivery',
      ifood: 'iFood',
      rappi: 'Rappi',
      uber_eats: 'Uber Eats',
      whatsapp: 'WhatsApp'
    };

    const porCanal = vendasConcluidas.reduce((acc, v) => {
      const canal = v.canal || v.tipo || v.tipoVenda || 'balcao';
      if (!acc[canal]) acc[canal] = { valor: 0, quantidade: 0 };
      acc[canal].valor += v.total || 0;
      acc[canal].quantidade += 1;
      return acc;
    }, {} as Record<string, { valor: number; quantidade: number }>);

    return Object.entries(porCanal).map(([canal, dados]) => ({
      canal: canaisNomes[canal] || canal,
      canalId: canal,
      valor: dados.valor,
      quantidade: dados.quantidade,
      percentual: totalVendas > 0 ? (dados.valor / totalVendas) * 100 : 0
    })).sort((a, b) => b.valor - a.valor);
  }, [vendasConcluidas, totalVendas]);

  // Produtos mais vendidos - CORRIGIDO
  const produtosMaisVendidos = useMemo((): ProdutoVendido[] => {
    const porProduto = vendasConcluidas.reduce((acc, v) => {
      v.itens?.forEach(item => {
        // Buscar dados do produto se não tiver nome
        const produto = produtosMap.get(item.produtoId);
        const nomeProduto = item.nome || produto?.nome || 'Produto não encontrado';
        const categoriaId = item.categoriaId || produto?.categoriaId || '';
        // Aceitar tanto preco quanto precoUnitario
        const precoUnitario = item.preco || item.precoUnitario || produto?.preco || 0;
        
        if (!acc[item.produtoId]) {
          acc[item.produtoId] = { 
            id: item.produtoId, 
            nome: nomeProduto, 
            categoriaId: categoriaId, 
            quantidadeTotal: 0, 
            valorTotal: 0,
            ticketMedio: 0,
            percentualVendas: 0
          };
        }
        acc[item.produtoId].quantidadeTotal += item.quantidade;
        acc[item.produtoId].valorTotal += precoUnitario * item.quantidade;
      });
      return acc;
    }, {} as Record<string, ProdutoVendido>);

    return Object.values(porProduto)
      .filter(p => p.quantidadeTotal > 0)
      .map(p => ({ 
        ...p, 
        ticketMedio: p.quantidadeTotal > 0 ? p.valorTotal / p.quantidadeTotal : 0, 
        percentualVendas: totalVendas > 0 ? (p.valorTotal / totalVendas) * 100 : 0 
      }))
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 10);
  }, [vendasConcluidas, produtosMap, totalVendas]);

  // Vendas por categoria - CORRIGIDO
  const vendasPorCategoria = useMemo(() => {
    const porCategoria = vendasConcluidas.reduce((acc, v) => {
      v.itens?.forEach(item => {
        // Buscar categoria do produto se não tiver no item
        const produto = produtosMap.get(item.produtoId);
        const catId = item.categoriaId || produto?.categoriaId || 'outros';
        const cat = categoriasMap.get(catId);
        // Aceitar tanto preco quanto precoUnitario
        const precoUnitario = item.preco || item.precoUnitario || produto?.preco || 0;
        
        if (!acc[catId]) {
          acc[catId] = { 
            categoria: cat?.nome || 'Outros', 
            valor: 0, 
            quantidade: 0,
            percentual: 0
          };
        }
        acc[catId].valor += precoUnitario * item.quantidade;
        acc[catId].quantidade += item.quantidade;
      });
      return acc;
    }, {} as Record<string, { categoria: string; valor: number; quantidade: number; percentual: number }>);

    const totalGeral = Object.values(porCategoria).reduce((acc, c) => acc + c.valor, 0);
    return Object.values(porCategoria)
      .filter(c => c.valor > 0)
      .map(c => ({ ...c, percentual: totalGeral > 0 ? (c.valor / totalGeral) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor);
  }, [vendasConcluidas, produtosMap, categoriasMap]);

  // Análise por horário
  const analisePorHorario = useMemo(() => {
    const porHora = vendasConcluidas.reduce((acc, v) => {
      if (!v.criadoEm) return acc;
      const hora = v.criadoEm.getHours();
      if (!acc[hora]) acc[hora] = { hora, quantidadeVendas: 0, valorTotal: 0 };
      acc[hora].quantidadeVendas += 1;
      acc[hora].valorTotal += v.total || 0;
      return acc;
    }, {} as Record<number, { hora: number; quantidadeVendas: number; valorTotal: number }>);
    return Object.values(porHora).sort((a, b) => a.hora - b.hora);
  }, [vendasConcluidas]);

  // Análise por dia da semana
  const analisePorDiaSemana = useMemo(() => {
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const porDia = vendasConcluidas.reduce((acc, v) => {
      if (!v.criadoEm) return acc;
      const diaNumero = v.criadoEm.getDay();
      if (!acc[diaNumero]) acc[diaNumero] = { dia: diasSemana[diaNumero], diaNumero, quantidadeVendas: 0, valorTotal: 0 };
      acc[diaNumero].quantidadeVendas += 1;
      acc[diaNumero].valorTotal += v.total || 0;
      return acc;
    }, {} as Record<number, { dia: string; diaNumero: number; quantidadeVendas: number; valorTotal: number }>);
    return Object.values(porDia).sort((a, b) => a.diaNumero - b.diaNumero);
  }, [vendasConcluidas]);

  // Vendas por operador
  const vendasPorOperador = useMemo(() => {
    const porOperador = vendasConcluidas.reduce((acc, v) => {
      const operador = v.criadoPorNome || 'Desconhecido';
      if (!acc[operador]) acc[operador] = { operador, valor: 0, quantidade: 0 };
      acc[operador].valor += v.total || 0;
      acc[operador].quantidade += 1;
      return acc;
    }, {} as Record<string, { operador: string; valor: number; quantidade: number }>);
    return Object.values(porOperador).map(o => ({ ...o, ticketMedio: o.quantidade > 0 ? o.valor / o.quantidade : 0 })).sort((a, b) => b.valor - a.valor);
  }, [vendasConcluidas]);

  // Fluxo de caixa
  const fluxoCaixa = useMemo(() => {
    const entradas = movimentacoes.filter(m => m.tipo === 'venda' || m.tipo === 'reforco' || m.tipo === 'entrada').reduce((acc, m) => acc + (m.valor || 0), 0);
    const saidas = movimentacoes.filter(m => m.tipo === 'sangria' || m.tipo === 'saida').reduce((acc, m) => acc + (m.valor || 0), 0);
    const formasNomes: Record<string, string> = { dinheiro: 'Dinheiro', credito: 'Crédito', debito: 'Débito', pix: 'PIX', voucher: 'Voucher' };
    
    const porForma = movimentacoes.reduce((acc, m) => {
      const forma = formasNomes[m.formaPagamento || ''] || m.formaPagamento || 'Outros';
      if (!acc[forma]) acc[forma] = { entradas: 0, saidas: 0, saldo: 0 };
      if (m.tipo === 'venda' || m.tipo === 'reforco' || m.tipo === 'entrada') acc[forma].entradas += m.valor || 0;
      else acc[forma].saidas += m.valor || 0;
      acc[forma].saldo = acc[forma].entradas - acc[forma].saidas;
      return acc;
    }, {} as Record<string, { entradas: number; saidas: number; saldo: number }>);

    return { entradas, saidas, saldo: entradas - saidas, porForma };
  }, [movimentacoes]);

  // Lucro Bruto por Produto
  const lucroBrutoPorProduto = useMemo((): ProdutoLucroBruto[] => {
    const porProduto = vendasConcluidas.reduce((acc, v) => {
      v.itens?.forEach(item => {
        const produto = produtosMap.get(item.produtoId);
        if (!produto) return;

        const nomeProduto = item.nome || produto.nome || 'Produto não encontrado';
        const categoriaId = item.categoriaId || produto.categoriaId || '';
        const precoUnitario = item.preco || item.precoUnitario || produto.preco || 0;
        const custoUnitario = produto.custo || 0;

        if (!acc[item.produtoId]) {
          acc[item.produtoId] = {
            id: item.produtoId,
            nome: nomeProduto,
            categoriaId: categoriaId,
            quantidadeVendida: 0,
            receitaTotal: 0,
            custoTotal: 0,
            lucroBruto: 0,
            margemLucro: 0,
            precoUnitario: precoUnitario,
            custoUnitario: custoUnitario
          };
        }
        acc[item.produtoId].quantidadeVendida += item.quantidade;
        acc[item.produtoId].receitaTotal += precoUnitario * item.quantidade;
        acc[item.produtoId].custoTotal += custoUnitario * item.quantidade;
      });
      return acc;
    }, {} as Record<string, ProdutoLucroBruto>);

    return Object.values(porProduto)
      .filter(p => p.quantidadeVendida > 0)
      .map(p => ({
        ...p,
        lucroBruto: p.receitaTotal - p.custoTotal,
        margemLucro: p.receitaTotal > 0 ? ((p.receitaTotal - p.custoTotal) / p.receitaTotal) * 100 : 0
      }))
      .sort((a, b) => b.lucroBruto - a.lucroBruto);
  }, [vendasConcluidas, produtosMap]);

  // Resumo do Lucro Bruto
  const resumoLucroBruto = useMemo(() => {
    const totalReceita = lucroBrutoPorProduto.reduce((acc, p) => acc + p.receitaTotal, 0);
    const totalCusto = lucroBrutoPorProduto.reduce((acc, p) => acc + p.custoTotal, 0);
    const totalLucro = totalReceita - totalCusto;
    const margemMedia = totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0;

    return {
      receitaTotal: totalReceita,
      custoTotal: totalCusto,
      lucroBrutoTotal: totalLucro,
      margemMedia: margemMedia
    };
  }, [lucroBrutoPorProduto]);

  // Período formatado
  const periodoFormatado = useMemo(() => {
    const { inicio, fim } = obterIntervaloDatas();
    return `${format(inicio, "dd 'de' MMMM", { locale: ptBR })} - ${format(fim, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
  }, [obterIntervaloDatas]);

  // Atualizar filtros
  const atualizarFiltros = useCallback((novosFiltros: Partial<FiltrosBI>) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }));
  }, []);

  // Resetar filtros
  const resetarFiltros = useCallback(() => {
    setFiltros({ periodo: 'mes', categorias: [], formasPagamento: [], tiposVenda: [], produtos: [], status: [], canais: [] });
  }, []);

  // Opções de filtros
  const opcoesFiltros = useMemo(() => ({
    categorias: categorias.map(c => ({ valor: c.id, label: c.nome })),
    formasPagamento: [
      { valor: 'dinheiro', label: 'Dinheiro' },
      { valor: 'cartao_credito', label: 'Cartão Crédito' },
      { valor: 'cartao_debito', label: 'Cartão Débito' },
      { valor: 'pix', label: 'PIX' },
      { valor: 'voucher', label: 'Voucher' },
      { valor: 'ifood_online', label: 'iFood Online' }
    ],
    tiposVenda: [
      { valor: 'balcao', label: 'Balcão' },
      { valor: 'mesa', label: 'Mesa' },
      { valor: 'comanda', label: 'Comanda' },
      { valor: 'delivery', label: 'Delivery' }
    ],
    produtos: produtos.map(p => ({ valor: p.id, label: p.nome })),
    canais: [
      { valor: 'balcao', label: 'Balcão' },
      { valor: 'mesa', label: 'Mesa' },
      { valor: 'delivery', label: 'Delivery' },
      { valor: 'ifood', label: 'iFood' },
      { valor: 'rappi', label: 'Rappi' },
      { valor: 'uber_eats', label: 'Uber Eats' },
      { valor: 'whatsapp', label: 'WhatsApp' }
    ]
  }), [categorias, produtos]);

  return {
    kpis, 
    vendasPorDia, 
    vendasPorFormaPagamento, 
    vendasPorTipo, 
    vendasPorCanal,
    produtosMaisVendidos,
    vendasPorCategoria, 
    analisePorHorario, 
    analisePorDiaSemana, 
    vendasPorOperador,
    fluxoCaixa,
    lucroBrutoPorProduto,
    resumoLucroBruto,
    periodoFormatado, 
    filtros, 
    opcoesFiltros, 
    atualizarFiltros, 
    resetarFiltros
  };
}
