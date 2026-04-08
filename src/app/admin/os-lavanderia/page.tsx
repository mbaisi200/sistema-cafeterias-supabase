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
  const [formResponsavel, setFormResponsavel] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');

  // Data lists
  const [clientes, setClientes] = useState<any[]>([]);
  const [catalogoItens, setCatalogoItens] = useState<any[]>([]);
  const [catalogoServicos, setCatalogoServicos] = useState<any[]>([]);
  const [empresaData, setEmpresaData] = useState<any>(null);

  // Load data
  useEffect(() => {
    if (empresaId) {
      loadOrdens();
      loadClientes();
      loadCatalogoItens();
      loadCatalogoServicos();
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
            parsedItens = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
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
            responsavel: metadata.responsavel || '',
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
      quantidade: 1,
      descricaoPeca: '',
      tipoServico: 'lavar_passar',
      observacoes: '',
      valorUnitario: 0,
      total: 0,
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
        responsavel: formResponsavel,
        observacoesTexto: formObservacoes,
      });

      const servicosJSON = JSON.stringify(itens.map(item => ({
        descricao: item.descricaoPeca,
        tipoServico: item.tipoServico,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        total: item.total,
        observacoes: item.observacoes,
      })));

      if (editingOS) {
        const { error } = await supabase
          .from('ordens_servico')
          .update({
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            descricao: `OS Lavanderia - ${clienteNome}`,
            tecnico: formResponsavel,
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
            tecnico: formResponsavel,
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
    if (!confirm('Tem certeza que deseja excluir esta OS de lavanderia?')) return;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('ordens_servico')
        .update({ ativo: false })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'OS excluída!', description: 'Ordem de serviço removida.' });
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
    if (!confirm(`Faturar OS #${os.numero} no valor de ${formatCurrency(os.valorTotal)}? Uma venda será criada no PDV.`)) return;
    try {
      const supabase = getSupabase();

      const { data: vendaData, error: vendaError } = await supabase
        .from('vendas')
        .insert({
          empresa_id: empresaId,
          tipo: 'balcao',
          canal: 'lavanderia',
          status: 'fechada',
          total: os.valorTotal,
          desconto: 0,
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

      const itensVenda = (os.itens || []).map(item => ({
        empresa_id: empresaId,
        venda_id: vendaData.id,
        nome: `${item.descricaoPeca} - ${TIPOS_SERVICO.find(t => t.value === item.tipoServico)?.label || item.tipoServico}`,
        quantidade: item.quantidade,
        preco_unitario: item.valorUnitario,
        subtotal: item.total,
        criado_em: new Date().toISOString(),
      }));

      if (itensVenda.length > 0) {
        await supabase.from('itens_venda').insert(itensVenda);
      }

      // Update OS: set vendido_id in metadata, change status to entregue
      let metadata: any = {};
      if (os.observacoes) {
        try {
          const obsText = os.observacoes;
          if (obsText.startsWith('[LAVANDERIA]')) {
            metadata = JSON.parse(obsText.replace('[LAVANDERIA]', '').trim());
          }
        } catch { /* ignore */ }
      }
      metadata.vendaId = vendaData.id;
      metadata.vendaNumero = vendaData.id.substring(0, 8);

      await supabase
        .from('ordens_servico')
        .update({
          status: 'aprovada',
          observacoes: `[LAVANDERIA]${JSON.stringify(metadata)}`,
        })
        .eq('id', os.id);

      toast({ title: 'OS faturada!', description: `Venda criada para OS #${os.numero}. ID: ${vendaData.id.substring(0, 8)}` });
      loadOrdens();
    } catch (err: any) {
      console.error('Erro ao faturar OS:', err);
      toast({ variant: 'destructive', title: 'Erro ao faturar', description: err.message });
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
    setFormResponsavel(os.responsavel || '');
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
    setFormResponsavel('');
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
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !printOS) return;
    printWindow.document.write(`
      <html><head><title>OS Lavanderia #${printOS.numero}</title>
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
      ${generatePrintHTML(printOS)}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintHTML = (os: OSLavanderia): string => {
    const fmtCur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '-'; } };
    const getPagLabel = (v: string) => FORMAS_PAGAMENTO.find(f => f.value === v)?.label || v || '-';
    const getTipoLabel = (v: string) => TIPOS_SERVICO.find(t => t.value === v)?.label || v || '-';
    const getStatusLabel = (v: string) => STATUS_OPTIONS.find(s => s.value === v)?.label || v || '-';

    const empNome = empresaData?.nome_marca || empresaData?.nome || 'LAVANDERIA';
    const empCNPJ = empresaData?.cnpj || '';
    const empTel = empresaData?.telefone || '';
    const empEmail = empresaData?.email || '';
    const empLogo = empresaData?.logo_url || '';
    const empEndereco = [empresaData?.logradouro, empresaData?.numero, empresaData?.complemento, empresaData?.bairro, empresaData?.cidade, empresaData?.estado].filter(Boolean).join(', ');

    const infoParts = [empCNPJ ? `CNPJ: ${empCNPJ}` : '', empTel, empEmail].filter(Boolean).join(' | ');

    return `
      <div class="header">
        ${empLogo ? `<img src="${empLogo}" style="max-height:50px;max-width:120px;object-fit:contain;margin-bottom:6px;" alt="Logo" onerror="this.style.display='none'" />` : ''}
        <h1>${empNome}</h1>
        ${infoParts ? `<p>${infoParts}</p>` : ''}
        ${empEndereco ? `<p>${empEndereco}</p>` : ''}
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
          <thead><tr><th style="width:40px">Qtd</th><th>Descrição da Peça</th><th>Tipo de Serviço</th><th>Observações/Manchas/Danificações</th><th style="width:80px;text-align:right">Valor</th></tr></thead>
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
        <p>1. As roupas não retiradas no prazo de 90 dias serão doadas (conforme CDC).</p>
        <p>2. A lavanderia não se responsabiliza por peças sem etiqueta de instruções de lavagem ou itens esquecidos nos bolsos.</p>
        <p>3. Peças com manchas pré-existentes ou danificações devem ser informadas no ato da entrega e registradas nesta OS.</p>
      </div>
      <div class="signatures">
        <div class="sig-block"><div class="sig-line">Assinatura do Cliente</div></div>
        <div class="sig-block"><div class="sig-line">Responsável (Lavanderia) — ${os.responsavel || ''}</div></div>
      </div>
    `;
  };

  // ============================================================
  // Helpers
  // ============================================================
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
    // Check if it's a catalog service ID
    const catalogService = catalogoServicos.find((cs: any) => cs.id === tipo);
    const label = catalogService?.nome || TIPOS_SERVICO.find(s => s.value === tipo)?.label || tipo;
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
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setPrintOS(os); setTimeout(() => handlePrint(), 100); }} title="Imprimir">
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
                          <TableHead className="w-16 text-center">Qtd</TableHead>
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
                              <Input type="number" min="1" className="h-8 text-center w-14" value={item.quantidade} onChange={(e) => atualizarItem(idx, 'quantidade', parseInt(e.target.value) || 1)} />
                            </TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="h-8 w-full justify-start font-normal text-xs">
                                    {item.descricaoPeca ? item.descricaoPeca : (
                                      <span className="text-muted-foreground">Buscar item...</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-0">
                                  <Command shouldFilter={false}>
                                    <CommandInput placeholder="Buscar peça no catálogo..." />
                                    <CommandList>
                                      <CommandEmpty>
                                        <div className="p-2">
                                          <p className="text-xs text-muted-foreground mb-1">Nenhum item encontrado. Digite para cadastrar manualmente:</p>
                                          <Input className="h-7 text-xs" placeholder="Descrição da peça..." value={item.descricaoPeca} onChange={(e) => atualizarItem(idx, 'descricaoPeca', e.target.value)} autoFocus />
                                        </div>
                                      </CommandEmpty>
                                      <CommandGroup className="max-h-48 overflow-y-auto">
                                        {catalogoItens.filter((ci: any) =>
                                          !item.descricaoPeca || ci.descricao.toLowerCase().includes(item.descricaoPeca.toLowerCase())
                                        ).map((ci: any) => (
                                          <CommandItem key={ci.id} value={ci.descricao} onSelect={() => atualizarItem(idx, 'descricaoPeca', ci.descricao)}>
                                            <Shirt className="mr-2 h-3 w-3" />
                                            <span className="text-xs">{ci.descricao}</span>
                                            {ci.categoria && <Badge variant="secondary" className="text-[9px] ml-auto">{ci.categoria}</Badge>}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="h-8 w-full justify-start font-normal text-xs">
                                    {item.tipoServico ? (catalogoServicos.find((cs: any) => cs.id === item.tipoServico)?.nome || TIPOS_SERVICO.find(t => t.value === item.tipoServico)?.label) : (
                                      <span className="text-muted-foreground">Serviço...</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0">
                                  <Command shouldFilter={false}>
                                    <CommandInput placeholder="Buscar serviço..." />
                                    <CommandList>
                                      <CommandEmpty>
                                        <p className="text-xs text-muted-foreground p-2">Nenhum serviço cadastrado.</p>
                                      </CommandEmpty>
                                      <CommandGroup className="max-h-48 overflow-y-auto">
                                        {catalogoServicos.map((cs: any) => (
                                          <CommandItem key={cs.id} value={cs.nome} onSelect={() => {
                                            atualizarItem(idx, 'tipoServico', cs.id);
                                            atualizarItem(idx, 'valorUnitario', parseFloat(cs.preco) || 0);
                                          }}>
                                            <Sparkles className="mr-2 h-3 w-3" />
                                            <div className="flex flex-col">
                                              <span className="text-xs">{cs.nome}</span>
                                              <span className="text-[10px] text-green-600">{formatCurrency(parseFloat(cs.preco) || 0)}</span>
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
                    <Label className="text-xs">Forma de Pagamento</Label>
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

              {/* Status e Responsável */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Responsável</Label>
                  <Input placeholder="Nome do responsável pela lavanderia" value={formResponsavel} onChange={(e) => setFormResponsavel(e.target.value)} />
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

                  {detailOS.responsavel && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Responsável</p>
                      <p className="text-sm mt-1">{detailOS.responsavel}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="imprimir" className="mt-4">
                  <div className="flex justify-end mb-4">
                    <Button variant="outline" className="gap-2" onClick={() => { setPrintOS(detailOS); setTimeout(() => handlePrint(), 100); }}>
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
