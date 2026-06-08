import { reporEstoqueVenda } from '@/lib/supabase';

export async function cancelarVendaCompleta(
  supabase: any,
  vendaId: string,
  justificativa: string,
  canceladoPor: string,
  canceladoPorNome: string,
): Promise<{ sucesso: boolean; mensagem: string }> {
  const { data: venda, error: vendaError } = await supabase
    .from('vendas')
    .select('*')
    .eq('id', vendaId)
    .single();

  if (vendaError || !venda) {
    return { sucesso: false, mensagem: 'Venda não encontrada' };
  }

  if (venda.status === 'cancelada') {
    return { sucesso: false, mensagem: 'Venda já está cancelada' };
  }

  if (venda.status !== 'concluida' && venda.status !== 'fechada' && venda.status !== 'finalizada') {
    return { sucesso: false, mensagem: `Venda com status "${venda.status}" não pode ser cancelada` };
  }

  const now = new Date().toISOString();

  // Restaurar estoque de cada item da venda
  const { data: itensVenda } = await supabase
    .from('itens_venda')
    .select('produto_id, quantidade, nome')
    .eq('venda_id', vendaId);

  if (itensVenda && itensVenda.length > 0) {
    for (const item of itensVenda) {
      if (item.produto_id) {
        await reporEstoqueVenda(
          supabase,
          venda.empresa_id,
          item.produto_id,
          item.quantidade,
          canceladoPor,
          canceladoPorNome,
          vendaId,
          `Cancelamento venda - ${justificativa}`
        );
      }
    }
  }

  // Reverter movimentações do caixa
  const { data: movs } = await supabase
    .from('movimentacoes_caixa')
    .select('*')
    .eq('venda_id', vendaId)
    .eq('tipo', 'venda');

  if (movs && movs.length > 0) {
    for (const mov of movs) {
      const valorReversao = Math.abs(mov.valor);

      const { data: caixa } = await supabase
        .from('caixas')
        .select('id, valor_atual, total_vendas, total_entradas')
        .eq('id', mov.caixa_id)
        .eq('status', 'aberto')
        .single();

      if (caixa) {
        await supabase.from('movimentacoes_caixa').insert({
          caixa_id: mov.caixa_id,
          empresa_id: mov.empresa_id,
          tipo: 'venda',
          valor: -valorReversao,
          forma_pagamento: mov.forma_pagamento,
          venda_id: vendaId,
          descricao: `Estorno cancelamento venda`,
          usuario_id: canceladoPor,
          usuario_nome: canceladoPorNome,
          criado_em: now,
        });

        await supabase.from('caixas').update({
          valor_atual: Math.max(0, (caixa.valor_atual || 0) - valorReversao),
          total_vendas: Math.max(0, (caixa.total_vendas || 0) - valorReversao),
          total_entradas: Math.max(0, (caixa.total_entradas || 0) - valorReversao),
        }).eq('id', mov.caixa_id);
      }
    }
  }

  // Atualizar venda para cancelada
  await supabase.from('vendas').update({
    status: 'cancelada',
    cancelado_por: canceladoPor,
    cancelado_em: now,
    motivo_cancelamento: justificativa,
    atualizado_em: now,
  }).eq('id', vendaId);

  return { sucesso: true, mensagem: 'Venda cancelada com sucesso. Estoque e caixa estornados.' };
}
