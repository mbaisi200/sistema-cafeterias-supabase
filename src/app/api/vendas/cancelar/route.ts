import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cancelarVendaCompleta } from '@/lib/vendas-cancelar';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { venda_id, justificativa } = body;

    if (!venda_id || !justificativa?.trim()) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'venda_id e justificativa são obrigatórios' } },
        { status: 400 }
      );
    }

    if (justificativa.trim().length < 5) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'A justificativa deve ter no mínimo 5 caracteres' } },
        { status: 400 }
      );
    }

    // Buscar dados do usuário para registrar quem cancelou
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nome')
      .eq('auth_user_id', user.id)
      .single();

    const canceladoPor = usuario?.id || user.id;
    const canceladoPorNome = usuario?.nome || user.email || '';

    const resultado = await cancelarVendaCompleta(
      supabase,
      venda_id,
      justificativa.trim(),
      canceladoPor,
      canceladoPorNome,
    );

    if (!resultado.sucesso) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: resultado.mensagem } },
        { status: 400 }
      );
    }

    return NextResponse.json({ sucesso: true, mensagem: resultado.mensagem });

  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}
