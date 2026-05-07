import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { empresaId } = await request.json();

    if (!empresaId) {
      return NextResponse.json({ erro: 'empresaId é obrigatório' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Buscar auth_user_ids dos usuários da empresa
    const { data: usuarios, error: erroBusca } = await supabase
      .from('usuarios')
      .select('id, auth_user_id')
      .eq('empresa_id', empresaId);

    if (erroBusca) {
      return NextResponse.json({ erro: erroBusca.message }, { status: 500 });
    }

    // 2. Deletar usuários do Auth (supabase.auth.admin)
    if (usuarios && usuarios.length > 0) {
      for (const usuario of usuarios) {
        if (usuario.auth_user_id) {
          const { error: erroAuth } = await supabaseAdmin.auth.admin.deleteUser(usuario.auth_user_id);
          if (erroAuth) {
            // Se o auth user não existir mais, continuar
            if (!erroAuth.message?.includes('User not found')) {
              console.error('Erro ao deletar auth user:', erroAuth.message);
            }
          }
        }
      }
    }

    // 3. Deletar usuários da tabela (cascade cuida do resto)
    const { error: erroUsuarios } = await supabase
      .from('usuarios')
      .delete()
      .eq('empresa_id', empresaId);

    if (erroUsuarios) {
      return NextResponse.json({ erro: erroUsuarios.message }, { status: 500 });
    }

    // 4. Deletar a empresa (cascade deleta produtos, vendas, etc)
    const { error: erroEmpresa } = await supabase
      .from('empresas')
      .delete()
      .eq('id', empresaId);

    if (erroEmpresa) {
      return NextResponse.json({ erro: erroEmpresa.message }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}
