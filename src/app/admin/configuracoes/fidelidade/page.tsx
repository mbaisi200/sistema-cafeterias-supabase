'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Gift, Star, Heart, Plus, Pencil, Trash2, Loader2, Award, Coffee,
} from 'lucide-react';

interface ProgramaFidelidade {
  id?: string;
  empresa_id: string;
  modelo: string;
  ativo: boolean;
  regras: Record<string, any>;
}

interface FidelidadeRecompensa {
  id: string;
  empresa_id: string;
  modelo: string;
  tipo: string;
  ativo: boolean;
  custo_acao: number;
  valor_desconto: number | null;
  produto_id: string | null;
  descricao: string;
}

const MODELOS = [
  { value: 'pontos', label: 'Pontos por Compra', desc: 'Cliente acumula pontos a cada R$ gasto' },
  { value: 'selos', label: 'Selos (Cartão Fidelidade)', desc: 'A cada compra ganha 1 selo. Ex: 10 selos = 1 café grátis' },
  { value: 'visitas', label: 'Visitas', desc: 'Cliente ganha benefício após N visitas' },
  { value: 'cashback', label: 'Cashback', desc: 'Percentual do valor da compra volta como crédito' },
];

const REGRAS_PADRAO: Record<string, Record<string, any>> = {
  pontos: { valor_para_1_ponto: 1, pontos_para_1_real: 100, validade_dias: 365 },
  selos: { selos_necessarios: 10, validade_dias: null },
  visitas: { visitas_necessarias: 5, validade_dias: 30 },
  cashback: { percentual: 5, validade_dias: 180 },
};

