'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, deleteDoc, doc } from '@supabase/supabase-js';
import { Database, CheckCircle, XCircle, Loader2, AlertTriangle, Building2, Trash2 } from 'lucide-react';

interface SeedStatus {
  step: string;
  status: 'pending' | 'running' | 'done' | 'error';
  count?: number;
  message?: string;
}

interface Empresa {
  id: string;
  nome: string;
  status?: string;
}

const CORES_CATEGORIAS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'
];

const NOMES_FUNCIONARIOS = [
  'Maria Silva', 'Ana Santos', 'Carlos Oliveira', 'Juliana Costa', 'Pedro Souza',
  'Fernanda Lima', 'Roberto Almeida', 'Camila Rodrigues'
];

const CARGOS = ['Atendente', 'Caixa', 'Gerente', 'Barista', 'Cozinheiro', 'Garçom'];

// Produtos para restaurante/café
const PRODUTOS_POR_CATEGORIA: Record<string, {nome: string, preco: number, custo: number}[]> = {
  'Bebidas Quentes': [
    { nome: 'Café Expresso', preco: 5.00, custo: 1.20 },
    { nome: 'Café Cappuccino', preco: 9.00, custo: 2.50 },
    { nome: 'Café Latte', preco: 10.00, custo: 2.80 },
    { nome: 'Mocha', preco: 12.00, custo: 3.50 },
    { nome: 'Chocolate Quente', preco: 8.00, custo: 2.20 },
    { nome: 'Chá Mate', preco: 4.50, custo: 1.00 },
    { nome: 'Chá de Camomila', preco: 5.00, custo: 1.20 },
    { nome: 'Café Americano', preco: 7.00, custo: 1.80 },
  ],
  'Bebidas Geladas': [
    { nome: 'Café Gelado', preco: 10.00, custo: 2.80 },
    { nome: 'Suco Natural Laranja', preco: 8.00, custo: 2.50 },
    { nome: 'Suco Natural Limão', preco: 7.00, custo: 2.00 },
    { nome: 'Milkshake Chocolate', preco: 14.00, custo: 4.50 },
    { nome: 'Milkshake Morango', preco: 14.00, custo: 4.50 },
    { nome: 'Refrigerante Lata', preco: 6.00, custo: 3.00 },
    { nome: 'Água Mineral', preco: 4.00, custo: 1.50 },
    { nome: 'Smoothie Frutas', preco: 15.00, custo: 5.00 },
  ],
  'Lanches': [
    { nome: 'Pão de Queijo (unid)', preco: 4.00, custo: 1.20 },
    { nome: 'Croissant Manteiga', preco: 7.00, custo: 2.50 },
    { nome: 'Croissant Presunto Queijo', preco: 10.00, custo: 3.50 },
    { nome: 'Sanduíche Natural', preco: 15.00, custo: 5.00 },
    { nome: 'Sanduíche Club', preco: 18.00, custo: 6.50 },
    { nome: 'X-Burguer', preco: 16.00, custo: 5.50 },
    { nome: 'X-Bacon', preco: 19.00, custo: 7.00 },
    { nome: 'Hot Dog', preco: 12.00, custo: 4.00 },
  ],
  'Doces': [
    { nome: 'Bolo de Chocolate (fatia)', preco: 10.00, custo: 3.50 },
    { nome: 'Bolo de Cenoura (fatia)', preco: 9.00, custo: 3.00 },
    { nome: 'Brigadeiro (unid)', preco: 3.50, custo: 1.00 },
    { nome: 'Beijinho (unid)', preco: 3.50, custo: 1.00 },
    { nome: 'Brownie', preco: 8.00, custo: 2.80 },
    { nome: 'Cheesecake (fatia)', preco: 12.00, custo: 4.50 },
    { nome: 'Torta de Maçã (fatia)', preco: 10.00, custo: 3.50 },
    { nome: 'Mousse de Maracujá', preco: 8.00, custo: 2.50 },
  ],
  'Salgados': [
    { nome: 'Coxinha', preco: 6.00, custo: 2.00 },
    { nome: 'Pastel de Carne', preco: 7.00, custo: 2.50 },
    { nome: 'Pastel de Queijo', preco: 6.50, custo: 2.20 },
    { nome: 'Empada de Frango', preco: 6.00, custo: 2.00 },
    { nome: 'Enroladinho de Salsicha', preco: 5.50, custo: 1.80 },
    { nome: 'Risole de Queijo', preco: 5.00, custo: 1.50 },
    { nome: 'Esfirra de Carne', preco: 6.50, custo: 2.20 },
    { nome: 'Quibe', preco: 6.00, custo: 2.00 },
  ],
  'Pratos': [
    { nome: 'Prato Executivo Frango', preco: 28.00, custo: 10.00 },
    { nome: 'Prato Executivo Carne', preco: 32.00, custo: 12.00 },
    { nome: 'Prato Executivo Peixe', preco: 35.00, custo: 13.00 },
    { nome: 'Parmegiana de Frango', preco: 35.00, custo: 12.00 },
    { nome: 'Parmegiana de Carne', preco: 38.00, custo: 14.00 },
    { nome: 'Filé de Tilápia', preco: 42.00, custo: 16.00 },
    { nome: 'Feijoada (individual)', preco: 38.00, custo: 14.00 },
    { nome: 'Macarrão à Bolonhesa', preco: 25.00, custo: 8.00 },
  ],
  'Porções': [
    { nome: 'Batata Frita', preco: 18.00, custo: 6.00 },
    { nome: 'Onion Rings', preco: 22.00, custo: 8.00 },
    { nome: 'Frango a Passarinho', preco: 32.00, custo: 12.00 },
    { nome: 'Fritas com Queijo e Bacon', preco: 28.00, custo: 10.00 },
    { nome: 'Calabresa Acebolada', preco: 25.00, custo: 9.00 },
    { nome: 'Iscas de Tilápia', preco: 35.00, custo: 14.00 },
  ],
  'Combos': [
    { nome: 'Combo Café + Pão de Queijo', preco: 8.00, custo: 2.50 },
    { nome: 'Combo Cappuccino + Croissant', preco: 14.00, custo: 5.00 },
    { nome: 'Combo X-Burguer + Refrigerante', preco: 20.00, custo: 8.00 },
    { nome: 'Combo X-Bacon + Batata + Refri', preco: 35.00, custo: 13.00 },
    { nome: 'Combo Família (4 lanches + 2 batatas)', preco: 75.00, custo: 30.00 },
  ],
};

