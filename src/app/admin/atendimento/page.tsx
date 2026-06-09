'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Bot, Plus, Trash2, Loader2, Settings, Clock, Smartphone, Copy, CheckCheck, Globe, UtensilsCrossed, List, Store } from 'lucide-react';

interface Conversa {
  id: string;
  cliente_identificador: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  status: string;
  canal: string;
  wa_phone: string | null;
  ultima_mensagem: string | null;
  ultimo_remetente: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface Mensagem {
  id: string;
  conversa_id: string;
  tipo: 'cliente' | 'admin' | 'sistema';
  conteudo: string;
  lida: boolean;
  criado_em: string;
}

interface AutoResposta {
  id: string;
  palavra_chave: string;
  resposta: string;
  ativo: boolean;
  ordem: number;
}

interface WhatsAppConfig {
  ativo: boolean;
  status: string;
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  webhook_verify_token: string;
  whatsapp_business_phone: string;
  mensagem_saudacao: string;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hoje = new Date();
  const mesmaData = d.toDateString() === hoje.toDateString();
  if (mesmaData) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function AtendimentoPage() {
  const { empresaId } = useAuth();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [textoResposta, setTextoResposta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [chatAtivo, setChatAtivo] = useState(false);
  const [tempoResposta, setTempoResposta] = useState(5);
  const [autoRespostas, setAutoRespostas] = useState<AutoResposta[]>([]);
  const [novaChave, setNovaChave] = useState('');
  const [novaResposta, setNovaResposta] = useState('');
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>({
    ativo: false,
    status: 'disconnected',
    phone_number_id: '',
    business_account_id: '',
    access_token: '',
    webhook_verify_token: '',
    whatsapp_business_phone: '',
    mensagem_saudacao: 'Olá! Como podemos ajudar?',
  });
  const [salvandoWA, setSalvandoWA] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [menuAtivo, setMenuAtivo] = useState(false);
  const [mensagemBoasVindas, setMensagemBoasVindas] = useState('');
  const [mensagemCategorias, setMensagemCategorias] = useState('');
  const [categorias, setCategorias] = useState<Array<{ id: string; nome: string }>>([]);
  const [categoriasAtivas, setCategoriasAtivas] = useState<string[]>([]);
  const [criarPedidoAuto, setCriarPedidoAuto] = useState(true);
  const [salvandoCardapio, setSalvandoCardapio] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const carregarConversas = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('atendimento_conversas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('atualizado_em', { ascending: false })
      .limit(50);
    if (data) setConversas(data as Conversa[]);
  };

  const carregarConfig = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('empresa_delivery_config')
      .select('chat_ativo, chat_tempo_resposta_min')
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (data) {
      setChatAtivo(data.chat_ativo ?? false);
      setTempoResposta(data.chat_tempo_resposta_min ?? 5);
    }
  };

  const carregarWAConfig = async () => {
    if (!empresaId) return;
    try {
      const res = await fetch('/api/atendimento/whatsapp-config');
      const json = await res.json();
      if (json.sucesso && json.data) {
        setWaConfig(prev => ({ ...prev, ...json.data }));
        setMenuAtivo(json.data.menu_ativo ?? false);
        setMensagemBoasVindas(json.data.mensagem_boas_vindas || '');
        setMensagemCategorias(json.data.mensagem_categorias || '');
        setCategoriasAtivas(json.data.categorias_ativas || []);
        setCriarPedidoAuto(json.data.criar_pedido_auto ?? true);
      }
    } catch {}
  };

  const carregarCategorias = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('categorias')
      .select('id, nome')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome');
    if (data) setCategorias(data);
  };

  const carregarAutoRespostas = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('atendimento_auto_respostas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('ordem');
    if (data) setAutoRespostas(data as AutoResposta[]);
  };

  useEffect(() => {
    if (!empresaId) return;
    carregarConversas();
    carregarConfig();
    carregarWAConfig();
    carregarCategorias();
    carregarAutoRespostas();
  }, [empresaId]);

