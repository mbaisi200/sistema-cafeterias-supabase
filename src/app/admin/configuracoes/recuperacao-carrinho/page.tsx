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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { ShoppingCart, Phone, ExternalLink, CheckCircle2, Clock, Search, Loader2 } from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatTempo(minutos: number): string {
  if (minutos < 60) return `${minutos} minutos`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h${m > 0 ? m + 'min' : ''}`;
}

function formatTempoRelativo(past: string): string {
  const diff = Date.now() - new Date(past).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h atrás`;
}

interface CarrinhoItem {
  id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_email: string | null;
  itens: any[];
  subtotal: number;
  taxa_entrega: number;
  total: number;
  tipo_pedido: string;
  lembretes_enviados: number;
  ultimo_lembrete_enviado: string | null;
  recuperado: boolean;
  criado_em: string;
}

export default function RecuperacaoCarrinhoPage() {
  const { empresaId } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [carrinhos, setCarrinhos] = useState<CarrinhoItem[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'abandonados' | 'recuperados'>('abandonados');
  const [busca, setBusca] = useState('');

  // Config
  const [config, setConfig] = useState({
    recuperacao_ativa: false,
    recuperacao_tempo_minutos: 30,
    recuperacao_desconto_percentual: null as number | null,
    recuperacao_mensagem: '',
  });

  useEffect(() => {
    if (!empresaId) return;
    Promise.all([carregarConfig(), carregarCarrinhos()]).finally(() => setLoading(false));
  }, [empresaId]);

  async function carregarConfig() {
    if (!empresaId) return;
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('empresa_delivery_config')
      .select('recuperacao_ativa, recuperacao_tempo_minutos, recuperacao_desconto_percentual, recuperacao_mensagem')
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (data) {
      setConfig({
        recuperacao_ativa: data.recuperacao_ativa || false,
        recuperacao_tempo_minutos: data.recuperacao_tempo_minutos || 30,
        recuperacao_desconto_percentual: data.recuperacao_desconto_percentual || null,
        recuperacao_mensagem: data.recuperacao_mensagem || '',
      });
    }
  }

  async function carregarCarrinhos() {
    if (!empresaId) return;
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('carrinhos_abandonados')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('criado_em', { ascending: false })
      .limit(50);
    if (data) setCarrinhos(data as CarrinhoItem[]);
  }

  async function salvarConfig() {
    if (!empresaId) return;
    setSalvando(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('empresa_delivery_config')
        .update({
          recuperacao_ativa: config.recuperacao_ativa,
          recuperacao_tempo_minutos: config.recuperacao_tempo_minutos,
          recuperacao_desconto_percentual: config.recuperacao_desconto_percentual,
          recuperacao_mensagem: config.recuperacao_mensagem || null,
        })
        .eq('empresa_id', empresaId);

      if (error) throw error;
      toast({ title: 'Configuração salva!' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
    } finally {
      setSalvando(false);
    }
  }

  function montarLinkWhatsApp(item: CarrinhoItem): string {
    const telefone = item.cliente_telefone?.replace(/\D/g, '');
    if (!telefone) return '#';
    const mensagem = config.recuperacao_mensagem
      .replace('{nome}', item.cliente_nome)
      .replace('{total}', formatCurrency(item.total));
    return `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
  }

  const carrinhosFiltrados = carrinhos.filter(item => {
    if (filtro === 'abandonados' && item.recuperado) return false;
    if (filtro === 'recuperados' && !item.recuperado) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!item.cliente_nome.toLowerCase().includes(q) && !(item.cliente_telefone || '').includes(q)) return false;
    }
    return true;
  });

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[
        { title: 'Configurações', href: '/admin/configuracoes' },
        { title: 'Recuperação de Carrinhos' },
      ]}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <ShoppingCart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Recuperação de Carrinhos</h1>
              <p className="text-sm text-muted-foreground">Recupere vendas perdidas entrando em contato com clientes que abandonaram o carrinho</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Configuração */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuração</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Recuperação automática</Label>
                      <p className="text-sm text-muted-foreground">Ativar rastreamento de carrinhos abandonados no cardápio online</p>
                    </div>
                    <Switch
                      checked={config.recuperacao_ativa}
                      onCheckedChange={(v) => setConfig(prev => ({ ...prev, recuperacao_ativa: v }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tempo para considerar abandonado</Label>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min={5}
                          max={1440}
                          value={config.recuperacao_tempo_minutos}
                          onChange={(e) => setConfig(prev => ({ ...prev, recuperacao_tempo_minutos: Number(e.target.value) }))}
                        />
                        <span className="text-sm text-muted-foreground">minutos</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Desconto para recuperação (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Ex: 10"
                        value={config.recuperacao_desconto_percentual || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, recuperacao_desconto_percentual: e.target.value ? Number(e.target.value) : null }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem para WhatsApp</Label>
                    <p className="text-xs text-muted-foreground">Use {'{nome}'} e {'{total}'} como variáveis</p>
                    <Textarea
                      value={config.recuperacao_mensagem}
                      onChange={(e) => setConfig(prev => ({ ...prev, recuperacao_mensagem: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <Button onClick={salvarConfig} disabled={salvando}>
                    {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar Configuração
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de Carrinhos */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Carrinhos Abandonados</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant={filtro === 'abandonados' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('abandonados')}>
                        Abandonados
                      </Button>
                      <Button variant={filtro === 'recuperados' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('recuperados')}>
                        Recuperados
                      </Button>
                      <Button variant={filtro === 'todos' ? 'default' : 'outline'} size="sm" onClick={() => setFiltro('todos')}>
                        Todos
                      </Button>
                    </div>
                  </div>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar por nome ou telefone..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {carrinhosFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum carrinho encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {carrinhosFiltrados.map(item => {
                        const totalItens = Array.isArray(item.itens) ? item.itens.reduce((acc: number, i: any) => acc + (i.quantidade || 0), 0) : 0;
                        return (
                          <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${item.recuperado ? 'opacity-60' : ''} ${item.recuperado ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-200 dark:border-amber-800'}`}>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{item.cliente_nome}</span>
                                {item.recuperado && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                {item.cliente_telefone && <span>{item.cliente_telefone}</span>}
                                <span>{totalItens} itens</span>
                                <span>{formatCurrency(item.total)}</span>
                                <span>{formatTempoRelativo(item.criado_em)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {item.lembretes_enviados > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {item.lembretes_enviados}x lembretes
                                </Badge>
                              )}
                              {!item.recuperado && item.cliente_telefone && (
                                <a
                                  href={montarLinkWhatsApp(item)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  <ExternalLink className="h-3 w-3" />
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
