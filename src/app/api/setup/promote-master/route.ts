import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Criar cliente Supabase
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, anonKey);
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Atualizar o usuário para master
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        role: 'master',
        empresa_id: null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('email', email)
      .select()
      .single();

    if (error) {
      console.error('Erro ao promover usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao promover usuário: ' + error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Usuário não encontrado com este email' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Usuário ${email} promovido a MASTER com sucesso!`,
      user: {
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: data.role,
      },
    });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
