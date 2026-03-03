'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  Timestamp,
  getDocs,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

// Hook para gerenciar produtos
export function useProdutos() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();

  const carregarDados = useCallback(() => {
    const dbInstance = db();
    
    if (!user || !empresaId || !dbInstance) {
      if (user && !empresaId) {
        setProdutos([]);
        setLoading(false);
      }
      return;
    }

    const q = query(
      collection(dbInstance, 'produtos'),
      where('empresaId', '==', empresaId),
      where('ativo', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm?.toDate(),
        atualizadoEm: doc.data().atualizadoEm?.toDate(),
      }));
      setProdutos(data);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar produtos:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [empresaId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const unsubscribe = carregarDados();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [carregarDados]);

  const adicionarProduto = async (dados: any) => {
    const dbInstance = db();
    if (!empresaId) throw new Error('Empresa não definida');
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    const produto = {
      ...dados,
      empresaId,
      estoqueAtual: dados.estoqueAtual || 0,
      destaque: dados.destaque || false,
      ativo: true,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(dbInstance, 'produtos'), produto);
    return docRef.id;
  };

  const atualizarProduto = async (id: string, dados: any) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await updateDoc(doc(dbInstance, 'produtos', id), {
      ...dados,
      atualizadoEm: Timestamp.now(),
    });
  };

  const excluirProduto = async (id: string) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await updateDoc(doc(dbInstance, 'produtos', id), {
      ativo: false,
      atualizadoEm: Timestamp.now(),
    });
  };

  return { produtos, loading, adicionarProduto, atualizarProduto, excluirProduto };
}

// Hook para gerenciar categorias
export function useCategorias() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();

  const carregarDados = useCallback(() => {
    const dbInstance = db();
    
    if (!user || !empresaId || !dbInstance) {
      if (user && !empresaId) {
        setCategorias([]);
        setLoading(false);
      }
      return;
    }

    const q = query(
      collection(dbInstance, 'categorias'),
      where('empresaId', '==', empresaId),
      where('ativo', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm?.toDate(),
        atualizadoEm: doc.data().atualizadoEm?.toDate(),
      }));
      setCategorias(data.sort((a, b) => a.ordem - b.ordem));
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar categorias:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [empresaId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const unsubscribe = carregarDados();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [carregarDados]);

  const adicionarCategoria = async (dados: any) => {
    const dbInstance = db();
    if (!empresaId) throw new Error('Empresa não definida');
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    const categoria = {
      ...dados,
      empresaId,
      ordem: dados.ordem || categorias.length + 1,
      ativo: true,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(dbInstance, 'categorias'), categoria);
    return docRef.id;
  };

  const atualizarCategoria = async (id: string, dados: any) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await updateDoc(doc(dbInstance, 'categorias', id), {
      ...dados,
      atualizadoEm: Timestamp.now(),
    });
  };

  const excluirCategoria = async (id: string) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await updateDoc(doc(dbInstance, 'categorias', id), {
      ativo: false,
      atualizadoEm: Timestamp.now(),
    });
  };

  return { categorias, loading, adicionarCategoria, atualizarCategoria, excluirCategoria };
}

// Hook para gerenciar mesas
export function useMesas() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();

  const carregarDados = useCallback(() => {
    const dbInstance = db();
    
    if (!user || !empresaId || !dbInstance) {
      if (user && !empresaId) {
        setMesas([]);
        setLoading(false);
      }
      return;
    }

    const q = query(
      collection(dbInstance, 'mesas'),
      where('empresaId', '==', empresaId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm?.toDate(),
        atualizadoEm: doc.data().atualizadoEm?.toDate(),
      }));
      setMesas(data.sort((a, b) => a.numero - b.numero));
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar mesas:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [empresaId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const unsubscribe = carregarDados();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [carregarDados]);

  const adicionarMesa = async (dados: any) => {
    const dbInstance = db();
    if (!empresaId) throw new Error('Empresa não definida');
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    const mesa = {
      ...dados,
      empresaId,
      status: 'livre',
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(dbInstance, 'mesas'), mesa);
    return docRef.id;
  };

  const atualizarMesa = async (id: string, dados: any) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await updateDoc(doc(dbInstance, 'mesas', id), {
      ...dados,
      atualizadoEm: Timestamp.now(),
    });
  };

  const excluirMesa = async (id: string) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await deleteDoc(doc(dbInstance, 'mesas', id));
  };

  return { mesas, loading, adicionarMesa, atualizarMesa, excluirMesa };
}

