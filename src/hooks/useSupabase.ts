'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContextSupabase';
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
      if (user && !empresaId) {
        setProdutos([]);
        setLoading(false);
      }
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
        ...p,
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
        ...dados,
        empresa_id: empresaId,
        estoque_atual: dados.estoqueAtual || 0,
        destaque: dados.destaque || false,
        ativo: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const atualizarProduto = async (id: string, dados: any) => {
    const { error } = await supabase
      .from('produtos')
      .update(dados)
      .eq('id', id);

    if (error) throw error;
  };

  const excluirProduto = async (id: string) => {
    const { error } = await supabase
      .from('produtos')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;
  };

  return { produtos, loading, adicionarProduto, atualizarProduto, excluirProduto };
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
      if (user && !empresaId) {
        setCategorias([]);
        setLoading(false);
      }
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
        ...c,
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
        ...dados,
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
      .update(dados)
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
      if (user && !empresaId) {
        setMesas([]);
        setLoading(false);
      }
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
      if (user && !empresaId) {
        setFuncionarios([]);
        setLoading(false);
      }
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
      if (user && !empresaId) {
        setVendas([]);
        setLoading(false);
      }
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

  useEffect(() => {
    const carregarEmpresas = async () => {
      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('*')
          .order('nome');

        if (error) throw error;
        
        setEmpresas(data?.map(e => ({
          id: e.id,
          ...e,
          criadoEm: new Date(e.criado_em),
          atualizadoEm: new Date(e.atualizado_em),
          validade: e.validade ? new Date(e.validade) : null,
        })) || []);
      } catch (error) {
        console.error('Erro ao carregar empresas:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarEmpresas();
  }, []);

  const adicionarEmpresa = async (dados: any) => {
    const { data, error } = await supabase
      .from('empresas')
      .insert({
        nome: dados.nome,
        cnpj: dados.cnpj,
        telefone: dados.telefone,
        email: dados.email,
        logradouro: dados.endereco?.logradouro,
        numero: dados.endereco?.numero,
        complemento: dados.endereco?.complemento,
        bairro: dados.endereco?.bairro,
        cidade: dados.endereco?.cidade,
        estado: dados.endereco?.estado,
        cep: dados.endereco?.cep,
        plano: dados.plano || 'basico',
        status: 'ativo',
        validade: dados.validade,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const atualizarEmpresa = async (id: string, dados: any) => {
    const { error } = await supabase
      .from('empresas')
      .update(dados)
      .eq('id', id);

    if (error) throw error;
  };

  return { empresas, loading, adicionarEmpresa, atualizarEmpresa };
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
      if (user && !empresaId) {
        setContas([]);
        setLoading(false);
      }
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
      if (user && !empresaId) {
        setLogs([]);
        setLoading(false);
      }
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
      if (user && !empresaId) {
        setCaixaAberto(null);
        setMovimentacoes([]);
        setHistorico([]);
        setLoading(false);
      }
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
      if (user && !empresaId) {
        setComandas([]);
        setLoading(false);
      }
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
