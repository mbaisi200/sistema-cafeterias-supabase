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
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  Settings, 
  Database,
  Clock,
  ArrowLeft,
  Link2,
  Copy,
  Check,
  Package,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { getSupabaseClient } from '@/lib/supabase';
import type { UberEatsIntegrationStatus } from '@/types/uber-eats';

interface UberEatsConfigState {
  id?: string;
  empresaId: string;
  ativo: boolean;
  status: UberEatsIntegrationStatus;
  clientId: string;
  clientSecret: string;
  merchantUuid: string;
  webhookSecret: string;
  sincronizarProdutos: boolean;
  sincronizarEstoque: boolean;
  sincronizarPrecos: boolean;
  receberPedidosAutomatico: boolean;
  tempoPreparoPadrao: number;
  totalPedidosRecebidos: number;
  ultimoPedidoEm?: Date;
  ultimoErro?: string;
}

interface UberEatsStats {
  pedidosHoje: number;
  vendasHoje: number;
  pedidosMes: number;
  vendasMes: number;
}

function UberEatsIntegracaoContent() {
  const router = useRouter();
  const { empresaId, empresaNome } = useAuth();
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [config, setConfig] = useState<UberEatsConfigState>({
    empresaId: '',
    ativo: false,
    status: 'disconnected',
    clientId: '',
    clientSecret: '',
    merchantUuid: '',
    webhookSecret: '',
    sincronizarProdutos: true,
    sincronizarEstoque: true,
    sincronizarPrecos: true,
    receberPedidosAutomatico: true,
    tempoPreparoPadrao: 30,
    totalPedidosRecebidos: 0,
  });

  const [stats, setStats] = useState<UberEatsStats>({
    pedidosHoje: 0,
    vendasHoje: 0,
    pedidosMes: 0,
    vendasMes: 0,
  });

  useEffect(() => {
    if (empresaId) {
      loadConfig();
      loadStats();
    }
  }, [empresaId]);

  const loadConfig = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/uber-eats/config?empresaId=${empresaId}`);
      const json = await res.json();

      if (json.sucesso && json.data) {
        setConfig({
          id: json.data.id,
          empresaId: empresaId,
          ativo: json.data.ativo || false,
          status: json.data.status || 'disconnected',
          clientId: json.data.client_id || '',
          clientSecret: json.data.client_secret || '',
          merchantUuid: json.data.merchant_uuid || '',
          webhookSecret: json.data.webhook_secret || '',
          sincronizarProdutos: json.data.sincronizar_produtos ?? true,
          sincronizarEstoque: json.data.sincronizar_estoque ?? true,
          sincronizarPrecos: json.data.sincronizar_precos ?? true,
          receberPedidosAutomatico: json.data.receber_pedidos_automatico ?? true,
          tempoPreparoPadrao: json.data.tempo_preparo_padrao || 30,
          totalPedidosRecebidos: json.data.total_pedidos_recebidos || 0,
          ultimoPedidoEm: json.data.ultimo_pedido_em ? new Date(json.data.ultimo_pedido_em) : undefined,
          ultimoErro: json.data.ultimo_erro || undefined,
        });
      } else {
        setConfig({
          empresaId: empresaId,
          ativo: false,
          status: 'disconnected',
          clientId: '',
          clientSecret: '',
          merchantUuid: '',
          webhookSecret: '',
          sincronizarProdutos: true,
          sincronizarEstoque: true,
          sincronizarPrecos: true,
          receberPedidosAutomatico: true,
          tempoPreparoPadrao: 30,
          totalPedidosRecebidos: 0,
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
      const supabase = getSupabaseClient();

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: todayVendas } = await supabase
        .from('vendas')
        .select('total')
        .eq('empresa_id', empresaId)
        .eq('canal', 'uber_eats')
        .gte('criado_em', startOfToday.toISOString());

      const pedidosHoje = todayVendas?.length || 0;
      const vendasHoje = todayVendas?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;

      const { data: monthVendas } = await supabase
        .from('vendas')
        .select('total')
        .eq('empresa_id', empresaId)
        .eq('canal', 'uber_eats')
        .gte('criado_em', startOfMonth.toISOString());

      const pedidosMes = monthVendas?.length || 0;
      const vendasMes = monthVendas?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;

      setStats({ pedidosHoje, vendasHoje, pedidosMes, vendasMes });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleSave = async () => {
    if (!empresaId) {
      alert('Empresa não identificada');
      return;
    }

    setSaving(true);
    try {
      const body = {
        empresa_id: empresaId,
        ativo: config.ativo,
        status: config.status,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        merchant_uuid: config.merchantUuid,
        webhook_secret: config.webhookSecret,
        sincronizar_produtos: config.sincronizarProdutos,
        sincronizar_estoque: config.sincronizarEstoque,
        sincronizar_precos: config.sincronizarPrecos,
        receber_pedidos_automatico: config.receberPedidosAutomatico,
        tempo_preparo_padrao: config.tempoPreparoPadrao,
        total_pedidos_recebidos: config.totalPedidosRecebidos,
      };

      const res = await fetch('/api/uber-eats/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.sucesso) throw new Error(json.erro?.mensagem || 'Erro ao salvar');

      if (json.data?.id && !config.id) {
        setConfig(prev => ({ ...prev, id: json.data.id }));
      }

      alert('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.clientId || !config.clientSecret || !config.merchantUuid) {
      alert('Preencha todos os campos de credencial antes de testar');
      return;
    }

    setTesting(true);
    try {
      const res = await fetch('/api/uber-eats/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          merchantUuid: config.merchantUuid,
        }),
      });

      const json = await res.json();

      if (json.sucesso) {
        setConfig(prev => ({ ...prev, status: 'connected' }));
        alert('Conexão realizada com sucesso! O webhook está pronto para receber pedidos.');
      } else {
        throw new Error(json.erro?.mensagem || 'Falha na conexão');
      }
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        status: 'error',
        ultimoErro: 'Falha ao conectar com o Uber Eats'
      }));
      alert('Falha ao conectar. Verifique as credenciais.');
    } finally {
      setTesting(false);
    }
  };

  const handleCopyWebhook = () => {
    const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/uber-eats`;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (config.status) {
      case 'connected':
        return <Badge className="bg-green-500"><Link2 className="h-3 w-3 mr-1" /> Conectado</Badge>;
      case 'disconnected':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" /> Desconectado</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Erro</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/integracoes')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
            <svg viewBox="0 0 48 48" className="h-8 w-8 fill-current text-green-600">
              <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm10 14h-4v-4h4v4zm-6 0h-4v-4h4v4zm-6 0h-4v-4h4v4zm12 6h-4v-4h4v4zm-6 0h-4v-4h4v4zm-6 0h-4v-4h4v4z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Integração Uber Eats</h1>
            <p className="text-muted-foreground">Configure a integração com o Uber Eats para receber pedidos automaticamente</p>
            {empresaNome && (
              <p className="text-sm text-muted-foreground mt-1">
                Empresa: <strong>{empresaNome}</strong>
              </p>
            )}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex gap-3 mb-6">
        <Button
          onClick={() => router.push('/admin/integracoes/uber-eats/produtos')}
          className="bg-green-600 hover:bg-green-700"
        >
          <Package className="h-4 w-4 mr-2" />
          Sincronização de Produtos
        </Button>
        <Button
          onClick={() => router.push('/admin/integracoes/uber-eats/pedidos')}
          variant="outline"
          className={darkMode ? 'border-white/10 text-white hover:bg-white/5' : ''}
        >
          <ShoppingBag className="h-4 w-4 mr-2" />
          Pedidos
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Credenciais de Acesso
              </CardTitle>
              <CardDescription>
                Obtenha suas credenciais no{' '}
                <a
                  href="https://developer.uber.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline inline-flex items-center gap-1"
                >
                  portal de desenvolvedores da Uber
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    value={config.clientId}
                    onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                    placeholder="Seu Client ID"
                    className={darkMode ? 'bg-[#1a1a2e] border-white/10' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={config.clientSecret}
                    onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                    placeholder="Seu Client Secret"
                    className={darkMode ? 'bg-[#1a1a2e] border-white/10' : ''}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="merchantUuid">Merchant UUID (ID do Estabelecimento)</Label>
                <Input
                  id="merchantUuid"
                  value={config.merchantUuid}
                  onChange={(e) => setConfig(prev => ({ ...prev, merchantUuid: e.target.value }))}
                  placeholder="UUID do seu estabelecimento no Uber Eats"
                  className={darkMode ? 'bg-[#1a1a2e] border-white/10' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Encontrado no dashboard do Uber Eats Manager em Configurações &gt; Integrações
                </p>
              </div>

              <Separator className={darkMode ? 'bg-white/10' : ''} />

              <div className="space-y-2">
                <Label htmlFor="webhookSecret">Webhook Secret</Label>
                <Input
                  id="webhookSecret"
                  type="password"
                  value={config.webhookSecret}
                  onChange={(e) => setConfig(prev => ({ ...prev, webhookSecret: e.target.value }))}
                  placeholder="Chave secreta para verificação de webhooks"
                  className={darkMode ? 'bg-[#1a1a2e] border-white/10' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Usada para validar que os webhooks recebidos são realmente do Uber Eats
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Configuração'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className={darkMode ? 'border-white/10 text-white hover:bg-white/5' : ''}
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Testar Conexão
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configurações de Sincronização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sincronizar Produtos</p>
                  <p className="text-sm text-muted-foreground">Enviar produtos automaticamente para o Uber Eats</p>
                </div>
                <Switch
                  checked={config.sincronizarProdutos}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, sincronizarProdutos: checked }))}
                />
              </div>

              <Separator className={darkMode ? 'bg-white/10' : ''} />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sincronizar Estoque</p>
                  <p className="text-sm text-muted-foreground">Atualizar disponibilidade quando o estoque acabar</p>
                </div>
                <Switch
                  checked={config.sincronizarEstoque}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, sincronizarEstoque: checked }))}
                />
              </div>

              <Separator className={darkMode ? 'bg-white/10' : ''} />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sincronizar Preços</p>
                  <p className="text-sm text-muted-foreground">Manter preços atualizados no Uber Eats</p>
                </div>
                <Switch
                  checked={config.sincronizarPrecos}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, sincronizarPrecos: checked }))}
                />
              </div>

              <Separator className={darkMode ? 'bg-white/10' : ''} />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Receber Pedidos Automaticamente</p>
                  <p className="text-sm text-muted-foreground">Confirmar pedidos automaticamente ao receber</p>
                </div>
                <Switch
                  checked={config.receberPedidosAutomatico}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, receberPedidosAutomatico: checked }))}
                />
              </div>

              <Separator className={darkMode ? 'bg-white/10' : ''} />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Tempo de Preparo Padrão</p>
                  <p className="text-sm text-muted-foreground">Tempo estimado para preparo dos pedidos</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={config.tempoPreparoPadrao}
                    onChange={(e) => setConfig(prev => ({ ...prev, tempoPreparoPadrao: parseInt(e.target.value) || 30 }))}
                    className={`w-20 text-center ${darkMode ? 'bg-[#1a1a2e] border-white/10' : ''}`}
                    min={5}
                    max={120}
                  />
                  <span className="text-sm text-muted-foreground">minutos</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Webhook
              </CardTitle>
              <CardDescription>
                Configure esta URL no portal da Uber Eats para receber pedidos automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`flex-1 p-3 rounded-lg font-mono text-sm break-all ${darkMode ? 'bg-[#1a1a2e] border border-white/10' : 'bg-gray-100'}`}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/uber-eats
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyWebhook}
                  className={darkMode ? 'border-white/10 text-white hover:bg-white/5' : ''}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Copie esta URL e configure no portal de desenvolvedores da Uber Eats na seção de webhooks.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
            <CardHeader>
              <CardTitle className="text-lg">Status da Integração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm">Integração ativa</span>
                <Switch
                  checked={config.ativo}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, ativo: checked }))}
                />
              </div>

              {config.ativo && config.status === 'connected' && (
                <div className={`p-3 rounded-lg border ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                  <div className={`flex items-center gap-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Sistema pronto para receber pedidos</span>
                  </div>
                </div>
              )}

              {config.ultimoErro && (
                <div className={`p-3 rounded-lg border mt-3 ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                  <div className={`flex items-center gap-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{config.ultimoErro}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
            <CardHeader>
              <CardTitle className="text-lg">Estatísticas Uber Eats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{stats.pedidosHoje}</p>
                  <p className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Pedidos Hoje</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    R$ {stats.vendasHoje.toFixed(0)}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-green-300' : 'text-green-700'}`}>Vendas Hoje</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{stats.pedidosMes}</p>
                  <p className={`text-xs ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>Pedidos no Mês</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                    R$ {stats.vendasMes.toFixed(0)}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>Vendas no Mês</p>
                </div>
              </div>

              <Separator className={darkMode ? 'bg-white/10' : ''} />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de pedidos recebidos</span>
                  <span className="font-medium">{config.totalPedidosRecebidos || 0}</span>
                </div>
                {config.ultimoPedidoEm && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Último pedido</span>
                    <span className="font-medium">
                      {config.ultimoPedidoEm.toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-[#1e1e32] border-white/10' : ''}>
            <CardHeader>
              <CardTitle className="text-lg">Como Funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-medium ${darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600'}`}>1</span>
                  <span>Cadastre-se no portal de desenvolvedores da Uber</span>
                </li>
                <li className="flex gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-medium ${darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600'}`}>2</span>
                  <span>Obtenha suas credenciais de API</span>
                </li>
                <li className="flex gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-medium ${darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600'}`}>3</span>
                  <span>Preencha os campos acima com suas credenciais</span>
                </li>
                <li className="flex gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-medium ${darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600'}`}>4</span>
                  <span>Configure o webhook no portal da Uber Eats</span>
                </li>
                <li className="flex gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-medium ${darkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600'}`}>5</span>
                  <span>Ative a integração e comece a receber pedidos!</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function UberEatsIntegracaoPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[
        { title: 'Integrações', href: '/admin/integracoes' },
        { title: 'Uber Eats' },
      ]}>
        <UberEatsIntegracaoContent />
      </MainLayout>
    </ProtectedRoute>
  );
}
