import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Configuração do Supabase com service role key (admin)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const { email, password, nome } = await request.json();

    if (!email || !password || !nome) {
      return NextResponse.json(
        { error: 'Email, senha e nome são obrigatórios' },
        { status: 400 }
      );
    }

    // Criar cliente Supabase com service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Verificar se já existe uma empresa master
    const { data: existingEmpresa } = await supabase
      .from('empresas')
      .select('id')
      .eq('nome', 'Master Admin')
      .single();

    let empresaId = existingEmpresa?.id;

    // 2. Criar empresa master se não existir
    if (!empresaId) {
      const { data: novaEmpresa, error: empresaError } = await supabase
        .from('empresas')
        .insert({
          nome: 'Master Admin',
          email: email,
          status: 'ativo',
          plano: 'premium'
        })
        .select('id')
        .single();

      if (empresaError) {
        console.error('Erro ao criar empresa:', empresaError);
        return NextResponse.json(
          { error: 'Erro ao criar empresa master' },
          { status: 500 }
        );
      }

      empresaId = novaEmpresa.id;
    }

    // 3. Verificar se o usuário já existe no Auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers.users.find(u => u.email === email);

    let authUserId: string;

    if (userExists) {
      // Atualizar senha do usuário existente
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        userExists.id,
        { password }
      );

      if (updateError) {
        console.error('Erro ao atualizar usuário:', updateError);
        return NextResponse.json(
          { error: 'Erro ao atualizar senha do usuário' },
          { status: 500 }
        );
      }

      authUserId = userExists.id;
    } else {
      // Criar novo usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true // Confirmar email automaticamente
      });

      if (authError) {
        console.error('Erro ao criar usuário auth:', authError);
        return NextResponse.json(
          { error: 'Erro ao criar usuário de autenticação: ' + authError.message },
          { status: 500 }
        );
      }

      authUserId = authData.user.id;
    }

    // 4. Verificar se já existe registro na tabela usuarios
    const { data: existingUsuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUsuario) {
      // Atualizar registro existente
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          auth_user_id: authUserId,
          nome,
          role: 'master',
          empresa_id: empresaId,
          ativo: true,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', existingUsuario.id);

      if (updateError) {
        console.error('Erro ao atualizar registro usuario:', updateError);
        return NextResponse.json(
          { error: 'Erro ao atualizar registro de usuário' },
          { status: 500 }
        );
      }
    } else {
      // Criar registro na tabela usuarios
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .insert({
          auth_user_id: authUserId,
          email,
          nome,
          role: 'master',
          empresa_id: empresaId,
          ativo: true
        });

      if (usuarioError) {
        console.error('Erro ao criar registro usuario:', usuarioError);
        return NextResponse.json(
          { error: 'Erro ao criar registro de usuário: ' + usuarioError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário master criado/atualizado com sucesso!',
      user: {
        email,
        nome,
        role: 'master',
        empresaId
      }
    });

  } catch (error) {
    console.error('Erro geral:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST para criar o usuário master',
    body: {
      email: 'string',
      password: 'string (mínimo 6 caracteres)',
      nome: 'string'
    }
  });
}
