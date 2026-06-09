import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recuperado = searchParams.get('recuperado');

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!usuario) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Usuário não encontrado' } }, { status: 404 });
    }

    let query = supabase
      .from('carrinhos_abandonados')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .order('criado_em', { ascending: false })
      .limit(50);

    if (recuperado === 'true') {
      query = query.eq('recuperado', true);
    } else if (recuperado === 'false') {
      query = query.eq('recuperado', false);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, data: data || [] });
  } catch (error) {
    console.error('Erro listar carrinhos:', error);
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
