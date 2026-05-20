import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'ID é obrigatório' } }, { status: 400 });
    }

    const [{ count: pedidos }, { count: nfes }, { count: movimentos }] = await Promise.all([
      supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('fornecedor_id', id),
      supabase.from('nfe').select('*', { count: 'exact', head: true }).eq('fornecedor_id', id),
      supabase.from('estoque_movimentos').select('*', { count: 'exact', head: true }).eq('fornecedor_ref', id),
    ]);

    return NextResponse.json({ sucesso: true, total: (pedidos || 0) + (nfes || 0) + (movimentos || 0) });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
