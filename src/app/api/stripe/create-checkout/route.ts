import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, empresaId, email, planoNome, preco } = body;

    if (!empresaId) {
      return NextResponse.json(
        { error: 'empresaId é obrigatório' },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe não configurado' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, nome, stripe_customer_id')
      .eq('id', empresaId)
      .single();

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const Stripe = await import('stripe');
    const stripe = new Stripe.default(stripeSecretKey);

    let customerId = empresa.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: empresa.nome || 'Empresa',
        email: email || undefined,
        metadata: { empresa_id: empresaId },
      });
      customerId = customer.id;

      await supabase
        .from('empresas')
        .update({ stripe_customer_id: customerId })
        .eq('id', empresaId);
    }

    const nomeProduto = planoNome || 'Assinatura Mensal';
    const valorCentavos = preco ? Math.round(Number(preco) * 100) : undefined;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: valorCentavos ? [{
        price_data: {
          currency: 'brl',
          product_data: { name: nomeProduto },
          unit_amount: valorCentavos,
        },
        quantity: 1,
      }] : [{ price: priceId, quantity: 1 }],
      success_url: `${request.headers.get('origin') || 'http://localhost:3000'}/?success=true`,
      cancel_url: `${request.headers.get('origin') || 'http://localhost:3000'}/?canceled=true`,
      metadata: { empresa_id: empresaId },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
