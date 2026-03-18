import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { authUserId } = await request.json();

    if (!authUserId) {
      return NextResponse.json({ error: 'authUserId é obrigatório' }, { status: 400 });
    }

    console.log('🔍 API: Buscando usuário com auth_user_id:', authUserId);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Usar service role para evitar problemas de RLS
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    console.log('📊 API: Resultado:', { data: data?.email, error: error?.message });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se a empresa está ativa e não vencida
    if (data.empresa_id && data.role !== 'master') {
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('id, status, validade')
        .eq('id', data.empresa_id)
        .single();

      if (!empresaError && empresa) {
        if (empresa.status === 'bloqueado') {
          return NextResponse.json({ 
            error: 'Sua assinatura está bloqueada. Entre em contato com o administrador.',
            blocked: true 
          }, { status: 403 });
        }

        if (empresa.validade) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0);
          const validadeDate = new Date(empresa.validade);
          validadeDate.setHours(23, 59, 59);

          if (validadeDate < hoje) {
            return NextResponse.json({ 
              error: 'Sua assinatura expirou! Entre em contato com o administrador.',
              expired: true 
            }, { status: 403 });
          }
        }
      }
    }

    // ✅ NOVO: Atualizar os custom claims do usuário no Supabase Auth
    try {
      const adminAuthClient = createClient(supabaseUrl, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      await adminAuthClient.auth.admin.updateUserById(authUserId, {
        user_metadata: {
          role: data.role,
          empresa_id: data.empresa_id,
          nome: data.nome,
        }
      });

      console.log('✅ Custom claims atualizados para o usuário:', authUserId);
    } catch (claimsError) {
      console.warn('⚠️ Aviso ao atualizar custom claims:', claimsError);
    }

    return NextResponse.json({ 
      user: {
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: data.role,
        empresaId: data.empresa_id,
        ativo: data.ativo,
        criadoEm: data.criado_em,
        atualizadoEm: data.atualizado_em,
      }
    });

  } catch (error) {
    console.error('Erro na API fetch-user:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
