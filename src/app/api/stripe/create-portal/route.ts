import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'customerId é obrigatório' }, { status: 400 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe não configurado' }, { status: 400 });
    }

    const Stripe = await import('stripe');
    const stripe = new Stripe.default(stripeSecretKey);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${request.headers.get('origin') || 'http://localhost:3000'}/master/assinatura/assinantes`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