// Hook para gerenciar funcionários
export function useFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();

  const carregarDados = useCallback(() => {
    const dbInstance = db();
    
    if (!user || !empresaId || !dbInstance) {
      if (user && !empresaId) {
        setFuncionarios([]);
        setLoading(false);
      }
      return;
    }

    const q = query(
      collection(dbInstance, 'funcionarios'),
      where('empresaId', '==', empresaId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm?.toDate(),
        atualizadoEm: doc.data().atualizadoEm?.toDate(),
      }));
      setFuncionarios(data);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar funcionários:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [empresaId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const unsubscribe = carregarDados();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [carregarDados]);

  const adicionarFuncionario = async (dados: any) => {
    const dbInstance = db();
    if (!empresaId) throw new Error('Empresa não definida');
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    const funcionario = {
      ...dados,
      empresaId,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(dbInstance, 'funcionarios'), funcionario);
    return docRef.id;
  };

  const atualizarFuncionario = async (id: string, dados: any) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await updateDoc(doc(dbInstance, 'funcionarios', id), {
      ...dados,
      atualizadoEm: Timestamp.now(),
    });
  };

  const excluirFuncionario = async (id: string) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await deleteDoc(doc(dbInstance, 'funcionarios', id));
  };

  return { funcionarios, loading, adicionarFuncionario, atualizarFuncionario, excluirFuncionario };
}

// Hook para gerenciar vendas
export function useVendas() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();

  const carregarDados = useCallback(() => {
    const dbInstance = db();
    
    if (!user || !empresaId || !dbInstance) {
      if (user && !empresaId) {
        setVendas([]);
        setLoading(false);
      }
      return;
    }

    const q = query(
      collection(dbInstance, 'vendas'),
      where('empresaId', '==', empresaId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm?.toDate(),
        atualizadoEm: doc.data().atualizadoEm?.toDate(),
      }));

      // Carregar itens e pagamentos de cada venda
      const vendasCompletas = await Promise.all(
        data.map(async (venda) => {
          try {
            // Carregar itens da venda
            const itensQuery = query(
              collection(dbInstance, 'itens_venda'),
              where('vendaId', '==', venda.id)
            );
            const itensSnapshot = await getDocs(itensQuery);
            const itens = itensSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              criadoEm: doc.data().criadoEm?.toDate(),
            }));

            // Carregar pagamento da venda
            const pagamentosQuery = query(
              collection(dbInstance, 'pagamentos'),
              where('vendaId', '==', venda.id)
            );
            const pagamentosSnapshot = await getDocs(pagamentosQuery);
            const pagamento = pagamentosSnapshot.docs[0]?.data();

            return { 
              ...venda, 
              itens,
              formaPagamento: venda.formaPagamento || pagamento?.formaPagamento || ''
            };
          } catch {
            return { ...venda, itens: [] };
          }
        })
      );

      setVendas(vendasCompletas.sort((a, b) => b.criadoEm - a.criadoEm));
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar vendas:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [empresaId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const unsubscribe = carregarDados();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [carregarDados]);

  return { vendas, loading };
}

// Hook para empresas (Master)
export function useEmpresas() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dbInstance = db();
    if (!dbInstance) {
      return;
    }

    const q = query(collection(dbInstance, 'empresas'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm?.toDate(),
        atualizadoEm: doc.data().atualizadoEm?.toDate(),
        validade: doc.data().validade?.toDate(),
      }));
      setEmpresas(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const adicionarEmpresa = async (dados: any) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    const empresa = {
      ...dados,
      status: 'ativo',
      configuracoes: {
        moeda: 'BRL',
        imposto: 0,
        taxaServico: 10,
      },
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(dbInstance, 'empresas'), empresa);
    return docRef.id;
  };

  const atualizarEmpresa = async (id: string, dados: any) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await updateDoc(doc(dbInstance, 'empresas', id), {
      ...dados,
      atualizadoEm: Timestamp.now(),
    });
  };

  return { empresas, loading, adicionarEmpresa, atualizarEmpresa };
}

