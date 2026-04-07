'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useConfiguracoesCupom, configuracoesCupomPadrao, ConfiguracoesCupom } from '@/hooks/useSupabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  Printer, 
  Save, 
  RotateCcw, 
  Eye, 
  Ruler, 
  Palette,
  Building2,
  FileText,
  FileKey,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de pré-visualização
function PreviaCupom({ formData }: { formData: ConfiguracoesCupom }) {
  const larguraPx = formData.larguraPapel * 3.78;
  const fontSize = formData.tamanhoFonte || 12;
  const fontWeight = formData.intensidadeImpressao === 'normal' ? 400 : 
                     formData.intensidadeImpressao === 'escura' ? 600 : 700;
  const lineHeight = formData.espacamentoLinhas || 1.4;
  const margemSup = formData.margemSuperior ?? 2;
  const margemInf = formData.margemInferior ?? 2;
  const margemEsq = formData.margemEsquerda ?? 2;
  const margemDir = formData.margemDireita ?? 2;

  // Usar os mesmos campos que a função de impressão
  const nomeEmpresa = formData.nomeEmpresa || 'NOME DA EMPRESA';
  const cnpjEmpresa = formData.cnpj || formData.cnpjEmpresa || '';
  const enderecoEmpresa = formData.endereco || formData.enderecoEmpresa || '';
  const telefoneEmpresa = formData.telefone || formData.telefoneEmpresa || '';
  const mensagemRodape = formData.mensagemRodape || 'Obrigado pela preferência!\nVolte sempre!';

  // Formatar CNPJ: XX.XXX.XXX/XXXX-XX
  const formatarCNPJ = (cnpj: string) => {
    if (!cnpj) return '';
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) return cnpj;
    return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12)}`;
  };

  // Formatar Telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  const formatarTelefone = (telefone: string) => {
    if (!telefone) return '';
    const numeros = telefone.replace(/\D/g, '');
    
    if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    } else if (numeros.length === 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    } else if (numeros.length === 9) {
      return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
    } else if (numeros.length === 8) {
      return `${numeros.slice(0, 4)}-${numeros.slice(4)}`;
    }
    return telefone;
  };

  return (
    <div 
      className="bg-white border-2 border-dashed border-gray-300 mx-auto shadow-lg"
      style={{ 
        width: `${Math.min(larguraPx, 400)}px`,
        fontSize: `${fontSize}px`,
        fontWeight,
        lineHeight,
        padding: `${margemSup}mm ${margemDir}mm ${margemInf}mm ${margemEsq}mm`,
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div className="text-center font-bold mb-2">
        {nomeEmpresa}
      </div>
      {cnpjEmpresa && (
        <div className="text-center text-xs mb-1">CNPJ: {formatarCNPJ(cnpjEmpresa)}</div>
      )}
      {enderecoEmpresa && (
        <div className="text-center text-xs mb-2">{enderecoEmpresa}</div>
      )}
      {telefoneEmpresa && (
        <div className="text-center text-xs mb-2">Tel: {formatarTelefone(telefoneEmpresa)}</div>
      )}
      <div className="border-t border-b border-gray-400 py-1 my-1 text-center">
        CUPOM FISCAL
      </div>
      <div className="text-xs my-2">
        <div>Data: {new Date().toLocaleDateString('pt-BR')} Hora: {new Date().toLocaleTimeString('pt-BR')}</div>
      </div>
      <div className="border-t border-gray-300 my-1"></div>
      <div className="text-xs">
        <div className="font-bold">ITENS:</div>
        <div className="flex justify-between">
          <span>Produto Exemplo</span>
          <span>R$ 25,00</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>  1 x R$ 25,00</span>
          <span>R$ 25,00</span>
        </div>
      </div>
      <div className="border-t border-gray-300 my-1"></div>
      <div className="flex justify-between font-bold">
        <span>TOTAL:</span>
        <span>R$ 25,00</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Forma Pgto:</span>
        <span>Dinheiro</span>
      </div>
      <div className="border-t border-b border-gray-400 my-2"></div>
      <div className="text-center text-xs whitespace-pre-line">
        {mensagemRodape}
      </div>
    </div>
  );
}

// Tipos para NFC-e
interface NFCeConfigData {
  id?: string;
  ambiente: 'homologacao' | 'producao';
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  codigo_municipio: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  regime_tributario: '1' | '2' | '3';
  serie: string;
  numero_inicial: number;
  numero_atual: number;
  csosn_padrao: string;
  cfop_padrao: string;
  ncm_padrao: string;
  unidade_padrao: string;
  informacoes_adicionais: string;
  mensagem_consumidor: string;
  imprimir_danfe_automatico: boolean;
  ativo: boolean;
}

interface CertificadoInfo {
  razaoSocial: string;
  cnpj: string;
  validadeInicio: Date;
  validadeFim: Date;
  diasRestantes: number;
  emissor: string;
}

const nfceConfigPadrao: NFCeConfigData = {
  ambiente: 'homologacao',
  cnpj: '',
  inscricao_estadual: '',
  inscricao_municipal: '',
  razao_social: '',
  nome_fantasia: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  codigo_municipio: '',
  municipio: '',
  uf: '',
  cep: '',
  telefone: '',
  email: '',
  regime_tributario: '1',
  serie: '1',
  numero_inicial: 1,
  numero_atual: 0,
  csosn_padrao: '102',
  cfop_padrao: '5102',
  ncm_padrao: '',
  unidade_padrao: 'UN',
  informacoes_adicionais: '',
  mensagem_consumidor: '',
  imprimir_danfe_automatico: true,
  ativo: false,
};

export default function ConfiguracoesCupomPage() {
  const { configuracoes, loading, saving, salvarConfiguracoes } = useConfiguracoesCupom();
  const { toast } = useToast();
  const { empresaId } = useAuth();
  const supabase = getSupabaseClient();
  
  // Estado local para edição
  const [localData, setLocalData] = useState<ConfiguracoesCupom | null>(null);

  // Estado NFC-e
  const [nfceConfig, setNfceConfig] = useState<NFCeConfigData>(nfceConfigPadrao);
  const [nfceLoading, setNfceLoading] = useState(true);
  const [nfceSaving, setNfceSaving] = useState(false);
  const [certificadoInfo, setCertificadoInfo] = useState<CertificadoInfo | null>(null);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [certificadoSenha, setCertificadoSenha] = useState('');

  // Dados atuais (local ou do servidor)
  const formData = localData ?? configuracoes ?? configuracoesCupomPadrao;

  // Verificar mudanças
  const hasChanges = useMemo(() => {
    if (!localData || !configuracoes) return false;
    return JSON.stringify(localData) !== JSON.stringify(configuracoes);
  }, [localData, configuracoes]);

  // Carregar configurações NFC-e
  useEffect(() => {
    if (empresaId) {
      carregarNFCeConfig();
    }
  }, [empresaId]);

  const carregarNFCeConfig = async () => {
    if (!empresaId) return;
    setNfceLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('nfce_config')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (data) {
        setNfceConfig({
          id: data.id,
          ambiente: data.ambiente || 'homologacao',
          cnpj: data.cnpj || '',
          inscricao_estadual: data.inscricao_estadual || '',
          inscricao_municipal: data.inscricao_municipal || '',
          razao_social: data.razao_social || '',
          nome_fantasia: data.nome_fantasia || '',
          logradouro: data.logradouro || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          codigo_municipio: data.codigo_municipio || '',
          municipio: data.municipio || '',
          uf: data.uf || '',
          cep: data.cep || '',
          telefone: data.telefone || '',
          email: data.email || '',
          regime_tributario: data.regime_tributario || '1',
          serie: data.serie || '1',
          numero_inicial: data.numero_inicial || 1,
          numero_atual: data.numero_atual || 0,
          csosn_padrao: data.csosn_padrao || '102',
          cfop_padrao: data.cfop_padrao || '5102',
          ncm_padrao: data.ncm_padrao || '',
          unidade_padrao: data.unidade_padrao || 'UN',
          informacoes_adicionais: data.informacoes_adicionais || '',
          mensagem_consumidor: data.mensagem_consumidor || '',
          imprimir_danfe_automatico: data.imprimir_danfe_automatico ?? true,
          ativo: data.ativo ?? false,
        });
      }

      // Carregar info do certificado
      const { data: certData } = await supabase
        .from('nfce_certificados')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .maybeSingle();

      if (certData && certData.razao_social) {
        setCertificadoInfo({
          razaoSocial: certData.razao_social,
          cnpj: certData.cnpj || '',
          validadeInicio: new Date(certData.validade_inicio),
          validadeFim: new Date(certData.validade_fim),
          diasRestantes: Math.ceil((new Date(certData.validade_fim).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          emissor: certData.emissor || '',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar config NFC-e:', error);
    } finally {
      setNfceLoading(false);
    }
  };

  const handleInputChange = useCallback((field: keyof ConfiguracoesCupom, value: string | number) => {
    setLocalData(prev => ({
      ...(prev ?? configuracoes ?? configuracoesCupomPadrao),
      [field]: value,
    }));
  }, [configuracoes]);

  const handleNFCeChange = (field: keyof NFCeConfigData, value: string | number | boolean) => {
    setNfceConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSalvar = async () => {
    if (!localData) return;
    try {
      await salvarConfiguracoes(localData);
      setLocalData(null);
      toast({
        title: 'Configurações salvas!',
        description: 'As configurações do cupom foram salvas com sucesso.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
      });
    }
  };

  const handleSalvarNFCe = async () => {
    if (!empresaId) return;
    setNfceSaving(true);

    try {
      const configData = {
        ...nfceConfig,
        empresa_id: empresaId,
        atualizado_em: new Date().toISOString(),
      };

      if (nfceConfig.id) {
        const { error } = await supabase
          .from('nfce_config')
          .update(configData)
          .eq('id', nfceConfig.id);
        if (error) throw error;
      } else {
        configData.criado_em = new Date().toISOString();
        const { data, error } = await supabase
          .from('nfce_config')
          .insert(configData)
          .select('id')
          .single();
        if (error) throw error;
        if (data) setNfceConfig(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: 'Configurações NFC-e salvas!',
        description: 'As configurações de emissão foram salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar NFC-e',
        description: error.message || 'Não foi possível salvar as configurações.',
      });
    } finally {
      setNfceSaving(false);
    }
  };

  const handleUploadCertificado = async () => {
    if (!certificadoFile || !certificadoSenha || !empresaId) {
      toast({
        variant: 'destructive',
        title: 'Dados incompletos',
        description: 'Selecione o arquivo e informe a senha do certificado.',
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // Upload do certificado
        const { error } = await supabase
          .from('nfce_certificados')
          .insert({
            empresa_id: empresaId,
            nome_arquivo: certificadoFile.name,
            arquivo_base64: base64.split(',')[1],
            senha: certificadoSenha,
            ativo: true,
            criado_em: new Date().toISOString(),
          });

        if (error) throw error;

        toast({
          title: 'Certificado enviado!',
          description: 'O certificado digital foi enviado com sucesso.',
        });

        setCertificadoFile(null);
        setCertificadoSenha('');
        carregarNFCeConfig();
      };
      reader.readAsDataURL(certificadoFile);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: error.message || 'Não foi possível enviar o certificado.',
      });
    }
  };

  const handleRestaurarPadrao = () => {
    setLocalData(configuracoesCupomPadrao);
    toast({
      title: 'Valores restaurados',
      description: 'Os valores padrão foram restaurados. Clique em Salvar para confirmar.',
    });
  };

  if (loading || nfceLoading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Configurações Cupom' }]}>
          <LoadingSkeleton />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Configurações Cupom' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Printer className="h-8 w-8 text-blue-600" />
                Configurações do Cupom Fiscal
              </h1>
              <p className="text-muted-foreground">
                Configure o cupom, impressão e emissão de NFC-e
              </p>
            </div>
          </div>

          <Tabs defaultValue="papel" className="space-y-4">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="papel" className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                <span className="hidden sm:inline">Papel</span>
              </TabsTrigger>
              <TabsTrigger value="empresa" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Empresa</span>
              </TabsTrigger>
              <TabsTrigger value="impressao" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Impressão</span>
              </TabsTrigger>
              <TabsTrigger value="nfce" className="flex items-center gap-2">
                <FileKey className="h-4 w-4" />
                <span className="hidden sm:inline">NFC-e</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Configurações do Papel */}
            <TabsContent value="papel">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Ruler className="h-5 w-5 text-blue-600" />
                    Tamanho do Papel
                  </CardTitle>
                  <CardDescription>
                    Configure as dimensões do cupom em milímetros
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="larguraPapel">Largura do Papel (mm)</Label>
                    <Select
                      value={(formData.larguraPapel ?? 58).toString()}
                      onValueChange={(value) => handleInputChange('larguraPapel', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="58">58mm - Impressora térmica pequena</SelectItem>
                        <SelectItem value="80">80mm - Impressora térmica padrão</SelectItem>
                        <SelectItem value="110">110mm - Impressora A4 estreito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="margemSuperior">Margem Superior (mm)</Label>
                      <Input
                        id="margemSuperior"
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={formData.margemSuperior}
                        onChange={(e) => handleInputChange('margemSuperior', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="margemInferior">Margem Inferior (mm)</Label>
                      <Input
                        id="margemInferior"
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={formData.margemInferior}
                        onChange={(e) => handleInputChange('margemInferior', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="margemEsquerda">Margem Esquerda (mm)</Label>
                      <Input
                        id="margemEsquerda"
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={formData.margemEsquerda}
                        onChange={(e) => handleInputChange('margemEsquerda', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="margemDireita">Margem Direita (mm)</Label>
                      <Input
                        id="margemDireita"
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={formData.margemDireita}
                        onChange={(e) => handleInputChange('margemDireita', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={handleRestaurarPadrao} disabled={saving}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurar Padrão
                    </Button>
                    <Button onClick={handleSalvar} disabled={saving || !hasChanges} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Dados da Empresa */}
            <TabsContent value="empresa">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Dados da Empresa
                  </CardTitle>
                  <CardDescription>
                    Informações que aparecerão no cabeçalho do cupom
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                    <Input
                      id="nomeEmpresa"
                      placeholder="Nome que aparecerá no cupom"
                      value={formData.nomeEmpresa}
                      onChange={(e) => handleInputChange('nomeEmpresa', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => handleInputChange('cnpj', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      placeholder="Rua, número, bairro, cidade"
                      value={formData.endereco}
                      onChange={(e) => handleInputChange('endereco', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      placeholder="(00) 00000-0000"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange('telefone', e.target.value)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="mensagemRodape">Mensagem de Rodapé</Label>
                    <Textarea
                      id="mensagemRodape"
                      placeholder="Obrigado pela preferência!&#10;Volte sempre!"
                      value={formData.mensagemRodape}
                      onChange={(e) => handleInputChange('mensagemRodape', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={handleRestaurarPadrao} disabled={saving}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurar Padrão
                    </Button>
                    <Button onClick={handleSalvar} disabled={saving || !hasChanges} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Configurações de Impressão */}
            <TabsContent value="impressao">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5 text-blue-600" />
                    Qualidade de Impressão
                  </CardTitle>
                  <CardDescription>
                    Ajuste a intensidade e tamanho da fonte para impressão mais escura
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="intensidadeImpressao">Intensidade da Impressão</Label>
                    <Select
                      value={formData.intensidadeImpressao}
                      onValueChange={(value: ConfiguracoesCupom['intensidadeImpressao']) => 
                        handleInputChange('intensidadeImpressao', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal - Impressão padrão</SelectItem>
                        <SelectItem value="escura">Escura - Impressão mais forte (recomendado)</SelectItem>
                        <SelectItem value="muito-escura">Muito Escura - Impressão intensa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tamanhoFonte">Tamanho da Fonte (pt)</Label>
                      <Select
                        value={(formData.tamanhoFonte ?? 12).toString()}
                        onValueChange={(value) => handleInputChange('tamanhoFonte', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9">9pt - Muito pequena</SelectItem>
                          <SelectItem value="10">10pt - Pequena</SelectItem>
                          <SelectItem value="11">11pt - Média</SelectItem>
                          <SelectItem value="12">12pt - Normal (recomendado)</SelectItem>
                          <SelectItem value="14">14pt - Grande</SelectItem>
                          <SelectItem value="16">16pt - Muito grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="espacamentoLinhas">Espaçamento entre Linhas</Label>
                      <Select
                        value={(formData.espacamentoLinhas ?? 1.4).toString()}
                        onValueChange={(value) => handleInputChange('espacamentoLinhas', parseFloat(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1.0 - Compacto</SelectItem>
                          <SelectItem value="1.2">1.2 - Menor</SelectItem>
                          <SelectItem value="1.4">1.4 - Normal</SelectItem>
                          <SelectItem value="1.6">1.6 - Maior</SelectItem>
                          <SelectItem value="1.8">1.8 - Espaçado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Pré-visualização */}
                  <div className="mt-6">
                    <Label className="mb-2 block">Pré-visualização</Label>
                    <div className="bg-gray-100 rounded-lg p-4 flex justify-center">
                      <PreviaCupom formData={formData} />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={handleRestaurarPadrao} disabled={saving}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurar Padrão
                    </Button>
                    <Button onClick={handleSalvar} disabled={saving || !hasChanges} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: NFC-e */}
            <TabsContent value="nfce">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna Principal */}
                <div className="space-y-6">
                  {/* Status e Ambiente */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileKey className="h-5 w-5 text-green-600" />
                        Configuração NFC-e
                      </CardTitle>
                      <CardDescription>
                        Configure a emissão de Nota Fiscal de Consumidor Eletrônica
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>NFC-e Ativa</Label>
                          <p className="text-sm text-muted-foreground">Habilitar emissão de NFC-e</p>
                        </div>
                        <Switch
                          checked={nfceConfig.ativo}
                          onCheckedChange={(checked) => handleNFCeChange('ativo', checked)}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Ambiente de Emissão</Label>
                        <Select
                          value={nfceConfig.ambiente}
                          onValueChange={(value: 'homologacao' | 'producao') => handleNFCeChange('ambiente', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="homologacao">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">Testes</Badge>
                                Homologação
                              </div>
                            </SelectItem>
                            <SelectItem value="producao">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-500">Produção</Badge>
                                Produção
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Use homologação para testes. Produção emite notas válidas.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Certificado Digital */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Certificado Digital</CardTitle>
                      <CardDescription>
                        Upload do certificado A1 (.pfx) para assinatura das notas
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {certificadoInfo ? (
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            <div className="font-medium">{certificadoInfo.razaoSocial}</div>
                            <div className="text-sm">CNPJ: {certificadoInfo.cnpj}</div>
                            <div className="text-sm">
                              Válido até: {certificadoInfo.validadeFim.toLocaleDateString('pt-BR')}
                              {' '}({certificadoInfo.diasRestantes} dias restantes)
                            </div>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Nenhum certificado cadastrado. Faça upload do certificado A1.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label>Arquivo do Certificado (.pfx)</Label>
                        <Input
                          type="file"
                          accept=".pfx,.p12"
                          onChange={(e) => setCertificadoFile(e.target.files?.[0] || null)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Senha do Certificado</Label>
                        <Input
                          type="password"
                          value={certificadoSenha}
                          onChange={(e) => setCertificadoSenha(e.target.value)}
                          placeholder="Digite a senha"
                        />
                      </div>

                      <Button
                        onClick={handleUploadCertificado}
                        disabled={!certificadoFile || !certificadoSenha}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar Certificado
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Dados do Emitente */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dados do Emitente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>CNPJ *</Label>
                          <Input
                            value={nfceConfig.cnpj}
                            onChange={(e) => handleNFCeChange('cnpj', e.target.value.replace(/\D/g, '').slice(0, 14))}
                            placeholder="00000000000000"
                            maxLength={14}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Inscrição Estadual *</Label>
                          <Input
                            value={nfceConfig.inscricao_estadual}
                            onChange={(e) => handleNFCeChange('inscricao_estadual', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Razão Social *</Label>
                        <Input
                          value={nfceConfig.razao_social}
                          onChange={(e) => handleNFCeChange('razao_social', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Nome Fantasia</Label>
                        <Input
                          value={nfceConfig.nome_fantasia}
                          onChange={(e) => handleNFCeChange('nome_fantasia', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Inscrição Municipal</Label>
                          <Input
                            value={nfceConfig.inscricao_municipal}
                            onChange={(e) => handleNFCeChange('inscricao_municipal', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Telefone</Label>
                          <Input
                            value={nfceConfig.telefone}
                            onChange={(e) => handleNFCeChange('telefone', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Regime Tributário</Label>
                          <Select
                            value={nfceConfig.regime_tributario}
                            onValueChange={(value: '1' | '2' | '3') => handleNFCeChange('regime_tributario', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Simples Nacional</SelectItem>
                              <SelectItem value="2">Simples - Excesso</SelectItem>
                              <SelectItem value="3">Regime Normal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Endereço */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Endereço do Emitente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                          <Label>Logradouro *</Label>
                          <Input
                            value={nfceConfig.logradouro}
                            onChange={(e) => handleNFCeChange('logradouro', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Número *</Label>
                          <Input
                            value={nfceConfig.numero}
                            onChange={(e) => handleNFCeChange('numero', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Complemento</Label>
                          <Input
                            value={nfceConfig.complemento}
                            onChange={(e) => handleNFCeChange('complemento', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Bairro *</Label>
                          <Input
                            value={nfceConfig.bairro}
                            onChange={(e) => handleNFCeChange('bairro', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>CEP *</Label>
                          <Input
                            value={nfceConfig.cep}
                            onChange={(e) => handleNFCeChange('cep', e.target.value.replace(/\D/g, '').slice(0, 8))}
                            maxLength={8}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cód. IBGE *</Label>
                          <Input
                            value={nfceConfig.codigo_municipio}
                            onChange={(e) => handleNFCeChange('codigo_municipio', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Município *</Label>
                          <Input
                            value={nfceConfig.municipio}
                            onChange={(e) => handleNFCeChange('municipio', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>UF *</Label>
                          <Input
                            value={nfceConfig.uf}
                            onChange={(e) => handleNFCeChange('uf', e.target.value.toUpperCase().slice(0, 2))}
                            maxLength={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Configurações de Emissão */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Configurações de Emissão</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Série</Label>
                          <Input
                            value={nfceConfig.serie}
                            onChange={(e) => handleNFCeChange('serie', e.target.value)}
                            maxLength={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Número Inicial</Label>
                          <Input
                            type="number"
                            value={nfceConfig.numero_inicial}
                            onChange={(e) => handleNFCeChange('numero_inicial', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Número Atual</Label>
                          <Input
                            type="number"
                            value={nfceConfig.numero_atual}
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>CSOSN Padrão</Label>
                          <Input
                            value={nfceConfig.csosn_padrao}
                            onChange={(e) => handleNFCeChange('csosn_padrao', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>CFOP Padrão</Label>
                          <Input
                            value={nfceConfig.cfop_padrao}
                            onChange={(e) => handleNFCeChange('cfop_padrao', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>NCM Padrão</Label>
                          <Input
                            value={nfceConfig.ncm_padrao}
                            onChange={(e) => handleNFCeChange('ncm_padrao', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unidade</Label>
                          <Input
                            value={nfceConfig.unidade_padrao}
                            onChange={(e) => handleNFCeChange('unidade_padrao', e.target.value)}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Mensagem para o Consumidor</Label>
                        <Textarea
                          value={nfceConfig.mensagem_consumidor}
                          onChange={(e) => handleNFCeChange('mensagem_consumidor', e.target.value)}
                          placeholder="Obrigado pela preferência!"
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Imprimir DANFE Automaticamente</Label>
                          <p className="text-sm text-muted-foreground">Após emissão da NFC-e</p>
                        </div>
                        <Switch
                          checked={nfceConfig.imprimir_danfe_automatico}
                          onCheckedChange={(checked) => handleNFCeChange('imprimir_danfe_automatico', checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={handleSalvarNFCe}
                    disabled={nfceSaving}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {nfceSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Configurações NFC-e
                      </>
                    )}
                  </Button>
                </div>

                {/* Coluna de Resumo */}
                <div className="space-y-6">
                  <Card className="sticky top-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Resumo NFC-e</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        {nfceConfig.ativo ? (
                          <Badge className="bg-green-500">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Ambiente</span>
                        <Badge variant={nfceConfig.ambiente === 'producao' ? 'default' : 'secondary'}>
                          {nfceConfig.ambiente === 'producao' ? 'Produção' : 'Homologação'}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CNPJ</span>
                          <span className="font-mono">{nfceConfig.cnpj || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Razão Social</span>
                          <span className="truncate max-w-[180px]">{nfceConfig.razao_social || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Série</span>
                          <span>{nfceConfig.serie}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Próximo Número</span>
                          <span>{Math.max(nfceConfig.numero_atual + 1, nfceConfig.numero_inicial)}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Certificado</span>
                        {certificadoInfo ? (
                          <Badge className="bg-green-500">
                            {certificadoInfo.diasRestantes} dias
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Não configurado</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Precisa de ajuda?</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                      <p>Para emitir NFC-e você precisa:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Certificado Digital A1 válido</li>
                        <li>Inscrição Estadual ativa</li>
                        <li>Credenciais SEFAZ do seu estado</li>
                      </ol>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
