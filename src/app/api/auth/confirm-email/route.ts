import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Supabase não configurado' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Buscar o usuário pelo email no Auth
    const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
    }

    const user = usersList.users.find((u) => u.email === email);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado no Auth' }, { status: 404 });
    }

    // Verificar se o email já está confirmado
    if (user.email_confirmed_at) {
      return NextResponse.json({
        success: true,
        message: 'Email já está confirmado',
        alreadyConfirmed: true,
        userId: user.id,
      });
    }

    // Confirmar o email via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao confirmar email' }, { status: 500 });
    }


    return NextResponse.json({
      success: true,
      message: 'Email confirmado com sucesso',
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
