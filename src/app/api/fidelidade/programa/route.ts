import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');

    if (!empresaId) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'empresa_id é obrigatório' } }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('programas_fidelidade')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ sucesso: true, dado: data });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const body = await request.json();
    const { empresa_id, modelo, ativo, regras } = body;

    if (!empresa_id || !modelo) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'empresa_id e modelo são obrigatórios' } }, { status: 400 });
    }

    if (!['pontos', 'selos', 'visitas', 'cashback'].includes(modelo)) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'Modelo inválido' } }, { status: 400 });
    }

    const upsertData: any = {
      empresa_id,
      modelo,
      ativo: ativo ?? false,
      regras: regras || {},
      atualizado_em: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('programas_fidelidade')
      .select('id')
      .eq('empresa_id', empresa_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('programas_fidelidade')
        .update(upsertData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      upsertData.criado_em = new Date().toISOString();
      const { data, error } = await supabase
        .from('programas_fidelidade')
        .insert(upsertData)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ sucesso: true, dado: result });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
