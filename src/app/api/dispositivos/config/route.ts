import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET: Return restringir_dispositivos for the empresa
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the current user from server client
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    const serverClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    });

    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Get empresa_id
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !usuario?.empresa_id) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // Get empresa setting
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('restringir_dispositivos')
      .eq('id', usuario.empresa_id)
      .single();

    if (empresaError) {
      console.error('Erro ao buscar configuração:', empresaError);
      return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 });
    }

    return NextResponse.json({
      restringir: empresa?.restringir_dispositivos || false,
    });
  } catch (error) {
    console.error('Erro na API dispositivos/config GET:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH: Update restringir_dispositivos for the empresa
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { restringir } = body;

    if (typeof restringir !== 'boolean') {
      return NextResponse.json(
        { error: 'Valor inválido. Envie um booleano.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the current user
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    const serverClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    });

    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Get empresa_id
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('empresa_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !usuario?.empresa_id) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // Only admin or master can change this setting
    if (!['admin', 'master'].includes(usuario.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para alterar esta configuração' },
        { status: 403 }
      );
    }

    // Update empresa setting
    const { error: updateError } = await supabase
      .from('empresas')
      .update({ restringir_dispositivos: restringir })
      .eq('id', usuario.empresa_id);

    if (updateError) {
      console.error('Erro ao atualizar configuração:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      restringir,
      message: restringir
        ? 'Restrição de dispositivos ativada. Novos dispositivos precisarão de aprovação.'
        : 'Restrição de dispositivos desativada. Novos dispositivos serão registrados automaticamente.',
    });
  } catch (error) {
    console.error('Erro na API dispositivos/config PATCH:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
