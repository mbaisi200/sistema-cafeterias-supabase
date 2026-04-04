'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNFEs, useCancelarNFe, useConsultarNFe } from '@/hooks/useNFE';
import { NFeService } from '@/services/nfe/nfe-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Plus,
  Search,
  Eye,
  X,
  Download,
  Printer,
  Settings,
  FileOutput,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { exportToPDF, formatCurrencyPDF, formatDatePDF } from '@/lib/export-pdf';

export default function CuponsNFEsPage() {
  const { empresaId } = useAuth();
  const { nfes, loading, total, carregar } = useNFEs(empresaId);
  const { cancelar, cancelando } = useCancelarNFe();
  const { consultar, consultando } = useConsultarNFe();

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroNumero, setFiltroNumero] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [pagina, setPagina] = useState(1);
  const limite = 20;

  // Diálogos
  const [nfeSelecionada, setNfeSelecionada] = useState<any>(null);
  const [dialogCancelar, setDialogCancelar] = useState(false);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [ativoTab, setAtivoTab] = useState('nfes');

  useEffect(() => {
    if (empresaId) {
      carregar({ status: filtroStatus === 'todos' ? undefined : filtroStatus, dataInicio, dataFim, numero: filtroNumero, pagina, limite });
    }
  }, [empresaId, filtroStatus, dataInicio, dataFim, filtroNumero, pagina, carregar]);

  // Estatísticas
  const stats = useMemo(() => {
    const autorizadas = nfes.filter(n => n.status === 'autorizada').length;
    const canceladas = nfes.filter(n => n.status === 'cancelada').length;
    const pendentes = nfes.filter(n => n.status === 'pendente').length;
    const rejeitadas = nfes.filter(n => n.status === 'rejeitada').length;
    const totalValor = nfes.filter(n => n.status === 'autorizada').reduce((acc, n) => acc + (n.total_nota || 0), 0);
    return { autorizadas, canceladas, pendentes, rejeitadas, total: nfes.length, totalValor };
  }, [nfes]);

  const handleCancelar = async () => {
    if (!nfeSelecionada || justificativa.length < 15) return;
    const resultado = await cancelar({ nfe_id: nfeSelecionada.id, justificativa });
    if (resultado.sucesso) {
      setDialogCancelar(false);
      setJustificativa('');
      setNfeSelecionada(null);
      carregar({ status: filtroStatus === 'todos' ? undefined : filtroStatus, dataInicio, dataFim, numero: filtroNumero, pagina, limite });
    }
  };

  const handleVerDetalhes = (nfe: any) => {
    setNfeSelecionada(nfe);
    setDialogDetalhes(true);
  };

  const handleConsultarSefaz = async (nfe: any) => {
    await consultar(nfe.id, undefined, true);
    carregar({ status: filtroStatus === 'todos' ? undefined : filtroStatus, dataInicio, dataFim, numero: filtroNumero, pagina, limite });
  };

  const imprimirDANFE = (nfeId: string) => {
    window.open(`/api/nfe/danfe/${nfeId}`, '_blank');
  };

  const downloadXML = (nfeId: string, tipo: string) => {
    window.open(`/api/nfe/xml/${nfeId}?tipo=${tipo}`, '_blank');
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'autorizada': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'cancelada': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'rejeitada': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'denegada': return <Ban className="h-4 w-4 text-orange-600" />;
      case 'contingencia': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <Badge variant="outline" className={NFeService.corStatus(status)}>
      <span className="flex items-center gap-1">
        {statusIcon(status)}
        {NFeService.descricaoStatus(status)}
      </span>
    </Badge>
  );

  const totalPaginas = Math.ceil(total / limite);

  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Cupons e NFEs' }]}>
        <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Cupons e NFEs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie cupons fiscais (NFC-e) e Notas Fiscais Eletrônicas (NF-e)
          </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              exportToPDF({
                title: 'Notas Fiscais Eletrônicas (NF-e)',
                subtitle: `${nfes.length} nota(s) encontrada(s)`,
                columns: [
                  { header: 'Nº', accessor: (row: any) => String(row.numero).padStart(9, '0') },
                  { header: 'Série', accessor: (row: any) => row.serie },
                  { header: 'Destinatário', accessor: (row: any) => row.destinatario?.nome_razao_social || '-' },
                  { header: 'Data Emissão', accessor: (row: any) => formatDatePDF(row.data_emissao) },
                  { header: 'Valor', accessor: (row: any) => formatCurrencyPDF(row.total_nota || 0) },
                  { header: 'Status', accessor: (row: any) => {
                    const statusMap: Record<string, string> = {
                      autorizada: 'Autorizada',
                      cancelada: 'Cancelada',
                      rejeitada: 'Rejeitada',
                      denegada: 'Denegada',
                      contingencia: 'Contingência',
                      pendente: 'Pendente',
                    };
                    return statusMap[row.status] || row.status;
                  }},
                ],
                data: nfes,
                filename: 'nfes-emitidas',
                orientation: 'landscape',
                totals: {
                  label: 'TOTAL',
                  columnTotals: {
                    4: formatCurrencyPDF(stats.totalValor),
                  },
                },
                summary: [
                  { label: 'Total NF-es', value: stats.total },
                  { label: 'Autorizadas', value: stats.autorizadas },
                  { label: 'Canceladas/Rejeitadas', value: stats.canceladas + stats.rejeitadas },
                  { label: 'Pendentes', value: stats.pendentes },
                  { label: 'Valor Autorizado', value: formatCurrencyPDF(stats.totalValor) },
                ],
              });
            }}
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Link href="/admin/nfe/emitir">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Emitir NF-e
            </Button>
          </Link>
          <Link href="/admin/nfe/config">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Config. NF-e
            </Button>
          </Link>
          <Link href="/admin/configuracoes-cupom">
            <Button variant="outline" className="gap-2">
              <Receipt className="h-4 w-4" />
              Cupom Fiscal
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={ativoTab} onValueChange={setAtivoTab}>
        <TabsList>
          <TabsTrigger value="nfes">NF-e (Modelo 55)</TabsTrigger>
          <TabsTrigger value="cupons">Cupons Fiscais</TabsTrigger>
        </TabsList>

        <TabsContent value="nfes" className="space-y-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total NF-es</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.autorizadas}</p>
                    <p className="text-xs text-muted-foreground">Autorizadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.canceladas + stats.rejeitadas}</p>
                    <p className="text-xs text-muted-foreground">Canceladas/Rejeitadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.pendentes}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold">R$ {stats.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">Valor Autorizado</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtros:</span>
                </div>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="autorizada">Autorizada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="rejeitada">Rejeitada</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="denegada">Denegada</SelectItem>
                    <SelectItem value="contingencia">Contingência</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Buscar número..."
                  value={filtroNumero}
                  onChange={(e) => setFiltroNumero(e.target.value)}
                  className="w-[180px]"
                />
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-[160px]"
                />
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-[160px]"
                />
                <Button variant="outline" size="icon" onClick={() => carregar({ status: filtroStatus === 'todos' ? undefined : filtroStatus, dataInicio, dataFim, numero: filtroNumero, pagina, limite })}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de NF-es */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Notas Fiscais Eletrônicas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Carregando NF-es...</span>
                </div>
              ) : nfes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">Nenhuma NF-e encontrada</p>
                  <p className="text-sm">Emita sua primeira NF-e clicando no botão &quot;Emitir NF-e&quot;</p>
                  <Link href="/admin/nfe/emitir">
                    <Button className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4" />
                      Emitir NF-e
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Nº</TableHead>
                          <TableHead className="w-[100px]">Série</TableHead>
                          <TableHead className="w-[260px]">Chave de Acesso</TableHead>
                          <TableHead className="w-[120px]">Destinatário</TableHead>
                          <TableHead className="w-[120px]">Data Emissão</TableHead>
                          <TableHead className="w-[120px]">Valor</TableHead>
                          <TableHead className="w-[140px]">Status</TableHead>
                          <TableHead className="w-[160px] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nfes.map((nfe) => (
                          <TableRow key={nfe.id} className="cursor-pointer" onClick={() => handleVerDetalhes(nfe)}>
                            <TableCell className="font-medium">{String(nfe.numero).padStart(9, '0')}</TableCell>
                            <TableCell>{nfe.serie}</TableCell>
                            <TableCell className="font-mono text-xs">{nfe.chave}</TableCell>
                            <TableCell className="text-sm truncate max-w-[120px]">
                              {nfe.destinatario?.nome_razao_social || '-'}
                            </TableCell>
                            <TableCell>{new Date(nfe.data_emissao).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell className="font-medium">R$ {(nfe.total_nota || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell><StatusBadge status={nfe.status} /></TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" title="Ver detalhes" onClick={() => handleVerDetalhes(nfe)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {nfe.status === 'autorizada' && (
                                  <>
                                    <Button variant="ghost" size="icon" title="Imprimir DANFE" onClick={() => imprimirDANFE(nfe.id)}>
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" title="Download XML" onClick={() => downloadXML(nfe.id, 'autorizado')}>
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" title="Cancelar NF-e" onClick={() => { setNfeSelecionada(nfe); setDialogCancelar(true); }}>
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
                                <Button variant="ghost" size="icon" title="Consultar SEFAZ" onClick={() => handleConsultarSefaz(nfe)}>
                                  <RefreshCw className={`h-4 w-4 ${consultando ? 'animate-spin' : ''}`} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginação */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">
                      {total} NF-e{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={pagina <= 1}
                        onClick={() => setPagina(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">Página {pagina} de {totalPaginas || 1}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={pagina >= totalPaginas}
                        onClick={() => setPagina(p => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cupons" className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">Cupons Fiscais (NFC-e)</h3>
              <p className="text-muted-foreground mt-2">
                Acesse a configuração de cupons fiscais para gerenciar emissão de NFC-e (Modelo 65), 
                configuração de impressora térmica e layout de cupom.
              </p>
              <Link href="/admin/configuracoes-cupom">
                <Button className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700">
                  <Settings className="h-4 w-4" />
                  Configurar Cupons Fiscais
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Detalhes da NF-e */}
      <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              NF-e Nº {String(nfeSelecionada?.numero || '').padStart(9, '0')}
              {nfeSelecionada && <StatusBadge status={nfeSelecionada.status} />}
            </DialogTitle>
          </DialogHeader>
          {nfeSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Chave:</strong> <span className="font-mono text-xs">{nfeSelecionada.chave}</span></div>
                <div><strong>Série:</strong> {nfeSelecionada.serie}</div>
                <div><strong>Data Emissão:</strong> {new Date(nfeSelecionada.data_emissao).toLocaleString('pt-BR')}</div>
                <div><strong>Natureza:</strong> {nfeSelecionada.natureza_operacao}</div>
                <div><strong>Tipo:</strong> {nfeSelecionada.tipo_operacao === 1 ? 'Saída' : 'Entrada'}</div>
                <div><strong>Ambiente:</strong> {nfeSelecionada.ambiente === 'producao' ? 'Produção' : 'Homologação'}</div>
                {nfeSelecionada.protocolo_autorizacao && (
                  <div><strong>Protocolo:</strong> {nfeSelecionada.protocolo_autorizacao}</div>
                )}
                {nfeSelecionada.mensagem_rejeicao && (
                  <div className="col-span-2 text-red-600">
                    <strong>Rejeição:</strong> [{nfeSelecionada.codigo_rejeicao}] {nfeSelecionada.mensagem_rejeicao}
                  </div>
                )}
              </div>

              {/* Destinatário */}
              {nfeSelecionada.destinatario && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium mb-2">Destinatário</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Nome:</strong> {nfeSelecionada.destinatario.nome_razao_social}</div>
                    <div><strong>CNPJ/CPF:</strong> {nfeSelecionada.destinatario.cnpj_cpf}</div>
                  </div>
                </div>
              )}

              {/* Produtos */}
              <div className="border rounded-lg p-3">
                <h4 className="font-medium mb-2">Produtos ({nfeSelecionada.produtos?.length || 0} itens)</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">V. Unit.</TableHead>
                        <TableHead className="text-right">V. Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(nfeSelecionada.produtos || []).map((prod: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{prod.descricao}</TableCell>
                          <TableCell className="text-right">{prod.quantidade_comercial}</TableCell>
                          <TableCell className="text-right">{Number(prod.valor_unitario_comercial).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">{Number(prod.valor_total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totais */}
              <div className="border rounded-lg p-3">
                <h4 className="font-medium mb-2">Totais</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Base Cálculo ICMS: R$ {(nfeSelecionada.base_calculo_icms || 0).toFixed(2)}</div>
                  <div>Valor ICMS: R$ {(nfeSelecionada.total_icms || 0).toFixed(2)}</div>
                  <div>Valor Produtos: R$ {(nfeSelecionada.total_produtos || 0).toFixed(2)}</div>
                  <div>Valor IPI: R$ {(nfeSelecionada.total_ipi || 0).toFixed(2)}</div>
                  <div>Valor PIS: R$ {(nfeSelecionada.total_pis || 0).toFixed(2)}</div>
                  <div>Valor COFINS: R$ {(nfeSelecionada.total_cofins || 0).toFixed(2)}</div>
                  <div className="col-span-2 text-lg font-bold text-right">
                    Valor Total da Nota: R$ {(nfeSelecionada.total_nota || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {nfeSelecionada?.status === 'autorizada' && (
              <>
                <Button variant="outline" onClick={() => imprimirDANFE(nfeSelecionada.id)} className="gap-2">
                  <Printer className="h-4 w-4" /> DANFE
                </Button>
                <Button variant="outline" onClick={() => downloadXML(nfeSelecionada.id, 'autorizado')} className="gap-2">
                  <Download className="h-4 w-4" /> XML
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cancelar NF-e */}
      <Dialog open={dialogCancelar} onOpenChange={setDialogCancelar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Cancelar NF-e Nº {String(nfeSelecionada?.numero || '').padStart(9, '0')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Atenção: Esta ação não pode ser desfeita. Informe uma justificativa com no mínimo 15 caracteres.
            </p>
            <Textarea
              placeholder="Ex: Nota emitida com dados incorretos do destinatário..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={4}
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground text-right">{justificativa.length}/255 caracteres</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCancelar(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleCancelar}
              disabled={justificativa.length < 15 || cancelando}
              className="gap-2"
            >
              {cancelando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
      </MainLayout>
    </ProtectedRoute>
  );
}


