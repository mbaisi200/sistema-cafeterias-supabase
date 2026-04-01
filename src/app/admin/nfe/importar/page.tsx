'use client';

import React, { useState, useRef, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useProdutos, useCategorias } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  parseNFeXML,
  matchProdutoByCodigoOuEan,
  formatarCNPJ,
  formatarCEP,
  type NFeParsed,
  type NFeProduto,
} from '@/lib/nfe-parser';
import {
  Upload,
  FileText,
  FileUp,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
  ChevronRight,
  Tag,
  Calendar,
  Percent,
  DollarSign,
  ArrowDownToLine,
  Warehouse,
  CreditCard,
  Search,
} from 'lucide-react';

// =====================================================
// Types
// =====================================================

interface ProdutoImportacao {
  nfeProduto: NFeProduto;
  status: 'cadastrado' | 'novo';
  produtoId?: string;
  produtoNome?: string;
  categoriaId?: string;
  selecionado: boolean;
}

// =====================================================
// Page Component
// =====================================================

export default function NFeImportarPage() {
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { categorias, loading: loadingCategorias } = useCategorias();
  const { user, empresaId } = useAuth();
  const { toast } = useToast();

  // Estado
  const [nfeData, setNfeData] = useState<NFeParsed | null>(null);
  const [produtosImportacao, setProdutosImportacao] = useState<ProdutoImportacao[]>([]);
  const [dialogPreview, setDialogPreview] = useState(false);
  const [dialogSucesso, setDialogSucesso] = useState(false);
  const [importando, setImportando] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Opções de importação
  const [criarFornecedor, setCriarFornecedor] = useState(true);
  const [atualizarEstoque, setAtualizarEstoque] = useState(true);
  const [gerarContaPagar, setGerarContaPagar] = useState(true);
  const [markupPercentual, setMarkupPercentual] = useState('30');

  // Data de vencimento padrão: 30 dias a partir de hoje
  const defaultVencimento = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }, []);
  const [vencimentoConta, setVencimentoConta] = useState(defaultVencimento);

  // Fornecedor encontrado
  const [fornecedorEncontrado, setFornecedorEncontrado] = useState<any>(null);
  const [verificandoFornecedor, setVerificandoFornecedor] = useState(false);

  // Resultado da importação
  const [resultadoImportacao, setResultadoImportacao] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // =====================================================
  // File Handling
  // =====================================================

  const processarArquivo = async (file: File) => {
    if (!file.name.endsWith('.xml')) {
      setParseError('Por favor, selecione um arquivo .xml');
      return;
    }

    setParseError('');
    setFileName(file.name);

    try {
      const texto = await file.text();
      const dados = parseNFeXML(texto);
      setNfeData(dados);

      // Mapear produtos com status de cadastro
      const produtosMapeados: ProdutoImportacao[] = dados.produtos.map((p) => {
        const existente = produtos.find((prod) =>
          matchProdutoByCodigoOuEan(prod, p)
        );
        return {
          nfeProduto: p,
          status: existente ? 'cadastrado' : 'novo',
          produtoId: existente?.id,
          produtoNome: existente?.nome,
          selecionado: true,
        };
      });

      setProdutosImportacao(produtosMapeados);

      // Verificar fornecedor
      if (dados.emitente?.cnpj) {
        verificarFornecedorExistente(dados.emitente.cnpj);
      } else {
        setFornecedorEncontrado(null);
      }

      // Abrir dialog de preview
      setDialogPreview(true);
    } catch (error: any) {
      setParseError(error.message || 'Erro ao processar o arquivo XML');
    }
  };

  const verificarFornecedorExistente = async (cnpj: string) => {
    setVerificandoFornecedor(true);
    try {
      const { buscarFornecedorPorCNPJ } = await import('@/hooks/useFirestore');
      const fornecedor = await buscarFornecedorPorCNPJ(empresaId || '', cnpj);
      setFornecedorEncontrado(fornecedor || null);
    } catch {
      setFornecedorEncontrado(null);
    } finally {
      setVerificandoFornecedor(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processarArquivo(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processarArquivo(file);
  };

  // =====================================================
  // Toggle produto selecionado
  // =====================================================

  const toggleProduto = (index: number) => {
    setProdutosImportacao((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, selecionado: !p.selecionado } : p
      )
    );
  };

  const toggleTodos = (selecionado: boolean) => {
    setProdutosImportacao((prev) =>
      prev.map((p) => ({ ...p, selecionado }))
    );
  };

  const updateCategoria = (index: number, categoriaId: string) => {
    setProdutosImportacao((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, categoriaId: categoriaId || undefined } : p
      )
    );
  };

  // =====================================================
  // Confirmar Importação
  // =====================================================

  const confirmarImportacao = async () => {
    if (!nfeData || !empresaId) return;

    const produtosSelecionados = produtosImportacao.filter(
      (p) => p.selecionado
    );
    if (produtosSelecionados.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Selecione ao menos um produto para importar',
      });
      return;
    }

    // Verificar se todos os novos produtos têm categoria
    const novosSemCategoria = produtosSelecionados.filter(
      (p) => p.status === 'novo' && !p.categoriaId
    );
    if (novosSemCategoria.length > 0) {
      toast({
        variant: 'destructive',
        title: `${novosSemCategoria.length} produto(s) novo(s) sem categoria`,
        description: 'Selecione uma categoria para todos os novos produtos.',
      });
      return;
    }

    setImportando(true);

    try {
      const response = await fetch('/api/nfe/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          userId: user?.id,
          userName: user?.nome,
          nfeData,
          opcoes: {
            criarFornecedor,
            atualizarEstoque,
            gerarContaPagar,
            vencimentoConta,
            markupPercentual: parseFloat(markupPercentual) || 30,
          },
          produtosImportar: produtosSelecionados.map((p) => ({
            codigo: p.nfeProduto.codigo,
            ean: p.nfeProduto.ean,
            descricao: p.nfeProduto.descricao,
            unidade: p.nfeProduto.unidade,
            quantidade: p.nfeProduto.quantidade,
            valorUnitario: p.nfeProduto.valorUnitario,
            valorTotal: p.nfeProduto.valorTotal,
            status: p.status,
            produtoId: p.produtoId,
            categoriaId: p.categoriaId,
          })),
        }),
      });

      const data = await response.json();

      if (!data.sucesso) {
        throw new Error(data.erro || 'Erro ao importar');
      }

      setResultadoImportacao(data.resultado);
      setDialogPreview(false);
      setDialogSucesso(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: error.message,
      });
    } finally {
      setImportando(false);
    }
  };

  // =====================================================
  // Reset
  // =====================================================

  const handleReset = () => {
    setNfeData(null);
    setProdutosImportacao([]);
    setDialogPreview(false);
    setDialogSucesso(false);
    setResultadoImportacao(null);
    setFileName('');
    setParseError('');
    setFornecedorEncontrado(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // =====================================================
  // Contadores
  // =====================================================

  const totalSelecionados = produtosImportacao.filter((p) => p.selecionado).length;
  const novosCount = produtosImportacao.filter((p) => p.status === 'novo' && p.selecionado).length;
  const cadastradosCount = produtosImportacao.filter((p) => p.status === 'cadastrado' && p.selecionado).length;
  const novosSemCategoria = produtosImportacao.filter(
    (p) => p.status === 'novo' && p.selecionado && !p.categoriaId
  );

  // =====================================================
  // Render
  // =====================================================

  if (loadingProdutos || loadingCategorias) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'NFe' }, { title: 'Importar XML' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'NFe' }, { title: 'Importar XML' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileUp className="h-8 w-8 text-orange-500" />
              Importar Nota Fiscal de Entrada
            </h1>
            <p className="text-muted-foreground mt-1">
              Importe produtos de uma NFe XML automaticamente. Crie produtos, atualize estoque e gere contas a pagar.
            </p>
          </div>

          {/* Upload Area */}
          <Card>
            <CardContent className="pt-6">
              <div
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-orange-500 bg-orange-50'
                    : fileName
                    ? 'border-green-400 bg-green-50'
                    : 'border-muted-foreground/25 hover:border-orange-400 hover:bg-orange-50/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {fileName ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-700">{fileName}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Clique ou arraste outro arquivo para substituir
                      </p>
                    </div>
                    {nfeData && (
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline" className="text-sm">
                          <FileText className="h-3 w-3 mr-1" />
                          NFe {nfeData.numero}/{nfeData.serie}
                        </Badge>
                        <Badge variant="outline" className="text-sm">
                          <Package className="h-3 w-3 mr-1" />
                          {nfeData.produtos.length} produto(s)
                        </Badge>
                        <Badge variant="outline" className="text-sm font-semibold text-green-600">
                          <DollarSign className="h-3 w-3 mr-1" />
                          R$ {nfeData.valorTotal.toFixed(2)}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        Arraste o arquivo XML da NFe aqui
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        ou clique para selecionar o arquivo
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Apenas arquivos .xml de Nota Fiscal Eletrônica
                    </p>
                  </div>
                )}
              </div>

              {parseError && (
                <Alert variant="destructive" className="mt-4">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Erro ao processar XML</AlertTitle>
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              {nfeData && !dialogPreview && (
                <div className="flex justify-end mt-4">
                  <Button onClick={() => setDialogPreview(true)} className="gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Revisar e Importar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instruções */}
          {!nfeData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Como funciona</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold">1. Envie o XML</p>
                      <p className="text-sm text-muted-foreground">
                        Arraste ou selecione o arquivo XML da nota fiscal de entrada
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Search className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">2. Revise os dados</p>
                      <p className="text-sm text-muted-foreground">
                        Confira produtos, fornecedor e opções de importação
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">3. Confirme</p>
                      <p className="text-sm text-muted-foreground">
                        Produtos, estoque e contas a pagar serão criados automaticamente
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ============================================= */}
        {/* DIALOG PREVIEW DA IMPORTAÇÃO                 */}
        {/* ============================================= */}
        <Dialog open={dialogPreview} onOpenChange={setDialogPreview}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Revisar Importação - NFe {nfeData?.numero}/{nfeData?.serie}
              </DialogTitle>
              <DialogDescription>
                Verifique os dados da nota fiscal antes de confirmar a importação
              </DialogDescription>
            </DialogHeader>

            {nfeData && (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Dados da NFe */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Número</p>
                    <p className="font-bold text-lg">{nfeData.numero}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Série</p>
                    <p className="font-bold text-lg">{nfeData.serie}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Emissão</p>
                    <p className="font-bold text-lg">
                      {nfeData.dataEmissao.toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="font-bold text-lg text-green-600">
                      R$ {nfeData.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Chave de acesso */}
                {nfeData.chaveAcesso && (
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">
                      Chave de Acesso:{' '}
                      <span className="font-mono text-xs">{nfeData.chaveAcesso}</span>
                    </p>
                  </div>
                )}

                {/* Fornecedor */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Emitente / Fornecedor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold">{nfeData.emitente.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          CNPJ: {formatarCNPJ(nfeData.emitente.cnpj)}
                        </p>
                        {nfeData.emitente.ie && (
                          <p className="text-sm text-muted-foreground">
                            IE: {nfeData.emitente.ie}
                          </p>
                        )}
                        {nfeData.emitente.telefone && (
                          <p className="text-sm text-muted-foreground">
                            Tel: {nfeData.emitente.telefone}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>
                          {nfeData.emitente.logradouro}
                          {nfeData.emitente.numero ? `, ${nfeData.emitente.numero}` : ''}
                          {nfeData.emitente.complemento ? ` - ${nfeData.emitente.complemento}` : ''}
                        </p>
                        <p>
                          {nfeData.emitente.bairro} - {nfeData.emitente.cidade}/{nfeData.emitente.uf}
                        </p>
                        {nfeData.emitente.cep && (
                          <p>CEP: {formatarCEP(nfeData.emitente.cep)}</p>
                        )}
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* Status do fornecedor */}
                    <div className="flex items-center justify-between">
                      {verificandoFornecedor ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verificando fornecedor...
                        </div>
                      ) : fornecedorEncontrado ? (
                        <Badge className="bg-green-500 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Fornecedor cadastrado: {fornecedorEncontrado.nome}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Fornecedor não cadastrado no sistema
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela de Produtos */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Produtos ({produtosImportacao.length})
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {novosCount} novo(s)
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {cadastradosCount} cadastrado(s)
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTodos(true)}
                        >
                          Todos
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setProdutosImportacao((prev) =>
                              prev.map((p) => ({ ...p, selecionado: false }))
                            )
                          }
                        >
                          Nenhum
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-80 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={
                                  totalSelecionados === produtosImportacao.length &&
                                  produtosImportacao.length > 0
                                }
                                onCheckedChange={(checked) =>
                                  setProdutosImportacao((prev) =>
                                    prev.map((p) => ({ ...p, selecionado: !!checked }))
                                  )
                                }
                              />
                            </TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-center">Qtd</TableHead>
                            <TableHead className="text-right">Unitário</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Categoria</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {produtosImportacao.map((item, index) => (
                            <TableRow
                              key={index}
                              className={!item.selecionado ? 'opacity-50' : ''}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={item.selecionado}
                                  onCheckedChange={() => toggleProduto(index)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {item.nfeProduto.codigo || '-'}
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[250px]">
                                  <p className="font-medium text-sm truncate">
                                    {item.nfeProduto.descricao}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.nfeProduto.ncm ? `NCM: ${item.nfeProduto.ncm}` : ''}
                                    {item.nfeProduto.cfop ? ` • CFOP: ${item.nfeProduto.cfop}` : ''}
                                  </p>
                                  {item.nfeProduto.ean && (
                                    <p className="text-xs text-muted-foreground">
                                      EAN: {item.nfeProduto.ean}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm">
                                {item.nfeProduto.quantidade} {item.nfeProduto.unidade}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                R$ {item.nfeProduto.valorUnitario.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold">
                                R$ {item.nfeProduto.valorTotal.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {item.status === 'cadastrado' ? (
                                  <Badge className="bg-green-500 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Cadastrado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Novo
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.status === 'novo' ? (
                                  <Select
                                    value={item.categoriaId || ''}
                                    onValueChange={(v) => updateCategoria(index, v)}
                                  >
                                    <SelectTrigger className="w-32 h-8 text-xs">
                                      <SelectValue placeholder="Categoria *" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {categorias.map((cat: any) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                          <div className="flex items-center gap-1.5">
                                            <div
                                              className="h-2.5 w-2.5 rounded-full"
                                              style={{ backgroundColor: cat.cor || '#6B7280' }}
                                            />
                                            <span className="truncate">{cat.nome}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {item.produtoNome || '-'}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {produtosImportacao.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mb-2 opacity-30" />
                        <p>Nenhum produto encontrado na NFe</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Opções de Importação */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Opções de Importação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Criar Fornecedor */}
                      <div className="flex items-start gap-3 p-3 rounded-lg border">
                        <Checkbox
                          id="criarFornecedor"
                          checked={criarFornecedor}
                          onCheckedChange={(checked) => setCriarFornecedor(!!checked)}
                        />
                        <div className="flex-1">
                          <Label htmlFor="criarFornecedor" className="font-semibold cursor-pointer flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5" />
                            Cadastrar Fornecedor
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {!fornecedorEncontrado
                              ? 'Criará um novo cadastro com os dados do emitente da NFe'
                              : 'Fornecedor já cadastrado no sistema'}
                          </p>
                        </div>
                      </div>

                      {/* Atualizar Estoque */}
                      <div className="flex items-start gap-3 p-3 rounded-lg border">
                        <Checkbox
                          id="atualizarEstoque"
                          checked={atualizarEstoque}
                          onCheckedChange={(checked) => setAtualizarEstoque(!!checked)}
                        />
                        <div className="flex-1">
                          <Label htmlFor="atualizarEstoque" className="font-semibold cursor-pointer flex items-center gap-1.5">
                            <Warehouse className="h-3.5 w-3.5" />
                            Atualizar Estoque dos Produtos
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Adiciona a quantidade ao estoque atual de cada produto selecionado
                          </p>
                        </div>
                      </div>

                      {/* Gerar Conta a Pagar */}
                      <div className="flex items-start gap-3 p-3 rounded-lg border">
                        <Checkbox
                          id="gerarContaPagar"
                          checked={gerarContaPagar}
                          onCheckedChange={(checked) => setGerarContaPagar(!!checked)}
                        />
                        <div className="flex-1">
                          <Label htmlFor="gerarContaPagar" className="font-semibold cursor-pointer flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5" />
                            Gerar Conta a Pagar
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Cria uma conta a pagar com o valor total da NFe
                          </p>
                          {gerarContaPagar && (
                            <div className="mt-2">
                              <Label className="text-xs">Vencimento</Label>
                              <Input
                                type="date"
                                value={vencimentoConta}
                                onChange={(e) => setVencimentoConta(e.target.value)}
                                className="h-8 text-xs w-44"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Markup */}
                      <div className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="flex-1">
                          <Label className="font-semibold flex items-center gap-1.5">
                            <Percent className="h-3.5 w-3.5" />
                            Margem de Lucro (Markup)
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                            Usado para calcular preço de venda = custo × (1 + markup%)
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="999"
                              value={markupPercentual}
                              onChange={(e) => setMarkupPercentual(e.target.value)}
                              className="h-8 w-24 text-sm"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              → Preço de venda = custo × {(1 + (parseFloat(markupPercentual) || 0) / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Avisos */}
                    {novosSemCategoria.length > 0 && (
                      <Alert className="border-orange-300 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertTitle className="text-orange-700">
                          Atenção: Produtos novos sem categoria
                        </AlertTitle>
                        <AlertDescription className="text-orange-600">
                          Selecione uma categoria para os {novosSemCategoria.length} produto(s) novo(s) antes de importar.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Resumo */}
                    <div className="bg-muted rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Produtos selecionados</p>
                          <p className="font-bold text-lg">{totalSelecionados}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Novos a cadastrar</p>
                          <p className="font-bold text-lg text-orange-600">{novosCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Estoque a atualizar</p>
                          <p className="font-bold text-lg text-blue-600">
                            {atualizarEstoque ? totalSelecionados : 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valor total</p>
                          <p className="font-bold text-lg text-green-600">
                            R${' '}
                            {produtosImportacao
                              .filter((p) => p.selecionado)
                              .reduce((acc, p) => acc + p.nfeProduto.valorTotal, 0)
                              .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialogPreview(false)}>
                Voltar
              </Button>
              <Button
                onClick={confirmarImportacao}
                disabled={importando || totalSelecionados === 0}
                className="gap-2 min-w-[200px]"
              >
                {importando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownToLine className="h-4 w-4" />
                )}
                {importando ? 'Importando...' : 'Confirmar Importação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================= */}
        {/* DIALOG SUCESSO                               */}
        {/* ============================================= */}
        <Dialog open={dialogSucesso} onOpenChange={setDialogSucesso}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                Importação Concluída!
              </DialogTitle>
              <DialogDescription>
                A NFe foi importada com sucesso. Veja o resumo abaixo.
              </DialogDescription>
            </DialogHeader>

            {resultadoImportacao && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Produtos Criados */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <Package className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {resultadoImportacao.produtosCriados}
                    </p>
                    <p className="text-xs text-muted-foreground">Produtos criados</p>
                  </div>

                  {/* Estoque Atualizado */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <Warehouse className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">
                      {resultadoImportacao.estoqueAtualizado}
                    </p>
                    <p className="text-xs text-muted-foreground">Estoque atualizado</p>
                  </div>

                  {/* Conta Gerada */}
                  <div className={`border rounded-lg p-4 text-center ${
                    resultadoImportacao.contaGerada
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-muted border-muted'
                  }`}>
                    <CreditCard className={`h-8 w-8 mx-auto mb-2 ${
                      resultadoImportacao.contaGerada ? 'text-purple-600' : 'text-muted-foreground'
                    }`} />
                    <p className={`text-2xl font-bold ${
                      resultadoImportacao.contaGerada ? 'text-purple-600' : 'text-muted-foreground'
                    }`}>
                      {resultadoImportacao.contaGerada ? 'Sim' : 'Não'}
                    </p>
                    <p className="text-xs text-muted-foreground">Conta a pagar gerada</p>
                  </div>

                  {/* Fornecedor */}
                  <div className={`border rounded-lg p-4 text-center ${
                    resultadoImportacao.fornecedorCriado
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-muted border-muted'
                  }`}>
                    <Truck className={`h-8 w-8 mx-auto mb-2 ${
                      resultadoImportacao.fornecedorCriado ? 'text-orange-600' : 'text-muted-foreground'
                    }`} />
                    <p className={`text-sm font-bold ${
                      resultadoImportacao.fornecedorCriado ? 'text-orange-600' : 'text-muted-foreground'
                    }`}>
                      {resultadoImportacao.fornecedorCriado ? 'Criado' : 'Existente'}
                    </p>
                    <p className="text-xs text-muted-foreground">Fornecedor</p>
                  </div>
                </div>

                {/* Erros */}
                {resultadoImportacao.erros.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Alguns itens não foram processados</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                        {resultadoImportacao.erros.map((erro: string, i: number) => (
                          <li key={i}>{erro}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>
                Importar outra NFe
              </Button>
              <Button
                onClick={() => {
                  setDialogSucesso(false);
                  handleReset();
                }}
              >
                Concluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