// Hook para gerenciar contas a pagar e receber
export function useContas() {
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();

  const carregarDados = useCallback(() => {
    const dbInstance = db();
    
    if (!user || !empresaId || !dbInstance) {
      if (user && !empresaId) {
        setContas([]);
        setLoading(false);
      }
      return;
    }

    const q = query(
      collection(dbInstance, 'contas'),
      where('empresaId', '==', empresaId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        vencimento: doc.data().vencimento?.toDate(),
        dataPagamento: doc.data().dataPagamento?.toDate(),
        criadoEm: doc.data().criadoEm?.toDate(),
        atualizadoEm: doc.data().atualizadoEm?.toDate(),
      }));
      setContas(data.sort((a, b) => {
        if (!a.vencimento) return 1;
        if (!b.vencimento) return -1;
        return a.vencimento.getTime() - b.vencimento.getTime();
      }));
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar contas:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [empresaId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const unsubscribe = carregarDados();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [carregarDados]);

  const adicionarConta = async (dados: any) => {
    const dbInstance = db();
    if (!empresaId) throw new Error('Empresa não definida');
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    const conta = {
      ...dados,
      empresaId,
      status: 'pendente',
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(dbInstance, 'contas'), conta);
    return docRef.id;
  };

  const atualizarConta = async (id: string, dados: any) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await updateDoc(doc(dbInstance, 'contas', id), {
      ...dados,
      atualizadoEm: Timestamp.now(),
    });
  };

  const registrarPagamento = async (id: string, dadosPagamento: { valor: number; formaPagamento: string; observacao?: string }) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await updateDoc(doc(dbInstance, 'contas', id), {
      status: 'pago',
      dataPagamento: Timestamp.now(),
      valorPago: dadosPagamento.valor,
      formaPagamento: dadosPagamento.formaPagamento,
      observacaoPagamento: dadosPagamento.observacao,
      atualizadoEm: Timestamp.now(),
    });
  };

  const excluirConta = async (id: string) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    await deleteDoc(doc(dbInstance, 'contas', id));
  };

  // Calcular totais
  const contasPagar = contas.filter(c => c.tipo === 'pagar');
  const contasReceber = contas.filter(c => c.tipo === 'receber');
  
  const totalPagarPendente = contasPagar.filter(c => c.status === 'pendente').reduce((acc, c) => acc + (c.valor || 0), 0);
  const totalReceberPendente = contasReceber.filter(c => c.status === 'pendente').reduce((acc, c) => acc + (c.valor || 0), 0);
  const totalPago = contasPagar.filter(c => c.status === 'pago').reduce((acc, c) => acc + (c.valorPago || 0), 0);
  const totalRecebido = contasReceber.filter(c => c.status === 'pago').reduce((acc, c) => acc + (c.valorPago || 0), 0);

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

