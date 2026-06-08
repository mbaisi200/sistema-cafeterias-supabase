import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      return NextResponse.json(
        { error: 'Stripe não configurado' },
        { status: 400 }
      );
    }

    return NextResponse.json({ publishableKey });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
