import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's session from cookies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Create admin client to read empresa_id from usuarios
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Use server client to get the current user from auth
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

    // Get empresa_id from usuarios table
    const { data: usuario, error: userError } = await adminClient
      .from('usuarios')
      .select('empresa_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (!usuario.empresa_id) {
      return NextResponse.json({ error: 'Empresa não associada' }, { status: 400 });
    }

    // Fetch devices for this empresa
    const { data: devices, error: devicesError } = await adminClient
      .from('dispositivos_usuario')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .order('ultimo_acesso', { ascending: false });

    if (devicesError) {
      console.error('Erro ao buscar dispositivos:', devicesError);
      return NextResponse.json({ error: devicesError.message }, { status: 500 });
    }

    // Fetch empresa restriction setting
    const { data: empresa } = await adminClient
      .from('empresas')
      .select('restringir_dispositivos')
      .eq('id', usuario.empresa_id)
      .single();

    return NextResponse.json({
      devices: devices || [],
      restringir: empresa?.restringir_dispositivos || false,
    });
  } catch (error) {
    console.error('Erro na API dispositivos GET:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresaId, deviceId, deviceName, userAgent, usuarioId, usuarioNome, isFuncionario } = body;

    if (!empresaId || !deviceId) {
      return NextResponse.json(
        { error: 'empresaId e deviceId são obrigatórios' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Use service role to bypass RLS for device registration
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if empresa has device restriction enabled
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('restringir_dispositivos')
      .eq('id', empresaId)
      .single();

    if (empresaError) {
      console.error('Erro ao buscar empresa:', empresaError);
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // Funcionários SEMPRE precisam de aprovação do admin para novos dispositivos
    // Admins seguem a flag restringir_dispositivos da empresa
    const restringir = isFuncionario ? true : (empresa?.restringir_dispositivos || false);

    // Check if device_id already exists for this empresa
    const { data: existingDevice, error: searchError } = await supabase
      .from('dispositivos_usuario')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (searchError) {
      console.error('Erro ao buscar dispositivo:', searchError);
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }

    if (existingDevice) {
      // Device already registered
      if (existingDevice.ativo) {
        // Update last access
        await supabase
          .from('dispositivos_usuario')
          .update({
            ultimo_acesso: new Date().toISOString(),
            user_agent: userAgent || existingDevice.user_agent,
            usuario_id: usuarioId || existingDevice.usuario_id,
            usuario_nome: usuarioNome || existingDevice.usuario_nome,
            device_name: deviceName || existingDevice.device_name,
          })
          .eq('id', existingDevice.id);

        return NextResponse.json({
          allowed: true,
          message: 'Dispositivo reconhecido',
        });
      } else {
        // Device is revoked
        // Update last access attempt
        await supabase
          .from('dispositivos_usuario')
          .update({
            ultimo_acesso: new Date().toISOString(),
            user_agent: userAgent || existingDevice.user_agent,
            usuario_id: usuarioId || existingDevice.usuario_id,
            usuario_nome: usuarioNome || existingDevice.usuario_nome,
          })
          .eq('id', existingDevice.id);

        return NextResponse.json({
          allowed: false,
          message: 'Dispositivo revogado pelo administrador',
        });
      }
    }

    // New device - register it
    const newDevice = {
      empresa_id: empresaId,
      usuario_id: usuarioId || null,
      usuario_nome: usuarioNome || null,
      device_id: deviceId,
      device_name: deviceName || null,
      user_agent: userAgent || null,
      ativo: !restringir, // Funcionários sempre false; Admins dependem da flag
      ultimo_acesso: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('dispositivos_usuario')
      .insert(newDevice);

    if (insertError) {
      console.error('Erro ao registrar dispositivo:', insertError);
      return NextResponse.json({ error: 'Erro ao registrar dispositivo' }, { status: 500 });
    }

    if (restringir) {
      return NextResponse.json({
        allowed: false,
        message: isFuncionario
          ? 'Novo dispositivo detectado. Solicite ao administrador que autorize este equipamento para acesso como funcionário.'
          : 'Novo dispositivo detectado. Aguardando aprovação do administrador.',
      });
    }

    return NextResponse.json({
      allowed: true,
      message: 'Dispositivo registrado automaticamente',
    });
  } catch (error) {
    console.error('Erro na API dispositivos POST:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
