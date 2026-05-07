import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { authUserId, email } = await request.json();

    if (!authUserId || !email) {
      return NextResponse.json({ error: 'authUserId e email são obrigatórios' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, anonKey);


    // Atualizar o registro do usuário com o auth_user_id correto
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        auth_user_id: authUserId,
        atualizado_em: new Date().toISOString()
      })
      .eq('email', email)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'auth_user_id atualizado com sucesso!',
      user: data
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
