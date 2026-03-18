import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, anonKey);

  const authUserId = '86554f01-4a15-4055-9c45-056b897b9043';

  // Teste 1: Buscar por auth_user_id
  const { data: data1, error: error1 } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  // Teste 2: Buscar todos os usuarios
  const { data: data2, error: error2 } = await supabase
    .from('usuarios')
    .select('id, email, auth_user_id, role')
    .limit(5);

  return NextResponse.json({
    authUserId,
    teste1: { data: data1, error: error1 },
    teste2: { data: data2, error: error2 }
  });
}
