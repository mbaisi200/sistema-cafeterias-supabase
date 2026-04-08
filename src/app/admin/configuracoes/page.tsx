'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase';
import {
  Settings,
  Building2,
  Save,
  Upload,
  Image,
  Loader2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Hash,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// Interface para os dados da empresa no Supabase (flat, sem aninhamento)
interface EmpresaData {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  nome_marca: string;
  logo_url: string;
  moeda: string;
  imposto: number;
  taxa_servico: number;
  valor_mensal: number;
  status: string;
  validade: string;
  data_inicio: string;
  criado_em: string;
  atualizado_em: string;
}

const ESTADOS_BRASIL = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

const empresaVazia: Omit<EmpresaData, 'id' | 'criado_em' | 'atualizado_em'> = {
  nome: '',
  cnpj: '',
  telefone: '',
  email: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  nome_marca: '',
  logo_url: '',
  moeda: 'R$',
  imposto: 0,
  taxa_servico: 0,
  valor_mensal: 0,
  status: 'ativo',
  validade: '',
  data_inicio: '',
};

export default function ConfiguracoesEmpresaPage() {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empresaOriginal, setEmpresaOriginal] = useState<EmpresaData | null>(null);
  const [formData, setFormData] = useState(empresaVazia);

  // Carregar dados da empresa
  const carregarEmpresa = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single();

      if (error) throw error;

      if (data) {
        const empresa = data as EmpresaData;
        setEmpresaOriginal(empresa);
        setFormData({
          nome: empresa.nome || '',
          cnpj: empresa.cnpj || '',
          telefone: empresa.telefone || '',
          email: empresa.email || '',
          logradouro: empresa.logradouro || '',
          numero: empresa.numero || '',
          complemento: empresa.complemento || '',
          bairro: empresa.bairro || '',
          cidade: empresa.cidade || '',
          estado: empresa.estado || '',
          cep: empresa.cep || '',
          nome_marca: empresa.nome_marca || '',
          logo_url: empresa.logo_url || '',
          moeda: empresa.moeda || 'R$',
          imposto: empresa.imposto ?? 0,
          taxa_servico: empresa.taxa_servico ?? 0,
          valor_mensal: empresa.valor_mensal ?? 0,
          status: empresa.status || 'ativo',
          validade: empresa.validade || '',
          data_inicio: empresa.data_inicio || '',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: `Não foi possível carregar os dados da empresa: ${message}`,
      });
    } finally {
      setLoading(false);
    }
  }, [empresaId, supabase, toast]);

  useEffect(() => {
    carregarEmpresa();
  }, [carregarEmpresa]);

  // Verificar se houve alterações
  const hasChanges = empresaOriginal
    ? JSON.stringify(formData) !==
      JSON.stringify({
        nome: empresaOriginal.nome || '',
        cnpj: empresaOriginal.cnpj || '',
        telefone: empresaOriginal.telefone || '',
        email: empresaOriginal.email || '',
        logradouro: empresaOriginal.logradouro || '',
        numero: empresaOriginal.numero || '',
        complemento: empresaOriginal.complemento || '',
        bairro: empresaOriginal.bairro || '',
        cidade: empresaOriginal.cidade || '',
        estado: empresaOriginal.estado || '',
        cep: empresaOriginal.cep || '',
        nome_marca: empresaOriginal.nome_marca || '',
        logo_url: empresaOriginal.logo_url || '',
        moeda: empresaOriginal.moeda || 'R$',
        imposto: empresaOriginal.imposto ?? 0,
        taxa_servico: empresaOriginal.taxa_servico ?? 0,
        valor_mensal: empresaOriginal.valor_mensal ?? 0,
        status: empresaOriginal.status || 'ativo',
        validade: empresaOriginal.validade || '',
        data_inicio: empresaOriginal.data_inicio || '',
      })
    : false;

  // Atualizar campo
  const updateField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Salvar dados
  const handleSalvar = async () => {
    if (!empresaId) return;
    setSaving(true);

    try {
      const updateData = {
        ...formData,
        atualizado_em: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('empresas')
        .update(updateData)
        .eq('id', empresaId);

      if (error) throw error;

      // Atualizar o original para refletir as mudanças salvas
      setEmpresaOriginal(prev =>
        prev ? { ...prev, ...updateData } : prev
      );

      toast({
        title: 'Configurações salvas!',
        description: 'As informações da empresa foram atualizadas com sucesso.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: `Não foi possível salvar as configurações: ${message}`,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'master']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Configurações' }]}>
          <LoadingSkeleton />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Configurações' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Configurações da Empresa
                </h1>
                <p className="text-muted-foreground">
                  Gerencie as informações cadastrais da sua empresa
                </p>
              </div>
            </div>
            <Button
              onClick={handleSalvar}
              disabled={saving || !hasChanges}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>

          {/* Dados da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações da Empresa
              </CardTitle>
              <CardDescription>
                Dados básicos que identificam a sua empresa no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome / Razão Social</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nome"
                      placeholder="Nome da empresa"
                      value={formData.nome}
                      onChange={(e) => updateField('nome', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome_marca">Nome da Marca</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nome_marca"
                      placeholder="Nome exibido no cardápio e cupom"
                      value={formData.nome_marca}
                      onChange={(e) => updateField('nome_marca', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usado no cardápio digital, cupom fiscal e relatórios
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => updateField('cnpj', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="contato@empresa.com"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="telefone"
                      placeholder="(00) 00000-0000"
                      value={formData.telefone}
                      onChange={(e) => updateField('telefone', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Logo da Empresa
              </CardTitle>
              <CardDescription>
                Adicione a URL da imagem do logo utilizado no cardápio e cupom fiscal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="logo_url">URL do Logo</Label>
                  <div className="relative">
                    <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="logo_url"
                      placeholder="https://exemplo.com/logo.png ou URL do Supabase Storage"
                      value={formData.logo_url}
                      onChange={(e) => updateField('logo_url', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cole a URL de uma imagem (PNG, JPG, SVG). Pode ser uma URL pública ou do Supabase Storage.
                  </p>
                </div>
              </div>

              {/* Preview do Logo */}
              {formData.logo_url && (
                <div className="mt-4">
                  <Label className="mb-2 block">Pré-visualização</Label>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="w-20 h-20 rounded-lg bg-white border flex items-center justify-center overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.logo_url}
                        alt="Logo da empresa"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<div class="flex items-center justify-center w-full h-full text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{formData.nome_marca || formData.nome || 'Logo da empresa'}</p>
                      <p className="text-xs text-muted-foreground truncate">{formData.logo_url}</p>
                      <Badge variant="secondary" className="mt-1">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Logo configurado
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {!formData.logo_url && (
                <div className="mt-4">
                  <Label className="mb-2 block">Pré-visualização</Label>
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Image className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Nenhum logo configurado</p>
                      <Badge variant="outline" className="mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Sem logo
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </CardTitle>
              <CardDescription>
                Endereço comercial da empresa que aparecerá em documentos e cupons
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input
                    id="logradouro"
                    placeholder="Rua, Avenida, Praça..."
                    value={formData.logradouro}
                    onChange={(e) => updateField('logradouro', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    placeholder="Nº"
                    value={formData.numero}
                    onChange={(e) => updateField('numero', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    placeholder="Sala, Loja, Bloco..."
                    value={formData.complemento}
                    onChange={(e) => updateField('complemento', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    placeholder="Bairro"
                    value={formData.bairro}
                    onChange={(e) => updateField('bairro', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    placeholder="Cidade"
                    value={formData.cidade}
                    onChange={(e) => updateField('cidade', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => updateField('estado', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {ESTADOS_BRASIL.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value}>
                          {estado.label} ({estado.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={(e) => updateField('cep', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Complementares (leitura) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Informações Complementares
              </CardTitle>
              <CardDescription>
                Dados de plano, imposto e taxa de serviço (configurados pelo sistema)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Input
                    value={formData.moeda || 'R$'}
                    onChange={(e) => updateField('moeda', e.target.value)}
                    placeholder="R$"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imposto (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.imposto ?? 0}
                    onChange={(e) => updateField('imposto', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taxa de Serviço (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.taxa_servico ?? 0}
                    onChange={(e) => updateField('taxa_servico', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Badge
                      variant={formData.status === 'ativo' ? 'default' : 'destructive'}
                      className={
                        formData.status === 'ativo'
                          ? 'bg-green-600 hover:bg-green-700'
                          : formData.status === 'bloqueado'
                          ? ''
                          : 'bg-yellow-600 hover:bg-yellow-700'
                      }
                    >
                      {formData.status === 'ativo' ? 'Ativo' : formData.status === 'bloqueado' ? 'Bloqueado' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Valor Mensal</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_mensal ?? 0}
                    onChange={(e) => updateField('valor_mensal', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Validade do Plano</Label>
                  <Input
                    value={formData.validade ? new Date(formData.validade).toLocaleDateString('pt-BR') : '—'}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rodapé com botão de salvar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 pb-4">
            <p className="text-sm text-muted-foreground">
              {hasChanges ? 'Há alterações não salvas' : 'Todas as alterações foram salvas'}
            </p>
            <Button
              onClick={handleSalvar}
              disabled={saving || !hasChanges}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
