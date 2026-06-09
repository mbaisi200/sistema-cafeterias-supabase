import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Não autorizado' } }, { status: 401 });
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('empresa_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError || !usuario) {
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Usuário não encontrado' } }, { status: 404 });
    }

    const empresaId = usuario.empresa_id;

    const { data: itens, error } = await supabase
      .from('itens_venda')
      .select(`
        id,
        venda_id,
        produto_id,
        nome,
        quantidade,
        preco_unitario,
        desconto,
        total,
        observacao,
        kds_status,
        criado_em,
        venda:vendas!venda_id(
          id,
          tipo,
          canal,
          status,
          mesa_id,
          nome_cliente,
          observacao,
          criado_em,
          mesa:mesas!mesa_id(numero)
        )
      `)
      .eq('empresa_id', empresaId)
      .in('kds_status', ['pendente', 'em_preparacao', 'pronto'])
      .order('criado_em', { ascending: true });

    if (error) {
      console.error('Erro ao buscar itens KDS:', error);
      return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro ao buscar itens' } }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, data: itens || [] });
  } catch (error) {
    console.error('Erro KDS pedidos:', error);
    return NextResponse.json({ sucesso: false, erro: { mensagem: 'Erro interno' } }, { status: 500 });
  }
}
