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
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'entrada')
        .ilike('documento_ref', '%NFe%')
        .order('criado_em', { ascending: false });

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
        console.error('Erro ao buscar NF-e de entrada:', error);
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
      // List NF-e de Saída (recent sales that could have NF-e)
      // ============================================
      let query = supabase
        .from('vendas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('status', 'fechada')
        .order('criado_em', { ascending: false });

      // Date filter
      if (dataInicio) {
        query = query.gte('criado_em', `${dataInicio}T00:00:00`);
      }
      if (dataFim) {
        query = query.lte('criado_em', `${dataFim}T23:59:59`);
      }

      // Search by client name or sale number
      if (search) {
        query = query.or(
          `nome_cliente.ilike.%${search}%,id.ilike.%${search}%,forma_pagamento.ilike.%${search}%`
        );
      }

      // Status filter (nfe_emitida: boolean)
      if (status === 'com_nfe') {
        query = query.eq('nfe_emitida', true);
      } else if (status === 'sem_nfe') {
        query = query.eq('nfe_emitida', false);
      }

      const { data: vendas, error } = await query;

      if (error) {
        console.error('Erro ao buscar NF-e de saída:', error);
        return NextResponse.json(
          { sucesso: false, erro: 'Erro ao buscar notas de saída' },
          { status: 500 }
        );
      }

      const resultados = (vendas || []).map((venda: any) => ({
        id: venda.id,
        numero: venda.numero || venda.id?.substring(0, 8).toUpperCase(),
        data: venda.criado_em,
        cliente: venda.nome_cliente || 'Cliente não identificado',
        total: venda.total || 0,
        forma_pagamento: venda.forma_pagamento || '-',
        status: venda.nfe_emitida ? 'nfe_emitida' : 'pendente',
        nfe_id: venda.nfe_id || null,
      }));

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
    console.error('Erro ao listar NFes:', error);
    return NextResponse.json(
      { sucesso: false, erro: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
