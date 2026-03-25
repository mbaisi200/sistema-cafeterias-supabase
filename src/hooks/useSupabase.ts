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

    const { data, error } = await supabase
      .from('produtos')
      .insert({
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
      })
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

    // Campos de iFood (podem não existir na tabela se migration não foi executada)
    if (dados.disponivelIfood !== undefined) updateData.disponivel_ifood = dados.disponivelIfood;
    if (dados.ifoodExternalCode !== undefined) updateData.ifood_external_code = dados.ifoodExternalCode;
    if (dados.ifoodSyncStatus !== undefined) updateData.ifood_sync_status = dados.ifoodSyncStatus;

    // Atualizar todos os dados de uma vez
    const { error } = await supabase
      .from('produtos')
      .update(updateData)
      .eq('id', id);

    if (error) {
      // Se o erro for coluna de iFood não existente, tentar atualizar sem esses campos
      if (error.message?.includes('disponivel_ifood') ||
          error.message?.includes('ifood_external_code') ||
          error.message?.includes('ifood_sync_status') ||
          error.message?.includes('column') ||
          error.message?.includes('does not exist')) {

        // Remover campos de iFood e tentar novamente
        const basicData = { ...updateData };
        delete basicData.disponivel_ifood;
        delete basicData.ifood_external_code;
        delete basicData.ifood_sync_status;

        const { error: basicError } = await supabase
          .from('produtos')
          .update(basicData)
          .eq('id', id);

        if (basicError) throw basicError;
        console.warn('Aviso: Campos de iFood não atualizados (execute a migration SQL)');
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
        perm_pdv: dados.permissoes?.pdv ?? true,
        perm_estoque: dados.permissoes?.estoque ?? false,
        perm_financeiro: dados.permissoes?.financeiro ?? false,
        perm_relatorios: dados.permissoes?.relatorios ?? false,
        perm_cancelar_venda: dados.permissoes?.cancelarVenda ?? false,
        perm_dar_desconto: dados.permissoes?.darDesconto ?? false,
        ativo: dados.ativo ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const atualizarFuncionario = async (id: string, dados: any) => {
    const updateData: any = { ...dados };
    if (dados.permissoes) {
      updateData.perm_pdv = dados.permissoes.pdv;
      updateData.perm_estoque = dados.permissoes.estoque;
      updateData.perm_financeiro = dados.permissoes.financeiro;
      updateData.perm_relatorios = dados.permissoes.relatorios;
      updateData.perm_cancelar_venda = dados.permissoes.cancelarVenda;
      updateData.perm_dar_desconto = dados.permissoes.darDesconto;
      delete updateData.permissoes;
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

      // Combinar vendas com itens
      const vendasCompletas = (vendasData || []).map(venda => ({
        id: venda.id,
        ...venda,
        itens: (itensData || []).filter(item => item.venda_id === venda.id),
        criadoEm: new Date(venda.criado_em),
        atualizadoEm: new Date(venda.atualizado_em),
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
    // Preparar dados com formato correto
    const updateData: any = { ...dados };

    // Converter datas se presentes
    if (dados.validade) {
      updateData.validade = new Date(dados.validade + 'T23:59:59').toISOString();
    }
    if (dados.dataInicio) {
      updateData.data_inicio = dados.dataInicio;
    }

    // Remover campos que não pertencem à tabela
    delete updateData.dataInicio;
    delete updateData.criadoEm;
    delete updateData.atualizadoEm;

    const { error } = await supabase
      .from('empresas')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao atualizar empresa:', error);
      throw error;
    }

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
  const [loading, setLoading] = useState(true);
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
    loading,
    abrirCaixa,
    registrarVenda,
    adicionarReforco,
    adicionarSangria,
    fecharCaixa,
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
  cnpjEmpresa?: string;
  enderecoEmpresa?: string;
  telefoneEmpresa?: string;
  endereco: string;
  telefone: string;
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
  intensidadeImpressao: 'normal' | 'escura' | 'muito-escura';
  imprimirAutomatico: boolean;
  vias: number;
  [key: string]: unknown; // Allow additional properties
}

export const configuracoesCupomPadrao: ConfiguracoesCupom = {
  nomeEmpresa: '',
  cnpj: '',
  cnpjEmpresa: '',
  enderecoEmpresa: '',
  telefoneEmpresa: '',
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
            const mapTamanho: Record<string, number> = {
              'pequena': 10,
              'media': 12,
              'grande': 14
            };
            tamanhoFonteNum = mapTamanho[data.tamanho_fonte] || 12;
          } else {
            tamanhoFonteNum = data.tamanho_fonte;
          }
        }

        setConfiguracoes({
          nomeEmpresa: data.nome_empresa || '',
          cnpj: data.cnpj || '',
          endereco: data.endereco || '',
          telefone: data.telefone || '',
          mensagemRodape: data.mensagem_rodape || 'Obrigado pela preferência!',
          mostrarCPF: data.mostrar_cpf ?? true,
          mostrarData: data.mostrar_data ?? true,
          mostrarHora: data.mostrar_hora ?? true,
          mostrarVendedor: data.mostrar_vendedor ?? true,
          mostrarDesconto: data.mostrar_desconto ?? true,
          tamanhoFonte: tamanhoFonteNum,
          larguraPapel: data.largura_papel || 58,
          espacamentoLinhas: data.espacamento_linhas ?? 1.4,
          margemSuperior: data.margem_superior ?? 2,
          margemInferior: data.margem_inferior ?? 2,
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
      // Primeiro, verificar se já existe um registro
      const { data: existing } = await supabase
        .from('cupom_config')
        .select('id')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      const configData = {
        empresa_id: empresaId,
        razao_social: novasConfiguracoes.nomeEmpresa,
        nome_fantasia: novasConfiguracoes.nomeEmpresa,
        cnpj: novasConfiguracoes.cnpj || novasConfiguracoes.cnpjEmpresa,
        endereco: novasConfiguracoes.endereco || novasConfiguracoes.enderecoEmpresa,
        telefone: novasConfiguracoes.telefone || novasConfiguracoes.telefoneEmpresa,
        mensagem_cupom: novasConfiguracoes.mensagemRodape,
        exibir_valor: true,
        exibir_cliente: novasConfiguracoes.mostrarCPF,
        // Campos de configuração do papel/impressão
        mostrar_cpf: novasConfiguracoes.mostrarCPF,
        mostrar_data: novasConfiguracoes.mostrarData,
        mostrar_hora: novasConfiguracoes.mostrarHora,
        mostrar_vendedor: novasConfiguracoes.mostrarVendedor,
        mostrar_desconto: novasConfiguracoes.mostrarDesconto,
        tamanho_fonte: novasConfiguracoes.tamanhoFonte,
        largura_papel: novasConfiguracoes.larguraPapel,
        espacamento_linhas: novasConfiguracoes.espacamentoLinhas,
        margem_superior: novasConfiguracoes.margemSuperior,
        margem_inferior: novasConfiguracoes.margemInferior,
        intensidade_impressao: novasConfiguracoes.intensidadeImpressao,
        imprimir_automatico: novasConfiguracoes.imprimirAutomatico,
        vias: novasConfiguracoes.vias,
        atualizado_em: new Date().toISOString(),
      };

      let error;
      if (existing?.id) {
        // Atualizar registro existente
        const result = await supabase
          .from('cupom_config')
          .update(configData)
          .eq('id', existing.id);
        error = result.error;
      } else {
        // Inserir novo registro
        const result = await supabase
          .from('cupom_config')
          .insert({
            ...configData,
            criado_em: new Date().toISOString(),
          });
        error = result.error;
      }

      if (error) throw error;
      setConfiguracoes(novasConfiguracoes);
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
