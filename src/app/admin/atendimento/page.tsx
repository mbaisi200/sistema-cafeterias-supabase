'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Bot, Plus, Trash2, Loader2, Settings, Clock, User, CheckCheck } from 'lucide-react';

interface Conversa {
  id: string;
  cliente_identificador: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  status: string;
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

  const totalNaoLidas = conversas.filter(c => {
    if (conversaAtiva === c.id) return false;
    return c.ultimo_remetente === 'cliente';
  }).length;

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
                          <div className="flex items-center justify-between">
                            <span className="truncate">{conv.cliente_nome || 'Visitante'}</span>
                            {conv.ultimo_remetente === 'cliente' && conversaAtiva !== conv.id && (
                              <div className="h-2 w-2 rounded-full bg-red-500" />
                            )}
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
                      <CardTitle className="text-sm">
                        {conversas.find(c => c.id === conversaAtiva)?.cliente_nome || 'Visitante'}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">Online</span>
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