  useEffect(() => {
    if (!conversaAtiva) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('atendimento_mensagens')
        .select('*')
        .eq('conversa_id', conversaAtiva)
        .order('criado_em', { ascending: true });
      if (data) setMensagens(data as Mensagem[]);
    }, 3000);
    return () => clearInterval(interval);
  }, [conversaAtiva]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const selecionarConversa = async (id: string) => {
    setConversaAtiva(id);
    const { data } = await supabase
      .from('atendimento_mensagens')
      .select('*')
      .eq('conversa_id', id)
      .order('criado_em', { ascending: true });
    if (data) setMensagens(data as Mensagem[]);

    await supabase
      .from('atendimento_mensagens')
      .update({ lida: true })
      .eq('conversa_id', id)
      .eq('lida', false);
    carregarConversas();
  };

  const enviarResposta = async () => {
    if (!textoResposta.trim() || !conversaAtiva || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/atendimento/mensagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaId,
          conversa_id: conversaAtiva,
          tipo: 'admin',
          conteudo: textoResposta.trim(),
        }),
      });
      const json = await res.json();
      if (json.sucesso) {
        setMensagens(prev => [...prev, json.data]);
        setTextoResposta('');
        carregarConversas();
      }
    } catch {} finally {
      setEnviando(false);
    }
  };

  const salvarConfig = async () => {
    try {
      const res = await fetch('/api/atendimento/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: empresaId, chat_ativo: chatAtivo, chat_tempo_resposta_min: tempoResposta }),
      });
      const json = await res.json();
      if (json.sucesso) toast({ title: 'Configuração salva!' });
      else throw new Error(json.erro?.mensagem);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    }
  };

  const salvarWAConfig = async () => {
    setSalvandoWA(true);
    try {
      const res = await fetch('/api/atendimento/whatsapp-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waConfig),
      });
      const json = await res.json();
      if (json.sucesso) toast({ title: 'Configuração WhatsApp salva!' });
      else throw new Error(json.erro?.mensagem);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setSalvandoWA(false);
    }
  };

  const salvarCardapioConfig = async () => {
    setSalvandoCardapio(true);
    try {
      const res = await fetch('/api/atendimento/whatsapp-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...waConfig,
          menu_ativo: menuAtivo,
          mensagem_boas_vindas: mensagemBoasVindas,
          mensagem_categorias: mensagemCategorias,
          categorias_ativas: categoriasAtivas,
          criar_pedido_auto: criarPedidoAuto,
        }),
      });
      const json = await res.json();
      if (json.sucesso) toast({ title: 'Configuração do cardápio salva!' });
      else throw new Error(json.erro?.mensagem);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setSalvandoCardapio(false);
    }
  };

  const toggleCategoria = (id: string) => {
    setCategoriasAtivas(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
  };

  const adicionarAutoResposta = async () => {
    if (!novaChave.trim() || !novaResposta.trim()) return;
    try {
      const res = await fetch('/api/atendimento/auto-respostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ palavra_chave: novaChave, resposta: novaResposta }),
      });
      const json = await res.json();
      if (json.sucesso) {
        setAutoRespostas(prev => [...prev, json.data]);
        setNovaChave('');
        setNovaResposta('');
        toast({ title: 'Auto-resposta adicionada!' });
      }
    } catch {}
  };

  const excluirAutoResposta = async (id: string) => {
    try {
      await fetch(`/api/atendimento/auto-respostas/${id}`, { method: 'DELETE' });
      setAutoRespostas(prev => prev.filter(a => a.id !== id));
    } catch {}
  };

  const copiarWebhook = () => {
    const url = `${window.location.origin}/api/webhooks/whatsapp`;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
    toast({ title: 'URL do webhook copiada!' });
  };

  const totalNaoLidas = conversas.filter(c => {
    if (conversaAtiva === c.id) return false;
    return c.ultimo_remetente === 'cliente';
  }).length;

  const canalIcon = (canal: string) => {
    if (canal === 'whatsapp') return <Smartphone className="h-3 w-3" />;
    return <Globe className="h-3 w-3" />;
  };

  const canalLabel = (canal: string) => {
    if (canal === 'whatsapp') return 'WhatsApp';
    return 'Web';
  };

  const canalColor = (canal: string) => {
    if (canal === 'whatsapp') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Atendimento' }]}>
        <Tabs defaultValue="conversas" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <MessageCircle className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Atendimento</h1>
                <p className="text-sm text-muted-foreground">Converse com seus clientes em tempo real</p>
              </div>
            </div>
          </div>

          <TabsList>
            <TabsTrigger value="conversas" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Conversas
              {totalNaoLidas > 0 && (
                <Badge className="bg-red-500 text-white text-[10px] h-5 px-1.5">{totalNaoLidas}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" /> Configuração
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <Smartphone className="h-4 w-4" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="cardapio-whatsapp" className="gap-2">
              <MessageCircle className="h-4 w-4" /> Cardápio WhatsApp
            </TabsTrigger>
            <TabsTrigger value="auto-respostas" className="gap-2">
              <Bot className="h-4 w-4" /> Auto-Respostas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversas">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-1">
                <CardHeader><CardTitle className="text-sm">Conversas</CardTitle></CardHeader>
                <CardContent className="p-2">
                  {conversas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Nenhuma conversa ainda
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversas.map(conv => (
                        <button
                          key={conv.id}
                          className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                            conversaAtiva === conv.id
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-accent'
                          } ${conv.ultimo_remetente === 'cliente' && conversaAtiva !== conv.id ? 'font-semibold' : ''}`}
                          onClick={() => selecionarConversa(conv.id)}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{conv.cliente_nome || 'Visitante'}</span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${canalColor(conv.canal || 'web')}`}>
                              {canalIcon(conv.canal || 'web')}
                              {canalLabel(conv.canal || 'web')}
                            </span>
                          </div>
                          {conv.ultima_mensagem && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.ultima_mensagem}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(conv.atualizado_em)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2 flex flex-col">
                <CardHeader className="pb-2">
                  {conversaAtiva ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">
                          {conversas.find(c => c.id === conversaAtiva)?.cliente_nome || 'Visitante'}
                        </CardTitle>
                        {(() => {
                          const c = conversas.find(c => c.id === conversaAtiva);
                          return c?.canal === 'whatsapp' ? (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${canalColor('whatsapp')}`}>
                              <Smartphone className="h-3 w-3" /> WhatsApp
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${canalColor('web')}`}>
                              <Globe className="h-3 w-3" /> Web
                            </span>
                          );
                        })()}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {conversas.find(c => c.id === conversaAtiva)?.wa_phone
                          ? `+${conversas.find(c => c.id === conversaAtiva)!.wa_phone}`
                          : 'Online'}
                      </span>
                    </div>
                  ) : (
                    <CardTitle className="text-sm">Selecione uma conversa</CardTitle>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  {conversaAtiva ? (
                    <>
                      <ScrollArea className="flex-1 h-[400px] p-3" ref={scrollRef}>
                        <div className="space-y-2">
                          {mensagens.map(msg => (
                            <div key={msg.id} className={`flex ${msg.tipo === 'admin' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                                msg.tipo === 'admin'
                                  ? 'bg-purple-600 text-white rounded-br-sm'
                                  : msg.tipo === 'sistema'
                                  ? 'bg-cyan-100 dark:bg-cyan-900/30 rounded-bl-sm'
                                  : 'bg-gray-100 dark:bg-gray-800 rounded-bl-sm'
                              }`}>
                                {msg.tipo !== 'admin' && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60 block mb-0.5">
                                    {msg.tipo === 'sistema' ? '🤖 Auto' : '👤 Cliente'}
                                  </span>
                                )}
                                <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                                <p className={`text-[10px] mt-1 ${msg.tipo === 'admin' ? 'text-white/60' : 'text-muted-foreground'}`}>
                                  {formatTime(msg.criado_em)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="p-3 border-t dark:border-white/10 flex gap-2">
                        <Input
                          value={textoResposta}
                          onChange={(e) => setTextoResposta(e.target.value)}
                          placeholder="Digite sua resposta..."
                          className="h-9 text-sm"
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarResposta(); } }}
                        />
                        <Button size="icon" className="h-9 w-9 shrink-0 bg-purple-600 hover:bg-purple-700" onClick={enviarResposta} disabled={enviando || !textoResposta.trim()}>
                          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
                      Selecione uma conversa no painel ao lado
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="config">
            <Card>
              <CardHeader><CardTitle className="text-lg">Configuração do Chat</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Chat ativo no cardápio</Label>
                    <p className="text-sm text-muted-foreground">Exibe o botão de chat no cardápio online</p>
                  </div>
                  <Switch checked={chatAtivo} onCheckedChange={setChatAtivo} />
                </div>
                <div className="space-y-2">
                  <Label>Tempo médio de resposta (minutos)</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input type="number" min={1} max={60} value={tempoResposta} onChange={(e) => setTempoResposta(Number(e.target.value))} className="w-24" />
                  </div>
                </div>
                <Button onClick={salvarConfig}>Salvar Configuração</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">WhatsApp Business</CardTitle>
                      <p className="text-sm text-muted-foreground">Integração com WhatsApp Cloud API</p>
                    </div>
                    <Badge variant={waConfig.ativo && waConfig.status === 'connected' ? 'default' : 'outline'}>
                      {waConfig.ativo && waConfig.status === 'connected' ? 'Conectado' : 'Desconectado'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Ativar WhatsApp</Label>
                      <p className="text-sm text-muted-foreground">Receba e responda mensagens do WhatsApp no painel</p>
                    </div>
                    <Switch
                      checked={waConfig.ativo}
                      onCheckedChange={(v) => setWaConfig(prev => ({ ...prev, ativo: v }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Número de telefone do WhatsApp Business</Label>
                    <Input
                      value={waConfig.whatsapp_business_phone}
                      onChange={(e) => setWaConfig(prev => ({ ...prev, whatsapp_business_phone: e.target.value }))}
                      placeholder="5511999999999"
                    />
                    <p className="text-xs text-muted-foreground">Número registrado no WhatsApp Business API (com código do país, sem +)</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <Input
                      value={waConfig.phone_number_id}
                      onChange={(e) => setWaConfig(prev => ({ ...prev, phone_number_id: e.target.value }))}
                      placeholder="123456789012345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Business Account ID</Label>
                    <Input
                      value={waConfig.business_account_id}
                      onChange={(e) => setWaConfig(prev => ({ ...prev, business_account_id: e.target.value }))}
                      placeholder="123456789012345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Access Token (Permanent)</Label>
                    <Input
                      type="password"
                      value={waConfig.access_token}
                      onChange={(e) => setWaConfig(prev => ({ ...prev, access_token: e.target.value }))}
                      placeholder="EAATodo..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Verify Token</Label>
                    <div className="flex gap-2">
                      <Input
                        value={waConfig.webhook_verify_token}
                        onChange={(e) => setWaConfig(prev => ({ ...prev, webhook_verify_token: e.target.value }))}
                        placeholder="my_custom_verify_token"
                        className="font-mono text-xs"
                      />
                      <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => setWaConfig(prev => ({ ...prev, webhook_verify_token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) }))}>
                        <Loader2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>URL do Webhook (adicione no Meta Developers)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : ''}
                        readOnly
                        className="font-mono text-xs bg-muted"
                      />
                      <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={copiarWebhook}>
                        {copiado ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adicione esta URL no campo "Callback URL" do seu aplicativo no Meta for Developers. Use o Webhook Verify Token acima.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem de saudação automática</Label>
                    <Input
                      value={waConfig.mensagem_saudacao}
                      onChange={(e) => setWaConfig(prev => ({ ...prev, mensagem_saudacao: e.target.value }))}
                      placeholder="Olá! Como podemos ajudar?"
                    />
                    <p className="text-xs text-muted-foreground">Mensagem enviada automaticamente quando uma nova conversa é iniciada pelo WhatsApp</p>
                  </div>

                  <Button onClick={salvarWAConfig} disabled={salvandoWA}>
                    {salvandoWA && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Salvar Configuração WhatsApp
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cardapio-whatsapp">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Cardápio no WhatsApp</CardTitle>
                      <p className="text-sm text-muted-foreground">Permite que clientes façam pedidos diretamente pelo WhatsApp</p>
                    </div>
                    <Switch checked={menuAtivo} onCheckedChange={setMenuAtivo} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Mensagem de boas-vindas</Label>
                    <Input
                      value={mensagemBoasVindas}
                      onChange={(e) => setMensagemBoasVindas(e.target.value)}
                      placeholder="Olá! Bem-vindo ao {empresa}. Envie 'cardápio' para ver nossas opções."
                    />
                    <p className="text-xs text-muted-foreground">Use {'{empresa}'} para o nome da empresa. Enviada quando o cliente inicia a conversa.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem das categorias</Label>
                    <Input
                      value={mensagemCategorias}
                      onChange={(e) => setMensagemCategorias(e.target.value)}
                      placeholder="Escolha uma categoria abaixo:"
                    />
                    <p className="text-xs text-muted-foreground">Texto exibido antes da lista de categorias. Use {'{empresa}'} para o nome.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Ativar criação automática de pedidos</Label>
                    <div className="flex items-center gap-2">
                      <Switch checked={criarPedidoAuto} onCheckedChange={setCriarPedidoAuto} />
                      <span className="text-sm text-muted-foreground">
                        {criarPedidoAuto ? 'Pedidos serão criados automaticamente no sistema' : 'Apenas registra no chat, sem criar pedido'}
                      </span>
                    </div>
                  </div>

                  {categorias.length > 0 && (
                    <div className="space-y-2">
                      <Label>Categorias disponíveis no cardápio</Label>
                      <p className="text-sm text-muted-foreground">Selecione quais categorias aparecem no cardápio do WhatsApp. Se nenhuma for selecionada, todas aparecem.</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {categorias.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => toggleCategoria(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                              categoriasAtivas.includes(cat.id)
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'border-gray-300 dark:border-white/20 hover:bg-accent'
                            }`}
                          >
                            {cat.nome}
                          </button>
                        ))}
                      </div>
                      {categoriasAtivas.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Nenhuma selecionada = todas as categorias ativas aparecerão</p>
                      )}
                    </div>
                  )}

                  <Button onClick={salvarCardapioConfig} disabled={salvandoCardapio}>
                    {salvandoCardapio && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Salvar Configuração do Cardápio
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="auto-respostas">
            <Card>
              <CardHeader><CardTitle className="text-lg">Auto-Respostas (FAQ)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="Palavra-chave (ex: horário)"
                    value={novaChave}
                    onChange={(e) => setNovaChave(e.target.value)}
                  />
                  <Input
                    placeholder="Resposta automática"
                    value={novaResposta}
                    onChange={(e) => setNovaResposta(e.target.value)}
                  />
                  <Button onClick={adicionarAutoResposta} disabled={!novaChave.trim() || !novaResposta.trim()}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {autoRespostas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma auto-resposta configurada. Adicione palavras-chave como "horário", "entrega", "pagamento"...
                    </p>
                  ) : (
                    autoRespostas.map(ar => (
                      <div key={ar.id} className="flex items-center justify-between p-3 rounded-lg border dark:border-white/10">
                        <div className="min-w-0 flex-1">
                          <Badge variant="outline" className="mb-1">{ar.palavra_chave}</Badge>
                          <p className="text-sm truncate">{ar.resposta}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0 ml-2" onClick={() => excluirAutoResposta(ar.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </MainLayout>
    </ProtectedRoute>
  );
}
