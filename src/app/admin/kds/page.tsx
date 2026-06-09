'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { beep } from '@/lib/beep';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChefHat,
  Clock,
  Sun,
  Moon,
  ArrowLeft,
  Bell,
  BellOff,
  Maximize2,
  Minimize2,
  UtensilsCrossed,
  Timer,
} from 'lucide-react';

type KdsItem = {
  id: string;
  venda_id: string;
  nome: string;
  quantidade: number;
  observacao: string | null;
  kds_status: 'pendente' | 'em_preparacao' | 'pronto';
  criado_em: string;
  venda: {
    id: string;
    tipo: string;
    canal: string;
    status: string;
    mesa_id: string | null;
    nome_cliente: string | null;
    observacao: string | null;
    criado_em: string;
    mesa: { numero: number } | null;
  };
};

type AgrupoPedido = {
  vendaId: string;
  mesaNumero?: number;
  nomeCliente?: string;
  tipo: string;
  canal: string;
  observacaoVenda?: string;
  criadoEm: string;
  itens: KdsItem[];
};

function formatTempo(past: string): string {
  const diff = Date.now() - new Date(past).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  const remainder = mins % 60;
  return `${hrs}h${remainder > 0 ? remainder + 'min' : ''}`;
}

function agruparPorVenda(itens: KdsItem[]): AgrupoPedido[] {
  const mapa = new Map<string, AgrupoPedido>();
  for (const item of itens) {
    if (!mapa.has(item.venda_id)) {
      mapa.set(item.venda_id, {
        vendaId: item.venda_id,
        mesaNumero: item.venda.mesa?.numero,
        nomeCliente: item.venda.nome_cliente || undefined,
        tipo: item.venda.tipo,
        canal: item.venda.canal,
        observacaoVenda: item.venda.observacao || undefined,
        criadoEm: item.venda.criado_em,
        itens: [],
      });
    }
    mapa.get(item.venda_id)!.itens.push(item);
  }
  return Array.from(mapa.values()).sort(
    (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    pendente: { label: 'Pendente', cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700' },
    em_preparacao: { label: 'Preparando', cls: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' },
    pronto: { label: 'Pronto', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700' },
  };
  const c = config[status] || { label: status, cls: '' };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${c.cls}`}>
      {c.label}
    </Badge>
  );
}

function TipoIcon({ tipo, canal }: { tipo: string; canal: string }) {
  if (tipo === 'mesa' || tipo === 'comanda') {
    return <UtensilsCrossed className="h-3.5 w-3.5" />;
  }
  if (tipo === 'delivery' || ['ifood', 'uber_eats', 'rappi', 'whatsapp'].includes(canal)) {
    return <Timer className="h-3.5 w-3.5" />;
  }
  return <ChefHat className="h-3.5 w-3.5" />;
}

function TipoLabel({ tipo, canal, mesaNumero }: { tipo: string; canal: string; mesaNumero?: number }) {
  if (tipo === 'mesa' && mesaNumero) return `Mesa ${mesaNumero}`;
  if (tipo === 'comanda') return 'Comanda';
  if (canal === 'ifood') return 'iFood';
  if (canal === 'uber_eats') return 'Uber Eats';
  if (canal === 'rappi') return 'Rappi';
  if (canal === 'whatsapp') return 'WhatsApp';
  if (tipo === 'delivery') return 'Delivery';
  return 'Balcão';
}

export default function KDSPage() {
  const { user, empresaId } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const darkMode = resolvedTheme === 'dark';

  const [itens, setItens] = useState<KdsItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [somAtivo, setSomAtivo] = useState(true);
  const [telaCheia, setTelaCheia] = useState(false);
  const itensLengthRef = useRef(0);

  const carregarItens = useCallback(async () => {
    if (!empresaId) return;
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('itens_venda')
        .select(`
          id, venda_id, nome, quantidade, observacao, kds_status, criado_em,
          venda:vendas!venda_id(
            id, tipo, canal, status, mesa_id, nome_cliente, observacao, criado_em,
            mesa:mesas!mesa_id(numero)
          )
        `)
        .eq('empresa_id', empresaId)
        .in('kds_status', ['pendente', 'em_preparacao', 'pronto'])
        .gte('criado_em', hoje.toISOString())
        .order('criado_em', { ascending: true });

      if (!error && data) {
        const typedData = data as unknown as KdsItem[];
        if (typedData.length > itensLengthRef.current && itensLengthRef.current > 0 && somAtivo) {
          beep(660, 200, 0.15);
          setTimeout(() => beep(880, 200, 0.15), 250);
        }
        itensLengthRef.current = typedData.length;
        setItens(typedData);
      }
    } catch {
      // silent
    } finally {
      setCarregando(false);
    }
  }, [empresaId, somAtivo]);

  const atualizarStatus = useCallback(async (itemId: string, novoStatus: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('itens_venda')
      .update({ kds_status: novoStatus })
      .eq('id', itemId);

    if (!error) {
      setItens(prev => prev.map(i =>
        i.id === itemId ? { ...i, kds_status: novoStatus as KdsItem['kds_status'] } : i
      ));
    }
  }, []);

  const avancarStatus = useCallback((item: KdsItem) => {
    const next: Record<string, string> = {
      pendente: 'em_preparacao',
      em_preparacao: 'pronto',
      pronto: 'entregue',
    };
    const prox = next[item.kds_status];
    if (prox) {
      atualizarStatus(item.id, prox);
    }
  }, [atualizarStatus]);

  const voltarStatus = useCallback((item: KdsItem) => {
    const prev: Record<string, string> = {
      em_preparacao: 'pendente',
      pronto: 'em_preparacao',
    };
    const ant = prev[item.kds_status];
    if (ant) {
      atualizarStatus(item.id, ant);
    }
  }, [atualizarStatus]);

  useEffect(() => {
    carregarItens();
  }, [carregarItens]);

  useEffect(() => {
    if (!empresaId) return;
    const supabase = getSupabaseClient();

    const channel = supabase
      .channel('kds-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itens_venda',
          filter: `empresa_id=eq.${empresaId}`,
        },
        () => {
          carregarItens();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, carregarItens]);

  useEffect(() => {
    const interval = setInterval(() => {
      setItens(prev => [...prev]);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const alternarTelaCheia = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setTelaCheia(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setTelaCheia(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const pendentes = itens.filter(i => i.kds_status === 'pendente');
  const preparando = itens.filter(i => i.kds_status === 'em_preparacao');
  const prontos = itens.filter(i => i.kds_status === 'pronto');

  const gruposPendentes = agruparPorVenda(pendentes);
  const gruposPreparando = agruparPorVenda(preparando);
  const gruposProntos = agruparPorVenda(prontos);

  function renderColuna(titulo: string, cor: string, grupos: AgrupoPedido[], vazia: string) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <div className={`w-2 h-2 rounded-full ${cor}`} />
          <h2 className="text-lg font-bold">{titulo}</h2>
          <span className={`text-sm font-mono px-2 py-0.5 rounded-full ${cor.replace('bg-', 'bg-').replace('500', '100').replace('600', '200')} ${darkMode ? 'bg-opacity-20' : ''}`}>
            {grupos.reduce((acc, g) => acc + g.itens.length, 0)}
          </span>
        </div>
        {grupos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-white/10 text-muted-foreground text-sm">
            {vazia}
          </div>
        ) : (
          grupos.map(grupo => (
            <div
              key={grupo.vendaId}
              className={`rounded-xl border ${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-gray-200'} shadow-sm overflow-hidden`}
            >
              <div className={`flex items-center justify-between px-3 py-2 text-xs font-medium ${darkMode ? 'bg-white/5' : 'bg-gray-50'} border-b ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <TipoIcon tipo={grupo.tipo} canal={grupo.canal} />
                  <span className="font-semibold">{TipoLabel({ tipo: grupo.tipo, canal: grupo.canal, mesaNumero: grupo.mesaNumero })}</span>
                  {grupo.nomeCliente && (
                    <span className="text-muted-foreground">- {grupo.nomeCliente}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatTempo(grupo.criadoEm)}</span>
                </div>
              </div>
              {grupo.observacaoVenda && (
                <div className={`px-3 py-1.5 text-xs italic ${darkMode ? 'text-amber-300/80 bg-amber-500/5' : 'text-amber-700 bg-amber-50'} border-b ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
                  📝 {grupo.observacaoVenda}
                </div>
              )}
              <div className="divide-y divide-dashed">
                {grupo.itens.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors hover:bg-white/5 ${
                      item.kds_status === 'pendente' ? 'kds-item-pendente' : ''
                    } ${item.kds_status === 'pronto' ? 'opacity-70' : ''}`}
                    onClick={() => avancarStatus(item)}
                    onContextMenu={(e) => { e.preventDefault(); voltarStatus(item); }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-bold text-base min-w-[2rem] text-right">
                        {item.quantidade}x
                      </span>
                      <span className="font-semibold text-base truncate">{item.nome}</span>
                      {item.observacao && (
                        <span className="text-xs text-muted-foreground truncate italic">
                          ({item.observacao})
                        </span>
                      )}
                    </div>
                    <StatusBadge status={item.kds_status} />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'funcionario']}>
      <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-[#1a1a2e] via-[#1e2235] to-[#16213e]' : 'bg-gradient-to-br from-[#e8f0ed] via-[#eaeae6] to-[#f0eddd]'}`}>
        <header className={`sticky top-0 z-50 flex items-center justify-between px-4 py-2 border-b backdrop-blur-sm ${
          darkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white/70'
        }`}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <ChefHat className={`h-6 w-6 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <h1 className="text-xl font-bold">Cozinha</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSomAtivo(!somAtivo)}
              title={somAtivo ? 'Desativar som' : 'Ativar som'}
            >
              {somAtivo ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={alternarTelaCheia}
              title={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {telaCheia ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(darkMode ? 'light' : 'dark')}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {carregando ? (
          <div className="flex items-center justify-center h-[80vh]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 lg:p-6">
            {renderColuna(
              'Pendentes',
              'bg-amber-500',
              gruposPendentes,
              'Nenhum item pendente'
            )}
            {renderColuna(
              'Em Preparação',
              'bg-blue-500',
              gruposPreparando,
              'Nenhum item em preparação'
            )}
            {renderColuna(
              'Prontos',
              'bg-emerald-500',
              gruposProntos,
              'Nenhum item pronto'
            )}
          </div>
        )}

        <div className={`fixed bottom-4 right-4 text-xs text-muted-foreground ${darkMode ? 'bg-white/5' : 'bg-white/70'} backdrop-blur-sm px-3 py-1.5 rounded-full border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
          {itens.length} itens na cozinha · {pendentes.length} pendentes
        </div>
      </div>
    </ProtectedRoute>
  );
}
