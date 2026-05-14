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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Filter,
  FolderOpen,
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

interface CategoriaCatalogo {
  id: string;
  nome: string;
  cor_bg: string;
  cor_text: string;
  ativo: boolean;
  ordem: number;
  criado_em: string;
}

const CATEGORIAS_DEFAULT = [
  { nome: 'Roupas', cor_bg: 'bg-sky-100', cor_text: 'text-sky-700' },
  { nome: 'Cama/Banho', cor_bg: 'bg-violet-100', cor_text: 'text-violet-700' },
  { nome: 'Tapetes', cor_bg: 'bg-amber-100', cor_text: 'text-amber-700' },
  { nome: 'Cortinas', cor_bg: 'bg-emerald-100', cor_text: 'text-emerald-700' },
  { nome: 'Couro', cor_bg: 'bg-orange-100', cor_text: 'text-orange-700' },
  { nome: 'Outros', cor_bg: 'bg-gray-100', cor_text: 'text-gray-700' },
];

const COR_OPTIONS = [
  { value: 'bg-sky-100 text-sky-700', label: 'Azul', preview: 'bg-sky-100 text-sky-700' },
  { value: 'bg-violet-100 text-violet-700', label: 'Violeta', preview: 'bg-violet-100 text-violet-700' },
  { value: 'bg-amber-100 text-amber-700', label: 'Amarelo', preview: 'bg-amber-100 text-amber-700' },
  { value: 'bg-emerald-100 text-emerald-700', label: 'Verde', preview: 'bg-emerald-100 text-emerald-700' },
  { value: 'bg-orange-100 text-orange-700', label: 'Laranja', preview: 'bg-orange-100 text-orange-700' },
  { value: 'bg-red-100 text-red-700', label: 'Vermelho', preview: 'bg-red-100 text-red-700' },
  { value: 'bg-pink-100 text-pink-700', label: 'Rosa', preview: 'bg-pink-100 text-pink-700' },
  { value: 'bg-cyan-100 text-cyan-700', label: 'Ciano', preview: 'bg-cyan-100 text-cyan-700' },
  { value: 'bg-lime-100 text-lime-700', label: 'Lima', preview: 'bg-lime-100 text-lime-700' },
  { value: 'bg-teal-100 text-teal-700', label: 'Teal', preview: 'bg-teal-100 text-teal-700' },
  { value: 'bg-gray-100 text-gray-700', label: 'Cinza', preview: 'bg-gray-100 text-gray-700' },
];

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
  const [itensCategoriaFilter, setItensCategoriaFilter] = useState<string>('todos');
  const [itensStatusFilter, setItensStatusFilter] = useState<string>('todos');
  const [itensSortField, setItensSortField] = useState<'descricao' | 'categoria' | 'criado_em'>('criado_em');
  const [itensSortDir, setItensSortDir] = useState<'asc' | 'desc'>('desc');

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
  const [precosServicoStatus, setPrecosServicoStatus] = useState<'todos' | 'ativo' | 'inativo'>('ativo');
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [savingPriceKey, setSavingPriceKey] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Drag-and-drop column order for price matrix — persisted in Supabase (shared across all workstations)
  const [servicoOrdem, setServicoOrdem] = useState<string[]>([]);
  const [draggedServicoId, setDraggedServicoId] = useState<string | null>(null);

  // Sort state for price matrix
  const [matrixSortField, setMatrixSortField] = useState<'descricao' | 'categoria' | 'criado_em'>('descricao');
  const [matrixSortDirection, setMatrixSortDirection] = useState<'asc' | 'desc'>('asc');

  // --- Categorias ---
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([]);
  const [categoriasLoading, setCategoriasLoading] = useState(false);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaCatalogo | null>(null);
  const [categoriaSaving, setCategoriaSaving] = useState(false);
  const [categoriaNome, setCategoriaNome] = useState('');
  const [categoriaCor, setCategoriaCor] = useState('bg-gray-100 text-gray-700');

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'item' | 'servico' | 'categoria';
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
      loadCategorias();
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
        .order('ordem', { ascending: true });

      if (error) throw error;
      const loaded = (data || []).map((row: any) => ({
        id: row.id,
        nome: row.nome || '',
        descricao: row.descricao || null,
        preco: parseFloat(row.preco) || 0,
        ativo: row.ativo ?? true,
        criado_em: row.criado_em || '',
      }));
      setServicos(loaded);
      // Build servicoOrdem from the DB order (sorted by 'ordem' column)
      setServicoOrdem(loaded.map(s => s.id));
    } catch (err: any) {
      console.error('Erro ao carregar serviços do catálogo:', err);
      toast({ variant: 'destructive', title: 'Erro ao carregar serviços', description: err.message });
    } finally {
      setServicosLoading(false);
    }
  };

  const loadCategorias = async () => {
    setCategoriasLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('lavanderia_categorias')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ordem', { ascending: true });

      if (error) {
 // Se a tabela ainda não existe (migration não executada), usa categorias padrão
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          const defaults = CATEGORIAS_DEFAULT.map((c, i) => ({
            id: `default-${c.nome}-${i}`,
            nome: c.nome,
            cor_bg: c.cor_bg,
            cor_text: c.cor_text,
            ativo: true,
            ordem: i,
            criado_em: '',
          }));
          setCategorias(defaults);
          return;
        }
        throw error;
      }

      const loaded = (data || []).map((row: any) => ({
        id: row.id,
        nome: row.nome || '',
        cor_bg: row.cor_bg || 'bg-gray-100',
        cor_text: row.cor_text || 'text-gray-700',
        ativo: row.ativo ?? true,
        ordem: row.ordem ?? 0,
        criado_em: row.criado_em || '',
      }));

      // Auto-seed categorias padrão se a tabela estiver vazia
      if (loaded.length === 0) {
        const seeded = await seedCategoriasPadrao();
        setCategorias(seeded);
      } else {
        setCategorias(loaded);
      }
    } catch (err: any) {
      console.error('Erro ao carregar categorias:', err);
      const defaults = CATEGORIAS_DEFAULT.map((c, i) => ({
        id: `default-${c.nome}-${i}`,
        nome: c.nome,
        cor_bg: c.cor_bg,
        cor_text: c.cor_text,
        ativo: true,
        ordem: i,
        criado_em: '',
      }));
      setCategorias(defaults);
    } finally {
      setCategoriasLoading(false);
    }
  };

  const seedCategoriasPadrao = async (): Promise<CategoriaCatalogo[]> => {
    try {
      const supabase = getSupabase();
      const rows = CATEGORIAS_DEFAULT.map((c, i) => ({
        empresa_id: empresaId,
        nome: c.nome,
        cor_bg: c.cor_bg,
        cor_text: c.cor_text,
        ativo: true,
        ordem: i,
      }));
      const { error } = await supabase.from('lavanderia_categorias').insert(rows);
      if (error) throw error;
      return rows.map((c, i) => ({
        id: `seed-${i}`,
        nome: c.nome,
        cor_bg: c.cor_bg,
        cor_text: c.cor_text,
        ativo: true,
        ordem: i,
        criado_em: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Erro ao seed categorias padrão:', err);
      return CATEGORIAS_DEFAULT.map((c, i) => ({
        id: `default-${c.nome}-${i}`,
        nome: c.nome,
        cor_bg: c.cor_bg,
        cor_text: c.cor_text,
        ativo: true,
        ordem: i,
        criado_em: '',
      }));
    }
  };

  // Derivar CATEGORIAS e CATEGORIA_ICONS do estado dinâmico
  const CATEGORIAS = useMemo(() =>
    categorias.filter(c => c.ativo).map(c => ({ value: c.nome, label: c.nome })),
    [categorias]
  );

  const CATEGORIA_ICONS = useMemo(() => {
    const map: Record<string, string> = {};
    categorias.forEach(c => {
      map[c.nome] = `${c.cor_bg} ${c.cor_text}`;
    });
    // Fallback
    map[''] = 'bg-gray-100 text-gray-700';
    return map;
  }, [categorias]);

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

  // Initialize servicoOrdem when services load
  useEffect(() => {
    if (servicos.length > 0 && servicoOrdem.length === 0) {
      setServicoOrdem(servicos.map(s => s.id));
    }
  }, [servicos]);

  // ============================================================
  // Filters
  // ============================================================
  const itensFiltrados = useMemo(() => {
    let result = [...itens];
    // Status filter
    if (itensStatusFilter === 'ativo') result = result.filter(i => i.ativo);
    else if (itensStatusFilter === 'inativo') result = result.filter(i => !i.ativo);
    // Category filter
    if (itensCategoriaFilter !== 'todos') result = result.filter(i => i.categoria === itensCategoriaFilter);
    // Text search
    if (itensSearch.trim()) {
      const term = itensSearch.toLowerCase();
      result = result.filter(item =>
        item.descricao.toLowerCase().includes(term) ||
        item.categoria.toLowerCase().includes(term)
      );
    }
    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      if (itensSortField === 'descricao') cmp = a.descricao.localeCompare(b.descricao);
      else if (itensSortField === 'categoria') cmp = a.categoria.localeCompare(b.categoria);
      else cmp = (a.criado_em || '').localeCompare(b.criado_em || '');
      return itensSortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [itens, itensSearch, itensCategoriaFilter, itensStatusFilter, itensSortField, itensSortDir]);

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

  // Services for price matrix - filtered by status and ordered
  const matrixServicos = useMemo(() => {
    let filtered = servicos;
    if (precosServicoStatus === 'ativo') filtered = filtered.filter(s => s.ativo);
    else if (precosServicoStatus === 'inativo') filtered = filtered.filter(s => !s.ativo);
    // Apply drag-drop order
    const orderMap = new Map(servicoOrdem.map((id, idx) => [id, idx]));
    return [...filtered].sort((a, b) => {
      const aIdx = orderMap.get(a.id) ?? 999;
      const bIdx = orderMap.get(b.id) ?? 999;
      return aIdx - bIdx;
    });
  }, [servicos, precosServicoStatus, servicoOrdem]);

  // Active items and services for the price matrix
  const itensAtivos = useMemo(() => itens.filter(i => i.ativo), [itens]);
  const servicosAtivos = useMemo(() => servicos.filter(s => s.ativo), [servicos]);

  // Filter and sort items for the matrix based on search and sort state
  const matrixItens = useMemo(() => {
    let items = itensAtivos;

    // Apply search filter
    if (precosSearch.trim()) {
      const term = precosSearch.toLowerCase();
      items = items.filter(item =>
        item.descricao.toLowerCase().includes(term) ||
        item.categoria.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    return [...items].sort((a, b) => {
      let comparison = 0;
      switch (matrixSortField) {
        case 'descricao':
          comparison = a.descricao.localeCompare(b.descricao, 'pt-BR');
          break;
        case 'categoria':
          comparison = a.categoria.localeCompare(b.categoria, 'pt-BR');
          break;
        case 'criado_em':
          comparison = new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
          break;
      }
      return matrixSortDirection === 'asc' ? comparison : -comparison;
    });
  }, [itensAtivos, precosSearch, matrixSortField, matrixSortDirection]);

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
        .update({ ativo: false })
        .eq('id', deleteDialog.id);
      if (error) throw error;
      toast({ title: 'Item inativado!', description: `"${deleteDialog.nome}" foi inativado do catálogo.` });
      setDeleteDialog({ open: false, type: 'item', id: '', nome: '' });
      loadItens();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao inativar item', description: err.message });
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

    const precoNum = servicoPreco.trim() === '' ? 0 : parseFloat(servicoPreco.replace(',', '.'));
    if (isNaN(precoNum) || precoNum < 0) {
      toast({ variant: 'destructive', title: 'Valor inválido', description: 'Informe um preço válido (zero ou positivo).' });
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
        .update({ ativo: false })
        .eq('id', deleteDialog.id);
      if (error) throw error;
      toast({ title: 'Serviço inativado!', description: `"${deleteDialog.nome}" foi inativado do catálogo.` });
      setDeleteDialog({ open: false, type: 'servico', id: '', nome: '' });
      loadServicos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao inativar serviço', description: err.message });
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
  // Drag & Drop handlers for matrix columns
  // ============================================================
  const handleDragStart = useCallback((e: React.DragEvent, servicoId: string) => {
    setDraggedServicoId(servicoId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', servicoId);
    (e.target as HTMLElement).style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedServicoId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetServicoId: string) => {
    e.preventDefault();
    const sourceId = draggedServicoId;
    if (!sourceId || sourceId === targetServicoId) return;

    const prevOrdem = [...servicoOrdem];
    const fromIdx = prevOrdem.indexOf(sourceId);
    const toIdx = prevOrdem.indexOf(targetServicoId);
    if (fromIdx === -1 || toIdx === -1) return;

    // Reorder locally
    prevOrdem.splice(fromIdx, 1);
    prevOrdem.splice(toIdx, 0, sourceId);
    setServicoOrdem(prevOrdem);
    setDraggedServicoId(null);

    // Persist to Supabase — update 'ordem' column for reordered services
    (async () => {
      try {
        const supabase = getSupabase();
        const updates = prevOrdem.map((id, idx) => ({ id, ordem: idx }));
        // Batch update each service ordem
        await Promise.all(updates.map(u =>
          supabase.from('lavanderia_servicos_catalogo').update({ ordem: u.ordem }).eq('id', u.id)
        ));
      } catch (err) {
        console.error('Erro ao salvar ordem dos serviços:', err);
 }
    })();
  }, [draggedServicoId, servicoOrdem]);

  // Sort handler for items table
  const handleItensSort = useCallback((field: 'descricao' | 'categoria' | 'criado_em') => {
    setItensSortField(prev => {
      if (prev === field) {
        setItensSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return field;
      }
      setItensSortDir('asc');
      return field;
    });
  }, []);

  const getSortIcon = (field: string) => {
    if (itensSortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return itensSortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-sky-600" />
      : <ArrowDown className="h-3 w-3 ml-1 text-sky-600" />;
  };

  // ============================================================
  // Categorias CRUD
  // ============================================================
  const openNewCategoriaDialog = () => {
    setEditingCategoria(null);
    setCategoriaNome('');
    setCategoriaCor('bg-gray-100 text-gray-700');
    setCategoriaDialogOpen(true);
  };

  const openEditCategoriaDialog = (cat: CategoriaCatalogo) => {
    setEditingCategoria(cat);
    setCategoriaNome(cat.nome);
    setCategoriaCor(`${cat.cor_bg} ${cat.cor_text}`);
    setCategoriaDialogOpen(true);
  };

  const handleSaveCategoria = async () => {
    if (!categoriaNome.trim()) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Informe o nome da categoria.' });
      return;
    }
    // Validar duplicidade
    const nomeTrim = categoriaNome.trim();
    const duplicata = categorias.find(c =>
      c.nome.toLowerCase() === nomeTrim.toLowerCase() && c.id !== editingCategoria?.id
    );
    if (duplicata) {
      toast({ variant: 'destructive', title: 'Categoria duplicada', description: `Já existe uma categoria com o nome "${nomeTrim}".` });
      return;
    }

    setCategoriaSaving(true);
    try {
      const supabase = getSupabase();
      const [corBg, corText] = categoriaCor.split(' ');

      // Se o id começa com 'default-', a tabela ainda não existe
      if (editingCategoria?.id?.startsWith('default-') || editingCategoria?.id?.startsWith('seed-')) {
        toast({ title: 'Atenção', description: 'Execute a migration SQL para habilitar o cadastro completo de categorias.' });
        setCategoriaSaving(false);
        return;
      }

      if (editingCategoria) {
        const { error } = await supabase
          .from('lavanderia_categorias')
          .update({
            nome: nomeTrim,
            cor_bg: corBg,
            cor_text: corText,
          })
          .eq('id', editingCategoria.id);
        if (error) throw error;
        toast({ title: 'Categoria atualizada!', description: `"${nomeTrim}" foi atualizada com sucesso.` });
      } else {
        const { error } = await supabase
          .from('lavanderia_categorias')
          .insert({
            empresa_id: empresaId,
            nome: nomeTrim,
            cor_bg: corBg,
            cor_text: corText,
            ativo: true,
            ordem: categorias.length,
          });
        if (error) throw error;
        toast({ title: 'Categoria criada!', description: `"${nomeTrim}" foi adicionada ao catálogo.` });
      }

      setCategoriaDialogOpen(false);
      loadCategorias();
    } catch (err: any) {
      if (err.message?.includes('does not exist') || err.code === '42P01') {
        toast({ variant: 'destructive', title: 'Tabela não encontrada', description: 'Execute a migration SQL "add_lavanderia_categorias" no Supabase para habilitar esta funcionalidade.' });
      } else {
        console.error('Erro ao salvar categoria:', err);
        toast({ variant: 'destructive', title: 'Erro ao salvar categoria', description: err.message });
      }
    } finally {
      setCategoriaSaving(false);
    }
  };

  const handleDeleteCategoria = async () => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('lavanderia_categorias')
        .update({ ativo: false })
        .eq('id', deleteDialog.id);
      if (error) throw error;
      toast({ title: 'Categoria inativada!', description: `"${deleteDialog.nome}" foi inativada.` });
      setDeleteDialog({ open: false, type: 'item', id: '', nome: '' });
      loadCategorias();
    } catch (err: any) {
      console.error('Erro ao inativar categoria:', err);
      toast({ variant: 'destructive', title: 'Erro ao inativar categoria', description: err.message });
    }
  };

  const handleToggleCategoriaAtivo = async (cat: CategoriaCatalogo) => {
    if (cat.id?.startsWith('default-') || cat.id?.startsWith('seed-')) {
      toast({ title: 'Atenção', description: 'Execute a migration SQL para habilitar esta funcionalidade.' });
      return;
    }
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('lavanderia_categorias')
        .update({ ativo: !cat.ativo })
        .eq('id', cat.id);
      if (error) throw error;
      loadCategorias();
    } catch (err: any) {
      console.error('Erro ao alterar categoria:', err);
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
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
            <div className="flex items-center gap-3">
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
              <Button
                variant="outline"
                size="sm"
                className="gap-2 flex-shrink-0"
                onClick={openNewCategoriaDialog}
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Categorias</span>
              </Button>
            </div>

            {/* ============================================================ */}
            {/* TAB 1: Itens do Catálogo */}
            {/* ============================================================ */}
            <TabsContent value="itens" className="space-y-4">
              {/* Search + Filters + Create */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="relative flex-1 w-full md:max-w-[300px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por descrição..."
                        value={itensSearch}
                        onChange={(e) => setItensSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={itensCategoriaFilter} onValueChange={setItensCategoriaFilter}>
                      <SelectTrigger className="w-full md:w-[160px]">
                        <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas Categorias</SelectItem>
                        {CATEGORIAS.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={itensStatusFilter} onValueChange={setItensStatusFilter}>
                      <SelectTrigger className="w-full md:w-[130px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="ativo">Ativos</SelectItem>
                        <SelectItem value="inativo">Inativos</SelectItem>
                      </SelectContent>
                    </Select>
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
                            <TableHead>
                              <Button variant="ghost" size="sm" className="h-7 px-2 -ml-2 font-semibold text-xs" onClick={() => handleItensSort('descricao')}>
                                Descrição {getSortIcon('descricao')}
                              </Button>
                            </TableHead>
                            <TableHead className="hidden sm:table-cell">
                              <Button variant="ghost" size="sm" className="h-7 px-2 -ml-2 font-semibold text-xs" onClick={() => handleItensSort('categoria')}>
                                Categoria {getSortIcon('categoria')}
                              </Button>
                            </TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="hidden md:table-cell">
                              <Button variant="ghost" size="sm" className="h-7 px-2 -ml-2 font-semibold text-xs" onClick={() => handleItensSort('criado_em')}>
                                Criado em {getSortIcon('criado_em')}
                              </Button>
                            </TableHead>
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

              {/* Search filter + Status filter for items — always visible */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    <div className="relative flex-1 w-full md:max-w-[300px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar item..."
                        value={precosSearch}
                        onChange={(e) => setPrecosSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={precosServicoStatus} onValueChange={(v: any) => setPrecosServicoStatus(v)}>
                      <SelectTrigger className="w-full md:w-[140px]">
                        <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
                        <SelectValue placeholder="Serviços" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Serviços Ativos</SelectItem>
                        <SelectItem value="inativo">Serviços Inativos</SelectItem>
                        <SelectItem value="todos">Todos Serviços</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {precosLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </CardContent>
                </Card>
              ) : itensAtivos.length === 0 || matrixServicos.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <PackageSearch className="h-12 w-12 mb-4 opacity-30" />
                    <p className="text-lg font-medium">Dados insuficientes para montar a tabela</p>
                    <p className="text-sm mt-1">
                      {itensAtivos.length === 0 && matrixServicos.length === 0
                        ? 'Você precisa cadastrar itens e serviços antes de definir preços. Use as abas "Itens do Catálogo" e "Serviços e Preços" para criar.'
                        : itensAtivos.length === 0
                          ? 'Nenhum item ativo encontrado. Cadastre itens na aba "Itens do Catálogo" primeiro.'
                          : 'Nenhum serviço encontrado com o filtro selecionado.'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Price Matrix Table */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-violet-600" />
                        Matriz de Preços
                      </CardTitle>
                      <CardDescription>
                        {matrixItens.length} item(ns) × {matrixServicos.length} serviço(s) — {totalPrecosCadastrados} preço(s) cadastrado(s)
                        {precosSearch && ` para "${precosSearch}"`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="sticky left-0 bg-muted/50 z-10 text-left px-4 py-3 font-semibold whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    if (matrixSortField === 'descricao') {
                                      setMatrixSortDirection(matrixSortDirection === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setMatrixSortField('descricao');
                                      setMatrixSortDirection('asc');
                                    }
                                  }}
                                  className={`flex items-center gap-1.5 hover:text-violet-600 transition-colors ${
                                    matrixSortField === 'descricao' ? 'text-violet-600' : 'text-muted-foreground'
                                  }`}
                                >
                                  Item
                                  {matrixSortField === 'descricao' ? (
                                    matrixSortDirection === 'asc' ? (
                                      <ArrowUp className="h-3.5 w-3.5" />
                                    ) : (
                                      <ArrowDown className="h-3.5 w-3.5" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    if (matrixSortField === 'categoria') {
                                      setMatrixSortDirection(matrixSortDirection === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setMatrixSortField('categoria');
                                      setMatrixSortDirection('asc');
                                    }
                                  }}
                                  className={`flex items-center gap-1 mt-0.5 text-[10px] hover:text-violet-600 transition-colors ${
                                    matrixSortField === 'categoria' ? 'text-violet-600' : 'text-muted-foreground/60'
                                  }`}
                                >
                                  {matrixSortField === 'categoria' ? (
                                    matrixSortDirection === 'asc' ? (
                                      <ArrowUp className="h-2.5 w-2.5" />
                                    ) : (
                                      <ArrowDown className="h-2.5 w-2.5" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="h-2.5 w-2.5 opacity-40" />
                                  )}
                                  Categoria
                                </button>
                              </th>
                              {matrixServicos.map((servico) => (
                                <th
                                  key={servico.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, servico.id)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, servico.id)}
                                  className={`text-center px-3 py-3 font-semibold whitespace-nowrap min-w-[120px] cursor-grab active:cursor-grabbing select-none transition-colors ${
                                    draggedServicoId === servico.id
                                      ? 'bg-violet-100 text-violet-700'
                                      : servico.ativo
                                        ? 'text-muted-foreground'
                                        : 'text-red-400 bg-red-50/50'
                                  } ${draggedServicoId && draggedServicoId !== servico.id ? 'border-l-2 border-dashed border-violet-300' : ''}`}
                                >
                                  <span className="inline-flex items-center gap-1">
                                    <GripVertical className="h-3 w-3 opacity-40" />
                                    <span className="text-xs font-medium">{servico.nome}</span>
                                    {!servico.ativo && <span className="text-[9px] text-red-400 ml-1">(inativo)</span>}
                                  </span>
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
                                {matrixServicos.map((servico) => {
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
        {/* CATEGORIAS MANAGE DIALOG */}
        {/* ============================================================ */}
        <Dialog
          open={categoriaDialogOpen}
          onOpenChange={(open) => {
            setCategoriaDialogOpen(open);
            if (!open) setEditingCategoria(null);
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-sky-600" />
                {editingCategoria ? 'Editar Categoria' : 'Gerenciar Categorias'}
              </DialogTitle>
              <DialogDescription>
                {editingCategoria
                  ? 'Altere os dados da categoria abaixo.'
                  : 'Adicione novas categorias ou edite as existentes. As categorias são usadas para classificar os itens do catálogo de lavanderia.'}
              </DialogDescription>
            </DialogHeader>

            {/* Form: create/edit */}
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="categoria-nome">Nome da Categoria *</Label>
                <Input
                  id="categoria-nome"
                  placeholder="Ex: Roupas, Cama/Banho, Tapetes..."
                  value={categoriaNome}
                  onChange={(e) => setCategoriaNome(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor da Categoria</Label>
                <div className="flex flex-wrap gap-2">
                  {COR_OPTIONS.map((cor) => (
                    <button
                      key={cor.value}
                      type="button"
                      onClick={() => setCategoriaCor(cor.value)}
                      className={`h-8 px-3 rounded-full text-xs font-medium transition-all border-2 ${cor.preview} ${
                        categoriaCor === cor.value
                          ? 'border-sky-500 ring-2 ring-sky-200 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                    >
                      {cor.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Existing categories list */}
            {!editingCategoria && categorias.length > 0 && (
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                {categorias
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((cat) => {
                    const fullColor = `${cat.cor_bg} ${cat.cor_text}`;
                    const isDefault = cat.id?.startsWith('default-') || cat.id?.startsWith('seed-');
                    return (
                      <div key={cat.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className={`text-xs font-medium ${fullColor}`}>
                            {cat.nome}
                          </Badge>
                          {!cat.ativo && (
                            <span className="text-xs text-muted-foreground">Inativa</span>
                          )}
                          {isDefault && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">padrão</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={cat.ativo}
                            onCheckedChange={() => handleToggleCategoriaAtivo(cat)}
                            className="scale-75"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditCategoriaDialog(cat)}
                            title="Editar"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                type: 'categoria',
                                id: cat.id,
                                nome: cat.nome,
                              })
                            }
                            title="Excluir"
                            disabled={isDefault}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCategoriaDialogOpen(false);
                  setEditingCategoria(null);
                }}
                disabled={categoriaSaving}
              >
                Fechar
              </Button>
              <Button
                onClick={handleSaveCategoria}
                disabled={categoriaSaving || !categoriaNome.trim()}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {categoriaSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingCategoria ? (
                  'Atualizar Categoria'
                ) : (
                  'Criar Categoria'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <Label htmlFor="servico-preco">Preço (R$)</Label>
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
                  } else if (deleteDialog.type === 'categoria') {
                    handleDeleteCategoria();
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
