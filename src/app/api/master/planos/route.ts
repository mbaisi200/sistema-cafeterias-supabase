import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('planos')
      .select('*')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (search) {
      query = query.ilike('nome', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ planos: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { nome, descricao, preco, stripe_price_id, stripe_product_id, recursos, destaque, ordem } = body;

    if (!nome || preco === undefined) {
      return NextResponse.json({ error: 'Nome e preço são obrigatórios' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('planos')
      .insert({
        nome,
        descricao: descricao || null,
        preco,
        stripe_price_id: stripe_price_id || null,
        stripe_product_id: stripe_product_id || null,
        recursos: recursos || {},
        destaque: destaque || false,
        ordem: ordem || 0,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ plano: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { id, nome, descricao, preco, stripe_price_id, stripe_product_id, recursos, destaque, ordem, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'O campo "id" é obrigatório' }, { status: 400 });
    }

    const updateData: Record<string, any> = { atualizado_em: new Date().toISOString() };
    if (nome !== undefined) updateData.nome = nome;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (preco !== undefined) updateData.preco = preco;
    if (stripe_price_id !== undefined) updateData.stripe_price_id = stripe_price_id;
    if (stripe_product_id !== undefined) updateData.stripe_product_id = stripe_product_id;
    if (recursos !== undefined) updateData.recursos = recursos;
    if (destaque !== undefined) updateData.destaque = destaque;
    if (ordem !== undefined) updateData.ordem = ordem;
    if (ativo !== undefined) updateData.ativo = ativo;

    const { data, error } = await supabase
      .from('planos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

    return NextResponse.json({ plano: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'O parâmetro "id" é obrigatório' }, { status: 400 });
    }

    const { count: empresasCount } = await supabase
      .from('empresas')
      .select('*', { count: 'exact', head: true })
      .eq('plano_id', id)
      .eq('ativo', true);

    if ((empresasCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir: existem empresas ativas com este plano' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('planos')
      .update({ ativo: false, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

    return NextResponse.json({ plano: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
