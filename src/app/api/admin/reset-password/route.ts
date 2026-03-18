import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, newPassword } = body;

    // Validações
    if (!uid || !newPassword) {
      return NextResponse.json(
        { error: 'UID e nova senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Atualizar a senha do usuário via Supabase Admin
    const { error } = await supabase.auth.admin.updateUserById(uid, {
      password: newPassword,
    });

    if (error) {
      console.error('Erro ao redefinir senha:', error);
      
      let errorMessage = 'Erro ao redefinir senha';
      if (error.message.includes('User not found')) {
        errorMessage = 'Usuário não encontrado';
      } else {
        errorMessage = error.message;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Senha atualizada com sucesso',
    });

  } catch (error: unknown) {
    console.error('Erro ao redefinir senha:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
