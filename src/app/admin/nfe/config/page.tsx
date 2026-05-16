'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNFeConfig } from '@/hooks/useNFE';
import { useNFCeConfig } from '@/hooks/useNFCeConfig';
import { UploadCertificado } from '@/components/nfce/UploadCertificado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Edit,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export default function NFeConfigPage() {
  const { empresaId } = useAuth();
  const { config, loading, carregarConfig, salvarConfig } = useNFeConfig(empresaId);
  const {
    certificados,
    certificadoAtivo,
    infoCertificado,
    loading: loadingCert,
    saving: uploadingCert,
    uploadCertificado,
    deletarCertificado,
    ativarCertificado,
  } = useNFCeConfig();
  const [salvando, setSalvando] = useState(false);

  // Form state
  const [ambiente, setAmbiente] = useState('homologacao');
  const [cnpj, setCnpj] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [codigoMunicipio, setCodigoMunicipio] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('');
  const [cep, setCep] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [regimeTributario, setRegimeTributario] = useState('1');
  const [serieNFe, setSerieNFe] = useState('1');
  const [numeroInicialNFe, setNumeroInicialNFe] = useState('1');
  const [cfopSaida, setCfopSaida] = useState('5102');
  const [cfopEntrada, setCfopEntrada] = useState('2102');
  const [cstPadrao, setCstPadrao] = useState('00');
  const [csosnPadrao, setCsosnPadrao] = useState('102');
  const [ncmPadrao, setNcmPadrao] = useState('00000000');
  const [unidadePadrao, setUnidadePadrao] = useState('UN');
  const [icmsAliquota, setIcmsAliquota] = useState('0');
  const [pisAliquota, setPisAliquota] = useState('0');
  const [cofinsAliquota, setCofinsAliquota] = useState('0');
  const [ipiAliquota, setIpiAliquota] = useState('0');
  const [naturezaOp, setNaturezaOp] = useState('VENDA DE MERCADORIA');
  const [imprimirDanfe, setImprimirDanfe] = useState(false);
  const [formatoDanfe, setFormatoDanfe] = useState('A4');
  const [emContingencia, setEmContingencia] = useState(false);
  const [tipoContingencia, setTipoContingencia] = useState('');
  const [informacoesAdicionais, setInformacoesAdicionais] = useState('');
  const [informacoesFisco, setInformacoesFisco] = useState('');

  // Gerenciamento de múltiplas informações adicionais
  const [infoTemplates, setInfoTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [infoTab, setInfoTab] = useState<'complementares' | 'fisco'>('complementares');
  const [editandoInfo, setEditandoInfo] = useState<any | null>(null);
  const [infoTitulo, setInfoTitulo] = useState('');
  const [infoConteudo, setInfoConteudo] = useState('');

  const loadTemplates = useCallback(async () => {
    if (!empresaId) return;
    setLoadingTemplates(true);
    try {
      const res = await fetch(`/api/nfe/informacoes-padrao?empresa_id=${empresaId}`);
      const data = await res.json();
      if (data.sucesso) setInfoTemplates(data.dados || []);
    } catch {} finally { setLoadingTemplates(false); }
  }, [empresaId]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const salvarTemplate = async () => {
    if (!empresaId || !infoTitulo.trim() || !infoConteudo.trim()) return;
    try {
      const body = { empresa_id: empresaId, tipo: infoTab, titulo: infoTitulo.trim(), conteudo: infoConteudo.trim() };
      const res = await fetch('/api/nfe/informacoes-padrao', {
        method: editandoInfo ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editandoInfo ? { id: editandoInfo.id, ...body } : body),
      });
      const data = await res.json();
      if (data.sucesso) {
        toast.success(editandoInfo ? 'Mensagem atualizada' : 'Mensagem cadastrada');
        setEditandoInfo(null); setInfoTitulo(''); setInfoConteudo('');
        loadTemplates();
      }
    } catch {}
  };

  const excluirTemplate = async (id: string) => {
    if (!confirm('Excluir esta mensagem?')) return;
    try {
      const res = await fetch(`/api/nfe/informacoes-padrao?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.sucesso) { toast.success('Mensagem excluída'); loadTemplates(); }
    } catch {}
  };

  const editarTemplate = (item: any) => {
    setEditandoInfo(item);
    setInfoTitulo(item.titulo);
    setInfoConteudo(item.conteudo);
  };

  const cancelarEdicao = () => {
    setEditandoInfo(null);
    setInfoTitulo('');
    setInfoConteudo('');
  };

  useEffect(() => {
    if (empresaId) carregarConfig();
  }, [empresaId, carregarConfig]);

  useEffect(() => {
    if (config) {
      setAmbiente(config.ambiente || 'homologacao');
      setCnpj(config.cnpj || '');
      setInscricaoEstadual(config.inscricao_estadual || '');
      setInscricaoMunicipal(config.inscricao_municipal || '');
      setRazaoSocial(config.razao_social || '');
      setNomeFantasia(config.nome_fantasia || '');
      setLogradouro(config.logradouro || '');
      setNumero(config.numero || '');
      setComplemento(config.complemento || '');
      setBairro(config.bairro || '');
      setCodigoMunicipio(config.codigo_municipio || '');
      setMunicipio(config.municipio || '');
      setUf(config.uf || '');
      setCep(config.cep || '');
      setTelefone(config.telefone || '');
      setEmail(config.email || '');
      setRegimeTributario(config.regime_tributario || '1');
      setSerieNFe(config.serie_nfe || '1');
      setNumeroInicialNFe(String(config.numero_inicial_nfe || 1));
      setCfopSaida(config.cfop_saida_padrao || '5102');
      setCfopEntrada(config.cfop_entrada_padrao || '2102');
      setCstPadrao(config.cst_padrao || '00');
      setCsosnPadrao(config.csosn_padrao || '102');
      setNcmPadrao(config.ncm_padrao || '00000000');
      setUnidadePadrao(config.unidade_padrao || 'UN');
      setIcmsAliquota(String(config.icms_aliquota || 0));
      setPisAliquota(String(config.pis_aliquota || 0));
      setCofinsAliquota(String(config.cofins_aliquota || 0));
      setIpiAliquota(String(config.ipi_aliquota || 0));
      setNaturezaOp(config.natureza_operacao_padrao || 'VENDA DE MERCADORIA');
      setImprimirDanfe(config.imprimir_danfe_automatico || false);
      setFormatoDanfe(config.formato_danfe || 'A4');
      setEmContingencia(config.em_contingencia || false);
      setTipoContingencia(config.tipo_contingencia || '');
      setInformacoesAdicionais(config.informacoes_adicionais || '');
      setInformacoesFisco(config.informacoes_fisco || '');
    }
  }, [config]);

  const handleSalvar = async () => {
    setSalvando(true);
    const result = await salvarConfig({
      ambiente: ambiente as any,
      cnpj: cnpj.replace(/\D/g, ''),
      inscricao_estadual: inscricaoEstadual,
      inscricao_municipal: inscricaoMunicipal,
      razao_social: razaoSocial,
      nome_fantasia: nomeFantasia,
      logradouro, numero, complemento, bairro,
      codigo_municipio: codigoMunicipio, municipio, uf, cep,
      telefone, email,
      regime_tributario: regimeTributario as any,
      serie_nfe: serieNFe,
      numero_inicial_nfe: parseInt(numeroInicialNFe) || 1,
      cfop_saida_padrao: cfopSaida,
      cfop_entrada_padrao: cfopEntrada,
      cst_padrao: cstPadrao,
      csosn_padrao: csosnPadrao,
      ncm_padrao: ncmPadrao,
      unidade_padrao: unidadePadrao,
      icms_aliquota: parseFloat(icmsAliquota) || 0,
      pis_aliquota: parseFloat(pisAliquota) || 0,
      cofins_aliquota: parseFloat(cofinsAliquota) || 0,
      ipi_aliquota: parseFloat(ipiAliquota) || 0,
      natureza_operacao_padrao: naturezaOp,
      imprimir_danfe_automatico: imprimirDanfe,
      formato_danfe: formatoDanfe,
      em_contingencia: emContingencia,
      tipo_contingencia: tipoContingencia,
      informacoes_adicionais: informacoesAdicionais || undefined,
      informacoes_fisco: informacoesFisco || undefined,
    });
    setSalvando(false);
    if (result.sucesso) {
      toast.success('Configurações de NF-e salvas com sucesso!');
    } else {
      toast.error(`Erro: ${result.erro || 'Erro ao salvar'}`);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[
        { title: 'Cupons e NF-es', href: '/admin/cupons-nfes' },
        { title: 'Configuração NF-e' },
      ]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/admin/cupons-nfes">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="h-7 w-7" />
                Configuração NF-e
              </h1>
              <p className="text-muted-foreground text-sm">Configure os dados para emissão de Notas Fiscais Eletrônicas (Modelo 55)</p>
            </div>
          </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Aviso de ambiente */}
          {ambiente === 'producao' && (
            <Card className="border-yellow-500 bg-yellow-50">
              <CardContent className="p-4 flex items-center gap-3 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Ambiente de Produção</p>
                  <p className="text-sm">As NF-es serão emitidas em ambiente de produção e terão validade fiscal.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ambiente e Emitente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Ambiente e Dados do Emitente
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Ambiente</Label>
                <Select value={ambiente} onValueChange={setAmbiente}>
                  <SelectTrigger>
                    <SelectValue />
                    {ambiente === 'homologacao' && <Badge variant="secondary" className="ml-2">Teste</Badge>}
                    {ambiente === 'producao' && <Badge className="ml-2 bg-red-600">Produção</Badge>}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homologacao">Homologação (Teste)</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label>Inscrição Estadual</Label>
                <Input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} />
              </div>
              <div>
                <Label>Inscrição Municipal</Label>
                <Input value={inscricaoMunicipal} onChange={(e) => setInscricaoMunicipal(e.target.value)} />
              </div>
              <div>
                <Label>Razão Social</Label>
                <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
              </div>
              <div>
                <Label>Nome Fantasia</Label>
                <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
              </div>
              <div>
                <Label>Regime Tributário</Label>
                <Select value={regimeTributario} onValueChange={setRegimeTributario}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Simples Nacional</SelectItem>
                    <SelectItem value="2">Simples Nacional - Excesso</SelectItem>
                    <SelectItem value="3">Regime Normal (Lucro Presumido/Real)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Endereço do Emitente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Endereço do Emitente</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>Logradouro</Label>
                <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
              </div>
              <div>
                <Label>Número</Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </div>
              <div>
                <Label>Município</Label>
                <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
              </div>
              <div>
                <Label>Código Município (IBGE)</Label>
                <Input value={codigoMunicipio} onChange={(e) => setCodigoMunicipio(e.target.value)} placeholder="3550308" />
              </div>
              <div>
                <Label>UF</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>CEP</Label>
                <Input value={cep} onChange={(e) => setCep(e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Emissão */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurações de Emissão</CardTitle>
              <CardDescription>Numeração, CFOP padrão e dados fiscais</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Natureza da Operação Padrão</Label>
                <Input value={naturezaOp} onChange={(e) => setNaturezaOp(e.target.value)} />
              </div>
              <div>
                <Label>Série NF-e</Label>
                <Input value={serieNFe} onChange={(e) => setSerieNFe(e.target.value)} />
              </div>
              <div>
                <Label>Número Inicial</Label>
                <Input value={numeroInicialNFe} onChange={(e) => setNumeroInicialNFe(e.target.value)} type="number" />
              </div>
              <div>
                <Label>CFOP Saída Padrão</Label>
                <Input value={cfopSaida} onChange={(e) => setCfopSaida(e.target.value)} />
              </div>
              <div>
                <Label>CFOP Entrada Padrão</Label>
                <Input value={cfopEntrada} onChange={(e) => setCfopEntrada(e.target.value)} />
              </div>
              <div>
                <Label>CST Padrão (Regime Normal)</Label>
                <Input value={cstPadrao} onChange={(e) => setCstPadrao(e.target.value)} />
              </div>
              <div>
                <Label>CSOSN Padrão (Simples Nacional)</Label>
                <Input value={csosnPadrao} onChange={(e) => setCsosnPadrao(e.target.value)} />
              </div>
              <div>
                <Label>NCM Padrão</Label>
                <Input value={ncmPadrao} onChange={(e) => setNcmPadrao(e.target.value)} />
              </div>
              <div>
                <Label>Unidade Padrão</Label>
                <Input value={unidadePadrao} onChange={(e) => setUnidadePadrao(e.target.value)} />
              </div>
              <div>
                <Label>ICMS Alíquota (%)</Label>
                <Input type="number" step="0.01" value={icmsAliquota} onChange={(e) => setIcmsAliquota(e.target.value)} />
              </div>
              <div>
                <Label>PIS Alíquota (%)</Label>
                <Input type="number" step="0.01" value={pisAliquota} onChange={(e) => setPisAliquota(e.target.value)} />
              </div>
              <div>
                <Label>COFINS Alíquota (%)</Label>
                <Input type="number" step="0.01" value={cofinsAliquota} onChange={(e) => setCofinsAliquota(e.target.value)} />
              </div>
              <div>
                <Label>IPI Alíquota (%)</Label>
                <Input type="number" step="0.01" value={ipiAliquota} onChange={(e) => setIpiAliquota(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Impressão e Contingência */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Impressão DANFE e Contingência</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch checked={imprimirDanfe} onCheckedChange={setImprimirDanfe} />
                  <Label>Imprimir DANFE automaticamente após emissão</Label>
                </div>
                <div>
                  <Label>Formato DANFE</Label>
                  <Select value={formatoDanfe} onValueChange={setFormatoDanfe}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4 Retrato</SelectItem>
                      <SelectItem value="A5_RET">A5 Retrato</SelectItem>
                      <SelectItem value="TICKET">Ticket (Papel Contínuo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4 border-l pl-6">
                <div className="flex items-center gap-3">
                  <Switch checked={emContingencia} onCheckedChange={setEmContingencia} />
                  <Label>Modo Contingência</Label>
                </div>
                {emContingencia && (
                  <>
                    <div>
                      <Label>Tipo de Contingência</Label>
                      <Select value={tipoContingencia} onValueChange={setTipoContingencia}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FSDA">FS-DA (Formulário de Segurança)</SelectItem>
                          <SelectItem value="SVCRS">SVC-RS</SelectItem>
                          <SelectItem value="SVCAN">SVC-AN</SelectItem>
                          <SelectItem value="OFFLINE">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Card className="border-yellow-500 bg-yellow-50">
                      <CardContent className="p-3 flex items-start gap-2 text-yellow-800">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <p className="text-sm">Modo de contingência ativado. As NF-es serão emitidas em contingência e deverão ser transmitidas posteriormente.</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações Adicionais Padrão */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Adicionais Padrão</CardTitle>
              <CardDescription>Cadastre mensagens padrão para reutilizar na emissão de NF-e. Os campos manuais na página de emitir continuam disponíveis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 border-b pb-3">
                <Button variant={infoTab === 'complementares' ? 'default' : 'outline'} size="sm" onClick={() => { setInfoTab('complementares'); cancelarEdicao(); }}>
                  Complementares
                </Button>
                <Button variant={infoTab === 'fisco' ? 'default' : 'outline'} size="sm" onClick={() => { setInfoTab('fisco'); cancelarEdicao(); }}>
                  Fisco
                </Button>
              </div>

              {loadingTemplates ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <div className="space-y-2">
                  {infoTemplates.filter(t => t.tipo === infoTab).length === 0 && !editandoInfo ? (
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem cadastrada.</p>
                  ) : (
                    infoTemplates.filter(t => t.tipo === infoTab).map(item => (
                      <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/30">
                        <div className="flex-1 min-w-0">
                          {editandoInfo?.id === item.id ? (
                            <div className="space-y-2">
                              <Input value={infoTitulo} onChange={e => setInfoTitulo(e.target.value)} placeholder="Título" className="h-8 text-sm" />
                              <Textarea value={infoConteudo} onChange={e => setInfoConteudo(e.target.value)} rows={2} className="text-sm" />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={salvarTemplate} disabled={!infoTitulo.trim() || !infoConteudo.trim()} className="h-7 gap-1">
                                  <Check className="h-3 w-3" /> Salvar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelarEdicao} className="h-7">Cancelar</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium truncate">{item.titulo}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.conteudo}</p>
                            </>
                          )}
                        </div>
                        {editandoInfo?.id !== item.id && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editarTemplate(item)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => excluirTemplate(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {!editandoInfo && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Nova mensagem</p>
                  <div className="space-y-2">
                    <Input value={infoTitulo} onChange={e => setInfoTitulo(e.target.value)} placeholder="Título (ex: Promoção Natal)" className="h-9 text-sm" />
                    <Textarea value={infoConteudo} onChange={e => setInfoConteudo(e.target.value)} rows={2} placeholder="Conteúdo da mensagem..." className="text-sm" />
                    <Button size="sm" onClick={salvarTemplate} disabled={!infoTitulo.trim() || !infoConteudo.trim()} className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Cadastrar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Certificado Digital */}
          <UploadCertificado
            onUpload={uploadCertificado}
            onDelete={deletarCertificado}
            onActivate={ativarCertificado}
            certificados={certificados}
            certificadoAtivo={certificadoAtivo}
            infoCertificado={infoCertificado}
            uploading={uploadingCert}
            loading={loadingCert}
          />

          {/* Botões */}
          <div className="flex justify-end gap-4">
            <Link href="/admin/cupons-nfes">
              <Button variant="outline">Cancelar</Button>
            </Link>
            <Button onClick={handleSalvar} disabled={salvando} className="gap-2 min-w-[200px] bg-blue-600 hover:bg-blue-700">
              {salvando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {salvando ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </div>
      )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
