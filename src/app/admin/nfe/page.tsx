'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  FileUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Download,
  Printer,
  Package,
  Truck,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Loader2,
  FilePlus2,
  DollarSign,
  Settings,
  Trash2,
  Image,
  Upload,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { exportToPDF, formatCurrencyPDF, formatDatePDF, fetchEmpresaPDFData } from '@/lib/export-pdf';
import { useToast } from '@/hooks/use-toast';

// =====================================================
// Types
// =====================================================

interface NFeEntrada {
  documento_ref: string;
  fornecedor: string;
  data: string;
  produtos: {
    id: string;
    produto_nome: string;
    quantidade: number;
    tipo_entrada: string;
    preco_unitario: number;
    estoque_novo: number;
    observacao: string | null;
  }[];
  valor_total: number;
  criado_por_nome: string | null;
}

interface NFeSaida {
  id: string;
  numero: string;
  data: string;
  cliente: string;
  total: number;
  forma_pagamento: string;
  status: string;
  nfe_id: string | null;
  tipo_origem?: string;
}

// =====================================================
// Logo Upload Card Component
// =====================================================

function LogoUploadCard({ empresaId, logoUrl, setLogoUrl }: {
  empresaId: string;
  logoUrl: string;
  setLogoUrl: (url: string) => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Tipo inválido', description: 'Use JPEG, PNG, WebP, GIF ou SVG.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'Tamanho máximo: 2MB.' });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('empresaId', empresaId);
      const res = await fetch('/api/empresa-logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload');
      setLogoUrl(data.url);
      toast({ title: 'Logo enviado!', description: 'O logo será usado nos DANFEs e relatórios.' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ variant: 'destructive', title: 'Erro no upload', description: msg });
    } finally {
      setUploading(false);
    }
  }, [empresaId, setLogoUrl, toast]);

  const handleRemove = useCallback(async () => {
    try {
      const res = await fetch('/api/empresa-logo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover');
      setLogoUrl('');
      toast({ title: 'Logo removido' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ variant: 'destructive', title: 'Erro ao remover', description: msg });
    }
  }, [empresaId, setLogoUrl, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Logo da Empresa
        </CardTitle>
        <CardDescription>
          Faça upload do logo que será impresso nos DANFEs e relatórios fiscais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
          }`}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); if (e.target) e.target.value = ''; }} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Enviando logo...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                Arraste o logo aqui ou <span className="text-primary">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WebP, GIF ou SVG — Máximo 2MB</p>
            </div>
          )}
        </div>

        {logoUrl && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
            <div className="w-20 h-20 rounded-lg bg-white border flex items-center justify-center overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Logo da empresa" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Logo configurado</p>
              <p className="text-xs text-muted-foreground truncate">{logoUrl}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Ativo nos DANFEs</Badge>
                <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleRemove}>
                  <Trash2 className="h-3 w-3 mr-1" />Remover
                </Button>
              </div>
            </div>
          </div>
        )}

        {!logoUrl && (
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
            <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Image className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Nenhum logo configurado</p>
              <Badge variant="outline" className="mt-1"><AlertCircle className="h-3 w-3 mr-1" />Sem logo</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// Page Component
// =====================================================

export default function NFePage() {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('entrada');

  // Logo state
  const [empresaLogo, setEmpresaLogo] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load logo
  useEffect(() => {
    if (!empresaId) return;
    const supabase = getSupabaseClient();
    supabase.from('empresas').select('logo_url').eq('id', empresaId).single()
      .then(({ data }) => { if (data?.logo_url) setEmpresaLogo(data.logo_url); })
      .catch(() => {});
  }, [empresaId]);

  // Delete NFe state
  const [excluindoNFe, setExcluindoNFe] = useState(false);

  // Data states
  const [dadosEntrada, setDadosEntrada] = useState<NFeEntrada[]>([]);
  const [dadosSaida, setDadosSaida] = useState<NFeSaida[]>([]);
  const [loadingEntrada, setLoadingEntrada] = useState(false);
  const [loadingSaida, setLoadingSaida] = useState(false);

  // Filters
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [searchEntrada, setSearchEntrada] = useState('');
  const [searchSaida, setSearchSaida] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Detail dialog
  const [detailItem, setDetailItem] = useState<NFeEntrada | NFeSaida | null>(null);
  const [detailType, setDetailType] = useState<'entrada' | 'saida' | null>(null);

  // DANFE preview dialog
  const [dialogDanfe, setDialogDanfe] = useState(false);
  const [danfeVenda, setDanfeVenda] = useState<NFeSaida | null>(null);

  // ========================================
  // Delete NFe Entrada
  // ========================================
  const handleExcluirNFeEntrada = async () => {
    if (expandedRows.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Expanda uma nota fiscal primeiro para selecioná-la',
      });
      return;
    }

    const documentoRef = Array.from(expandedRows)[0];
    const nfe = dadosEntrada.find(n => n.documento_ref === documentoRef);
    if (!nfe) return;

    setExcluindoNFe(true);
    try {
      const response = await fetch('/api/nfe/excluir-entrada', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          documentoRef,
          excluirProdutosNovos: true,
        }),
      });
      const data = await response.json();
      if (data.sucesso) {
        const r = data.resultado;
        const msg = [`NF-e excluída!`, `Estoque revertido: ${r.estoqueRevertido} produto(s)`];
        if (r.produtosExcluidos > 0) msg.push(`${r.produtosExcluidos} produto(s) excluído(s)`);
        if (r.nfeImportadaRemovida) msg.push('Registro de NFe removido');
        if (r.erros.length > 0) msg.push(`Erros: ${r.erros.join(', ')}`);
        toast({ title: msg.join(' — ') });
        setExpandedRows(new Set());
        fetchEntrada();
      } else {
        toast({ variant: 'destructive', title: data.erro || 'Erro ao excluir' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erro de conexão' });
    } finally {
      setExcluindoNFe(false);
    }
  };

  // Set default date range (last 30 days)
  useEffect(() => {
    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    setDataInicio(trintaDiasAtras.toISOString().split('T')[0]);
    setDataFim(hoje.toISOString().split('T')[0]);
  }, []);

  // ========================================
  // Fetch data
  // ========================================
  const fetchEntrada = async () => {
    if (!empresaId) return;
    setLoadingEntrada(true);
    try {
      const response = await fetch('/api/nfe/listar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          tipo: 'entrada',
          dataInicio,
          dataFim,
          search: searchEntrada || undefined,
        }),
      });
      const data = await response.json();
      if (data.sucesso) {
        setDadosEntrada(data.dados || []);
      }
    } catch (error) {
      console.error('Erro ao buscar NF-e de entrada:', error);
    } finally {
      setLoadingEntrada(false);
    }
  };

  const fetchSaida = async () => {
    if (!empresaId) return;
    setLoadingSaida(true);
    try {
      const response = await fetch('/api/nfe/listar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          tipo: 'saida',
          dataInicio,
          dataFim,
          search: searchSaida || undefined,
          status: statusFilter === 'todos' ? undefined : statusFilter,
        }),
      });
      const data = await response.json();
      if (data.sucesso) {
        setDadosSaida(data.dados || []);
      }
    } catch (error) {
      console.error('Erro ao buscar NF-e de saída:', error);
    } finally {
      setLoadingSaida(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    if (empresaId && dataInicio && dataFim) {
      fetchEntrada();
      fetchSaida();
    }
  }, [empresaId, dataInicio, dataFim]);

  // Re-fetch when search changes (debounced)
  useEffect(() => {
    if (!empresaId) return;
    const timeout = setTimeout(() => {
      fetchEntrada();
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchEntrada]);

  useEffect(() => {
    if (!empresaId) return;
    const timeout = setTimeout(() => {
      fetchSaida();
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchSaida, statusFilter]);

  // ========================================
  // Stats
  // ========================================
  const statsEntrada = useMemo(() => {
    const totalNotas = dadosEntrada.length;
    const totalProdutos = dadosEntrada.reduce((acc, n) => acc + n.produtos.length, 0);
    const valorTotal = dadosEntrada.reduce((acc, n) => acc + n.valor_total, 0);
    return { totalNotas, totalProdutos, valorTotal };
  }, [dadosEntrada]);

  const statsSaida = useMemo(() => {
    const totalVendas = dadosSaida.length;
    const comNFe = dadosSaida.filter(v => v.status === 'nfe_emitida').length;
    const semNFe = dadosSaida.filter(v => v.status === 'pendente').length;
    const valorTotal = dadosSaida.reduce((acc, v) => acc + v.total, 0);
    return { totalVendas, comNFe, semNFe, valorTotal };
  }, [dadosSaida]);

  // ========================================
  // Toggle expanded row
  // ========================================
  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // ========================================
  // Helpers
  // ========================================
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // ========================================
  // Render
  // ========================================
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Notas Fiscais' }]}>
        <div className="space-y-6">
          {/* ============================================= */}
          {/* HEADER                                        */}
          {/* ============================================= */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <FileText className="h-7 w-7 md:h-8 md:w-8 text-orange-500" />
                Notas Fiscais
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Consulte e gerencie notas fiscais de entrada e saída
              </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/nfe/importar">
                <Button variant="outline" className="gap-2">
                  <FileUp className="h-4 w-4" />
                  Importar NF-e
                </Button>
              </Link>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={handleExcluirNFeEntrada}
                disabled={excluindoNFe || expandedRows.size === 0}
              >
                {excluindoNFe ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir NF-e Entrada
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  const empresaInfo = await fetchEmpresaPDFData(empresaId);
                  if (activeTab === 'entrada') {
                    exportToPDF({
                      title: 'Notas Fiscais de Entrada',
                      subtitle: `Período: ${formatDatePDF(dataInicio)} a ${formatDatePDF(dataFim)}`,
                      columns: [
                        { header: 'Data', accessor: (row: NFeEntrada) => formatDatePDF(row.data) },
                        { header: 'Fornecedor', accessor: (row: NFeEntrada) => row.fornecedor },
                        { header: 'Documento', accessor: (row: NFeEntrada) => row.documento_ref },
                        { header: 'Produtos', accessor: (row: NFeEntrada) => row.produtos.length },
                        { header: 'Valor Total', accessor: (row: NFeEntrada) => formatCurrencyPDF(row.valor_total) },
                      ],
                      data: dadosEntrada,
                      filename: 'nfe-entrada',
                      orientation: 'landscape',
                      totals: {
                        label: 'TOTAL',
                        columnTotals: {
                          3: statsEntrada.totalProdutos,
                          4: formatCurrencyPDF(statsEntrada.valorTotal),
                        },
                      },
                      summary: [
                        { label: 'Total de Notas', value: statsEntrada.totalNotas },
                        { label: 'Total de Produtos', value: statsEntrada.totalProdutos },
                        { label: 'Valor Total', value: formatCurrencyPDF(statsEntrada.valorTotal) },
                      ],
                    ...empresaInfo,
                    });
                  } else {
                    exportToPDF({
                      title: 'Notas Fiscais de Saída',
                      subtitle: `Período: ${formatDatePDF(dataInicio)} a ${formatDatePDF(dataFim)}`,
                      columns: [
                        { header: 'Número', accessor: (row: NFeSaida) => row.numero },
                        { header: 'Data', accessor: (row: NFeSaida) => formatDatePDF(row.data) },
                        { header: 'Cliente', accessor: (row: NFeSaida) => row.cliente },
                        { header: 'Total', accessor: (row: NFeSaida) => formatCurrencyPDF(row.total) },
                        { header: 'Pagamento', accessor: (row: NFeSaida) => row.forma_pagamento },
                        { header: 'Status', accessor: (row: NFeSaida) => row.status === 'nfe_emitida' ? 'NF-e Emitida' : 'Pendente' },
                      ],
                      data: dadosSaida,
                      filename: 'nfe-saida',
                      orientation: 'landscape',
                      totals: {
                        label: 'TOTAL',
                        columnTotals: {
                          3: formatCurrencyPDF(statsSaida.valorTotal),
                        },
                      },
                      summary: [
                        { label: 'Total de Vendas', value: statsSaida.totalVendas },
                        { label: 'Com NF-e', value: statsSaida.comNFe },
                        { label: 'Sem NF-e', value: statsSaida.semNFe },
                        { label: 'Valor Total', value: formatCurrencyPDF(statsSaida.valorTotal) },
                      ],
                    ...empresaInfo,
                    });
                  }
                }}
              >
                <Download className="h-4 w-4" />
                Exportar PDF
              </Button>
              <Link href="/admin/nfe/config">
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Config. NF-e
                </Button>
              </Link>
            </div>
          </div>

          {/* ============================================= */}
          {/* TABS                                          */}
          {/* ============================================= */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
              <TabsTrigger value="entrada" className="gap-2">
                <ArrowDownToLine className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">NF-e Entrada</span>
              </TabsTrigger>
              <TabsTrigger value="saida" className="gap-2">
                <ArrowUpFromLine className="h-4 w-4 text-orange-500" />
                <span className="font-semibold">NF-e Saída</span>
              </TabsTrigger>
              <TabsTrigger value="logo" className="gap-2">
                <Image className="h-4 w-4 text-purple-500" />
                <span className="font-semibold">Logo</span>
              </TabsTrigger>
            </TabsList>

            {/* ============================================= */}
            {/* TAB: ENTRADA                                  */}
            {/* ============================================= */}
            <TabsContent value="entrada" className="space-y-6">
              {/* Subtitle */}
              <p className="text-sm text-muted-foreground ml-1">Notas fiscais de compra e importação — clique em <strong>Importar NF-e</strong> para adicionar.</p>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-blue-100">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statsEntrada.totalNotas}</p>
                        <p className="text-xs text-muted-foreground">Notas Importadas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statsEntrada.totalProdutos}</p>
                        <p className="text-xs text-muted-foreground">Produtos Importados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(statsEntrada.valorTotal)}</p>
                        <p className="text-xs text-muted-foreground">Valor Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card className="border-blue-100">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Filter className="h-4 w-4" />
                      <span className="text-sm font-semibold whitespace-nowrap">Filtros Entrada:</span>
                    </div>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full md:w-[160px]"
                    />
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full md:w-[160px]"
                    />
                    <div className="relative flex-1 w-full md:max-w-[260px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar documento, fornecedor..."
                        value={searchEntrada}
                        onChange={(e) => setSearchEntrada(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button variant="outline" size="icon" className="border-blue-200" onClick={fetchEntrada}>
                      <RefreshCw className={`h-4 w-4 ${loadingEntrada ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card className="border-t-4 border-t-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowDownToLine className="h-5 w-5 text-blue-600" />
                    Notas Fiscais de Entrada
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1 text-xs"
                        onClick={handleExcluirNFeEntrada}
                        disabled={excluindoNFe || expandedRows.size === 0}
                      >
                        {excluindoNFe ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Excluir NF-e Selecionada
                      </Button>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">{statsEntrada.totalNotas} nota{statsEntrada.totalNotas !== 1 ? 's' : ''}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingEntrada ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Carregando notas de entrada...</span>
                    </div>
                  ) : dadosEntrada.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                        <ArrowDownToLine className="h-8 w-8 text-blue-300" />
                      </div>
                      <p className="text-lg font-medium">Nenhuma nota de entrada encontrada</p>
                      <p className="text-sm mt-1 max-w-md text-center">Importe uma NFe XML de fornecedor para registrar a entrada de produtos no estoque</p>
                      <Link href="/admin/nfe/importar">
                        <Button className="mt-6 gap-2 bg-blue-600 hover:bg-blue-700">
                          <FileUp className="h-4 w-4" />
                          Importar NF-e de Entrada
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Documento Ref</TableHead>
                            <TableHead className="text-center">Produtos</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dadosEntrada.map((nfe) => {
                            const isExpanded = expandedRows.has(nfe.documento_ref);
                            return (
                              <React.Fragment key={nfe.documento_ref}>
                                <TableRow
                                  className="cursor-pointer hover:bg-muted/50"
                                  onClick={() => toggleRow(nfe.documento_ref)}
                                >
                                  <TableCell>
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm whitespace-nowrap">
                                    {formatDate(nfe.data)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Truck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                      <span className="text-sm truncate max-w-[200px]">
                                        {nfe.fornecedor}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs font-mono">
                                      {nfe.documento_ref}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="secondary" className="text-xs">
                                      <Package className="h-3 w-3 mr-1" />
                                      {nfe.produtos.length}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-sm">
                                    {formatCurrency(nfe.valor_total)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDetailItem(nfe);
                                          setDetailType('entrada');
                                        }}
                                        title="Ver detalhes"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedRows(new Set([nfe.documento_ref]));
                                          setTimeout(() => handleExcluirNFeEntrada(), 50);
                                        }}
                                        title="Excluir esta NF-e"
                                        disabled={excluindoNFe}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                {/* Expanded: product list */}
                                {isExpanded && (
                                  <TableRow>
                                    <TableCell colSpan={7} className="bg-muted/30 p-0">
                                      <div className="px-8 py-3">
                                        <div className="max-h-[300px] overflow-y-auto rounded-lg border">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="text-xs">Produto</TableHead>
                                                <TableHead className="text-xs text-center">Qtd</TableHead>
                                                <TableHead className="text-xs text-right">Custo Unit.</TableHead>
                                                <TableHead className="text-xs text-right">Subtotal</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {nfe.produtos.map((prod) => (
                                                <TableRow key={prod.id}>
                                                  <TableCell className="text-sm py-2">
                                                    {prod.produto_nome}
                                                  </TableCell>
                                                  <TableCell className="text-sm text-center py-2 font-mono">
                                                    {prod.quantidade} {prod.tipo_entrada}
                                                  </TableCell>
                                                  <TableCell className="text-sm text-right py-2 font-mono">
                                                    {formatCurrency(prod.preco_unitario)}
                                                  </TableCell>
                                                  <TableCell className="text-sm text-right py-2 font-semibold font-mono">
                                                    {formatCurrency(prod.preco_unitario * prod.quantidade)}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================= */}
            {/* TAB: SAÍDA                                    */}
            {/* ============================================= */}
            <TabsContent value="saida" className="space-y-6">
              {/* Subtitle */}
              <p className="text-sm text-muted-foreground ml-1">Notas fiscais de vendas — vendas fechadas no PDV aparecerão aqui para emissão.</p>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-orange-100">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statsSaida.totalVendas}</p>
                        <p className="text-xs text-muted-foreground">Vendas no Período</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statsSaida.comNFe}</p>
                        <p className="text-xs text-muted-foreground">Com NF-e Emitida</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statsSaida.semNFe}</p>
                        <p className="text-xs text-muted-foreground">Sem NF-e</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(statsSaida.valorTotal)}</p>
                        <p className="text-xs text-muted-foreground">Total Vendido</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card className="border-orange-100">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="flex items-center gap-2 text-orange-600">
                      <Filter className="h-4 w-4" />
                      <span className="text-sm font-semibold whitespace-nowrap">Filtros Saída:</span>
                    </div>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full md:w-[160px]"
                    />
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full md:w-[160px]"
                    />
                    <div className="relative flex-1 w-full md:max-w-[260px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente, número..."
                        value={searchSaida}
                        onChange={(e) => setSearchSaida(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-[170px]">
                        <SelectValue placeholder="Status NF-e" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="com_nfe">Com NF-e Emitida</SelectItem>
                        <SelectItem value="sem_nfe">Sem NF-e</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" className="border-orange-200" onClick={fetchSaida}>
                      <RefreshCw className={`h-4 w-4 ${loadingSaida ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card className="border-t-4 border-t-orange-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ArrowUpFromLine className="h-5 w-5 text-orange-600" />
                      Notas Fiscais de Saída
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">{statsSaida.totalVendas} venda{statsSaida.totalVendas !== 1 ? 's' : ''}</Badge>
                    </CardTitle>
                    <Link href="/admin/nfe/emitir">
                      <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4" />
                        Emitir NF-e
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSaida ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Carregando vendas...</span>
                    </div>
                  ) : dadosSaida.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                        <ArrowUpFromLine className="h-8 w-8 text-orange-300" />
                      </div>
                      <p className="text-lg font-medium">Nenhuma venda encontrada no período</p>
                      <p className="text-sm mt-1 max-w-md text-center">Vendas fechadas no PDV aparecerão aqui. Realize vendas e elas serão listadas automaticamente para emissão de NF-e</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Pagamento</TableHead>
                            <TableHead>Status NF-e</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dadosSaida.map((venda) => (
                            <TableRow key={venda.id}>
                              <TableCell className="font-mono text-sm font-medium">
                                {venda.numero}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {formatDate(venda.data)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm truncate max-w-[180px]">
                                    {venda.cliente}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-sm">
                                {formatCurrency(venda.total)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {venda.forma_pagamento}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {venda.status === 'nfe_emitida' ? (
                                  <Badge className="bg-green-500 text-xs gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    NF-e Emitida
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-yellow-400 text-yellow-600 text-xs gap-1">
                                    <Clock className="h-3 w-3" />
                                    Pendente
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDetailItem(venda); setDetailType('saida'); }} title="Ver detalhes">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title={venda.status === 'nfe_emitida' ? 'Imprimir DANFE' : 'Imprimir Recibo'}
                                    onClick={() => window.open(`/api/nfe/danfe/${venda.nfe_id || venda.id}`, '_blank')}
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  {venda.status === 'pendente' && (
                                    <Link href={`/admin/nfe/emitir?${venda.tipo_origem === 'pedido' ? 'pedido_id' : 'venda_id'}=${venda.id}`}>
                                      <Button size="sm" className="gap-1 h-8 text-xs bg-blue-600 hover:bg-blue-700">
                                        <FilePlus2 className="h-3.5 w-3.5" />
                                        Emitir NF
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================= */}
            {/* TAB: LOGO DA EMPRESA                           */}
            {/* ============================================= */}
            <TabsContent value="logo" className="space-y-6">
              <p className="text-sm text-muted-foreground ml-1">
                Gerencie o logo da empresa utilizado nos DANFEs e relatórios fiscais.
              </p>

              <LogoUploadCard
                empresaId={empresaId}
                logoUrl={empresaLogo}
                setLogoUrl={setEmpresaLogo}
              />
            </TabsContent>
          </Tabs>

          {/* ============================================= */}
          {/* DIALOG: Detalhes da NF-e de Entrada           */}
          {/* ============================================= */}
          <Dialog
            open={detailType === 'entrada' && !!detailItem}
            onOpenChange={(open) => { if (!open) { setDetailItem(null); setDetailType(null); } }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-blue-600" />
                  Detalhes da NF-e de Entrada
                </DialogTitle>
              </DialogHeader>
              {detailItem && detailType === 'entrada' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Documento
                      </p>
                      <p className="font-semibold text-sm mt-1 font-mono">
                        {(detailItem as NFeEntrada).documento_ref}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Truck className="h-3 w-3" /> Fornecedor
                      </p>
                      <p className="font-semibold text-sm mt-1">
                        {(detailItem as NFeEntrada).fornecedor}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Data
                      </p>
                      <p className="font-semibold text-sm mt-1">
                        {formatDateTime((detailItem as NFeEntrada).data)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-600">Valor Total</p>
                      <p className="text-xl font-bold text-emerald-700">
                        {formatCurrency((detailItem as NFeEntrada).valor_total)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-600">Produtos</p>
                      <p className="text-xl font-bold text-emerald-700">
                        {(detailItem as NFeEntrada).produtos.length}
                      </p>
                    </div>
                  </div>

                  {/* Products table */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Produtos</h4>
                    <div className="max-h-[400px] overflow-y-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Produto</TableHead>
                            <TableHead className="text-xs text-center">Qtd</TableHead>
                            <TableHead className="text-xs text-right">Custo Unit.</TableHead>
                            <TableHead className="text-xs text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailItem as NFeEntrada).produtos.map((prod) => (
                            <TableRow key={prod.id}>
                              <TableCell className="text-sm py-2">
                                {prod.produto_nome}
                              </TableCell>
                              <TableCell className="text-sm text-center py-2 font-mono">
                                {prod.quantidade} {prod.tipo_entrada}
                              </TableCell>
                              <TableCell className="text-sm text-right py-2 font-mono">
                                {formatCurrency(prod.preco_unitario)}
                              </TableCell>
                              <TableCell className="text-sm text-right py-2 font-semibold font-mono">
                                {formatCurrency(prod.preco_unitario * prod.quantidade)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* ============================================= */}
          {/* DIALOG: Detalhes da Venda (NF-e Saída)        */}
          {/* ============================================= */}
          <Dialog
            open={detailType === 'saida' && !!detailItem}
            onOpenChange={(open) => { if (!open) { setDetailItem(null); setDetailType(null); } }}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-5 w-5 text-orange-600" />
                  Detalhes da Venda
                </DialogTitle>
              </DialogHeader>
              {detailItem && detailType === 'saida' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Número</p>
                      <p className="font-semibold text-sm mt-1 font-mono">
                        {(detailItem as NFeSaida).numero}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-semibold text-sm mt-1">
                        {formatDateTime((detailItem as NFeSaida).data)}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-semibold text-sm mt-1">
                        {(detailItem as NFeSaida).cliente}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Pagamento</p>
                      <p className="font-semibold text-sm mt-1">
                        {(detailItem as NFeSaida).forma_pagamento}
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-600">Total da Venda</p>
                      <p className="text-xl font-bold text-emerald-700">
                        {formatCurrency((detailItem as NFeSaida).total)}
                      </p>
                    </div>
                    {(detailItem as NFeSaida).status === 'nfe_emitida' ? (
                      <Badge className="bg-green-500 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        NF-e Emitida
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-yellow-400 text-yellow-600 gap-1">
                        <Clock className="h-3 w-3" />
                        Pendente
                      </Badge>
                    )}
                  </div>

                  {(detailItem as NFeSaida).status === 'pendente' && (
                    <Link href={`/admin/nfe/emitir?${(detailItem as NFeSaida).tipo_origem === 'pedido' ? 'pedido_id' : 'venda_id'}=${(detailItem as NFeSaida).id}`}>
                      <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                        <FilePlus2 className="h-4 w-4" />
                        Emitir NF-e
                      </Button>
                    </Link>
                  )}

                  {(detailItem as NFeSaida).status === 'nfe_emitida' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() =>
                          window.open(`/api/nfe/danfe/${(detailItem as NFeSaida).nfe_id}`, '_blank')
                        }
                      >
                        <Printer className="h-4 w-4" />
                        DANFE
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() =>
                          window.open(`/api/nfe/xml/${(detailItem as NFeSaida).nfe_id}?tipo=autorizado`, '_blank')
                        }
                      >
                        <Download className="h-4 w-4" />
                        XML
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* ============================================= */}
          {/* DIALOG: DANFE Preview                          */}
          {/* ============================================= */}
          <Dialog open={dialogDanfe} onOpenChange={setDialogDanfe}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  DANFE - {danfeVenda?.numero}
                </DialogTitle>
              </DialogHeader>
              <div className="border rounded-lg overflow-hidden">
                {danfeVenda && (
                  <iframe
                    src={`/api/nfe/danfe/${danfeVenda.nfe_id || danfeVenda.id}`}
                    className="w-full h-[70vh]"
                    title="DANFE Preview"
                  />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogDanfe(false)}>Fechar</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => window.open(`/api/nfe/danfe/${danfeVenda?.nfe_id || danfeVenda?.id}`, '_blank')}>
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
