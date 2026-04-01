import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nome, empresaId, empresaNome } = body;

    if (!email || !password || !nome || !empresaId) {
      return NextResponse.json(
        { error: 'Email, senha, nome e empresaId são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    console.log('🔄 Criando admin:', email, 'para empresa:', empresaId);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Supabase não configurado no servidor' },
        { status: 500 }
      );
    }

    // Cliente com service role (bypass RLS e confirmação de email)
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Criar usuário no Supabase Auth com email_confirm: true
    let authUserId: string;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // CONFIRMAR EMAIL AUTOMATICAMENTE - resolve o problema
      user_metadata: {
        nome,
        role: 'admin',
        empresa_id: empresaId,
        empresa_nome: empresaNome || '',
      },
    });

    if (authError) {
      console.error('❌ Erro ao criar usuário no Auth:', authError);

      // Se o email já existe no Auth, buscar o ID existente
      if (
        authError.message.includes('already been registered') ||
        authError.message.includes('already registered')
      ) {
        const { data: usersList, error: listError } =
          await supabase.auth.admin.listUsers();

        if (!listError && usersList) {
          const existingUser = usersList.users.find((u) => u.email === email);

          if (existingUser) {
            authUserId = existingUser.id;

            // Verificar se o email já está confirmado; se não, confirmar
            if (!existingUser.email_confirmed_at) {
              await supabase.auth.admin.updateUserById(existingUser.id, {
                email_confirm: true,
              });
              console.log('✅ Email confirmado para usuário existente:', email);
            }
          } else {
            return NextResponse.json(
              { error: 'Email já cadastrado mas usuário não encontrado no Auth' },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Este email já está cadastrado no sistema' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Erro ao criar usuário de autenticação: ' + authError.message },
          { status: 500 }
        );
      }
    } else {
      authUserId = authData.user!.id;
      console.log('✅ Usuário criado no Auth com email confirmado:', authUserId);
    }

    // 2. Criar registro na tabela usuarios
    const { error: usuarioError } = await supabase.from('usuarios').insert({
      id: authUserId,
      auth_user_id: authUserId,
      email,
      nome,
      role: 'admin',
      empresa_id: empresaId,
      ativo: true,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    });

    if (usuarioError) {
      // Se o erro for de duplicidade, atualizar o existente
      if (usuarioError.code === '23505') {
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({
            auth_user_id: authUserId,
            nome,
            role: 'admin',
            empresa_id: empresaId,
            ativo: true,
            atualizado_em: new Date().toISOString(),
          })
          .eq('email', email);

        if (updateError) {
          console.error('❌ Erro ao atualizar usuário existente:', updateError);
          return NextResponse.json(
            { error: 'Erro ao atualizar registro de usuário existente' },
            { status: 500 }
          );
        }
      } else {
        console.error('❌ Erro ao criar registro usuario:', usuarioError);
        return NextResponse.json(
          { error: 'Erro ao criar registro de usuário: ' + usuarioError.message },
          { status: 500 }
        );
      }
    }

    console.log('✅ Admin criado com sucesso! Pode fazer login imediatamente.');

    return NextResponse.json({
      success: true,
      message: `Admin ${nome} criado com sucesso! O usuário pode fazer login imediatamente com o email ${email}.`,
      userId: authUserId,
    });
  } catch (error) {
    console.error('❌ Erro geral ao criar admin:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