export default function FidelidadePage() {
  const { empresaId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [programa, setPrograma] = useState<ProgramaFidelidade | null>(null);
  const [modelo, setModelo] = useState('pontos');
  const [ativo, setAtivo] = useState(false);
  const [regras, setRegras] = useState<Record<string, any>>({});

  const [recompensas, setRecompensas] = useState<FidelidadeRecompensa[]>([]);
  const [dialogRecompensa, setDialogRecompensa] = useState(false);
  const [editandoRecompensa, setEditandoRecompensa] = useState<FidelidadeRecompensa | null>(null);
  const [recForm, setRecForm] = useState({ tipo: 'desconto', custo_acao: 10, descricao: '', valor_desconto: 5, produto_id: '' });

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const [resP, resR] = await Promise.all([
        fetch(`/api/fidelidade/programa?empresa_id=${empresaId}`),
        fetch(`/api/fidelidade/recompensas?empresa_id=${empresaId}`),
      ]);
      const dataP = await resP.json();
      const dataR = await resR.json();

      if (dataP.sucesso && dataP.dado) {
        setPrograma(dataP.dado);
        setModelo(dataP.dado.modelo);
        setAtivo(dataP.dado.ativo);
        const regrasObj = typeof dataP.dado.regras === 'string' ? JSON.parse(dataP.dado.regras) : (dataP.dado.regras || {});
        setRegras(regrasObj);
      } else {
        setPrograma(null);
        setRegras({});
      }

      if (dataR.sucesso) {
        setRecompensas(dataR.dados || []);
      }
    } catch {
      toast({ title: 'Erro ao carregar configurações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleSalvarPrograma = async () => {
    if (!empresaId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/fidelidade/programa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: empresaId, modelo, ativo, regras }),
      });
      const data = await res.json();
      if (data.sucesso) {
        setPrograma(data.dado);
        toast({ title: 'Programa salvo com sucesso' });
      } else {
        throw new Error(data.erro?.mensagem);
      }
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleMudarModelo = (valor: string) => {
    setModelo(valor);
    setRegras(REGRAS_PADRAO[valor] || {});
  };

  const handleNovaRecompensa = () => {
    setEditandoRecompensa(null);
    setRecForm({ tipo: 'desconto', custo_acao: 10, descricao: '', valor_desconto: 5, produto_id: '' });
    setDialogRecompensa(true);
  };

  const handleEditarRecompensa = (r: FidelidadeRecompensa) => {
    setEditandoRecompensa(r);
    setRecForm({
      tipo: r.tipo,
      custo_acao: r.custo_acao,
      descricao: r.descricao,
      valor_desconto: r.valor_desconto || 0,
      produto_id: r.produto_id || '',
    });
    setDialogRecompensa(true);
  };

  const handleSalvarRecompensa = async () => {
    if (!empresaId) return;
    try {
      const body = { empresa_id: empresaId, modelo, ...recForm };

      let res;
      if (editandoRecompensa) {
        res = await fetch(`/api/fidelidade/recompensas/${editandoRecompensa.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recForm),
        });
      } else {
        res = await fetch('/api/fidelidade/recompensas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (data.sucesso) {
        toast({ title: editandoRecompensa ? 'Recompensa atualizada' : 'Recompensa criada' });
        setDialogRecompensa(false);
        carregar();
      } else {
        throw new Error(data.erro?.mensagem);
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleExcluirRecompensa = async (id: string) => {
    try {
      const res = await fetch(`/api/fidelidade/recompensas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.sucesso) {
        toast({ title: 'Recompensa excluída' });
        carregar();
      }
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const atualizarRegra = (chave: string, valor: any) => {
    setRegras((prev: Record<string, any>) => ({ ...prev, [chave]: valor }));
  };

  if (loading && !programa) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Configurações' }, { title: 'Fidelidade' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Configurações' }, { title: 'Fidelidade' }]}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-500" />
              Programa de Fidelidade
            </h1>
            <p className="text-muted-foreground">
              Configure o programa de fidelidade da sua empresa
            </p>
          </div>

          {/* Configuração do Programa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração do Programa
              </CardTitle>
              <CardDescription>
                Escolha o modelo e defina as regras do programa de fidelidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Programa Ativo</Label>
                  <p className="text-sm text-muted-foreground">Ligue para começar a acumular pontos dos clientes</p>
                </div>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Modelo do Programa</Label>
                <Select value={modelo} onValueChange={handleMudarModelo}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELOS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        <div className="flex flex-col">
                          <span>{m.label}</span>
                          <span className="text-xs text-muted-foreground">{m.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Regras dinâmicas */}
              <div className="space-y-4">
                <Label className="text-base">Regras do Programa</Label>
                {modelo === 'pontos' && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Valor para 1 ponto (R$)</Label>
                      <Input type="number" step="0.01" value={regras.valor_para_1_ponto || 1}
                        onChange={(e) => atualizarRegra('valor_para_1_ponto', parseFloat(e.target.value) || 1)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pontos para R$ 1 de desconto</Label>
                      <Input type="number" value={regras.pontos_para_1_real || 100}
                        onChange={(e) => atualizarRegra('pontos_para_1_real', parseInt(e.target.value) || 100)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Validade dos pontos (dias)</Label>
                      <Input type="number" value={regras.validade_dias ?? 365}
                        onChange={(e) => atualizarRegra('validade_dias', e.target.value ? parseInt(e.target.value) : null)} />
                    </div>
                  </div>
                )}
                {modelo === 'selos' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Selos necessários para recompensa</Label>
                      <Input type="number" value={regras.selos_necessarios || 10}
                        onChange={(e) => atualizarRegra('selos_necessarios', parseInt(e.target.value) || 10)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Validade dos selos (dias, opcional)</Label>
                      <Input type="number" value={regras.validade_dias ?? ''}
                        onChange={(e) => atualizarRegra('validade_dias', e.target.value ? parseInt(e.target.value) : null)} />
                    </div>
                  </div>
                )}
                {modelo === 'visitas' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Visitas necessárias para recompensa</Label>
                      <Input type="number" value={regras.visitas_necessarias || 5}
                        onChange={(e) => atualizarRegra('visitas_necessarias', parseInt(e.target.value) || 5)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Validade (dias, opcional)</Label>
                      <Input type="number" value={regras.validade_dias ?? ''}
                        onChange={(e) => atualizarRegra('validade_dias', e.target.value ? parseInt(e.target.value) : null)} />
                    </div>
                  </div>
                )}
                {modelo === 'cashback' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Percentual de cashback (%)</Label>
                      <Input type="number" step="0.1" value={regras.percentual || 5}
                        onChange={(e) => atualizarRegra('percentual', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Validade do crédito (dias)</Label>
                      <Input type="number" value={regras.validade_dias ?? 180}
                        onChange={(e) => atualizarRegra('validade_dias', e.target.value ? parseInt(e.target.value) : null)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSalvarPrograma} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {saving ? 'Salvando...' : 'Salvar Configuração'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recompensas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Recompensas
                </CardTitle>
                <CardDescription>
                  Defina as recompensas que os clientes podem trocar por pontos/selos
                </CardDescription>
              </div>
              <Button onClick={handleNovaRecompensa} disabled={!ativo}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Recompensa
              </Button>
            </CardHeader>
            <CardContent>
              {recompensas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma recompensa cadastrada</p>
                  <p className="text-sm">Ative o programa e cadastre recompensas para seus clientes</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recompensas.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.tipo === 'desconto' ? 'Desconto' : 'Produto'}</Badge>
                        </TableCell>
                        <TableCell>{r.custo_acao} {modelo === 'pontos' ? 'pts' : modelo === 'selos' ? 'selos' : modelo === 'visitas' ? 'visitas' : 'R$'}</TableCell>
                        <TableCell>
                          {r.tipo === 'desconto' ? `R$ ${(r.valor_desconto || 0).toFixed(2)}` : 'Produto'}
                        </TableCell>
                        <TableCell>
                          <Badge className={r.ativo ? 'bg-green-500' : ''} variant={r.ativo ? 'default' : 'secondary'}>
                            {r.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditarRecompensa(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleExcluirRecompensa(r.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dialog Nova/Editar Recompensa */}
        <Dialog open={dialogRecompensa} onOpenChange={setDialogRecompensa}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editandoRecompensa ? 'Editar Recompensa' : 'Nova Recompensa'}</DialogTitle>
              <DialogDescription>
                Defina a recompensa que o cliente pode resgatar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={recForm.tipo} onValueChange={(v) => setRecForm({ ...recForm, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desconto">Desconto em R$</SelectItem>
                    <SelectItem value="produto">Produto Grátis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={recForm.descricao} onChange={(e) => setRecForm({ ...recForm, descricao: e.target.value })}
                  placeholder="Ex: Café Expresso Grátis" />
              </div>
              <div className="space-y-2">
                <Label>Custo ({modelo === 'pontos' ? 'pontos' : modelo === 'selos' ? 'selos' : modelo === 'visitas' ? 'visitas' : 'R$'})</Label>
                <Input type="number" value={recForm.custo_acao} onChange={(e) => setRecForm({ ...recForm, custo_acao: parseInt(e.target.value) || 0 })} />
              </div>
              {recForm.tipo === 'desconto' && (
                <div className="space-y-2">
                  <Label>Valor do Desconto (R$)</Label>
                  <Input type="number" step="0.01" value={recForm.valor_desconto}
                    onChange={(e) => setRecForm({ ...recForm, valor_desconto: parseFloat(e.target.value) || 0 })} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogRecompensa(false)}>Cancelar</Button>
              <Button onClick={handleSalvarRecompensa}>
                {editandoRecompensa ? 'Atualizar' : 'Criar Recompensa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
