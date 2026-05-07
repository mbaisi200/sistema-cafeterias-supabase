import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        sucesso: false, 
        erro: { codigo: '401', mensagem: 'Não autorizado' } 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const osId = searchParams.get('id');

    if (!osId) {
      return NextResponse.json({ 
        sucesso: false, 
        erro: { codigo: '400', mensagem: 'ID da OS é obrigatório' } 
      }, { status: 400 });
    }

    // Buscar OS para verificar se tem venda associada
    const { data: os, error: osError } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('id', osId)
      .single();

    if (osError || !os) {
      return NextResponse.json({ 
        sucesso: false, 
        erro: { codigo: '404', mensagem: 'OS não encontrada' } 
      }, { status: 404 });
    }

    // Verificar se OS foi faturada (tem vendaId no metadata)
    let vendaId: string | null = null;
    if (os.observacoes && os.observacoes.startsWith('[LAVANDERIA]')) {
      try {
        const metadata = JSON.parse(os.observacoes.replace('[LAVANDERIA]', '').trim());
        vendaId = metadata.vendaId || null;
      } catch { /* ignore */ }
    }

    // Iniciar transação - deletar em ordem (foreign keys primeiro)
    const deletados: string[] = [];

    // 1. Deletar itens da venda se existir
    if (vendaId) {
      const { error: itensError } = await supabase
        .from('itens_venda')
        .delete()
        .eq('venda_id', vendaId);
      
      if (itensError) {
      } else {
        deletados.push('itens_venda');
      }

      // 2. Deletar a venda
      const { error: vendaError } = await supabase
        .from('vendas')
        .delete()
        .eq('id', vendaId);
      
      if (vendaError) {
      } else {
        deletados.push('vendas');
      }

      // 3. Deletar registros de caixa relacionados à venda
      const { error: caixaError } = await supabase
        .from('caixas')
        .delete()
        .eq('venda_id', vendaId);
      
      if (caixaError) {
      } else {
        deletados.push('caixas');
      }
    }

    // 5. Soft delete da OS (marcar como inativa)
    const { error: osUpdateError } = await supabase
      .from('ordens_servico')
      .update({ ativo: false })
      .eq('id', osId);

    if (osUpdateError) {
      return NextResponse.json({ 
        sucesso: false, 
        erro: { codigo: '500', mensagem: 'Erro ao excluir OS: ' + osUpdateError.message } 
      }, { status: 500 });
    }

    deletados.push('ordens_servico');

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'OS e registros relacionados excluídos com sucesso',
      deletados,
      vendaId 
    });

  } catch (error: any) {
    return NextResponse.json({ 
      sucesso: false, 
      erro: { codigo: '500', mensagem: error.message || 'Erro interno' } 
    }, { status: 500 });
  }
}
