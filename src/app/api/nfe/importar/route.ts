import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper: Normalize NFe unit to allowed database values
function normalizarUnidade(unidade: string): string {
  if (!unidade) return 'un';
  const u = unidade.trim().toUpperCase();
  const mapa: Record<string, string> = {
    'UN': 'un', 'UNIT': 'un', 'UNIDADE': 'un', 'PC': 'un', 'PCT': 'un',
    'KG': 'kg', 'QUILO': 'kg', 'K': 'kg',
    'LT': 'lt', 'L': 'lt', 'LITRO': 'lt', 'LITROS': 'lt',
    'ML': 'ml', 'MLT': 'ml', 'MILILITRO': 'ml', 'MILILITROS': 'ml',
    'G': 'g', 'GRAMA': 'g', 'GR': 'g', 'GRAMAS': 'g',
    'MG': 'mg', 'MILIGRAMA': 'mg',
    'CX': 'un', 'CAIXA': 'un', // Caixas are normalized to 'un' since they're countable
    'PAC': 'un', 'PACOTE': 'un',
    'M': 'un', 'MIL': 'un', 'MILHEIRO': 'un',
    'MM': 'un',
    'CM': 'un',
    'ROLO': 'un', 'RL': 'un',
    'PAR': 'un',
    'FARDO': 'un',
    'BD': 'un', 'BARRA': 'un',
  };
  return mapa[u] || 'un';
}

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

    // Modo check-only: apenas verifica duplicidade e retorna
    if (body._checkOnly && nfeData.chaveAcesso) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabaseCheck = createClient(supabaseUrl, supabaseKey);
      const { data: nfeExistente } = await supabaseCheck
        .from('nfe_importadas')
        .select('id, chave_acesso, numero, serie, criado_em')
        .eq('empresa_id', empresaId)
        .eq('chave_acesso', nfeData.chaveAcesso)
        .limit(1)
        .single();

      if (nfeExistente) {
        return NextResponse.json({
          sucesso: false,
          erro: 'NFe já importada',
          detalhes: {
            chave: nfeExistente.chave_acesso,
            numero: nfeExistente.numero,
            serie: nfeExistente.serie,
            importadoEm: new Date(nfeExistente.criado_em).toLocaleString('pt-BR'),
          },
        }, { status: 409 });
      }
      return NextResponse.json({ sucesso: true, duplicada: false });
    }

    // Inicializar Supabase com service_role para bypass de RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========================================
    // 0. VERIFICAR DUPLICIDADE DA NFE
    // ========================================
    if (nfeData.chaveAcesso) {
      const { data: nfeExistente } = await supabase
        .from('nfe_importadas')
        .select('id, chave_acesso, numero, serie, criado_em')
        .eq('empresa_id', empresaId)
        .eq('chave_acesso', nfeData.chaveAcesso)
        .limit(1)
        .single();

      if (nfeExistente) {
        const dataImportacao = new Date(nfeExistente.criado_em).toLocaleString('pt-BR');
        return NextResponse.json({
          sucesso: false,
          erro: `Esta NFe já foi importada anteriormente!`,
          detalhes: {
            chave: nfeExistente.chave_acesso,
            numero: nfeExistente.numero,
            serie: nfeExistente.serie,
            importadoEm: dataImportacao,
          },
        }, { status: 409 });
      }
    }

    const resultado = {
      produtosCriados: 0,
      produtosAtualizados: 0,
      estoqueAtualizado: 0,
      contaGerada: false,
      fornecedorCriado: false,
      fornecedorNome: '',
      fornecedorId: null as string | null,
      erros: [] as string[],
      detalhes: [] as { descricao: string; acao: string; status: string }[],
    };

    // ========================================
    // 1. CRIAR FORNECEDOR (se necessário e solicitado)
    // ========================================
    let fornecedorId: string | null = null;

    if (opcoes.criarFornecedor && nfeData.emitente?.cnpj) {
      try {
        // Verificar se já existe por CNPJ exato (apenas dígitos)
        const cnpjLimpo = nfeData.emitente.cnpj.replace(/\D/g, '');
        const { data: fornecedorExistente } = await supabase
          .from('fornecedores')
          .select('id, nome, cnpj')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .eq('cnpj', cnpjLimpo)
          .limit(1)
          .single();

        if (fornecedorExistente) {
          resultado.fornecedorNome = fornecedorExistente.nome;
          fornecedorId = fornecedorExistente.id;
          resultado.fornecedorId = fornecedorId;
          resultado.detalhes.push({
            descricao: `Fornecedor: ${fornecedorExistente.nome}`,
            acao: 'Já cadastrado (CNPJ encontrado)',
            status: 'existente',
          });
        } else {
          // Criar fornecedor com todos os dados do emitente
          const { data: novoFornecedor, error: errorFornecedor } = await supabase
            .from('fornecedores')
            .insert({
              empresa_id: empresaId,
              nome: nfeData.emitente.nome || 'Fornecedor NFe',
              razao_social: nfeData.emitente.nome || null,
              cnpj: nfeData.emitente.cnpj.replace(/\D/g, '') || null,
              inscricao_estadual: nfeData.emitente.ie || null,
              email: nfeData.emitente.email || null,
              telefone: nfeData.emitente.telefone || null,
              logradouro: nfeData.emitente.logradouro || null,
              numero: nfeData.emitente.numero || null,
              complemento: nfeData.emitente.complemento || null,
              bairro: nfeData.emitente.bairro || null,
              cidade: nfeData.emitente.cidade || null,
              estado: nfeData.emitente.uf || null,
              cep: nfeData.emitente.cep || null,
              ativo: true,
            })
            .select('id, nome')
            .single();

          if (errorFornecedor) {
            resultado.erros.push(`Erro ao criar fornecedor: ${errorFornecedor.message}`);
          } else if (novoFornecedor) {
            resultado.fornecedorCriado = true;
            resultado.fornecedorNome = novoFornecedor.nome;
            fornecedorId = novoFornecedor.id;
            resultado.fornecedorId = fornecedorId;
            resultado.detalhes.push({
              descricao: `Fornecedor: ${novoFornecedor.nome}`,
              acao: `Novo cadastro criado (CNPJ: ${nfeData.emitente.cnpj})`,
              status: 'criado',
            });
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
            // ---- CRIAR NOVO PRODUTO COM TODOS OS DADOS FISCAIS ----
            const precoCustoCaixa = item.valorUnitario || 0;
            const unidadesPorCaixa = item.unidadesPorCaixa || 0;
            const precoCusto = unidadesPorCaixa > 0 ? precoCustoCaixa / unidadesPorCaixa : precoCustoCaixa;
            const precoVenda = item.precoVenda || (precoCusto * (1 + (opcoes.markupPercentual || 30) / 100));

            // Verificar se deve atualizar estoque (opção global E item individual)
            const deveAtualizarEstoque = opcoes.atualizarEstoque && item.irParaEstoque;

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
                unidade: normalizarUnidade(item.unidade),
                categoria_id: item.categoriaId || null,
                fornecedor_id: fornecedorId || null, // Vincular ao fornecedor da NFe
                estoque_atual: deveAtualizarEstoque 
                  ? ((item.quantidade || 0) * (item.unidadesPorCaixa || 1)) 
                  : 0,
                estoque_minimo: 0,
                ativo: true,
                // === Campos Fiscais ===
                ncm: item.ncm || '00000000',
                cest: item.cest || null,
                cfop: item.cfop || '5102',
                cst: item.cst || item.csosn || '00',
                csosn: item.csosn || null,
                origem: item.origem || '0',
                icms: item.icmsAliquota || 0,
                unidade_tributavel: normalizarUnidade(item.unidadeTributavel || item.unidade),
                ipi_aliquota: item.ipiAliquota || 0,
                pis_aliquota: item.pisAliquota || 0,
                cofins_aliquota: item.cofinsAliquota || 0,
                unidades_por_caixa: item.unidadesPorCaixa || 0,
              })
              .select('id')
              .single();

            if (errorProduto) {
              resultado.erros.push(`Erro ao criar produto "${item.descricao}": ${errorProduto.message}`);
              resultado.detalhes.push({
                descricao: item.descricao,
                acao: `Erro: ${errorProduto.message}`,
                status: 'erro',
              });
              continue;
            }

            resultado.produtosCriados++;
            resultado.detalhes.push({
              descricao: item.descricao,
              acao: `Novo produto criado (R$ ${precoVenda.toFixed(2)})${!deveAtualizarEstoque ? ' [sem estoque]' : ''}`,
              status: 'criado',
            });

            // Registrar movimentação de estoque para produto novo
            if (deveAtualizarEstoque && item.quantidade > 0) {
              const qtdUnidades = item.unidadesPorCaixa > 0 
                ? item.quantidade * item.unidadesPorCaixa 
                : item.quantidade;
              const observacaoBase = `Importação NFe ${nfeData.numero}/${nfeData.serie} - ${resultado.fornecedorNome || nfeData.emitente?.nome || ''}`;
              const observacao = item.unidadesPorCaixa > 0
                ? `${observacaoBase} (${item.quantidade} cx x ${item.unidadesPorCaixa} un = ${qtdUnidades} un)`
                : observacaoBase;
              const { error: errorEstoque } = await supabase.from('estoque_movimentos').insert({
                empresa_id: empresaId,
                produto_id: novoProduto!.id,
                produto_nome: item.descricao,
                tipo: 'entrada',
                quantidade: qtdUnidades,
                quantidade_informada: qtdUnidades,
                tipo_entrada: item.unidadesPorCaixa > 0 ? 'caixa' : 'unidade',
                estoque_anterior: 0,
                estoque_novo: qtdUnidades,
                preco_unitario: precoCusto,
                fornecedor: resultado.fornecedorNome || nfeData.emitente?.nome || null,
                documento_ref: `NFe ${nfeData.numero}/${nfeData.serie}`,
                observacao,
                criado_por: userId || null,
                criado_por_nome: userName || null,
                criado_em: new Date().toISOString(),
              });
              if (!errorEstoque) {
                resultado.estoqueAtualizado++;
              }
            }
          } else if (item.status === 'cadastrado' && item.produtoId) {
            // ---- PRODUTO JÁ CADASTRADO - ATUALIZAR DADOS FISCAIS E ESTOQUE ----
            const updateData: any = {
              atualizado_em: new Date().toISOString(),
            };

            // Vincular fornecedor se o produto ainda não tem um
            if (fornecedorId) {
              const { data: prodAtual } = await supabase
                .from('produtos')
                .select('fornecedor_id')
                .eq('id', item.produtoId)
                .single();
              if (!(prodAtual as any)?.fornecedor_id) {
                updateData.fornecedor_id = fornecedorId;
              }
            }

            // Atualizar custo
            if (item.valorUnitario) {
              const unidadesPorCaixa = item.unidadesPorCaixa || 0;
              updateData.custo = unidadesPorCaixa > 0 ? item.valorUnitario / unidadesPorCaixa : item.valorUnitario;
            }

            // Aplicar markup ao preço de venda se fornecido
            if (item.precoVenda && item.precoVenda > 0) {
              updateData.preco = item.precoVenda;
            }

            // Atualizar campos fiscais se opção ativada
            if (opcoes.atualizarDadosFiscais) {
              if (item.ncm) updateData.ncm = item.ncm;
              if (item.cest) updateData.cest = item.cest;
              if (item.cfop) updateData.cfop = item.cfop;
              if (item.cst) updateData.cst = item.cst;
              if (item.csosn) updateData.csosn = item.csosn;
              if (item.origem) updateData.origem = item.origem;
              if (item.icmsAliquota) updateData.icms = item.icmsAliquota;
              if (item.unidadeTributavel) updateData.unidade_tributavel = normalizarUnidade(item.unidadeTributavel);
              if (item.ipiAliquota) updateData.ipi_aliquota = item.ipiAliquota;
              if (item.pisAliquota) updateData.pis_aliquota = item.pisAliquota;
              if (item.cofinsAliquota) updateData.cofins_aliquota = item.cofinsAliquota;
            }

            // Atualizar EAN se o produto não tem e a NFe tem
            if (item.ean) {
              const { data: prodAtualEan } = await supabase
                .from('produtos')
                .select('codigo_barras')
                .eq('id', item.produtoId)
                .single();
              if (!(prodAtualEan as any)?.codigo_barras && item.ean && item.ean !== 'SEM GTIN') {
                updateData.codigo_barras = item.ean;
              }
            }

            // Aplicar atualizações
            if (Object.keys(updateData).length > 1) {
              await supabase
                .from('produtos')
                .update(updateData)
                .eq('id', item.produtoId);
            }

            const acoes: string[] = [];
            if (opcoes.atualizarDadosFiscais) acoes.push('dados fiscais atualizados');
            if (item.valorUnitario) acoes.push(`custo atualizado R$ ${item.valorUnitario.toFixed(2)}`);

            // Atualizar estoque (respeitando opção global E item individual)
            if (opcoes.atualizarEstoque && item.irParaEstoque && item.quantidade > 0) {
              // Buscar estoque atual
              const { data: produtoAtual } = await supabase
                .from('produtos')
                .select('estoque_atual')
                .eq('id', item.produtoId)
                .single();

              const estoqueAnterior = (produtoAtual as any)?.estoque_atual || 0;
              const qtdUnidades = item.unidadesPorCaixa > 0 
                ? item.quantidade * item.unidadesPorCaixa 
                : item.quantidade;
              const estoqueNovo = estoqueAnterior + qtdUnidades;

              // Atualizar estoque do produto
              await supabase
                .from('produtos')
                .update({ estoque_atual: estoqueNovo })
                .eq('id', item.produtoId);

              // Registrar movimentação
              const observacaoBase = `Importação NFe ${nfeData.numero}/${nfeData.serie} - ${resultado.fornecedorNome || nfeData.emitente?.nome || ''}`;
              const observacao = item.unidadesPorCaixa > 0
                ? `${observacaoBase} (${item.quantidade} cx x ${item.unidadesPorCaixa} un = ${qtdUnidades} un)`
                : observacaoBase;
              await supabase.from('estoque_movimentos').insert({
                empresa_id: empresaId,
                produto_id: item.produtoId,
                produto_nome: item.descricao,
                tipo: 'entrada',
                quantidade: qtdUnidades,
                quantidade_informada: qtdUnidades,
                tipo_entrada: item.unidadesPorCaixa > 0 ? 'caixa' : 'unidade',
                estoque_anterior: estoqueAnterior,
                estoque_novo: estoqueNovo,
                preco_unitario: (item.unidadesPorCaixa || 0) > 0 ? (item.valorUnitario || 0) / (item.unidadesPorCaixa || 1) : (item.valorUnitario || 0),
                fornecedor: resultado.fornecedorNome || nfeData.emitente?.nome || null,
                documento_ref: `NFe ${nfeData.numero}/${nfeData.serie}`,
                observacao,
                criado_por: userId || null,
                criado_por_nome: userName || null,
                criado_em: new Date().toISOString(),
              });

              resultado.estoqueAtualizado++;
              acoes.push(`estoque +${qtdUnidades} un${item.unidadesPorCaixa > 0 ? ` (${item.quantidade} cx)` : ''}`);
            }

            resultado.produtosAtualizados++;
            resultado.detalhes.push({
              descricao: item.descricao,
              acao: acoes.length > 0 ? acoes.join(', ') : 'Nenhuma alteração necessária',
              status: 'atualizado',
            });
          }
        } catch (err: any) {
          resultado.erros.push(`Erro ao processar produto "${item.descricao}": ${err.message}`);
          resultado.detalhes.push({
            descricao: item.descricao,
            acao: `Erro: ${err.message}`,
            status: 'erro',
          });
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
          observacao_pagamento: `Importação automática - NFe ${nfeData.numero}/${nfeData.serie}${nfeData.chaveAcesso ? ` - Chave: ${nfeData.chaveAcesso}` : ''}`,
        });

        if (errorConta) {
          resultado.erros.push(`Erro ao gerar conta a pagar: ${errorConta.message}`);
        } else {
          resultado.contaGerada = true;
          resultado.detalhes.push({
            descricao: `Conta a Pagar - NFe ${nfeData.numero}/${nfeData.serie}`,
            acao: `R$ ${nfeData.valorTotal.toFixed(2)} - Vencimento: ${new Date(vencimento).toLocaleDateString('pt-BR')}`,
            status: 'criado',
          });
        }
      } catch (err: any) {
        resultado.erros.push(`Erro ao gerar conta a pagar: ${err.message}`);
      }
    }

    // ========================================
    // 4. REGISTRAR IMPORTAÇÃO DA NFE
    // ========================================
    let nfeImportadaId: string | null = null;
    if (nfeData.chaveAcesso) {
      try {
        const { data: nfeRegistro, error: errorRegistro } = await supabase.from('nfe_importadas').insert({
          empresa_id: empresaId,
          chave_acesso: nfeData.chaveAcesso,
          numero: nfeData.numero || null,
          serie: nfeData.serie || null,
          data_emissao: nfeData.dataEmissao ? new Date(nfeData.dataEmissao).toISOString() : null,
          valor_total: nfeData.valorTotal || 0,
          fornecedor_nome: resultado.fornecedorNome || nfeData.emitente?.nome || null,
          fornecedor_cnpj: nfeData.emitente?.cnpj || null,
          produtos_count: produtosImportar?.length || 0,
          importado_por: userId || null,
          importado_por_nome: userName || null,
          criado_em: new Date().toISOString(),
        }).select('id').single();
        if (errorRegistro) {
          resultado.erros.push(`Aviso: não foi possível registrar a NFe importada (${errorRegistro.message})`);
        } else if (nfeRegistro) {
          nfeImportadaId = nfeRegistro.id;
        }
      } catch (err: any) {
      }
    }

    // ========================================
    // 5. VINCULAR REGISTROS COM nfe_importada_id
    // ========================================
    if (nfeImportadaId) {
      const documentoRef = `NFe ${nfeData.numero}/${nfeData.serie}`;

      // 5a. Vincular movimentações de estoque
      await supabase
        .from('estoque_movimentos')
        .update({ nfe_importada_id: nfeImportadaId })
        .eq('empresa_id', empresaId)
        .eq('documento_ref', documentoRef);

      // 5b. Vincular conta a pagar
      if (nfeData.chaveAcesso) {
        await supabase
          .from('contas')
          .update({ nfe_importada_id: nfeImportadaId })
          .eq('empresa_id', empresaId)
          .like('observacao_pagamento', `%Chave: ${nfeData.chaveAcesso}%`);
      }
    }

    return NextResponse.json({
      sucesso: true,
      resultado,
    });
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: error.message || 'Erro interno ao processar importação' },
      { status: 500 }
    );
  }
}
