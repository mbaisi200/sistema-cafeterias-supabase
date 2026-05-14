'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase';
import { registrarLog } from '@/hooks/useSupabase';
import { exportToPDF, formatCurrencyPDF, formatDatePDF } from '@/lib/export-pdf';
import {
  Plus,
  ChevronLeft,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  Clock,
  PlayCircle,
  XCircle,
  User,
  Printer,
  WashingMachine,
  Shirt,
  Droplets,
  Wind,
  Sparkles,
  PackageCheck,
  CalendarDays,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  BookOpen,
  FileDown,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================
interface ItemLavanderia {
  id?: string;
  quantidade: number;
  descricaoPeca: string;
  tipoServico: string;
  observacoes: string;
  valorUnitario: number;
  total: number;
  itemCatalogoId?: string;
}

interface OSLavanderia {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  clienteEndereco: string;
  dataEntrada: string;
  horaEntrada: string;
  dataPrevisao: string;
  horaPrevisao: string;
  itens: ItemLavanderia[];
  totalPecas: number;
  pesoKg: number;
  valorTotal: number;
  formaPagamento: string;
  status: string;
  responsavel: string;
  vendedorId: string;
  vendedorNome: string;
  observacoes: string;
  ativo: boolean;
  criadoEm: string;
  criadoPorNome: string;
  dataConclusao: string;
  vendaId: string;
}

const TIPOS_SERVICO = [
  { value: 'lavar', label: 'Lavar', icon: Droplets, color: 'text-blue-500' },
  { value: 'secar', label: 'Secar', icon: Wind, color: 'text-gray-500' },
  { value: 'passar', label: 'Passar', icon: Sparkles, color: 'text-amber-500' },
  { value: 'lavar_passar', label: 'Lavar/Passar', icon: Shirt, color: 'text-indigo-500' },
  { value: 'lavar_secar', label: 'Lavar/Secar', icon: Droplets, color: 'text-cyan-500' },
  { value: 'seco', label: 'Lavagem a Seco', icon: PackageCheck, color: 'text-emerald-500' },
];

const STATUS_OPTIONS = [
  { value: 'recebida', label: 'Recebida', color: 'bg-amber-500 text-white border-0', icon: PackageCheck },
  { value: 'em_lavagem', label: 'Em Lavagem', color: 'bg-blue-500 text-white border-0', icon: WashingMachine },
  { value: 'pronta', label: 'Pronta para Retirada', color: 'bg-green-500 text-white border-0', icon: CheckCircle },
  { value: 'entregue', label: 'Entregue', color: 'bg-emerald-600 text-white border-0', icon: PackageCheck },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-red-500 text-white border-0', icon: XCircle },
];

const FORMAS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro (À vista)' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'entrega', label: 'Pago na Entrega' },
];

