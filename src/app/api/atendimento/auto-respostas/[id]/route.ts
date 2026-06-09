import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const { error } = await supabase
      .from('atendimento_auto_respostas')
      .update({
        palavra_chave: body.palavra_chave?.trim().toLowerCase(),
        resposta: body.resposta?.trim(),
        ativo: body.ativo,
        ordem: body.ordem,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('atendimento_auto_respostas')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: error.message } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
