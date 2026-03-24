import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, anonKey);

    // Buscar o usuário na tabela usuarios
    const { data: usuario, error: errorBusca } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (errorBusca) {
      console.error('Erro ao buscar usuário:', errorBusca);
      return NextResponse.json({ error: 'Usuário não encontrado: ' + errorBusca.message }, { status: 404 });
    }

    console.log('Usuário encontrado:', usuario);

    // Se o auth_user_id está null ou vazio, usar o próprio id
    if (!usuario.auth_user_id) {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ auth_user_id: usuario.id })
        .eq('id', usuario.id);

      if (updateError) {
        console.error('Erro ao atualizar auth_user_id:', updateError);
        return NextResponse.json({ error: 'Erro ao atualizar: ' + updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'auth_user_id atualizado com sucesso',
        user: usuario
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário já está correto',
      user: usuario
    });

  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
