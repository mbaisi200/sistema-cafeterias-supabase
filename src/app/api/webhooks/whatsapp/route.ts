import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { parseWebhookPayload } from '@/lib/whatsapp';
import { handleMenuFlow } from '@/lib/whatsapp-bot';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (!mode || !token || !challenge) {
    return NextResponse.json({ status: 'ok', service: 'WhatsApp Webhook' });
  }

  const supabase = createAdminClient();

  const { data: configs } = await supabase
    .from('whatsapp_config')
    .select('empresa_id, webhook_verify_token')
    .eq('ativo', true);

  if (configs) {
    for (const cfg of configs) {
      if (token === cfg.webhook_verify_token) {
        return new NextResponse(challenge, { status: 200 });
      }
    }
  }

  return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const parsed = parseWebhookPayload(body);
    if (!parsed) {
      return NextResponse.json({ received: true });
    }

    const metadata = body?.entry?.[0]?.changes?.[0]?.value?.metadata;
    const phoneNumberId = metadata?.phone_number_id;
    if (!phoneNumberId) {
      return NextResponse.json({ received: true });
    }

    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('phone_number_id', phoneNumberId)
      .eq('ativo', true)
      .maybeSingle();

    if (!config) {
      return NextResponse.json({ received: true });
    }

    const empresaId = config.empresa_id;
    const waPhone = parsed.from;
    const mensagemBody = parsed.messageBody;

    let conversaId: string;

    const { data: existingConv } = await supabase
      .from('atendimento_conversas')
      .select('id, status')
      .eq('empresa_id', empresaId)
      .eq('wa_phone', waPhone)
      .eq('status', 'aberta')
      .maybeSingle();

    if (existingConv) {
      conversaId = existingConv.id;
    } else {
      const { data: conv } = await supabase
        .from('atendimento_conversas')
        .insert({
          empresa_id: empresaId,
          canal: 'whatsapp',
          cliente_identificador: `wa_${waPhone}`,
          cliente_nome: parsed.fromName || waPhone,
          cliente_telefone: waPhone,
          wa_phone: waPhone,
          wa_message_id: parsed.waMessageId,
          status: 'aberta',
          ultima_mensagem: mensagemBody,
          ultimo_remetente: 'cliente',
        })
        .select('id')
        .single();

      if (!conv) {
        await supabase.from('whatsapp_logs').insert({
          empresa_id: empresaId,
          tipo: 'erro_webhook',
          wa_message_id: parsed.waMessageId,
          telefone_origem: waPhone,
          conteudo: mensagemBody,
          dados: body,
          sucesso: false,
          erro: 'Erro ao criar conversa',
        });
        return NextResponse.json({ received: true });
      }
      conversaId = conv.id;
    }

    const { data: msg } = await supabase
      .from('atendimento_mensagens')
      .insert({
        empresa_id: empresaId,
        conversa_id: conversaId,
        tipo: 'cliente',
        conteudo: mensagemBody,
        wa_message_id: parsed.waMessageId,
      })
      .select()
      .single();

    await supabase
      .from('atendimento_conversas')
      .update({
        ultima_mensagem: mensagemBody,
        ultimo_remetente: 'cliente',
        wa_message_id: parsed.waMessageId,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', conversaId);

    await supabase.from('whatsapp_logs').insert({
      empresa_id: empresaId,
      tipo: 'mensagem_recebida',
      conversa_id: conversaId,
      wa_message_id: parsed.waMessageId,
      telefone_origem: waPhone,
      conteudo: mensagemBody,
      dados: body,
      sucesso: true,
    });

    await supabase
      .from('whatsapp_config')
      .update({ ultimo_webhook_em: new Date().toISOString() })
      .eq('id', config.id);

    if (config.menu_ativo) {
      await handleMenuFlow(body, waPhone, empresaId, conversaId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    return NextResponse.json({ received: true });
  }
}
