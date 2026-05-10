import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API para busca de Produtos (usada na emissão de NFe)
 * GET /api/produtos - Listar/buscar produtos
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (!usuario?.empresa_id) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '403', mensagem: 'Empresa não encontrada' } }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca');
    const limite = parseInt(searchParams.get('limite') || '30');

    let query = supabase
      .from('produtos')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .eq('ativo', true);

    if (busca) {
      const termo = `%${busca}%`;
      query = query.or(`nome.ilike.${termo},codigo.ilike.${termo},codigo_barras.ilike.${termo}`);
    }

    query = query.order('nome', { ascending: true }).limit(limite);

    const { data: produtos, error } = await query;

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'DB001', mensagem: error.message } }, { status: 500 });
    }

    const produtosMapeados = (produtos || []).map((p: any) => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      codigo: p.codigo,
      codigo_barras: p.codigo_barras,
      preco: p.preco,
      custo: p.custo,
      unidade: p.unidade,
      categoria_id: p.categoria_id,
      // Dados fiscais para NFE
      ncm: p.ncm || '00000000',
      cest: p.cest || '',
      cfop: p.cfop || '5102',
      cst: p.cst || '00',
      csosn: p.csosn || '102',
      origem: p.origem || '0',
      unidade_tributavel: p.unidade_tributavel || 'UN',
      icms: p.icms || 0,
      ipi_aliquota: p.ipi_aliquota || 0,
      pis_aliquota: p.pis_aliquota || 0,
      cofins_aliquota: p.cofins_aliquota || 0,
    }));

    return NextResponse.json({ sucesso: true, produtos: produtosMapeados });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
