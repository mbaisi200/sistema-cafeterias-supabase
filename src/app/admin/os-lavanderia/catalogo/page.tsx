'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase';
import {
  Plus,
  ChevronLeft,
  Search,
  Edit,
  Trash2,
  Loader2,
  WashingMachine,
  Shirt,
  Sparkles,
  PackageSearch,
  CheckCircle2,
  XCircle,
  Tag,
  Zap,
  DollarSign,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================
interface ItemCatalogo {
  id: string;
  descricao: string;
  categoria: string;
  ativo: boolean;
  criado_em: string;
}

interface ServicoCatalogo {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  ativo: boolean;
  criado_em: string;
}

interface PrecoCatalogo {
  id: string;
  item_id: string;
  servico_id: string;
  preco: number;
}

const CATEGORIAS = [
  { value: 'Roupas', label: 'Roupas' },
  { value: 'Cama/Banho', label: 'Cama/Banho' },
  { value: 'Tapetes', label: 'Tapetes' },
  { value: 'Cortinas', label: 'Cortinas' },
  { value: 'Couro', label: 'Couro' },
  { value: 'Outros', label: 'Outros' },
];

const CATEGORIA_ICONS: Record<string, string> = {
  'Roupas': 'bg-sky-100 text-sky-700',
  'Cama/Banho': 'bg-violet-100 text-violet-700',
  'Tapetes': 'bg-amber-100 text-amber-700',
  'Cortinas': 'bg-emerald-100 text-emerald-700',
  'Couro': 'bg-orange-100 text-orange-700',
  'Outros': 'bg-gray-100 text-gray-700',
};

// ============================================================
// Component
// ============================================================
export default function CatalogoLavanderiaPage() {
  const { empresaId } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('itens');

  // --- Itens do Catálogo ---
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [itensLoading, setItensLoading] = useState(true);
  const [itensSearch, setItensSearch] = useState('');

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemCatalogo | null>(null);
  const [itemSaving, setItemSaving] = useState(false);

  // Form fields - Itens
  const [itemDescricao, setItemDescricao] = useState('');
  const [itemCategoria, setItemCategoria] = useState('');
  const [itemAtivo, setItemAtivo] = useState(true);

  // --- Serviços e Preços ---
  const [servicos, setServicos] = useState<ServicoCatalogo[]>([]);
  const [servicosLoading, setServicosLoading] = useState(true);
  const [servicosSearch, setServicosSearch] = useState('');

  const [servicoDialogOpen, setServicoDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<ServicoCatalogo | null>(null);
  const [servicoSaving, setServicoSaving] = useState(false);

  // Form fields - Serviços
  const [servicoNome, setServicoNome] = useState('');
  const [servicoDescricao, setServicoDescricao] = useState('');
  const [servicoPreco, setServicoPreco] = useState('');
  const [servicoAtivo, setServicoAtivo] = useState(true);

  // --- Tabela de Preços (Matrix) ---
  const [precos, setPrecos] = useState<PrecoCatalogo[]>([]);
  const [precosLoading, setPrecosLoading] = useState(false);
  const [precosSearch, setPrecosSearch] = useState('');
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [savingPriceKey, setSavingPriceKey] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'item' | 'servico';
    id: string;
    nome: string;
  }>({ open: false, type: 'item', id: '', nome: '' });

  const getSupabase = () => getSupabaseClient();

  // ============================================================
  // Data Loading
  // ============================================================
  useEffect(() => {
    if (empresaId) {
      loadItens();
      loadServicos();
    }
  }, [empresaId]);

  // Load prices when the precos tab is activated
  useEffect(() => {
    if (empresaId && activeTab === 'precos') {
      loadPrecos();
    }
  }, [activeTab, empresaId]);

  const loadItens = async () => {
    setItensLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('lavanderia_itens_catalogo')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setItens((data || []).map((row: any) => ({
        id: row.id,
        descricao: row.descricao || '',
        categoria: row.categoria || '',
        ativo: row.ativo ?? true,
        criado_em: row.criado_em || '',
      })));
    } catch (err: any) {
      console.error('Erro ao carregar itens do catálogo:', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar itens', description: err.message });
    } finally {
      setItensLoading(false);
    }
  };

  const loadServicos = async () => {
    setServicosLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('lavanderia_servicos_catalogo')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setServicos((data || []).map((row: any) => ({
        id: row.id,
        nome: row.nome || '',
        descricao: row.descricao || null,
        preco: parseFloat(row.preco) || 0,
        ativo: row.ativo ?? true,
        criado_em: row.criado_em || '',
      })));
    } catch (err: any) {
      console.error('Erro ao carregar serviços do catálogo:', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar serviços', description: err.message });
    } finally {
      setServicosLoading(false);
    }
  };

  const loadPrecos = async () => {
    setPrecosLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('lavanderia_precos')
        .select('*')
        .eq('empresa_id', empresaId);

      if (error) throw error;
      setPrecos((data || []).map((row: any) => ({
        id: row.id,
        item_id: row.item_id,
        servico_id: row.servico_id,
        preco: parseFloat(row.preco) || 0,
      })));
    } catch (err: any) {
      console.error('Erro ao carregar preços:', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar preços', description: err.message });
    } finally {
      setPrecosLoading(false);
    }
  };

  const handleSavePreco = useCallback(async (itemId: string, servicoId: string, preco: number) => {
    const key = `${itemId}_${servicoId}`;
    setSavingPriceKey(key);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('lavanderia_precos')
        .upsert({
          empresa_id: empresaId,
          item_id: itemId,
          servico_id: servicoId,
          preco,
        }, { onConflict: 'item_id,servico_id' });

      if (error) throw error;
    } catch (err: any) {
      console.error('Erro ao salvar preço:', err);
      toast({ variant: 'destructive', title: 'Erro ao salvar preço', description: err.message });
    } finally {
      setSavingPriceKey(null);
    }
  }, [empresaId]);

  const handlePriceChange = useCallback((itemId: string, servicoId: string, rawValue: string) => {
    const key = `${itemId}_${servicoId}`;

    // Update local editing state immediately
    setEditingPrices(prev => ({ ...prev, [key]: rawValue }));

    // Clear any existing debounce timer for this cell
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    // Debounce save (500ms)
    const numericValue = parseFloat(rawValue.replace(',', '.'));
    if (!isNaN(numericValue) && numericValue >= 0) {
      debounceTimers.current[key] = setTimeout(() => {
        handleSavePreco(itemId, servicoId, numericValue);
      }, 500);
    }
  }, [handleSavePreco]);

  const handlePriceBlur = useCallback((itemId: string, servicoId: string) => {
    const key = `${itemId}_${servicoId}`;

    // Clear debounce timer since we're saving now
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
      delete debounceTimers.current[key];
    }

    const rawValue = editingPrices[key];
    if (rawValue === undefined) return;

    const numericValue = parseFloat(rawValue.replace(',', '.'));
    if (!isNaN(numericValue) && numericValue >= 0) {
      handleSavePreco(itemId, servicoId, numericValue);
    }
  }, [editingPrices, handleSavePreco]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // ============================================================
  // Filters
  // ============================================================
  const itensFiltrados = useMemo(() => {
    if (!itensSearch.trim()) return itens;
    const term = itensSearch.toLowerCase();
    return itens.filter(item =>
      item.descricao.toLowerCase().includes(term) ||
      item.categoria.toLowerCase().includes(term)
    );
  }, [itens, itensSearch]);

  const servicosFiltrados = useMemo(() => {
    if (!servicosSearch.trim()) return servicos;
    const term = servicosSearch.toLowerCase();
    return servicos.filter(servico =>
      servico.nome.toLowerCase().includes(term) ||
      (servico.descricao || '').toLowerCase().includes(term)
    );
  }, [servicos, servicosSearch]);

  const totalItens = itens.length;
  const totalItensAtivos = itens.filter(i => i.ativo).length;
  const totalServicos = servicos.length;
  const totalServicosAtivos = servicos.filter(s => s.ativo).length;
  const totalPrecosCadastrados = precos.filter(p => p.preco > 0).length;

  // Active items and services for the price matrix
  const itensAtivos = useMemo(() => itens.filter(i => i.ativo), [itens]);
  const servicosAtivos = useMemo(() => servicos.filter(s => s.ativo), [servicos]);

  // Filter items for the matrix based on search
  const matrixItens = useMemo(() => {
    if (!precosSearch.trim()) return itensAtivos;
    const term = precosSearch.toLowerCase();
    return itensAtivos.filter(item =>
      item.descricao.toLowerCase().includes(term) ||
      item.categoria.toLowerCase().includes(term)
    );
  }, [itensAtivos, precosSearch]);

  // Helper to get price for a given item_id + servico_id
  const getPreco = useCallback((itemId: string, servicoId: string): number => {
    const found = precos.find(p => p.item_id === itemId && p.servico_id === servicoId);
    return found ? found.preco : 0;
  }, [precos]);

  // Helper to get the raw editing value for a cell
  const getEditingValue = useCallback((itemId: string, servicoId: string): string => {
    const key = `${itemId}_${servicoId}`;
    if (editingPrices[key] !== undefined) return editingPrices[key];
    const preco = getPreco(itemId, servicoId);
    return preco > 0 ? String(preco) : '';
  }, [editingPrices, getPreco]);

  // ============================================================
  // Itens CRUD
  // ============================================================
  const openNewItemDialog = () => {
    setEditingItem(null);
    setItemDescricao('');
    setItemCategoria('');
    setItemAtivo(true);
    setItemDialogOpen(true);
  };

  const openEditItemDialog = (item: ItemCatalogo) => {
    setEditingItem(item);
    setItemDescricao(item.descricao);
    setItemCategoria(item.categoria);
    setItemAtivo(item.ativo);
    setItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemDescricao.trim()) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Informe a descrição do item.' });
      return;
    }
    if (!itemCategoria) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Selecione a categoria.' });
      return;
    }

    setItemSaving(true);
    try {
      const supabase = getSupabase();

      if (editingItem) {
        const { error } = await supabase
          .from('lavanderia_itens_catalogo')
          .update({
            descricao: itemDescricao.trim(),
            categoria: itemCategoria,
            ativo: itemAtivo,
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: 'Item atualizado!', description: `"${itemDescricao.trim()}" foi atualizado com sucesso.` });
      } else {
        const { error } = await supabase
          .from('lavanderia_itens_catalogo')
          .insert({
            empresa_id: empresaId,
            descricao: itemDescricao.trim(),
            categoria: itemCategoria,
            ativo: itemAtivo,
          });
        if (error) throw error;
        toast({ title: 'Item criado!', description: `"${itemDescricao.trim()}" foi adicionado ao catálogo.` });
      }

      setItemDialogOpen(false);
      loadItens();
    } catch (err: any) {
      console.error('Erro ao salvar item:', err);
      toast({ variant: 'destructive', title: 'Erro ao salvar item', description: err.message });
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('lavanderia_itens_catalogo')
        .delete()
        .eq('id', deleteDialog.id);
      if (error) throw error;
      toast({ title: 'Item excluído!', description: `"${deleteDialog.nome}" foi removido do catálogo.` });
      setDeleteDialog({ open: false, type: 'item', id: '', nome: '' });
      loadItens();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir item', description: err.message });
    }
  };

  // ============================================================
  // Serviços CRUD
  // ============================================================
  const openNewServicoDialog = () => {
    setEditingServico(null);
    setServicoNome('');
    setServicoDescricao('');
    setServicoPreco('');
    setServicoAtivo(true);
    setServicoDialogOpen(true);
  };

  const openEditServicoDialog = (servico: ServicoCatalogo) => {
    setEditingServico(servico);
    setServicoNome(servico.nome);
    setServicoDescricao(servico.descricao || '');
    setServicoPreco(servico.preco > 0 ? String(servico.preco) : '');
    setServicoAtivo(servico.ativo);
    setServicoDialogOpen(true);
  };

  const handleSaveServico = async () => {
    if (!servicoNome.trim()) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Informe o nome do serviço.' });
      return;
    }

    const precoNum = parseFloat(servicoPreco.replace(',', '.'));
    if (isNaN(precoNum) || precoNum < 0) {
      toast({ variant: 'destructive', title: 'Valor inválido', description: 'Informe um preço válido.' });
      return;
    }

    setServicoSaving(true);
    try {
      const supabase = getSupabase();

      if (editingServico) {
        const { error } = await supabase
          .from('lavanderia_servicos_catalogo')
          .update({
            nome: servicoNome.trim(),
            descricao: servicoDescricao.trim() || null,
            preco: precoNum,
            ativo: servicoAtivo,
          })
          .eq('id', editingServico.id);
        if (error) throw error;
        toast({ title: 'Serviço atualizado!', description: `"${servicoNome.trim()}" foi atualizado com sucesso.` });
      } else {
        const { error } = await supabase
          .from('lavanderia_servicos_catalogo')
          .insert({
            empresa_id: empresaId,
            nome: servicoNome.trim(),
            descricao: servicoDescricao.trim() || null,
            preco: precoNum,
            ativo: servicoAtivo,
          });
        if (error) throw error;
        toast({ title: 'Serviço criado!', description: `"${servicoNome.trim()}" foi adicionado ao catálogo.` });
      }

      setServicoDialogOpen(false);
      loadServicos();
    } catch (err: any) {
      console.error('Erro ao salvar serviço:', err);
      toast({ variant: 'destructive', title: 'Erro ao salvar serviço', description: err.message });
    } finally {
      setServicoSaving(false);
    }
  };

  const handleDeleteServico = async () => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('lavanderia_servicos_catalogo')
        .delete()
        .eq('id', deleteDialog.id);
      if (error) throw error;
      toast({ title: 'Serviço excluído!', description: `"${deleteDialog.nome}" foi removido do catálogo.` });
      setDeleteDialog({ open: false, type: 'servico', id: '', nome: '' });
      loadServicos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir serviço', description: err.message });
    }
  };

  // ============================================================
  // Popular Serviços Padrão
  // ============================================================
  const [populating, setPopulating] = useState(false);

  const SERVICOS_PADRAO = [
    { nome: 'Lavar', descricao: 'Lavagem convencional em máquina', preco: 0 },
    { nome: 'Secar', descricao: 'Secagem em secadora', preco: 0 },
    { nome: 'Passar', descricao: 'Passadoria convencional', preco: 0 },
    { nome: 'Lavar/Passar', descricao: 'Lavagem e passadoria completa', preco: 0 },
    { nome: 'Lavar/Secar', descricao: 'Lavagem e secagem', preco: 0 },
    { nome: 'Lavagem a Seco', descricao: 'Lavagem profissional a seco para peças delicadas', preco: 0 },
  ];

  const popularServicosPadrao = async () => {
    if (!confirm('Isso vai criar os 6 serviços padrão (Lavar, Secar, Passar, Lavar/Passar, Lavar/Secar, Lavagem a Seco) com preço R$ 0,00. Você poderá editar os preços depois. Continuar?')) return;
    setPopulating(true);
    try {
      const supabase = getSupabase();
      // Check which already exist
      const { data: existing } = await supabase
        .from('lavanderia_servicos_catalogo')
        .select('nome')
        .eq('empresa_id', empresaId);
      const existingNames = new Set((existing || []).map((s: any) => s.nome.toLowerCase()));
      const toInsert = SERVICOS_PADRAO.filter(s => !existingNames.has(s.nome.toLowerCase()));
      if (toInsert.length === 0) {
        toast({ title: 'Nada a criar', description: 'Todos os serviços padrão já existem no catálogo.' });
        setPopulating(false);
        return;
      }
      const rows = toInsert.map(s => ({
        empresa_id: empresaId,
        nome: s.nome,
        descricao: s.descricao,
        preco: s.preco,
        ativo: true,
      }));
      const { error } = await supabase.from('lavanderia_servicos_catalogo').insert(rows);
      if (error) throw error;
      toast({ title: `${toInsert.length} serviço(s) criado(s)!`, description: 'Agora edite os preços em cada serviço.' });
      loadServicos();
    } catch (err: any) {
      console.error('Erro ao popular serviços:', err);
      toast({ variant: 'destructive', title: 'Erro ao criar serviços', description: err.message });
    } finally {
      setPopulating(false);
    }
  };

  // ============================================================
  // Helpers
  // ============================================================
  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '-'; }
  };

  const getCategoriaBadge = (categoria: string) => {
    const classes = CATEGORIA_ICONS[categoria] || 'bg-gray-100 text-gray-700';
    return (
      <Badge variant="secondary" className={`text-xs font-medium ${classes}`}>
        {categoria}
      </Badge>
    );
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'OS Lavanderia' }, { title: 'Catálogo' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/os-lavanderia">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center">
                    <WashingMachine className="h-6 w-6 text-sky-600" />
                  </div>
                  Catálogo da Lavanderia
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie itens de peças e tipos de serviços disponíveis
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-sky-100 flex items-center justify-center">
                    <Shirt className="h-6 w-6 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Itens no Catálogo</p>
                    <p className="text-2xl font-bold">{totalItens}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Itens Ativos</p>
                    <p className="text-2xl font-bold">{totalItensAtivos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Serviços Cadastrados</p>
                    <p className="text-2xl font-bold">{totalServicos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Serviços Ativos</p>
                    <p className="text-2xl font-bold">{totalServicosAtivos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preços Cadastrados</p>
                    <p className="text-2xl font-bold">{totalPrecosCadastrados}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 max-w-2xl">
              <TabsTrigger value="itens" className="gap-2">
                <Shirt className="h-4 w-4" />
                Itens do Catálogo
              </TabsTrigger>
              <TabsTrigger value="precos" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Tabela de Preços
              </TabsTrigger>
              <TabsTrigger value="servicos" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Serviços e Preços
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* TAB 1: Itens do Catálogo */}
            {/* ============================================================ */}
            <TabsContent value="itens" className="space-y-4">
              {/* Search + Create */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="relative flex-1 w-full md:max-w-[400px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por descrição ou categoria..."
                        value={itensSearch}
                        onChange={(e) => setItensSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={openNewItemDialog} className="gap-2 bg-sky-600 hover:bg-sky-700">
                      <Plus className="h-4 w-4" />
                      Novo Item
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shirt className="h-5 w-5 text-sky-600" />
                    Itens do Catálogo
                  </CardTitle>
                  <CardDescription>
                    {itensFiltrados.length} item(ns) encontrado(s)
                    {itensSearch && ` para "${itensSearch}"`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {itensLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : itensFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <PackageSearch className="h-12 w-12 mb-4 opacity-30" />
                      <p className="text-lg font-medium">Nenhum item encontrado</p>
                      <p className="text-sm">
                        {itensSearch
                          ? 'Tente alterar os termos da busca'
                          : 'Clique em "Novo Item" para adicionar ao catálogo'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="hidden md:table-cell">Criado em</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itensFiltrados.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <p className="font-medium">{item.descricao}</p>
                                <p className="text-xs text-muted-foreground sm:hidden">{item.categoria}</p>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {getCategoriaBadge(item.categoria)}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.ativo ? (
                                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inativo
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                {formatDate(item.criado_em)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditItemDialog(item)}
                                    title="Editar item"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() =>
                                      setDeleteDialog({
                                        open: true,
                                        type: 'item',
                                        id: item.id,
                                        nome: item.descricao,
                                      })
                                    }
                                    title="Excluir item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================ */}
            {/* TAB 2: Tabela de Preços (Price Matrix) */}
            {/* ============================================================ */}
            <TabsContent value="precos" className="space-y-4">
              {/* Info Card */}
              <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <DollarSign className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-violet-900">Tabela de Preços</p>
                      <p className="text-sm text-violet-700 mt-1">
                        Defina o preço para cada combinação de Item × Tipo de Serviço. Esses preços serão usados automaticamente ao criar uma OS.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {precosLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </CardContent>
                </Card>
              ) : itensAtivos.length === 0 || servicosAtivos.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <PackageSearch className="h-12 w-12 mb-4 opacity-30" />
                    <p className="text-lg font-medium">Dados insuficientes para montar a tabela</p>
                    <p className="text-sm mt-1">
                      {itensAtivos.length === 0 && servicosAtivos.length === 0
                        ? 'Você precisa cadastrar itens e serviços antes de definir preços. Use as abas "Itens do Catálogo" e "Serviços e Preços" para criar.'
                        : itensAtivos.length === 0
                          ? 'Nenhum item ativo encontrado. Cadastre itens na aba "Itens do Catálogo" primeiro.'
                          : 'Nenhum serviço ativo encontrado. Cadastre serviços na aba "Serviços e Preços" primeiro.'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Search filter for items */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="relative flex-1 w-full md:max-w-[400px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar item..."
                          value={precosSearch}
                          onChange={(e) => setPrecosSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Price Matrix Table */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-violet-600" />
                        Matriz de Preços
                      </CardTitle>
                      <CardDescription>
                        {matrixItens.length} item(ns) × {servicosAtivos.length} serviço(s) — {totalPrecosCadastrados} preço(s) cadastrado(s)
                        {precosSearch && ` para "${precosSearch}"`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="sticky left-0 bg-muted/50 z-10 text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                                Item
                              </th>
                              {servicosAtivos.map((servico) => (
                                <th
                                  key={servico.id}
                                  className="text-center px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap min-w-[120px]"
                                >
                                  <span className="block text-xs font-medium">{servico.nome}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {matrixItens.map((item) => (
                              <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                                <td className="sticky left-0 bg-background z-10 px-4 py-2.5 whitespace-nowrap">
                                  <p className="font-medium">{item.descricao}</p>
                                  <Badge variant="secondary" className={`text-[10px] mt-0.5 ${CATEGORIA_ICONS[item.categoria] || 'bg-gray-100 text-gray-700'}`}>
                                    {item.categoria}
                                  </Badge>
                                </td>
                                {servicosAtivos.map((servico) => {
                                  const key = `${item.id}_${servico.id}`;
                                  const preco = getPreco(item.id, servico.id);
                                  const editVal = getEditingValue(item.id, servico.id);
                                  const isSaving = savingPriceKey === key;
                                  const hasPrice = preco > 0;

                                  return (
                                    <td key={servico.id} className="text-center px-2 py-2">
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                                          R$
                                        </span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={editVal}
                                          onChange={(e) => handlePriceChange(item.id, servico.id, e.target.value)}
                                          onBlur={() => handlePriceBlur(item.id, servico.id)}
                                          placeholder="0,00"
                                          className={`w-full text-right pl-8 pr-2 py-1.5 rounded-md border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ${
                                            hasPrice
                                              ? 'border-green-200 bg-green-50/50 font-medium text-green-700'
                                              : 'border-gray-200 bg-white text-gray-700'
                                          } ${isSaving ? 'opacity-70' : ''}`}
                                        />
                                        {isSaving && (
                                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-violet-500" />
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* TAB 3: Serviços e Preços */}
            {/* ============================================================ */}
            <TabsContent value="servicos" className="space-y-4">
              {/* Search + Create */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="relative flex-1 w-full md:max-w-[400px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome do serviço..."
                        value={servicosSearch}
                        onChange={(e) => setServicosSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={openNewServicoDialog} className="gap-2 bg-sky-600 hover:bg-sky-700">
                      <Plus className="h-4 w-4" />
                      Novo Serviço
                    </Button>
                    {servicos.length === 0 && (
                      <Button variant="outline" className="gap-2" onClick={popularServicosPadrao} disabled={populating}>
                        {populating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        Popular Padrão
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-sky-600" />
                    Serviços e Preços
                  </CardTitle>
                  <CardDescription>
                    {servicosFiltrados.length} serviço(s) encontrado(s)
                    {servicosSearch && ` para "${servicosSearch}"`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {servicosLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : servicosFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <PackageSearch className="h-12 w-12 mb-4 opacity-30" />
                      <p className="text-lg font-medium">Nenhum serviço encontrado</p>
                      <p className="text-sm">
                        {servicosSearch
                          ? 'Tente alterar os termos da busca'
                          : 'Clique em "Novo Serviço" para adicionar ao catálogo'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                            <TableHead className="text-right">Preço</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="hidden md:table-cell">Criado em</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {servicosFiltrados.map((servico) => (
                            <TableRow key={servico.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4 text-muted-foreground hidden sm:block" />
                                  <p className="font-medium">{servico.nome}</p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[250px] truncate">
                                {servico.descricao || <span className="italic">-</span>}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                {servico.preco > 0
                                  ? formatCurrency(servico.preco)
                                  : <span className="text-muted-foreground font-normal">-</span>
                                }
                              </TableCell>
                              <TableCell className="text-center">
                                {servico.ativo ? (
                                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inativo
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                {formatDate(servico.criado_em)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditServicoDialog(servico)}
                                    title="Editar serviço"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() =>
                                      setDeleteDialog({
                                        open: true,
                                        type: 'servico',
                                        id: servico.id,
                                        nome: servico.nome,
                                      })
                                    }
                                    title="Excluir serviço"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ============================================================ */}
        {/* ITEM CREATE/EDIT DIALOG */}
        {/* ============================================================ */}
        <Dialog
          open={itemDialogOpen}
          onOpenChange={(open) => {
            setItemDialogOpen(open);
            if (!open) {
              setEditingItem(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shirt className="h-5 w-5 text-sky-600" />
                {editingItem ? 'Editar Item do Catálogo' : 'Novo Item do Catálogo'}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Altere os dados do item abaixo.'
                  : 'Preencha os dados para adicionar um novo item ao catálogo de peças.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="item-descricao">Descrição *</Label>
                <Input
                  id="item-descricao"
                  placeholder="Ex: Camisa social branca, Edredom queen..."
                  value={itemDescricao}
                  onChange={(e) => setItemDescricao(e.target.value)}
                  maxLength={200}
                />
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="item-categoria">Categoria *</Label>
                <Select value={itemCategoria} onValueChange={setItemCategoria}>
                  <SelectTrigger id="item-categoria">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ativo */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Item ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Itens inativos não aparecem como opção nas OS
                  </p>
                </div>
                <Switch checked={itemAtivo} onCheckedChange={setItemAtivo} />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setItemDialogOpen(false)}
                disabled={itemSaving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveItem}
                disabled={itemSaving}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {itemSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingItem ? (
                  'Atualizar Item'
                ) : (
                  'Criar Item'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* SERVIÇO CREATE/EDIT DIALOG */}
        {/* ============================================================ */}
        <Dialog
          open={servicoDialogOpen}
          onOpenChange={(open) => {
            setServicoDialogOpen(open);
            if (!open) {
              setEditingServico(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sky-600" />
                {editingServico ? 'Editar Serviço' : 'Novo Serviço'}
              </DialogTitle>
              <DialogDescription>
                {editingServico
                  ? 'Altere os dados do serviço abaixo.'
                  : 'Preencha os dados para cadastrar um novo tipo de serviço.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="servico-nome">Nome do Serviço *</Label>
                <Input
                  id="servico-nome"
                  placeholder="Ex: Lavar e Passar, Lavagem a Seco..."
                  value={servicoNome}
                  onChange={(e) => setServicoNome(e.target.value)}
                  maxLength={150}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="servico-descricao">Descrição</Label>
                <Input
                  id="servico-descricao"
                  placeholder="Descrição opcional do serviço (ex: para peças delicadas)"
                  value={servicoDescricao}
                  onChange={(e) => setServicoDescricao(e.target.value)}
                  maxLength={300}
                />
              </div>

              {/* Preço */}
              <div className="space-y-2">
                <Label htmlFor="servico-preco">Preço (R$) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    id="servico-preco"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={servicoPreco}
                    onChange={(e) => setServicoPreco(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Ativo */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Serviço ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Serviços inativos não aparecem como opção nas OS
                  </p>
                </div>
                <Switch checked={servicoAtivo} onCheckedChange={setServicoAtivo} />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setServicoDialogOpen(false)}
                disabled={servicoSaving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveServico}
                disabled={servicoSaving}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {servicoSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingServico ? (
                  'Atualizar Serviço'
                ) : (
                  'Criar Serviço'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* DELETE CONFIRMATION DIALOG */}
        {/* ============================================================ */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, type: 'item', id: '', nome: '' });
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir permanentemente{' '}
                <strong className="text-foreground">
                  &quot;{deleteDialog.nome}&quot;
                </strong>
                ?
                <br />
                Esta ação não pode ser desfeita. O registro será removido definitivamente do banco de dados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteDialog.type === 'item') {
                    handleDeleteItem();
                  } else {
                    handleDeleteServico();
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Sim, Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
