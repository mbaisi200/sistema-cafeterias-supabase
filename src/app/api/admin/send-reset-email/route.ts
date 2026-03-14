import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validações
    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Enviar email de redefinição de senha via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/recuperar-senha`,
    });

    if (error) {
      console.error('Erro ao enviar email de redefinição:', error);
      
      let errorMessage = 'Erro ao enviar email de redefinição';
      if (error.message.includes('User not found')) {
        errorMessage = 'Usuário não encontrado com este email';
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
      message: 'Email de redefinição de senha enviado com sucesso',
    });

  } catch (error: unknown) {
    console.error('Erro ao enviar email de redefinição:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
