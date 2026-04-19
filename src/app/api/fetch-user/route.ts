import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { authUserId } = await request.json();

    if (!authUserId) {
      return NextResponse.json({ error: 'authUserId é obrigatório' }, { status: 400 });
    }

    console.log('🔍 API: Buscando usuário com auth_user_id:', authUserId);
    console.log('🔍 API: SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    console.log('🔍 API: Service key prefix:', serviceKey?.slice(0, 20));

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Buscar usuário
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

    const userData = data;

    // Verificar se a empresa está ativa e não vencida
    if (userData.empresa_id && userData.role !== 'master') {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('id, status, validade')
        .eq('id', userData.empresa_id)
        .single();

      if (empresa) {
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

    // Fetch section permissions via SEGMENTO
    let secoesPermitidas: string[] = [];
    let nomeMarca: string | null = null;

    if (userData.empresa_id && userData.role !== 'master') {
      const { data: empresaRes } = await supabase
        .from('empresas')
        .select('id, nome_marca, segmento_id')
        .eq('id', userData.empresa_id)
        .single();

      const segId = empresaRes?.segmento_id;

      if (segId) {
        const { data: segSecoes } = await supabase
          .from('segmento_secoes')
          .select('secao_id, ativo')
          .eq('segmento_id', segId);

        const ativoSecaoIds = (segSecoes || [])
          .filter((s: any) => s.ativo)
          .map((s: any) => s.secao_id);

        if (ativoSecaoIds.length > 0) {
          const { data: secoesData } = await supabase
            .from('secoes_menu')
            .select('chave, url, obrigatoria, visivel_para')
            .in('id', ativoSecaoIds)
            .eq('ativo', true);
          
          if (secoesData) {
            secoesPermitidas = secoesData
              .filter((s: any) => s.visivel_para && s.visivel_para.includes(userData.role))
              .map((s: any) => s.url);
          }
        }
      }

      if (secoesPermitidas.length === 0) {
        const { data: allSecoes } = await supabase
          .from('secoes_menu')
          .select('chave, url, obrigatoria, visivel_para')
          .eq('ativo', true);
        
        if (allSecoes) {
          secoesPermitidas = allSecoes
            .filter((s: any) => s.visivel_para && s.visivel_para.includes(userData.role))
            .map((s: any) => s.url);
        }
      }

      if (empresaRes) {
        if (empresaRes.nome_marca) {
          nomeMarca = empresaRes.nome_marca;
        } else if (segId) {
          const { data: segmento } = await supabase
            .from('segmentos')
            .select('nome_marca')
            .eq('id', segId)
            .single();
          nomeMarca = segmento?.nome_marca || null;
        }
      }
    }

    // Atualizar custom claims do usuário
    try {
      const adminAuthClient = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      await adminAuthClient.auth.admin.updateUserById(authUserId, {
        user_metadata: {
          role: userData.role,
          empresa_id: userData.empresa_id,
          nome: userData.nome,
        }
      });

      console.log('✅ Custom claims atualizados para o usuário:', authUserId);
    } catch (claimsError) {
      console.warn('⚠️ Aviso ao atualizar custom claims:', claimsError);
    }

    return NextResponse.json({ 
      user: {
        id: userData.id,
        email: userData.email,
        nome: userData.nome,
        role: userData.role,
        empresaId: userData.empresa_id,
        ativo: userData.ativo,
        criadoEm: userData.criado_em,
        atualizadoEm: userData.atualizado_em,
        secoesPermitidas,
        nomeMarca,
      }
    });

  } catch (error) {
    console.error('Erro na API fetch-user:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
