import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      empresaId,
      userId,
      userName,
      // Dados da NFe
      nfeData,
      // Opções do importador
      opcoes,
      // Produtos a importar com categorias selecionadas
      produtosImportar,
    } = body;

    if (!empresaId || !nfeData) {
      return NextResponse.json(
        { sucesso: false, erro: 'Dados obrigatórios não informados' },
        { status: 400 }
      );
    }

    // Inicializar Supabase com service_role para bypass de RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const resultado = {
      produtosCriados: 0,
      estoqueAtualizado: 0,
      contaGerada: false,
      fornecedorCriado: false,
      fornecedorNome: '',
      erros: [] as string[],
    };

    // ========================================
    // 1. CRIAR FORNECEDOR (se necessário e solicitado)
    // ========================================
    if (opcoes.criarFornecedor && nfeData.emitente?.cnpj) {
      try {
        // Verificar se já existe
        const cnpjLimpo = nfeData.emitente.cnpj.replace(/\D/g, '');
        const { data: fornecedorExistente } = await supabase
          .from('fornecedores')
          .select('id, nome')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .ilike('cnpj', `%${cnpjLimpo}%`)
          .limit(1)
          .single();

        if (fornecedorExistente) {
          resultado.fornecedorNome = fornecedorExistente.nome;
        } else {
          // Criar fornecedor
          const { data: novoFornecedor, error: errorFornecedor } = await supabase
            .from('fornecedores')
            .insert({
              empresa_id: empresaId,
              nome: nfeData.emitente.nome || 'Fornecedor NFe',
              razao_social: nfeData.emitente.nome || null,
              cnpj: nfeData.emitente.cnpj || null,
              inscricao_estadual: nfeData.emitente.ie || null,
              logradouro: nfeData.emitente.logradouro || null,
              numero: nfeData.emitente.numero || null,
              complemento: nfeData.emitente.complemento || null,
              bairro: nfeData.emitente.bairro || null,
              cidade: nfeData.emitente.cidade || null,
              estado: nfeData.emitente.uf || null,
              cep: nfeData.emitente.cep || null,
              telefone: nfeData.emitente.telefone || null,
              ativo: true,
            })
            .select('id, nome')
            .single();

          if (errorFornecedor) {
            resultado.erros.push(`Erro ao criar fornecedor: ${errorFornecedor.message}`);
          } else if (novoFornecedor) {
            resultado.fornecedorCriado = true;
            resultado.fornecedorNome = novoFornecedor.nome;
          }
        }
      } catch (err: any) {
        resultado.erros.push(`Erro ao processar fornecedor: ${err.message}`);
      }
    }

    // ========================================
    // 2. CRIAR/ATUALIZAR PRODUTOS E ESTOQUE
    // ========================================
    if (produtosImportar && produtosImportar.length > 0) {
      for (const item of produtosImportar) {
        try {
          if (item.status === 'novo') {
            // Criar novo produto
            const precoCusto = item.valorUnitario || 0;
            const markup = opcoes.markupPercentual || 30;
            const precoVenda = precoCusto * (1 + markup / 100);

            const { data: novoProduto, error: errorProduto } = await supabase
              .from('produtos')
              .insert({
                empresa_id: empresaId,
                nome: item.descricao,
                descricao: item.descricao || null,
                codigo: item.codigo || null,
                codigo_barras: item.ean || null,
                custo: precoCusto,
                preco: precoVenda,
                unidade: item.unidade || 'un',
                categoria_id: item.categoriaId || null,
                estoque_atual: opcoes.atualizarEstoque ? (item.quantidade || 0) : 0,
                estoque_minimo: 0,
                ativo: true,
              })
              .select('id')
              .single();

            if (errorProduto) {
              resultado.erros.push(`Erro ao criar produto "${item.descricao}": ${errorProduto.message}`);
              continue;
            }

            resultado.produtosCriados++;

            // Registrar movimentação de estoque para produto novo
            if (opcoes.atualizarEstoque && item.quantidade > 0) {
              const qtd = item.quantidade;
              await supabase.from('estoque_movimentos').insert({
                empresa_id: empresaId,
                produto_id: novoProduto!.id,
                produto_nome: item.descricao,
                tipo: 'entrada',
                quantidade: qtd,
                quantidade_informada: qtd,
                tipo_entrada: 'unidade',
                estoque_anterior: 0,
                estoque_novo: qtd,
                fornecedor: resultado.fornecedorNome || nfeData.emitente?.nome || null,
                documento_ref: `NFe ${nfeData.numero}/${nfeData.serie}`,
                observacao: 'Importação via NFe XML',
                criado_por: userId || null,
                criado_por_nome: userName || null,
                criado_em: new Date().toISOString(),
              });
              resultado.estoqueAtualizado++;
            }
          } else if (item.status === 'cadastrado' && item.produtoId) {
            // Produto já cadastrado - atualizar estoque
            if (opcoes.atualizarEstoque && item.quantidade > 0) {
              // Buscar estoque atual
              const { data: produtoAtual } = await supabase
                .from('produtos')
                .select('estoque_atual, custo')
                .eq('id', item.produtoId)
                .single();

              const estoqueAnterior = (produtoAtual as any)?.estoque_atual || 0;
              const qtd = item.quantidade;
              const estoqueNovo = estoqueAnterior + qtd;

              // Atualizar estoque do produto
              await supabase
                .from('produtos')
                .update({
                  estoque_atual: estoqueNovo,
                  custo: item.valorUnitario || (produtoAtual as any)?.custo,
                  atualizado_em: new Date().toISOString(),
                })
                .eq('id', item.produtoId);

              // Registrar movimentação
              await supabase.from('estoque_movimentos').insert({
                empresa_id: empresaId,
                produto_id: item.produtoId,
                produto_nome: item.descricao,
                tipo: 'entrada',
                quantidade: qtd,
                quantidade_informada: qtd,
                tipo_entrada: 'unidade',
                estoque_anterior: estoqueAnterior,
                estoque_novo: estoqueNovo,
                fornecedor: resultado.fornecedorNome || nfeData.emitente?.nome || null,
                documento_ref: `NFe ${nfeData.numero}/${nfeData.serie}`,
                observacao: 'Importação via NFe XML',
                criado_por: userId || null,
                criado_por_nome: userName || null,
                criado_em: new Date().toISOString(),
              });

              resultado.estoqueAtualizado++;
            }
          }
        } catch (err: any) {
          resultado.erros.push(`Erro ao processar produto "${item.descricao}": ${err.message}`);
        }
      }
    }

    // ========================================
    // 3. GERAR CONTA A PAGAR (se solicitado)
    // ========================================
    if (opcoes.gerarContaPagar && nfeData.valorTotal > 0) {
      try {
        const vencimento = opcoes.vencimentoConta
          ? new Date(opcoes.vencimentoConta + 'T23:59:59').toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error: errorConta } = await supabase.from('contas').insert({
          empresa_id: empresaId,
          tipo: 'pagar',
          descricao: `NFe ${nfeData.numero}/${nfeData.serie} - ${nfeData.emitente?.nome || 'Fornecedor'}`,
          valor: nfeData.valorTotal,
          vencimento,
          categoria: 'Fornecedores',
          fornecedor: resultado.fornecedorNome || nfeData.emitente?.nome || null,
          status: 'pendente',
        });

        if (errorConta) {
          resultado.erros.push(`Erro ao gerar conta a pagar: ${errorConta.message}`);
        } else {
          resultado.contaGerada = true;
        }
      } catch (err: any) {
        resultado.erros.push(`Erro ao gerar conta a pagar: ${err.message}`);
      }
    }

    return NextResponse.json({
      sucesso: true,
      resultado,
    });
  } catch (error: any) {
    console.error('Erro ao importar NFe:', error);
    return NextResponse.json(
      { sucesso: false, erro: error.message || 'Erro interno ao processar importação' },
      { status: 500 }
    );
  }
}
