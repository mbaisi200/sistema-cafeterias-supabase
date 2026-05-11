import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresaId, tipo, dataInicio, dataFim, search, status } = body;

    if (!empresaId || !tipo) {
      return NextResponse.json(
        { sucesso: false, erro: 'empresaId e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    // Initialize Supabase with service_role for RLS bypass
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (tipo === 'entrada') {
      // ============================================
      // List NF-e de Entrada (import history from estoque_movimentos)
      // ============================================
      let query = supabase
        .from('estoque_movimentos')
        .select('id, empresa_id, produto_nome, tipo, quantidade, quantidade_informada, tipo_entrada, estoque_anterior, estoque_novo, preco_unitario, fornecedor, documento_ref, observacao, criado_em, criado_por_nome')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'entrada')
        .ilike('documento_ref', '%NFe%')
        .order('criado_em', { ascending: false })
        .limit(100);

      // Date filter
      if (dataInicio) {
        query = query.gte('criado_em', `${dataInicio}T00:00:00`);
      }
      if (dataFim) {
        query = query.lte('criado_em', `${dataFim}T23:59:59`);
      }

      // Search by document ref or supplier
      if (search) {
        query = query.or(
          `documento_ref.ilike.%${search}%,fornecedor.ilike.%${search}%,produto_nome.ilike.%${search}%,observacao.ilike.%${search}%`
        );
      }

      const { data: movimentos, error } = await query;

      if (error) {
        return NextResponse.json(
          { sucesso: false, erro: 'Erro ao buscar notas de entrada' },
          { status: 500 }
        );
      }

      // Group by document reference (NFe number) to aggregate products
      const grouped = new Map<string, {
        documento_ref: string;
        fornecedor: string;
        data: string;
        produtos: any[];
        valor_total: number;
        criado_por_nome: string | null;
      }>();

      for (const mov of (movimentos || [])) {
        const docRef = mov.documento_ref || 'Documento';
        if (!grouped.has(docRef)) {
          grouped.set(docRef, {
            documento_ref: docRef,
            fornecedor: mov.fornecedor || '-',
            data: mov.criado_em,
            produtos: [],
            valor_total: 0,
            criado_por_nome: mov.criado_por_nome || null,
          });
        }
        const entry = grouped.get(docRef)!;
        entry.produtos.push({
          id: mov.id,
          produto_nome: mov.produto_nome,
          quantidade: mov.quantidade,
          tipo_entrada: mov.tipo_entrada,
          preco_unitario: mov.preco_unitario,
          estoque_novo: mov.estoque_novo,
          observacao: mov.observacao,
        });
        entry.valor_total += (mov.preco_unitario || 0) * (mov.quantidade || 0);
      }

      const resultados = Array.from(grouped.values());

      return NextResponse.json({
        sucesso: true,
        dados: resultados,
        total: resultados.length,
      });

    } else if (tipo === 'saida') {
      // ============================================
      // List NF-e de Saída (vendas + pedidos pendentes de NF-e)
      // ============================================

      // Fetch vendas (existing sales)
      let vendasQuery = supabase
        .from('vendas')
        .select('id, empresa_id, status, criado_em, nome_cliente, total, forma_pagamento, nfe_emitida, nfe_id')
        .eq('empresa_id', empresaId)
        .eq('status', 'fechada')
        .order('criado_em', { ascending: false })
        .limit(100);

      if (dataInicio) vendasQuery = vendasQuery.gte('criado_em', `${dataInicio}T00:00:00`);
      if (dataFim) vendasQuery = vendasQuery.lte('criado_em', `${dataFim}T23:59:59`);

      if (status === 'com_nfe') vendasQuery = vendasQuery.eq('nfe_emitida', true);
      else if (status === 'sem_nfe') vendasQuery = vendasQuery.eq('nfe_emitida', false);

      if (search && status !== 'com_nfe') {
        vendasQuery = vendasQuery.or(
          `nome_cliente.ilike.%${search}%,id.ilike.%${search}%,forma_pagamento.ilike.%${search}%`
        );
      }

      const { data: vendas } = await vendasQuery;

      const resultadosVendas = (vendas || []).map((venda: any) => ({
        id: venda.id,
        numero: venda.numero || venda.id?.substring(0, 8).toUpperCase(),
        data: venda.criado_em,
        cliente: venda.nome_cliente || 'Cliente não identificado',
        total: venda.total || 0,
        forma_pagamento: venda.forma_pagamento || '-',
        status: venda.nfe_emitida ? 'nfe_emitida' : 'pendente',
        nfe_id: venda.nfe_id || null,
        tipo_origem: 'venda',
      }));

      // Fetch pedidos pendentes/aprovados sem NF-e
      let pedidosQuery = supabase
        .from('pedidos')
        .select('id, empresa_id, numero, status, criado_em, cliente_nome, total, forma_pagamento, nfe_id')
        .eq('empresa_id', empresaId)
        .in('status', ['pendente', 'aprovado'])
        .is('nfe_id', null)
        .order('criado_em', { ascending: false })
        .limit(50);

      if (dataInicio) pedidosQuery = pedidosQuery.gte('criado_em', `${dataInicio}T00:00:00`);
      if (dataFim) pedidosQuery = pedidosQuery.lte('criado_em', `${dataFim}T23:59:59`);

      if (search && status !== 'com_nfe') {
        pedidosQuery = pedidosQuery.or(
          `cliente_nome.ilike.%${search}%,numero::text.ilike.%${search}%`
        );
      }

      const { data: pedidos } = await pedidosQuery;

      const resultadosPedidos = (pedidos || []).map((pedido: any) => ({
        id: pedido.id,
        numero: String(pedido.numero || pedido.id?.substring(0, 8)).toUpperCase(),
        data: pedido.criado_em,
        cliente: pedido.cliente_nome || 'Cliente não identificado',
        total: pedido.total || 0,
        forma_pagamento: pedido.forma_pagamento || '-',
        status: 'pendente',
        nfe_id: null,
        tipo_origem: 'pedido',
      }));

      // Merge: vendas first, then pedidos
      const resultados = [...resultadosVendas, ...resultadosPedidos];

      return NextResponse.json({
        sucesso: true,
        dados: resultados,
        total: resultados.length,
      });

    } else {
      return NextResponse.json(
        { sucesso: false, erro: 'Tipo inválido. Use "entrada" ou "saida"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
