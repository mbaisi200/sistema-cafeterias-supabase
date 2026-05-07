import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// PATCH: Toggle device ativo status (approve/revoke)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { acao } = body;

    if (!acao || !['aprovar', 'revogar'].includes(acao)) {
      return NextResponse.json(
        { error: 'Ação inválida. Use "aprovar" ou "revogar".' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify ownership: get the device and check empresa_id matches
    const { data: dispositivo, error: fetchError } = await supabase
      .from('dispositivos_usuario')
      .select('id, empresa_id')
      .eq('id', id)
      .single();

    if (fetchError || !dispositivo) {
      return NextResponse.json(
        { error: 'Dispositivo não encontrado' },
        { status: 404 }
      );
    }

    const ativo = acao === 'aprovar';

    const { error: updateError } = await supabase
      .from('dispositivos_usuario')
      .update({ ativo })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao atualizar dispositivo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: ativo
        ? 'Dispositivo aprovado com sucesso'
        : 'Dispositivo revogado com sucesso',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE: Remove device record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify device exists
    const { data: dispositivo, error: fetchError } = await supabase
      .from('dispositivos_usuario')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !dispositivo) {
      return NextResponse.json(
        { error: 'Dispositivo não encontrado' },
        { status: 404 }
      );
    }

    // Delete device
    const { error: deleteError } = await supabase
      .from('dispositivos_usuario')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Erro ao excluir dispositivo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Dispositivo removido com sucesso',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
