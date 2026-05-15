'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useEmitirNFe } from '@/hooks/useNFE';
import { useProdutos } from '@/hooks/useSupabase';
import { getSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  Download,
  Search,
  Loader2,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';

interface ProdutoForm {
  codigo: string;
  codigo_barras: string;
  descricao: string;
  ncm: string;
  cest: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_total: number;
  valor_desconto: number;
  icms_origem: string;
  icms_cst: string;
  icms_csosn: string;
  icms_aliquota: number;
  pis_cst: string;
  pis_aliquota: number;
  cofins_cst: string;
  cofins_aliquota: number;
  ipi_cst: string;
  ipi_aliquota: number;
}

interface PagamentoForm {
  forma_pagamento: string;
  valor: number;
}

export default function EmitirNFePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
      <EmitirNFeContent />
    </Suspense>
  );
}

function EmitirNFeContent() {
  const { empresaId } = useAuth();
  const { emitir, emitindo, nfe, error } = useEmitirNFe();
  const { produtos: allProducts, loading: loadingProdutos } = useProdutos();
  const router = useRouter();

  // Dados do formulário
  const [naturezaOperacao, setNaturezaOperacao] = useState('VENDA DE MERCADORIA');
  const [tipoOperacao, setTipoOperacao] = useState('1');
  const [finalidade, setFinalidade] = useState('1');
  const [indicadorPresenca, setIndicadorPresenca] = useState('1');
  const [indicadorDestino, setIndicadorDestino] = useState('1');

  // Destinatário
  const [destCPF_CNPJ, setDestCPF_CNPJ] = useState('');
  const [destNome, setDestNome] = useState('');
  const [destNomeFantasia, setDestNomeFantasia] = useState('');
  const [destIE, setDestIE] = useState('');
  const [destIndicadorIE, setDestIndicadorIE] = useState('9'); // 1=Contribuinte, 2=Isento, 9=Não contribuinte
  const [destEmail, setDestEmail] = useState('');
  const [destTelefone, setDestTelefone] = useState('');
  const [destLogradouro, setDestLogradouro] = useState('');
  const [destNumero, setDestNumero] = useState('');
  const [destComplemento, setDestComplemento] = useState('');
  const [destBairro, setDestBairro] = useState('');
  const [destMunicipio, setDestMunicipio] = useState('');
  const [destUF, setDestUF] = useState('');
  const [destCEP, setDestCEP] = useState('');
  const [destCodMunicipio, setDestCodMunicipio] = useState('');
  const [destIsentoICMS, setDestIsentoICMS] = useState(false);

  // Produtos
  const [produtos, setProdutos] = useState<ProdutoForm[]>([]);

  // Pagamentos
  const [pagamentos, setPagamentos] = useState<PagamentoForm[]>([{
    forma_pagamento: '01',
    valor: 0,
  }]);

  // Pedido vindo de referência
  const searchParams = useSearchParams();
  const pedidoIdRef = searchParams.get('pedido_id');
  const [pedidoId, setPedidoId] = useState<string | null>(pedidoIdRef);
  const [carregandoPedido, setCarregandoPedido] = useState(!!pedidoIdRef);
  const [pedidoOrigem, setPedidoOrigem] = useState<{ numero: number; cliente: string } | null>(null);

  useEffect(() => {
    if (!pedidoId || !empresaId) return;
    const loadPedido = async () => {
      setCarregandoPedido(true);
      try {
        const supabase = getSupabaseClient();
        const { data: pedido } = await supabase
          .from('pedidos')
          .select('*')
          .eq('id', pedidoId)
          .eq('empresa_id', empresaId)
          .single();
        if (pedido) {
          setPedidoOrigem({ numero: pedido.numero, cliente: pedido.cliente_nome || '' });

          if (pedido.cliente_id) {
            const { data: cliente } = await supabase
              .from('clientes')
              .select('*')
              .eq('id', pedido.cliente_id)
              .single();
            if (cliente) {
              setDestCPF_CNPJ(cliente.cnpj_cpf || '');
              setDestNome(cliente.nome_razao_social || '');
              setDestNomeFantasia(cliente.nome_fantasia || '');
              setDestIE(cliente.inscricao_estadual || '');
              setDestIndicadorIE(String(cliente.indicador_ie || '9'));
              setDestEmail(cliente.email || '');
              setDestTelefone(cliente.telefone || cliente.celular || '');
              setDestLogradouro(cliente.logradouro || '');
              setDestNumero(cliente.numero || '');
              setDestComplemento(cliente.complemento || '');
              setDestBairro(cliente.bairro || '');
              setDestMunicipio(cliente.municipio || '');
              setDestUF(cliente.uf || '');
              setDestCEP(cliente.cep || '');
              setDestCodMunicipio(cliente.codigo_municipio || '');
            }
          }

          if (pedido.itens && Array.isArray(pedido.itens)) {
            // Buscar dados fiscais dos produtos no catálogo
            const produtoIds = pedido.itens.map((i: any) => i.produtoId || i.produto_id).filter(Boolean);
            let fiscaisMap: Record<string, any> = {};
            if (produtoIds.length > 0) {
              const { data: catalogo } = await supabase
                .from('produtos')
                .select('id, ncm, cest, cfop, unidade, icms_origem, icms_cst, icms_csosn, icms_aliquota, pis_cst, pis_aliquota, cofins_cst, cofins_aliquota, ipi_cst, ipi_aliquota')
                .in('id', produtoIds);
              if (catalogo) {
                catalogo.forEach(p => { fiscaisMap[p.id] = p; });
              }
            }

            const prods = pedido.itens.map((item: any) => {
              const fiscal = fiscaisMap[item.produtoId || item.produto_id] || {};
              return {
              codigo: item.codigo || '',
              codigo_barras: item.codigo_barras || '',
              descricao: item.produtoNome || '',
              ncm: item.ncm || fiscal.ncm || '00000000',
              cest: item.cest || fiscal.cest || '',
              cfop: item.cfop || fiscal.cfop || '5102',
              unidade_comercial: item.unidade || fiscal.unidade || 'UN',
              quantidade_comercial: item.quantidade || 1,
              valor_unitario_comercial: item.precoUnitario || 0,
              valor_total: item.total || (item.precoUnitario || 0) * (item.quantidade || 1),
              valor_desconto: item.desconto || 0,
              icms_origem: fiscal.icms_origem || '0',
              icms_cst: fiscal.icms_cst || '',
              icms_csosn: fiscal.icms_csosn || '',
              icms_aliquota: fiscal.icms_aliquota || 0,
              pis_cst: fiscal.pis_cst || '',
              pis_aliquota: fiscal.pis_aliquota || 0,
              cofins_cst: fiscal.cofins_cst || '',
              cofins_aliquota: fiscal.cofins_aliquota || 0,
              ipi_cst: fiscal.ipi_cst || '',
              ipi_aliquota: fiscal.ipi_aliquota || 0,
            }});
            setProdutos(prods);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar pedido:', err);
      } finally {
        setCarregandoPedido(false);
      }
    };
    loadPedido();
  }, [pedidoId, empresaId]);

  // Buscar Cliente

  const handleBuscarClientes = async (termo: string) => {
    if (!termo.trim()) {
      setClientesResult([]);
      return;
    }
    setBuscandoCliente(true);
    try {
      const params = new URLSearchParams({ busca: termo.trim() });
      const res = await fetch(`/api/clientes?${params.toString()}`);
      const data = await res.json();
      if (data.sucesso) {
        setClientesResult(data.clientes || []);
      } else {
        setClientesResult([]);
      }
    } catch {
      setClientesResult([]);
    } finally {
      setBuscandoCliente(false);
    }
  };

  // Busca de clientes com debounce
  useEffect(() => {
    if (buscaCliente.trim().length < 3) {
      setClientesResult([]);
      return;
    }
    const timer = setTimeout(() => handleBuscarClientes(buscaCliente), 400);
    return () => clearTimeout(timer);
  }, [buscaCliente]);

  const handleSelecionarProduto = (p: any) => {
    const novoProduto: ProdutoForm = {
      codigo: p.codigo || '',
      codigo_barras: p.codigoBarras || p.codigo_barras || '',
      descricao: p.nome || '',
      ncm: p.ncm || '00000000',
      cest: p.cest || '',
      cfop: p.cfop || '5102',
      unidade_comercial: p.unidadeTributavel || p.unidade || 'UN',
      quantidade_comercial: 1,
      valor_unitario_comercial: p.preco || 0,
      valor_total: p.preco || 0,
      valor_desconto: 0,
      icms_origem: p.origem || '0',
      icms_cst: p.cst || (p.csosn ? '' : '00'),
      icms_csosn: p.csosn || (p.cst ? '' : '102'),
      icms_aliquota: p.icms || 0,
      pis_cst: p.pisCst || p.pis_cst || '',
      pis_aliquota: p.pisAliquota || p.pis_aliquota || 0,
      cofins_cst: p.cofinsCst || p.cofins_cst || '',
      cofins_aliquota: p.cofinsAliquota || p.cofins_aliquota || 0,
      ipi_cst: p.ipiCst || p.ipi_cst || '',
      ipi_aliquota: p.ipiAliquota || p.ipi_aliquota || 0,
    };
    setProdutos(prev => {
      const novos = [...prev, novoProduto];
      return novos;
    });
  };

  // Informações adicionais
  const [informacoesAdicionais, setInformacoesAdicionais] = useState('');
  const [informacoesFisco, setInformacoesFisco] = useState('');

  const addProduto = () => {
    setProdutos([...produtos, {
      codigo: '', codigo_barras: '', descricao: '', ncm: '00000000', cest: '',
      cfop: '5102', unidade_comercial: 'UN', quantidade_comercial: 1,
      valor_unitario_comercial: 0, valor_total: 0, valor_desconto: 0,
      icms_origem: '0', icms_cst: '', icms_csosn: '', icms_aliquota: 0,
      pis_cst: '', pis_aliquota: 0, cofins_cst: '', cofins_aliquota: 0,
      ipi_cst: '', ipi_aliquota: 0,
    }]);
  };

  const removeProduto = (index: number) => {
    setResultadosBusca(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setProdutos(produtos.filter((_, i) => i !== index));
  };

  const updateProduto = (index: number, field: keyof ProdutoForm, value: any) => {
    const novos = [...produtos];
    (novos[index] as any)[field] = value;
    // Recalcular total
    if (field === 'quantidade_comercial' || field === 'valor_unitario_comercial' || field === 'valor_desconto') {
      novos[index].valor_total = (novos[index].quantidade_comercial * novos[index].valor_unitario_comercial) - (novos[index].valor_desconto || 0);
    }
    setProdutos(novos);
  };

  const [resultadosBusca, setResultadosBusca] = useState<Record<number, any[]>>({});

  const handleBuscaDescricao = (index: number, value: string) => {
    if (value.trim().length < 2) {
      setResultadosBusca(prev => {
        if (!prev[index]) return prev;
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }
    const q = value.trim().toLowerCase();
    const results = (allProducts || []).filter(p =>
      p.nome.toLowerCase().includes(q) ||
      (p.codigo && p.codigo.toLowerCase().includes(q)) ||
      (p.codigoBarras && p.codigoBarras.toLowerCase().includes(q))
    ).slice(0, 15);
    setResultadosBusca(prev => ({ ...prev, [index]: results }));
  };

  const selecionarResultadoBusca = (index: number, p: any) => {
    setProdutos(prev => {
      if (index >= prev.length) return prev;
      const novos = [...prev];
      novos[index] = {
        ...novos[index],
        codigo: p.codigo || novos[index].codigo,
        codigo_barras: p.codigoBarras || p.codigo_barras || novos[index].codigo_barras,
        descricao: p.nome || novos[index].descricao,
        ncm: p.ncm || '00000000',
        cest: p.cest || '',
        cfop: p.cfop || '5102',
        unidade_comercial: p.unidadeTributavel || p.unidade || 'UN',
        valor_unitario_comercial: p.preco || 0,
        valor_total: (novos[index].quantidade_comercial * (p.preco || 0)) - (novos[index].valor_desconto || 0),
        icms_origem: p.origem || '0',
        icms_cst: p.cst || (p.csosn ? '' : '00'),
        icms_csosn: p.csosn || (p.cst ? '' : '102'),
        icms_aliquota: p.icms || 0,
        pis_cst: p.pisCst || p.pis_cst || '',
        pis_aliquota: p.pisAliquota || p.pis_aliquota || 0,
        cofins_cst: p.cofinsCst || p.cofins_cst || '',
        cofins_aliquota: p.cofinsAliquota || p.cofins_aliquota || 0,
        ipi_cst: p.ipiCst || p.ipi_cst || '',
        ipi_aliquota: p.ipiAliquota || p.ipi_aliquota || 0,
      };
      return novos;
    });
    setResultadosBusca(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const addPagamento = () => {
    setPagamentos([...pagamentos, { forma_pagamento: '01', valor: 0 }]);
  };

  const removePagamento = (index: number) => {
    if (pagamentos.length <= 1) return;
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };

  const updatePagamento = (index: number, field: keyof PagamentoForm, value: any) => {
    const novos = [...pagamentos];
    (novos[index] as any)[field] = value;
    setPagamentos(novos);
  };

  const handleSelecionarCliente = (c: any) => {
    setDestCPF_CNPJ(c.cnpj_cpf || '');
    setDestNome(c.nome_razao_social || '');
    setDestNomeFantasia(c.nome_fantasia || '');
    setDestIE(c.inscricao_estadual || '');
    setDestIndicadorIE(String(c.indicador_ie || '9'));
    setDestEmail(c.email || '');
    setDestTelefone(c.telefone || c.celular || '');
    setDestLogradouro(c.logradouro || '');
    setDestNumero(c.numero || '');
    setDestComplemento(c.complemento || '');
    setDestBairro(c.bairro || '');
    setDestMunicipio(c.municipio || '');
    setDestUF(c.uf || '');
    setDestCEP(c.cep || '');
    setDestCodMunicipio(c.codigo_municipio || '');
    setClienteSelecionado(true);
    setClientesResult([]);
    setBuscaCliente(c.nome_razao_social || '');
  };

  const totalProdutos = produtos.reduce((acc, p) => acc + (p.valor_total || 0), 0);
  const totalPagamentos = pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);

  // Sincronizar valor do pagamento com total da NF
  useEffect(() => {
    setPagamentos(prev => {
      if (prev.length === 0) return prev;
      const novos = [...prev];
      novos[0] = { ...novos[0], valor: totalProdutos };
      return novos;
    });
  }, [totalProdutos]);

  const handleSubmit = async () => {
    const hasDest = destNome || destCPF_CNPJ;

    const result = await emitir({
      natureza_operacao: naturezaOperacao,
      tipo_operacao: parseInt(tipoOperacao) as any,
      finalidade: parseInt(finalidade) as any,
      indicador_presenca: parseInt(indicadorPresenca) as any,
      indicador_destino: parseInt(indicadorDestino) as any,
      destinatario: hasDest ? {
        cnpj_cpf: destCPF_CNPJ.replace(/\D/g, ''),
        nome_razao_social: destNome,
        nome_fantasia: destNomeFantasia || undefined,
        ie: destIE || undefined,
        isento_icms: destIsentoICMS,
        indicador_ie_destinatario: parseInt(destIndicadorIE) as 1 | 2 | 9,
        email: destEmail || undefined,
        telefone: destTelefone || undefined,
        endereco: {
          logradouro: destLogradouro, numero: destNumero, complemento: destComplemento,
          bairro: destBairro, municipio: destMunicipio, uf: destUF, cep: destCEP,
          codigo_municipio: destCodMunicipio,
        },
      } : undefined,
      produtos: produtos.map(p => ({
        codigo: p.codigo,
        codigo_barras: p.codigo_barras || undefined,
        descricao: p.descricao,
        ncm: p.ncm,
        cest: p.cest || undefined,
        cfop: p.cfop,
        unidade_comercial: p.unidade_comercial,
        quantidade_comercial: p.quantidade_comercial,
        valor_unitario_comercial: p.valor_unitario_comercial,
        valor_total: p.valor_total,
        valor_desconto: p.valor_desconto,
        icms_origem: p.icms_origem,
        icms_cst: p.icms_cst || undefined,
        icms_csosn: p.icms_csosn || undefined,
        icms_aliquota: p.icms_aliquota,
        pis_cst: p.pis_cst || undefined,
        pis_aliquota: p.pis_aliquota,
        cofins_cst: p.cofins_cst || undefined,
        cofins_aliquota: p.cofins_aliquota,
        ipi_cst: p.ipi_cst || undefined,
        ipi_aliquota: p.ipi_aliquota,
      })),
      pagamentos: pagamentos.map(p => ({
        forma_pagamento: p.forma_pagamento as any,
        valor: p.valor,
      })),
      informacoes_adicionais: informacoesAdicionais || undefined,
      informacoes_fisco: informacoesFisco || undefined,
      pedido_id: pedidoId || undefined,
    });

    if (result.sucesso) {
      // Sucesso - mostrar resultado
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[
        { title: 'Cupons e NF-es', href: '/admin/cupons-nfes' },
        { title: 'Emitir NF-e' },
      ]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/admin/cupons-nfes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-7 w-7" />
                Emitir NF-e
              </h1>
              <p className="text-muted-foreground text-sm">Nova Nota Fiscal Eletrônica - Modelo 55</p>
            </div>
          </div>

      {/* Resultado da emissão */}
      {nfe && (
        <Card className={nfe.status === 'autorizada' ? 'border-green-500' : 'border-red-500'}>
          <CardContent className="p-6 text-center">
            {nfe.status === 'autorizada' ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-green-700">NF-e Autorizada com Sucesso!</h2>
                <p className="text-sm text-muted-foreground mt-1">Protocolo: {nfe.protocolo_autorizacao}</p>
                <div className="mt-2 font-mono text-xs bg-muted p-2 rounded">{nfe.chave}</div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button onClick={() => window.open(`/api/nfe/danfe/${nfe.id}`, '_blank')} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Printer className="h-4 w-4" /> Imprimir DANFE
                  </Button>
                  <Button variant="outline" onClick={() => window.open(`/api/nfe/xml/${nfe.id}`, '_blank')} className="gap-2">
                    <Download className="h-4 w-4" /> Download XML
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/admin/cupons-nfes')}>
                    Ver Todas NF-es
                  </Button>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-700">NF-e Rejeitada</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  [{nfe.codigo_rejeicao}] {nfe.mensagem_rejeicao}
                </p>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => { /* reset */ }}>
                  Tentar Novamente
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!nfe && (
        <div className="space-y-6">
          {/* Dados da Operação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados da Operação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Natureza da Operação</Label>
                <Input value={naturezaOperacao} onChange={(e) => setNaturezaOperacao(e.target.value)} />
              </div>
              <div>
                <Label>Tipo de Operação</Label>
                <Select value={tipoOperacao} onValueChange={setTipoOperacao}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Saída</SelectItem>
                    <SelectItem value="0">Entrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Finalidade</Label>
                <Select value={finalidade} onValueChange={setFinalidade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">NF-e Normal</SelectItem>
                    <SelectItem value="2">NF-e Complementar</SelectItem>
                    <SelectItem value="3">NF-e Ajuste</SelectItem>
                    <SelectItem value="4">Devolução</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Indicador de Presença</Label>
                <Select value={indicadorPresenca} onValueChange={setIndicadorPresenca}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Não presencial (Internet)</SelectItem>
                    <SelectItem value="1">Presencial</SelectItem>
                    <SelectItem value="2">Não presencial (Teleatendimento)</SelectItem>
                    <SelectItem value="3">Presencial (Entrega em domicílio)</SelectItem>
                    <SelectItem value="4">Não presencial (Outros)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Destino da Operação</Label>
                <Select value={indicadorDestino} onValueChange={setIndicadorDestino}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Interna</SelectItem>
                    <SelectItem value="2">Interestadual</SelectItem>
                    <SelectItem value="3">Exterior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Destinatário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Destinatário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente por nome, CPF/CNPJ..."
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleBuscarClientes(buscaCliente)}
                  disabled={buscandoCliente}
                >
                  {buscandoCliente ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </div>
              {clienteSelecionado && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Cliente selecionado. Os campos foram preenchidos automaticamente.
                </div>
              )}
              {buscandoCliente && (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              )}
              {!buscandoCliente && clientesResult.length > 0 && (
                <div className="border rounded-lg max-h-64 overflow-y-auto divide-y">
                  {clientesResult.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelecionarCliente(c)}
                      className="w-full text-left p-3 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{c.nome_razao_social}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.cnpj_cpf && <span className="font-mono">{c.cnpj_cpf}</span>}
                            {c.municipio && c.uf && <span> • {c.municipio}/{c.uf}</span>}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
                            {c.logradouro && <span>{c.logradouro}{c.numero ? `, ${c.numero}` : ''}</span>}
                            {c.telefone && <span>📞 {c.telefone}</span>}
                            {c.email && <span>✉ {c.email}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={c.tipo_pessoa === '1' ? 'default' : 'secondary'} className="text-[10px] h-5">
                            {c.tipo_pessoa === '1' ? 'PJ' : 'PF'}
                          </Badge>
                          {c.inscricao_estadual && (
                            <span className="text-[10px] text-muted-foreground">IE: {c.inscricao_estadual}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!buscandoCliente && buscaCliente.trim().length > 2 && clientesResult.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>CNPJ / CPF *</Label>
                <Input value={destCPF_CNPJ} onChange={(e) => setDestCPF_CNPJ(e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div className="md:col-span-2">
                <Label>Razão Social / Nome *</Label>
                <Input value={destNome} onChange={(e) => setDestNome(e.target.value)} />
              </div>
              <div>
                <Label>Nome Fantasia</Label>
                <Input value={destNomeFantasia} onChange={(e) => setDestNomeFantasia(e.target.value)} />
              </div>
              <div>
                <Label>Inscrição Estadual</Label>
                <Input value={destIE} onChange={(e) => setDestIE(e.target.value)} placeholder="Isento" disabled={destIndicadorIE === '2'} />
              </div>
              <div>
                <Label>Indicador IE *</Label>
                <Select value={destIndicadorIE} onValueChange={(v) => { setDestIndicadorIE(v); if (v === '2') { setDestIsentoICMS(true); setDestIE(''); } else { setDestIsentoICMS(false); } }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Contribuinte ICMS</SelectItem>
                    <SelectItem value="2">2 - Contribuinte Isento</SelectItem>
                    <SelectItem value="9">9 - Não Contribuinte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={destEmail} onChange={(e) => setDestEmail(e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={destTelefone} onChange={(e) => setDestTelefone(e.target.value)} />
              </div>
              <div className="md:col-span-1">
                <Label>Logradouro *</Label>
                <Input value={destLogradouro} onChange={(e) => setDestLogradouro(e.target.value)} />
              </div>
              <div>
                <Label>Número *</Label>
                <Input value={destNumero} onChange={(e) => setDestNumero(e.target.value)} />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input value={destComplemento} onChange={(e) => setDestComplemento(e.target.value)} />
              </div>
              <div>
                <Label>Bairro *</Label>
                <Input value={destBairro} onChange={(e) => setDestBairro(e.target.value)} />
              </div>
              <div>
                <Label>Município *</Label>
                <Input value={destMunicipio} onChange={(e) => setDestMunicipio(e.target.value)} />
              </div>
              <div>
                <Label>Cód. Município IBGE *</Label>
                <Input value={destCodMunicipio} onChange={(e) => setDestCodMunicipio(e.target.value)} placeholder="3550308" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>UF *</Label>
                  <Select value={destUF} onValueChange={setDestUF}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CEP *</Label>
                  <Input value={destCEP} onChange={(e) => setDestCEP(e.target.value)} placeholder="00000-000" />
                </div>
              </div>
              </div>
            </CardContent>
          </Card>

          {/* Produtos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Produtos ({produtos.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={addProduto} className="gap-2">
                <Plus className="h-4 w-4" /> +Novo Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <BuscaProduto onSelecionar={handleSelecionarProduto} allProducts={allProducts} />
              {produtos.map((prod, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Item {index + 1}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeProduto(index)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div className="relative">
                      <Label className="text-xs">Código</Label>
                      <Input value={prod.codigo} onChange={(e) => {
                        updateProduto(index, 'codigo', e.target.value);
                        handleBuscaDescricao(index, e.target.value);
                      }} />
                    </div>
                    <div className="md:col-span-2 lg:col-span-3 relative">
                      <Label className="text-xs">Descrição</Label>
                      <Input value={prod.descricao} onChange={(e) => {
                        updateProduto(index, 'descricao', e.target.value);
                        handleBuscaDescricao(index, e.target.value);
                      }} />
                      {resultadosBusca[index]?.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {resultadosBusca[index].map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => selecionarResultadoBusca(index, p)}
                              className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-0"
                            >
                              <span className="font-medium">{p.nome}</span>
                              <span className="text-muted-foreground ml-2">R$ {(p.preco || 0).toFixed(2)}</span>
                              {p.codigo && <span className="text-muted-foreground ml-2 text-xs">#{p.codigo}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">NCM</Label>
                      <Input value={prod.ncm} onChange={(e) => updateProduto(index, 'ncm', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">CEST</Label>
                      <Input value={prod.cest} onChange={(e) => updateProduto(index, 'cest', e.target.value)} placeholder="" />
                    </div>
                    <div>
                      <Label className="text-xs">CFOP</Label>
                      <Input value={prod.cfop} onChange={(e) => updateProduto(index, 'cfop', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Unidade</Label>
                      <Input value={prod.unidade_comercial} onChange={(e) => updateProduto(index, 'unidade_comercial', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input type="number" step="0.0001" value={prod.quantidade_comercial} onChange={(e) => updateProduto(index, 'quantidade_comercial', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">Valor Unitário (R$)</Label>
                      <Input type="number" step="0.01" value={prod.valor_unitario_comercial} onChange={(e) => updateProduto(index, 'valor_unitario_comercial', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">Desconto (R$)</Label>
                      <Input type="number" step="0.01" value={prod.valor_desconto} onChange={(e) => updateProduto(index, 'valor_desconto', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">ICMS %</Label>
                      <Input type="number" step="0.01" value={prod.icms_aliquota} onChange={(e) => updateProduto(index, 'icms_aliquota', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">CST / CSOSN</Label>
                      <Input value={prod.icms_csosn || prod.icms_cst} onChange={(e) => setProdutos(prev => { const v = e.target.value; const novos = [...prev]; const item = { ...novos[index], icms_cst: v, icms_csosn: v }; if (item.quantidade_comercial && item.valor_unitario_comercial) item.valor_total = (item.quantidade_comercial * item.valor_unitario_comercial) - (item.valor_desconto || 0); novos[index] = item; return novos; })} placeholder="00 / 102" />
                    </div>
                    <div>
                      <Label className="text-xs">PIS %</Label>
                      <Input type="number" step="0.01" value={prod.pis_aliquota} onChange={(e) => updateProduto(index, 'pis_aliquota', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">COFINS %</Label>
                      <Input type="number" step="0.01" value={prod.cofins_aliquota} onChange={(e) => updateProduto(index, 'cofins_aliquota', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">IPI %</Label>
                      <Input type="number" step="0.01" value={prod.ipi_aliquota} onChange={(e) => updateProduto(index, 'ipi_aliquota', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="flex items-end">
                      <div className="text-right w-full">
                        <Label className="text-xs">Valor Total</Label>
                        <p className="text-lg font-bold">R$ {prod.valor_total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={addProduto} className="gap-2">
                  <Plus className="h-4 w-4" /> +Novo Item
                </Button>
              </div>

              {/* Total de Produtos */}
              <div className="flex justify-end border-t pt-3">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total dos Produtos</p>
                  <p className="text-2xl font-bold">R$ {totalProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pagamentos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pagamentos</CardTitle>
              <Button variant="outline" size="sm" onClick={addPagamento} className="gap-2">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {pagamentos.map((pg, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label className="text-xs">Forma de Pagamento</Label>
                    <Select value={pg.forma_pagamento} onValueChange={(v) => updatePagamento(index, 'forma_pagamento', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">Dinheiro</SelectItem>
                        <SelectItem value="02">Cheque</SelectItem>
                        <SelectItem value="03">Cartão de Crédito</SelectItem>
                        <SelectItem value="04">Cartão de Débito</SelectItem>
                        <SelectItem value="05">Crédito Loja</SelectItem>
                        <SelectItem value="10">Vale Alimentação</SelectItem>
                        <SelectItem value="11">Vale Refeição</SelectItem>
                        <SelectItem value="15">Boleto</SelectItem>
                        <SelectItem value="99">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input type="number" step="0.01" value={pg.valor} onChange={(e) => updatePagamento(index, 'valor', parseFloat(e.target.value) || 0)} />
                  </div>
                  {pagamentos.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removePagamento(index)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-sm">Total Pagamentos: <strong>R$ {totalPagamentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                {totalPagamentos !== totalProdutos && (
                  <Badge variant="destructive">
                    Diferença: R$ {Math.abs(totalPagamentos - totalProdutos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Informações Complementares</Label>
                <Textarea value={informacoesAdicionais} onChange={(e) => setInformacoesAdicionais(e.target.value)} rows={3} />
              </div>
              <div>
                <Label>Informações para o Fisco</Label>
                <Textarea value={informacoesFisco} onChange={(e) => setInformacoesFisco(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Erro */}
          {error && (
            <Card className="border-red-500">
              <CardContent className="p-4 flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-4">
            <Link href="/admin/cupons-nfes">
              <Button variant="outline">Cancelar</Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={emitindo || produtos.length === 0 || produtos.some(p => !p.descricao)}
              className="gap-2 min-w-[200px] bg-blue-600 hover:bg-blue-700"
            >
              {emitindo ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {emitindo ? 'Emitindo NF-e...' : 'Emitir NF-e'}
            </Button>
          </div>
        </div>
      )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

function BuscaProduto({ onSelecionar, allProducts }: { onSelecionar: (produto: any) => void; allProducts: any[] }) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setBusca(v);
    if (v.trim().length < 2) {
      setResultados([]);
      return;
    }
    const q = v.trim().toLowerCase();
    const results = (allProducts || []).filter(p =>
      p.nome.toLowerCase().includes(q) ||
      (p.codigo && p.codigo.toLowerCase().includes(q)) ||
      (p.codigoBarras && p.codigoBarras.toLowerCase().includes(q))
    ).slice(0, 15);
    setResultados(results);
  };

  return (
    <>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto por nome, código ou código de barras..."
            value={busca}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && resultados.length > 0) {
                onSelecionar(resultados[0]);
                setBusca('');
                setResultados([]);
              }
            }}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setBusca('')} disabled={!busca}>
          Limpar
        </Button>
      </div>
      {resultados.length > 0 && (
        <div className="border rounded-lg max-h-64 overflow-y-auto divide-y">
          {resultados.map((p: any) => (
            <button
              key={p.id}
              onClick={() => {
                onSelecionar(p);
                setBusca('');
                setResultados([]);
              }}
              className="w-full text-left p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.codigo && <span className="font-mono">{p.codigo}</span>}
                    {p.ncm && p.ncm !== '00000000' && <span> • NCM: {p.ncm}</span>}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
                    {p.codigoBarras && <span>📦 {p.codigoBarras}</span>}
                    {p.cfop && <span>CFOP: {p.cfop}</span>}
                    {p.unidade && <span>Un: {p.unidade}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className="font-semibold text-green-600">
                    R$ {(p.preco || 0).toFixed(2)}
                  </Badge>
                  {p.unidadeTributavel && p.unidadeTributavel !== p.unidade && (
                    <span className="text-[10px] text-muted-foreground">Trib: {p.unidadeTributavel}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {!resultados.length && busca.trim().length > 2 && (
        <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
      )}
    </>
  );
}
