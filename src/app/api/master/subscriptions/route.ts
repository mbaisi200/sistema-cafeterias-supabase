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
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('empresas')
      .select(`
        id, nome, cnpj, email, telefone, plano, status,
        stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, validade,
        plano_id,
        planos!left(id, nome, preco)
      `)
      .order('nome', { ascending: true });

    if (search) {
      query = query.or(`nome.ilike.%${search}%,cnpj.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (status) {
      if (status === 'active') {
        query = query.eq('subscription_status', 'active');
      } else if (status === 'inactive') {
        query = query.in('subscription_status', ['inactive', 'past_due', 'canceled', null]);
      }
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ subscriptions: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
