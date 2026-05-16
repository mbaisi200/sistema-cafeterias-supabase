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
    const empresaId = searchParams.get('empresa_id');
    const clienteId = searchParams.get('cliente_id');
    const limite = parseInt(searchParams.get('limite') || '50');

    if (!empresaId || !clienteId) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'empresa_id e cliente_id são obrigatórios' } }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('fidelidade_transacoes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('cliente_id', clienteId)
      .order('criado_em', { ascending: false })
      .limit(limite);

    if (error) throw error;

    return NextResponse.json({ sucesso: true, dados: data || [] });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
