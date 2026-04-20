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
import { useProdutos, useCategorias } from '@/hooks/useSupabase';
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
  Eye,
  Info,
  ShieldCheck,
  FilePlus2,
  RefreshCw,
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
  unidadesPorCaixa: number;  // conversion factor (units per box)
  markupPercentual: number; // per-product markup percentage
  irParaEstoque: boolean; // whether to update stock for this item
  precoVenda: number;  // per-item selling price (editable)
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
  const [dialogDetalhes, setDialogDetalhes] = useState<number | null>(null);
  const [dialogUnidadesCaixa, setDialogUnidadesCaixa] = useState(false);
  const [produtosSemConversao, setProdutosSemConversao] = useState<number[]>([]);
  const [importando, setImportando] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Opções de importação
  const [criarFornecedor, setCriarFornecedor] = useState(true);
  const [atualizarEstoque, setAtualizarEstoque] = useState(true);
  const [atualizarDadosFiscais, setAtualizarDadosFiscais] = useState(true);
  const [gerarContaPagar, setGerarContaPagar] = useState(true);
  const [markupDefault, setMarkupDefault] = useState('30');

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

  // NFE duplicada (verificação frontend)
  const [nfeDuplicada, setNfeDuplicada] = useState<any>(null);
  const [verificandoDuplicidade, setVerificandoDuplicidade] = useState(false);

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

      // === VERIFICAR FORNECEDOR ANTES DO MATCHING ===
      // Isso é necessário para que o matchProdutoByCodigoOuEan possa
      // diferenciar produtos com o mesmo código de fornecedores diferentes
      let fornecedorId: string | null = null;
      if (dados.emitente?.cnpj) {
        try {
          const { buscarFornecedorPorCNPJ } = await import('@/hooks/useSupabase');
          const fornecedor = await buscarFornecedorPorCNPJ(empresaId || '', dados.emitente.cnpj);
          if (fornecedor) {
            fornecedorId = fornecedor.id;
            setFornecedorEncontrado(fornecedor);
          } else {
            setFornecedorEncontrado(null);
          }
        } catch {
          setFornecedorEncontrado(null);
        }
      } else {
        setFornecedorEncontrado(null);
      }

      // Mapear produtos com status de cadastro (agora com fornecedorId)
      const produtosMapeados: ProdutoImportacao[] = dados.produtos.map((p) => {
        const existente = produtos.find((prod) =>
          matchProdutoByCodigoOuEan(prod, p, fornecedorId)
        );
        // Auto-detect: if commercial unit is CX/PAC/FARDO and tributary unit is UN,
        // use qTrib/qCom as conversion factor
        let unidadesPorCaixa = 0;
        const uCom = (p.unidade || '').toUpperCase();
        const uTrib = (p.unidadeTributavel || '').toUpperCase();
        if (uCom !== uTrib && uTrib === 'UN' && p.quantidade > 0 && p.quantidadeTributavel > 0) {
          unidadesPorCaixa = Math.round(p.quantidadeTributavel / p.quantidade);
        }
        if (unidadesPorCaixa < 1) unidadesPorCaixa = 0;

        const markup = parseFloat(markupDefault) || 30;
        return {
          nfeProduto: p,
          status: existente ? 'cadastrado' : 'novo',
          produtoId: existente?.id,
          produtoNome: existente?.nome,
          selecionado: true,
          irParaEstoque: true,
          unidadesPorCaixa,
          markupPercentual: markup,
          precoVenda: arredondarPreco(p.valorUnitario * (1 + markup / 100)),
        };
      });

      setProdutosImportacao(produtosMapeados);

      // Verificar produtos sem conversão automática (precisam deinput manual)
      const semConversao = produtosMapeados
        .map((p, idx) => (p.unidadesPorCaixa === 0 ? idx : -1))
        .filter((idx) => idx >= 0);
      
      if (semConversao.length > 0) {
        setProdutosSemConversao(semConversao);
        // Não abre preview - abre dialog de conversão primeiro
      } else {
        setProdutosSemConversao([]);
        // Verificar se NFe já foi importada
        if (dados.chaveAcesso && empresaId) {
          verificarNFeDuplicada(dados.chaveAcesso);
        } else {
          setNfeDuplicada(null);
        }
        // Abrir dialog de preview
        setDialogPreview(true);
      }
    } catch (error: any) {
      setParseError(error.message || 'Erro ao processar o arquivo XML');
    }
  };

  const verificarFornecedorExistente = async (cnpj: string) => {
    setVerificandoFornecedor(true);
    try {
      const { buscarFornecedorPorCNPJ } = await import('@/hooks/useSupabase');
      const fornecedor = await buscarFornecedorPorCNPJ(empresaId || '', cnpj);
      setFornecedorEncontrado(fornecedor || null);
    } catch {
      setFornecedorEncontrado(null);
    } finally {
      setVerificandoFornecedor(false);
    }
  };

  const verificarNFeDuplicada = async (chaveAcesso: string) => {
    setVerificandoDuplicidade(true);
    setNfeDuplicada(null);
    try {
      const response = await fetch('/api/nfe/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          _checkOnly: true,
          nfeData: { chaveAcesso },
        }),
      });
      if (response.status === 409) {
        const data = await response.json();
        setNfeDuplicada(data.detalhes || {});
      }
    } catch {
      // Silently ignore - the API check will happen on confirm anyway
    } finally {
      setVerificandoDuplicidade(false);
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

  const updateUnidadesPorCaixa = (index: number, value: string) => {
    const num = parseInt(value) || 0;
    setProdutosImportacao((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, unidadesPorCaixa: num } : p
      )
    );
  };

  const updatePrecoVenda = (index: number, value: string) => {
    const num = parseFloat(value) || 0;
    setProdutosImportacao((prev) =>
      prev.map((p, i) =>
        i === index
          ? (() => {
              const custo = p.nfeProduto.valorUnitario;
              const markupCalc = custo > 0 ? ((num / custo) - 1) * 100 : 0;
              return { ...p, precoVenda: num, markupPercentual: Math.round(markupCalc * 10) / 10 };
            })()
          : p
      )
    );
  };

  const updateMarkupProduto = (index: number, value: string) => {
    const markup = parseFloat(value) || 0;
    setProdutosImportacao((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              markupPercentual: markup,
              precoVenda: arredondarPreco(p.nfeProduto.valorUnitario * (1 + markup / 100)),
            }
          : p
      )
    );
  };

  // Helper: round price to nearest R$ 0.05
  const arredondarPreco = (v: number): number => Math.round(v / 0.05) * 0.05;

  // Toggle irParaEstoque for a single item
  const updateIrParaEstoque = (index: number, value: boolean) => {
    setProdutosImportacao((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, irParaEstoque: value } : p
      )
    );
  };

  // Toggle irParaEstoque for all items
  const toggleIrParaEstoqueTodos = (value: boolean) => {
    setProdutosImportacao((prev) =>
      prev.map((p) => ({ ...p, irParaEstoque: value }))
    );
  };

  // Apply default markup to all products
  const applyMarkupAll = () => {
    const markup = parseFloat(markupDefault) || 30;
    setProdutosImportacao((prev) =>
      prev.map((p) => ({
        ...p,
        markupPercentual: markup,
        precoVenda: arredondarPreco(p.nfeProduto.valorUnitario * (1 + markup / 100)),
      }))
    );
  };

  // =====================================================
  // Confirmar Importação
  // =====================================================

  const confirmarImportacao = async () => {
    if (!nfeData || !empresaId) return;

    // BLOQUEAR importação se NFe duplicada foi detectada
    if (nfeDuplicada) {
      toast({
        variant: 'destructive',
        title: '⚠️ NFe já importada!',
        description: `A NFe ${nfeDuplicada.numero}/${nfeDuplicada.serie} já foi importada em ${nfeDuplicada.importadoEm}. Não é possível importar novamente.`,
        duration: 8000,
      });
      return;
    }

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
            atualizarDadosFiscais,
            gerarContaPagar,
            vencimentoConta,
            markupPercentual: parseFloat(markupDefault) || 30,
          },
          produtosImportar: produtosSelecionados.map((p) => ({
            codigo: p.nfeProduto.codigo,
            ean: p.nfeProduto.ean,
            descricao: p.nfeProduto.descricao,
            unidade: p.nfeProduto.unidade,
            unidadeTributavel: p.nfeProduto.unidadeTributavel,
            quantidade: p.nfeProduto.quantidade,
            valorUnitario: p.nfeProduto.valorUnitario,
            valorTotal: p.nfeProduto.valorTotal,
            status: p.status,
            produtoId: p.produtoId,
            categoriaId: p.categoriaId,
            // Campos fiscais completos
            ncm: p.nfeProduto.ncm,
            cest: p.nfeProduto.cest,
            cfop: p.nfeProduto.cfop,
            cst: p.nfeProduto.cst,
            csosn: p.nfeProduto.csosn,
            origem: p.nfeProduto.origem,
            icmsAliquota: p.nfeProduto.icmsAliquota,
            icmsValor: p.nfeProduto.icmsValor,
            icmsBaseCalculo: p.nfeProduto.icmsBaseCalculo,
            ipiAliquota: p.nfeProduto.ipiAliquota,
            ipiValor: p.nfeProduto.ipiValor,
            pisAliquota: p.nfeProduto.pisAliquota,
            pisValor: p.nfeProduto.pisValor,
            cofinsAliquota: p.nfeProduto.cofinsAliquota,
            cofinsValor: p.nfeProduto.cofinsValor,
            unidadesPorCaixa: p.unidadesPorCaixa || 0,
            precoVenda: p.precoVenda,
            irParaEstoque: p.irParaEstoque,
          })),
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        // NFe já importada - erro específico de duplicidade
        const detalhes = data.detalhes || {};
        setDialogPreview(false);
        toast({
          variant: 'destructive',
          title: '⚠️ NFe já importada!',
          description: `A NFe ${detalhes.numero}/${detalhes.serie} (Chave: ${detalhes.chave}) já foi importada em ${detalhes.importadoEm}. Dados duplicados não foram criados.`,
          duration: 8000,
        });
        return;
      }

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
    setNfeDuplicada(null);
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
  const estoqueCount = produtosImportacao.filter((p) => p.irParaEstoque && p.selecionado).length;
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
              Importe produtos de uma NFe XML automaticamente. Crie produtos com dados fiscais completos, atualize estoque e gere contas a pagar.
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
                  <Button onClick={() => setDialogPreview(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
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
                        Confira produtos, fornecedor, dados fiscais e opções de importação
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
                        Produtos, estoque, dados fiscais e contas a pagar serão criados automaticamente
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
          <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
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

                {/* Natureza da operação */}
                {nfeData.naturezaOperacao && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <p className="text-xs text-blue-600">
                      <span className="font-semibold">Natureza da Operação:</span>{' '}
                      {nfeData.naturezaOperacao}
                    </p>
                  </div>
                )}

                {/* Chave de acesso */}
                {nfeData.chaveAcesso && (
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">
                      Chave de Acesso:{' '}
                      <span className="font-mono text-xs">{nfeData.chaveAcesso}</span>
                    </p>
                  </div>
                )}

                {/* Aviso de NFe Duplicada */}
                {verificandoDuplicidade && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                    Verificando se esta NFe já foi importada...
                  </div>
                )}
                {!verificandoDuplicidade && nfeDuplicada && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <p className="font-semibold text-red-700">
                        ⚠️ Esta NFe já foi importada!
                      </p>
                    </div>
                    <div className="text-sm text-red-600 space-y-1">
                      <p><strong>Número:</strong> {nfeDuplicada.numero}/{nfeDuplicada.serie}</p>
                      <p><strong>Importada em:</strong> {nfeDuplicada.importadoEm}</p>
                      <p><strong>Chave:</strong> <span className="font-mono text-xs">{nfeDuplicada.chave}</span></p>
                    </div>
                    <p className="text-sm text-red-600 font-medium">
                      Se continuar, os produtos e estoque serão duplicados. Verifique antes de prosseguir.
                    </p>
                  </div>
                )}

                {/* ============================================= */}
                {/* FORNECEDOR                                    */}
                {/* ============================================= */}
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
                        {nfeData.emitente.email && (
                          <p className="text-sm text-muted-foreground">
                            Email: {nfeData.emitente.email}
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
                        <div className="flex items-center gap-3">
                          <Badge className="bg-green-500 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Fornecedor já cadastrado: {fornecedorEncontrado.nome}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Não será duplicado
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Fornecedor NÃO cadastrado
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Será criado automaticamente com os dados acima
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* ============================================= */}
                {/* TABELA DE PRODUTOS                            */}
                {/* ============================================= */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Produtos ({produtosImportacao.length})
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs text-orange-600">
                          {novosCount} novo(s)
                        </Badge>
                        <Badge variant="outline" className="text-xs text-green-600">
                          {cadastradosCount} cadastrado(s)
                        </Badge>
                        <Badge variant="outline" className="text-xs text-cyan-600">
                          <Package className="h-3 w-3 mr-1" />
                          {estoqueCount} estoque
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => toggleTodos(true)}>
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
                    <div className="max-h-[500px] overflow-y-auto">
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
                            <TableHead className="text-center" title="Ir para Estoque">
                              <div className="flex items-center justify-center gap-1">
                                <Package className="h-3 w-3" />
                                <span className="text-xs">Estoque</span>
                              </div>
                              <div className="flex justify-center mt-1">
                                <Checkbox
                                  checked={
                                    estoqueCount === totalSelecionados &&
                                    totalSelecionados > 0
                                  }
                                  onCheckedChange={(checked) => toggleIrParaEstoqueTodos(!!checked)}
                                  className="h-4 w-4"
                                />
                              </div>
                            </TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-center">Qtd</TableHead>
                            <TableHead className="text-center">Unid/Cx</TableHead>
                            <TableHead className="text-right">Custo</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center">Markup %</TableHead>
                            <TableHead className="text-right">P. Venda</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Categoria</TableHead>
                            <TableHead className="w-10"></TableHead>
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
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={item.irParaEstoque}
                                  onCheckedChange={(checked) => updateIrParaEstoque(index, !!checked)}
                                  disabled={!item.selecionado}
                                  className="h-4 w-4"
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {item.nfeProduto.codigo || '-'}
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[280px]">
                                  <p className="font-medium text-sm truncate">
                                    {item.nfeProduto.descricao}
                                  </p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                    {item.nfeProduto.ncm && item.nfeProduto.ncm !== '00000000' && (
                                      <span className="text-xs text-muted-foreground">
                                        NCM: {item.nfeProduto.ncm}
                                      </span>
                                    )}
                                    {item.nfeProduto.cest && (
                                      <span className="text-xs text-muted-foreground">
                                        CEST: {item.nfeProduto.cest}
                                      </span>
                                    )}
                                    {item.nfeProduto.cfop && (
                                      <span className="text-xs text-muted-foreground">
                                        CFOP: {item.nfeProduto.cfop}
                                      </span>
                                    )}
                                    {item.nfeProduto.cst && (
                                      <span className="text-xs text-muted-foreground">
                                        CST: {item.nfeProduto.cst}
                                      </span>
                                    )}
                                    {item.nfeProduto.csosn && (
                                      <span className="text-xs text-muted-foreground">
                                        CSOSN: {item.nfeProduto.csosn}
                                      </span>
                                    )}
                                  </div>
                                  {item.nfeProduto.ean && item.nfeProduto.ean !== 'SEM GTIN' && (
                                    <p className="text-xs text-muted-foreground">
                                      EAN: {item.nfeProduto.ean}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm">
                                <div>
                                  <span>{item.nfeProduto.quantidade} {item.nfeProduto.unidade}</span>
                                  {item.nfeProduto.unidadeTributavel && item.nfeProduto.unidadeTributavel.toUpperCase() !== item.nfeProduto.unidade.toUpperCase() && (
                                    <span className="block text-xs text-muted-foreground">
                                      ({item.nfeProduto.quantidadeTributavel} {item.nfeProduto.unidadeTributavel} trib.)
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max="9999"
                                  value={item.unidadesPorCaixa || ''}
                                  onChange={(e) => updateUnidadesPorCaixa(index, e.target.value)}
                                  placeholder="0"
                                  className="w-16 h-7 text-center text-xs"
                                  title="Unidades por caixa (fator de conversão)"
                                />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                R$ {item.nfeProduto.valorUnitario.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold">
                                R$ {item.nfeProduto.valorTotal.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={item.markupPercentual || ''}
                                  onChange={(e) => updateMarkupProduto(index, e.target.value)}
                                  className="w-18 h-7 text-center text-xs font-semibold text-blue-600"
                                  placeholder="%"
                                  title="Margem de lucro (%). Altere para recalcular o preço de venda automaticamente."
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.precoVenda || ''}
                                  onChange={(e) => updatePrecoVenda(index, e.target.value)}
                                  className="w-24 h-7 text-right text-xs font-semibold text-green-600"
                                  placeholder="0.00"
                                  title="Preço de venda (editável para arredondamento)"
                                />
                                {item.unidadesPorCaixa > 0 && item.precoVenda > 0 && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    → R$ {(item.precoVenda / item.unidadesPorCaixa).toFixed(2)} un
                                  </p>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.status === 'cadastrado' ? (
                                  <Badge className="bg-green-500 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Cadastrado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">
                                    <FilePlus2 className="h-3 w-3 mr-1" />
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
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setDialogDetalhes(index)}
                                  title="Ver dados fiscais"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
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

                {/* ============================================= */}
                {/* OPÇÕES DE IMPORTAÇÃO                         */}
                {/* ============================================= */}
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
                              : 'Fornecedor já cadastrado — não será duplicado'}
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

                      {/* Atualizar Dados Fiscais */}
                      {cadastradosCount > 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg border bg-blue-50/50">
                          <Checkbox
                            id="atualizarDadosFiscais"
                            checked={atualizarDadosFiscais}
                            onCheckedChange={(checked) => setAtualizarDadosFiscais(!!checked)}
                          />
                          <div className="flex-1">
                            <Label htmlFor="atualizarDadosFiscais" className="font-semibold cursor-pointer flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                              Atualizar Dados Fiscais
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Para produtos já cadastrados, atualiza NCM, CEST, CFOP, CST, CSOSN, ICMS, IPI, PIS, COFINS
                            </p>
                          </div>
                        </div>
                      )}

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
                            <div className="mt-2 space-y-2">
                              <div>
                                <Label className="text-xs">Valor</Label>
                                <Input
                                  type="text"
                                  value={`R$ ${nfeData.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                  disabled
                                  className="h-8 text-xs w-44 bg-muted"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Vencimento</Label>
                                <Input
                                  type="date"
                                  value={vencimentoConta}
                                  onChange={(e) => setVencimentoConta(e.target.value)}
                                  className="h-8 text-xs w-44"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Markup padrão */}
                      <div className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="flex-1">
                          <Label className="font-semibold flex items-center gap-1.5">
                            <Percent className="h-3.5 w-3.5" />
                            Markup Padrão
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                            Defina uma margem padrão e aplique a todos os produtos, ou ajuste individualmente na tabela de produtos acima.
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="999"
                              value={markupDefault}
                              onChange={(e) => setMarkupDefault(e.target.value)}
                              className="h-8 w-24 text-sm"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={applyMarkupAll}
                              className="h-8 text-xs gap-1"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Aplicar a todos
                            </Button>
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
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Selecionados</p>
                          <p className="font-bold text-lg">{totalSelecionados}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Novos a cadastrar</p>
                          <p className="font-bold text-lg text-orange-600">{novosCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Já cadastrados</p>
                          <p className="font-bold text-lg text-blue-600">{cadastradosCount}</p>
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
                disabled={importando || totalSelecionados === 0 || !!nfeDuplicada}
                className="gap-2 min-w-[200px] bg-blue-600 hover:bg-blue-700"
              >
                {importando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownToLine className="h-4 w-4" />
                )}
                {nfeDuplicada
                  ? 'NFe já importada - Não é possível confirmar'
                  : importando
                    ? 'Importando...'
                    : 'Confirmar Importação'
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================= */}
        {/* DIALOG UNIDADES POR CAIXA                    */}
        {/* ============================================= */}
        <Dialog open={produtosSemConversao.length > 0 && !dialogPreview} onOpenChange={(open) => {
          if (!open) {
            // Se fechar sem informar, seta 1 como padrão
            setProdutosImportacao((prev) =>
              prev.map((p, i) =>
                produtosSemConversao.includes(i) && p.unidadesPorCaixa === 0
                  ? { ...p, unidadesPorCaixa: 1 }
                  : p
              )
            );
            setProdutosSemConversao([]);
            setDialogPreview(true);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <Package className="h-5 w-5" />
                Quantidade por Caixa
              </DialogTitle>
              <DialogDescription>
                Os produtos abaixo não tienen conversão automática detectada. Informe a quantidade por caixa para calcular o custo unitário.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-3 py-2">
              {produtosSemConversao.map((idx) => {
                const item = produtosImportacao[idx];
                if (!item) return null;
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.nfeProduto.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        NF: {item.nfeProduto.quantidade} {item.nfeProduto.unidade} • 
                        Custo total: R$ {item.nfeProduto.valorTotal.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">CX:</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.unidadesPorCaixa || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setProdutosImportacao((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, unidadesPorCaixa: val } : p
                            )
                          );
                        }}
                        className="w-20 h-9 text-center font-mono"
                        placeholder="1"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  // Prosseguir para o preview
                  setProdutosSemConversao([]);
                  setDialogPreview(true);
                }}
                className="gap-2"
              >
                <ChevronRight className="h-4 w-4" />
                Prosseguir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================= */}
        {/* DIALOG DETALHES DO PRODUTO (Fiscais)          */}
        {/* ============================================= */}
        <Dialog open={dialogDetalhes !== null} onOpenChange={() => setDialogDetalhes(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-500" />
                {dialogDetalhes !== null && produtosImportacao[dialogDetalhes]?.status === 'novo'
                  ? 'Como este produto será cadastrado'
                  : 'Dados fiscais do produto'}
              </DialogTitle>
              <DialogDescription>
                {dialogDetalhes !== null && produtosImportacao[dialogDetalhes]?.nfeProduto.descricao}
              </DialogDescription>
            </DialogHeader>

            {dialogDetalhes !== null && (
              <div className="flex-1 overflow-y-auto">
                <ProdutoFiscalDetail
                  item={produtosImportacao[dialogDetalhes]}
                  markup={produtosImportacao[dialogDetalhes]?.markupPercentual || 30}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ============================================= */}
        {/* DIALOG SUCESSO                               */}
        {/* ============================================= */}
        <Dialog open={dialogSucesso} onOpenChange={setDialogSucesso}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
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
              <div className="flex-1 overflow-y-auto space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Produtos Criados */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <FilePlus2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {resultadoImportacao.produtosCriados}
                    </p>
                    <p className="text-xs text-muted-foreground">Produtos criados</p>
                  </div>

                  {/* Produtos Atualizados */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">
                      {resultadoImportacao.produtosAtualizados}
                    </p>
                    <p className="text-xs text-muted-foreground">Produtos atualizados</p>
                  </div>

                  {/* Estoque Atualizado */}
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 text-center">
                    <Warehouse className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-cyan-600">
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
                </div>

                {/* Fornecedor */}
                <div className={`border rounded-lg p-3 flex items-center gap-3 ${
                  resultadoImportacao.fornecedorCriado
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-muted border-muted'
                }`}>
                  <Truck className={`h-5 w-5 ${
                    resultadoImportacao.fornecedorCriado ? 'text-orange-600' : 'text-muted-foreground'
                  }`} />
                  <div>
                    <p className="text-sm font-semibold">
                      Fornecedor: {resultadoImportacao.fornecedorNome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resultadoImportacao.fornecedorCriado ? 'Novo cadastro criado' : 'Fornecedor já existente no sistema'}
                    </p>
                  </div>
                </div>

                {/* Detalhes */}
                {resultadoImportacao.detalhes && resultadoImportacao.detalhes.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Detalhes da importação:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {resultadoImportacao.detalhes.map((det: any, i: number) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 text-xs p-1.5 rounded ${
                            det.status === 'criado'
                              ? 'bg-green-50'
                              : det.status === 'atualizado'
                              ? 'bg-blue-50'
                              : det.status === 'existente'
                              ? 'bg-muted'
                              : 'bg-red-50'
                          }`}
                        >
                          <span className={`mt-0.5 flex-shrink-0 ${
                            det.status === 'criado'
                              ? 'text-green-600'
                              : det.status === 'atualizado'
                              ? 'text-blue-600'
                              : det.status === 'existente'
                              ? 'text-muted-foreground'
                              : 'text-red-600'
                          }`}>
                            {det.status === 'criado' ? '✓' : det.status === 'atualizado' ? '↻' : det.status === 'existente' ? '●' : '✗'}
                          </span>
                          <div>
                            <p className="font-medium">{det.descricao}</p>
                            <p className="text-muted-foreground">{det.acao}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                className="bg-blue-600 hover:bg-blue-700"
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

// =====================================================
// Componente: Detalhes Fiscais do Produto
// =====================================================

function ProdutoFiscalDetail({ item, markup }: { item: ProdutoImportacao; markup: number }) {
  const p = item.nfeProduto;
  const precoVenda = p.valorUnitario * (1 + markup / 100);

  return (
    <div className="space-y-4">
      {/* Se for novo, mostra como será cadastrado */}
      {item.status === 'novo' && (
        <Alert className="border-blue-300 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700">Produto NOVO</AlertTitle>
          <AlertDescription className="text-blue-600">
            Este produto será criado com os dados abaixo. O preço de venda será calculado com {markup}% de margem.
          </AlertDescription>
        </Alert>
      )}

      {item.status === 'cadastrado' && (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700">Produto JÁ CADASTRADO</AlertTitle>
          <AlertDescription className="text-green-600">
            {item.produtoNome ? `Encontrado como: ${item.produtoNome}` : 'Encontrado no sistema por código ou EAN.'}
            {' '}O estoque será atualizado e os dados fiscais podem ser atualizados conforme a opção marcada.
          </AlertDescription>
        </Alert>
      )}

      {/* Dados Básicos */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          Dados Básicos
        </h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm bg-muted/50 rounded-lg p-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Código:</span>
            <span className="font-mono">{p.codigo || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">EAN:</span>
            <span className="font-mono">{p.ean || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unidade Comercial:</span>
            <span>{p.quantidade} {p.unidade} <span className="text-xs text-muted-foreground">(qCom)</span></span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unidade Tributável:</span>
            <span>{p.quantidadeTributavel || p.quantidade} {p.unidadeTributavel} <span className="text-xs text-muted-foreground">(qTrib)</span></span>
          </div>
          {p.unidadeTributavel && p.unidadeTributavel.toUpperCase() !== p.unidade.toUpperCase() && p.quantidadeTributavel && p.quantidade > 0 && (
            <div className="flex justify-between col-span-2 bg-blue-50 rounded px-2 py-1 -mx-1">
              <span className="text-muted-foreground text-xs">Fator de conversão:</span>
              <span className="font-mono text-xs font-semibold text-blue-600">
                {(p.quantidadeTributavel / p.quantidade).toFixed(4)} {p.unidadeTributavel}/{p.unidade}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vl. Unit. Comercial:</span>
            <span className="font-mono">R$ {p.valorUnitario.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vl. Unit. Tributável:</span>
            <span className="font-mono">R$ {(p.valorUnitarioTributavel || p.valorUnitario).toFixed(2)}</span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="text-muted-foreground font-semibold">Custo (valor unitário):</span>
            <span className="font-mono font-bold text-orange-600">R$ {p.valorUnitario.toFixed(2)}</span>
          </div>
          {item.status === 'novo' && (
            <div className="flex justify-between col-span-2">
              <span className="text-muted-foreground font-semibold">Preço de venda ({markup}% markup):</span>
              <span className="font-mono font-bold text-green-600">R$ {precoVenda.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dados Fiscais */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
          Dados Fiscais (NFe)
        </h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm bg-blue-50/50 border border-blue-100 rounded-lg p-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">NCM:</span>
            <span className="font-mono font-semibold">{p.ncm || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CEST:</span>
            <span className="font-mono font-semibold">{p.cest || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CFOP:</span>
            <span className="font-mono font-semibold">{p.cfop || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Origem:</span>
            <span className="font-mono">{p.origem || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CST:</span>
            <span className="font-mono font-semibold">{p.cst || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CSOSN:</span>
            <span className="font-mono font-semibold">{p.csosn || '-'}</span>
          </div>
        </div>
      </div>

      {/* Impostos */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-green-600" />
          Impostos
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {/* ICMS */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">ICMS</p>
            <p className="text-lg font-bold font-mono">{p.icmsAliquota.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">
              Base: R$ {p.icmsBaseCalculo.toFixed(2)}
            </p>
            <p className="text-xs font-semibold text-green-600">
              Valor: R$ {p.icmsValor.toFixed(2)}
            </p>
          </div>
          {/* IPI */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">IPI</p>
            <p className="text-lg font-bold font-mono">{p.ipiAliquota.toFixed(1)}%</p>
            <p className="text-xs font-semibold text-green-600">
              Valor: R$ {p.ipiValor.toFixed(2)}
            </p>
          </div>
          {/* PIS */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">PIS</p>
            <p className="text-lg font-bold font-mono">{p.pisAliquota.toFixed(1)}%</p>
            <p className="text-xs font-semibold text-green-600">
              Valor: R$ {p.pisValor.toFixed(2)}
            </p>
          </div>
          {/* COFINS */}
          <div className="bg-muted/50 rounded-lg p-3 text-center col-start-2">
            <p className="text-xs text-muted-foreground">COFINS</p>
            <p className="text-lg font-bold font-mono">{p.cofinsAliquota.toFixed(1)}%</p>
            <p className="text-xs font-semibold text-green-600">
              Valor: R$ {p.cofinsValor.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