// Hook para gerenciar logs
export function useLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();

  const carregarDados = useCallback(() => {
    const dbInstance = db();
    
    if (!user || !empresaId || !dbInstance) {
      if (user && !empresaId) {
        setLogs([]);
        setLoading(false);
      }
      return;
    }

    const q = query(
      collection(dbInstance, 'logs'),
      where('empresaId', '==', empresaId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataHora: doc.data().dataHora?.toDate(),
      }));
      setLogs(data.sort((a, b) => {
        if (!a.dataHora) return 1;
        if (!b.dataHora) return -1;
        return b.dataHora.getTime() - a.dataHora.getTime();
      }));
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar logs:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [empresaId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const unsubscribe = carregarDados();
    return () => {
      if (unsubscribe) unsubscribe();
    };
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
  const dbInstance = db();
  if (!dbInstance) throw new Error('Firebase não inicializado');
  
  await addDoc(collection(dbInstance, 'logs'), {
    ...dados,
    dataHora: Timestamp.now(),
  });
}

// Hook para gerenciar Caixa
export function useCaixa() {
  const [caixaAberto, setCaixaAberto] = useState<any | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();

  // Carregar caixa atual e movimentações
  const carregarDados = useCallback(() => {
    const dbInstance = db();
    
    if (!user || !empresaId || !dbInstance) {
      if (user && !empresaId) {
        setCaixaAberto(null);
        setMovimentacoes([]);
        setHistorico([]);
        setLoading(false);
      }
      return;
    }

    // Buscar caixa aberto
    const qCaixa = query(
      collection(dbInstance, 'caixas'),
      where('empresaId', '==', empresaId),
      where('status', '==', 'aberto')
    );

    const unsubCaixa = onSnapshot(qCaixa, (snapshot) => {
      if (!snapshot.empty) {
        const caixa = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
          abertoEm: snapshot.docs[0].data().abertoEm?.toDate(),
          fechadoEm: snapshot.docs[0].data().fechadoEm?.toDate(),
        };
        setCaixaAberto(caixa);

        // Carregar movimentações deste caixa
        const qMov = query(
          collection(dbInstance, 'movimentacoes_caixa'),
          where('caixaId', '==', caixa.id)
        );

        const unsubMov = onSnapshot(qMov, (movSnapshot) => {
          const movs = movSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            criadoEm: doc.data().criadoEm?.toDate(),
          }));
          setMovimentacoes(movs.sort((a, b) => {
            if (!a.criadoEm) return 1;
            if (!b.criadoEm) return -1;
            return b.criadoEm.getTime() - a.criadoEm.getTime();
          }));
          setLoading(false);
        });

        return unsubMov;
      } else {
        setCaixaAberto(null);
        setMovimentacoes([]);
        setLoading(false);
      }
    }, (error) => {
      console.error('Erro ao carregar caixa:', error);
      setLoading(false);
    });

    // Carregar histórico de caixas (últimos 30 dias)
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    
    const qHistorico = query(
      collection(dbInstance, 'caixas'),
      where('empresaId', '==', empresaId),
      where('status', '==', 'fechado')
    );

    const unsubHistorico = onSnapshot(qHistorico, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        abertoEm: doc.data().abertoEm?.toDate(),
        fechadoEm: doc.data().fechadoEm?.toDate(),
      }));
      setHistorico(data.sort((a, b) => {
        if (!a.fechadoEm) return 1;
        if (!b.fechadoEm) return -1;
        return b.fechadoEm.getTime() - a.fechadoEm.getTime();
      }).slice(0, 30));
    });

    return () => {
      unsubCaixa();
      unsubHistorico();
    };
  }, [empresaId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const unsubscribe = carregarDados();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [carregarDados]);

  // Abrir caixa
  const abrirCaixa = async (valorInicial: number, observacao?: string) => {
    const dbInstance = db();
    if (!empresaId || !user) throw new Error('Usuário não autenticado');
    if (!dbInstance) throw new Error('Firebase não inicializado');
    
    if (caixaAberto) {
      throw new Error('Já existe um caixa aberto');
    }

    const caixa = {
      empresaId,
      valorInicial,
      valorAtual: valorInicial,
      totalEntradas: 0,
      totalSaidas: 0,
      totalVendas: 0,
      status: 'aberto',
      abertoPor: user.id,
      abertoPorNome: user.nome,
      abertoEm: Timestamp.now(),
      observacaoAbertura: observacao || '',
    };
    
    const docRef = await addDoc(collection(dbInstance, 'caixas'), caixa);
    
    // Registrar movimentação inicial
    await addDoc(collection(dbInstance, 'movimentacoes_caixa'), {
      caixaId: docRef.id,
      empresaId,
      tipo: 'abertura',
      valor: valorInicial,
      descricao: 'Abertura de caixa',
      formaPagamento: 'dinheiro',
      usuarioId: user.id,
      usuarioNome: user.nome,
      criadoEm: Timestamp.now(),
    });

    return docRef.id;
  };

  // Registrar venda no caixa
  const registrarVenda = async (valor: number, formaPagamento: string, vendaId: string) => {
    const dbInstance = db();
    if (!caixaAberto || !user) throw new Error('Nenhum caixa aberto');
    if (!dbInstance) throw new Error('Firebase não inicializado');

    // Adicionar movimentação
    await addDoc(collection(dbInstance, 'movimentacoes_caixa'), {
      caixaId: caixaAberto.id,
      empresaId,
      tipo: 'venda',
      valor,
      formaPagamento,
      vendaId,
      descricao: `Venda - ${formaPagamento}`,
      usuarioId: user.id,
      usuarioNome: user.nome,
      criadoEm: Timestamp.now(),
    });

    // Atualizar totais do caixa
    await updateDoc(doc(dbInstance, 'caixas', caixaAberto.id), {
      valorAtual: (caixaAberto.valorAtual || 0) + valor,
      totalVendas: (caixaAberto.totalVendas || 0) + valor,
      totalEntradas: (caixaAberto.totalEntradas || 0) + valor,
    });
  };

  // Adicionar reforço (entrada manual)
  const adicionarReforco = async (valor: number, descricao: string, formaPagamento: string) => {
    const dbInstance = db();
    if (!caixaAberto || !user) throw new Error('Nenhum caixa aberto');
    if (!dbInstance) throw new Error('Firebase não inicializado');

    await addDoc(collection(dbInstance, 'movimentacoes_caixa'), {
      caixaId: caixaAberto.id,
      empresaId,
      tipo: 'reforco',
      valor,
      formaPagamento,
      descricao: `Reforço: ${descricao}`,
      usuarioId: user.id,
      usuarioNome: user.nome,
      criadoEm: Timestamp.now(),
    });

    await updateDoc(doc(dbInstance, 'caixas', caixaAberto.id), {
      valorAtual: (caixaAberto.valorAtual || 0) + valor,
      totalEntradas: (caixaAberto.totalEntradas || 0) + valor,
    });
  };

  // Adicionar sangria (retirada)
  const adicionarSangria = async (valor: number, descricao: string) => {
    const dbInstance = db();
    if (!caixaAberto || !user) throw new Error('Nenhum caixa aberto');
    if (!dbInstance) throw new Error('Firebase não inicializado');

    if (valor > (caixaAberto.valorAtual || 0)) {
      throw new Error('Valor maior que o disponível no caixa');
    }

    await addDoc(collection(dbInstance, 'movimentacoes_caixa'), {
      caixaId: caixaAberto.id,
      empresaId,
      tipo: 'sangria',
      valor,
      formaPagamento: 'dinheiro',
      descricao: `Sangria: ${descricao}`,
      usuarioId: user.id,
      usuarioNome: user.nome,
      criadoEm: Timestamp.now(),
    });

    await updateDoc(doc(dbInstance, 'caixas', caixaAberto.id), {
      valorAtual: (caixaAberto.valorAtual || 0) - valor,
      totalSaidas: (caixaAberto.totalSaidas || 0) + valor,
    });
  };

  // Fechar caixa
  const fecharCaixa = async (valorFinal: number, observacao?: string) => {
    const dbInstance = db();
    if (!caixaAberto || !user) throw new Error('Nenhum caixa aberto');
    if (!dbInstance) throw new Error('Firebase não inicializado');

    const quebra = valorFinal - (caixaAberto.valorAtual || 0);

    // Registrar fechamento
    await addDoc(collection(dbInstance, 'movimentacoes_caixa'), {
      caixaId: caixaAberto.id,
      empresaId,
      tipo: 'fechamento',
      valor: valorFinal,
      formaPagamento: 'dinheiro',
      descricao: `Fechamento de caixa${observacao ? ` - ${observacao}` : ''}`,
      quebra,
      usuarioId: user.id,
      usuarioNome: user.nome,
      criadoEm: Timestamp.now(),
    });

    // Atualizar caixa
    await updateDoc(doc(dbInstance, 'caixas', caixaAberto.id), {
      status: 'fechado',
      valorFinal,
      quebra,
      fechadoPor: user.id,
      fechadoPorNome: user.nome,
      fechadoEm: Timestamp.now(),
      observacaoFechamento: observacao || '',
    });
  };

  // Resumo do caixa
  const resumo = {
    valorInicial: caixaAberto?.valorInicial || 0,
    valorAtual: caixaAberto?.valorAtual || 0,
    totalEntradas: caixaAberto?.totalEntradas || 0,
    totalSaidas: caixaAberto?.totalSaidas || 0,
    totalVendas: caixaAberto?.totalVendas || 0,
    vendasDinheiro: movimentacoes.filter(m => m.tipo === 'venda' && m.formaPagamento === 'dinheiro').reduce((acc, m) => acc + (m.valor || 0), 0),
    vendasCredito: movimentacoes.filter(m => m.tipo === 'venda' && m.formaPagamento === 'credito').reduce((acc, m) => acc + (m.valor || 0), 0),
    vendasDebito: movimentacoes.filter(m => m.tipo === 'venda' && m.formaPagamento === 'debito').reduce((acc, m) => acc + (m.valor || 0), 0),
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

// Hook para gerenciar Comandas
export function useComandas() {
  const [comandas, setComandas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { empresaId, user } = useAuth();

  const carregarDados = useCallback(() => {
    const dbInstance = db();
    
    if (!user || !empresaId || !dbInstance) {
      if (user && !empresaId) {
        setComandas([]);
        setLoading(false);
      }
      return;
    }

    const q = query(
      collection(dbInstance, 'comandas'),
      where('empresaId', '==', empresaId),
      where('status', '==', 'aberta')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm?.toDate(),
        atualizadoEm: doc.data().atualizadoEm?.toDate(),
      }));
      setComandas(data.sort((a, b) => {
        if (!a.criadoEm) return 1;
        if (!b.criadoEm) return -1;
        return a.criadoEm.getTime() - b.criadoEm.getTime();
      }));
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar comandas:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [empresaId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const unsubscribe = carregarDados();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [carregarDados]);

  // Criar nova comanda
  const criarComanda = async (nomeCliente: string, observacao?: string) => {
    const dbInstance = db();
    if (!empresaId || !user) throw new Error('Usuário não autenticado');
    if (!dbInstance) throw new Error('Firebase não inicializado');

    // Gerar número da comanda
    const numero = (comandas.length > 0 ? Math.max(...comandas.map(c => c.numero || 0)) : 0) + 1;

    const comanda = {
      empresaId,
      numero,
      nomeCliente: nomeCliente.toUpperCase(),
      observacao: observacao || '',
      status: 'aberta',
      total: 0,
      itens: [],
      criadoPor: user.id,
      criadoPorNome: user.nome,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(dbInstance, 'comandas'), comanda);
    return { id: docRef.id, numero };
  };

  // Adicionar item à comanda
  const adicionarItem = async (comandaId: string, item: {
    produtoId: string;
    nome: string;
    preco: number;
    quantidade: number;
    observacao?: string;
  }) => {
    const dbInstance = db();
    if (!user) throw new Error('Usuário não autenticado');
    if (!dbInstance) throw new Error('Firebase não inicializado');

    const comandaRef = doc(dbInstance, 'comandas', comandaId);
    const comandaDoc = await (await import('firebase/firestore')).getDoc(comandaRef);
    
    if (!comandaDoc.exists()) {
      throw new Error('Comanda não encontrada');
    }

    const comandaData = comandaDoc.data();
    const itens = comandaData.itens || [];
    
    const novoItem = {
      id: Date.now().toString(),
      ...item,
      adicionadoPor: user.id,
      adicionadoPorNome: user.nome,
      adicionadoEm: Timestamp.now(),
    };
    
    itens.push(novoItem);
    
    const novoTotal = itens.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);

    await updateDoc(comandaRef, {
      itens,
      total: novoTotal,
      atualizadoEm: Timestamp.now(),
    });

    return novoItem;
  };

  // Remover item da comanda
  const removerItem = async (comandaId: string, itemId: string) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');

    const comandaRef = doc(dbInstance, 'comandas', comandaId);
    const comandaDoc = await (await import('firebase/firestore')).getDoc(comandaRef);
    
    if (!comandaDoc.exists()) {
      throw new Error('Comanda não encontrada');
    }

    const comandaData = comandaDoc.data();
    const itens = (comandaData.itens || []).filter((i: any) => i.id !== itemId);
    const novoTotal = itens.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);

    await updateDoc(comandaRef, {
      itens,
      total: novoTotal,
      atualizadoEm: Timestamp.now(),
    });
  };

  // Alterar quantidade de item
  const alterarQuantidadeItem = async (comandaId: string, itemId: string, novaQuantidade: number) => {
    const dbInstance = db();
    if (!dbInstance) throw new Error('Firebase não inicializado');

    const comandaRef = doc(dbInstance, 'comandas', comandaId);
    const comandaDoc = await (await import('firebase/firestore')).getDoc(comandaRef);
    
    if (!comandaDoc.exists()) {
      throw new Error('Comanda não encontrada');
    }

    const comandaData = comandaDoc.data();
    let itens = comandaData.itens || [];
    
    if (novaQuantidade <= 0) {
      itens = itens.filter((i: any) => i.id !== itemId);
    } else {
      itens = itens.map((i: any) => 
        i.id === itemId ? { ...i, quantidade: novaQuantidade } : i
      );
    }
    
    const novoTotal = itens.reduce((acc: number, i: any) => acc + (i.preco * i.quantidade), 0);

    await updateDoc(comandaRef, {
      itens,
      total: novoTotal,
      atualizadoEm: Timestamp.now(),
    });
  };

  // Fechar comanda
  const fecharComanda = async (comandaId: string, formaPagamento: string) => {
    const dbInstance = db();
    if (!user || !empresaId) throw new Error('Usuário não autenticado');
    if (!dbInstance) throw new Error('Firebase não inicializado');

    const comandaRef = doc(dbInstance, 'comandas', comandaId);
    const comandaDoc = await (await import('firebase/firestore')).getDoc(comandaRef);
    
    if (!comandaDoc.exists()) {
      throw new Error('Comanda não encontrada');
    }

    const comandaData = comandaDoc.data();

    // Criar venda
    const venda = {
      empresaId,
      comandaId,
      comandaNumero: comandaData.numero,
      nomeCliente: comandaData.nomeCliente,
      itens: comandaData.itens,
      total: comandaData.total,
      formaPagamento,
      tipoVenda: 'comanda',
      status: 'finalizada',
      criadoPor: user.id,
      criadoPorNome: user.nome,
      criadoEm: Timestamp.now(),
    };

    const vendaRef = await addDoc(collection(dbInstance, 'vendas'), venda);

    // Criar itens de venda para relatórios
    for (const item of comandaData.itens) {
      await addDoc(collection(dbInstance, 'itens_venda'), {
        empresaId,
        vendaId: vendaRef.id,
        produtoId: item.produtoId,
        nome: item.nome,
        preco: item.preco,
        quantidade: item.quantidade,
        total: item.preco * item.quantidade,
        tipoVenda: 'comanda',
        criadoEm: Timestamp.now(),
      });
    }

    // Criar pagamento
    await addDoc(collection(dbInstance, 'pagamentos'), {
      empresaId,
      vendaId: vendaRef.id,
      formaPagamento,
      valor: comandaData.total,
      criadoEm: Timestamp.now(),
    });

    // Atualizar comanda
    await updateDoc(comandaRef, {
      status: 'fechada',
      vendaId: vendaRef.id,
      formaPagamento,
      fechadoPor: user.id,
      fechadoPorNome: user.nome,
      fechadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    });

    // Registrar no caixa (se houver caixa aberto)
    const qCaixa = query(
      collection(dbInstance, 'caixas'),
      where('empresaId', '==', empresaId),
      where('status', '==', 'aberto')
    );
    
    const caixaSnapshot = await (await import('firebase/firestore')).getDocs(qCaixa);
    
    if (!caixaSnapshot.empty) {
      const caixaId = caixaSnapshot.docs[0].id;
      
      await addDoc(collection(dbInstance, 'movimentacoes_caixa'), {
        caixaId,
        empresaId,
        tipo: 'venda',
        valor: comandaData.total,
        formaPagamento,
        vendaId: vendaRef.id,
        descricao: `Comanda #${comandaData.numero} - ${comandaData.nomeCliente}`,
        usuarioId: user.id,
        usuarioNome: user.nome,
        criadoEm: Timestamp.now(),
      });

      const caixaAtual = caixaSnapshot.docs[0].data();
      await updateDoc(doc(dbInstance, 'caixas', caixaId), {
        valorAtual: (caixaAtual.valorAtual || 0) + comandaData.total,
        totalVendas: (caixaAtual.totalVendas || 0) + comandaData.total,
        totalEntradas: (caixaAtual.totalEntradas || 0) + comandaData.total,
      });
    }

    return vendaRef.id;
  };

  // Cancelar comanda
  const cancelarComanda = async (comandaId: string) => {
    const dbInstance = db();
    if (!user) throw new Error('Usuário não autenticado');
    if (!dbInstance) throw new Error('Firebase não inicializado');

    await updateDoc(doc(dbInstance, 'comandas', comandaId), {
      status: 'cancelada',
      canceladoPor: user.id,
      canceladoPorNome: user.nome,
      canceladoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
    });
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

// Interface para configurações do cupom
export interface ConfiguracoesCupom {
  larguraPapel: number; // em milímetros
  tamanhoFonte: number; // em pontos (pt)
  intensidadeImpressao: 'normal' | 'escura' | 'muito-escura';
  margemSuperior: number; // em milímetros
  margemInferior: number; // em milímetros
  espacamentoLinhas: number; // em pontos
  nomeEmpresa: string;
  cnpjEmpresa: string;
  enderecoEmpresa: string;
  telefoneEmpresa: string;
  mensagemRodape: string;
}

// Configurações padrão do cupom
export const configuracoesCupomPadrao: ConfiguracoesCupom = {
  larguraPapel: 80,
  tamanhoFonte: 12,
  intensidadeImpressao: 'escura',
  margemSuperior: 2,
  margemInferior: 2,
  espacamentoLinhas: 1.4,
  nomeEmpresa: '',
  cnpjEmpresa: '',
  enderecoEmpresa: '',
  telefoneEmpresa: '',
  mensagemRodape: 'Obrigado pela preferência!\nVolte sempre!',
};

// Hook para gerenciar configurações do cupom fiscal
export function useConfiguracoesCupom() {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesCupom>(configuracoesCupomPadrao);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { empresaId, user } = useAuth();

  // Carregar configurações
  const carregarConfiguracoes = useCallback(async () => {
    const dbInstance = db();
    
    if (!user || !empresaId || !dbInstance) {
      setLoading(false);
      return;
    }

    try {
      // Buscar documento de configurações da empresa usando ID direto
      const configRef = doc(dbInstance, 'configuracoes_cupom', empresaId);
      const configDoc = await getDoc(configRef);

      if (configDoc.exists()) {
        const data = configDoc.data();
        setConfiguracoes({
          ...configuracoesCupomPadrao,
          ...data,
        } as ConfiguracoesCupom);
      } else {
        // Se não existir, usar padrão
        setConfiguracoes(configuracoesCupomPadrao);
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

  // Salvar configurações
  const salvarConfiguracoes = async (novasConfiguracoes: ConfiguracoesCupom) => {
    const dbInstance = db();
    if (!empresaId || !dbInstance) throw new Error('Empresa não definida');

    setSaving(true);
    try {
      const configCompletas = { 
        ...configuracoes, 
        ...novasConfiguracoes, 
        empresaId,
        atualizadoEm: Timestamp.now(),
      };
      
      // Usar setDoc com merge para criar ou atualizar o documento
      const configRef = doc(dbInstance, 'configuracoes_cupom', empresaId);
      await setDoc(configRef, configCompletas, { merge: true });

      setConfiguracoes(novasConfiguracoes);
      return true;
    } catch (error: unknown) {
      console.error('Erro ao salvar configurações do cupom:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Não foi possível salvar as configurações: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return {
    configuracoes,
    loading,
    saving,
    salvarConfiguracoes,
    recarregar: carregarConfiguracoes,
  };
}
