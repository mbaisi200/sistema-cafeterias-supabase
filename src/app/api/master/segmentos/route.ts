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
 * GET /api/master/segmentos
 * List all segmentos with pagination and search.
 * Master only.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('segmentos')
      .select('*', { count: 'exact' })
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('nome', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      segmentos: data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error: any) {
    console.error('Erro ao listar segmentos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/master/segmentos
 * Create a new segmento.
 * Master only.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    const { nome, descricao, nome_marca, icone } = body;

    // Validate required fields
    if (!nome) {
      return NextResponse.json(
        { error: 'O campo "nome" é obrigatório' },
        { status: 400 }
      );
    }

    if (!nome_marca) {
      return NextResponse.json(
        { error: 'O campo "nome_marca" é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('segmentos')
      .insert({
        nome,
        descricao: descricao || null,
        nome_marca,
        icone: icone || null,
        ativo: true,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar segmento:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ segmento: data }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar segmento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/master/segmentos
 * Update a segmento by id (id in body).
 * Master only.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    const { id, nome, descricao, nome_marca, icone } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'O campo "id" é obrigatório para atualização' },
        { status: 400 }
      );
    }

    if (!nome && !descricao && !nome_marca && !icone) {
      return NextResponse.json(
        { error: 'Pelo menos um campo deve ser fornecido para atualização' },
        { status: 400 }
      );
    }

    // Validate required fields if provided
    if (nome_marca === '') {
      return NextResponse.json(
        { error: 'O campo "nome_marca" não pode ser vazio' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      atualizado_em: new Date().toISOString(),
    };

    if (nome !== undefined) updateData.nome = nome;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (nome_marca !== undefined) updateData.nome_marca = nome_marca;
    if (icone !== undefined) updateData.icone = icone;

    const { data, error } = await supabase
      .from('segmentos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar segmento:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Segmento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ segmento: data });
  } catch (error: any) {
    console.error('Erro ao atualizar segmento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/master/segmentos
 * Soft delete a segmento (set ativo=false).
 * Only if no empresas are using it.
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

    // Check if any empresa is using this segmento
    const { count: empresasCount, error: countError } = await supabase
      .from('empresas')
      .select('*', { count: 'exact', head: true })
      .eq('segmento_id', id)
      .eq('ativo', true);

    if (countError) {
      console.error('Erro ao verificar empresas do segmento:', countError);
      return NextResponse.json({ error: countError.message }, { status: 400 });
    }

    if ((empresasCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir: existem empresas ativas usando este segmento' },
        { status: 400 }
      );
    }

    // Soft delete
    const { data, error } = await supabase
      .from('segmentos')
      .update({ ativo: false, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao excluir segmento:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Segmento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ segmento: data });
  } catch (error: any) {
    console.error('Erro ao excluir segmento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
