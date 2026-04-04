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
 * GET /api/master/secoes-menu
 * List all secoes_menu ordered by grupo, ordem.
 * Optional filter: ?grupo=principal|atalho_rapido
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();

    const { searchParams } = new URL(request.url);
    const grupo = searchParams.get('grupo');

    let query = supabase
      .from('secoes_menu')
      .select('*')
      .eq('ativo', true)
      .order('grupo', { ascending: true })
      .order('ordem', { ascending: true });

    if (grupo) {
      query = query.eq('grupo', grupo);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ secoes: data || [] });
  } catch (error: any) {
    console.error('Erro ao listar seções do menu:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/master/secoes-menu
 * Create a new secao.
 * Master only.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    const { chave, nome, icone, url, grupo, ordem, obrigatoria, visivel_para, descricao } = body;

    // Validate required fields
    if (!chave) {
      return NextResponse.json(
        { error: 'O campo "chave" é obrigatório' },
        { status: 400 }
      );
    }

    if (!nome) {
      return NextResponse.json(
        { error: 'O campo "nome" é obrigatório' },
        { status: 400 }
      );
    }

    if (!icone) {
      return NextResponse.json(
        { error: 'O campo "icone" é obrigatório' },
        { status: 400 }
      );
    }

    if (!url) {
      return NextResponse.json(
        { error: 'O campo "url" é obrigatório' },
        { status: 400 }
      );
    }

    // Check if chave already exists
    const { data: existing, error: checkError } = await supabase
      .from('secoes_menu')
      .select('id')
      .eq('chave', chave)
      .eq('ativo', true)
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar chave existente:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 400 });
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma seção ativa com esta chave' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('secoes_menu')
      .insert({
        chave,
        nome,
        descricao: descricao || null,
        icone,
        url,
        grupo: grupo || null,
        ordem: ordem ?? 0,
        ativo: true,
        obrigatoria: obrigatoria ?? false,
        visivel_para: visivel_para || null,
        criado_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar seção:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ secao: data }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar seção:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/master/secoes-menu
 * Update a secao by id.
 * Master only.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    const { id, chave, nome, icone, url, grupo, ordem, obrigatoria, visivel_para, descricao } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'O campo "id" é obrigatório para atualização' },
        { status: 400 }
      );
    }

    if (!chave && !nome && !icone && !url && !descricao && grupo === undefined && ordem === undefined && obrigatoria === undefined && visivel_para === undefined) {
      return NextResponse.json(
        { error: 'Pelo menos um campo deve ser fornecido para atualização' },
        { status: 400 }
      );
    }

    // If chave is being changed, check for duplicates
    if (chave) {
      const { data: existing, error: checkError } = await supabase
        .from('secoes_menu')
        .select('id')
        .eq('chave', chave)
        .eq('ativo', true)
        .neq('id', id)
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar chave existente:', checkError);
        return NextResponse.json({ error: checkError.message }, { status: 400 });
      }

      if (existing) {
        return NextResponse.json(
          { error: 'Já existe uma seção ativa com esta chave' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, any> = {};

    if (chave !== undefined) updateData.chave = chave;
    if (nome !== undefined) updateData.nome = nome;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (icone !== undefined) updateData.icone = icone;
    if (url !== undefined) updateData.url = url;
    if (grupo !== undefined) updateData.grupo = grupo;
    if (ordem !== undefined) updateData.ordem = ordem;
    if (obrigatoria !== undefined) updateData.obrigatoria = obrigatoria;
    if (visivel_para !== undefined) updateData.visivel_para = visivel_para;

    const { data, error } = await supabase
      .from('secoes_menu')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar seção:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Seção não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ secao: data });
  } catch (error: any) {
    console.error('Erro ao atualizar seção:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/master/secoes-menu
 * Soft delete a secao (set ativo=false).
 * Only allowed if not obrigatoria.
 * Master only.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'O parâmetro "id" é obrigatório' },
        { status: 400 }
      );
    }

    // Check if secao exists and is obrigatoria
    const { data: secao, error: fetchError } = await supabase
      .from('secoes_menu')
      .select('id, nome, obrigatoria')
      .eq('id', id)
      .eq('ativo', true)
      .single();

    if (fetchError || !secao) {
      return NextResponse.json(
        { error: 'Seção não encontrada' },
        { status: 404 }
      );
    }

    if (secao.obrigatoria) {
      return NextResponse.json(
        { error: `Não é possível excluir a seção "${secao.nome}": ela é obrigatória` },
        { status: 400 }
      );
    }

    // Soft delete
    const { data, error } = await supabase
      .from('secoes_menu')
      .update({ ativo: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao excluir seção:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ secao: data });
  } catch (error: any) {
    console.error('Erro ao excluir seção:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
