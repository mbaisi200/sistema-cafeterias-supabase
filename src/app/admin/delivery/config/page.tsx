'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Settings, 
  Truck, 
  Store, 
  DollarSign, 
  Clock, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Save,
  Loader2,
  Link as LinkIcon,
  Copy,
  Check,
  ChevronLeft,
} from 'lucide-react';

interface DeliveryConfig {
  id?: string;
  delivery_ativo: boolean;
  retirada_ativo: boolean;
  taxa_entrega_padrao: number;
  pedido_minimo: number;
  tempo_preparo_min: number;
  tempo_preparo_max: number;
  aceita_dinheiro: boolean;
  aceita_cartao: boolean;
  aceita_pix: boolean;
}

export default function DeliveryConfigPage() {
  const { toast } = useToast();
  const { empresaId } = useAuth();
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<DeliveryConfig>({
    delivery_ativo: true,
    retirada_ativo: true,
    taxa_entrega_padrao: 0,
    pedido_minimo: 0,
    tempo_preparo_min: 20,
    tempo_preparo_max: 45,
    aceita_dinheiro: true,
    aceita_cartao: true,
    aceita_pix: true,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (empresaId) loadConfig();
  }, [empresaId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empresa_delivery_config')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (data) {
        setConfig({
          id: data.id,
          delivery_ativo: data.delivery_ativo ?? true,
          retirada_ativo: data.retirada_ativo ?? true,
          taxa_entrega_padrao: data.taxa_entrega_padrao || 0,
          pedido_minimo: data.pedido_minimo || 0,
          tempo_preparo_min: data.tempo_preparo_min || 20,
          tempo_preparo_max: data.tempo_preparo_max || 45,
          aceita_dinheiro: data.aceita_dinheiro ?? true,
          aceita_cartao: data.aceita_cartao ?? true,
          aceita_pix: data.aceita_pix ?? true,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const configData = {
        empresa_id: empresaId,
        delivery_ativo: config.delivery_ativo,
        retirada_ativo: config.retirada_ativo,
        taxa_entrega_padrao: config.taxa_entrega_padrao,
        pedido_minimo: config.pedido_minimo,
        tempo_preparo_min: config.tempo_preparo_min,
        tempo_preparo_max: config.tempo_preparo_max,
        aceita_dinheiro: config.aceita_dinheiro,
        aceita_cartao: config.aceita_cartao,
        aceita_pix: config.aceita_pix,
        atualizado_em: now,
      };

      if (config.id) {
        const { error } = await supabase
          .from('empresa_delivery_config')
          .update(configData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('empresa_delivery_config')
          .insert({ ...configData, criado_em: now })
          .select('id')
          .single();

        if (error) throw error;
        if (data) setConfig(prev => ({ ...prev, id: data.id }));
      }

      toast({ title: 'Configurações salvas!', description: 'As configurações de delivery foram atualizadas.' });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar as configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const cardapioUrl = empresaId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/cardapio?empresa=${empresaId}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(cardapioUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copiado!' });
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Delivery' }, { title: 'Configurações' }]}>
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-96 w-full" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Delivery' }, { title: 'Configurações' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/delivery">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Configurações de Delivery</h1>
                <p className="text-muted-foreground">Configure as opções do seu cardápio online</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>

          {/* Link do Cardápio */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <LinkIcon className="h-5 w-5" />
                Link do Seu Cardápio
              </CardTitle>
              <CardDescription className="text-blue-700">
                Compartilhe este link com seus clientes para que possam fazer pedidos online
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input 
                  value={cardapioUrl} 
                  readOnly 
                  className="bg-white font-mono text-sm"
                />
                <Button onClick={handleCopyLink} variant="outline" className="flex-shrink-0">
                  {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Modalidades */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Modalidades de Atendimento
                </CardTitle>
                <CardDescription>
                  Escolha como seus clientes podem receber os pedidos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <Label className="font-medium">Delivery</Label>
                      <p className="text-sm text-muted-foreground">Entrega no endereço do cliente</p>
                    </div>
                  </div>
                  <Switch 
                    checked={config.delivery_ativo}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, delivery_ativo: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Store className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <Label className="font-medium">Retirada no Local</Label>
                      <p className="text-sm text-muted-foreground">Cliente busca o pedido no estabelecimento</p>
                    </div>
                  </div>
                  <Switch 
                    checked={config.retirada_ativo}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, retirada_ativo: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Taxas e Pedido Mínimo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Valores e Mínimos
                </CardTitle>
                <CardDescription>
                  Configure taxas de entrega e pedido mínimo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taxa">Taxa de Entrega Padrão</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="taxa"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-10"
                      value={config.taxa_entrega_padrao}
                      onChange={(e) => setConfig(prev => ({ ...prev, taxa_entrega_padrao: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Valor cobrado pela entrega (0 para grátis)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimo">Pedido Mínimo</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="minimo"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-10"
                      value={config.pedido_minimo}
                      onChange={(e) => setConfig(prev => ({ ...prev, pedido_minimo: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Valor mínimo para fazer o pedido (0 para sem mínimomo)</p>
                </div>
              </CardContent>
            </Card>

            {/* Tempo de Preparo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tempo de Preparo
                </CardTitle>
                <CardDescription>
                  Tempo estimado para preparar os pedidos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tempoMin">Tempo Mínimo (min)</Label>
                    <Input 
                      id="tempoMin"
                      type="number"
                      min="5"
                      max="120"
                      value={config.tempo_preparo_min}
                      onChange={(e) => setConfig(prev => ({ ...prev, tempo_preparo_min: parseInt(e.target.value) || 20 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempoMax">Tempo Máximo (min)</Label>
                    <Input 
                      id="tempoMax"
                      type="number"
                      min="10"
                      max="180"
                      value={config.tempo_preparo_max}
                      onChange={(e) => setConfig(prev => ({ ...prev, tempo_preparo_max: parseInt(e.target.value) || 45 }))}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Será exibido no cardápio: "{config.tempo_preparo_min}-{config.tempo_preparo_max} min"
                </p>
              </CardContent>
            </Card>

            {/* Formas de Pagamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Formas de Pagamento
                </CardTitle>
                <CardDescription>
                  Selecione as formas de pagamento aceitas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Banknote className="h-5 w-5 text-green-600" />
                    </div>
                    <Label className="font-medium">Dinheiro</Label>
                  </div>
                  <Switch 
                    checked={config.aceita_dinheiro}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, aceita_dinheiro: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <Label className="font-medium">Cartão (Débito/Crédito)</Label>
                  </div>
                  <Switch 
                    checked={config.aceita_cartao}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, aceita_cartao: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-purple-600" />
                    </div>
                    <Label className="font-medium">PIX</Label>
                  </div>
                  <Switch 
                    checked={config.aceita_pix}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, aceita_pix: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Informação importante */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Settings className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Informações Importantes:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-yellow-700">
                    <li>Os produtos exibidos no cardápio são os mesmos cadastrados em "Produtos"</li>
                    <li>O cardápio funciona de forma independente do iFood</li>
                    <li>Os pedidos aparecerão automaticamente em "Delivery"</li>
                    <li>Marque produtos como "Disponível no iFood" apenas se usar a integração</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
