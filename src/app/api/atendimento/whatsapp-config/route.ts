import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!usuario) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Usuário não encontrado' } }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({
      sucesso: true,
      data: data || {
        ativo: false,
        status: 'disconnected',
        phone_number_id: '',
        business_account_id: '',
        access_token: '',
        webhook_verify_token: '',
        whatsapp_business_phone: '',
        mensagem_saudacao: 'Olá! Como podemos ajudar?',
      },
    });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!usuario) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Usuário não encontrado' } }, { status: 404 });
    }

    const body = await request.json();
    const { ativo, phone_number_id, business_account_id, access_token, webhook_verify_token, whatsapp_business_phone, mensagem_saudacao, menu_ativo, mensagem_boas_vindas, mensagem_categorias, categorias_ativas, criar_pedido_auto } = body;

    const { data: existing } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('empresa_id', usuario.empresa_id)
      .maybeSingle();

    const updateData: Record<string, any> = {
      ativo: ativo ?? false,
      phone_number_id,
      business_account_id,
      access_token,
      webhook_verify_token,
      whatsapp_business_phone,
      mensagem_saudacao,
      status: ativo ? 'connected' : 'disconnected',
    };

    if (menu_ativo !== undefined) updateData.menu_ativo = menu_ativo;
    if (mensagem_boas_vindas !== undefined) updateData.mensagem_boas_vindas = mensagem_boas_vindas;
    if (mensagem_categorias !== undefined) updateData.mensagem_categorias = mensagem_categorias;
    if (categorias_ativas !== undefined) updateData.categorias_ativas = categorias_ativas;
    if (criar_pedido_auto !== undefined) updateData.criar_pedido_auto = criar_pedido_auto;

    let error;
    if (existing) {
      const result = await supabase
        .from('whatsapp_config')
        .update(updateData)
        .eq('empresa_id', usuario.empresa_id);
      error = result.error;
    } else {
      const result = await supabase
        .from('whatsapp_config')
        .insert({
          empresa_id: usuario.empresa_id,
          ...updateData,
        });
      error = result.error;
    }

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    await supabase.from('whatsapp_logs').insert({
      empresa_id: usuario.empresa_id,
      tipo: 'config_atualizada',
      sucesso: true,
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
