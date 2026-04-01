'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useEmitirNFe } from '@/hooks/useNFE';
import { NFeService } from '@/services/nfe/nfe-service';
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
  descricao: string;
  ncm: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_total: number;
  valor_desconto: number;
  icms_origem: string;
  icms_aliquota: number;
}

interface PagamentoForm {
  forma_pagamento: string;
  valor: number;
}

export default function EmitirNFePage() {
  const { empresaId } = useAuth();
  const { emitir, emitindo, nfe, error } = useEmitirNFe();
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
  const [produtos, setProdutos] = useState<ProdutoForm[]>([{
    codigo: '',
    descricao: '',
    ncm: '00000000',
    cfop: '5102',
    unidade_comercial: 'UN',
    quantidade_comercial: 1,
    valor_unitario_comercial: 0,
    valor_total: 0,
    valor_desconto: 0,
    icms_origem: '0',
    icms_aliquota: 0,
  }]);

  // Pagamentos
  const [pagamentos, setPagamentos] = useState<PagamentoForm[]>([{
    forma_pagamento: '01',
    valor: 0,
  }]);

  // Buscar Cliente
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clientesResult, setClientesResult] = useState<any[]>([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(false);

  // Informações adicionais
  const [informacoesAdicionais, setInformacoesAdicionais] = useState('');
  const [informacoesFisco, setInformacoesFisco] = useState('');

  const addProduto = () => {
    setProdutos([...produtos, {
      codigo: '', descricao: '', ncm: '00000000', cfop: '5102',
      unidade_comercial: 'UN', quantidade_comercial: 1,
      valor_unitario_comercial: 0, valor_total: 0, valor_desconto: 0,
      icms_origem: '0', icms_aliquota: 0,
    }]);
  };

  const removeProduto = (index: number) => {
    if (produtos.length <= 1) return;
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

  const handleBuscarClientes = async () => {
    if (!buscaCliente.trim()) {
      setClientesResult([]);
      return;
    }
    setBuscandoCliente(true);
    try {
      const params = new URLSearchParams({ busca: buscaCliente.trim() });
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
        descricao: p.descricao,
        ncm: p.ncm,
        cfop: p.cfop,
        unidade_comercial: p.unidade_comercial,
        quantidade_comercial: p.quantidade_comercial,
        valor_unitario_comercial: p.valor_unitario_comercial,
        valor_total: p.valor_total,
        valor_desconto: p.valor_desconto,
        icms_origem: p.icms_origem,
        icms_aliquota: p.icms_aliquota,
      })),
      pagamentos: pagamentos.map(p => ({
        forma_pagamento: p.forma_pagamento as any,
        valor: p.valor,
      })),
      informacoes_adicionais: informacoesAdicionais || undefined,
      informacoes_fisco: informacoesFisco || undefined,
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
                  <Button onClick={() => window.open(`/api/nfe/danfe/${nfe.id}`, '_blank')} className="gap-2">
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
                <Button className="mt-4" onClick={() => { /* reset */ }}>
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

          {/* Buscar Cliente Cadastrado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Buscar Cliente Cadastrado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, CPF/CNPJ..."
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBuscarClientes()}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleBuscarClientes}
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
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Cliente selecionado. Os campos do destinatário foram preenchidos automaticamente.
                </div>
              )}
              {clientesResult.length > 0 && (
                <div className="mt-3 border rounded-lg max-h-60 overflow-y-auto">
                  {clientesResult.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelecionarCliente(c)}
                      className="w-full text-left p-3 hover:bg-accent border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{c.nome_razao_social}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.cnpj_cpf} • {c.municipio}/{c.uf}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 ml-2">
                          {c.tipo_pessoa === '1' ? 'PJ' : 'PF'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {buscaCliente.trim().length > 2 && !buscandoCliente && clientesResult.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Destinatário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Destinatário (Opcional)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            </CardContent>
          </Card>

          {/* Produtos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Produtos ({produtos.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={addProduto} className="gap-2">
                <Plus className="h-4 w-4" /> Adicionar Produto
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {produtos.map((prod, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Item {index + 1}</span>
                    {produtos.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeProduto(index)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div>
                      <Label className="text-xs">Código</Label>
                      <Input value={prod.codigo} onChange={(e) => updateProduto(index, 'codigo', e.target.value)} />
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <Label className="text-xs">Descrição</Label>
                      <Input value={prod.descricao} onChange={(e) => updateProduto(index, 'descricao', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">NCM</Label>
                      <Input value={prod.ncm} onChange={(e) => updateProduto(index, 'ncm', e.target.value)} />
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
                    <div className="flex items-end">
                      <div className="text-right w-full">
                        <Label className="text-xs">Valor Total</Label>
                        <p className="text-lg font-bold">R$ {prod.valor_total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

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
              className="gap-2 min-w-[200px]"
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
