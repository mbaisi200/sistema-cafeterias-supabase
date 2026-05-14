'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useVendas, useContas } from '@/hooks/useSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowUpDown,
  Download,
  Search,
  Filter,
  X,
  ChevronLeft,
  Clock,
  RefreshCw,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { exportToPDF, formatCurrencyPDF, formatDatePDF, fetchEmpresaPDFData } from '@/lib/export-pdf';
import { useToast } from '@/hooks/use-toast';

type SortField = 'descricao' | 'categoria' | 'vencimento' | 'valor' | 'status' | 'dataPagamento';
type SortDir = 'asc' | 'desc';

type ContaFilter = 'todas' | 'pagas' | 'vencidas' | 'pendentes';

export default function FinanceiroPage() {
  const { user, empresaId } = useAuth();
  const { vendas, loading: loadingVendas } = useVendas();
  const { 
    contas, 
    loading: loadingContas, 
    adicionarConta, 
    atualizarConta,
    excluirConta,
    registrarPagamento,
    carregarDados,
    contasPagar,
    contasReceber,
    totalPagarPendente,
    totalReceberPendente,
    totalPago,
    totalRecebido
  } = useContas();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPagamentoOpen, setDialogPagamentoOpen] = useState(false);
  const [dialogExcluirOpen, setDialogExcluirOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<any>(null);
  const [contaEditando, setContaEditando] = useState<any>(null);
  const [contaExcluir, setContaExcluir] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [tipoConta, setTipoConta] = useState<'pagar' | 'receber'>('pagar');
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfTipo, setPdfTipo] = useState<'pagar' | 'receber'>('pagar');
  const [pdfFilter, setPdfFilter] = useState<ContaFilter>('todas');
  const [pdfSearchVendedor, setPdfSearchVendedor] = useState('');
  const { toast } = useToast();

  // Filters
  const [filterPagar, setFilterPagar] = useState<ContaFilter>('todas');
  const [filterReceber, setFilterReceber] = useState<ContaFilter>('todas');

  // Date/Category/Search filters
  const [dataInicioPagar, setDataInicioPagar] = useState('');
  const [dataFimPagar, setDataFimPagar] = useState('');
  const [categoriaPagar, setCategoriaPagar] = useState('');
  const [searchPagar, setSearchPagar] = useState('');

  const [dataInicioReceber, setDataInicioReceber] = useState('');
  const [dataFimReceber, setDataFimReceber] = useState('');
  const [categoriaReceber, setCategoriaReceber] = useState('');
  const [searchReceber, setSearchReceber] = useState('');

  // Sorting
  const [sortPagar, setSortPagar] = useState<{ field: SortField; dir: SortDir }>({ field: 'vencimento', dir: 'asc' });
  const [sortReceber, setSortReceber] = useState<{ field: SortField; dir: SortDir }>({ field: 'vencimento', dir: 'asc' });

  const loading = loadingVendas || loadingContas;

  // Calcular estatísticas de vendas
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vendasFechadas = vendas.filter(v => v.status === 'fechada');
  
  const vendasHoje = vendasFechadas.filter(v => {
    const dataVenda = new Date(v.criadoEm);
    dataVenda.setHours(0, 0, 0, 0);
    return dataVenda.getTime() === hoje.getTime();
  });

  const totalVendasHoje = vendasHoje.reduce((acc, v) => acc + (v.total || 0), 0);

  // Calcular saldo projetado
  const saldoProjetado = totalReceberPendente - totalPagarPendente;

  // Contas vencidas - totals
  const totalPagarVencido = contasPagar
    .filter(c => c.status === 'pendente' && c.vencimento && new Date(c.vencimento) < hoje)
    .reduce((acc, c) => acc + (c.valor || 0), 0);

  const totalReceberVencido = contasReceber
    .filter(c => c.status === 'pendente' && c.vencimento && new Date(c.vencimento) < hoje)
    .reduce((acc, c) => acc + (c.valor || 0), 0);

  // Contas vencidas
  const contasVencidas = contas.filter(c => 
    c.status === 'pendente' && 
    c.vencimento && 
    new Date(c.vencimento) < hoje
  );

  // Extract unique categories from contas
  const categoriasPagar = useMemo(() => {
    const cats = new Set(contasPagar.map(c => c.categoria).filter(Boolean));
    return Array.from(cats).sort();
  }, [contasPagar]);

  const categoriasReceber = useMemo(() => {
    const cats = new Set(contasReceber.map(c => c.categoria).filter(Boolean));
    return Array.from(cats).sort();
  }, [contasReceber]);

  // Filter and sort contas
  const applyFilterAndSort = (
    contasList: any[], 
    filter: ContaFilter, 
    sort: { field: SortField; dir: SortDir },
    extraFilters?: { dataInicio?: string; dataFim?: string; categoria?: string; search?: string }
  ) => {
    let filtered = [...contasList];

    // Apply extra filters (date range, category, search)
    // Skip date range when filter is "vencidas" or "pagas" to show ALL matching items
    if (filter !== 'vencidas' && filter !== 'pagas') {
      if (extraFilters?.dataInicio) {
        filtered = filtered.filter(c => c.vencimento && new Date(c.vencimento) >= new Date(extraFilters.dataInicio + 'T00:00:00'));
      }
      if (extraFilters?.dataFim) {
        filtered = filtered.filter(c => c.vencimento && new Date(c.vencimento) <= new Date(extraFilters.dataFim + 'T23:59:59'));
      }
    }
    if (extraFilters?.categoria) {
      filtered = filtered.filter(c => c.categoria === extraFilters.categoria);
    }
    if (extraFilters?.search) {
      const searchLower = extraFilters.search.toLowerCase();
      filtered = filtered.filter(c => 
        (c.descricao || '').toLowerCase().includes(searchLower) || 
        (c.fornecedor || '').toLowerCase().includes(searchLower) ||
        (c.vendedor_nome || '').toLowerCase().includes(searchLower)
      );
    }

    // Apply filter
    switch (filter) {
      case 'pagas':
        filtered = filtered.filter(c => c.status === 'pago');
        break;
      case 'vencidas':
        filtered = filtered.filter(c => c.status === 'pendente' && c.vencimento && new Date(c.vencimento) < hoje);
        break;
      case 'pendentes':
        filtered = filtered.filter(c => c.status === 'pendente' && (!c.vencimento || new Date(c.vencimento) >= hoje));
        break;
      // 'todas' - no filter
    }

    // Apply sort
    filtered.sort((a, b) => {
      let valA: any, valB: any;
      switch (sort.field) {
        case 'descricao':
          valA = (a.descricao || '').toLowerCase();
          valB = (b.descricao || '').toLowerCase();
          break;
        case 'categoria':
          valA = (a.categoria || '').toLowerCase();
          valB = (b.categoria || '').toLowerCase();
          break;
        case 'vencimento':
          valA = a.vencimento ? new Date(a.vencimento).getTime() : 0;
          valB = b.vencimento ? new Date(b.vencimento).getTime() : 0;
          break;
        case 'valor':
          valA = a.valor || 0;
          valB = b.valor || 0;
          break;
        case 'status':
          valA = a.status || '';
          valB = b.status || '';
          break;
        case 'dataPagamento':
          valA = a.dataPagamento ? new Date(a.dataPagamento).getTime() : 0;
          valB = b.dataPagamento ? new Date(b.dataPagamento).getTime() : 0;
          break;
        default:
          valA = 0;
          valB = 0;
      }
      if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const contasPagarFiltered = useMemo(() => 
    applyFilterAndSort(contasPagar, filterPagar, sortPagar, {
      dataInicio: dataInicioPagar,
      dataFim: dataFimPagar,
      categoria: categoriaPagar || undefined,
      search: searchPagar || undefined,
    }),
    [contasPagar, filterPagar, sortPagar, dataInicioPagar, dataFimPagar, categoriaPagar, searchPagar]
  );

  const contasReceberFiltered = useMemo(() => 
    applyFilterAndSort(contasReceber, filterReceber, sortReceber, {
      dataInicio: dataInicioReceber,
      dataFim: dataFimReceber,
      categoria: categoriaReceber || undefined,
      search: searchReceber || undefined,
    }),
    [contasReceber, filterReceber, sortReceber, dataInicioReceber, dataFimReceber, categoriaReceber, searchReceber]
  );

  const handleSort = (
    field: SortField,
    currentSort: { field: SortField; dir: SortDir },
    setSort: (s: { field: SortField; dir: SortDir }) => void
  ) => {
    if (currentSort.field === field) {
      setSort({ field, dir: currentSort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ field, dir: 'asc' });
    }
  };

  const handleSalvarConta = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const vencimentoStr = formData.get('vencimento') as string;
      const vencimento = vencimentoStr ? new Date(vencimentoStr + 'T23:59:59') : null;
      const dados = {
        tipo: tipoConta,
        descricao: formData.get('descricao') as string,
        valor: parseFloat(formData.get('valor') as string) || 0,
        vencimento: vencimento,
        categoria: formData.get('categoria') as string,
        fornecedor: formData.get('fornecedor') as string,
        vendedor_nome: (formData.get('vendedor_nome') as string) || null,
      };

      if (contaEditando) {
        await atualizarConta(contaEditando.id, dados);
        toast({
          title: 'Conta atualizada!',
          description: `A conta a ${tipoConta} foi alterada com sucesso.`,
        });
      } else {
        await adicionarConta(dados);
        toast({
          title: 'Conta cadastrada!',
          description: `A conta a ${tipoConta} foi adicionada com sucesso.`,
        });
      }

      await carregarDados();
      setDialogOpen(false);
      setContaEditando(null);
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar a conta.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExcluirConta = async () => {
    if (!contaExcluir) return;
    setSaving(true);
    try {
      await excluirConta(contaExcluir.id);
      await carregarDados();
      toast({
        title: 'Conta excluída!',
        description: 'A conta foi removida com sucesso.',
      });
      setDialogExcluirOpen(false);
      setContaExcluir(null);
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível excluir a conta.',
      });
    } finally {
      setSaving(false);
    }
  };

  const abrirEdicao = (conta: any) => {
    setContaEditando(conta);
    setTipoConta(conta.tipo);
    setDialogOpen(true);
  };

  const abrirExclusao = (conta: any) => {
    setContaExcluir(conta);
    setDialogExcluirOpen(true);
  };

  const gerarPDF = async () => {
    const contas = pdfTipo === 'pagar' ? contasPagar : contasReceber;
    let dados = applyFilterAndSort(contas, pdfFilter, { field: 'vencimento', dir: 'asc' });
    if (pdfSearchVendedor) {
      const termo = pdfSearchVendedor.toLowerCase();
      dados = dados.filter((c: any) => (c.vendedor_nome || '').toLowerCase().includes(termo));
    }

    const totalPendente = dados.filter(c => c.status === 'pendente').reduce((acc: number, c: any) => acc + (c.valor || 0), 0);
    const totalPagas = dados.filter(c => c.status === 'pago').reduce((acc: number, c: any) => acc + (c.valor || 0), 0);
    const titulo = pdfTipo === 'pagar' ? 'Contas a Pagar' : 'Contas a Receber';
    const nomeArquivo = pdfTipo === 'pagar' ? 'contas-a-pagar' : 'contas-a-receber';

    const temVendedor = dados.some((c: any) => c.vendedor_nome);
    const columns: any[] = [
      { header: 'Descrição', accessor: (c) => c.descricao || '-' },
      { header: 'Categoria', accessor: (c) => c.categoria || '-' },
    ];
    if (temVendedor) {
      columns.push({ header: 'Vendedor', accessor: (c) => c.vendedor_nome || '-' });
    }
    columns.push(
      { header: pdfTipo === 'pagar' ? 'Fornecedor' : 'Cliente', accessor: (c) => c.fornecedor || '-' },
      { header: 'Vencimento', accessor: (c) => formatDatePDF(c.vencimento) },
      { header: 'Valor', accessor: (c) => formatCurrencyPDF(c.valor) },
      { header: 'Status', accessor: (c) => c.status === 'pago' ? (pdfTipo === 'pagar' ? 'Pago' : 'Recebido') : (c.vencimento && new Date(c.vencimento) < hoje ? 'Vencida' : 'Pendente') },
      { header: 'Data Pagto', accessor: (c) => formatDatePDF(c.dataPagamento) },
    );

    const empresaInfo = await fetchEmpresaPDFData(empresaId);
    exportToPDF({
      title: titulo,
      subtitle: `Filtro: ${pdfFilter === 'todas' ? 'Todas' : pdfFilter === 'pagas' ? 'Pagas' : pdfFilter === 'vencidas' ? 'Vencidas' : 'Pendentes'} | Total pendente: ${formatCurrencyPDF(totalPendente)}`,
      columns,
      data: dados,
      filename: `${nomeArquivo}-${new Date().toISOString().split('T')[0]}`,
      summary: [
        { label: 'Total Pendente', value: formatCurrencyPDF(totalPendente) },
        { label: pdfTipo === 'pagar' ? 'Total Pago' : 'Total Recebido', value: formatCurrencyPDF(totalPagas) },
      ],
      totals: {
        label: 'TOTAL',
        columnTotals: {
          4: formatCurrencyPDF(dados.reduce((acc: number, c: any) => acc + (c.valor || 0), 0)),
        },
      },
      ...empresaInfo,
    });
    setPdfDialogOpen(false);
  };

  const handleRegistrarPagamento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const dataPagStr = formData.get('dataPagamento') as string;
      const dataPagamento = dataPagStr ? new Date(dataPagStr + 'T00:00:00').toISOString() : undefined;

      await registrarPagamento(contaSelecionada.id, {
        valor: parseFloat(formData.get('valor') as string) || contaSelecionada.valor,
        formaPagamento: formData.get('formaPagamento') as string,
        observacao: formData.get('observacao') as string,
        dataPagamento,
      });

      toast({
        title: contaSelecionada?.tipo === 'pagar' ? 'Pagamento registrado!' : 'Recebimento registrado!',
        description: contaSelecionada?.tipo === 'pagar' 
          ? 'O pagamento foi registrado com sucesso.' 
          : 'O recebimento foi registrado com sucesso.',
      });

      setDialogPagamentoOpen(false);
      setContaSelecionada(null);
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: contaSelecionada?.tipo === 'pagar'
          ? 'Não foi possível registrar o pagamento.'
          : 'Não foi possível registrar o recebimento.',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (conta: any) => {
    if (conta.status === 'pago') {
      return <Badge className="bg-green-500">Pago</Badge>;
    }
    
    if (conta.vencimento && new Date(conta.vencimento) < hoje) {
      return <Badge className="bg-red-500">Vencida</Badge>;
    }
    
    const diasVencimento = conta.vencimento 
      ? Math.ceil((new Date(conta.vencimento).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    if (diasVencimento !== null && diasVencimento <= 3) {
      return <Badge className="bg-yellow-500">Vence em {diasVencimento}d</Badge>;
    }
    
    return <Badge className="bg-blue-500">Pendente</Badge>;
  };

  const formatCurrency = (v: number) => v?.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' });

  // Render sortable header
  const SortableHeader = ({ 
    field, 
    label, 
    currentSort, 
    onSort,
    className 
  }: { 
    field: SortField; 
    label: string; 
    currentSort: { field: SortField; dir: SortDir };
    onSort: (field: SortField) => void;
    className?: string;
  }) => (
    <TableHead 
      className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className || ''}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${currentSort.field === field ? 'text-foreground' : 'text-muted-foreground/50'}`} />
        {currentSort.field === field && (
          <span className="text-[10px] text-muted-foreground">
            {currentSort.dir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </TableHead>
  );

  // Render filter tabs
  const FilterTabs = ({ 
    active, 
    onChange, 
    contasVencidasCount 
  }: { 
    active: ContaFilter; 
    onChange: (f: ContaFilter) => void;
    contasVencidasCount: number;
  }) => (
    <div className="flex items-center gap-2 mb-4">
      {([
        { value: 'todas' as ContaFilter, label: 'Todas' },
        { value: 'pendentes' as ContaFilter, label: 'Pendentes' },
        { value: 'vencidas' as ContaFilter, label: `Vencidas${contasVencidasCount > 0 ? ` (${contasVencidasCount})` : ''}`, danger: true },
        { value: 'pagas' as ContaFilter, label: 'Pagas' },
      ]).map(opt => (
        <Button
          key={opt.value}
          size="sm"
          variant="outline"
          className={`
            h-8 text-xs
            ${active === opt.value ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-muted'}
            ${active === opt.value && (opt as any).danger ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
            ${active === opt.value && !(opt as any).danger && opt.value === 'pagas' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
            ${active === opt.value && opt.value === 'pendentes' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
          `}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Financeiro' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Admin' },
          { title: 'Financeiro' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-start gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Área Financeira</h1>
                <p className="text-muted-foreground">
                  Gerencie o fluxo de caixa e contas do estabelecimento
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => carregarDados()}
                title="Recarregar dados"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => { setPdfTipo('pagar'); setPdfFilter('todas'); setPdfSearchVendedor(''); setPdfDialogOpen(true); }}
              >
                <Download className="mr-2 h-4 w-4" />
                PDF Pagar
              </Button>
              <Button
                variant="outline"
                onClick={() => { setPdfTipo('receber'); setPdfFilter('todas'); setPdfSearchVendedor(''); setPdfDialogOpen(true); }}
              >
                <Download className="mr-2 h-4 w-4" />
                PDF Receber
              </Button>
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setContaEditando(null); }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Conta
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{contaEditando ? 'Editar Conta' : 'Cadastrar Conta'}</DialogTitle>
                  <DialogDescription>
                    {contaEditando ? 'Altere os dados da conta' : 'Adicione uma nova conta a pagar ou receber'}
                  </DialogDescription>
                </DialogHeader>
                <form key={contaEditando?.id || 'new'} onSubmit={handleSalvarConta}>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={tipoConta === 'pagar' ? 'default' : 'outline'}
                        className={tipoConta === 'pagar' ? 'bg-red-500 hover:bg-red-600' : ''}
                        onClick={() => setTipoConta('pagar')}
                      >
                        <ArrowUpCircle className="h-4 w-4 mr-2" />
                        A Pagar
                      </Button>
                      <Button
                        type="button"
                        variant={tipoConta === 'receber' ? 'default' : 'outline'}
                        className={tipoConta === 'receber' ? 'bg-green-500 hover:bg-green-600' : ''}
                        onClick={() => setTipoConta('receber')}
                      >
                        <ArrowDownCircle className="h-4 w-4 mr-2" />
                        A Receber
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição *</Label>
                      <Input id="descricao" name="descricao" placeholder="Ex: Aluguel do mês" required defaultValue={contaEditando?.descricao || ''} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="valor">Valor (R$) *</Label>
                        <Input id="valor" name="valor" type="number" step="0.01" placeholder="0,00" required defaultValue={contaEditando?.valor || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vencimento">Vencimento</Label>
                        <Input id="vencimento" name="vencimento" type="date" defaultValue={contaEditando?.vencimento ? new Date(contaEditando.vencimento).toISOString().split('T')[0] : ''} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="categoria">Categoria</Label>
                        <Select name="categoria" defaultValue={contaEditando?.categoria || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {tipoConta === 'pagar' ? (
                              <>
                                <SelectItem value="Fornecedores">Fornecedores</SelectItem>
                                <SelectItem value="Aluguel">Aluguel</SelectItem>
                                <SelectItem value="Funcionários">Funcionários</SelectItem>
                                <SelectItem value="Impostos">Impostos</SelectItem>
                                <SelectItem value="Serviços">Serviços</SelectItem>
                                <SelectItem value="Outros">Outros</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="Vendas">Vendas</SelectItem>
                                <SelectItem value="Serviços">Serviços</SelectItem>
                                <SelectItem value="Aluguel">Aluguel Recebido</SelectItem>
                                <SelectItem value="Outros">Outros</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fornecedor">
                          {tipoConta === 'pagar' ? 'Fornecedor' : 'Cliente'}
                        </Label>
                        <Input 
                          id="fornecedor" 
                          name="fornecedor" 
                          placeholder={tipoConta === 'pagar' ? 'Nome do fornecedor' : 'Nome do cliente'} 
                          defaultValue={contaEditando?.fornecedor || ''}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendedor_nome">Vendedor</Label>
                      <Input
                        id="vendedor_nome"
                        name="vendedor_nome"
                        placeholder="Nome do vendedor (opcional)"
                        defaultValue={contaEditando?.vendedor_nome || ''}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => { setDialogOpen(false); setContaEditando(null); }}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {contaEditando ? 'Atualizar' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Alerta de contas vencidas */}
          {contasVencidas.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-800">
                      Atenção: {contasVencidas.length} conta(s) vencida(s)
                    </p>
                    <p className="text-sm text-red-700">
                      Você tem {contasVencidas.length} conta(s) com vencimento ultrapassado. Regularize o quanto antes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Vendas Hoje */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Vendas Hoje</p>
                    <p className="text-xl font-bold text-green-600 whitespace-nowrap">{formatCurrency(totalVendasHoje)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: A Pagar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <ArrowUpCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">A Pagar (Pendente)</p>
                    <p className="text-xl font-bold text-red-600 whitespace-nowrap">{formatCurrency(totalPagarPendente)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: A Receber */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <ArrowDownCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">A Receber (Pendente)</p>
                    <p className="text-xl font-bold text-blue-600 whitespace-nowrap">{formatCurrency(totalReceberPendente)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Pagar Vencidas */}
            <Card className={totalPagarVencido > 0 ? 'border-red-300 bg-red-50/50' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-200 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">A Pagar Vencidas</p>
                    <p className="text-xl font-bold text-red-700 whitespace-nowrap">{formatCurrency(totalPagarVencido)}</p>
                    {totalPagarVencido > 0 && (
                      <p className="text-xs text-red-600">
                        {contasPagar.filter(c => c.status === 'pendente' && c.vencimento && new Date(c.vencimento) < hoje).length} conta(s)
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Receber Vencidas */}
            <Card className={totalReceberVencido > 0 ? 'border-amber-300 bg-amber-50/50' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">A Receber Vencidas</p>
                    <p className="text-xl font-bold text-amber-700 whitespace-nowrap">{formatCurrency(totalReceberVencido)}</p>
                    {totalReceberVencido > 0 && (
                      <p className="text-xs text-amber-600">
                        {contasReceber.filter(c => c.status === 'pendente' && c.vencimento && new Date(c.vencimento) < hoje).length} conta(s)
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 6: Saldo Projetado */}
            <Card className={saldoProjetado < 0 ? 'border-red-300' : 'border-green-300'}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${saldoProjetado >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Wallet className={`h-6 w-6 ${saldoProjetado >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">Saldo Projetado</p>
                    <p className={`text-xl font-bold whitespace-nowrap ${saldoProjetado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(saldoProjetado))}
                    </p>
                    {saldoProjetado < 0 && (
                      <p className="text-xs text-red-500 font-medium">Déficit</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="visao" className="space-y-4">
            <TabsList>
              <TabsTrigger value="visao">Visão Geral</TabsTrigger>
              <TabsTrigger value="pagar">
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                A Pagar ({contasPagar.length})
              </TabsTrigger>
              <TabsTrigger value="receber">
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                A Receber ({contasReceber.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab Visão Geral */}
            <TabsContent value="visao" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo a Pagar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pendente</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(totalPagarPendente)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pago</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(totalPago)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo a Receber</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pendente</span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(totalReceberPendente)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recebido</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(totalRecebido)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Vendas Recentes */}
              <Card>
                <CardHeader>
                  <CardTitle>Vendas Recentes</CardTitle>
                  <CardDescription>Últimas vendas realizadas no PDV</CardDescription>
                </CardHeader>
                <CardContent>
                  {vendas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma venda registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {vendas.slice(0, 5).map((venda) => (
                        <div key={venda.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="font-medium">
                              {venda.tipo === 'mesa' ? `Mesa ${venda.mesaId}` : 
                               venda.tipo === 'delivery' ? 'Delivery' : 'Balcão'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(venda.criadoEm).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(venda.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <p className="font-bold text-green-600">
                            {formatCurrency(venda.total || 0)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab A Pagar */}
            <TabsContent value="pagar">
              {/* Filtros avançados */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Filter className="h-4 w-4" />
                      <span className="text-sm font-medium whitespace-nowrap">Filtros:</span>
                    </div>
                    <Input
                      type="date"
                      value={dataInicioPagar}
                      onChange={(e) => setDataInicioPagar(e.target.value)}
                      className="w-full md:w-[160px]"
                      placeholder="Data Início"
                    />
                    <Input
                      type="date"
                      value={dataFimPagar}
                      onChange={(e) => setDataFimPagar(e.target.value)}
                      className="w-full md:w-[160px]"
                      placeholder="Data Fim"
                    />
                    <Select value={categoriaPagar} onValueChange={(v) => setCategoriaPagar(v === '__all__' ? '' : v)}>
                      <SelectTrigger className="w-full md:w-[170px]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas as Categorias</SelectItem>
                        {categoriasPagar.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1 w-full md:max-w-[220px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar descrição, fornecedor..."
                        value={searchPagar}
                        onChange={(e) => setSearchPagar(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {(dataInicioPagar || dataFimPagar || categoriaPagar || searchPagar) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDataInicioPagar('');
                          setDataFimPagar('');
                          setCategoriaPagar('');
                          setSearchPagar('');
                        }}
                        title="Limpar filtros"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Contas a Pagar</CardTitle>
                    <CardDescription>Gerencie suas despesas e pagamentos</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => { setTipoConta('pagar'); setContaEditando(null); setDialogOpen(true); }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Conta
                  </Button>
                </CardHeader>
                <CardContent>
                  <FilterTabs 
                    active={filterPagar} 
                    onChange={setFilterPagar}
                    contasVencidasCount={contasPagar.filter(c => c.status === 'pendente' && c.vencimento && new Date(c.vencimento) < hoje).length}
                  />
                  {contasPagarFiltered.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ArrowUpCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma conta encontrada</p>
                      <p className="text-sm">Clique em &quot;Nova Conta&quot; para adicionar</p>
                    </div>
                  ) : (
                      <Table className="min-w-max md:min-w-full w-auto [&_td]:px-2 [&_td]:py-2.5 [&_th]:px-2 [&_th]:h-10">
                          <TableHeader>
                            <TableRow>
                              <SortableHeader 
                                field="descricao" 
                                label="Descrição" 
                                currentSort={sortPagar}
                                onSort={(f) => handleSort(f, sortPagar, setSortPagar)}
                              />
                              <TableHead className="text-left text-[11px] py-2">Vendedor</TableHead>
                              <SortableHeader 
                                field="categoria" 
                                label="Categoria" 
                              currentSort={sortPagar}
                              onSort={(f) => handleSort(f, sortPagar, setSortPagar)}
                            />
                            <SortableHeader 
                              field="vencimento" 
                              label="Vencimento" 
                              currentSort={sortPagar}
                              onSort={(f) => handleSort(f, sortPagar, setSortPagar)}
                            />
                            <SortableHeader 
                              field="valor" 
                              label="Valor" 
                              currentSort={sortPagar}
                              onSort={(f) => handleSort(f, sortPagar, setSortPagar)}
                              className="text-right"
                            />
                            <SortableHeader 
                              field="status" 
                              label="Status" 
                              currentSort={sortPagar}
                              onSort={(f) => handleSort(f, sortPagar, setSortPagar)}
                            />
                            <SortableHeader 
                              field="dataPagamento" 
                              label="Data Pagamento" 
                              currentSort={sortPagar}
                              onSort={(f) => handleSort(f, sortPagar, setSortPagar)}
                              className="text-right"
                            />
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contasPagarFiltered.map((conta) => (
                            <TableRow key={conta.id}>
                              <TableCell>
                                <div className="max-w-[200px] truncate">
                                  <p className="font-medium truncate">{conta.descricao}</p>
                                  {conta.fornecedor && (
                                    <p className="text-sm text-muted-foreground truncate">{conta.fornecedor}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">{conta.vendedor_nome || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{conta.categoria || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {conta.vencimento ? new Date(conta.vencimento).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>
                              <TableCell className="font-semibold text-right whitespace-nowrap">
                                {formatCurrency(conta.valor)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{getStatusBadge(conta)}</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                                {conta.dataPagamento 
                                  ? new Date(conta.dataPagamento).toLocaleDateString('pt-BR')
                                  : '-'
                                }
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-0.5">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => abrirEdicao(conta)}
                                    title="Editar"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  {conta.status === 'pendente' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50 px-2"
                                      onClick={() => {
                                        setContaSelecionada(conta);
                                        setDialogPagamentoOpen(true);
                                      }}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                      Pagar
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-500"
                                    onClick={() => abrirExclusao(conta)}
                                    title="Excluir"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab A Receber */}
            <TabsContent value="receber">
              {/* Filtros avançados */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Filter className="h-4 w-4" />
                      <span className="text-sm font-medium whitespace-nowrap">Filtros:</span>
                    </div>
                    <Input
                      type="date"
                      value={dataInicioReceber}
                      onChange={(e) => setDataInicioReceber(e.target.value)}
                      className="w-full md:w-[160px]"
                      placeholder="Data Início"
                    />
                    <Input
                      type="date"
                      value={dataFimReceber}
                      onChange={(e) => setDataFimReceber(e.target.value)}
                      className="w-full md:w-[160px]"
                      placeholder="Data Fim"
                    />
                    <Select value={categoriaReceber} onValueChange={(v) => setCategoriaReceber(v === '__all__' ? '' : v)}>
                      <SelectTrigger className="w-full md:w-[170px]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas as Categorias</SelectItem>
                        {categoriasReceber.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1 w-full md:max-w-[220px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar descrição, cliente..."
                        value={searchReceber}
                        onChange={(e) => setSearchReceber(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {(dataInicioReceber || dataFimReceber || categoriaReceber || searchReceber) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDataInicioReceber('');
                          setDataFimReceber('');
                          setCategoriaReceber('');
                          setSearchReceber('');
                        }}
                        title="Limpar filtros"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Contas a Receber</CardTitle>
                    <CardDescription>Gerencie seus recebíveis</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => { setTipoConta('receber'); setContaEditando(null); setDialogOpen(true); }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Conta
                  </Button>
                </CardHeader>
                <CardContent>
                  <FilterTabs 
                    active={filterReceber} 
                    onChange={setFilterReceber}
                    contasVencidasCount={contasReceber.filter(c => c.status === 'pendente' && c.vencimento && new Date(c.vencimento) < hoje).length}
                  />
                  {contasReceberFiltered.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ArrowDownCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma conta encontrada</p>
                      <p className="text-sm">Clique em &quot;Nova Conta&quot; para adicionar</p>
                    </div>
                  ) : (
                      <Table className="min-w-max md:min-w-full w-auto [&_td]:px-2 [&_td]:py-2.5 [&_th]:px-2 [&_th]:h-10">
                        <TableHeader>
                          <TableRow>
                            <SortableHeader 
                              field="descricao" 
                              label="Descrição" 
                              currentSort={sortReceber}
                              onSort={(f) => handleSort(f, sortReceber, setSortReceber)}
                            />
                            <TableHead className="text-left text-[11px] py-2">Vendedor</TableHead>
                            <SortableHeader 
                              field="categoria" 
                              label="Categoria" 
                              currentSort={sortReceber}
                              onSort={(f) => handleSort(f, sortReceber, setSortReceber)}
                            />
                            <SortableHeader 
                              field="vencimento" 
                              label="Vencimento" 
                              currentSort={sortReceber}
                              onSort={(f) => handleSort(f, sortReceber, setSortReceber)}
                            />
                            <SortableHeader 
                              field="valor" 
                              label="Valor" 
                              currentSort={sortReceber}
                              onSort={(f) => handleSort(f, sortReceber, setSortReceber)}
                              className="text-right"
                            />
                            <SortableHeader 
                              field="status" 
                              label="Status" 
                              currentSort={sortReceber}
                              onSort={(f) => handleSort(f, sortReceber, setSortReceber)}
                            />
                            <SortableHeader 
                              field="dataPagamento" 
                              label="Data Recebimento" 
                              currentSort={sortReceber}
                              onSort={(f) => handleSort(f, sortReceber, setSortReceber)}
                              className="text-right"
                            />
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contasReceberFiltered.map((conta) => (
                            <TableRow key={conta.id}>
                              <TableCell>
                                <div className="max-w-[200px] truncate">
                                  <p className="font-medium truncate">{conta.descricao}</p>
                                  {conta.fornecedor && (
                                    <p className="text-sm text-muted-foreground truncate">{conta.fornecedor}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">{conta.vendedor_nome || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">{conta.categoria || '-'}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {conta.vencimento ? new Date(conta.vencimento).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>
                              <TableCell className="font-semibold text-right whitespace-nowrap">
                                {formatCurrency(conta.valor)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{getStatusBadge(conta)}</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                                {conta.dataPagamento 
                                  ? new Date(conta.dataPagamento).toLocaleDateString('pt-BR')
                                  : '-'
                                }
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-0.5">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => abrirEdicao(conta)}
                                    title="Editar"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  {conta.status === 'pendente' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50 px-2"
                                      onClick={() => {
                                        setContaSelecionada(conta);
                                        setDialogPagamentoOpen(true);
                                      }}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                      Receber
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-500"
                                    onClick={() => abrirExclusao(conta)}
                                    title="Excluir"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Dialog Excluir Conta */}
          <AlertDialog open={dialogExcluirOpen} onOpenChange={(open) => { setDialogExcluirOpen(open); if (!open) setContaExcluir(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir a conta &ldquo;{contaExcluir?.descricao}&rdquo; no valor de {contaExcluir ? formatCurrency(contaExcluir.valor) : ''}?
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleExcluirConta} disabled={saving} className="bg-red-500 hover:bg-red-600">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dialog Pagamento */}
          <Dialog open={dialogPagamentoOpen} onOpenChange={setDialogPagamentoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {contaSelecionada?.tipo === 'pagar' ? 'Registrar Pagamento' : 'Registrar Recebimento'}
            </DialogTitle>
            <DialogDescription>
              {contaSelecionada?.descricao} - {formatCurrency(contaSelecionada?.valor || 0)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegistrarPagamento}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor a {contaSelecionada?.tipo === 'pagar' ? 'Pagar' : 'Receber'}</Label>
                <Input 
                  id="valor" 
                  name="valor" 
                  type="number" 
                  step="0.01"
                  defaultValue={contaSelecionada?.valor}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                <Select name="formaPagamento" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Dinheiro
                      </div>
                    </SelectItem>
                    <SelectItem value="pix">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        PIX
                      </div>
                    </SelectItem>
                    <SelectItem value="credito">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cartão de Crédito
                      </div>
                    </SelectItem>
                    <SelectItem value="debito">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cartão de Débito
                      </div>
                    </SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataPagamento">Data do Pagamento</Label>
                  <Input 
                    id="dataPagamento" 
                    name="dataPagamento" 
                    type="date" 
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observacao">Observação</Label>
                  <Input id="observacao" name="observacao" placeholder="Opcional" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogPagamentoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PDF Filter Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Exportar {pdfTipo === 'pagar' ? 'Contas a Pagar' : 'Contas a Receber'}</DialogTitle>
            <DialogDescription>
              Escolha o filtro para o relatório PDF
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Filtrar por status</Label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'todas' as ContaFilter, label: 'Todas' },
                  { value: 'pendentes' as ContaFilter, label: 'Pendentes' },
                  { value: 'vencidas' as ContaFilter, label: 'Vencidas' },
                  { value: 'pagas' as ContaFilter, label: 'Pagas' },
                ]).map(opt => (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={pdfFilter === opt.value ? 'default' : 'outline'}
                    onClick={() => setPdfFilter(opt.value)}
                    className={pdfFilter === opt.value ? (
                      opt.value === 'vencidas' ? 'bg-red-600 hover:bg-red-700' :
                      opt.value === 'pagas' ? 'bg-green-600 hover:bg-green-700' :
                      opt.value === 'pendentes' ? 'bg-blue-600 hover:bg-blue-700' :
                      'bg-orange-500 hover:bg-orange-600'
                    ) : ''}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdfVendedor">Vendedor (opcional)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pdfVendedor"
                  placeholder="Filtrar por vendedor..."
                  value={pdfSearchVendedor}
                  onChange={(e) => setPdfSearchVendedor(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>Cancelar</Button>
            <Button onClick={gerarPDF} className="bg-blue-600 hover:bg-blue-700">
              <Download className="mr-2 h-4 w-4" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