const FORMAS_PAGAMENTO = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'];
const TIPOS_VENDA = ['balcao', 'mesa', 'delivery'];

const FORNECEDORES = [
  'Distribuidora Alimentos SA', 'Café do Brasil Ltda', 'Frios & Cia', 
  'Hortifruti Central', 'Carnes Premium', 'Bebidas Express'
];

const CATEGORIAS_CONTAS_PAGAR = ['fornecedores', 'aluguel', 'energia', 'água', 'impostos', 'salários', 'manutenção'];
const CATEGORIAS_CONTAS_RECEBER = ['clientes', 'eventos', 'delivery parceiros'];

// Coleções que serão limpas
const COLECOES_PARA_LIMPAR = [
  'categorias',
  'funcionarios',
  'mesas',
  'produtos',
  'vendas',
  'itens_venda',
  'pagamentos',
  'estoque_movimentos',
  'contas',
  'caixas',
  'movimentacoes_caixa',
  'logs'
];

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [statusList, setStatusList] = useState<SeedStatus[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const updateStatus = (step: string, status: SeedStatus['status'], count?: number, message?: string) => {
    setStatusList(prev => {
      const existing = prev.findIndex(s => s.step === step);
      const newItem = { step, status, count, message };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newItem;
        return updated;
      }
      return [...prev, newItem];
    });
  };

  useEffect(() => {
    const buscarEmpresas = async () => {
      try {
        const dbInstance = db();
        if (!dbInstance) {
          addLog('Firebase não inicializado. Verifique as variáveis de ambiente.');
          setLoadingEmpresas(false);
          return;
        }

        const empresasQuery = query(collection(dbInstance, 'empresas'));
        const snapshot = await getDocs(empresasQuery);
        
        const empresasLista: Empresa[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          empresasLista.push({
            id: doc.id,
            nome: data.nome || 'Sem nome',
            status: data.status
          });
        });

        empresasLista.sort((a, b) => a.nome.localeCompare(b.nome));
        
        setEmpresas(empresasLista);
        
        if (empresasLista.length === 0) {
          addLog('Nenhuma empresa cadastrada. Cadastre uma empresa primeiro.');
        } else {
          addLog(`${empresasLista.length} empresa(s) encontrada(s). Selecione uma para continuar.`);
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
        addLog('Erro ao buscar empresas. Verifique o console.');
      } finally {
        setLoadingEmpresas(false);
      }
    };

    buscarEmpresas();
  }, []);

  const handleEmpresaChange = (value: string) => {
    const empresa = empresas.find(e => e.id === value);
    if (empresa) {
      setEmpresaId(empresa.id);
      setEmpresaNome(empresa.nome);
      addLog(`Empresa selecionada: ${empresa.nome}`);
    }
  };

  const gerarPIN = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  // Gera datas aleatórias entre Janeiro e Fevereiro de 2026
  // Janeiro = mês 0, Fevereiro = mês 1 (JavaScript usa indexação baseada em 0)
  const gerarDataAleatoria = (meses: number = 2) => {
    // Definir o período: Janeiro e Fevereiro de 2026
    const inicio = new Date(2026, 0, 1); // 1 de Janeiro de 2026
    const fim = new Date(2026, meses, 0); // Último dia de Fevereiro de 2026 (28 de Fevereiro)
    
    // Calcular a diferença em milissegundos
    const diferencaMs = fim.getTime() - inicio.getTime();
    const randomMs = Math.floor(Math.random() * diferencaMs);
    
    const data = new Date(inicio.getTime() + randomMs);
    data.setHours(Math.floor(Math.random() * 14) + 7, Math.floor(Math.random() * 60), 0, 0);
    return data;
  };

  // Função para limpar coleção por empresaId
  const limparColecao = async (dbInstance: FirebaseFirestore, nomeColecao: string, empresaId: string): Promise<number> => {
    const q = query(collection(dbInstance, nomeColecao), where('empresaId', '==', empresaId));
    const snapshot = await getDocs(q);
    
    let deletados = 0;
    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(doc(dbInstance, nomeColecao, docSnapshot.id));
      deletados++;
    }
    
    return deletados;
  };

  const executarSeed = async () => {
    if (!empresaId) {
      addLog('Erro: Selecione uma empresa!');
      return;
    }

    setLoading(true);
    setProgress(0);
    setLogs([]);
    setStatusList([]);

    const dbInstance = db();
    if (!dbInstance) {
      addLog('Firebase não inicializado');
      setLoading(false);
      return;
    }

    let totalProgress = 0;
    const setProgressValue = (value: number) => {
      totalProgress = value;
      setProgress(value);
    };

    try {
      // ==========================================
      // 0. LIMPAR DADOS EXISTENTES
      // ==========================================
      updateStatus('Limpando dados antigos', 'running');
      addLog('🧹 Limpando dados existentes da empresa...');

      let totalDeletados = 0;
      for (const colecao of COLECOES_PARA_LIMPAR) {
        try {
          const deletados = await limparColecao(dbInstance as unknown as FirebaseFirestore, colecao, empresaId);
          if (deletados > 0) {
            addLog(`  - ${colecao}: ${deletados} registro(s) removido(s)`);
          }
          totalDeletados += deletados;
        } catch (err) {
          addLog(`  - ${colecao}: erro ao limpar (pode estar vazia)`);
        }
      }

      updateStatus('Limpando dados antigos', 'done', totalDeletados);
      setProgressValue(5);
      addLog(`✅ ${totalDeletados} registros antigos removidos.`);
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog('📦 Iniciando criação de novos dados...');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // ==========================================
      // 1. CRIAR CATEGORIAS
      // ==========================================
      updateStatus('Categorias', 'running');
      addLog('Criando categorias...');
      
      const categoriasMap: Record<string, string> = {};
      let corIndex = 0;
      
      for (const [nomeCategoria, produtos] of Object.entries(PRODUTOS_POR_CATEGORIA)) {
        const docRef = await addDoc(collection(dbInstance, 'categorias'), {
          empresaId,
          nome: nomeCategoria,
          cor: CORES_CATEGORIAS[corIndex % CORES_CATEGORIAS.length],
          ordem: corIndex + 1,
          ativo: true,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now()
        });
        categoriasMap[nomeCategoria] = docRef.id;
        corIndex++;
      }
      
      updateStatus('Categorias', 'done', Object.keys(categoriasMap).length);
      setProgressValue(10);
      addLog(`${Object.keys(categoriasMap).length} categorias criadas.`);

      // ==========================================
      // 2. CRIAR FUNCIONÁRIOS
      // ==========================================
      updateStatus('Funcionários', 'running');
      addLog('Criando funcionários...');

      const funcionariosIds: string[] = [];
      
      for (let i = 0; i < NOMES_FUNCIONARIOS.length; i++) {
        const docRef = await addDoc(collection(dbInstance, 'funcionarios'), {
          empresaId,
          nome: NOMES_FUNCIONARIOS[i],
          cargo: CARGOS[i % CARGOS.length],
          email: `${NOMES_FUNCIONARIOS[i].toLowerCase().replace(' ', '.')}@email.com`,
          telefone: `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          pin: gerarPIN(),
          permissoes: {
            pdv: true,
            estoque: i < 3,
            financeiro: i < 2,
            relatorios: i < 2,
            cancelarVenda: i < 3,
            darDesconto: i < 3
          },
          ativo: true,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now()
        });
        funcionariosIds.push(docRef.id);
      }

      updateStatus('Funcionários', 'done', funcionariosIds.length);
      setProgressValue(15);
      addLog(`${funcionariosIds.length} funcionários criados.`);

      // ==========================================
      // 3. CRIAR MESAS
      // ==========================================
      updateStatus('Mesas', 'running');
      addLog('Criando mesas...');

      const mesasIds: string[] = [];
      for (let i = 1; i <= 15; i++) {
        const docRef = await addDoc(collection(dbInstance, 'mesas'), {
          empresaId,
          numero: i,
          capacidade: i <= 5 ? 2 : i <= 10 ? 4 : 6,
          status: 'livre',
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now()
        });
        mesasIds.push(docRef.id);
      }

      updateStatus('Mesas', 'done', mesasIds.length);
      setProgressValue(20);
      addLog(`${mesasIds.length} mesas criadas.`);

      // ==========================================
      // 4. CRIAR PRODUTOS
      // ==========================================
      updateStatus('Produtos', 'running');
      addLog('Criando produtos...');

      const produtosIds: string[] = [];
      const produtosData: {id: string, nome: string, preco: number, custo: number}[] = [];

      for (const [nomeCategoria, produtos] of Object.entries(PRODUTOS_POR_CATEGORIA)) {
        const categoriaId = categoriasMap[nomeCategoria];
        
        for (const produto of produtos) {
          const docRef = await addDoc(collection(dbInstance, 'produtos'), {
            empresaId,
            categoriaId,
            nome: produto.nome,
            descricao: `${produto.nome} - produto de qualidade`,
            codigo: `PROD${String(produtosIds.length + 1).padStart(4, '0')}`,
            preco: produto.preco,
            custo: produto.custo,
            unidade: 'un',
            estoqueAtual: Math.floor(50 + Math.random() * 150),
            estoqueMinimo: 10,
            destaque: Math.random() > 0.7,
            ativo: true,
            criadoEm: Timestamp.now(),
            atualizadoEm: Timestamp.now()
          });
          produtosIds.push(docRef.id);
          produtosData.push({ id: docRef.id, nome: produto.nome, preco: produto.preco, custo: produto.custo });
        }
      }

      updateStatus('Produtos', 'done', produtosIds.length);
      setProgressValue(25);
      addLog(`${produtosIds.length} produtos criados.`);

      // ==========================================
      // 5. CRIAR VENDAS (220 vendas)
      // ==========================================
      updateStatus('Vendas', 'running');
      addLog('Criando vendas (isso pode levar alguns segundos)...');

      const vendasIds: string[] = [];
      const NUM_VENDAS = 220;

      for (let i = 0; i < NUM_VENDAS; i++) {
        const dataVenda = gerarDataAleatoria();
        const tipoVenda = TIPOS_VENDA[Math.floor(Math.random() * TIPOS_VENDA.length)];
        const funcionarioId = funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)];
        
        const numItens = Math.floor(Math.random() * 5) + 1;
        let subtotal = 0;
        const itensVenda: {produtoId: string, quantidade: number, precoUnitario: number}[] = [];

        for (let j = 0; j < numItens; j++) {
          const produtoIdx = Math.floor(Math.random() * produtosData.length);
          const produto = produtosData[produtoIdx];
          const quantidade = Math.floor(Math.random() * 3) + 1;
          itensVenda.push({
            produtoId: produto.id,
            quantidade,
            precoUnitario: produto.preco
          });
          subtotal += produto.preco * quantidade;
        }

        const desconto = Math.random() > 0.8 ? Math.floor(subtotal * (Math.random() * 0.1)) : 0;
        const taxaServico = tipoVenda === 'mesa' ? Math.floor(subtotal * 0.1) : 0;
        const total = subtotal - desconto + taxaServico;

        const mesaId = tipoVenda === 'mesa' && mesasIds.length > 0 
          ? mesasIds[Math.floor(Math.random() * mesasIds.length)] 
          : null;

        const vendaRef = await addDoc(collection(dbInstance, 'vendas'), {
          empresaId,
          mesaId,
          funcionarioId,
          tipo: tipoVenda,
          status: 'fechada',
          subtotal,
          desconto,
          taxaServico,
          total,
          observacao: Math.random() > 0.7 ? 'Sem observações' : '',
          criadoEm: Timestamp.fromDate(dataVenda),
          atualizadoEm: Timestamp.fromDate(dataVenda)
        });
        vendasIds.push(vendaRef.id);

        for (const item of itensVenda) {
          await addDoc(collection(dbInstance, 'itens_venda'), {
            vendaId: vendaRef.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            desconto: 0,
            criadoEm: Timestamp.fromDate(dataVenda)
          });
        }

        const formaPagamento = FORMAS_PAGAMENTO[Math.floor(Math.random() * FORMAS_PAGAMENTO.length)];
        const troco = formaPagamento === 'dinheiro' && Math.random() > 0.5 
          ? Math.floor((total + 10) - total) 
          : 0;

        await addDoc(collection(dbInstance, 'pagamentos'), {
          empresaId,
          vendaId: vendaRef.id,
          formaPagamento,
          valor: total,
          troco,
          criadoEm: Timestamp.fromDate(dataVenda)
        });

        if (i % 20 === 0) {
          setProgressValue(25 + Math.floor((i / NUM_VENDAS) * 50));
        }
      }

      updateStatus('Vendas', 'done', NUM_VENDAS);
      setProgressValue(75);
      addLog(`${NUM_VENDAS} vendas criadas com seus itens e pagamentos.`);

      // ==========================================
      // 6. CRIAR MOVIMENTOS DE ESTOQUE
      // ==========================================
      updateStatus('Movimentos de Estoque', 'running');
      addLog('Criando movimentos de estoque...');

      const NUM_MOVIMENTOS = 100;

      for (let i = 0; i < NUM_MOVIMENTOS; i++) {
        const produto = produtosData[Math.floor(Math.random() * produtosData.length)];
        const tipo = ['entrada', 'saida', 'ajuste'][Math.floor(Math.random() * 3)];
        const quantidade = tipo === 'entrada' 
          ? Math.floor(Math.random() * 50) + 10 
          : -(Math.floor(Math.random() * 20) + 1);

        await addDoc(collection(dbInstance, 'estoque_movimentos'), {
          empresaId,
          produtoId: produto.id,
          tipo,
          quantidade: tipo === 'ajuste' ? Math.floor(Math.random() * 30) - 15 : quantidade,
          precoUnitario: produto.custo,
          observacao: tipo === 'entrada' ? 'Reposição de estoque' : tipo === 'saida' ? 'Saída manual' : 'Ajuste de inventário',
          usuarioId: funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)],
          criadoEm: Timestamp.fromDate(gerarDataAleatoria())
        });
      }

      updateStatus('Movimentos de Estoque', 'done', NUM_MOVIMENTOS);
      setProgressValue(80);
      addLog(`${NUM_MOVIMENTOS} movimentos de estoque criados.`);

      // ==========================================
      // 7. CRIAR CONTAS A PAGAR/RECEBER
      // ==========================================
      updateStatus('Contas a Pagar/Receber', 'running');
      addLog('Criando contas a pagar e receber...');

      // Gerar datas de vencimento dentro de Janeiro/Fevereiro 2026
      const dataReferencia = new Date(2026, 1, 15); // 15 de Fevereiro de 2026 como referência
      
      for (let i = 0; i < 25; i++) {
        // Vencimento aleatório entre Janeiro e Fevereiro 2026
        const vencimento = gerarDataAleatoria();
        const status = Math.random() > 0.4 ? 'pago' : 'pendente';

        await addDoc(collection(dbInstance, 'contas'), {
          empresaId,
          tipo: 'pagar',
          descricao: `${CATEGORIAS_CONTAS_PAGAR[Math.floor(Math.random() * CATEGORIAS_CONTAS_PAGAR.length)]} - ${FORNECEDORES[Math.floor(Math.random() * FORNECEDORES.length)]}`,
          valor: Math.floor(Math.random() * 3000) + 200,
          vencimento: Timestamp.fromDate(vencimento),
          categoria: CATEGORIAS_CONTAS_PAGAR[Math.floor(Math.random() * CATEGORIAS_CONTAS_PAGAR.length)],
          fornecedor: FORNECEDORES[Math.floor(Math.random() * FORNECEDORES.length)],
          status,
          dataPagamento: status === 'pago' ? Timestamp.fromDate(new Date(vencimento.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)) : null,
          valorPago: status === 'pago' ? Math.floor(Math.random() * 3000) + 200 : null,
          formaPagamento: status === 'pago' ? 'pix' : null,
          criadoEm: Timestamp.fromDate(gerarDataAleatoria()),
          atualizadoEm: Timestamp.fromDate(gerarDataAleatoria())
        });
      }

      for (let i = 0; i < 15; i++) {
        // Vencimento aleatório entre Janeiro e Fevereiro 2026
        const vencimento = gerarDataAleatoria();
        const status = Math.random() > 0.4 ? 'pago' : 'pendente';

        await addDoc(collection(dbInstance, 'contas'), {
          empresaId,
          tipo: 'receber',
          descricao: `Recebimento - ${CATEGORIAS_CONTAS_RECEBER[Math.floor(Math.random() * CATEGORIAS_CONTAS_RECEBER.length)]}`,
          valor: Math.floor(Math.random() * 5000) + 500,
          vencimento: Timestamp.fromDate(vencimento),
          categoria: CATEGORIAS_CONTAS_RECEBER[Math.floor(Math.random() * CATEGORIAS_CONTAS_RECEBER.length)],
          status,
          dataPagamento: status === 'pago' ? Timestamp.fromDate(vencimento) : null,
          valorPago: status === 'pago' ? Math.floor(Math.random() * 5000) + 500 : null,
          formaPagamento: status === 'pago' ? 'pix' : null,
          criadoEm: Timestamp.fromDate(gerarDataAleatoria()),
          atualizadoEm: Timestamp.fromDate(gerarDataAleatoria())
        });
      }

      updateStatus('Contas a Pagar/Receber', 'done', 40);
      setProgressValue(85);
      addLog('40 contas (pagar/receber) criadas.');

      // ==========================================
      // 8. CRIAR CAIXAS
      // ==========================================
      updateStatus('Caixas', 'running');
      addLog('Criando sessões de caixa...');

      for (let i = 0; i < 20; i++) {
        const dataAbertura = gerarDataAleatoria();
        const dataFechamento = new Date(dataAbertura.getTime() + 8 * 60 * 60 * 1000);
        const valorInicial = Math.floor(Math.random() * 300) + 100;
        const totalVendas = Math.floor(Math.random() * 3000) + 500;
        const totalEntradas = totalVendas + Math.floor(Math.random() * 200);
        const totalSaidas = Math.floor(Math.random() * 100);
        const valorFinal = valorInicial + totalEntradas - totalSaidas;

        const caixaRef = await addDoc(collection(dbInstance, 'caixas'), {
          empresaId,
          valorInicial,
          valorAtual: valorFinal,
          totalEntradas,
          totalSaidas,
          totalVendas,
          status: i < 18 ? 'fechado' : 'aberto',
          abertoPor: funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)],
          abertoPorNome: NOMES_FUNCIONARIOS[Math.floor(Math.random() * NOMES_FUNCIONARIOS.length)],
          abertoEm: Timestamp.fromDate(dataAbertura),
          fechadoPor: i < 18 ? funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)] : null,
          fechadoPorNome: i < 18 ? NOMES_FUNCIONARIOS[Math.floor(Math.random() * NOMES_FUNCIONARIOS.length)] : null,
          fechadoEm: i < 18 ? Timestamp.fromDate(dataFechamento) : null,
          valorFinal: i < 18 ? valorFinal : null,
          quebra: i < 18 ? Math.floor(Math.random() * 20) - 10 : null,
          observacaoAbertura: '',
          observacaoFechamento: ''
        });

        await addDoc(collection(dbInstance, 'movimentacoes_caixa'), {
          caixaId: caixaRef.id,
          empresaId,
          tipo: 'abertura',
          valor: valorInicial,
          formaPagamento: 'dinheiro',
          descricao: 'Abertura de caixa',
          usuarioId: funcionariosIds[0],
          usuarioNome: NOMES_FUNCIONARIOS[0],
          criadoEm: Timestamp.fromDate(dataAbertura)
        });

        if (i < 18) {
          await addDoc(collection(dbInstance, 'movimentacoes_caixa'), {
            caixaId: caixaRef.id,
            empresaId,
            tipo: 'fechamento',
            valor: valorFinal,
            formaPagamento: 'dinheiro',
            descricao: 'Fechamento de caixa',
            quebra: Math.floor(Math.random() * 20) - 10,
            usuarioId: funcionariosIds[0],
            usuarioNome: NOMES_FUNCIONARIOS[0],
            criadoEm: Timestamp.fromDate(dataFechamento)
          });
        }
      }

      updateStatus('Caixas', 'done', 20);
      setProgressValue(95);
      addLog('20 sessões de caixa criadas com suas movimentações.');

      // ==========================================
      // 9. CRIAR LOGS
      // ==========================================
      updateStatus('Logs de Atividade', 'running');
      addLog('Criando logs de atividade...');

      const acoes = [
        'VENDA_FINALIZADA', 'PRODUTO_CADASTRADO', 'ESTOQUE_ATUALIZADO', 
        'CAIXA_ABERTO', 'CAIXA_FECHADO', 'FUNCIONARIO_CADASTRADO',
        'CONTA_PAGA', 'RELATORIO_GERADO', 'LOGIN_REALIZADO'
      ];

      for (let i = 0; i < 100; i++) {
        await addDoc(collection(dbInstance, 'logs'), {
          empresaId,
          usuarioId: funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)],
          usuarioNome: NOMES_FUNCIONARIOS[Math.floor(Math.random() * NOMES_FUNCIONARIOS.length)],
          acao: acoes[Math.floor(Math.random() * acoes.length)],
          detalhes: `Ação realizada automaticamente via seed`,
          tipo: ['venda', 'produto', 'estoque', 'funcionario', 'financeiro', 'outro'][Math.floor(Math.random() * 6)],
          dataHora: Timestamp.fromDate(gerarDataAleatoria())
        });
      }

      updateStatus('Logs de Atividade', 'done', 100);
      setProgressValue(100);
      addLog('100 logs de atividade criados.');

      // FINALIZADO
      addLog('═══════════════════════════════════════');
      addLog('✅ SEED CONCLUÍDO COM SUCESSO!');
      addLog('═══════════════════════════════════════');
      addLog(`Total de registros criados: ${8 + funcionariosIds.length + mesasIds.length + produtosIds.length + NUM_VENDAS * 3 + NUM_MOVIMENTOS + 40 + 20 * 2 + 100}`);

    } catch (error) {
      console.error('Erro no seed:', error);
      addLog(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: SeedStatus['status']) => {
    switch (status) {
      case 'done': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running': return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default: return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            População de Dados de Teste
          </CardTitle>
          <CardDescription>
            Gera dados fictícios para testes e desenvolvimento de relatórios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Aviso importante */}
          <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">⚠️ Atenção</p>
              <p className="text-sm text-amber-700">
                Este processo irá <strong>excluir todos os dados existentes</strong> da empresa selecionada e criar novos dados de teste.
              </p>
            </div>
          </div>

          {/* Seletor de empresa */}
          <div className="space-y-2">
            <Label htmlFor="empresa" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Selecione a Empresa
            </Label>
            {loadingEmpresas ? (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando empresas...</span>
              </div>
            ) : empresas.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Nenhuma empresa cadastrada</p>
                  <p className="text-sm text-red-600">Cadastre uma empresa antes de executar o seed.</p>
                </div>
              </div>
            ) : (
              <Select value={empresaId || ''} onValueChange={handleEmpresaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                      {empresa.status && empresa.status !== 'ativo' && (
                        <span className="ml-2 text-xs text-muted-foreground">({empresa.status})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Status da empresa selecionada */}
          {empresaId && (
            <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Empresa selecionada</p>
                <p className="text-sm text-green-600">{empresaNome} (ID: {empresaId.substring(0, 8)}...)</p>
              </div>
            </div>
          )}

          {/* Progresso */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Status de cada etapa */}
          {statusList.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Status das Etapas</h3>
              <div className="grid gap-2">
                {statusList.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <span className="font-medium">{item.step}</span>
                    </div>
                    {item.count !== undefined && (
                      <Badge variant="outline">{item.count} registros</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão de executar */}
          <Button
            onClick={executarSeed}
            disabled={loading || !empresaId || empresas.length === 0}
            className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Executando Seed...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-5 w-5" />
                Limpar e Popular Dados
              </>
            )}
          </Button>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Log de Execução</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                {logs.map((log, idx) => (
                  <div key={idx} className={log.includes('✅') ? 'text-green-400' : log.includes('❌') ? 'text-red-400' : log.includes('🧹') ? 'text-yellow-400' : log.includes('📦') ? 'text-blue-400' : ''}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo do que será criado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">O que será criado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">8</p>
              <p className="text-sm text-blue-700">Categorias</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">8</p>
              <p className="text-sm text-purple-700">Funcionários</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-600">15</p>
              <p className="text-sm text-orange-700">Mesas</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">~50</p>
              <p className="text-sm text-green-700">Produtos</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">220</p>
              <p className="text-sm text-red-700">Vendas</p>
            </div>
            <div className="p-3 bg-cyan-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-cyan-600">100</p>
              <p className="text-sm text-cyan-700">Mov. Estoque</p>
            </div>
            <div className="p-3 bg-pink-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-pink-600">40</p>
              <p className="text-sm text-pink-700">Contas</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-600">20</p>
              <p className="text-sm text-yellow-700">Sessões Caixa</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-600">100</p>
              <p className="text-sm text-gray-700">Logs</p>
            </div>
          </div>
          <p className="text-center mt-4 text-sm text-muted-foreground">
            <strong>Total: ~550+ lançamentos</strong> com dados de Janeiro e Fevereiro de 2026
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
