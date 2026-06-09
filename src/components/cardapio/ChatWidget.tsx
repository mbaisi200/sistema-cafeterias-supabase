'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageCircle, X, Send, Bot } from 'lucide-react';

interface Mensagem {
  id?: string;
  tipo: 'cliente' | 'admin' | 'sistema';
  conteudo: string;
  criado_em?: string;
}

interface AutoResposta {
  palavra_chave: string;
  resposta: string;
}

interface ChatWidgetProps {
  empresaId: string;
  chatAtivo: boolean;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatWidget({ empresaId, chatAtivo }: ChatWidgetProps) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [autoRespostas, setAutoRespostas] = useState<AutoResposta[]>([]);
  const sessaoIdRef = useRef('');
  const conversaIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let sid = localStorage.getItem('chat_sessao');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('chat_sessao', sid);
    }
    sessaoIdRef.current = sid;
  }, []);

  useEffect(() => {
    if (!chatAtivo || !aberto || !empresaId || !sessaoIdRef.current) return;

    const init = async () => {
      setCarregando(true);
      try {
        const res = await fetch(`/api/atendimento/auto-respostas?empresa_id=${empresaId}`);
        const json = await res.json();
        if (json.sucesso) {
          setAutoRespostas(json.data || []);
        }
      } catch {}
      setCarregando(false);
    };
    init();
  }, [chatAtivo, aberto, empresaId]);

  const buscarMensagens = async (conversaId: string) => {
    try {
      const res = await fetch(`/api/atendimento/mensagens?conversa_id=${conversaId}`);
      const json = await res.json();
      if (json.sucesso) {
        setMensagens(json.data || []);
      }
    } catch {}
  };

  const buscarOuCriarConversa = async () => {
    try {
      const res = await fetch('/api/atendimento/conversas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaId,
          cliente_identificador: sessaoIdRef.current,
        }),
      });
      const json = await res.json();
      if (json.sucesso && json.data?.id) {
        conversaIdRef.current = json.data.id;
        buscarMensagens(json.data.id);
      }
    } catch {}
  };

  useEffect(() => {
    if (!chatAtivo || !aberto || !empresaId) return;
    buscarOuCriarConversa();
  }, [chatAtivo, aberto, empresaId]);

  useEffect(() => {
    if (!conversaIdRef.current) return;
    const interval = setInterval(() => {
      if (conversaIdRef.current) buscarMensagens(conversaIdRef.current);
    }, 5000);
    return () => clearInterval(interval);
  }, [conversaIdRef.current]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const encontrarAutoResposta = (msg: string): string | null => {
    const lower = msg.toLowerCase();
    for (const ar of autoRespostas) {
      if (lower.includes(ar.palavra_chave.toLowerCase())) {
        return ar.resposta;
      }
    }
    return null;
  };

  const enviarMensagem = async () => {
    if (!texto.trim() || enviando) return;
    const msgTexto = texto.trim();
    setTexto('');
    setEnviando(true);

    const msgTemp: Mensagem = { tipo: 'cliente', conteudo: msgTexto };
    setMensagens(prev => [...prev, msgTemp]);

    try {
      const res = await fetch('/api/atendimento/mensagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaId,
          conversa_id: conversaIdRef.current,
          tipo: 'cliente',
          conteudo: msgTexto,
          cliente_identificador: sessaoIdRef.current,
        }),
      });
      const json = await res.json();
      if (json.sucesso && json.data?.id) {
        if (!conversaIdRef.current) conversaIdRef.current = json.data.conversa_id;
        setMensagens(prev => prev.map(m =>
          m.conteudo === msgTexto && !m.id ? { ...m, id: json.data.id, criado_em: json.data.criado_em } : m
        ));
      }

      const resposta = encontrarAutoResposta(msgTexto);
      if (resposta) {
        setTimeout(async () => {
          const sysMsg: Mensagem = { tipo: 'sistema', conteudo: resposta };
          setMensagens(prev => [...prev, sysMsg]);
          await fetch('/api/atendimento/mensagens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empresa_id: empresaId,
              conversa_id: conversaIdRef.current,
              tipo: 'sistema',
              conteudo: resposta,
            }),
          }).catch(() => {});
        }, 500);
      }
    } catch {} finally {
      setEnviando(false);
    }
  };

  if (!chatAtivo) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {aberto ? (
        <div className="w-[340px] sm:w-[380px] rounded-2xl shadow-2xl border overflow-hidden bg-white dark:bg-[#1e1e32] dark:border-white/10">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">Atendimento</span>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-7 w-7" onClick={() => setAberto(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-[320px] p-3" ref={scrollRef}>
            {carregando ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : mensagens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm text-center px-4">
                <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                <p>Olá! 👋 Como podemos ajudar?</p>
                <p className="text-xs mt-1">Pergunte sobre horários, delivery, cardápio...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mensagens.map((msg, idx) => (
                  <div key={msg.id || idx} className={`flex ${msg.tipo === 'cliente' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      msg.tipo === 'cliente'
                        ? 'bg-purple-600 text-white rounded-br-sm'
                        : msg.tipo === 'sistema'
                        ? 'bg-cyan-100 dark:bg-cyan-900/30 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                    }`}>
                      {msg.tipo !== 'cliente' && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60 block mb-0.5">
                          {msg.tipo === 'sistema' ? '🤖 Auto' : '👤 Atendente'}
                        </span>
                      )}
                      <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                      {msg.criado_em && (
                        <p className={`text-[10px] mt-1 ${msg.tipo === 'cliente' ? 'text-white/60' : 'text-muted-foreground'}`}>
                          {formatTime(msg.criado_em)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t dark:border-white/10 flex gap-2">
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="h-9 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
            />
            <Button size="icon" className="h-9 w-9 shrink-0 bg-purple-600 hover:bg-purple-700" onClick={enviarMensagem} disabled={enviando || !texto.trim()}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="h-12 w-12 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white animate-float"
          onClick={() => setAberto(true)}
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
