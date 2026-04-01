'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase';
import { Database, CheckCircle, XCircle, Loader2, AlertTriangle, Building2, Trash2, CalendarDays } from 'lucide-react';

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

// Tabelas que serão limpas
const TABELAS_PARA_LIMPAR = [
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
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Seed de Dados' }]}>
        <SeedContent />
      </MainLayout>
    </ProtectedRoute>
  );
}

function SeedContent() {
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [statusList, setStatusList] = useState<SeedStatus[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-04-30');

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
        const supabase = getSupabaseClient();
        
        const { data, error } = await supabase
          .from('empresas')
          .select('id, nome, status')
          .order('nome');
        
        if (error) throw error;
        
        const empresasLista: Empresa[] = (data || []).map(item => ({
          id: item.id,
          nome: item.nome || 'Sem nome',
          status: item.status
        }));

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

  // Gera datas aleatórias entre dataInicio e dataFim
  const gerarDataAleatoria = (dtInicio: Date, dtFim: Date) => {
    const inicio = new Date(dtInicio);
    inicio.setHours(7, 0, 0, 0);
    const fim = new Date(dtFim);
    fim.setHours(23, 59, 59, 999);
    
    if (fim.getTime() <= inicio.getTime()) {
      return inicio;
    }
    
    const diferencaMs = fim.getTime() - inicio.getTime();
    const randomMs = Math.floor(Math.random() * diferencaMs);
    
    const data = new Date(inicio.getTime() + randomMs);
    data.setHours(Math.floor(Math.random() * 14) + 7, Math.floor(Math.random() * 60), 0, 0);
    return data;
  };

  // Função para limpar tabela por empresa_id
  const limparTabela = async (supabase: ReturnType<typeof getSupabaseClient>, nomeTabela: string, empresaId: string): Promise<number> => {
    const { data, error } = await supabase
      .from(nomeTabela)
      .delete()
      .eq('empresa_id', empresaId)
      .select('id');
    
    if (error) {
      console.error(`Erro ao limpar ${nomeTabela}:`, error);
      return 0;
    }
    
    return data?.length || 0;
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

    const supabase = getSupabaseClient();

    let totalProgress = 0;
    const setProgressValue = (value: number) => {
      totalProgress = value;
      setProgress(value);
    };

    try {
      // Converter datas do período
      const periodoInicio = new Date(dataInicio + 'T00:00:00');
      const periodoFim = new Date(dataFim + 'T23:59:59');
      addLog(`📅 Período selecionado: ${dataInicio} a ${dataFim}`);

      // ==========================================
      // 0. LIMPAR DADOS EXISTENTES
      // ==========================================
      updateStatus('Limpando dados antigos', 'running');
      addLog('🧹 Limpando dados existentes da empresa...');

      let totalDeletados = 0;
      for (const tabela of TABELAS_PARA_LIMPAR) {
        try {
          const deletados = await limparTabela(supabase, tabela, empresaId);
          if (deletados > 0) {
            addLog(`  - ${tabela}: ${deletados} registro(s) removido(s)`);
          }
          totalDeletados += deletados;
        } catch (err) {
          addLog(`  - ${tabela}: erro ao limpar (pode estar vazia)`);
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
      const categoriasData: {empresa_id: string, nome: string, cor: string, ordem: number, ativo: boolean, criado_em: string, atualizado_em: string}[] = [];
      
      let corIndex = 0;
      for (const [nomeCategoria] of Object.entries(PRODUTOS_POR_CATEGORIA)) {
        categoriasData.push({
          empresa_id: empresaId,
          nome: nomeCategoria,
          cor: CORES_CATEGORIAS[corIndex % CORES_CATEGORIAS.length],
          ordem: corIndex + 1,
          ativo: true,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        });
        corIndex++;
      }

      const { data: categoriasInsert, error: catError } = await supabase
        .from('categorias')
        .insert(categoriasData)
        .select('id, nome');

      if (catError) throw catError;
      
      categoriasInsert?.forEach(cat => {
        categoriasMap[cat.nome] = cat.id;
      });
      
      updateStatus('Categorias', 'done', Object.keys(categoriasMap).length);
      setProgressValue(10);
      addLog(`${Object.keys(categoriasMap).length} categorias criadas.`);

      // ==========================================
      // 2. CRIAR FUNCIONÁRIOS
      // ==========================================
      updateStatus('Funcionários', 'running');
      addLog('Criando funcionários...');

      const funcionariosData = NOMES_FUNCIONARIOS.map((nome, i) => ({
        empresa_id: empresaId,
        nome: nome,
        cargo: CARGOS[i % CARGOS.length],
        email: `${nome.toLowerCase().replace(' ', '.')}@email.com`,
        telefone: `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        pin: gerarPIN(),
        perm_pdv: true,
        perm_estoque: i < 3,
        perm_financeiro: i < 2,
        perm_relatorios: i < 2,
        perm_cancelar_venda: i < 3,
        perm_dar_desconto: i < 3,
        ativo: true,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }));

      const { data: funcionariosInsert, error: funcError } = await supabase
        .from('funcionarios')
        .insert(funcionariosData)
        .select('id');

      if (funcError) throw funcError;
      
      const funcionariosIds = funcionariosInsert?.map(f => f.id) || [];

      updateStatus('Funcionários', 'done', funcionariosIds.length);
      setProgressValue(15);
      addLog(`${funcionariosIds.length} funcionários criados.`);

      // ==========================================
      // 3. CRIAR MESAS
      // ==========================================
      updateStatus('Mesas', 'running');
      addLog('Criando mesas...');

      const mesasData = Array.from({ length: 15 }, (_, i) => ({
        empresa_id: empresaId,
        numero: i + 1,
        capacidade: i < 5 ? 2 : i < 10 ? 4 : 6,
        status: 'livre',
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }));

      const { data: mesasInsert, error: mesasError } = await supabase
        .from('mesas')
        .insert(mesasData)
        .select('id');

      if (mesasError) throw mesasError;
      
      const mesasIds = mesasInsert?.map(m => m.id) || [];

      updateStatus('Mesas', 'done', mesasIds.length);
      setProgressValue(20);
      addLog(`${mesasIds.length} mesas criadas.`);

      // ==========================================
      // 4. CRIAR PRODUTOS
      // ==========================================
      updateStatus('Produtos', 'running');
      addLog('Criando produtos...');

      const produtosIds: string[] = [];
      const produtosDataInsert: {empresa_id: string, categoria_id: string, nome: string, descricao: string, codigo: string, preco: number, custo: number, unidade: string, estoque_atual: number, estoque_minimo: number, destaque: boolean, ativo: boolean, criado_em: string, atualizado_em: string}[] = [];
      const produtosDataInfo: {id: string, nome: string, preco: number, custo: number}[] = [];

      for (const [nomeCategoria, produtos] of Object.entries(PRODUTOS_POR_CATEGORIA)) {
        const categoriaId = categoriasMap[nomeCategoria];
        
        for (const produto of produtos) {
          produtosDataInsert.push({
            empresa_id: empresaId,
            categoria_id: categoriaId,
            nome: produto.nome,
            descricao: `${produto.nome} - produto de qualidade`,
            codigo: `PROD${String(produtosIds.length + 1).padStart(4, '0')}`,
            preco: produto.preco,
            custo: produto.custo,
            unidade: 'un',
            estoque_atual: Math.floor(50 + Math.random() * 150),
            estoque_minimo: 10,
            destaque: Math.random() > 0.7,
            ativo: true,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          });
          produtosIds.push('temp');
        }
      }

      const { data: produtosInsert, error: prodError } = await supabase
        .from('produtos')
        .insert(produtosDataInsert)
        .select('id, nome, preco, custo');

      if (prodError) throw prodError;
      
      produtosInsert?.forEach(p => {
        produtosDataInfo.push({ id: p.id, nome: p.nome, preco: p.preco, custo: p.custo });
      });

      updateStatus('Produtos', 'done', produtosDataInfo.length);
      setProgressValue(25);
      addLog(`${produtosDataInfo.length} produtos criados.`);

      // ==========================================
      // 5. CRIAR VENDAS (220 vendas)
      // ==========================================
      updateStatus('Vendas', 'running');
      addLog('Criando vendas (isso pode levar alguns segundos)...');

      const vendasIds: string[] = [];
      const vendasSeedInfo: {id: string, total: number, forma_pagamento: string, criado_em: number}[] = [];
      const NUM_VENDAS = 220;
      const itensVendaData: {empresa_id: string, venda_id: string, produto_id: string, nome: string, quantidade: number, preco_unitario: number, total: number, criado_em: string}[] = [];
      const pagamentosData: {empresa_id: string, venda_id: string, forma_pagamento: string, valor: number, criado_em: string}[] = [];

      for (let i = 0; i < NUM_VENDAS; i++) {
        const dataVenda = gerarDataAleatoria(periodoInicio, periodoFim);
        const tipoVenda = TIPOS_VENDA[Math.floor(Math.random() * TIPOS_VENDA.length)];
        const formaPagamento = FORMAS_PAGAMENTO[Math.floor(Math.random() * FORMAS_PAGAMENTO.length)];
        const funcionarioIdx = Math.floor(Math.random() * funcionariosIds.length);
        const funcionarioId = funcionariosIds[funcionarioIdx];
        const funcionarioNome = NOMES_FUNCIONARIOS[funcionarioIdx % NOMES_FUNCIONARIOS.length];
        
        const numItens = Math.floor(Math.random() * 5) + 1;
        let subtotal = 0;
        const itensVenda: {produtoId: string, quantidade: number, precoUnitario: number}[] = [];

        for (let j = 0; j < numItens; j++) {
          const produtoIdx = Math.floor(Math.random() * produtosDataInfo.length);
          const produto = produtosDataInfo[produtoIdx];
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

        const vendaData = {
          empresa_id: empresaId,
          mesa_id: mesaId,
          funcionario_id: funcionarioId,
          tipo: tipoVenda,
          canal: tipoVenda === 'delivery' ? 'delivery' : tipoVenda === 'mesa' ? 'mesa' : 'balcao',
          status: 'fechada',
          subtotal,
          desconto,
          taxa_servico: taxaServico,
          total,
          forma_pagamento: formaPagamento,
          criado_por: funcionarioId,
          criado_por_nome: funcionarioNome,
          observacao: Math.random() > 0.7 ? 'Sem observações' : '',
          criado_em: dataVenda.toISOString(),
          atualizado_em: dataVenda.toISOString(),
          fechado_em: dataVenda.toISOString()
        };

        const { data: vendaInsert, error: vendaError } = await supabase
          .from('vendas')
          .insert(vendaData)
          .select('id')
          .single();

        if (vendaError) throw vendaError;
        
        if (vendaInsert) {
          vendasIds.push(vendaInsert.id);
          
          // Guardar info da venda para vincular ao caixa depois
          vendasSeedInfo.push({
            id: vendaInsert.id,
            total,
            forma_pagamento: formaPagamento,
            criado_em: dataVenda.getTime(),
          });
          
          for (const item of itensVenda) {
            const produtoInfo = produtosDataInfo.find(p => p.id === item.produtoId);
            itensVendaData.push({
              empresa_id: empresaId,
              venda_id: vendaInsert.id,
              produto_id: item.produtoId,
              nome: produtoInfo?.nome || '',
              quantidade: item.quantidade,
              preco_unitario: item.precoUnitario,
              total: item.precoUnitario * item.quantidade,
              criado_em: dataVenda.toISOString()
            });
          }

          pagamentosData.push({
            empresa_id: empresaId,
            venda_id: vendaInsert.id,
            forma_pagamento: formaPagamento,
            valor: total,
            criado_em: dataVenda.toISOString()
          });
        }

        if (i % 20 === 0) {
          setProgressValue(25 + Math.floor((i / NUM_VENDAS) * 50));
        }
      }

      // Inserir itens de venda em batch
      if (itensVendaData.length > 0) {
        const { error: itensError } = await supabase
          .from('itens_venda')
          .insert(itensVendaData);
        if (itensError) console.error('Erro ao inserir itens:', itensError);
      }

      // Inserir pagamentos em batch
      if (pagamentosData.length > 0) {
        const { error: pgError } = await supabase
          .from('pagamentos')
          .insert(pagamentosData);
        if (pgError) console.error('Erro ao inserir pagamentos:', pgError);
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
      const movimentosData = Array.from({ length: NUM_MOVIMENTOS }, () => {
        const produto = produtosDataInfo[Math.floor(Math.random() * produtosDataInfo.length)];
        const tipo = ['entrada', 'saida', 'ajuste'][Math.floor(Math.random() * 3)] as 'entrada' | 'saida' | 'ajuste';
        const quantidade = tipo === 'entrada' 
          ? Math.floor(Math.random() * 50) + 10 
          : tipo === 'saida'
          ? -(Math.floor(Math.random() * 20) + 1)
          : Math.floor(Math.random() * 30) - 15;

        return {
          empresa_id: empresaId,
          produto_id: produto.id,
          tipo,
          quantidade,
          preco_unitario: produto.custo,
          observacao: tipo === 'entrada' ? 'Reposição de estoque' : tipo === 'saida' ? 'Saída manual' : 'Ajuste de inventário',
          usuario_id: funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)],
          criado_em: gerarDataAleatoria(periodoInicio, periodoFim).toISOString()
        };
      });

      const { error: movError } = await supabase
        .from('estoque_movimentos')
        .insert(movimentosData);

      if (movError) console.error('Erro ao criar movimentos:', movError);

      updateStatus('Movimentos de Estoque', 'done', NUM_MOVIMENTOS);
      setProgressValue(80);
      addLog(`${NUM_MOVIMENTOS} movimentos de estoque criados.`);

      // ==========================================
      // 7. CRIAR CONTAS A PAGAR/RECEBER
      // ==========================================
      updateStatus('Contas a Pagar/Receber', 'running');
      addLog('Criando contas a pagar e receber...');

      const contasData: {empresa_id: string, tipo: string, descricao: string, valor: number, vencimento: string, categoria: string, fornecedor?: string, status: string, data_pagamento?: string, valor_pago?: number, forma_pagamento?: string, criado_em: string, atualizado_em: string}[] = [];

      for (let i = 0; i < 25; i++) {
        const vencimento = gerarDataAleatoria(periodoInicio, periodoFim);
        const status = Math.random() > 0.4 ? 'pago' : 'pendente';

        contasData.push({
          empresa_id: empresaId,
          tipo: 'pagar',
          descricao: `${CATEGORIAS_CONTAS_PAGAR[Math.floor(Math.random() * CATEGORIAS_CONTAS_PAGAR.length)]} - ${FORNECEDORES[Math.floor(Math.random() * FORNECEDORES.length)]}`,
          valor: Math.floor(Math.random() * 3000) + 200,
          vencimento: vencimento.toISOString(),
          categoria: CATEGORIAS_CONTAS_PAGAR[Math.floor(Math.random() * CATEGORIAS_CONTAS_PAGAR.length)],
          fornecedor: FORNECEDORES[Math.floor(Math.random() * FORNECEDORES.length)],
          status,
          data_pagamento: status === 'pago' ? new Date(vencimento.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          valor_pago: status === 'pago' ? Math.floor(Math.random() * 3000) + 200 : undefined,
          forma_pagamento: status === 'pago' ? 'pix' : undefined,
          criado_em: gerarDataAleatoria(periodoInicio, periodoFim).toISOString(),
          atualizado_em: gerarDataAleatoria(periodoInicio, periodoFim).toISOString()
        });
      }

      for (let i = 0; i < 15; i++) {
        const vencimento = gerarDataAleatoria(periodoInicio, periodoFim);
        const status = Math.random() > 0.4 ? 'pago' : 'pendente';

        contasData.push({
          empresa_id: empresaId,
          tipo: 'receber',
          descricao: `Recebimento - ${CATEGORIAS_CONTAS_RECEBER[Math.floor(Math.random() * CATEGORIAS_CONTAS_RECEBER.length)]}`,
          valor: Math.floor(Math.random() * 5000) + 500,
          vencimento: vencimento.toISOString(),
          categoria: CATEGORIAS_CONTAS_RECEBER[Math.floor(Math.random() * CATEGORIAS_CONTAS_RECEBER.length)],
          status,
          data_pagamento: status === 'pago' ? vencimento.toISOString() : undefined,
          valor_pago: status === 'pago' ? Math.floor(Math.random() * 5000) + 500 : undefined,
          forma_pagamento: status === 'pago' ? 'pix' : undefined,
          criado_em: gerarDataAleatoria(periodoInicio, periodoFim).toISOString(),
          atualizado_em: gerarDataAleatoria(periodoInicio, periodoFim).toISOString()
        });
      }

      const { error: contasError } = await supabase
        .from('contas')
        .insert(contasData);

      if (contasError) console.error('Erro ao criar contas:', contasError);

      updateStatus('Contas a Pagar/Receber', 'done', 40);
      setProgressValue(85);
      addLog('40 contas (pagar/receber) criadas.');

      // ==========================================
      // 8. CRIAR CAIXAS
      // ==========================================
      updateStatus('Caixas', 'running');
      addLog('Criando sessões de caixa...');

      const caixasData: {empresa_id: string, valor_inicial: number, valor_atual: number, total_entradas: number, total_saidas: number, total_vendas: number, status: string, aberto_por: string, aberto_por_nome: string, aberto_em: string, fechado_por?: string, fechado_por_nome?: string, fechado_em?: string, valor_final?: number, quebra?: number, observacao_abertura: string, observacao_fechamento: string}[] = [];
      const movimentacoesCaixaData: {caixa_id: string, empresa_id: string, tipo: string, valor: number, forma_pagamento: string, descricao: string, usuario_id: string, usuario_nome: string, criado_em: string}[] = [];

      for (let i = 0; i < 20; i++) {
        const dataAbertura = gerarDataAleatoria(periodoInicio, periodoFim);
        const dataFechamento = new Date(dataAbertura.getTime() + 8 * 60 * 60 * 1000);
        const valorInicial = Math.floor(Math.random() * 300) + 100;
        const totalVendas = Math.floor(Math.random() * 3000) + 500;
        const totalEntradas = totalVendas + Math.floor(Math.random() * 200);
        const totalSaidas = Math.floor(Math.random() * 100);
        const valorFinal = valorInicial + totalEntradas - totalSaidas;

        const caixaItem = {
          empresa_id: empresaId,
          valor_inicial: valorInicial,
          valor_atual: valorFinal,
          total_entradas: totalEntradas,
          total_saidas: totalSaidas,
          total_vendas: totalVendas,
          status: i < 18 ? 'fechado' : 'aberto',
          aberto_por: funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)],
          aberto_por_nome: NOMES_FUNCIONARIOS[Math.floor(Math.random() * NOMES_FUNCIONARIOS.length)],
          aberto_em: dataAbertura.toISOString(),
          fechado_por: i < 18 ? funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)] : undefined,
          fechado_por_nome: i < 18 ? NOMES_FUNCIONARIOS[Math.floor(Math.random() * NOMES_FUNCIONARIOS.length)] : undefined,
          fechado_em: i < 18 ? dataFechamento.toISOString() : undefined,
          valor_final: i < 18 ? valorFinal : undefined,
          quebra: i < 18 ? Math.floor(Math.random() * 20) - 10 : undefined,
          observacao_abertura: '',
          observacao_fechamento: ''
        };
        caixasData.push(caixaItem);
      }

      const { data: caixasInsert, error: caixasError } = await supabase
        .from('caixas')
        .insert(caixasData)
        .select('id, aberto_em');

      if (caixasError) console.error('Erro ao criar caixas:', caixasError);

      // Criar movimentações de caixa (abertura, vendas e fechamento)
      // Primeiro, associar vendas aos caixas baseado na data
      caixasInsert?.forEach((caixa, i) => {
        const dataAbertura = new Date(caixa.aberto_em || new Date());
        const dataFechamento = caixasData[i].status === 'fechado'
          ? new Date(caixasData[i].fechado_em || dataAbertura.getTime() + 8 * 60 * 60 * 1000)
          : new Date();

        movimentacoesCaixaData.push({
          caixa_id: caixa.id,
          empresa_id: empresaId,
          tipo: 'abertura',
          valor: caixasData[i].valor_inicial,
          forma_pagamento: 'dinheiro',
          descricao: 'Abertura de caixa',
          usuario_id: funcionariosIds[0],
          usuario_nome: NOMES_FUNCIONARIOS[0],
          criado_em: dataAbertura.toISOString()
        });

        // Vincular vendas a este caixa como movimentações tipo 'venda'
        // Buscar vendas cuja data está no período deste caixa
        const vendasDoCaixa = vendasSeedInfo.filter(v =>
          v.criado_em >= dataAbertura.getTime() && v.criado_em <= dataFechamento.getTime()
        );

        vendasDoCaixa.forEach(venda => {
          movimentacoesCaixaData.push({
            caixa_id: caixa.id,
            empresa_id: empresaId,
            tipo: 'venda',
            valor: venda.total,
            forma_pagamento: venda.forma_pagamento,
            descricao: `Venda - ${venda.forma_pagamento}`,
            venda_id: venda.id,
            usuario_id: funcionariosIds[0],
            usuario_nome: NOMES_FUNCIONARIOS[0],
            criado_em: new Date(venda.criado_em).toISOString()
          });
        });

        if (caixasData[i].status === 'fechado') {
          movimentacoesCaixaData.push({
            caixa_id: caixa.id,
            empresa_id: empresaId,
            tipo: 'fechamento',
            valor: caixasData[i].valor_final || 0,
            forma_pagamento: 'dinheiro',
            descricao: 'Fechamento de caixa',
            usuario_id: funcionariosIds[0],
            usuario_nome: NOMES_FUNCIONARIOS[0],
            criado_em: dataFechamento.toISOString()
          });
        }
      });

      if (movimentacoesCaixaData.length > 0) {
        const { error: movCaixaError } = await supabase
          .from('movimentacoes_caixa')
          .insert(movimentacoesCaixaData);
        if (movCaixaError) console.error('Erro ao criar movimentações de caixa:', movCaixaError);
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

      const logsData = Array.from({ length: 100 }, () => ({
        empresa_id: empresaId,
        usuario_id: funcionariosIds[Math.floor(Math.random() * funcionariosIds.length)],
        usuario_nome: NOMES_FUNCIONARIOS[Math.floor(Math.random() * NOMES_FUNCIONARIOS.length)],
        acao: acoes[Math.floor(Math.random() * acoes.length)],
        detalhes: 'Ação realizada automaticamente via seed',
        tipo: ['venda', 'produto', 'estoque', 'funcionario', 'financeiro', 'outro'][Math.floor(Math.random() * 6)],
        data_hora: gerarDataAleatoria(periodoInicio, periodoFim).toISOString()
      }));

      const { error: logsError } = await supabase
        .from('logs')
        .insert(logsData);

      if (logsError) console.error('Erro ao criar logs:', logsError);

      updateStatus('Logs de Atividade', 'done', 100);
      setProgressValue(100);
      addLog('100 logs de atividade criados.');

      // FINALIZADO
      addLog('═══════════════════════════════════════');
      addLog('✅ SEED CONCLUÍDO COM SUCESSO!');
      addLog('═══════════════════════════════════════');
      addLog(`Total de registros criados: ${8 + funcionariosIds.length + mesasIds.length + produtosDataInfo.length + NUM_VENDAS * 3 + NUM_MOVIMENTOS + 40 + 20 * 2 + 100}`);

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

          {/* Período de dados */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Período dos Dados
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="dataInicio" className="text-sm text-muted-foreground">Data Início</Label>
                <input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  disabled={loading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dataFim" className="text-sm text-muted-foreground">Data Fim</Label>
                <input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  disabled={loading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            {dataInicio && dataFim && new Date(dataFim) <= new Date(dataInicio) && (
              <p className="text-sm text-red-500">A data fim deve ser posterior à data início.</p>
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
            disabled={loading || !empresaId || empresas.length === 0 || !dataInicio || !dataFim || new Date(dataFim) <= new Date(dataInicio)}
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
            <strong>Total: ~550+ lançamentos</strong> distribuídos no período selecionado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