// ============================================================
// Component
// ============================================================
export default function OSLavanderiaPage() {
  const { user, empresaId } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [ordens, setOrdens] = useState<OSLavanderia[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [detailOS, setDetailOS] = useState<OSLavanderia | null>(null);
  const [editingOS, setEditingOS] = useState<OSLavanderia | null>(null);
  const [saving, setSaving] = useState(false);
  const [printOS, setPrintOS] = useState<OSLavanderia | null>(null);

  // Form state
  const [formNumero, setFormNumero] = useState(1001);
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEndereco, setClienteEndereco] = useState('');
  const [openClienteSearch, setOpenClienteSearch] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [formDataEntrada, setFormDataEntrada] = useState('');
  const [formHoraEntrada, setFormHoraEntrada] = useState('');
  const [formDataPrevisao, setFormDataPrevisao] = useState('');
  const [formHoraPrevisao, setFormHoraPrevisao] = useState('');
  const [itens, setItens] = useState<ItemLavanderia[]>([]);
  const [pesoKg, setPesoKg] = useState(0);
  const [formValorTotal, setFormValorTotal] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [formStatus, setFormStatus] = useState('recebida');
  const [formVendedorId, setFormVendedorId] = useState('');
  const [formVendedorNome, setFormVendedorNome] = useState('');
  const [openVendedorSearch, setOpenVendedorSearch] = useState(false);
  const [vendedorSearch, setVendedorSearch] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');

  // Data lists
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [catalogoItens, setCatalogoItens] = useState<any[]>([]);
  const [catalogoServicos, setCatalogoServicos] = useState<any[]>([]);
  const [empresaData, setEmpresaData] = useState<any>(null);
  const [precosMap, setPrecosMap] = useState<Record<string, Record<string, number>>>({});

  // Search states for item/servico dropdowns
  const [itemSearch, setItemSearch] = useState('');
  const [servicoSearch, setServicoSearch] = useState('');
  const [openItemPopoverIdx, setOpenItemPopoverIdx] = useState<number | null>(null);
  const [openServicoPopoverIdx, setOpenServicoPopoverIdx] = useState<number | null>(null);

  // Load data
  useEffect(() => {
    if (empresaId) {
      loadOrdens();
      loadClientes();
      loadVendedores();
      loadCatalogoItens();
      loadCatalogoServicos();
      loadPrecos();
      loadEmpresaData();
      const now = new Date();
      setFormDataEntrada(now.toISOString().split('T')[0]);
      setFormHoraEntrada(now.toTimeString().slice(0, 5));
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 2);
      setFormDataPrevisao(tomorrow.toISOString().split('T')[0]);
      setFormHoraPrevisao('14:00');
    }
  }, [empresaId]);

  const getSupabase = () => getSupabaseClient();

  // ============================================================
  // Data Loading
  // ============================================================
  const loadOrdens = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const parsed = (data || [])
        .filter((o: any) => (o.observacoes || '').startsWith('[LAVANDERIA]'))
        .map((o: any) => {
          let metadata: any = {};
          let obsText = o.observacoes || '';
          if (obsText.startsWith('[LAVANDERIA]')) {
            try {
              const jsonStr = obsText.replace('[LAVANDERIA]', '').trim();
              metadata = JSON.parse(jsonStr);
            } catch { /* ignore */ }
          }

          let parsedItens: ItemLavanderia[] = [];
          try {
            const raw = o.servicos;
            const rawParsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
            parsedItens = rawParsed.map((parsedItem: any) => ({
              ...parsedItem,
              descricaoPeca: parsedItem.descricaoPeca || parsedItem.descricao || '',
              tipoServico: parsedItem.tipoServico || '',
              itemCatalogoId: parsedItem.itemCatalogoId || '',
            }));
          } catch { /* ignore */ }

          return {
            id: o.id,
            numero: o.numero || 0,
            clienteId: o.cliente_id || '',
            clienteNome: o.cliente_nome || '',
            clienteTelefone: metadata.clienteTelefone || '',
            clienteEndereco: metadata.clienteEndereco || '',
            dataEntrada: metadata.dataEntrada || (o.data_abertura || '').split('T')[0] || '',
            horaEntrada: metadata.horaEntrada || '',
            dataPrevisao: metadata.dataPrevisao || (o.data_previsao || '') || '',
            horaPrevisao: metadata.horaPrevisao || '',
            itens: parsedItens,
            totalPecas: parsedItens.reduce((acc: number, i: any) => acc + (i.quantidade || 0), 0),
            pesoKg: metadata.pesoKg || 0,
            valorTotal: parseFloat(o.valor_total) || 0,
            formaPagamento: metadata.formaPagamento || '',
            status: mapStatus(o.status),
            responsavel: metadata.vendedorNome || metadata.responsavel || '',
            vendedorId: metadata.vendedorId || '',
            vendedorNome: metadata.vendedorNome || metadata.responsavel || '',
            observacoes: metadata.observacoesTexto || '',
            ativo: o.ativo,
            criadoEm: o.criado_em || '',
            criadoPorNome: o.criado_por_nome || '',
            dataConclusao: o.data_conclusao || '',
            vendaId: metadata.vendaId || '',
          };
        });

      setOrdens(parsed);
      const allData = data || [];
      const maxNum = allData.reduce((max: number, o: any) => Math.max(max, o.numero || 0), 0);
      setFormNumero(maxNum + 1);
    } catch (err: any) {
      console.error('Erro ao carregar OS de lavanderia:', err);
      setOrdens([]);
    } finally {
      setLoading(false);
    }
  };

  const mapStatus = (dbStatus: string): string => {
    const map: Record<string, string> = {
      aberta: 'recebida',
      em_andamento: 'em_lavagem',
      concluida: 'pronta',
      aprovada: 'entregue',
      cancelada: 'cancelada',
    };
    return map[dbStatus] || dbStatus;
  };

  const unmapStatus = (uiStatus: string): string => {
    const map: Record<string, string> = {
      recebida: 'aberta',
      em_lavagem: 'em_andamento',
      pronta: 'concluida',
      entregue: 'aprovada',
      cancelada: 'cancelada',
    };
    return map[uiStatus] || uiStatus;
  };

  const loadClientes = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_razao_social, nome_fantasia, cnpj_cpf, tipo_pessoa, telefone, celular, email, logradouro, numero, complemento, bairro, municipio, uf, cep')
        .eq('empresa_id', empresaId)
        .order('nome_razao_social');
      if (error) {
        console.error('Erro ao carregar clientes:', error.message);
      }
      setClientes(data || []);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  const loadVendedores = async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('vendedores')
        .select('id, nome, email, telefone')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      setVendedores(data || []);
    } catch { /* ignore */ }
  };

  const loadCatalogoItens = async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('lavanderia_itens_catalogo')
        .select('id, descricao, categoria, ativo')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('descricao');
      setCatalogoItens(data || []);
    } catch { /* ignore */ }
  };

  const loadCatalogoServicos = async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('lavanderia_servicos_catalogo')
        .select('id, nome, descricao, preco, ativo')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('nome');
      setCatalogoServicos(data || []);
    } catch { /* ignore */ }
  };

  const loadPrecos = async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('lavanderia_precos')
        .select('item_id, servico_id, preco')
        .eq('empresa_id', empresaId);

      const map: Record<string, Record<string, number>> = {};
      (data || []).forEach((p: any) => {
        if (!map[p.item_id]) map[p.item_id] = {};
        map[p.item_id][p.servico_id] = parseFloat(p.preco) || 0;
      });
      setPrecosMap(map);
    } catch { /* ignore */ }
  };

  const lookupPreco = (itemCatalogoId: string | undefined, servicoId: string): number => {
    if (itemCatalogoId && precosMap[itemCatalogoId]?.[servicoId]) {
      return precosMap[itemCatalogoId][servicoId];
    }
    return -1; // -1 means no specific price found
  };

  const loadEmpresaData = async () => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('empresas')
        .select('nome, nome_marca, cnpj, telefone, email, logradouro, numero, complemento, bairro, cidade, estado, cep, logo_url')
        .eq('id', empresaId)
        .single();
      setEmpresaData(data);
    } catch { /* ignore */ }
  };

  // ============================================================
  // Item Management
  // ============================================================
  const adicionarItem = () => {
    setItens([...itens, {
      quantidade: 0,
      descricaoPeca: '',
      tipoServico: 'lavar_passar',
      observacoes: '',
      valorUnitario: 0,
      total: 0,
      itemCatalogoId: '',
    }]);
  };

  const removerItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const atualizarItem = (index: number, campo: string, valor: any) => {
    const novos = [...itens];
    novos[index] = { ...novos[index], [campo]: valor };
    novos[index].total = novos[index].quantidade * novos[index].valorUnitario;
    setItens(novos);
  };

  const totalPecasCalc = itens.reduce((acc, item) => acc + item.quantidade, 0);
  const totalItensCalc = itens.reduce((acc, item) => acc + item.total, 0);

  useEffect(() => {
    setFormValorTotal(totalItensCalc);
  }, [totalItensCalc]);

  // ============================================================
  // Filters
  // ============================================================
  const clientesFiltrados = useMemo(() => {
    if (!clienteSearch.trim()) return clientes;
    const term = clienteSearch.toLowerCase();
    return clientes.filter(c =>
      (c.nome_razao_social || '').toLowerCase().includes(term) ||
      (c.nome_fantasia || '').toLowerCase().includes(term) ||
      (c.cnpj_cpf || '').includes(term)
    );
  }, [clientes, clienteSearch]);

  const vendedoresFiltrados = useMemo(() => {
    if (!vendedorSearch.trim()) return vendedores;
    const term = vendedorSearch.toLowerCase();
    return vendedores.filter(v =>
      (v.nome || '').toLowerCase().includes(term) ||
      (v.email || '').toLowerCase().includes(term)
    );
  }, [vendedores, vendedorSearch]);

  const ordensFiltradas = useMemo(() => {
    return ordens.filter(os => {
      const matchSearch = !search ||
        (os.clienteNome || '').toLowerCase().includes(search.toLowerCase()) ||
        String(os.numero).includes(search);
      const matchStatus = statusFilter === 'todos' || os.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [ordens, search, statusFilter]);

  const osRecebidas = ordens.filter(os => os.status === 'recebida');
  const osEmLavagem = ordens.filter(os => os.status === 'em_lavagem');
  const osProntas = ordens.filter(os => os.status === 'pronta');
  const osEntregues = ordens.filter(os => os.status === 'entregue');

  // ============================================================
  // Actions
  // ============================================================
  const handleSaveOS = async () => {
    if (!clienteId || !clienteNome) {
      toast({ variant: 'destructive', title: 'Selecione um cliente' });
      return;
    }
    if (itens.length === 0) {
      toast({ variant: 'destructive', title: 'Adicione ao menos uma peça' });
      return;
    }
    if (!formaPagamento) {
      toast({ variant: 'destructive', title: 'Selecione a forma de pagamento' });
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();
      const valorTotal = parseFloat(String(formValorTotal)) || 0;

      const metadata = JSON.stringify({
        tipo: 'lavanderia',
        clienteTelefone,
        clienteEndereco,
        dataEntrada: formDataEntrada,
        horaEntrada: formHoraEntrada,
        dataPrevisao: formDataPrevisao,
        horaPrevisao: formHoraPrevisao,
        pesoKg,
        formaPagamento,
        vendedorId: formVendedorId,
        vendedorNome: formVendedorNome,
        observacoesTexto: formObservacoes,
      });

      const servicosJSON = JSON.stringify(itens.map(item => ({
        descricao: item.descricaoPeca,
        tipoServico: item.tipoServico,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        total: item.total,
        observacoes: item.observacoes,
        itemCatalogoId: item.itemCatalogoId || '',
      })));

      if (editingOS) {
        const { error } = await supabase
          .from('ordens_servico')
          .update({
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            descricao: `OS Lavanderia - ${clienteNome}`,
            tecnico: formVendedorNome,
            data_previsao: formDataPrevisao || null,
            valor_total: valorTotal,
            valor_servicos: valorTotal,
            status: unmapStatus(formStatus),
            observacoes: `[LAVANDERIA]${metadata}`,
            servicos: servicosJSON,
          })
          .eq('id', editingOS.id);
        if (error) throw error;
        toast({ title: 'OS atualizada!', description: 'A ordem de serviço de lavanderia foi atualizada.' });
      } else {
        const { data: lastNum } = await supabase
          .from('ordens_servico')
          .select('numero')
          .eq('empresa_id', empresaId)
          .order('numero', { ascending: false })
          .limit(1)
          .single();
        const nextNum = (lastNum?.numero || 0) + 1;

        const { error } = await supabase
          .from('ordens_servico')
          .insert({
            empresa_id: empresaId,
            numero: nextNum,
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            descricao: `OS Lavanderia - ${clienteNome}`,
            tecnico: formVendedorNome,
            data_previsao: formDataPrevisao || null,
            valor_total: valorTotal,
            valor_servicos: valorTotal,
            status: unmapStatus(formStatus),
            observacoes: `[LAVANDERIA]${metadata}`,
            servicos: servicosJSON,
            criado_por: user?.id,
            criado_por_nome: user?.nome,
          });
        if (error) throw error;
        toast({ title: 'OS criada!', description: 'Nova ordem de serviço de lavanderia criada com sucesso.' });
      }

      setFormOpen(false);
      resetForm();
      loadOrdens();
    } catch (err: any) {
      console.error('Erro ao salvar OS:', err);
      toast({ variant: 'destructive', title: 'Erro ao salvar OS', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOS = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta OS de lavanderia?\n\n⚠️ Se esta OS estiver faturada, a venda e todos os registros relacionados também serão excluídos.')) return;
    
    try {
      const response = await fetch(`/api/os-lavanderia?id=${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!result.sucesso) {
        throw new Error(result.erro?.mensagem || 'Erro ao excluir OS');
      }

      const foiFaturada = result.vendaId;
      toast({ 
        title: 'OS excluída!', 
        description: foiFaturada 
          ? `OS e venda #${result.vendaId.substring(0, 8)} removidas.`
          : 'Ordem de serviço removida.'
      });
      loadOrdens();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    }
  };

  const handleStatusChange = async (osId: string, novoStatus: string) => {
    try {
      const supabase = getSupabase();
      const updates: any = { status: unmapStatus(novoStatus) };
      if (novoStatus === 'entregue') {
        updates.data_conclusao = new Date().toISOString();
      }
      const { error } = await supabase
        .from('ordens_servico')
        .update(updates)
        .eq('id', osId);
      if (error) throw error;
      toast({ title: 'Status atualizado!', description: `OS movida para: ${STATUS_OPTIONS.find(s => s.value === novoStatus)?.label}` });
      loadOrdens();
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status.' });
    }
  };

  // ============================================================
  // Faturamento
  // ============================================================
  const handleFaturar = async (os: OSLavanderia) => {
    if (!confirm(`Faturar OS #${os.numero} no valor de ${formatCurrency(os.valorTotal)}? Uma venda será criada no PDV Varejo.`)) return;
    setSaving(true);
    try {
      const supabase = getSupabase();
      const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      // STEP 1: Criar venda
      const { data: vendaData, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          empresa_id: empresaId,
          tipo: 'balcao',
          canal: 'lavanderia',
          status: 'fechada',
          total: os.valorTotal,
          desconto: 0,
          forma_pagamento: os.formaPagamento || null,
          cliente_id: os.clienteId || null,
          nome_cliente: os.clienteNome || null,
          telefone_cliente: os.clienteTelefone || null,
          criado_por: user?.id,
          criado_por_nome: user?.nome,
          observacao: `Faturamento OS Lavanderia #${os.numero}`,
          criado_em: new Date().toISOString(),
          fechado_em: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (vendaError) throw vendaError;
      const vendaId = vendaData.id;

      // STEP 2: Inserir itens_venda
      const itensVenda = (os.itens || []).map(item => ({
        empresa_id: empresaId,
        venda_id: vendaId,
        nome: `${item.descricaoPeca} - ${TIPOS_SERVICO.find(t => t.value === item.tipoServico)?.label || item.tipoServico}`,
        quantidade: item.quantidade,
        preco_unitario: item.valorUnitario,
        total: item.total,
        criado_em: new Date().toISOString(),
      }));

      if (itensVenda.length > 0) {
        const { error: itensError } = await supabase.from('itens_venda').insert(itensVenda);
        if (itensError) throw itensError;
      }

      // STEP 3: Inserir pagamento (como PDV Varejo)
      const formaPg = os.formaPagamento || 'dinheiro';
      const { error: pagError } = await supabase
        .from('pagamentos')
        .insert({
          empresa_id: empresaId,
          venda_id: vendaId,
          forma_pagamento: formaPg,
          valor: os.valorTotal,
        });
      if (pagError) throw pagError;

      // STEP 4: Registrar no caixa (se houver caixa aberto)
      try {
        const caixaResp = await fetch('/api/caixa-aberto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empresaId }),
        });
        const caixaResult = await caixaResp.json();
        if (caixaResult.caixa) {
          const cx = caixaResult.caixa;
          await supabase.from('movimentacoes_caixa').insert({
            caixa_id: cx.id,
            empresa_id: empresaId,
            tipo: 'venda',
            valor: os.valorTotal,
            forma_pagamento: formaPg,
            venda_id: vendaId,
            descricao: `OS Lavanderia #${os.numero} - ${os.clienteNome || 'sem cliente'}`,
            usuario_id: user?.id,
            usuario_nome: user?.nome,
            criado_em: new Date().toISOString(),
          });
          await supabase.from('caixas').update({
            valor_atual: (cx.valor_atual || 0) + os.valorTotal,
            total_vendas: (cx.total_vendas || 0) + os.valorTotal,
            total_entradas: (cx.total_entradas || 0) + os.valorTotal,
          }).eq('id', cx.id);
        }
      } catch { /* caixa nao obrigatorio */ }

      // STEP 5: Registrar log
      await registrarLog({
        empresaId: empresaId || '',
        usuarioId: user?.id || '',
        usuarioNome: user?.nome || '',
        acao: 'VENDA_LAVANDERIA_FATURADA',
        detalhes: `OS #${os.numero} - ${os.itens?.length || 0} itens - ${fmt(os.valorTotal)}${os.clienteNome ? ` - ${os.clienteNome}` : ''}`,
        tipo: 'venda',
      });

      // STEP 6: Atualizar OS com vendaId
      let metadata: any = {};
      if (os.observacoes) {
        try {
          const obsText = os.observacoes;
          if (obsText.startsWith('[LAVANDERIA]')) {
            metadata = JSON.parse(obsText.replace('[LAVANDERIA]', '').trim());
          }
        } catch { /* ignore */ }
      }
      metadata.vendaId = vendaId;
      metadata.vendaNumero = vendaId.substring(0, 8);

      await supabase
        .from('ordens_servico')
        .update({
          status: 'aprovada',
          observacoes: `[LAVANDERIA]${JSON.stringify(metadata)}`,
        })
        .eq('id', os.id);

      toast({ title: 'OS faturada!', description: `Venda criada no PDV Varejo para OS #${os.numero}.` });
      loadOrdens();
    } catch (err: any) {
      console.error('Erro ao faturar OS:', err);
      toast({ variant: 'destructive', title: 'Erro ao faturar', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // PDF Export
  // ============================================================
  const handleExportPDF = async () => {
    const empresaNome = empresaData?.nome_marca || empresaData?.nome || '';
    const empresaCNPJ = empresaData?.cnpj || '';
    const empresaTelefone = empresaData?.telefone || '';
    const empresaEmail = empresaData?.email || '';
    const empresaLogo = empresaData?.logo_url || '';

    const enderecoPartes = [empresaData?.logradouro, empresaData?.numero, empresaData?.complemento, empresaData?.bairro, empresaData?.cidade, empresaData?.estado].filter(Boolean);
    const empresaEndereco = enderecoPartes.join(', ');

    await exportToPDF({
      title: 'Ordens de Serviço - Lavanderia',
      subtitle: `${ordensFiltradas.length} OS encontrada(s)`,
      columns: [
        { header: 'Nº OS', accessor: (r: any) => `#${r.numero}`, width: 20 },
        { header: 'Cliente', accessor: (r: any) => r.clienteNome || '-', width: 50 },
        { header: 'Peças', accessor: (r: any) => r.totalPecas, width: 20, align: 'center' as const },
        { header: 'Entrada', accessor: (r: any) => formatDatePDF(r.dataEntrada), width: 25 },
        { header: 'Previsão', accessor: (r: any) => formatDatePDF(r.dataPrevisao), width: 25 },
        { header: 'Valor', accessor: (r: any) => formatCurrencyPDF(r.valorTotal), width: 25, align: 'right' as const, totalize: true },
        { header: 'Status', accessor: (r: any) => STATUS_OPTIONS.find(s => s.value === r.status)?.label || r.status, width: 30 },
      ],
      data: ordensFiltradas,
      filename: `os-lavanderia-${new Date().toISOString().slice(0, 10)}`,
      totals: { label: 'TOTAL GERAL' },
      companyInfo: empresaNome ? {
        name: empresaNome,
        cnpj: empresaCNPJ ? `CNPJ: ${empresaCNPJ}` : undefined,
        phone: empresaTelefone,
        email: empresaEmail,
      } : undefined,
      logo: empresaLogo || undefined,
      footerText: empresaEndereco ? `${empresaNome} — ${empresaEndereco}` : undefined,
    });
  };

  // ============================================================
  // Edit & Reset
  // ============================================================
  const handleEdit = (os: OSLavanderia) => {
    setEditingOS(os);
    setFormNumero(os.numero);
    setClienteId(os.clienteId || '');
    setClienteNome(os.clienteNome || '');
    setClienteTelefone(os.clienteTelefone || '');
    setClienteEndereco(os.clienteEndereco || '');
    setFormDataEntrada(os.dataEntrada || '');
    setFormHoraEntrada(os.horaEntrada || '');
    setFormDataPrevisao(os.dataPrevisao || '');
    setFormHoraPrevisao(os.horaPrevisao || '');
    setItens(os.itens || []);
    setPesoKg(os.pesoKg || 0);
    setFormValorTotal(os.valorTotal || 0);
    setFormaPagamento(os.formaPagamento || '');
    setFormStatus(os.status || 'recebida');
    setFormVendedorId(os.vendedorId || '');
    setFormVendedorNome(os.vendedorNome || os.responsavel || '');
    setFormObservacoes(os.observacoes || '');
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditingOS(null);
    setClienteId('');
    setClienteNome('');
    setClienteTelefone('');
    setClienteEndereco('');
    setOpenClienteSearch(false);
    setClienteSearch('');
    setItens([]);
    setPesoKg(0);
    setFormValorTotal(0);
    setFormaPagamento('');
    setFormStatus('recebida');
    setFormVendedorId('');
    setFormVendedorNome('');
    setOpenVendedorSearch(false);
    setVendedorSearch('');
    setFormObservacoes('');
    const now = new Date();
    setFormDataEntrada(now.toISOString().split('T')[0]);
    setFormHoraEntrada(now.toTimeString().slice(0, 5));
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 2);
    setFormDataPrevisao(tomorrow.toISOString().split('T')[0]);
    setFormHoraPrevisao('14:00');
  };

  // ============================================================
  // Print
  // ============================================================
  const handlePrint = (os?: OSLavanderia) => {
    const targetOS = os || printOS;
    const printWindow = window.open('', '_blank');
    if (!printWindow || !targetOS) return;
    printWindow.document.write(`
      <html><head><title>OS Lavanderia #${targetOS.numero}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 2px 0; font-size: 11px; color: #666; }
        .section { margin-bottom: 15px; }
        .section-title { font-weight: bold; font-size: 13px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
        th { background: #f5f5f5; font-weight: bold; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .info-item { margin-bottom: 4px; }
        .info-label { font-size: 10px; color: #888; }
        .info-value { font-weight: 500; font-size: 12px; }
        .total-line { font-weight: bold; font-size: 14px; text-align: right; margin-top: 8px; }
        .terms { margin-top: 20px; padding-top: 10px; border-top: 1px dashed #ccc; font-size: 10px; color: #666; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
        .sig-block { text-align: center; width: 45%; }
        .sig-line { border-top: 1px solid #333; margin-top: 30px; padding-top: 5px; font-size: 11px; }
        @media print { body { margin: 0; } }
      </style></head><body>
      ${generatePrintHTML(targetOS)}
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
    printWindow.onafterprint = () => printWindow.close();
  };

  const generatePrintHTML = (os: OSLavanderia): string => {
    const fmtCur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '-'; } };
    const getPagLabel = (v: string) => FORMAS_PAGAMENTO.find(f => f.value === v)?.label || v || '-';
    const getStatusLabel = (v: string) => STATUS_OPTIONS.find(s => s.value === v)?.label || v || '-';

    const empNome = empresaData?.nome_marca || empresaData?.nome || 'LAVANDERIA';
    const empCNPJ = empresaData?.cnpj || '';
    const empTel = empresaData?.telefone || '';
    const empEmail = empresaData?.email || '';
    const empLogo = empresaData?.logo_url || '';
    const empEndereco = [empresaData?.logradouro, empresaData?.numero, empresaData?.complemento, empresaData?.bairro, empresaData?.cidade, empresaData?.estado].filter(Boolean).join(', ');

    const fmtCNPJ = (v: string) => {
      const d = v.replace(/\D/g, '');
      if (d.length !== 14) return v;
      return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`;
    };
    const fmtPhone = (v: string) => {
      const d = v.replace(/\D/g, '');
      if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
      if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6,10)}`;
      return v;
    };

    const cnpjStr = empCNPJ ? `CNPJ: ${fmtCNPJ(empCNPJ)}` : '';
    const telStr = empTel ? fmtPhone(empTel) : '';
    const contatoParts = [cnpjStr, telStr, empEmail].filter(Boolean).join(' | ');

    return `
      <div class="header">
        ${empLogo ? `<img src="${empLogo}" style="max-height:50px;max-width:120px;object-fit:contain;margin-bottom:6px;" alt="Logo" onerror="this.style.display='none'" />` : ''}
        <h1>${empNome}</h1>
        ${empEndereco ? `<p>${empEndereco}</p>` : ''}
        ${contatoParts ? `<p>${contatoParts}</p>` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:15px;font-size:14px;">
        <div><strong>Nº da OS:</strong> ${os.numero}</div>
        <div><strong>Data Entrada:</strong> ${os.dataEntrada ? fmtDate(os.dataEntrada) : '-'} ${os.horaEntrada ? ' às ' + os.horaEntrada : ''}</div>
        <div><strong>Previsão:</strong> ${os.dataPrevisao ? fmtDate(os.dataPrevisao) : '-'} ${os.horaPrevisao ? ' às ' + os.horaPrevisao : ''}</div>
      </div>
      <div class="section">
        <div class="section-title">Identificação do Cliente</div>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Nome</div><div class="info-value">${os.clienteNome || '-'}</div></div>
          <div class="info-item"><div class="info-label">Telefone/WhatsApp</div><div class="info-value">${os.clienteTelefone || '-'}</div></div>
          <div class="info-item" style="grid-column:1/-1"><div class="info-label">Endereço/Entrega</div><div class="info-value">${os.clienteEndereco || '-'}</div></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Itens e Serviços</div>
        <table>
          <thead><tr><th style="width:40px;text-align:center">QTD<div style="font-size:9px;font-weight:normal;line-height:1.2">m²</div></th><th>Descrição da Peça</th><th>Tipo de Serviço</th><th>Observações/Manchas/Danificações</th><th style="width:80px;text-align:right">Valor</th></tr></thead>
          <tbody>${(os.itens || []).map((item: ItemLavanderia) =>
            `<tr><td style="text-align:center">${item.quantidade}</td><td>${item.descricaoPeca}</td><td>${getTipoLabel(item.tipoServico)}</td><td style="font-size:10px;color:#666">${item.observacoes || '-'}</td><td style="text-align:right">${fmtCur(item.total)}</td></tr>`
          ).join('')}</tbody>
        </table>
      </div>
      <div class="section">
        <div class="section-title">Resumo Financeiro</div>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Total de Peças/KG</div><div class="info-value">${os.totalPecas} peça(s) ${os.pesoKg > 0 ? '/ ' + os.pesoKg + ' kg' : ''}</div></div>
          <div class="info-item"><div class="info-label">Valor Total</div><div class="info-value" style="font-size:16px;color:#16a34a">${fmtCur(os.valorTotal)}</div></div>
          <div class="info-item"><div class="info-label">Forma de Pagamento</div><div class="info-value">${getPagLabel(os.formaPagamento)}</div></div>
          <div class="info-item"><div class="info-label">Status</div><div class="info-value">${getStatusLabel(os.status)}</div></div>
        </div>
      </div>
      <div class="terms">
        <p><strong>Termos e Condições:</strong></p>
        <p>1. O cliente tem até 30 dias corridos para retirar as peças a contar da data de prontidão. Após esse prazo será cobrada taxa de armazenagem. Peças não retiradas em 90 dias serão doadas a instituição beneficente, sem direito a reembolso (conforme art. 49 CDC).</p>
        <p>2. Peças com risco sanitário, biológico ou químico poderão ser recusadas no ato do recebimento. A lavanderia reserva-se o direito de recusar qualquer peça que apresente risco evidente de dano ou para a qual não se julgue apta a realizar o serviço.</p>
        <p>3. Peças sem etiqueta de instruções de lavagem do fabricante serão processadas conforme a melhor técnica disponível, isentando a lavanderia de responsabilidade por encolhimento, desbotamento, alteração de textura ou desgaste natural.</p>
        <p>4. A lavanderia não se responsabiliza por objetos deixados nos bolsos. Itens encontrados serão armazenados por 30 dias e após esse período descartados ou doados.</p>
        <p>5. Danos pré-existentes (manchas, rasgos, desfiados, ausência de botões, etc.) devem ser informados no ato da entrega e registrados nesta OS, isentando a lavanderia de responsabilidade pelos mesmos.</p>
        <p>6. Peças especiais, de alta costura, couro, seda ou com pedrarias/bordados necessitam de avaliação prévia e poderão ter prazo e valor diferenciados, informados antes da execução.</p>
        <p>7. Em caso de extravio ou dano comprovado, o ressarcimento seguirá a ABNT NBR 16.737/2019, considerando a depreciação pelo uso. O cliente deve apresentar comprovante de compra ou estimativa de valor de mercado. Reclamações devem ser feitas em até 48h após a entrega. O reembolso ocorrerá em até 30 dias.</p>
      </div>
      <div class="signatures">
        <div class="sig-block"><div class="sig-line">Assinatura do Cliente</div></div>
        <div class="sig-block"><div class="sig-line">Vendedor — ${os.vendedorNome || os.responsavel || ''}</div></div>
      </div>
    `;
  };

  // ============================================================
  // Helpers
  // ============================================================
  const getTipoLabel = (v: string) => {
    if (!v) return '-';
    const catalogService = catalogoServicos.find((cs: any) => cs.id === v);
    if (catalogService) return catalogService.nome;
    return TIPOS_SERVICO.find(t => t.value === v)?.label || v;
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    if (!opt) return <Badge>{status}</Badge>;
    const Icon = opt.icon;
    return (
      <Badge className={`${opt.color} text-xs`}>
        <Icon className="h-3 w-3 mr-1" />
        {opt.label}
      </Badge>
    );
  };

  const getTipoServicoBadge = (tipo: string) => {
    const label = getTipoLabel(tipo);
    return (
      <Badge variant="secondary" className="text-xs">
        {label}
      </Badge>
    );
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '-'; } };
  const getFormaPagLabel = (v: string) => FORMAS_PAGAMENTO.find(f => f.value === v)?.label || v || '-';

  // ============================================================
  // Render
  // ============================================================
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'OS Lavanderia' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center">
                    <WashingMachine className="h-6 w-6 text-sky-600" />
                  </div>
                  OS Lavanderia
                </h1>
                <p className="text-muted-foreground mt-1">
                  Ordens de serviço para lavagem, secagem, passadoria e lavagem a seco
                </p>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setFormOpen(true); }} className="gap-2 bg-sky-600 hover:bg-sky-700">
              <Plus className="h-4 w-4" />
              Nova OS
            </Button>
            <div className="flex gap-2">
              <Link href="/admin/os-lavanderia/catalogo">
                <Button variant="outline" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Catálogo
                </Button>
              </Link>
              <Button variant="outline" className="gap-2" onClick={handleExportPDF} disabled={ordensFiltradas.length === 0}>
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <PackageCheck className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recebidas</p>
                    <p className="text-2xl font-bold">{osRecebidas.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <WashingMachine className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Em Lavagem</p>
                    <p className="text-2xl font-bold">{osEmLavagem.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prontas</p>
                    <p className="text-2xl font-bold">{osProntas.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <PackageCheck className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entregues</p>
                    <p className="text-2xl font-bold">{osEntregues.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="relative flex-1 w-full md:max-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por cliente ou nº da OS..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filtrar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ordens de Serviço - Lavanderia</CardTitle>
              <CardDescription>{ordensFiltradas.length} encontrada(s)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : ordensFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <WashingMachine className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Nenhuma OS de lavanderia encontrada</p>
                  <p className="text-sm">Clique em &quot;Nova OS&quot; para criar uma ordem de serviço</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="hidden md:table-cell">Peças</TableHead>
                        <TableHead className="hidden md:table-cell">Entrada</TableHead>
                        <TableHead className="hidden md:table-cell">Previsão</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordensFiltradas.map((os) => (
                        <TableRow key={os.id}>
                          <TableCell className="font-mono font-semibold">#{os.numero}</TableCell>
                          <TableCell>
                            <p className="font-medium">{os.clienteNome || '-'}</p>
                            {os.clienteTelefone && (
                              <p className="text-xs text-muted-foreground">{os.clienteTelefone}</p>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="secondary">{os.totalPecas} peça(s)</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {os.dataEntrada && formatDate(os.dataEntrada)}
                            {os.horaEntrada && <span className="text-muted-foreground"> {os.horaEntrada}</span>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {os.dataPrevisao && formatDate(os.dataPrevisao)}
                            {os.horaPrevisao && <span className="text-muted-foreground"> {os.horaPrevisao}</span>}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">{formatCurrency(os.valorTotal)}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(os.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(os)} title="Editar">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailOS(os)} title="Ver detalhes">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrint(os)} title="Imprimir">
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteOS(os.id)} title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {os.status === 'recebida' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleStatusChange(os.id, 'em_lavagem')} title="Iniciar Lavagem">
                                  <PlayCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {os.status === 'em_lavagem' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleStatusChange(os.id, 'pronta')} title="Marcar como Pronta">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {os.status === 'pronta' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleStatusChange(os.id, 'entregue')} title="Marcar como Entregue">
                                  <PackageCheck className="h-4 w-4" />
                                </Button>
                              )}
                              {(os.status === 'pronta' || os.status === 'entregue') && !os.vendaId && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-700" onClick={() => handleFaturar(os)} title="Faturar OS">
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                              {os.vendaId && (
                                <Badge variant="secondary" className="text-[9px] bg-green-100 text-green-700 border-0">
                                  <DollarSign className="h-2.5 w-2.5 mr-0.5" /> FAT
                                </Badge>
                              )}
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
        </div>

        {/* ============================================================ */}
        {/* CREATE/EDIT DIALOG */}
        {/* ============================================================ */}
        <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <WashingMachine className="h-5 w-5 text-sky-600" />
                {editingOS ? `Editar OS #${editingOS.numero}` : 'Nova Ordem de Serviço - Lavanderia'}
              </DialogTitle>
              <DialogDescription>Preencha os dados da ordem de serviço de lavanderia</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Número da OS */}
              <div className="flex items-center gap-4 bg-sky-50 p-3 rounded-lg">
                <span className="text-sm font-medium text-sky-700">Nº da OS:</span>
                <span className="text-lg font-bold font-mono text-sky-800">
                  #{editingOS ? editingOS.numero : formNumero}
                </span>
              </div>

              {/* Datas de Entrada e Previsão */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Data Entrada
                  </Label>
                  <Input type="date" value={formDataEntrada} onChange={(e) => setFormDataEntrada(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Hora Entrada
                  </Label>
                  <Input type="time" value={formHoraEntrada} onChange={(e) => setFormHoraEntrada(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Previsão Entrega
                  </Label>
                  <Input type="date" value={formDataPrevisao} onChange={(e) => setFormDataPrevisao(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Hora Previsão
                  </Label>
                  <Input type="time" value={formHoraPrevisao} onChange={(e) => setFormHoraPrevisao(e.target.value)} />
                </div>
              </div>

              {/* Cliente */}
              <div className="space-y-2">
                <Label>Cliente <span className="text-red-500">*</span></Label>
                <Popover open={openClienteSearch} onOpenChange={setOpenClienteSearch}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 w-full justify-start font-normal text-sm">
                      {clienteNome ? (
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col items-start">
                            <span>{clienteNome}</span>
                            {clienteTelefone && <span className="text-xs text-muted-foreground">{clienteTelefone}</span>}
                          </div>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Selecionar cliente...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar por nome, fantasia ou CNPJ/CPF..."
                        value={clienteSearch}
                        onValueChange={setClienteSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                          {clientesFiltrados.map(c => (
                            <CommandItem
                              key={c.id}
                              value={c.nome_razao_social}
                              onSelect={() => {
                                setClienteId(c.id);
                                setClienteNome(c.nome_razao_social || c.nome_fantasia);
                                setClienteTelefone(c.celular || c.telefone || '');
                                const endereco = [c.logradouro, c.numero, c.complemento, c.bairro, c.municipio, c.uf].filter(Boolean).join(', ');
                                setClienteEndereco(endereco);
                                setOpenClienteSearch(false);
                                setClienteSearch('');
                              }}
                            >
                              <User className="mr-2 h-4 w-4" />
                              <div className="flex flex-col">
                                <span className="font-medium">{c.nome_razao_social}</span>
                                {c.nome_fantasia && c.nome_fantasia !== c.nome_razao_social && (
                                  <span className="text-xs text-muted-foreground">{c.nome_fantasia}</span>
                                )}
                              </div>
                              <span className="ml-auto text-xs text-muted-foreground">{c.cnpj_cpf || ''}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Cliente info fields */}
              {(clienteNome || clienteTelefone) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted rounded-lg p-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone/WhatsApp</Label>
                    <Input placeholder="(00) 00000-0000" value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Endereço/Entrega</Label>
                    <Input placeholder="Rua, Nº, Bairro, Cidade - UF" value={clienteEndereco} onChange={(e) => setClienteEndereco(e.target.value)} />
                  </div>
                </div>
              )}

              <Separator />

              {/* ITENS E SERVIÇOS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Shirt className="h-4 w-4 text-sky-600" />
                    Itens e Serviços
                  </Label>
                  <div className="flex gap-2">
                    <Link href="/admin/os-lavanderia/catalogo" target="_blank">
                      <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs text-sky-600">
                        <BookOpen className="h-3 w-3" /> Catálogo
                      </Button>
                    </Link>
                    <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={adicionarItem}>
                      <Plus className="h-3 w-3" /> Adicionar Peça
                    </Button>
                  </div>
                </div>

                {itens.length === 0 ? (
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg p-4 text-center">
                    Nenhuma peça adicionada. Clique em &quot;Adicionar Peça&quot; para começar.
                    <br />
                    <span className="text-sky-600">Os itens e serviços serão buscados automaticamente do catálogo.</span>
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20 text-center"><div>Qtd</div><div className="text-[10px] font-normal leading-tight">m²</div></TableHead>
                          <TableHead>Descrição da Peça</TableHead>
                          <TableHead className="w-44">Tipo de Serviço</TableHead>
                          <TableHead className="w-52">Observações</TableHead>
                          <TableHead className="w-28 text-right">Valor Unit.</TableHead>
                          <TableHead className="w-24 text-right">Total</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Input type="number" min="0.01" step="0.01" className="h-9 text-center w-20 text-sm font-medium" value={item.quantidade} onChange={(e) => atualizarItem(idx, 'quantidade', parseFloat(e.target.value) || 0)} />
                            </TableCell>
                            <TableCell>
                              <Popover
                                open={openItemPopoverIdx === idx}
                                onOpenChange={(open) => {
                                  setOpenItemPopoverIdx(open ? idx : null);
                                  setItemSearch('');
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="h-9 w-full justify-start font-normal text-sm px-3">
                                    {item.descricaoPeca || <span className="text-muted-foreground">Buscar item...</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0" align="start">
                                  <Command>
                                    <CommandInput
                                      placeholder="Filtrar itens..."
                                      value={itemSearch}
                                      onValueChange={setItemSearch}
                                    />
                                    <CommandList>
                                      <CommandEmpty>Nenhum item encontrado</CommandEmpty>
                                      <CommandGroup className="max-h-52 overflow-y-auto">
                                        {catalogoItens.map((ci: any) => (
                                          <CommandItem
                                            key={ci.id}
                                            value={ci.descricao}
                                            onSelect={() => {
                                              const novos = [...itens];
                                              novos[idx] = {
                                                ...novos[idx],
                                                descricaoPeca: ci.descricao,
                                                itemCatalogoId: ci.id,
                                              };
                                              if (novos[idx].tipoServico) {
                                                const preco = lookupPreco(ci.id, novos[idx].tipoServico);
                                                if (preco >= 0) novos[idx].valorUnitario = preco;
                                              }
                                              novos[idx].total = novos[idx].quantidade * novos[idx].valorUnitario;
                                              setItens(novos);
                                              setOpenItemPopoverIdx(null);
                                              setItemSearch('');
                                            }}
                                          >
                                            <Shirt className="mr-2 h-3 w-3 shrink-0 text-muted-foreground" />
                                            <span className="flex-1 truncate text-xs">{ci.descricao}</span>
                                            {ci.categoria && <Badge variant="secondary" className="text-[9px] ml-2">{ci.categoria}</Badge>}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Popover
                                open={openServicoPopoverIdx === idx}
                                onOpenChange={(open) => {
                                  setOpenServicoPopoverIdx(open ? idx : null);
                                  setServicoSearch('');
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="h-9 w-full justify-start font-normal text-sm px-3">
                                    {item.tipoServico ? (catalogoServicos.find((cs: any) => cs.id === item.tipoServico)?.nome || TIPOS_SERVICO.find(t => t.value === item.tipoServico)?.label) : <span className="text-muted-foreground">Serviço...</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0" align="start">
                                  <Command>
                                    <CommandInput
                                      placeholder="Filtrar serviços..."
                                      value={servicoSearch}
                                      onValueChange={setServicoSearch}
                                    />
                                    <CommandList>
                                      <CommandEmpty>Nenhum serviço encontrado</CommandEmpty>
                                      <CommandGroup className="max-h-52 overflow-y-auto">
                                        {catalogoServicos.length > 0 && catalogoServicos.map((cs: any) => {
                                          const precoEspecifico = item.itemCatalogoId ? lookupPreco(item.itemCatalogoId, cs.id) : -1;
                                          const hasPreco = precoEspecifico >= 0;
                                          const precoDisplay = hasPreco ? precoEspecifico : (parseFloat(cs.preco) || 0);
                                          return (
                                          <CommandItem
                                            key={cs.id}
                                            value={cs.nome}
                                            onSelect={() => {
                                              const novos = [...itens];
                                              novos[idx] = {
                                                ...novos[idx],
                                                tipoServico: cs.id,
                                              };
                                              if (novos[idx].itemCatalogoId) {
                                                const p = lookupPreco(novos[idx].itemCatalogoId, cs.id);
                                                novos[idx].valorUnitario = p >= 0 ? p : (parseFloat(cs.preco) || 0);
                                              } else {
                                                novos[idx].valorUnitario = parseFloat(cs.preco) || 0;
                                              }
                                              novos[idx].total = novos[idx].quantidade * novos[idx].valorUnitario;
                                              setItens(novos);
                                              setOpenServicoPopoverIdx(null);
                                              setServicoSearch('');
                                            }}
                                          >
                                            <Sparkles className="mr-2 h-3 w-3 shrink-0 text-muted-foreground" />
                                            <div className="flex flex-col flex-1 min-w-0">
                                              <span className="text-xs truncate">{cs.nome}</span>
                                              <span className={`text-[10px] ${hasPreco ? 'text-green-600' : (precoDisplay > 0 ? 'text-amber-600' : 'text-muted-foreground')}`}>
                                                {hasPreco ? `R$ ${precoDisplay.toFixed(2)} (preço do item)` : (precoDisplay > 0 ? `R$ ${precoDisplay.toFixed(2)} (preço padrão)` : 'Sem preço cadastrado')}
                                              </span>
                                            </div>
                                          </CommandItem>
                                          );
                                        })}
                                        {catalogoServicos.length === 0 && TIPOS_SERVICO.map(ts => (
                                          <CommandItem
                                            key={ts.value}
                                            value={ts.label}
                                            onSelect={() => {
                                              const novos = [...itens];
                                              novos[idx] = {
                                                ...novos[idx],
                                                tipoServico: ts.value,
                                                valorUnitario: 0,
                                              };
                                              novos[idx].total = novos[idx].quantidade * novos[idx].valorUnitario;
                                              setItens(novos);
                                              setOpenServicoPopoverIdx(null);
                                              setServicoSearch('');
                                            }}
                                          >
                                            <ts.icon className="mr-2 h-3 w-3 shrink-0 text-muted-foreground" />
                                            <div className="flex flex-col">
                                              <span className="text-xs">{ts.label}</span>
                                              <span className="text-[10px] text-muted-foreground">Sem preço cadastrado</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 text-xs" placeholder="Manchas, defeitos..." value={item.observacoes} onChange={(e) => atualizarItem(idx, 'observacoes', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" step="0.01" min="0" className="h-8 text-right" placeholder="0,00" value={item.valorUnitario || ''} onChange={(e) => atualizarItem(idx, 'valorUnitario', parseFloat(e.target.value) || 0)} />
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600 text-sm">
                              {formatCurrency(item.total)}
                            </TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removerItem(idx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* RESUMO FINANCEIRO */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resumo Financeiro
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Total de Peças</Label>
                    <div className="h-9 flex items-center px-3 bg-muted rounded-md font-semibold">
                      {totalPecasCalc} peça(s)
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Peso (kg)</Label>
                    <Input type="number" step="0.1" min="0" placeholder="0,0" value={pesoKg || ''} onChange={(e) => setPesoKg(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor Total (R$)</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0,00" value={formValorTotal || ''} onChange={(e) => setFormValorTotal(parseFloat(e.target.value) || 0)} className="font-semibold text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Forma de Pagamento <span className="text-red-500">*</span></Label>
                    <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {FORMAS_PAGAMENTO.map(fp => (
                          <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Status e Vendedor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Vendedor</Label>
                  <Popover open={openVendedorSearch} onOpenChange={setOpenVendedorSearch}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-10 w-full justify-start font-normal text-sm">
                        {formVendedorNome ? (
                          <span>{formVendedorNome}</span>
                        ) : (
                          <span className="text-muted-foreground">Selecionar vendedor...</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Buscar vendedor..." value={vendedorSearch} onValueChange={setVendedorSearch} />
                        <CommandList>
                          <CommandEmpty>Nenhum vendedor encontrado</CommandEmpty>
                          <CommandGroup className="max-h-48 overflow-y-auto">
                            {vendedoresFiltrados.map(v => (
                              <CommandItem key={v.id} value={v.nome} onSelect={() => {
                                setFormVendedorId(v.id);
                                setFormVendedorNome(v.nome);
                                setOpenVendedorSearch(false);
                                setVendedorSearch('');
                              }}>
                                <User className="mr-2 h-4 w-4" />
                                {v.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1">
                <Label className="text-xs">Observações Internas</Label>
                <textarea className="w-full min-h-[60px] p-3 border rounded-lg resize-none text-sm" placeholder="Observações adicionais sobre a OS..." value={formObservacoes} onChange={(e) => setFormObservacoes(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSaveOS} disabled={saving} className="bg-sky-600 hover:bg-sky-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingOS ? 'Atualizar OS' : 'Criar OS'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* DETAIL DIALOG */}
        {/* ============================================================ */}
        <Dialog open={!!detailOS} onOpenChange={(open) => { if (!open) setDetailOS(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <WashingMachine className="h-5 w-5 text-sky-600" />
                OS #{detailOS?.numero} — Detalhes
              </DialogTitle>
              <DialogDescription>Visualização completa da ordem de serviço</DialogDescription>
            </DialogHeader>
            {detailOS && (
              <Tabs defaultValue="dados">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dados">Dados da OS</TabsTrigger>
                  <TabsTrigger value="imprimir">Impressão</TabsTrigger>
                </TabsList>

                <TabsContent value="dados" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Nº da OS</p>
                      <p className="font-bold text-lg font-mono mt-1">#{detailOS.numero}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(detailOS.status)}</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Data Entrada</p>
                      <p className="font-semibold text-sm mt-1">
                        {detailOS.dataEntrada ? formatDate(detailOS.dataEntrada) : '-'}
                        {detailOS.horaEntrada ? ` às ${detailOS.horaEntrada}` : ''}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Previsão de Entrega</p>
                      <p className="font-semibold text-sm mt-1">
                        {detailOS.dataPrevisao ? formatDate(detailOS.dataPrevisao) : '-'}
                        {detailOS.horaPrevisao ? ` às ${detailOS.horaPrevisao}` : ''}
                      </p>
                    </div>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" /> Identificação do Cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Nome</p>
                        <p className="font-medium text-sm">{detailOS.clienteNome || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone/WhatsApp</p>
                        <p className="font-medium text-sm">{detailOS.clienteTelefone || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Endereço/Entrega</p>
                        <p className="font-medium text-sm">{detailOS.clienteEndereco || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {detailOS.itens && detailOS.itens.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Shirt className="h-4 w-4" /> Itens e Serviços
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-center">Qtd</TableHead>
                                <TableHead>Descrição da Peça</TableHead>
                                <TableHead>Tipo de Serviço</TableHead>
                                <TableHead>Observações</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailOS.itens.map((item: ItemLavanderia, i: number) => (
                                <TableRow key={i}>
                                  <TableCell className="text-center">{item.quantidade}</TableCell>
                                  <TableCell className="font-medium">{item.descricaoPeca}</TableCell>
                                  <TableCell>{getTipoServicoBadge(item.tipoServico)}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{item.observacoes || '-'}</TableCell>
                                  <TableCell className="text-right font-medium text-green-600">{formatCurrency(item.total)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-sky-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-sky-600">Total de Peças</p>
                      <p className="text-xl font-bold text-sky-800">{detailOS.totalPecas}</p>
                    </div>
                    {detailOS.pesoKg > 0 && (
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-purple-600">Peso Total</p>
                        <p className="text-xl font-bold text-purple-800">{detailOS.pesoKg} kg</p>
                      </div>
                    )}
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-green-600">Valor Total</p>
                      <p className="text-xl font-bold text-green-800">{formatCurrency(detailOS.valorTotal)}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-amber-600">Pagamento</p>
                      <p className="text-sm font-bold text-amber-800">{getFormaPagLabel(detailOS.formaPagamento)}</p>
                    </div>
                  </div>

                  {detailOS.observacoes && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Observações</p>
                      <p className="text-sm mt-1">{detailOS.observacoes}</p>
                    </div>
                  )}

                  {detailOS.vendedorNome && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Vendedor</p>
                      <p className="text-sm mt-1">{detailOS.vendedorNome}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="imprimir" className="mt-4">
                  <div className="flex justify-end mb-4">
                    <Button variant="outline" className="gap-2" onClick={() => handlePrint(detailOS)}>
                      <Printer className="h-4 w-4" />
                      Imprimir OS
                    </Button>
                  </div>
                  <div className="border rounded-lg p-6 bg-white text-black text-xs" dangerouslySetInnerHTML={{ __html: generatePrintHTML(detailOS) }} />
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
