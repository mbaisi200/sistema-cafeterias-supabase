import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { authUserId } = await request.json();

    if (!authUserId) {
      return NextResponse.json({ error: 'authUserId é obrigatório' }, { status: 400 });
    }


    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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


    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const userData = data;

    // Verificar se a empresa está bloqueada manualmente
      let needsSubscription = false;
    let subscriptionStatus: string | null = null;
    let subscriptionCurrentPeriodEnd: string | null = null;
    let empresaValidade: string | null = null;
    if (userData.empresa_id && userData.role !== 'master') {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('id, status, validade, subscription_status, stripe_subscription_id, subscription_current_period_end')
        .eq('id', userData.empresa_id)
        .single();

      if (empresa) {
        if (empresa.status === 'bloqueado') {
          return NextResponse.json({ 
            error: 'Sua assinatura está bloqueada. Entre em contato com o administrador.',
            blocked: true 
          }, { status: 403 });
        }

        subscriptionStatus = empresa.subscription_status;
        subscriptionCurrentPeriodEnd = empresa.subscription_current_period_end;
        empresaValidade = empresa.validade;

        const hasActiveSubscription = empresa.subscription_status === 'active';
        const hasLegacyValidade = empresa.validade && new Date(empresa.validade) > new Date();
        needsSubscription = !hasActiveSubscription && !hasLegacyValidade;
      } else {
        needsSubscription = true;
      }
    }

    // Fetch section permissions via SEGMENTO
    let secoesPermitidas: string[] = [];
    let nomeMarca: string | null = null;
    let segmentoIcone: string | null = null;
    let segmentoId: string | null = null;
    let permitirFotoProduto = true;
    let podeReimprimir = true;

    if (userData.empresa_id && userData.role !== 'master') {
      const { data: empresaRes } = await supabase
        .from('empresas')
        .select('id, nome_marca, segmento_id, permitir_foto_produto, pode_reimprimir')
        .eq('id', userData.empresa_id)
        .single();

      const segId = empresaRes?.segmento_id;
      segmentoId = segId || null;

      if (segId) {
        const { data: segData } = await supabase
          .from('segmentos')
          .select('icone')
          .eq('id', segId)
          .single();

        if (segData) {
          segmentoIcone = segData.icone || null;
        }

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
        permitirFotoProduto = empresaRes.permitir_foto_produto ?? true;
        podeReimprimir = empresaRes.pode_reimprimir ?? true;
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

    } catch (claimsError) {
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
        segmentoId,
        segmentoIcone,
        permitirFotoProduto,
        podeReimprimir,
        needsSubscription,
        subscriptionStatus,
        subscriptionCurrentPeriodEnd,
        empresaValidade,
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
