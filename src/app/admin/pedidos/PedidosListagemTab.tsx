'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import {
  Search,
  Loader2,
  Download,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import { exportToPDF, formatCurrencyPDF, formatDatePDF, fetchEmpresaPDFData } from '@/lib/export-pdf';

interface PedidoItem {
  id: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  total: number;
}

interface Pedido {
  id: string;
  numero: number;
  clienteNome: string;
  total: number;
  status: string;
  formaPagamento: string;
  criadoEm: string;
  criadoPorNome: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-blue-500', icon: CheckCircle2 },
  convertido: { label: 'Convertido', color: 'bg-green-500', icon: ArrowRight },
  cancelado: { label: 'Cancelado', color: 'bg-red-500', icon: XCircle },
};

export function PedidosListagemTab() {
  const { empresaId } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('pedidos')
        .select('id, numero, cliente_nome, total, status, forma_pagamento, criado_em, criado_por_nome')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }
      if (dataInicio) {
        query = query.gte('criado_em', `${dataInicio}T00:00:00`);
      }
      if (dataFim) {
        query = query.lte('criado_em', `${dataFim}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let lista = (data || []).map((p: any) => ({
        id: p.id,
        numero: p.numero,
        clienteNome: p.cliente_nome || 'Sem cliente',
        total: parseFloat(p.total) || 0,
        status: p.status || 'pendente',
        formaPagamento: p.forma_pagamento || '',
        criadoEm: p.criado_em,
        criadoPorNome: p.criado_por_nome || '',
      }));

      if (busca) {
        const q = busca.toLowerCase();
        lista = lista.filter(p =>
          p.clienteNome.toLowerCase().includes(q) ||
          String(p.numero).includes(q)
        );
      }

      setPedidos(lista);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId, busca, filtroStatus, dataInicio, dataFim]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleExportPDF = async () => {
    const empresaInfo = await fetchEmpresaPDFData(empresaId);
    exportToPDF({
      title: 'Listagem de Pedidos',
      subtitle: `Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${pedidos.length} pedidos`,
      orientation: 'landscape',
      columns: [
        { header: 'Nº', accessor: (row: Pedido) => String(row.numero), width: 15 },
        { header: 'Cliente', accessor: (row: Pedido) => row.clienteNome, width: 50 },
        { header: 'Data', accessor: (row: Pedido) => formatDatePDF(row.criadoEm), width: 25 },
        { header: 'Valor', accessor: (row: Pedido) => formatCurrencyPDF(row.total), width: 22 },
        { header: 'Status', accessor: (row: Pedido) => STATUS_MAP[row.status]?.label || row.status, width: 20 },
        { header: 'Pagamento', accessor: (row: Pedido) => row.formaPagamento || '-', width: 22 },
        { header: 'Criado por', accessor: (row: Pedido) => row.criadoPorNome || '-', width: 22 },
      ],
      data: pedidos,
      filename: `pedidos-${new Date().toISOString().slice(0, 10)}`,
      totals: { label: 'TOTAL GERAL' },
      summary: [
        { label: 'Total de Pedidos', value: pedidos.length },
        { label: 'Valor Total', value: formatCurrencyPDF(pedidos.reduce((s, p) => s + p.total, 0)) },
        { label: 'Pendentes', value: pedidos.filter(p => p.status === 'pendente').length },
        { label: 'Aprovados', value: pedidos.filter(p => p.status === 'aprovado').length },
        { label: 'Convertidos', value: pedidos.filter(p => p.status === 'convertido').length },
        { label: 'Cancelados', value: pedidos.filter(p => p.status === 'cancelado').length },
      ],
      ...empresaInfo,
    });
  };

  const statusBadge = (status: string) => {
    const s = STATUS_MAP[status];
    if (!s) return <Badge>{status}</Badge>;
    const Icon = s.icon;
    return <Badge className={`${s.color} text-white border-0`}><Icon className="h-3 w-3 mr-1" />{s.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou nº pedido..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-40"
                placeholder="Data início"
              />
              <span className="text-muted-foreground text-sm">até</span>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-40"
                placeholder="Data fim"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="convertido">Convertido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </CardContent>
        </Card>
      ) : pedidos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum pedido encontrado</p>
            <p className="text-sm text-muted-foreground">
              {busca || filtroStatus !== 'todos' || dataInicio || dataFim
                ? 'Tente ajustar os filtros'
                : 'Nenhum pedido cadastrado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="w-[140px]">Data</TableHead>
                  <TableHead className="w-[130px] text-right">Valor</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[120px]">Pagamento</TableHead>
                  <TableHead className="w-[120px]">Criado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm font-semibold">{p.numero}</TableCell>
                    <TableCell>
                      <span className="font-medium">{p.clienteNome}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.criadoEm).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-green-600">
                      R$ {p.total.toFixed(2)}
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.formaPagamento ? FORMA_PAGAMENTO_LABELS[p.formaPagamento] || p.formaPagamento : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.criadoPorNome || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão Crédito',
  cartao_debito: 'Cartão Débito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
};
