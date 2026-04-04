import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to create admin Supabase client
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase não configurado no servidor');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * GET /api/empresa-secoes
 * Return all secoes_menu with ativo boolean from empresa_secoes.
 * ?empresa_id=UUID - required parameter.
 * If empresa exists but has no empresa_secoes records, return ALL secoes as ativo=true (fallback).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');

    if (!empresaId) {
      return NextResponse.json({ secoes: [] });
    }

    // Validate empresa exists
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('id', empresaId)
      .maybeSingle();

    if (empresaError) {
      return NextResponse.json({ error: empresaError.message }, { status: 400 });
    }

    if (!empresa) {
      return NextResponse.json({ secoes: [] });
    }

    // Fetch empresa_secoes for this empresa
    const { data: empresaSecoes, error: esError } = await supabase
      .from('empresa_secoes')
      .select('secao_id, ativo')
      .eq('empresa_id', empresaId);

    if (esError) {
      return NextResponse.json({ error: esError.message }, { status: 400 });
    }

    // Fetch all active secoes_menu ordered by grupo, ordem
    const { data: allSecoes, error: secoesError } = await supabase
      .from('secoes_menu')
      .select('*')
      .eq('ativo', true)
      .order('grupo', { ascending: true })
      .order('ordem', { ascending: true });

    if (secoesError) {
      return NextResponse.json({ error: secoesError.message }, { status: 400 });
    }

    // Fallback: if no empresa_secoes exist, return ALL as ativo=true
    if (!empresaSecoes || empresaSecoes.length === 0) {
      const secoesWithPermissao = (allSecoes || []).map((secao: any) => ({
        ...secao,
        ativo: true,
      }));
      return NextResponse.json({ secoes: secoesWithPermissao });
    }

    // Build a map of secao_id -> ativo
    const permissaoMap = new Map<string, boolean>();
    for (const es of empresaSecoes) {
      permissaoMap.set(es.secao_id, es.ativo);
    }

    // Merge secoes_menu with empresa_secoes ativo status
    const secoesWithPermissao = (allSecoes || []).map((secao: any) => ({
      ...secao,
      ativo: permissaoMap.has(secao.id) ? permissaoMap.get(secao.id) : true,
    }));

    return NextResponse.json({ secoes: secoesWithPermissao });
  } catch (error: any) {
    console.error('Erro ao buscar seções da empresa:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/empresa-secoes
 * Upsert empresa_secoes records.
 * Body: { empresa_id, secoes: [{ secao_id, ativo }] }
 * Uses service role key.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    const { empresa_id, secoes } = body;

    if (!empresa_id) {
      return NextResponse.json(
        { error: 'O campo "empresa_id" é obrigatório' },
        { status: 400 }
      );
    }

    if (!Array.isArray(secoes) || secoes.length === 0) {
      return NextResponse.json(
        { error: 'O campo "secoes" deve ser um array não vazio com objetos { secao_id, ativo }' },
        { status: 400 }
      );
    }

    // Validate all items have required fields
    for (const item of secoes) {
      if (!item.secao_id) {
        return NextResponse.json(
          { error: 'Cada seção deve ter um "secao_id"' },
          { status: 400 }
        );
      }
      if (typeof item.ativo !== 'boolean') {
        return NextResponse.json(
          { error: 'Cada seção deve ter um campo "ativo" booleano' },
          { status: 400 }
        );
      }
    }

    // Build upsert records
    const upsertRecords = secoes.map((item: any) => ({
      empresa_id,
      secao_id: item.secao_id,
      ativo: item.ativo,
    }));

    // Validate empresa exists
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('id', empresa_id)
      .maybeSingle();

    if (empresaError) {
      console.error('Erro ao verificar empresa:', empresaError);
      return NextResponse.json({ error: empresaError.message }, { status: 400 });
    }

    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // Upsert empresa_secoes records
    const { error } = await supabase
      .from('empresa_secoes')
      .upsert(upsertRecords, {
        onConflict: 'empresa_id,secao_id',
      });

    if (error) {
      console.error('Erro ao salvar permissões de seções:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Permissões de ${secoes.length} seção(ões) atualizadas com sucesso`,
    });
  } catch (error: any) {
    console.error('Erro ao salvar permissões de seções:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
