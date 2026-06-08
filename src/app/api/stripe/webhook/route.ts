import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe não configurado' }, { status: 400 });
    }

    const Stripe = await import('stripe');
    const stripe = new Stripe.default(stripeSecretKey);

    let event;

    if (webhookSecret) {
      const signature = request.headers.get('stripe-signature');
      if (!signature) {
        return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 400 });
      }

      const body = await request.text();

      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        return NextResponse.json({ error: `Erro na assinatura: ${err.message}` }, { status: 400 });
      }
    } else {
      const body = await request.json();
      event = body;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const empresaId = session.metadata?.empresa_id;
        const customerId = session.customer;

        if (!empresaId) break;

        if (session.mode === 'payment' && session.payment_status === 'paid') {
          // Pagamento único (manual) — estende validade em 30 dias
          const { data: empresa } = await supabase
            .from('empresas')
            .select('subscription_current_period_end')
            .eq('id', empresaId)
            .single();

          const now = new Date();
          const currentEnd = empresa?.subscription_current_period_end
            ? new Date(empresa.subscription_current_period_end)
            : now;
          const baseDate = currentEnd > now ? currentEnd : now;
          const novaData = new Date(baseDate);
          novaData.setDate(novaData.getDate() + 30);
          const isoData = novaData.toISOString();

          await supabase
            .from('empresas')
            .update({
              stripe_customer_id: customerId,
              subscription_status: 'active',
              subscription_current_period_end: isoData,
              validade: isoData,
              status: 'ativo',
            })
            .eq('id', empresaId);
        } else if (session.mode === 'payment') {
          // Pagamento ainda não confirmado (ex: boleto pendente) — aguardar
          await supabase
            .from('empresas')
            .update({ stripe_customer_id: customerId, subscription_status: 'incomplete' })
            .eq('id', empresaId);
        } else {
          // Subscription mode (fallback)
          const subscriptionId = session.subscription;
          if (empresaId && subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0]?.price.id;

            const { data: plano } = await supabase
              .from('planos')
              .select('id, nome')
              .eq('stripe_price_id', priceId)
              .single();

            const dataFim = new Date(subscription.current_period_end * 1000).toISOString();
            await supabase
              .from('empresas')
              .update({
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: customerId,
                subscription_status: subscription.status,
                subscription_current_period_end: dataFim,
                validade: dataFim,
                plano_id: plano?.id || null,
                plano: plano?.nome?.toLowerCase() || 'basico',
                status: 'ativo',
              })
              .eq('id', empresaId);
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          const dataFim = new Date(subscription.current_period_end * 1000).toISOString();
          await supabase
            .from('empresas')
            .update({
              subscription_status: subscription.status,
              subscription_current_period_end: dataFim,
              validade: dataFim,
            })
            .eq('stripe_subscription_id', subscriptionId);

          const { data: empresa } = await supabase
            .from('empresas')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (empresa && invoice.id && invoice.amount_paid) {
            await supabase.from('subscription_invoices').insert({
              empresa_id: empresa.id,
              stripe_invoice_id: invoice.id,
              stripe_subscription_id: subscriptionId,
              amount_paid: (invoice.amount_paid / 100),
              currency: invoice.currency,
              status: invoice.status,
              invoice_url: invoice.hosted_invoice_url,
              pdf_url: invoice.invoice_pdf,
              paid_at: invoice.status_transitions?.paid_at
                ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
                : new Date().toISOString(),
              period_start: invoice.period_start
                ? new Date(invoice.period_start * 1000).toISOString()
                : null,
              period_end: invoice.period_end
                ? new Date(invoice.period_end * 1000).toISOString()
                : null,
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object;
        const failedSubId = failedInvoice.subscription;

        if (failedSubId) {
          await supabase
            .from('empresas')
            .update({ subscription_status: 'past_due' })
            .eq('stripe_subscription_id', failedSubId);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;

        const updateData: Record<string, any> = {
          subscription_status: sub.status,
        };

        if (sub.current_period_end) {
          const dataFim = new Date(sub.current_period_end * 1000).toISOString();
          updateData.subscription_current_period_end = dataFim;
          updateData.validade = dataFim;
        }

        if (sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'incomplete_expired') {
          updateData.subscription_status = 'canceled';
        }

        if (sub.status === 'active') {
          updateData.status = 'ativo';
        }

        await supabase
          .from('empresas')
          .update(updateData)
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const asyncSession = event.data.object;
        const asyncEmpresaId = asyncSession.metadata?.empresa_id;

        if (asyncEmpresaId && asyncSession.mode === 'payment') {
          const { data: empresa } = await supabase
            .from('empresas')
            .select('subscription_current_period_end')
            .eq('id', asyncEmpresaId)
            .single();

          const now = new Date();
          const currentEnd = empresa?.subscription_current_period_end
            ? new Date(empresa.subscription_current_period_end)
            : now;
          const baseDate = currentEnd > now ? currentEnd : now;
          const novaData = new Date(baseDate);
          novaData.setDate(novaData.getDate() + 30);
          const isoData = novaData.toISOString();

          await supabase
            .from('empresas')
            .update({
              subscription_status: 'active',
              subscription_current_period_end: isoData,
              validade: isoData,
              status: 'ativo',
            })
            .eq('id', asyncEmpresaId);
        }
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const failedSession = event.data.object;
        const failedEmpresaId = failedSession.metadata?.empresa_id;
        if (failedEmpresaId) {
          await supabase
            .from('empresas')
            .update({ subscription_status: 'past_due' })
            .eq('id', failedEmpresaId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
