import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }


    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Cliente com service role para criar usuário
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar se já existe na tabela usuarios
    const { data: usuarioExistente, error: errorBusca } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (errorBusca || !usuarioExistente) {
      return NextResponse.json({ error: 'Usuário não encontrado na tabela usuarios' }, { status: 404 });
    }


    // Verificar se já tem auth_user_id válido
    if (usuarioExistente.auth_user_id && 
        usuarioExistente.auth_user_id !== usuarioExistente.id &&
        usuarioExistente.auth_user_id.length === 36) {
      return NextResponse.json({ 
        message: 'Usuário já tem auth_user_id válido',
        auth_user_id: usuarioExistente.auth_user_id 
      });
    }

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true, // Já confirma o email
      user_metadata: {
        nome: usuarioExistente.nome,
        role: usuarioExistente.role
      }
    });

    if (authError) {
      
      // Se o usuário já existe no Auth, tentar buscar
      if (authError.message.includes('already been registered') || 
          authError.message.includes('already registered')) {
        
        // Buscar usuários no auth para encontrar o ID
        const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
        
        if (!listError && usersList) {
          const existingUser = usersList.users.find(u => u.email === email);
          
          if (existingUser) {
            // Atualizar o auth_user_id na tabela usuarios
            const { error: updateError } = await supabase
              .from('usuarios')
              .update({ 
                auth_user_id: existingUser.id,
                atualizado_em: new Date().toISOString()
              })
              .eq('id', usuarioExistente.id);

            if (updateError) {
              return NextResponse.json({ error: 'Erro ao atualizar auth_user_id' }, { status: 500 });
            }

            return NextResponse.json({ 
              message: 'Usuário já existia no Auth. auth_user_id atualizado!',
              auth_user_id: existingUser.id,
              usuario_id: usuarioExistente.id
            });
          }
        }
        
        return NextResponse.json({ error: 'Email já cadastrado no Auth' }, { status: 400 });
      }
      
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }


    // Atualizar o auth_user_id na tabela usuarios
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ 
        auth_user_id: authData.user!.id,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', usuarioExistente.id);

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao atualizar auth_user_id' }, { status: 500 });
    }


    return NextResponse.json({ 
      message: 'Admin sincronizado com sucesso! Agora pode fazer login.',
      auth_user_id: authData.user!.id,
      usuario_id: usuarioExistente.id
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
