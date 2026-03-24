'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  Loader2, 
  Building2, 
  MapPin, 
  FileText,
  AlertCircle
} from 'lucide-react';
import type { NFCeConfig } from '@/types/nfce';

interface ConfiguracaoNFCeFormProps {
  config: NFCeConfig | null;
  onSave: (config: Partial<NFCeConfig>) => Promise<{ sucesso: boolean; erro?: string }>;
  loading: boolean;
}

export function ConfiguracaoNFCeForm({ config, onSave, loading }: ConfiguracaoNFCeFormProps) {
  const [formData, setFormData] = useState<Partial<NFCeConfig>>({
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
    csosn_padrao: '102',
    cfop_padrao: '5102',
    ncm_padrao: '',
    unidade_padrao: 'UN',
    informacoes_adicionais: '',
    icms_situacao_tributaria: '102',
    icms_aliquota: 0,
    pis_aliquota: 0,
    cofins_aliquota: 0,
    imprimir_danfe_automatico: true,
    mensagem_consumidor: '',
    em_contingencia: false,
    motivo_contingencia: '',
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        ...config,
      });
    }
  }, [config]);

  const handleChange = (field: keyof NFCeConfig, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await onSave(formData);
      
      if (result.sucesso) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.erro || 'Erro ao salvar configurações');
      }
    } catch (err) {
      setError('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const formatarCNPJ = (valor: string) => {
    const nums = valor.replace(/\D/g, '');
    return nums.slice(0, 14);
  };

  const formatarCEP = (valor: string) => {
    const nums = valor.replace(/\D/g, '');
    return nums.slice(0, 8);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            Configurações salvas com sucesso!
          </AlertDescription>
        </Alert>
      )}

      {/* Ambiente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Ambiente de Emissão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={formData.ambiente}
              onValueChange={(value) => handleChange('ambiente', value)}
            >
              <SelectTrigger className="w-48">
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
                    <Badge variant="default" className="bg-green-600">Produção</Badge>
                    Produção
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Use homologação para testes. Produção emite notas válidas fiscalmente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Emitente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Dados do Emitente
          </CardTitle>
          <CardDescription>
            Informações que aparecerão na NFC-e
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => handleChange('cnpj', formatarCNPJ(e.target.value))}
                placeholder="00000000000000"
                maxLength={14}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inscricao_estadual">Inscrição Estadual *</Label>
              <Input
                id="inscricao_estadual"
                value={formData.inscricao_estadual}
                onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razao_social">Razão Social *</Label>
              <Input
                id="razao_social"
                value={formData.razao_social}
                onChange={(e) => handleChange('razao_social', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
              <Input
                id="nome_fantasia"
                value={formData.nome_fantasia}
                onChange={(e) => handleChange('nome_fantasia', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
              <Input
                id="inscricao_municipal"
                value={formData.inscricao_municipal}
                onChange={(e) => handleChange('inscricao_municipal', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="regime_tributario">Regime Tributário</Label>
            <Select
              value={formData.regime_tributario}
              onValueChange={(value) => handleChange('regime_tributario', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Simples Nacional</SelectItem>
                <SelectItem value="2">Simples Nacional - Excesso</SelectItem>
                <SelectItem value="3">Regime Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="logradouro">Logradouro *</Label>
              <Input
                id="logradouro"
                value={formData.logradouro}
                onChange={(e) => handleChange('logradouro', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Número *</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) => handleChange('numero', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={formData.complemento}
                onChange={(e) => handleChange('complemento', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro *</Label>
              <Input
                id="bairro"
                value={formData.bairro}
                onChange={(e) => handleChange('bairro', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP *</Label>
              <Input
                id="cep"
                value={formData.cep}
                onChange={(e) => handleChange('cep', formatarCEP(e.target.value))}
                maxLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo_municipio">Cód. Município IBGE *</Label>
              <Input
                id="codigo_municipio"
                value={formData.codigo_municipio}
                onChange={(e) => handleChange('codigo_municipio', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipio">Município *</Label>
              <Input
                id="municipio"
                value={formData.municipio}
                onChange={(e) => handleChange('municipio', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf">UF *</Label>
              <Input
                id="uf"
                value={formData.uf}
                onChange={(e) => handleChange('uf', e.target.value.toUpperCase())}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serie">Série</Label>
              <Input
                id="serie"
                value={formData.serie}
                onChange={(e) => handleChange('serie', e.target.value)}
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_inicial">Número Inicial</Label>
              <Input
                id="numero_inicial"
                type="number"
                value={formData.numero_inicial}
                onChange={(e) => handleChange('numero_inicial', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_atual">Número Atual</Label>
              <Input
                id="numero_atual"
                type="number"
                value={config?.numero_atual || 0}
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="csosn_padrao">CSOSN Padrão</Label>
              <Input
                id="csosn_padrao"
                value={formData.csosn_padrao}
                onChange={(e) => handleChange('csosn_padrao', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfop_padrao">CFOP Padrão</Label>
              <Input
                id="cfop_padrao"
                value={formData.cfop_padrao}
                onChange={(e) => handleChange('cfop_padrao', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ncm_padrao">NCM Padrão</Label>
              <Input
                id="ncm_padrao"
                value={formData.ncm_padrao}
                onChange={(e) => handleChange('ncm_padrao', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade_padrao">Unidade Padrão</Label>
              <Input
                id="unidade_padrao"
                value={formData.unidade_padrao}
                onChange={(e) => handleChange('unidade_padrao', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="informacoes_adicionais">Informações Adicionais</Label>
            <Textarea
              id="informacoes_adicionais"
              value={formData.informacoes_adicionais}
              onChange={(e) => handleChange('informacoes_adicionais', e.target.value)}
              placeholder="Informações que aparecerão na NFC-e"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem_consumidor">Mensagem para o Consumidor</Label>
            <Textarea
              id="mensagem_consumidor"
              value={formData.mensagem_consumidor}
              onChange={(e) => handleChange('mensagem_consumidor', e.target.value)}
              placeholder="Ex: Obrigado pela preferência!"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="imprimir_danfe">Imprimir DANFE Automaticamente</Label>
            <Switch
              id="imprimir_danfe"
              checked={formData.imprimir_danfe_automatico}
              onCheckedChange={(checked) => handleChange('imprimir_danfe_automatico', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || loading} className="min-w-32">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
