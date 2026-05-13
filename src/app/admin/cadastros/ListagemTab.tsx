'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Users,
  UserCheck,
  Truck,
  Download,
  Package,
} from 'lucide-react';
import { exportToPDF, formatCurrencyPDF, fetchEmpresaPDFData } from '@/lib/export-pdf';

type TipoEntidade = 'cliente' | 'vendedor' | 'fornecedor';

interface EntidadeListagem {
  id: string;
  tipo: TipoEntidade;
  nome: string;
  documento?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  uf?: string;
  ativo: boolean;
}

export function ListagemTab() {
  const { empresaId } = useAuth();
  const [entidades, setEntidades] = useState<EntidadeListagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const lista: EntidadeListagem[] = [];

      const promises: Promise<void>[] = [];

      if (filtroTipo === 'todos' || filtroTipo === 'cliente') {
        promises.push((async () => {
          const { data: clientes } = await supabase
            .from('clientes')
            .select('id, nome_razao_social, cnpj_cpf, email, telefone, municipio, uf, ativo')
            .eq('empresa_id', empresaId);
          if (clientes) {
            clientes.forEach((c: any) => {
              lista.push({
                id: c.id,
                tipo: 'cliente',
                nome: c.nome_razao_social,
                documento: c.cnpj_cpf,
                email: c.email,
                telefone: c.telefone,
                cidade: c.municipio,
                uf: c.uf,
                ativo: c.ativo,
              });
            });
          }
        })());
      }

      if (filtroTipo === 'todos' || filtroTipo === 'vendedor') {
        promises.push((async () => {
          const { data: vendedores } = await supabase
            .from('vendedores')
            .select('id, nome, email, cidade, estado, ativo')
            .eq('empresa_id', empresaId);
          if (vendedores) {
            vendedores.forEach((v: any) => {
              lista.push({
                id: v.id,
                tipo: 'vendedor',
                nome: v.nome,
                email: v.email,
                cidade: v.cidade,
                uf: v.estado,
                ativo: v.ativo,
              });
            });
          }
        })());
      }

      if (filtroTipo === 'todos' || filtroTipo === 'fornecedor') {
        promises.push((async () => {
          const { data: fornecedores } = await supabase
            .from('fornecedores')
            .select('id, nome, cnpj, email, telefone, cidade, estado, ativo')
            .eq('empresa_id', empresaId);
          if (fornecedores) {
            fornecedores.forEach((f: any) => {
              lista.push({
                id: f.id,
                tipo: 'fornecedor',
                nome: f.nome,
                documento: f.cnpj,
                email: f.email,
                telefone: f.telefone,
                cidade: f.cidade,
                uf: f.estado,
                ativo: f.ativo,
              });
            });
          }
        })());
      }

      await Promise.all(promises);

      let filtradas = lista;
      if (busca) {
        const q = busca.toLowerCase();
        filtradas = filtradas.filter(e =>
          e.nome.toLowerCase().includes(q) ||
          (e.documento && e.documento.includes(q))
        );
      }
      if (filtroStatus === 'ativos') filtradas = filtradas.filter(e => e.ativo);
      else if (filtroStatus === 'inativos') filtradas = filtradas.filter(e => !e.ativo);

      filtradas.sort((a, b) => a.nome.localeCompare(b.nome));
      setEntidades(filtradas);
    } catch {
      setEntidades([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId, busca, filtroTipo, filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleExportPDF = async () => {
    const empresaInfo = await fetchEmpresaPDFData(empresaId);
    exportToPDF({
      title: 'Listagem Geral',
      subtitle: `Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${entidades.length} registros`,
      orientation: 'landscape',
      columns: [
        { header: 'Tipo', accessor: (row: EntidadeListagem) =>
          row.tipo === 'cliente' ? 'Cliente' : row.tipo === 'vendedor' ? 'Vendedor' : 'Fornecedor', width: 22 },
        { header: 'Nome', accessor: (row: EntidadeListagem) => row.nome, width: 55 },
        { header: 'Documento', accessor: (row: EntidadeListagem) => row.documento || '-', width: 30 },
        { header: 'Telefone', accessor: (row: EntidadeListagem) => row.telefone || row.email || '-', width: 28 },
        { header: 'Cidade/UF', accessor: (row: EntidadeListagem) =>
          [row.cidade, row.uf].filter(Boolean).join('/') || '-', width: 25 },
        { header: 'Status', accessor: (row: EntidadeListagem) => row.ativo ? 'Ativo' : 'Inativo', width: 18 },
      ],
      data: entidades,
      filename: `listagem-geral-${new Date().toISOString().slice(0, 10)}`,
      totals: { label: 'TOTAL GERAL' },
      summary: [
        { label: 'Total de Registros', value: entidades.length },
        { label: 'Clientes', value: entidades.filter(e => e.tipo === 'cliente').length },
        { label: 'Vendedores', value: entidades.filter(e => e.tipo === 'vendedor').length },
        { label: 'Fornecedores', value: entidades.filter(e => e.tipo === 'fornecedor').length },
        { label: 'Ativos', value: entidades.filter(e => e.ativo).length },
      ],
      ...empresaInfo,
    });
  };

  const tipoBadge = (tipo: TipoEntidade) => {
    switch (tipo) {
      case 'cliente':
        return <Badge className="bg-blue-500"><Users className="h-3 w-3 mr-1" />Cliente</Badge>;
      case 'vendedor':
        return <Badge className="bg-purple-500"><UserCheck className="h-3 w-3 mr-1" />Vendedor</Badge>;
      case 'fornecedor':
        return <Badge className="bg-amber-500"><Truck className="h-3 w-3 mr-1" />Fornecedor</Badge>;
    }
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
                  placeholder="Buscar por nome ou documento..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filtroStatus === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('todos')}
                className={filtroStatus === 'todos' ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                Todos
              </Button>
              <Button
                variant={filtroStatus === 'ativos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('ativos')}
                className={filtroStatus === 'ativos' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Ativos
              </Button>
              <Button
                variant={filtroStatus === 'inativos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('inativos')}
                className={filtroStatus === 'inativos' ? 'bg-gray-500 hover:bg-gray-600' : ''}
              >
                Inativos
              </Button>
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="cliente">Clientes</SelectItem>
                <SelectItem value="vendedor">Vendedores</SelectItem>
                <SelectItem value="fornecedor">Fornecedores</SelectItem>
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
      ) : entidades.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum registro encontrado</p>
            <p className="text-sm text-muted-foreground">
              {busca || filtroTipo !== 'todos' || filtroStatus !== 'todos'
                ? 'Tente ajustar os filtros'
                : 'Nenhum cliente, vendedor ou fornecedor cadastrado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[150px]">Documento</TableHead>
                  <TableHead className="w-[180px]">Contato</TableHead>
                  <TableHead className="w-[130px]">Cidade/UF</TableHead>
                  <TableHead className="w-[90px] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entidades.map((e) => (
                  <TableRow key={`${e.tipo}-${e.id}`}>
                    <TableCell>{tipoBadge(e.tipo)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{e.nome}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {e.documento || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.telefone || e.email || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[e.cidade, e.uf].filter(Boolean).join('/') || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={e.ativo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}>
                        {e.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
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
