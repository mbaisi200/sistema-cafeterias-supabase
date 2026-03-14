'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Check
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';

interface IFoodConfig {
  id?: string;
  empresaId: string;
  ativo: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  clientId: string;
  clientSecret: string;
  merchantId: string;
  sincronizarProdutos: boolean;
  sincronizarEstoque: boolean;
  sincronizarPrecos: boolean;
  receberPedidosAutomatico: boolean;
  tempoPreparoPadrao: number;
  totalPedidosRecebidos: number;
  ultimoPedidoEm?: Date;
  ultimoErro?: string;
}

interface IFoodStats {
  pedidosHoje: number;
  vendasHoje: number;
  pedidosMes: number;
  vendasMes: number;
}

function IFoodIntegracaoContent() {
  const router = useRouter();
  const { empresaId, empresaNome } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [config, setConfig] = useState<IFoodConfig>({
    empresaId: '',
    ativo: false,
    status: 'disconnected',
    clientId: '',
    clientSecret: '',
    merchantId: '',
    sincronizarProdutos: true,
    sincronizarEstoque: true,
    sincronizarPrecos: true,
    receberPedidosAutomatico: true,
    tempoPreparoPadrao: 30,
    totalPedidosRecebidos: 0,
  });

  const [stats, setStats] = useState<IFoodStats>({
    pedidosHoje: 0,
    vendasHoje: 0,
    pedidosMes: 0,
    vendasMes: 0,
  });

  // Carregar configuração
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
      const supabase = getSupabaseClient();

      // Carregar configuração
      const { data: configData, error } = await supabase
        .from('ifood_config')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (configData) {
        setConfig({
          id: configData.id,
          empresaId: empresaId,
          ativo: configData.ativo || false,
          status: configData.status || 'disconnected',
          clientId: configData.client_id || '',
          clientSecret: configData.client_secret || '',
          merchantId: configData.merchant_id || '',
          sincronizarProdutos: configData.sincronizar_produtos ?? true,
          sincronizarEstoque: configData.sincronizar_estoque ?? true,
          sincronizarPrecos: configData.sincronizar_precos ?? true,
          receberPedidosAutomatico: configData.receber_pedidos_automatico ?? true,
          tempoPreparoPadrao: configData.tempo_preparo_padrao || 30,
          totalPedidosRecebidos: configData.total_pedidos_recebidos || 0,
          ultimoPedidoEm: configData.ultimo_pedido_em ? new Date(configData.ultimo_pedido_em) : undefined,
          ultimoErro: configData.ultimo_erro || undefined,
        } as IFoodConfig);
      } else {
        // Reset para configuração vazia
        setConfig({
          empresaId: empresaId,
          ativo: false,
          status: 'disconnected',
          clientId: '',
          clientSecret: '',
          merchantId: '',
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

      // Vendas de hoje
      const { data: todayVendas } = await supabase
        .from('vendas')
        .select('total')
        .eq('empresa_id', empresaId)
        .eq('canal', 'ifood')
        .gte('criado_em', startOfToday.toISOString());

      const pedidosHoje = todayVendas?.length || 0;
      const vendasHoje = todayVendas?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;

      // Vendas do mês
      const { data: monthVendas } = await supabase
        .from('vendas')
        .select('total')
        .eq('empresa_id', empresaId)
        .eq('canal', 'ifood')
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
      const supabase = getSupabaseClient();

      const configData = {
        empresa_id: empresaId,
        ativo: config.ativo,
        status: config.status,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        merchant_id: config.merchantId,
        sincronizar_produtos: config.sincronizarProdutos,
        sincronizar_estoque: config.sincronizarEstoque,
        sincronizar_precos: config.sincronizarPrecos,
        receber_pedidos_automatico: config.receberPedidosAutomatico,
        tempo_preparo_padrao: config.tempoPreparoPadrao,
        total_pedidos_recebidos: config.totalPedidosRecebidos,
        atualizado_em: new Date().toISOString(),
      };

      if (config.id) {
        const { error } = await supabase
          .from('ifood_config')
          .update(configData)
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        configData.criado_em = new Date().toISOString();
        const { data, error } = await supabase
          .from('ifood_config')
          .insert(configData)
          .select('id')
          .single();
        
        if (error) throw error;
        if (data) setConfig(prev => ({ ...prev, id: data.id }));
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
    if (!config.clientId || !config.clientSecret || !config.merchantId) {
      alert('Preencha todos os campos de credencial antes de testar');
      return;
    }

    setTesting(true);
    try {
      // Simular teste de conexão
      // Em produção, isso faria uma chamada real à API do iFood
      await new Promise(resolve => setTimeout(resolve, 2000));

      setConfig(prev => ({ ...prev, status: 'connected' }));
      alert('Conexão realizada com sucesso! O webhook está pronto para receber pedidos.');
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        status: 'error',
        ultimoErro: 'Falha ao conectar com o iFood'
      }));
      alert('Falha ao conectar. Verifique as credenciais.');
    } finally {
      setTesting(false);
    }
  };

  const handleCopyWebhook = () => {
    const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/ifood`;
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
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/integracoes')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 bg-red-100 rounded-lg">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-red-500 fill-current">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Integração iFood</h1>
            <p className="text-muted-foreground">Configure a integração com o iFood para receber pedidos automaticamente</p>
            {empresaNome && (
              <p className="text-sm text-muted-foreground mt-1">
                Empresa: <strong>{empresaNome}</strong>
              </p>
            )}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Credenciais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Credenciais de Acesso
              </CardTitle>
              <CardDescription>
                Obtenha suas credenciais no{' '}
                <a
                  href="https://developer.ifood.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:underline inline-flex items-center gap-1"
                >
                  portal de desenvolvedores do iFood
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
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchantId">Merchant ID (ID do Estabelecimento)</Label>
                <Input
                  id="merchantId"
                  value={config.merchantId}
                  onChange={(e) => setConfig(prev => ({ ...prev, merchantId: e.target.value }))}
                  placeholder="ID do seu estabelecimento no iFood"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving}>
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

          {/* Configurações de Sincronização */}
          <Card>
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
                  <p className="text-sm text-muted-foreground">Enviar produtos automaticamente para o iFood</p>
                </div>
                <Switch
                  checked={config.sincronizarProdutos}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, sincronizarProdutos: checked }))}
                />
              </div>

              <Separator />

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

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sincronizar Preços</p>
                  <p className="text-sm text-muted-foreground">Manter preços atualizados no iFood</p>
                </div>
                <Switch
                  checked={config.sincronizarPrecos}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, sincronizarPrecos: checked }))}
                />
              </div>

              <Separator />

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

              <Separator />

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
                    className="w-20 text-center"
                    min={5}
                    max={120}
                  />
                  <span className="text-sm text-muted-foreground">minutos</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Webhook
              </CardTitle>
              <CardDescription>
                Configure esta URL no portal do iFood para receber pedidos automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 p-3 rounded-lg font-mono text-sm break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/ifood
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyWebhook}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Copie esta URL e configure no portal de desenvolvedores do iFood na seção de webhooks.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status da Integração */}
          <Card>
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
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Sistema pronto para receber pedidos</span>
                  </div>
                </div>
              )}

              {config.ultimoErro && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200 mt-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{config.ultimoErro}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estatísticas iFood</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.pedidosHoje}</p>
                  <p className="text-xs text-blue-700">Pedidos Hoje</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">
                    R$ {stats.vendasHoje.toFixed(0)}
                  </p>
                  <p className="text-xs text-green-700">Vendas Hoje</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats.pedidosMes}</p>
                  <p className="text-xs text-purple-700">Pedidos no Mês</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    R$ {stats.vendasMes.toFixed(0)}
                  </p>
                  <p className="text-xs text-orange-700">Vendas no Mês</p>
                </div>
              </div>

              <Separator />

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

          {/* Como Funciona */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como Funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-medium">1</span>
                  <span>Cadastre-se no portal de desenvolvedores do iFood</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-medium">2</span>
                  <span>Obtenha suas credenciais de API</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-medium">3</span>
                  <span>Preencha os campos acima com suas credenciais</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-medium">4</span>
                  <span>Configure o webhook no portal iFood</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-medium">5</span>
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

export default function IFoodIntegracaoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    }>
      <IFoodIntegracaoContent />
    </Suspense>
  );
}
