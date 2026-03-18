import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  console.log('=== DEBUG QUERY ===');
  console.log('SUPABASE_URL:', supabaseUrl);
  console.log('ANON_KEY existe:', !!anonKey);

  const supabase = createClient(supabaseUrl, anonKey);

  const authUserId = '86554f01-4a15-4055-9c45-056b897b9043';

  console.log('Iniciando query...');

  try {
    const startTime = Date.now();

    const { data, error, status, statusText } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('Query finalizada em', duration, 'ms');
    console.log('Status:', status, statusText);
    console.log('Data:', data);
    console.log('Error:', error);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      status,
      statusText,
      data,
      error: error ? {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      } : null
    });

  } catch (err: any) {
    console.error('Erro capturado:', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
