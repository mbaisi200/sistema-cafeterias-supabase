'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Settings,
  Database, Clock, ArrowLeft, Link2, Copy, Check, Package, ShoppingBag, HelpCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import type { NoventaENoveIntegrationStatus } from '@/types/noventa-e-nove';

interface NoventaENoveConfigState {
  id?: string;
  empresaId: string;
  ativo: boolean;
  status: NoventaENoveIntegrationStatus;
  clientId: string;
  clientSecret: string;
  merchantId: string;
  apiBaseUrl: string;
  sincronizarProdutos: boolean;
  sincronizarEstoque: boolean;
  sincronizarPrecos: boolean;
  receberPedidosAutomatico: boolean;
  tempoPreparoPadrao: number;
  totalPedidosRecebidos: number;
  ultimoPedidoEm?: Date;
  ultimoErro?: string;
}

interface NoventaENoveStats {
  pedidosHoje: number;
  vendasHoje: number;
  pedidosMes: number;
  vendasMes: number;
}

function NoventaENoveContent() {
  const router = useRouter();
  const { empresaId } = useAuth();
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState<NoventaENoveConfigState>({
    empresaId: '',
    ativo: false,
    status: 'disconnected',
    clientId: '',
    clientSecret: '',
    merchantId: '',
    apiBaseUrl: 'https://api.99food.com/open-delivery/v1',
    sincronizarProdutos: true,
    sincronizarEstoque: true,
    sincronizarPrecos: true,
    receberPedidosAutomatico: true,
    tempoPreparoPadrao: 30,
    totalPedidosRecebidos: 0,
  });

  const [stats, setStats] = useState<NoventaENoveStats>({
    pedidosHoje: 0, vendasHoje: 0, pedidosMes: 0, vendasMes: 0,
  });

  useEffect(() => {
    if (empresaId) { loadConfig(); loadStats(); }
  }, [empresaId]);

  const loadConfig = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/noventa-e-nove/config?empresaId=${empresaId}`);
      const json = await res.json();
      if (json.sucesso && json.data) {
        setConfig({
          id: json.data.id,
          empresaId,
          ativo: json.data.ativo || false,
          status: json.data.status || 'disconnected',
          clientId: json.data.clientId || '',
          clientSecret: json.data.clientSecret || '',
          merchantId: json.data.merchantId || '',
          apiBaseUrl: json.data.apiBaseUrl || 'https://api.99food.com/open-delivery/v1',
          sincronizarProdutos: json.data.sincronizarProdutos ?? true,
          sincronizarEstoque: json.data.sincronizarEstoque ?? true,
          sincronizarPrecos: json.data.sincronizarPrecos ?? true,
          receberPedidosAutomatico: json.data.receberPedidosAutomatico ?? true,
          tempoPreparoPadrao: json.data.tempoPreparoPadrao || 30,
          totalPedidosRecebidos: json.data.totalPedidosRecebidos || 0,
          ultimoPedidoEm: json.data.ultimoPedidoEm ? new Date(json.data.ultimoPedidoEm) : undefined,
          ultimoErro: json.data.ultimoErro || undefined,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!empresaId) return;
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseClient();
      const hoje = new Date().toISOString().slice(0, 10);
      const mes = new Date();
      mes.setDate(1);
      const mesStr = mes.toISOString();

      const { count: pedidosHoje } = await supabase
        .from('noventa_e_nove_pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .gte('criado_em', hoje);

      const { data: vendasHoje } = await supabase
        .from('vendas')
        .select('total')
        .eq('empresa_id', empresaId)
        .eq('canal', 'noventa_e_nove')
        .gte('criado_em', hoje);

      const { count: pedidosMes } = await supabase
        .from('noventa_e_nove_pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .gte('criado_em', mesStr);

      const { data: vendasMes } = await supabase
        .from('vendas')
        .select('total')
        .eq('empresa_id', empresaId)
        .eq('canal', 'noventa_e_nove')
        .gte('criado_em', mesStr);

      setStats({
        pedidosHoje: pedidosHoje || 0,
        vendasHoje: vendasHoje?.reduce((s, v: any) => s + (v.total || 0), 0) || 0,
        pedidosMes: pedidosMes || 0,
        vendasMes: vendasMes?.reduce((s, v: any) => s + (v.total || 0), 0) || 0,
      });
    } catch (e) {
      console.error('Erro ao carregar stats:', e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/noventa-e-nove/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, ...config }),
      });
      const json = await res.json();
      if (!json.sucesso) throw new Error(json.erro?.mensagem || 'Erro ao salvar');
      (await import('@/hooks/use-toast')).toast({ title: 'Configuração salva!' });
      loadStats();
    } catch (error: any) {
      (await import('@/hooks/use-toast')).toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/noventa-e-nove/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, action: 'test_connection' }),
      });
      const json = await res.json();
      if (json.sucesso) {
        setConfig(prev => ({ ...prev, status: 'connected' }));
        (await import('@/hooks/use-toast')).toast({ title: 'Conexão OK!', description: 'Teste de conexão realizado com sucesso.' });
      } else {
        throw new Error(json.erro?.mensagem || 'Falha no teste');
      }
    } catch (error: any) {
      setConfig(prev => ({ ...prev, status: 'error', ultimoErro: error.message }));
      (await import('@/hooks/use-toast')).toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setTesting(false);
    }
  };

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/noventa-e-nove` : '';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const statusConfig = {
    connected: { label: 'Conectado', class: 'bg-green-500' },
    disconnected: { label: 'Desconectado', class: 'bg-gray-400' },
    error: { label: 'Erro', class: 'bg-red-500' },
    pending: { label: 'Pendente', class: 'bg-yellow-500' },
  };

  const sc = statusConfig[config.status] || statusConfig.disconnected;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/admin/integracoes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">99Food</h1>
          <p className="text-muted-foreground mt-1">Integração via Open Delivery</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Credenciais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> Credenciais
              </CardTitle>
              <CardDescription>
                Configure as credenciais fornecidas pelo 99Food no momento da autorização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input id="clientId" value={config.clientId} onChange={e => setConfig(p => ({ ...p, clientId: e.target.value }))} placeholder="ID do cliente 99Food" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input id="clientSecret" type="password" value={config.clientSecret} onChange={e => setConfig(p => ({ ...p, clientSecret: e.target.value }))} placeholder="Chave secreta" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="merchantId">ID da Loja (Merchant ID)</Label>
                  <Input id="merchantId" value={config.merchantId} onChange={e => setConfig(p => ({ ...p, merchantId: e.target.value }))} placeholder="ID fornecido pelo 99Food" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiBaseUrl">API Base URL</Label>
                  <Input id="apiBaseUrl" value={config.apiBaseUrl} onChange={e => setConfig(p => ({ ...p, apiBaseUrl: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="syncProdutos">Sincronizar Produtos</Label>
                  <Switch id="syncProdutos" checked={config.sincronizarProdutos} onCheckedChange={v => setConfig(p => ({ ...p, sincronizarProdutos: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="syncEstoque">Sincronizar Estoque</Label>
                  <Switch id="syncEstoque" checked={config.sincronizarEstoque} onCheckedChange={v => setConfig(p => ({ ...p, sincronizarEstoque: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="syncPrecos">Sincronizar Preços</Label>
                  <Switch id="syncPrecos" checked={config.sincronizarPrecos} onCheckedChange={v => setConfig(p => ({ ...p, sincronizarPrecos: v }))} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoReceber">Receber Pedidos Automaticamente</Label>
                  <Switch id="autoReceber" checked={config.receberPedidosAutomatico} onCheckedChange={v => setConfig(p => ({ ...p, receberPedidosAutomatico: v }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tempoPreparo">Tempo de Preparo Padrão (minutos)</Label>
                <Input id="tempoPreparo" type="number" min={1} max={180} value={config.tempoPreparoPadrao} onChange={e => setConfig(p => ({ ...p, tempoPreparoPadrao: parseInt(e.target.value) || 30 }))} className="w-32" />
              </div>
            </CardContent>
          </Card>

          {/* Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" /> Webhook
              </CardTitle>
              <CardDescription>
                Configure esta URL no painel do 99Food para receber pedidos em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className={`flex-1 p-2 rounded text-sm break-all ${darkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                  {webhookUrl}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyWebhook}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar Configuração
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
          </div>

          {/* Links Rápidos */}
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => router.push('/admin/integracoes/noventa-e-nove/produtos')}>
              <Package className="h-4 w-4 mr-2" /> Produtos
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/integracoes/noventa-e-nove/pedidos')}>
              <ShoppingBag className="h-4 w-4 mr-2" /> Pedidos
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conexão</span>
                  <Badge className={sc.class}>{sc.label}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ativo</span>
                  {config.ativo ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-gray-400" />}
                </div>
                {config.ultimoErro && (
                  <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded text-xs text-red-600 dark:text-red-400">
                    {config.ultimoErro}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Hoje</span>
                  <span className="font-medium">{stats.pedidosHoje} pedidos / {stats.vendasHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Este mês</span>
                  <span className="font-medium">{stats.pedidosMes} pedidos / {stats.vendasMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total recebido</span>
                  <span className="font-medium">{config.totalPedidosRecebidos} pedidos</span>
                </div>
                {config.ultimoPedidoEm && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> Último pedido: {new Date(config.ultimoPedidoEm).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como Funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Solicite as credenciais no portal 99Food Admin</p>
              <p>2. Autorize o aplicativo no 99Food Admin</p>
              <p>3. Configure o Client ID, Secret e Merchant ID acima</p>
              <p>4. Configure a URL de webhook no 99Food Admin</p>
              <p>5. Vincule os códigos dos produtos na página de Produtos</p>
              <p>6. Pedidos chegarão automaticamente via webhook</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NoventaENovePage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Integrações' }, { title: '99Food' }]}>
        <NoventaENoveContent />
      </MainLayout>
    </ProtectedRoute>
  );
}
