import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API para CRUD de Clientes
 * GET /api/clientes - Listar clientes
 * POST /api/clientes - Criar cliente
 * PUT /api/clientes - Atualizar cliente
 * DELETE /api/clientes - Deletar cliente
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!usuario?.empresa_id) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '403', mensagem: 'Empresa não encontrada' } }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca');
    const ativo = searchParams.get('ativo');
    const limite = parseInt(searchParams.get('limite') || '100');

    let query = supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', usuario.empresa_id);

    if (ativo !== null && ativo !== '') {
      query = query.eq('ativo', ativo === 'true');
    }

    if (busca) {
      query = query.or(`nome_razao_social.ilike.%${busca}%,cnpj_cpf.ilike.%${busca}%,email.ilike.%${busca}%,telefone.ilike.%${busca}%`);
    }

    query = query.order('nome_razao_social', { ascending: true }).limit(limite);

    const { data: clientes, error } = await query;

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'DB001', mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, clientes });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!usuario?.empresa_id) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '403', mensagem: 'Empresa não encontrada' } }, { status: 403 });
    }

    const body = await request.json();
    const { tipo_pessoa, cnpj_cpf, nome_razao_social, nome_fantasia, inscricao_estadual, indicador_ie,
      inscricao_municipal, email, telefone, celular, logradouro, numero, complemento,
      bairro, codigo_municipio, municipio, uf, cep, observacoes } = body;

    if (!nome_razao_social) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'Nome/Razão Social é obrigatório' } }, { status: 400 });
    }

    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert({
        empresa_id: usuario.empresa_id,
        tipo_pessoa: tipo_pessoa || '2',
        cnpj_cpf: cnpj_cpf.replace(/\D/g, ''),
        nome_razao_social: nome_razao_social.trim(),
        nome_fantasia: nome_fantasia?.trim() || null,
        inscricao_estadual: inscricao_estadual?.trim() || null,
        indicador_ie: indicador_ie || 9,
        inscricao_municipal: inscricao_municipal?.trim() || null,
        email: email?.trim() || null,
        telefone: telefone?.trim() || null,
        celular: celular?.trim() || null,
        logradouro: logradouro?.trim() || '',
        numero: numero?.trim() || '',
        complemento: complemento?.trim() || null,
        bairro: bairro?.trim() || '',
        codigo_municipio: codigo_municipio?.trim() || '',
        municipio: municipio?.trim() || '',
        uf: uf?.trim() || '',
        cep: cep?.replace(/\D/g, '') || '',
        observacoes: observacoes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ sucesso: false, erro: { codigo: 'DUPLICADO', mensagem: 'Já existe um cliente com este CNPJ/CPF' } }, { status: 400 });
      }
      return NextResponse.json({ sucesso: false, erro: { codigo: 'DB001', mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, cliente });
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
    const { id, ...dados } = body;

    if (!id) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'ID é obrigatório' } }, { status: 400 });
    }

    const updateData: any = { atualizado_em: new Date().toISOString() };
    const allowedFields = ['tipo_pessoa', 'cnpj_cpf', 'nome_razao_social', 'nome_fantasia',
      'inscricao_estadual', 'indicador_ie', 'inscricao_municipal', 'email', 'telefone',
      'celular', 'logradouro', 'numero', 'complemento', 'bairro', 'codigo_municipio',
      'municipio', 'uf', 'cep', 'observacoes', 'ativo'];

    for (const field of allowedFields) {
      if (dados[field] !== undefined) {
        updateData[field] = field === 'cnpj_cpf' ? dados[field].replace(/\D/g, '') : field === 'cep' ? dados[field].replace(/\D/g, '') : dados[field];
      }
    }

    const { data: cliente, error } = await supabase
      .from('clientes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'DB001', mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, cliente });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const force = searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json({ sucesso: false, erro: { codigo: '400', mensagem: 'ID é obrigatório' } }, { status: 400 });
    }

    let error;

    if (force) {
      const result = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
      error = result.error;
    } else {
      const result = await supabase
        .from('clientes')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      error = result.error;
    }

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'DB001', mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: '500', mensagem: error.message } }, { status: 500 });
  }
}
