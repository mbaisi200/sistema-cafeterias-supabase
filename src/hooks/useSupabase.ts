'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

// =====================================================
// HOOK: PRODUTOS
// =====================================================
export function useProdutos() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setProdutos([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      
      setProdutos(data?.map(p => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        codigo: p.codigo,
        codigoBarras: p.codigo_barras,
        preco: p.preco,
        custo: p.custo,
        unidade: p.unidade,
        categoriaId: p.categoria_id,
        estoqueAtual: p.estoque_atual,
        estoqueMinimo: p.estoque_minimo,
        destaque: p.destaque,
        ativo: p.ativo,
        foto: p.foto,
        disponivelIfood: p.disponivel_ifood,
        ifoodExternalCode: p.ifood_external_code,
        ifoodSyncStatus: p.ifood_sync_status,
        ifoodProductId: p.ifood_product_id,
        isCombo: p.is_combo,
        comboPreco: p.combo_preco,
        unidadesPorCaixa: p.unidades_por_caixa,
        precoUnidade: p.preco_unidade,
        // NFE/NFCe fiscal fields
        ncm: p.ncm,
        cest: p.cest,
        cfop: p.cfop,
        cst: p.cst,
        csosn: p.csosn,
        origem: p.origem,
        unidadeTributavel: p.unidade_tributavel,
        icms: p.icms,
        ipiAliquota: p.ipi_aliquota,
        pisAliquota: p.pis_aliquota,
        cofinsAliquota: p.cofins_aliquota,
        criadoEm: new Date(p.criado_em),
        atualizadoEm: new Date(p.atualizado_em),
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();

    // Realtime subscription
    let channel: RealtimeChannel;
    if (empresaId) {
      channel = supabase
        .channel('produtos-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'produtos', filter: `empresa_id=eq.${empresaId}` },
          () => carregarDados()
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [carregarDados]);

  const adicionarProduto = async (dados: any) => {
    if (!empresaId) throw new Error('Empresa não definida');

    const insertData: any = {
      empresa_id: empresaId,
      nome: dados.nome,
      descricao: dados.descricao || null,
      codigo: dados.codigo || null,
      codigo_barras: dados.codigoBarras || null,
      preco: dados.preco || 0,
      custo: dados.custo || 0,
      unidade: dados.unidade || 'un',
      categoria_id: dados.categoriaId || null,
      estoque_atual: dados.estoqueAtual || 0,
      estoque_minimo: dados.estoqueMinimo || 0,
      destaque: dados.destaque || false,
      disponivel_ifood: dados.disponivelIfood || false,
      ifood_external_code: dados.ifoodExternalCode || null,
      ifood_sync_status: dados.ifoodSyncStatus || 'not_synced',
      ativo: true,
      // Unidades por caixa e preço unidade
      unidades_por_caixa: dados.unidadesPorCaixa || 0,
      preco_unidade: dados.precoUnidade || 0,
      // Combo
      is_combo: dados.isCombo || false,
      combo_preco: dados.comboPreco || 0,
      // NFE/NFCe fiscal fields
      ncm: dados.ncm || '00000000',
      cest: dados.cest || '',
      cfop: dados.cfop || '5102',
      cst: dados.cst || '00',
      csosn: dados.csosn || '102',
      origem: dados.origem || '0',
      unidade_tributavel: dados.unidadeTributavel || 'UN',
      icms: dados.icms || 0,
      ipi_aliquota: dados.ipiAliquota || 0,
      pis_aliquota: dados.pisAliquota || 0,
      cofins_aliquota: dados.cofinsAliquota || 0,
    };

    const { data, error } = await supabase
      .from('produtos')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const atualizarProduto = async (id: string, dados: any) => {
    // Construir objeto de atualização apenas com campos fornecidos
    const updateData: any = {
      atualizado_em: new Date().toISOString(),
    };

    // Adicionar apenas campos que foram fornecidos (não são undefined)
    if (dados.nome !== undefined) updateData.nome = dados.nome;
    if (dados.descricao !== undefined) updateData.descricao = dados.descricao || null;
    if (dados.codigo !== undefined) updateData.codigo = dados.codigo || null;
    if (dados.codigoBarras !== undefined) updateData.codigo_barras = dados.codigoBarras || null;
    if (dados.preco !== undefined) updateData.preco = dados.preco;
    if (dados.custo !== undefined) updateData.custo = dados.custo;
    if (dados.unidade !== undefined) updateData.unidade = dados.unidade;
    if (dados.categoriaId !== undefined) updateData.categoria_id = dados.categoriaId;
    if (dados.estoqueMinimo !== undefined) updateData.estoque_minimo = dados.estoqueMinimo;
    if (dados.destaque !== undefined) updateData.destaque = dados.destaque;

    // Campos de iFood
    if (dados.disponivelIfood !== undefined) updateData.disponivel_ifood = dados.disponivelIfood;
    if (dados.ifoodExternalCode !== undefined) updateData.ifood_external_code = dados.ifoodExternalCode;
    if (dados.ifoodSyncStatus !== undefined) updateData.ifood_sync_status = dados.ifoodSyncStatus;

    // Campos de Combo
    if (dados.isCombo !== undefined) updateData.is_combo = dados.isCombo;
    if (dados.comboPreco !== undefined) updateData.combo_preco = dados.comboPreco;

    // Campos de Unidades
    if (dados.unidadesPorCaixa !== undefined) updateData.unidades_por_caixa = dados.unidadesPorCaixa;
    if (dados.precoUnidade !== undefined) updateData.preco_unidade = dados.precoUnidade;

    // Campos NFE/NFCe
    if (dados.ncm !== undefined) updateData.ncm = dados.ncm || '00000000';
    if (dados.cest !== undefined) updateData.cest = dados.cest || '';
    if (dados.cfop !== undefined) updateData.cfop = dados.cfop || '5102';
    if (dados.cst !== undefined) updateData.cst = dados.cst || '00';
    if (dados.csosn !== undefined) updateData.csosn = dados.csosn || '102';
    if (dados.origem !== undefined) updateData.origem = dados.origem || '0';
    if (dados.unidadeTributavel !== undefined) updateData.unidade_tributavel = dados.unidadeTributavel || 'UN';
    if (dados.icms !== undefined) updateData.icms = dados.icms || 0;
    if (dados.ipiAliquota !== undefined) updateData.ipi_aliquota = dados.ipiAliquota || 0;
    if (dados.pisAliquota !== undefined) updateData.pis_aliquota = dados.pisAliquota || 0;
    if (dados.cofinsAliquota !== undefined) updateData.cofins_aliquota = dados.cofinsAliquota || 0;

    // Atualizar todos os dados de uma vez
    const { error } = await supabase
      .from('produtos')
      .update(updateData)
      .eq('id', id);

    if (error) {
      // Se o erro for de coluna não existente, tentar remover campos problemáticos
      if (error.message?.includes('column') || error.message?.includes('does not exist')) {
        console.warn('Aviso: Coluna não encontrada no banco. Verifique se as migrations foram executadas. Erro:', error.message);
        
        // Remover campos que podem não existir e tentar novamente
        const optionalFields = [
          'disponivel_ifood', 'ifood_external_code', 'ifood_sync_status', 'ifood_product_id',
          'is_combo', 'combo_preco', 'unidades_por_caixa', 'preco_unidade',
          'ncm', 'cest', 'cfop', 'cst', 'csosn', 'origem', 'unidade_tributavel',
          'icms', 'ipi_aliquota', 'pis_aliquota', 'cofins_aliquota', 'codigo_barras'
        ];
        
        const basicData = { ...updateData };
        for (const field of optionalFields) {
          if (error.message?.includes(field)) {
            delete basicData[field];
          }
        }

        const { error: basicError } = await supabase
          .from('produtos')
          .update(basicData)
          .eq('id', id);

        if (basicError) throw basicError;
        console.warn('Aviso: Alguns campos não foram atualizados. Execute a migration SQL fix_produtos_campos.sql');
      } else {
        throw error;
      }
    }
  };

  const excluirProduto = async (id: string) => {
    const { error } = await supabase
      .from('produtos')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;
  };

  return { produtos, loading, adicionarProduto, atualizarProduto, excluirProduto, refetch: carregarDados };
}

// =====================================================
// HOOK: CATEGORIAS
// =====================================================
export function useCategorias() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setCategorias([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      
      setCategorias(data?.map(c => ({
        id: c.id,
        nome: c.nome,
        cor: c.cor,
        ordem: c.ordem,
        ativo: c.ativo,
        criadoEm: new Date(c.criado_em),
        atualizadoEm: new Date(c.atualizado_em),
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();

    let channel: RealtimeChannel;
    if (empresaId) {
      channel = supabase
        .channel('categorias-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'categorias', filter: `empresa_id=eq.${empresaId}` },
          () => carregarDados()
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [carregarDados]);

  const adicionarCategoria = async (dados: any) => {
    if (!empresaId) throw new Error('Empresa não definida');

    const { data, error } = await supabase
      .from('categorias')
      .insert({
        nome: dados.nome,
        cor: dados.cor || '#6B7280',
        empresa_id: empresaId,
        ordem: dados.ordem || categorias.length + 1,
        ativo: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const atualizarCategoria = async (id: string, dados: any) => {
    const { error } = await supabase
      .from('categorias')
      .update({
        nome: dados.nome,
        cor: dados.cor,
        ordem: dados.ordem,
      })
      .eq('id', id);

    if (error) throw error;
  };

  const excluirCategoria = async (id: string) => {
    const { error } = await supabase
      .from('categorias')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;
  };

  return { categorias, loading, adicionarCategoria, atualizarCategoria, excluirCategoria };
}

// =====================================================
// HOOK: MESAS
// =====================================================
export function useMesas() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setMesas([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('numero');

      if (error) throw error;
      
      setMesas(data?.map(m => ({
        id: m.id,
        ...m,
        criadoEm: new Date(m.criado_em),
        atualizadoEm: new Date(m.atualizado_em),
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();

    let channel: RealtimeChannel;
    if (empresaId) {
      channel = supabase
        .channel('mesas-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'mesas', filter: `empresa_id=eq.${empresaId}` },
          () => carregarDados()
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [carregarDados]);

  const adicionarMesa = async (dados: any) => {
    if (!empresaId) throw new Error('Empresa não definida');
    
    const { data, error } = await supabase
      .from('mesas')
      .insert({
        ...dados,
        empresa_id: empresaId,
        status: 'livre',
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const atualizarMesa = async (id: string, dados: any) => {
    const { error } = await supabase
      .from('mesas')
      .update(dados)
      .eq('id', id);

    if (error) throw error;
  };

  const excluirMesa = async (id: string) => {
    const { error } = await supabase
      .from('mesas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  return { mesas, loading, adicionarMesa, atualizarMesa, excluirMesa };
}

// =====================================================
// HOOK: FUNCIONARIOS
// =====================================================
export function useFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setFuncionarios([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');

      if (error) throw error;
      
      setFuncionarios(data?.map(f => ({
        id: f.id,
        ...f,
        permissoes: {
          pdv: f.perm_pdv,
          estoque: f.perm_estoque,
          financeiro: f.perm_financeiro,
          relatorios: f.perm_relatorios,
          cancelarVenda: f.perm_cancelar_venda,
          darDesconto: f.perm_dar_desconto,
        },
        criadoEm: new Date(f.criado_em),
        atualizadoEm: new Date(f.atualizado_em),
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();

    let channel: RealtimeChannel;
    if (empresaId) {
      channel = supabase
        .channel('funcionarios-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'funcionarios', filter: `empresa_id=eq.${empresaId}` },
          () => carregarDados()
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [carregarDados]);

  const adicionarFuncionario = async (dados: any) => {
    if (!empresaId) throw new Error('Empresa não definida');
    
    const { data, error } = await supabase
      .from('funcionarios')
      .insert({
        nome: dados.nome,
        cargo: dados.cargo,
        email: dados.email,
        telefone: dados.telefone,
        pin: dados.pin,
        empresa_id: empresaId,
        perm_pdv: dados.perm_pdv ?? dados.permissoes?.pdv ?? true,
        perm_estoque: dados.perm_estoque ?? dados.permissoes?.estoque ?? false,
        perm_financeiro: dados.perm_financeiro ?? dados.permissoes?.financeiro ?? false,
        perm_relatorios: dados.perm_relatorios ?? dados.permissoes?.relatorios ?? false,
        perm_cancelar_venda: dados.perm_cancelar_venda ?? dados.permissoes?.cancelarVenda ?? false,
        perm_dar_desconto: dados.perm_dar_desconto ?? dados.permissoes?.darDesconto ?? false,
        ativo: dados.ativo ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const atualizarFuncionario = async (id: string, dados: any) => {
    const updateData: any = { ...dados };
    // Mapear campos diretos (novo formato)
    if (dados.permissoes) {
      // Compatibilidade com formato antigo (objeto permissoes)
      updateData.perm_pdv = dados.permissoes.pdv;
      updateData.perm_estoque = dados.permissoes.estoque;
      updateData.perm_financeiro = dados.permissoes.financeiro;
      updateData.perm_relatorios = dados.permissoes.relatorios;
      updateData.perm_cancelar_venda = dados.permissoes.cancelarVenda;
      updateData.perm_dar_desconto = dados.permissoes.darDesconto;
      delete updateData.permissoes;
    } else {
      // Novo formato: campos booleanos diretos já estão em updateData
      // Apenas remover campos indefinidos para não sobrescrever
    }

    const { error } = await supabase
      .from('funcionarios')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  };

  const excluirFuncionario = async (id: string) => {
    const { error } = await supabase
      .from('funcionarios')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  return { funcionarios, loading, adicionarFuncionario, atualizarFuncionario, excluirFuncionario };
}

// =====================================================
// HOOK: VENDAS
// =====================================================
export function useVendas() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setVendas([]);
      setLoading(false);
      return;
    }

    try {
      // Carregar vendas
      const { data: vendasData, error: vendasError } = await supabase
        .from('vendas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

      if (vendasError) throw vendasError;

      // Carregar itens de venda
      const { data: itensData, error: itensError } = await supabase
        .from('itens_venda')
        .select('*')
        .eq('empresa_id', empresaId);

      if (itensError) throw itensError;

      // Combinar vendas com itens - mapear snake_case para camelCase
      const vendasCompletas = (vendasData || []).map(venda => ({
        id: venda.id,
        empresaId: venda.empresa_id,
        tipo: venda.tipo,
        canal: venda.canal,
        status: venda.status,
        mesaId: venda.mesa_id,
        funcionarioId: venda.funcionario_id,
        subtotal: parseFloat(venda.subtotal) || 0,
        desconto: parseFloat(venda.desconto) || 0,
        taxaServico: parseFloat(venda.taxa_servico) || 0,
        taxaEntrega: parseFloat(venda.taxa_entrega) || 0,
        total: parseFloat(venda.total) || 0,
        formaPagamento: venda.forma_pagamento,
        pedidoExternoId: venda.pedido_externo_id,
        nomeCliente: venda.nome_cliente,
        telefoneCliente: venda.telefone_cliente,
        comandaId: venda.comanda_id,
        comandaNumero: venda.comanda_numero,
        observacao: venda.observacao,
        criadoPor: venda.criado_por,
        criadoPorNome: venda.criado_por_nome,
        canceladoPor: venda.cancelado_por,
        motivoCancelamento: venda.motivo_cancelamento,
        criadoEm: new Date(venda.criado_em),
        atualizadoEm: new Date(venda.atualizado_em),
        fechadoEm: venda.fechado_em ? new Date(venda.fechado_em) : null,
        // Itens mapeados para camelCase
        itens: (itensData || [])
          .filter(item => item.venda_id === venda.id)
          .map(item => ({
            id: item.id,
            vendaId: item.venda_id,
            produtoId: item.produto_id,
            nome: item.nome,
            quantidade: parseFloat(item.quantidade) || 0,
            precoUnitario: parseFloat(item.preco_unitario) || 0,
            preco: parseFloat(item.preco_unitario) || 0, // alias para compatibilidade
            desconto: parseFloat(item.desconto) || 0,
            total: parseFloat(item.total) || 0,
            observacao: item.observacao,
          })),
      }));

      setVendas(vendasCompletas);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();

    let channel: RealtimeChannel;
    if (empresaId) {
      channel = supabase
        .channel('vendas-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'vendas', filter: `empresa_id=eq.${empresaId}` },
          () => carregarDados()
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [carregarDados]);

  return { vendas, loading };
}

// =====================================================
// HOOK: EMPRESAS (Master)
// =====================================================
export function useEmpresas() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();
  const hasLoaded = useRef(false);

  const carregarEmpresas = async () => {
    try {
      console.log('🔄 Carregando empresas...');

      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nome');

      console.log('📊 Resultado empresas:', { data: data?.length, error });

      if (error) throw error;

      const mappedData = data?.map(e => ({
        id: e.id,
        ...e,
        criadoEm: new Date(e.criado_em),
        atualizadoEm: new Date(e.atualizado_em),
        validade: e.validade ? new Date(e.validade) : null,
        dataInicio: e.data_inicio ? new Date(e.data_inicio) : null,
      })) || [];

      setEmpresas(mappedData);
      return mappedData;
    } catch (error) {
      console.error('❌ Erro ao carregar empresas:', error);
      return [];
    } finally {
      setLoading(false);
      console.log('✅ Loading finalizado');
    }
  };

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    carregarEmpresas();
  }, []);

  const adicionarEmpresa = async (dados: any) => {
    // Preparar dados com formato correto de datas
    const insertData: any = {
      nome: dados.nome,
      cnpj: dados.cnpj || null,
      telefone: dados.telefone || null,
      email: dados.email || null,
      logradouro: dados.logradouro || null,
      numero: dados.numero || null,
      complemento: dados.complemento || null,
      bairro: dados.bairro || null,
      cidade: dados.cidade || null,
      estado: dados.estado || null,
      cep: dados.cep || null,
      valor_mensal: dados.valorMensal || 0,
      status: 'ativo',
    };

    // Converter data de validade para formato ISO
    if (dados.validade) {
      insertData.validade = new Date(dados.validade + 'T23:59:59').toISOString();
    }

    console.log('📝 Inserindo empresa:', JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
      .from('empresas')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao inserir empresa:', JSON.stringify(error, null, 2));
      console.error('❌ Dados que causaram erro:', JSON.stringify(insertData, null, 2));
      throw new Error(`Erro ao criar empresa: ${error.message} - ${error.details || ''}`);
    }

    // Recarregar lista
    await carregarEmpresas();

    return data.id;
  };

  const atualizarEmpresa = async (id: string, dados: any) => {
    // Construir objeto apenas com campos válidos da tabela empresas
    // NOTA: A tabela tem coluna 'endereco' (text) mas não tem 'data_inicio'
    const updateData: any = {
      nome: dados.nome,
      cnpj: dados.cnpj || null,
      telefone: dados.telefone || null,
      email: dados.email || null,
      logradouro: dados.logradouro || null,
      numero: dados.numero || null,
      complemento: dados.complemento || null,
      bairro: dados.bairro || null,
      cidade: dados.cidade || null,
      estado: dados.estado || null,
      cep: dados.cep || null,
      valor_mensal: parseFloat(dados.valor_mensal ?? dados.valorMensal ?? 0) || 0,
    };

    // Converter data de validade para formato ISO (TIMESTAMP WITH TIME ZONE)
    if (dados.validade) {
      // Se já for uma string ISO, usar diretamente
      if (typeof dados.validade === 'string' && dados.validade.includes('T')) {
        updateData.validade = dados.validade;
      } else {
        // Se for apenas data (YYYY-MM-DD), adicionar hora
        updateData.validade = new Date(dados.validade + 'T23:59:59').toISOString();
      }
    }

    // NOTA: data_inicio precisa ser adicionado à tabela com:
    // ALTER TABLE empresas ADD COLUMN IF NOT EXISTS data_inicio DATE;
    // Por enquanto, não enviamos esse campo

    // Status (se fornecido)
    if (dados.status) {
      updateData.status = dados.status;
    }

    console.log('📝 Atualizando empresa ID:', id);
    console.log('📝 Dados:', JSON.stringify(updateData, null, 2));

    const { data: resultData, error } = await supabase
      .from('empresas')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Erro ao atualizar empresa:');
      console.error('   Message:', error.message);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      console.error('   Code:', error.code);
      throw new Error(`${error.message}${error.details ? ' - ' + error.details : ''}${error.hint ? ' (' + error.hint + ')' : ''}`);
    }

    console.log('✅ Empresa atualizada:', resultData);

    // Recarregar lista
    await carregarEmpresas();
  };

  const excluirEmpresa = async (id: string) => {
    // Primeiro excluir usuários relacionados
    const { error: errorUsuarios } = await supabase
      .from('usuarios')
      .delete()
      .eq('empresa_id', id);

    if (errorUsuarios) throw errorUsuarios;

    // Depois excluir a empresa
    const { error } = await supabase
      .from('empresas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Recarregar lista
    await carregarEmpresas();
  };

  return { empresas, loading, adicionarEmpresa, atualizarEmpresa, excluirEmpresa };
}

// =====================================================
// HOOK: CONTAS A PAGAR/RECEBER
// =====================================================
export function useContas() {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setContas([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('vencimento');

      if (error) throw error;
      
      setContas(data?.map(c => ({
        id: c.id,
        ...c,
        vencimento: new Date(c.vencimento),
        dataPagamento: c.data_pagamento ? new Date(c.data_pagamento) : null,
        criadoEm: new Date(c.criado_em),
        atualizadoEm: new Date(c.atualizado_em),
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const adicionarConta = async (dados: any) => {
    if (!empresaId) throw new Error('Empresa não definida');
    
    const { data, error } = await supabase
      .from('contas')
      .insert({
        ...dados,
        empresa_id: empresaId,
        status: 'pendente',
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const atualizarConta = async (id: string, dados: any) => {
    const { error } = await supabase
      .from('contas')
      .update(dados)
      .eq('id', id);

    if (error) throw error;
  };

  const registrarPagamento = async (id: string, dadosPagamento: { valor: number; formaPagamento: string; observacao?: string }) => {
    const { error } = await supabase
      .from('contas')
      .update({
        status: 'pago',
        data_pagamento: new Date().toISOString(),
        valor_pago: dadosPagamento.valor,
        forma_pagamento: dadosPagamento.formaPagamento,
        observacao_pagamento: dadosPagamento.observacao,
      })
      .eq('id', id);

    if (error) throw error;
  };

  const excluirConta = async (id: string) => {
    const { error } = await supabase
      .from('contas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  // Calcular totais
  const contasPagar = contas.filter(c => c.tipo === 'pagar');
  const contasReceber = contas.filter(c => c.tipo === 'receber');
  
  const totalPagarPendente = contasPagar.filter(c => c.status === 'pendente').reduce((acc, c) => acc + (c.valor || 0), 0);
  const totalReceberPendente = contasReceber.filter(c => c.status === 'pendente').reduce((acc, c) => acc + (c.valor || 0), 0);
  const totalPago = contasPagar.filter(c => c.status === 'pago').reduce((acc, c) => acc + (c.valor_pago || 0), 0);
  const totalRecebido = contasReceber.filter(c => c.status === 'pago').reduce((acc, c) => acc + (c.valor_pago || 0), 0);

  return { 
    contas, 
    loading, 
    adicionarConta, 
    atualizarConta, 
    registrarPagamento, 
    excluirConta,
    contasPagar,
    contasReceber,
    totalPagarPendente,
    totalReceberPendente,
    totalPago,
    totalRecebido
  };
}

// =====================================================
// HOOK: LOGS
// =====================================================
export function useLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data_hora', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      setLogs(data?.map(l => ({
        id: l.id,
        ...l,
        dataHora: new Date(l.data_hora),
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  return { logs, loading };
}

// Função para registrar log
export async function registrarLog(dados: {
  empresaId: string;
  usuarioId: string;
  usuarioNome: string;
  acao: string;
  detalhes?: string;
  tipo: 'venda' | 'produto' | 'estoque' | 'funcionario' | 'financeiro' | 'outro';
}) {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('logs')
    .insert({
      empresa_id: dados.empresaId,
      usuario_id: dados.usuarioId,
      usuario_nome: dados.usuarioNome,
      acao: dados.acao,
      detalhes: dados.detalhes,
      tipo: dados.tipo,
    });

  if (error) console.error('Erro ao registrar log:', error);
}

// =====================================================
// HOOK: CAIXA
// =====================================================
export function useCaixa() {
  const [caixaAberto, setCaixaAberto] = useState<any | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [detalhesCaixa, setDetalhesCaixa] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setCaixaAberto(null);
      setMovimentacoes([]);
      setHistorico([]);
      setLoading(false);
      return;
    }

    try {
      // Buscar caixa aberto
      const { data: caixas, error: caixaError } = await supabase
        .from('caixas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('status', 'aberto')
        .single();

      if (caixaError && caixaError.code !== 'PGRST116') {
        throw caixaError;
      }

      if (caixas) {
        setCaixaAberto({
          id: caixas.id,
          ...caixas,
          // Mapear propriedades para camelCase (compatibilidade)
          valorInicial: caixas.valor_inicial,
          valorAtual: caixas.valor_atual,
          totalEntradas: caixas.total_entradas,
          totalSaidas: caixas.total_saidas,
          totalVendas: caixas.total_vendas,
          abertoEm: new Date(caixas.aberto_em),
          fechadoEm: caixas.fechado_em ? new Date(caixas.fechado_em) : null,
        });

        // Carregar movimentações
        const { data: movs, error: movsError } = await supabase
          .from('movimentacoes_caixa')
          .select('*')
          .eq('caixa_id', caixas.id)
          .order('criado_em', { ascending: false });

        if (movsError) throw movsError;

        setMovimentacoes(movs?.map(m => ({
          id: m.id,
          ...m,
          // Mapear propriedades para camelCase (compatibilidade)
          formaPagamento: m.forma_pagamento,
          usuarioId: m.usuario_id,
          usuarioNome: m.usuario_nome,
          criadoEm: new Date(m.criado_em),
        })) || []);
      } else {
        setCaixaAberto(null);
        setMovimentacoes([]);
      }

      // Carregar histórico
      const { data: hist, error: histError } = await supabase
        .from('caixas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('status', 'fechado')
        .order('fechado_em', { ascending: false })
        .limit(30);

      if (histError) throw histError;
      
      setHistorico(hist?.map(h => ({
        id: h.id,
        ...h,
        abertoEm: new Date(h.aberto_em),
        fechadoEm: h.fechado_em ? new Date(h.fechado_em) : null,
      })) || []);

    } catch (error) {
      console.error('Erro ao carregar caixa:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const abrirCaixa = async (valorInicial: number, observacao?: string) => {
    if (!empresaId || !user) throw new Error('Usuário não autenticado');
    
    if (caixaAberto) {
      throw new Error('Já existe um caixa aberto');
    }

    const { data: caixa, error: caixaError } = await supabase
      .from('caixas')
      .insert({
        empresa_id: empresaId,
        valor_inicial: valorInicial,
        valor_atual: valorInicial,
        total_entradas: 0,
        total_saidas: 0,
        total_vendas: 0,
        status: 'aberto',
        aberto_por: user.id,
        aberto_por_nome: user.nome,
        observacao_abertura: observacao || '',
      })
      .select()
      .single();

    if (caixaError) throw caixaError;

    // Registrar movimentação inicial
    await supabase
      .from('movimentacoes_caixa')
      .insert({
        caixa_id: caixa.id,
        empresa_id: empresaId,
        tipo: 'abertura',
        valor: valorInicial,
        forma_pagamento: 'dinheiro',
        descricao: 'Abertura de caixa',
        usuario_id: user.id,
        usuario_nome: user.nome,
      });

    await carregarDados();
    return caixa.id;
  };

  const registrarVenda = async (valor: number, formaPagamento: string, vendaId: string) => {
    if (!caixaAberto || !user) throw new Error('Nenhum caixa aberto');

    await supabase
      .from('movimentacoes_caixa')
      .insert({
        caixa_id: caixaAberto.id,
        empresa_id: empresaId,
        tipo: 'venda',
        valor,
        forma_pagamento: formaPagamento,
        venda_id: vendaId,
        descricao: `Venda - ${formaPagamento}`,
        usuario_id: user.id,
        usuario_nome: user.nome,
      });

    await supabase
      .from('caixas')
      .update({
        valor_atual: (caixaAberto.valorAtual || 0) + valor,
        total_vendas: (caixaAberto.totalVendas || 0) + valor,
        total_entradas: (caixaAberto.totalEntradas || 0) + valor,
      })
      .eq('id', caixaAberto.id);

    await carregarDados();
  };

  const adicionarReforco = async (valor: number, descricao: string, formaPagamento: string) => {
    if (!caixaAberto || !user) throw new Error('Nenhum caixa aberto');

    await supabase
      .from('movimentacoes_caixa')
      .insert({
        caixa_id: caixaAberto.id,
        empresa_id: empresaId,
        tipo: 'reforco',
        valor,
        forma_pagamento: formaPagamento,
        descricao: `Reforço: ${descricao}`,
        usuario_id: user.id,
        usuario_nome: user.nome,
      });

    await supabase
      .from('caixas')
      .update({
        valor_atual: (caixaAberto.valorAtual || 0) + valor,
        total_entradas: (caixaAberto.totalEntradas || 0) + valor,
      })
      .eq('id', caixaAberto.id);

    await carregarDados();
  };

  const adicionarSangria = async (valor: number, descricao: string) => {
    if (!caixaAberto || !user) throw new Error('Nenhum caixa aberto');

    if (valor > (caixaAberto.valorAtual || 0)) {
      throw new Error('Valor maior que o disponível no caixa');
    }

    await supabase
      .from('movimentacoes_caixa')
      .insert({
        caixa_id: caixaAberto.id,
        empresa_id: empresaId,
        tipo: 'sangria',
        valor,
        forma_pagamento: 'dinheiro',
        descricao: `Sangria: ${descricao}`,
        usuario_id: user.id,
        usuario_nome: user.nome,
      });

    await supabase
      .from('caixas')
      .update({
        valor_atual: (caixaAberto.valorAtual || 0) - valor,
        total_saidas: (caixaAberto.totalSaidas || 0) + valor,
      })
      .eq('id', caixaAberto.id);

    await carregarDados();
  };

  const fecharCaixa = async (valorFinal: number, observacao?: string) => {
    if (!caixaAberto || !user) throw new Error('Nenhum caixa aberto');

    const quebra = valorFinal - (caixaAberto.valorAtual || 0);

    await supabase
      .from('movimentacoes_caixa')
      .insert({
        caixa_id: caixaAberto.id,
        empresa_id: empresaId,
        tipo: 'fechamento',
        valor: valorFinal,
        forma_pagamento: 'dinheiro',
        descricao: `Fechamento de caixa${observacao ? ` - ${observacao}` : ''}`,
        quebra,
        usuario_id: user.id,
        usuario_nome: user.nome,
      });

    await supabase
      .from('caixas')
      .update({
        status: 'fechado',
        valor_final: valorFinal,
        quebra,
        fechado_por: user.id,
        fechado_por_nome: user.nome,
        fechado_em: new Date().toISOString(),
        observacao_fechamento: observacao || '',
      })
      .eq('id', caixaAberto.id);

    await carregarDados();
  };

  const carregarDetalhesCaixa = useCallback(async (caixaId: string) => {
    setLoadingDetalhes(true);
    try {
      // Buscar dados do caixa
      const { data: caixa, error: caixaError } = await supabase
        .from('caixas')
        .select('*')
        .eq('id', caixaId)
        .single();

      if (caixaError) throw caixaError;

      // Buscar movimentações desse caixa
      const { data: movs, error: movsError } = await supabase
        .from('movimentacoes_caixa')
        .select('*')
        .eq('caixa_id', caixaId)
        .order('criado_em', { ascending: true });

      if (movsError) throw movsError;

      // Buscar vendas vinculadas a esse caixa (via movimentacoes_caixa.tipo = 'venda')
      const vendaIds = movs?.filter(m => m.tipo === 'venda' && m.venda_id).map(m => m.venda_id) || [];
      
      let vendasDetalhadas: any[] = [];
      if (vendaIds.length > 0) {
        const { data: vendas, error: vendasError } = await supabase
          .from('vendas')
          .select('*')
          .in('id', vendaIds)
          .order('criado_em', { ascending: true });

        if (!vendasError && vendas && vendas.length > 0) {
          // Fetch ALL items in a single query
          const { data: todosItens } = await supabase
            .from('itens_venda')
            .select('*')
            .in('venda_id', vendaIds);

          // Group items by venda_id
          const itensMap = new Map<string, any[]>();
          (todosItens || []).forEach(item => {
            const existing = itensMap.get(item.venda_id) || [];
            existing.push(item);
            itensMap.set(item.venda_id, existing);
          });

          vendasDetalhadas = vendas.map(venda => ({
            ...venda,
            itens: itensMap.get(venda.id) || [],
          }));
        }
      }

      const movimentacoesMapeadas = (movs || []).map(m => ({
        id: m.id,
        ...m,
        formaPagamento: m.forma_pagamento,
        usuarioId: m.usuario_id,
        usuarioNome: m.usuario_nome,
        criadoEm: new Date(m.criado_em),
      }));

      // Calcular resumo do caixa fechado
      const resumoCaixa = {
        valorInicial: caixa.valor_inicial,
        valorFinal: caixa.valor_final,
        totalVendas: movimentacoesMapeadas.filter(m => m.tipo === 'venda').reduce((acc, m) => acc + (m.valor || 0), 0),
        vendasDinheiro: movimentacoesMapeadas.filter(m => m.tipo === 'venda' && m.forma_pagamento === 'dinheiro').reduce((acc, m) => acc + (m.valor || 0), 0),
        vendasCredito: movimentacoesMapeadas.filter(m => m.tipo === 'venda' && m.forma_pagamento === 'cartao_credito').reduce((acc, m) => acc + (m.valor || 0), 0),
        vendasDebito: movimentacoesMapeadas.filter(m => m.tipo === 'venda' && m.forma_pagamento === 'cartao_debito').reduce((acc, m) => acc + (m.valor || 0), 0),
        vendasPix: movimentacoesMapeadas.filter(m => m.tipo === 'venda' && m.forma_pagamento === 'pix').reduce((acc, m) => acc + (m.valor || 0), 0),
        reforcos: movimentacoesMapeadas.filter(m => m.tipo === 'reforco').reduce((acc, m) => acc + (m.valor || 0), 0),
        sangrias: movimentacoesMapeadas.filter(m => m.tipo === 'sangria').reduce((acc, m) => acc + (m.valor || 0), 0),
        totalEntradas: movimentacoesMapeadas.filter(m => m.tipo === 'venda' || m.tipo === 'reforco' || m.tipo === 'abertura').reduce((acc, m) => acc + (m.valor || 0), 0),
        totalSaidas: movimentacoesMapeadas.filter(m => m.tipo === 'sangria').reduce((acc, m) => acc + (m.valor || 0), 0),
        quantidadeVendas: vendasDetalhadas.length,
      };

      setDetalhesCaixa({
        caixa: {
          ...caixa,
          abertoEm: new Date(caixa.aberto_em),
          fechadoEm: caixa.fechado_em ? new Date(caixa.fechado_em) : null,
        },
        movimentacoes: movimentacoesMapeadas,
        vendas: vendasDetalhadas,
        resumo: resumoCaixa,
      });
    } catch (error) {
      console.error('Erro ao carregar detalhes do caixa:', error);
      throw error;
    } finally {
      setLoadingDetalhes(false);
    }
  }, [empresaId, supabase]);

  const limparDetalhesCaixa = useCallback(() => {
    setDetalhesCaixa(null);
  }, []);

  const resumo = {
    valorInicial: caixaAberto?.valorInicial || 0,
    valorAtual: caixaAberto?.valorAtual || 0,
    totalEntradas: caixaAberto?.totalEntradas || 0,
    totalSaidas: caixaAberto?.totalSaidas || 0,
    totalVendas: caixaAberto?.totalVendas || 0,
    vendasDinheiro: movimentacoes.filter(m => m.tipo === 'venda' && m.formaPagamento === 'dinheiro').reduce((acc, m) => acc + (m.valor || 0), 0),
    vendasCredito: movimentacoes.filter(m => m.tipo === 'venda' && m.formaPagamento === 'cartao_credito').reduce((acc, m) => acc + (m.valor || 0), 0),
    vendasDebito: movimentacoes.filter(m => m.tipo === 'venda' && m.formaPagamento === 'cartao_debito').reduce((acc, m) => acc + (m.valor || 0), 0),
    vendasPix: movimentacoes.filter(m => m.tipo === 'venda' && m.formaPagamento === 'pix').reduce((acc, m) => acc + (m.valor || 0), 0),
    reforcos: movimentacoes.filter(m => m.tipo === 'reforco').reduce((acc, m) => acc + (m.valor || 0), 0),
    sangrias: movimentacoes.filter(m => m.tipo === 'sangria').reduce((acc, m) => acc + (m.valor || 0), 0),
  };

  return {
    caixaAberto,
    movimentacoes,
    historico,
    detalhesCaixa,
    loading,
    loadingDetalhes,
    abrirCaixa,
    registrarVenda,
    adicionarReforco,
    adicionarSangria,
    fecharCaixa,
    carregarDetalhesCaixa,
    limparDetalhesCaixa,
    resumo,
  };
}

// =====================================================
// HOOK: COMANDAS
// =====================================================
export function useComandas() {
  const [comandas, setComandas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setComandas([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('comandas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('status', 'aberta')
        .order('criado_em', { ascending: true });

      if (error) throw error;
      
      setComandas(data?.map(c => ({
        id: c.id,
        ...c,
        itens: c.itens || [],
        criadoEm: new Date(c.criado_em),
        atualizadoEm: new Date(c.atualizado_em),
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar comandas:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const criarComanda = async (nomeCliente: string, observacao?: string) => {
    if (!empresaId || !user) throw new Error('Usuário não autenticado');

    const numero = (comandas.length > 0 ? Math.max(...comandas.map(c => c.numero || 0)) : 0) + 1;

    const { data, error } = await supabase
      .from('comandas')
      .insert({
        empresa_id: empresaId,
        numero,
        nome_cliente: nomeCliente.toUpperCase(),
        observacao: observacao || '',
        status: 'aberta',
        total: 0,
        itens: [],
        criado_por: user.id,
        criado_por_nome: user.nome,
      })
      .select()
      .single();

    if (error) throw error;
    
    await carregarDados();
    return { id: data.id, numero };
  };

  const adicionarItem = async (comandaId: string, item: {
    produtoId: string;
    nome: string;
    preco: number;
    quantidade: number;
    observacao?: string;
  }) => {
    if (!user) throw new Error('Usuário não autenticado');

    const comanda = comandas.find(c => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    const novoItem = {
      id: Date.now().toString(),
      ...item,
      adicionadoPor: user.id,
      adicionadoPorNome: user.nome,
      adicionadoEm: new Date().toISOString(),
    };

    const novosItens = [...(comanda.itens || []), novoItem];
    const novoTotal = novosItens.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);

    await supabase
      .from('comandas')
      .update({
        itens: novosItens,
        total: novoTotal,
      })
      .eq('id', comandaId);

    await carregarDados();
    return novoItem;
  };

  const removerItem = async (comandaId: string, itemId: string) => {
    const comanda = comandas.find(c => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    const novosItens = (comanda.itens || []).filter((i: any) => i.id !== itemId);
    const novoTotal = novosItens.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);

    await supabase
      .from('comandas')
      .update({
        itens: novosItens,
        total: novoTotal,
      })
      .eq('id', comandaId);

    await carregarDados();
  };

  const alterarQuantidadeItem = async (comandaId: string, itemId: string, novaQuantidade: number) => {
    const comanda = comandas.find(c => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    let novosItens = [...(comanda.itens || [])];
    
    if (novaQuantidade <= 0) {
      novosItens = novosItens.filter((i: any) => i.id !== itemId);
    } else {
      novosItens = novosItens.map((i: any) => 
        i.id === itemId ? { ...i, quantidade: novaQuantidade } : i
      );
    }

    const novoTotal = novosItens.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);

    await supabase
      .from('comandas')
      .update({
        itens: novosItens,
        total: novoTotal,
      })
      .eq('id', comandaId);

    await carregarDados();
  };

  const fecharComanda = async (comandaId: string, formaPagamento: string) => {
    if (!user || !empresaId) throw new Error('Usuário não autenticado');

    const comanda = comandas.find(c => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    // Criar venda
    const { data: venda, error: vendaError } = await supabase
      .from('vendas')
      .insert({
        empresa_id: empresaId,
        comanda_id: comandaId,
        comanda_numero: comanda.numero,
        nome_cliente: comanda.nomeCliente,
        tipo: 'comanda',
        status: 'finalizada',
        total: comanda.total,
        forma_pagamento: formaPagamento,
        criado_por: user.id,
        criado_por_nome: user.nome,
      })
      .select()
      .single();

    if (vendaError) throw vendaError;

    // Criar itens de venda
    for (const item of comanda.itens || []) {
      await supabase
        .from('itens_venda')
        .insert({
          empresa_id: empresaId,
          venda_id: venda.id,
          produto_id: item.produtoId,
          nome: item.nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco,
          total: item.preco * item.quantidade,
        });
    }

    // Criar pagamento
    await supabase
      .from('pagamentos')
      .insert({
        empresa_id: empresaId,
        venda_id: venda.id,
        forma_pagamento: formaPagamento,
        valor: comanda.total,
      });

    // Atualizar comanda
    await supabase
      .from('comandas')
      .update({
        status: 'fechada',
        venda_id: venda.id,
        forma_pagamento: formaPagamento,
        fechado_por: user.id,
        fechado_por_nome: user.nome,
        fechado_em: new Date().toISOString(),
      })
      .eq('id', comandaId);

    // Registrar no caixa se houver caixa aberto
    const { data: caixas } = await supabase
      .from('caixas')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('status', 'aberto')
      .limit(1);

    if (caixas && caixas.length > 0) {
      await supabase
        .from('movimentacoes_caixa')
        .insert({
          caixa_id: caixas[0].id,
          empresa_id: empresaId,
          tipo: 'venda',
          valor: comanda.total,
          forma_pagamento: formaPagamento,
          venda_id: venda.id,
          descricao: `Comanda #${comanda.numero} - ${comanda.nomeCliente}`,
          usuario_id: user.id,
          usuario_nome: user.nome,
        });
    }

    await carregarDados();
    return venda.id;
  };

  const cancelarComanda = async (comandaId: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    await supabase
      .from('comandas')
      .update({
        status: 'cancelada',
        cancelado_por: user.id,
        cancelado_em: new Date().toISOString(),
      })
      .eq('id', comandaId);

    await carregarDados();
  };

  return {
    comandas,
    loading,
    criarComanda,
    adicionarItem,
    removerItem,
    alterarQuantidadeItem,
    fecharComanda,
    cancelarComanda,
  };
}

// =====================================================
// HOOK: CONFIGURAÇÕES DE CUPOM
// =====================================================
export interface ConfiguracoesCupom {
  nomeEmpresa: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  // Campos alternativos usados no formulário
  cnpjEmpresa?: string;
  enderecoEmpresa?: string;
  telefoneEmpresa?: string;
  mensagemRodape: string;
  mostrarCPF: boolean;
  mostrarData: boolean;
  mostrarHora: boolean;
  mostrarVendedor: boolean;
  mostrarDesconto: boolean;
  tamanhoFonte: number;
  larguraPapel: number;
  espacamentoLinhas: number;
  margemSuperior: number;
  margemInferior: number;
  margemEsquerda: number;
  margemDireita: number;
  intensidadeImpressao: 'normal' | 'escura' | 'muito-escura';
  imprimirAutomatico: boolean;
  vias: number;
  [key: string]: unknown; // Allow additional properties
}

export const configuracoesCupomPadrao: ConfiguracoesCupom = {
  nomeEmpresa: '',
  cnpj: '',
  endereco: '',
  telefone: '',
  mensagemRodape: 'Obrigado pela preferência!',
  mostrarCPF: true,
  mostrarData: true,
  mostrarHora: true,
  mostrarVendedor: true,
  mostrarDesconto: true,
  tamanhoFonte: 12,
  larguraPapel: 58,
  espacamentoLinhas: 1.4,
  margemSuperior: 2,
  margemInferior: 2,
  margemEsquerda: 2,
  margemDireita: 2,
  intensidadeImpressao: 'escura',
  imprimirAutomatico: false,
  vias: 1,
};

export function useConfiguracoesCupom() {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesCupom>(configuracoesCupomPadrao);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarConfiguracoes = useCallback(async () => {
    if (!user || !empresaId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cupom_config')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Converter tamanhoFonte para número se vier como string
        let tamanhoFonteNum = 12;
        if (data.tamanho_fonte) {
          if (typeof data.tamanho_fonte === 'string') {
            // Primeiro, tentar converter para número diretamente
            const numValue = parseInt(data.tamanho_fonte);
            if (!isNaN(numValue) && numValue > 0) {
              tamanhoFonteNum = numValue;
            } else {
              // Se não for número, tentar mapear valores textuais
              const mapTamanho: Record<string, number> = {
                'pequena': 10,
                'media': 12,
                'grande': 14
              };
              tamanhoFonteNum = mapTamanho[data.tamanho_fonte.toLowerCase()] || 12;
            }
          } else {
            tamanhoFonteNum = Number(data.tamanho_fonte) || 12;
          }
        }

        // Converter larguraPapel para número
        let larguraPapelNum = 58;
        if (data.largura_papel) {
          larguraPapelNum = Number(data.largura_papel) || 58;
        }

        const nomeEmpresa = data.razao_social || data.nome_fantasia || '';
        const cnpjValue = data.cnpj || '';
        const enderecoValue = data.endereco || '';
        const telefoneValue = data.telefone || '';

        setConfiguracoes({
          nomeEmpresa,
          cnpj: cnpjValue,
          endereco: enderecoValue,
          telefone: telefoneValue,
          // Preencher também os campos alternativos usados no formulário
          cnpjEmpresa: cnpjValue,
          enderecoEmpresa: enderecoValue,
          telefoneEmpresa: telefoneValue,
          mensagemRodape: data.mensagem_cupom || 'Obrigado pela preferência!',
          mostrarCPF: data.exibir_cliente ?? data.mostrar_cpf ?? true,
          mostrarData: data.mostrar_data ?? true,
          mostrarHora: data.mostrar_hora ?? true,
          mostrarVendedor: data.mostrar_vendedor ?? true,
          mostrarDesconto: data.mostrar_desconto ?? true,
          tamanhoFonte: tamanhoFonteNum,
          larguraPapel: data.largura_papel || 58,
          espacamentoLinhas: data.espacamento_linhas ?? 1.4,
          margemSuperior: data.margem_superior ?? 2,
          margemInferior: data.margem_inferior ?? 2,
          margemEsquerda: data.margem_esquerda ?? 2,
          margemDireita: data.margem_direita ?? 2,
          intensidadeImpressao: data.intensidade_impressao || 'escura',
          imprimirAutomatico: data.imprimir_automatico ?? false,
          vias: data.vias || 1,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do cupom:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarConfiguracoes();
  }, [carregarConfiguracoes]);

  const salvarConfiguracoes = async (novasConfiguracoes: ConfiguracoesCupom) => {
    if (!empresaId) throw new Error('Empresa não definida');

    setSaving(true);
    try {
      console.log('💾 [CUPOM CONFIG] Iniciando salvamento para empresa:', empresaId);
      console.log('📝 [CUPOM CONFIG] Dados recebidos:', JSON.stringify(novasConfiguracoes, null, 2));

      // Primeiro, verificar se já existe um registro
      const { data: existing, error: selectError } = await supabase
        .from('cupom_config')
        .select('id, tamanho_fonte, largura_papel')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (selectError) {
        console.error('❌ [CUPOM CONFIG] Erro ao verificar registro existente:', selectError);
        throw selectError;
      }

      console.log('📋 [CUPOM CONFIG] Registro existente:', existing);

      // Garantir que os valores sejam números inteiros válidos
      const tamanhoFonteInt = Math.round(Number(novasConfiguracoes.tamanhoFonte)) || 12;
      const larguraPapelInt = Math.round(Number(novasConfiguracoes.larguraPapel)) || 58;

      console.log('🔢 [CUPOM CONFIG] tamanhoFonteInt:', tamanhoFonteInt, 'larguraPapelInt:', larguraPapelInt);

      // Dados essenciais para salvar - apenas campos que EXISTEM na tabela
      const configData: Record<string, any> = {
        empresa_id: empresaId,
        razao_social: novasConfiguracoes.nomeEmpresa || '',
        cnpj: novasConfiguracoes.cnpj || '',
        endereco: novasConfiguracoes.endereco || '',
        telefone: novasConfiguracoes.telefone || '',
        mensagem_cupom: novasConfiguracoes.mensagemRodape || '',
        tamanho_fonte: tamanhoFonteInt,
        largura_papel: larguraPapelInt,
        espacamento_linhas: Number(novasConfiguracoes.espacamentoLinhas) || 1.4,
        margem_superior: Number(novasConfiguracoes.margemSuperior) || 2,
        margem_inferior: Number(novasConfiguracoes.margemInferior) || 2,
        margem_esquerda: Number(novasConfiguracoes.margemEsquerda) || 2,
        margem_direita: Number(novasConfiguracoes.margemDireita) || 2,
        intensidade_impressao: novasConfiguracoes.intensidadeImpressao || 'escura',
        imprimir_automatico: Boolean(novasConfiguracoes.imprimirAutomatico),
        vias: Number(novasConfiguracoes.vias) || 1,
        mostrar_cpf: Boolean(novasConfiguracoes.mostrarCPF),
        mostrar_data: Boolean(novasConfiguracoes.mostrarData),
        mostrar_hora: Boolean(novasConfiguracoes.mostrarHora),
        mostrar_vendedor: Boolean(novasConfiguracoes.mostrarVendedor),
        mostrar_desconto: Boolean(novasConfiguracoes.mostrarDesconto),
        atualizado_em: new Date().toISOString(),
      };

      console.log('📤 [CUPOM CONFIG] Dados a salvar:', JSON.stringify(configData, null, 2));

      let result;
      if (existing?.id) {
        // Atualizar registro existente
        console.log('🔄 [CUPOM CONFIG] Atualizando registro ID:', existing.id);
        result = await supabase
          .from('cupom_config')
          .update(configData)
          .eq('id', existing.id)
          .select();
      } else {
        // Inserir novo registro
        console.log('➕ [CUPOM CONFIG] Inserindo novo registro');
        configData.criado_em = new Date().toISOString();
        result = await supabase
          .from('cupom_config')
          .insert(configData)
          .select();
      }

      console.log('📊 [CUPOM CONFIG] Resultado:', { data: result.data, error: result.error });

      if (result.error) {
        console.error('❌ [CUPOM CONFIG] Erro ao salvar:', result.error);
        console.error('❌ [CUPOM CONFIG] Código:', result.error.code);
        console.error('❌ [CUPOM CONFIG] Mensagem:', result.error.message);
        console.error('❌ [CUPOM CONFIG] Detalhes:', result.error.details);
        console.error('❌ [CUPOM CONFIG] Hint:', result.error.hint);
        throw new Error(`Erro ao salvar: ${result.error.message} (${result.error.code})`);
      }

      console.log('✅ [CUPOM CONFIG] Salvo com sucesso! Dados retornados:', result.data);

      // Recarregar configurações do banco para garantir consistência
      console.log('🔄 [CUPOM CONFIG] Recarregando configurações...');
      await carregarConfiguracoes();
      console.log('✅ [CUPOM CONFIG] Configurações recarregadas!');

    } catch (error: any) {
      console.error('❌ [CUPOM CONFIG] ERRO CRÍTICO:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    configuracoes,
    loading,
    saving,
    salvarConfiguracoes,
    carregarConfiguracoes,
  };
}

// =====================================================
// HOOK: FORNECEDORES
// =====================================================
export function useFornecedores() {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setFornecedores([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      
      setFornecedores(data?.map(f => ({
        id: f.id,
        nome: f.nome,
        razaoSocial: f.razao_social,
        cnpj: f.cnpj,
        inscricaoEstadual: f.inscricao_estadual,
        email: f.email,
        telefone: f.telefone,
        telefone2: f.telefone2,
        logradouro: f.logradouro,
        numero: f.numero,
        complemento: f.complemento,
        bairro: f.bairro,
        cidade: f.cidade,
        estado: f.estado,
        cep: f.cep,
        contato: f.contato,
        cargo: f.cargo,
        site: f.site,
        observacoes: f.observacoes,
        categorias: f.categorias || [],
        ativo: f.ativo,
        criadoEm: new Date(f.criado_em),
        atualizadoEm: new Date(f.atualizado_em),
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();

    // Realtime subscription
    let channel: RealtimeChannel;
    if (empresaId) {
      channel = supabase
        .channel('fornecedores-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'fornecedores', filter: `empresa_id=eq.${empresaId}` },
          () => carregarDados()
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [carregarDados]);

  const adicionarFornecedor = async (dados: any) => {
    if (!empresaId) throw new Error('Empresa não definida');

    const { data, error } = await supabase
      .from('fornecedores')
      .insert({
        empresa_id: empresaId,
        nome: dados.nome,
        razao_social: dados.razaoSocial || null,
        cnpj: dados.cnpj || null,
        inscricao_estadual: dados.inscricaoEstadual || null,
        email: dados.email || null,
        telefone: dados.telefone || null,
        telefone2: dados.telefone2 || null,
        logradouro: dados.logradouro || null,
        numero: dados.numero || null,
        complemento: dados.complemento || null,
        bairro: dados.bairro || null,
        cidade: dados.cidade || null,
        estado: dados.estado || null,
        cep: dados.cep || null,
        contato: dados.contato || null,
        cargo: dados.cargo || null,
        site: dados.site || null,
        observacoes: dados.observacoes || null,
        categorias: dados.categorias || [],
        ativo: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const atualizarFornecedor = async (id: string, dados: any) => {
    const updateData: any = {
      atualizado_em: new Date().toISOString(),
    };

    if (dados.nome !== undefined) updateData.nome = dados.nome;
    if (dados.razaoSocial !== undefined) updateData.razao_social = dados.razaoSocial || null;
    if (dados.cnpj !== undefined) updateData.cnpj = dados.cnpj || null;
    if (dados.inscricaoEstadual !== undefined) updateData.inscricao_estadual = dados.inscricaoEstadual || null;
    if (dados.email !== undefined) updateData.email = dados.email || null;
    if (dados.telefone !== undefined) updateData.telefone = dados.telefone || null;
    if (dados.telefone2 !== undefined) updateData.telefone2 = dados.telefone2 || null;
    if (dados.logradouro !== undefined) updateData.logradouro = dados.logradouro || null;
    if (dados.numero !== undefined) updateData.numero = dados.numero || null;
    if (dados.complemento !== undefined) updateData.complemento = dados.complemento || null;
    if (dados.bairro !== undefined) updateData.bairro = dados.bairro || null;
    if (dados.cidade !== undefined) updateData.cidade = dados.cidade || null;
    if (dados.estado !== undefined) updateData.estado = dados.estado || null;
    if (dados.cep !== undefined) updateData.cep = dados.cep || null;
    if (dados.contato !== undefined) updateData.contato = dados.contato || null;
    if (dados.cargo !== undefined) updateData.cargo = dados.cargo || null;
    if (dados.site !== undefined) updateData.site = dados.site || null;
    if (dados.observacoes !== undefined) updateData.observacoes = dados.observacoes || null;
    if (dados.categorias !== undefined) updateData.categorias = dados.categorias;
    if (dados.ativo !== undefined) updateData.ativo = dados.ativo;

    const { error } = await supabase
      .from('fornecedores')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  };

  const excluirFornecedor = async (id: string) => {
    const { error } = await supabase
      .from('fornecedores')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;
  };

  return { fornecedores, loading, adicionarFornecedor, atualizarFornecedor, excluirFornecedor, refetch: carregarDados };
}

// Função standalone para buscar fornecedor por CNPJ
export async function buscarFornecedorPorCNPJ(empresaId: string, cnpj: string) {
  const supabase = getSupabaseClient();
  
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  const { data, error } = await supabase
    .from('fornecedores')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .ilike('cnpj', `%${cnpjLimpo}%`)
    .limit(1);

  if (error) throw error;
  
  if (data && data.length > 0) {
    const f = data[0];
    return {
      id: f.id,
      nome: f.nome,
      razaoSocial: f.razao_social,
      cnpj: f.cnpj,
      inscricaoEstadual: f.inscricao_estadual,
      email: f.email,
      telefone: f.telefone,
      telefone2: f.telefone2,
      logradouro: f.logradouro,
      numero: f.numero,
      complemento: f.complemento,
      bairro: f.bairro,
      cidade: f.cidade,
      estado: f.estado,
      cep: f.cep,
      contato: f.contato,
      cargo: f.cargo,
      site: f.site,
      observacoes: f.observacoes,
      categorias: f.categorias || [],
      ativo: f.ativo,
      criadoEm: new Date(f.criado_em),
      atualizadoEm: new Date(f.atualizado_em),
    };
  }
  
  return null;
}

// =====================================================
// HOOK: MOVIMENTAÇÕES BI (todas as movimentações da empresa)
// =====================================================
export function useMovimentacoesBI() {
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setMovimentacoes([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('movimentacoes_caixa')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      setMovimentacoes((data || []).map(m => ({
        id: m.id,
        caixaId: m.caixa_id,
        empresaId: m.empresa_id,
        tipo: m.tipo,
        valor: parseFloat(m.valor) || 0,
        formaPagamento: m.forma_pagamento,
        descricao: m.descricao,
        vendaId: m.venda_id,
        usuarioId: m.usuario_id,
        usuarioNome: m.usuario_nome,
        criadoEm: new Date(m.criado_em),
      })));
    } catch (error) {
      console.error('Erro ao carregar movimentações BI:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  return { movimentacoes, loading };
}

// =====================================================
// HOOK: COMBOS
// =====================================================
export function useCombos() {
  const [comboItens, setComboItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { empresaId } = useAuth();
  const supabase = getSupabaseClient();

  // Obter itens de um combo
  const obterItensCombo = useCallback(async (comboProdutoId: string) => {
    if (!empresaId) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('combo_itens')
        .select('*, produtos!inner(nome, preco, estoque_atual, unidade)')
        .eq('combo_produto_id', comboProdutoId)
        .order('criado_em', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        comboProdutoId: item.combo_produto_id,
        itemProdutoId: item.item_produto_id,
        quantidade: parseFloat(item.quantidade) || 1,
        custoIncluido: item.custo_incluido,
        produto: item.produtos ? {
          id: item.produtos.id,
          nome: item.produtos.nome,
          preco: parseFloat(item.produtos.preco) || 0,
          estoqueAtual: parseFloat(item.produtos.estoque_atual) || 0,
          unidade: item.produtos.unidade || 'un',
        } : null,
      }));
    } catch (error) {
      console.error('Erro ao carregar itens do combo:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  // Salvar itens do combo (delete existing + insert new)
  const salvarComboItens = async (comboProdutoId: string, itens: Array<{
    itemProdutoId: string;
    quantidade: number;
    custoIncluido: boolean;
  }>) => {
    if (!empresaId) throw new Error('Empresa não definida');
    const supabase = getSupabaseClient();

    // Delete existing combo items
    const { error: deleteError } = await supabase
      .from('combo_itens')
      .delete()
      .eq('combo_produto_id', comboProdutoId);

    if (deleteError) throw deleteError;

    // Insert new combo items
    if (itens.length > 0) {
      const insertData = itens.map(item => ({
        empresa_id: empresaId,
        combo_produto_id: comboProdutoId,
        item_produto_id: item.itemProdutoId,
        quantidade: item.quantidade,
        custo_incluido: item.custoIncluido,
      }));

      const { error: insertError } = await supabase
        .from('combo_itens')
        .insert(insertData);

      if (insertError) throw insertError;
    }
  };

  // Obter itens de combo para venda (para PDV - sem loading state)
  const obterItensComboParaVenda = async (comboProdutoId: string) => {
    if (!empresaId) return [];

    const { data, error } = await supabase
      .from('combo_itens')
      .select('item_produto_id, quantidade, custo_incluido')
      .eq('combo_produto_id', comboProdutoId);

    if (error) {
      console.error('Erro ao carregar itens do combo para venda:', error);
      return [];
    }

    return (data || []).map(item => ({
      itemProdutoId: item.item_produto_id,
      quantidade: parseFloat(item.quantidade) || 1,
      custoIncluido: item.custo_incluido,
    }));
  };

  return {
    comboItens,
    loading,
    obterItensCombo,
    salvarComboItens,
    obterItensComboParaVenda,
  };
}
