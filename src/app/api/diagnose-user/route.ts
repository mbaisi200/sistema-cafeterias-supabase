import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { authUserId, email } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, anonKey);

    console.log('Diagnóstico - authUserId:', authUserId, 'email:', email);

    // Buscar por auth_user_id
    const { data: byAuthId, error: errorByAuthId } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    // Buscar por email
    const { data: byEmail, error: errorByEmail } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    // Listar todos os usuários com esse email
    const { data: allUsers, error: errorAll } = await supabase
      .from('usuarios')
      .select('id, email, auth_user_id, role, nome')
      .ilike('email', email);

    return NextResponse.json({
      authUserId,
      email,
      buscaPorAuthId: {
        data: byAuthId,
        error: errorByAuthId?.message
      },
      buscaPorEmail: {
        data: byEmail,
        error: errorByEmail?.message
      },
      todosUsuarios: allUsers,
      erroAll: errorAll?.message
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
