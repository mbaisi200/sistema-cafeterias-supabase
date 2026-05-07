import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresaId, documentoRef, chaveAcesso } = body;

    if (!empresaId || !documentoRef) {
      return NextResponse.json(
        { sucesso: false, erro: 'empresaId e documentoRef são obrigatórios' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const resultado = {
      movimentosRemovidos: 0,
      estoqueRevertido: 0,
      produtosExcluidos: 0,
      contaPagarRemovida: false,
      nfeImportadaRemovida: false,
      erros: [] as string[],
    };

    // ========================================
    // 1. BUSCAR registro em nfe_importadas
    // ========================================
    let nfeImportadaId: string | null = null;

    // Tentar encontrar por chave de acesso primeiro
    if (chaveAcesso) {
      const { data: nfeReg } = await supabase
        .from('nfe_importadas')
        .select('id, chave_acesso, numero, serie')
        .eq('empresa_id', empresaId)
        .eq('chave_acesso', chaveAcesso)
        .limit(1)
        .single();

      if (nfeReg) {
        nfeImportadaId = nfeReg.id;
      }
    }

    // Se não encontrou por chave, tentar por documento_ref (numero/serie)
    if (!nfeImportadaId && documentoRef) {
      // Extrair numero e serie do documento_ref (formato: "NFe 123/456")
      const match = documentoRef.match(/NFe\s+(.+?)\/(.+)/);
      if (match) {
        const { data: nfeReg } = await supabase
          .from('nfe_importadas')
          .select('id, chave_acesso, numero, serie')
          .eq('empresa_id', empresaId)
          .eq('numero', match[1])
          .eq('serie', match[2])
          .limit(1)
          .single();

        if (nfeReg) {
          nfeImportadaId = nfeReg.id;
        }
      }
    }

    // ========================================
    // 2. COLETAR INFORMAÇÕES para o response
    // ========================================
    if (nfeImportadaId) {
      // Contar movimentações de estoque vinculadas
      const { count: movCount } = await supabase
        .from('estoque_movimentos')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('nfe_importada_id', nfeImportadaId);
      resultado.movimentosRemovidos = movCount || 0;

      // Contar produtos que seriam excluídos (estoque_anterior = 0 e estoque_atual = 0)
      const { data: produtosNovos } = await supabase
        .from('estoque_movimentos')
        .select('produto_id')
        .eq('empresa_id', empresaId)
        .eq('nfe_importada_id', nfeImportadaId)
        .eq('estoque_anterior', 0);

      if (produtosNovos && produtosNovos.length > 0) {
        const produtosIds = [...new Set(produtosNovos.map((p: any) => p.produto_id))];
        const { data: produtosCheck } = await supabase
          .from('produtos')
          .select('id')
          .in('id', produtosIds)
          .eq('estoque_atual', 0);
        resultado.produtosExcluidos = produtosCheck?.length || 0;
      }

      // Contar produtos com estoque revertido
      const { data: movimentos } = await supabase
        .from('estoque_movimentos')
        .select('produto_id')
        .eq('empresa_id', empresaId)
        .eq('nfe_importada_id', nfeImportadaId)
        .eq('tipo', 'entrada');
      if (movimentos) {
        resultado.estoqueRevertido = new Set(movimentos.map((m: any) => m.produto_id)).size;
      }

      // Verificar se há conta a pagar vinculada
      const { count: contasCount } = await supabase
        .from('contas')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('nfe_importada_id', nfeImportadaId);
      resultado.contaPagarRemovida = (contasCount || 0) > 0;
    } else {
      // Sem nfe_importada_id: buscar movimentações por documento_ref (compatibilidade com dados antigos)
      const { data: movimentos, error: errorMov } = await supabase
        .from('estoque_movimentos')
        .select('id, produto_id, quantidade, estoque_anterior, produto_nome, documento_ref')
        .eq('empresa_id', empresaId)
        .eq('documento_ref', documentoRef);

      if (!movimentos || movimentos.length === 0) {
        return NextResponse.json(
          { sucesso: false, erro: 'Nenhuma movimentação encontrada para esta NF-e' },
          { status: 404 }
        );
      }

      resultado.movimentosRemovidos = movimentos.length;
      resultado.estoqueRevertido = new Set(movimentos.map((m: any) => m.produto_id)).size;

      // Identificar produtos criados por esta NFe
      const produtosCriadosIds = new Set<string>();
      for (const mov of movimentos) {
        if (mov.estoque_anterior === 0 || mov.estoque_anterior === null) {
          produtosCriadosIds.add(mov.produto_id);
        }
      }

      // Reverter estoque manualmente (fallback para dados sem nfe_importada_id)
      for (const mov of movimentos) {
        try {
          const { data: produto } = await supabase
            .from('produtos')
            .select('estoque_atual')
            .eq('id', mov.produto_id)
            .single();

          const estoqueAtual = (produto as any)?.estoque_atual || 0;
          const novoEstoque = Math.max(0, estoqueAtual - (mov.quantidade || 0));

          await supabase
            .from('produtos')
            .update({ estoque_atual: novoEstoque })
            .eq('id', mov.produto_id);
        } catch (err: any) {
          resultado.erros.push(`Erro ao reverter "${mov.produto_nome}": ${err.message}`);
        }
      }

      // Excluir produtos criados com estoque zero
      if (produtosCriadosIds.size > 0) {
        const produtosArray = Array.from(produtosCriadosIds);
        const { data: produtosCheck } = await supabase
          .from('produtos')
          .select('id, estoque_atual')
          .in('id', produtosArray);

        const idsParaExcluir = (produtosCheck || [])
          .filter((p: any) => p.estoque_atual === 0)
          .map((p: any) => p.id);

        if (idsParaExcluir.length > 0) {
          // Remover fotos do storage
          for (const prodId of idsParaExcluir) {
            const { data: prod } = await supabase
              .from('produtos')
              .select('foto')
              .eq('id', prodId)
              .single();
            if ((prod as any)?.foto) {
              try {
                const urlObj = new URL((prod as any).foto);
                const urlPath = urlObj.pathname;
                const prefix = '/storage/v1/object/public/produto-imagens/';
                if (urlPath.startsWith(prefix)) {
                  const storagePath = urlPath.slice(prefix.length);
                  await supabase.storage.from('produto-imagens').remove([storagePath]);
                }
              } catch { /* ignore */ }
            }
          }

          const { error: errorDel } = await supabase
            .from('produtos')
            .delete()
            .in('id', idsParaExcluir);

          if (errorDel) {
            resultado.erros.push(`Erro ao excluir produtos: ${errorDel.message}`);
          } else {
            resultado.produtosExcluidos = idsParaExcluir.length;
          }
        }
      }

      // Excluir movimentações originais
      await supabase
        .from('estoque_movimentos')
        .delete()
        .eq('empresa_id', empresaId)
        .eq('documento_ref', documentoRef);

      // Remover registro de nfe_importadas se existir
      if (chaveAcesso) {
        await supabase
          .from('nfe_importadas')
          .delete()
          .eq('empresa_id', empresaId)
          .eq('chave_acesso', chaveAcesso);
      }

      // Remover conta a pagar (fallback para dados sem nfe_importada_id)
      await supabase
        .from('contas')
        .delete()
        .eq('empresa_id', empresaId)
        .like('observacao_pagamento', `%NFe ${documentoRef.replace('NFe ', '')}%`);

      return NextResponse.json({
        sucesso: resultado.erros.length === 0,
        resultado,
      });
    }

    // ========================================
    // 3. EXCLUIR via CASCADE (apaga tudo automaticamente via DB trigger)
    // ========================================
    // O trigger fn_cascade_delete_nfe_importada no banco cuida de:
    // - Reverter estoque de todos os produtos
    // - Excluir produtos criados pela importação
    // - CASCADE FK exclui estoque_movimentos e contas automaticamente
    const { error: errorDelete } = await supabase
      .from('nfe_importadas')
      .delete()
      .eq('id', nfeImportadaId);

    if (errorDelete) {
      resultado.erros.push(`Erro ao excluir NF-e: ${errorDelete.message}`);
      return NextResponse.json({
        sucesso: false,
        erro: 'Erro ao excluir NF-e importada',
        resultado,
      }, { status: 500 });
    }

    resultado.nfeImportadaRemovida = true;

    return NextResponse.json({
      sucesso: resultado.erros.length === 0,
      resultado,
    });
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
