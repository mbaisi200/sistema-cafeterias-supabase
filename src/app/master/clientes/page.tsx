'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEmpresas } from '@/hooks/useFirestore';
import { getSupabaseClient } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Eye,
  Ban,
  CheckCircle,
  Loader2,
  UserPlus,
  Building2,
  KeyRound,
  Calendar,
  AlertTriangle,
  Clock,
  Mail,
  Trash2,
  LayoutGrid,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { maskCNPJ, maskPhone, maskCEP, unmask } from '@/lib/masks';

interface Cliente {
  id: string;
  nome: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  valorMensal?: number;
  status?: string;
  validade?: Date | null;
  dataInicio?: Date | null;
  adminNome?: string;
  adminEmail?: string;
  adminId?: string;
  segmentoId?: string;
  segmentoNome?: string;
}

export default function ClientesPage() {
  const { empresas, loading, adicionarEmpresa, atualizarEmpresa, excluirEmpresa } = useEmpresas();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [syncAdminDialogOpen, setSyncAdminDialogOpen] = useState(false);
  const [syncingAdmin, setSyncingAdmin] = useState(false);
  const [syncSenha, setSyncSenha] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteComAdmin, setClienteComAdmin] = useState<Cliente[]>([]);
  const { toast } = useToast();

  // Estados controlados para máscaras
  const [cnpjValue, setCnpjValue] = useState('');
  const [telefoneValue, setTelefoneValue] = useState('');
  const [cepValue, setCepValue] = useState('');
  const [dataInicioValue, setDataInicioValue] = useState('');
  const [validadeValue, setValidadeValue] = useState('');
  const [valorMensalValue, setValorMensalValue] = useState('');

  // Estados para edição
  const [editCnpjValue, setEditCnpjValue] = useState('');
  const [editTelefoneValue, setEditTelefoneValue] = useState('');
  const [editCepValue, setEditCepValue] = useState('');
  const [editDataInicioValue, setEditDataInicioValue] = useState('');
  const [editValidadeValue, setEditValidadeValue] = useState('');
  const [editValorMensalValue, setEditValorMensalValue] = useState('');
  const [editAdminNome, setEditAdminNome] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');

  // Estados para segmentos e seções
  const [segmentos, setSegmentos] = useState<any[]>([]);
  const [secoesDisponiveis, setSecoesDisponiveis] = useState<any[]>([]);
  const [secoesSelecionadas, setSecoesSelecionadas] = useState<Set<string>>(new Set());
  const [dialogSecoes, setDialogSecoes] = useState(false);
  const [empresaSecoesId, setEmpresaSecoesId] = useState<string | null>(null);
  const [segmentoId, setSegmentoId] = useState<string>('');
  const [nomeMarca, setNomeMarca] = useState<string>('');
  const [loadingSecoes, setLoadingSecoes] = useState(false);

  // Carregar dados dos admins das empresas
  useEffect(() => {
    const carregarAdmins = async () => {
      if (empresas.length === 0) return;

      try {
        const supabase = getSupabaseClient();
        
        console.log('🔄 Carregando admins das empresas...');
        
        const { data: usuarios, error } = await supabase
          .from('usuarios')
          .select('id, nome, email, empresa_id')
          .eq('role', 'admin');
        
        if (error) {
          console.error('❌ Erro ao buscar admins:', error);
          throw error;
        }

        // Carregar segmentos para enriquecer os dados
        const { data: segData } = await supabase
          .from('segmentos')
          .select('id, nome, nome_marca')
          .eq('ativo', true);
        const segmentosMap: Record<string, { nome: string; nome_marca: string }> = {};
        segData?.forEach((seg: any) => {
          segmentosMap[seg.id] = { nome: seg.nome, nome_marca: seg.nome_marca };
        });

        console.log('📊 Admins encontrados:', usuarios?.length || 0);
        console.log('📊 Empresas para matching:', empresas.length);
        
        const adminsMap: Record<string, { nome: string; email: string; id: string }> = {};
        usuarios?.forEach((usuario) => {
          if (usuario.empresa_id) {
            adminsMap[usuario.empresa_id] = {
              nome: usuario.nome || '',
              email: usuario.email || '',
              id: usuario.id,
            };
            console.log(`✅ Admin mapeado: empresa_id=${usuario.empresa_id}, nome=${usuario.nome}`);
          }
        });

        const empresasComAdmin = empresas.map(empresa => ({
          ...empresa,
          adminNome: adminsMap[empresa.id]?.nome || 'Não encontrado',
          adminEmail: adminsMap[empresa.id]?.email || 'Não encontrado',
          adminId: adminsMap[empresa.id]?.id || null,
          validade: empresa.validade ? new Date(empresa.validade) : null,
          dataInicio: empresa.dataInicio ? new Date(empresa.dataInicio) : null,
          valorMensal: empresa.valor_mensal || 0,
          segmentoId: empresa.segmento_id || null,
          segmentoNome: empresa.segmento_id ? segmentosMap[empresa.segmento_id]?.nome || null : null,
        }));

        console.log('📊 Empresas com admin:', empresasComAdmin.map(e => ({ nome: e.nome, adminNome: e.adminNome })));

        setClienteComAdmin(empresasComAdmin);
      } catch (error) {
        console.error('Erro ao carregar admins:', error);
        setClienteComAdmin(empresas);
      }
    };

    carregarAdmins();
  }, [empresas]);

  // Carregar segmentos disponíveis
  useEffect(() => {
    const loadSegmentos = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.from('segmentos').select('*').eq('ativo', true).order('nome');
      setSegmentos(data || []);
    };
    loadSegmentos();
  }, []);

  // Carregar seções disponíveis
  useEffect(() => {
    const loadSecoes = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase
        .from('secoes_menu')
        .select('*')
        .eq('ativo', true)
        .order('grupo, ordem');
      setSecoesDisponiveis(data || []);
    };
    loadSecoes();
  }, []);

  const filteredClientes = clienteComAdmin.filter(cliente => {
    const matchSearch = cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
                       (cliente.cnpj && cliente.cnpj.includes(search)) ||
                       (cliente.adminEmail && cliente.adminEmail.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || cliente.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Verificar se está vencendo em breve (3 dias)
  const isVencendoEmBreve = (validade: Date | null | undefined) => {
    if (!validade) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataValidade = new Date(validade);
    dataValidade.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  };

  // Verificar se está vencido
  const isVencido = (validade: Date | null | undefined) => {
    if (!validade) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataValidade = new Date(validade);
    dataValidade.setHours(0, 0, 0, 0);
    return dataValidade < hoje;
  };

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    // Verificar senhas
    const senha = formData.get('admin_senha') as string;
    const senhaConf = formData.get('admin_senha_conf') as string;
    if (senha !== senhaConf) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'As senhas não coincidem',
      });
      setSaving(false);
      return;
    }
    
    try {
      const empresaId = await adicionarEmpresa({
        nome: formData.get('nome') as string,
        cnpj: unmask(cnpjValue),
        email: formData.get('email') as string,
        telefone: unmask(telefoneValue),
        logradouro: formData.get('logradouro') as string,
        numero: formData.get('numero') as string,
        complemento: formData.get('complemento') as string,
        bairro: formData.get('bairro') as string,
        cidade: formData.get('cidade') as string,
        estado: formData.get('estado') as string,
        cep: unmask(cepValue),
        valorMensal: parseFloat(valorMensalValue) || 0,
        dataInicio: dataInicioValue || null,
        validade: validadeValue || null,
      });

      const adminNome = formData.get('admin_nome') as string;
      const adminEmail = formData.get('admin_email') as string;
      const adminSenha = senha;

      // Usar API server-side para criar o admin com email_confirm: true
      // Isso evita o erro "Email not confirmed" do Supabase Auth
      const response = await fetch('/api/master/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminSenha,
          nome: adminNome,
          empresaId: empresaId,
          empresaNome: formData.get('nome') as string,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar administrador');
      }

      // Salvar segmento e seções da empresa
      if (empresaId) {
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase
            .from('empresas')
            .update({
              segmento_id: segmentoId || null,
              nome_marca: nomeMarca || null,
            })
            .eq('id', empresaId);

          // Criar empresa_secoes com todas as seções ativas
          const secoesInsert = secoesDisponiveis.map((s: any) => ({
            empresa_id: empresaId,
            secao_id: s.id,
            ativo: true,
          }));

          if (secoesInsert.length > 0) {
            await supabase.from('empresa_secoes').insert(secoesInsert);
          }
        }
      }

      toast({
        title: 'Cliente cadastrado com sucesso!',
        description: `Empresa e usuário admin criados. O admin pode logar imediatamente com o email ${adminEmail}`,
      });

      setDialogOpen(false);
      setCnpjValue('');
      setTelefoneValue('');
      setCepValue('');
      setDataInicioValue('');
      setValidadeValue('');
      setValorMensalValue('');
      setSegmentoId('');
      setNomeMarca('');
      
    } catch (error: unknown) {
      console.error('Erro ao salvar cliente:', error);
      let mensagem = 'Erro ao cadastrar cliente';
      if (error instanceof Error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          mensagem = 'Este email já está cadastrado no sistema';
        } else {
          mensagem = error.message;
        }
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar',
        description: mensagem,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCliente) return;
    
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      await atualizarEmpresa(selectedCliente.id, {
        nome: formData.get('nome') as string,
        cnpj: unmask(editCnpjValue),
        email: formData.get('email') as string,
        telefone: unmask(editTelefoneValue),
        logradouro: formData.get('logradouro') as string,
        numero: formData.get('numero') as string,
        complemento: formData.get('complemento') as string,
        bairro: formData.get('bairro') as string,
        cidade: formData.get('cidade') as string,
        estado: formData.get('estado') as string,
        cep: unmask(editCepValue),
        valor_mensal: parseFloat(editValorMensalValue) || 0,
        dataInicio: editDataInicioValue || null,
        validade: editValidadeValue || null,
      });

      // Atualizar nome do admin se necessário
      const novoAdminNome = formData.get('admin_nome') as string;
      if (novoAdminNome && selectedCliente.adminId && novoAdminNome !== selectedCliente.adminNome) {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('usuarios')
          .update({
            nome: novoAdminNome,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', selectedCliente.adminId);

        if (error) throw error;
      }

      toast({
        title: 'Cliente atualizado com sucesso!',
        description: 'Os dados foram salvos.',
      });

      setEditDialogOpen(false);
      
    } catch (error: unknown) {
      console.error('Erro ao editar cliente:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao editar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setEditCnpjValue(formatCNPJ(cliente.cnpj || ''));
    setEditTelefoneValue(formatPhone(cliente.telefone || ''));
    setEditCepValue(formatCEP(cliente.cep || ''));
    setEditDataInicioValue(cliente.dataInicio ? formatDateForInput(new Date(cliente.dataInicio)) : '');
    setEditValidadeValue(cliente.validade ? formatDateForInput(new Date(cliente.validade)) : '');
    setEditValorMensalValue(cliente.valorMensal ? cliente.valorMensal.toString() : '');
    setEditAdminNome(cliente.adminNome !== 'Não encontrado' ? cliente.adminNome || '' : '');
    setEditAdminEmail(cliente.adminEmail !== 'Não encontrado' ? cliente.adminEmail || '' : '');
    setEditDialogOpen(true);
  };

  const openViewDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setViewDialogOpen(true);
  };

  const openResetPasswordDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setNewPassword('');
    setConfirmPassword('');
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedCliente?.adminId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'ID do administrador não encontrado',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'As senhas não coincidem',
      });
      return;
    }

    setResettingPassword(true);

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: selectedCliente.adminId,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao redefinir senha');
      }

      toast({
        title: 'Senha alterada!',
        description: `A senha do administrador ${selectedCliente.adminNome} foi alterada com sucesso.`,
      });

      setResetPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: unknown) {
      console.error('Erro ao redefinir senha:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao redefinir senha',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setResettingPassword(false);
    }
  };

  // Enviar email de notificação
  const handleEnviarNotificacao = async (cliente: Cliente) => {
    try {
      const response = await fetch('/api/admin/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cliente.adminEmail,
          nome: cliente.adminNome,
          empresa: cliente.nome,
          validade: cliente.validade,
        }),
      });

      if (!response.ok) throw new Error('Erro ao enviar notificação');

      toast({
        title: 'Notificação enviada!',
        description: `Email enviado para ${cliente.adminEmail}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível enviar a notificação',
      });
    }
  };

  // Sincronizar admin com Supabase Auth
  const openSyncAdminDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setSyncSenha('');
    setSyncAdminDialogOpen(true);
  };

  const handleSyncAdmin = async () => {
    if (!selectedCliente) return;

    if (syncSenha.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
      });
      return;
    }

    setSyncingAdmin(true);

    try {
      const response = await fetch('/api/sync-admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedCliente.adminEmail,
          senha: syncSenha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar admin');
      }

      toast({
        title: 'Admin sincronizado!',
        description: `O admin ${selectedCliente.adminNome} agora pode fazer login com o email ${selectedCliente.adminEmail}`,
      });

      setSyncAdminDialogOpen(false);
      setSyncSenha('');
    } catch (error: unknown) {
      console.error('Erro ao sincronizar admin:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao sincronizar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setSyncingAdmin(false);
    }
  };

  const statusCores: Record<string, string> = {
    ativo: 'bg-green-500',
    inativo: 'bg-yellow-500',
    bloqueado: 'bg-red-500',
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return '';
    const numbers = cnpj.replace(/\D/g, '');
    if (numbers.length !== 14) return cnpj;
    return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (numbers.length === 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return phone;
  };

  const formatCEP = (cep: string) => {
    if (!cep) return '';
    const numbers = cep.replace(/\D/g, '');
    if (numbers.length !== 8) return cep;
    return numbers.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Toggle seção selecionada
  const toggleSecao = (secaoId: string) => {
    setSecoesSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(secaoId)) {
        next.delete(secaoId);
      } else {
        next.add(secaoId);
      }
      return next;
    });
  };

  // Abrir dialog de seções
  const handleAbrirSecoes = async (empresaId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setEmpresaSecoesId(empresaId);
    setLoadingSecoes(true);
    setDialogSecoes(true);

    try {
      // Carregar seções atuais da empresa
      const { data: empresaSecoes } = await supabase
        .from('empresa_secoes')
        .select('secao_id, ativo')
        .eq('empresa_id', empresaId);

      if (empresaSecoes && empresaSecoes.length > 0) {
        const ativos = new Set(
          empresaSecoes.filter((s: any) => s.ativo).map((s: any) => s.secao_id)
        );
        setSecoesSelecionadas(ativos);
      } else {
        // Padrão: todas selecionadas
        setSecoesSelecionadas(new Set(secoesDisponiveis.map((s: any) => s.id)));
      }

      // Carregar dados da empresa (segmento e nome_marca)
      const { data: empresa } = await supabase
        .from('empresas')
        .select('segmento_id, nome_marca')
        .eq('id', empresaId)
        .single();

      if (empresa) {
        setSegmentoId(empresa.segmento_id || '');
        setNomeMarca(empresa.nome_marca || '');
      }
    } catch (error) {
      console.error('Erro ao carregar seções:', error);
      toast({ variant: 'destructive', title: 'Erro ao carregar configurações de seções' });
    } finally {
      setLoadingSecoes(false);
    }
  };

  // Salvar seções
  const handleSalvarSecoes = async () => {
    if (!empresaSecoesId) return;

    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // Salvar seções
      const secoesToSave = secoesDisponiveis.map((secao: any) => ({
        empresa_id: empresaSecoesId,
        secao_id: secao.id,
        ativo: secoesSelecionadas.has(secao.id),
      }));

      await supabase.from('empresa_secoes').delete().eq('empresa_id', empresaSecoesId);

      if (secoesToSave.length > 0) {
        await supabase.from('empresa_secoes').insert(secoesToSave);
      }

      // Salvar segmento_id e nome_marca na empresa
      await supabase
        .from('empresas')
        .update({
          segmento_id: segmentoId || null,
          nome_marca: nomeMarca || null,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', empresaSecoesId);

      toast({ title: 'Configurações salvas!', description: 'Seções e segmento atualizados com sucesso.' });
      setDialogSecoes(false);
    } catch (error: any) {
      console.error('Erro ao salvar seções:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['master']}>
        <MainLayout breadcrumbs={[{ title: 'Master' }, { title: 'Clientes' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  // Contar clientes vencendo em breve
  const clientesVencendoEmBreve = clienteComAdmin.filter(c => isVencendoEmBreve(c.validade));
  const clientesVencidos = clienteComAdmin.filter(c => isVencido(c.validade));

  return (
    <ProtectedRoute allowedRoles={['master']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Master' },
          { title: 'Clientes' },
        ]}
      >
        <div className="space-y-6">
          {/* Alertas de expiração */}
          {clientesVencidos.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-800">
                      {clientesVencidos.length} cliente(s) com assinatura vencida!
                    </p>
                    <p className="text-sm text-red-700">
                      {clientesVencidos.map(c => c.nome).join(', ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {clientesVencendoEmBreve.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-800">
                      {clientesVencendoEmBreve.length} cliente(s) vencendo em até 3 dias
                    </p>
                    <p className="text-sm text-yellow-700">
                      {clientesVencendoEmBreve.map(c => `${c.nome} (${formatDate(c.validade)})`).join(', ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Gestão de Clientes</h1>
              <p className="text-muted-foreground">
                Gerencie todas as empresas cadastradas no sistema
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setCnpjValue('');
                setTelefoneValue('');
                setCepValue('');
                setDataInicioValue('');
                setValidadeValue('');
                setSegmentoId('');
                setNomeMarca('');
              } else {
                setSegmentoId('');
                setNomeMarca('');
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                  <DialogDescription>
                    Preencha os dados da empresa e do administrador
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSalvar}>
                  <div className="space-y-6 py-4">
                    {/* Dados da Empresa */}
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        📋 Dados da Empresa
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nome">Nome da Empresa *</Label>
                          <Input id="nome" name="nome" placeholder="Ex: Café Central" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cnpj">CNPJ</Label>
                          <Input 
                            id="cnpj" 
                            name="cnpj" 
                            placeholder="00.000.000/0000-00"
                            value={cnpjValue}
                            onChange={(e) => setCnpjValue(maskCNPJ(e.target.value))}
                            maxLength={18}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email da Empresa *</Label>
                          <Input id="email" name="email" type="email" placeholder="contato@empresa.com" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefone">Telefone</Label>
                          <Input 
                            id="telefone" 
                            name="telefone" 
                            placeholder="(00) 00000-0000"
                            value={telefoneValue}
                            onChange={(e) => setTelefoneValue(maskPhone(e.target.value))}
                            maxLength={15}
                          />
                        </div>
                      </div>
                      
                      {/* Endereço */}
                      <div className="space-y-2">
                        <Label htmlFor="logradouro">Logradouro</Label>
                        <Input id="logradouro" name="logradouro" placeholder="Rua, Avenida, etc." />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="numero">Número</Label>
                          <Input id="numero" name="numero" placeholder="123" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="complemento">Complemento</Label>
                          <Input id="complemento" name="complemento" placeholder="Sala 1" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bairro">Bairro</Label>
                          <Input id="bairro" name="bairro" placeholder="Centro" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cep">CEP</Label>
                          <Input 
                            id="cep" 
                            name="cep" 
                            placeholder="00000-000"
                            value={cepValue}
                            onChange={(e) => setCepValue(maskCEP(e.target.value))}
                            maxLength={9}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cidade">Cidade</Label>
                          <Input id="cidade" name="cidade" placeholder="São Paulo" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="estado">Estado</Label>
                          <Select name="estado">
                            <SelectTrigger>
                              <SelectValue placeholder="UF" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AC">Acre</SelectItem>
                              <SelectItem value="AL">Alagoas</SelectItem>
                              <SelectItem value="AP">Amapá</SelectItem>
                              <SelectItem value="AM">Amazonas</SelectItem>
                              <SelectItem value="BA">Bahia</SelectItem>
                              <SelectItem value="CE">Ceará</SelectItem>
                              <SelectItem value="DF">Distrito Federal</SelectItem>
                              <SelectItem value="ES">Espírito Santo</SelectItem>
                              <SelectItem value="GO">Goiás</SelectItem>
                              <SelectItem value="MA">Maranhão</SelectItem>
                              <SelectItem value="MT">Mato Grosso</SelectItem>
                              <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                              <SelectItem value="MG">Minas Gerais</SelectItem>
                              <SelectItem value="PA">Pará</SelectItem>
                              <SelectItem value="PB">Paraíba</SelectItem>
                              <SelectItem value="PR">Paraná</SelectItem>
                              <SelectItem value="PE">Pernambuco</SelectItem>
                              <SelectItem value="PI">Piauí</SelectItem>
                              <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                              <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                              <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                              <SelectItem value="RO">Rondônia</SelectItem>
                              <SelectItem value="RR">Roraima</SelectItem>
                              <SelectItem value="SC">Santa Catarina</SelectItem>
                              <SelectItem value="SP">São Paulo</SelectItem>
                              <SelectItem value="SE">Sergipe</SelectItem>
                              <SelectItem value="TO">Tocantins</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Datas e Valor */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="valorMensal">Valor Mensal (R$) *</Label>
                          <Input
                            id="valorMensal"
                            name="valorMensal"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={valorMensalValue}
                            onChange={(e) => setValorMensalValue(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dataInicio">Data de Início</Label>
                          <Input
                            id="dataInicio"
                            name="dataInicio"
                            type="date"
                            value={dataInicioValue}
                            onChange={(e) => setDataInicioValue(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="validade">Data de Expiração *</Label>
                          <Input
                            id="validade"
                            name="validade"
                            type="date"
                            value={validadeValue}
                            onChange={(e) => setValidadeValue(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Segmento e Nome da Marca */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Segmento</Label>
                          <Select value={segmentoId} onValueChange={(val) => {
                            setSegmentoId(val);
                            const seg = segmentos.find((s: any) => s.id === val);
                            if (seg) setNomeMarca(seg.nome_marca || '');
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um segmento" />
                            </SelectTrigger>
                            <SelectContent>
                              {segmentos.map((seg: any) => (
                                <SelectItem key={seg.id} value={seg.id}>
                                  {seg.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Nome da Marca (no menu do admin)</Label>
                          <Input
                            placeholder="Ex: Gestão Café (deixe vazio para usar o padrão do segmento)"
                            value={nomeMarca}
                            onChange={(e) => setNomeMarca(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Dados do Administrador */}
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Dados do Administrador
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Este usuário terá acesso completo ao painel administrativo da empresa.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="admin_nome">Nome do Administrador *</Label>
                          <Input id="admin_nome" name="admin_nome" placeholder="Ex: João Silva" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="admin_email">Email do Administrador *</Label>
                          <Input id="admin_email" name="admin_email" type="email" placeholder="admin@empresa.com" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="admin_senha">Senha *</Label>
                          <Input id="admin_senha" name="admin_senha" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="admin_senha_conf">Confirmar Senha *</Label>
                          <Input id="admin_senha_conf" name="admin_senha_conf" type="password" placeholder="Repita a senha" required minLength={6} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => {
                      setDialogOpen(false);
                      setCnpjValue('');
                      setTelefoneValue('');
                      setCepValue('');
                      setDataInicioValue('');
                      setValidadeValue('');
                      setSegmentoId('');
                      setNomeMarca('');
                    }}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Cadastrar Cliente
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, CNPJ ou email do admin..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {filteredClientes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Search className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum cliente encontrado</p>
                <p className="text-sm text-muted-foreground">Clique em "Novo Cliente" para adicionar</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Clientes ({filteredClientes.length})</CardTitle>
                <CardDescription>
                  Lista de todas as empresas cadastradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead>Valor Mensal</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientes.map((cliente) => (
                        <TableRow key={cliente.id} className={isVencido(cliente.validade) ? 'bg-red-50' : isVencendoEmBreve(cliente.validade) ? 'bg-yellow-50' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold">
                                {cliente.nome.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{cliente.nome}</p>
                                  {cliente.segmentoNome && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700">
                                      {cliente.segmentoNome}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{cliente.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{cliente.adminNome}</p>
                              <p className="text-sm text-muted-foreground">{cliente.adminEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>{cliente.cidade || '-'}/{cliente.estado || '-'}</TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-700">
                              {formatCurrency(cliente.valorMensal)}
                            </span>
                            <span className="text-xs text-muted-foreground">/mês</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className={isVencido(cliente.validade) ? 'text-red-600 font-medium' : isVencendoEmBreve(cliente.validade) ? 'text-yellow-600 font-medium' : ''}>
                                {formatDate(cliente.validade)}
                              </span>
                              {isVencido(cliente.validade) && (
                                <Badge variant="destructive" className="text-xs">Vencido</Badge>
                              )}
                              {isVencendoEmBreve(cliente.validade) && !isVencido(cliente.validade) && (
                                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">Vence em breve</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusCores[cliente.status || ''] || 'bg-gray-500'}>
                              {(cliente.status?.charAt(0).toUpperCase() || '') + (cliente.status?.slice(1) || '') || 'Indefinido'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openViewDialog(cliente)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(cliente)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAbrirSecoes(cliente.id)}>
                                  <LayoutGrid className="mr-2 h-4 w-4" />
                                  Seções
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openResetPasswordDialog(cliente)}>
                                  <KeyRound className="mr-2 h-4 w-4" />
                                  Redefinir Senha
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openSyncAdminDialog(cliente)}>
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Sincronizar Admin
                                </DropdownMenuItem>
                                {(isVencendoEmBreve(cliente.validade) || isVencido(cliente.validade)) && (
                                  <DropdownMenuItem onClick={() => handleEnviarNotificacao(cliente)}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Enviar Notificação
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {cliente.status === 'ativo' ? (
                                  <DropdownMenuItem 
                                    className="text-yellow-600"
                                    onClick={() => atualizarEmpresa(cliente.id, { status: 'bloqueado' })}
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Bloquear
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    className="text-green-600"
                                    onClick={() => atualizarEmpresa(cliente.id, { status: 'ativo' })}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Ativar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedCliente(cliente);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog Visualizar */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalhes do Cliente
              </DialogTitle>
            </DialogHeader>
            {selectedCliente && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedCliente.nome.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedCliente.nome}</h3>
                    <p className="text-muted-foreground">{selectedCliente.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">CNPJ</Label>
                    <p className="font-medium">{formatCNPJ(selectedCliente.cnpj || '') || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{formatPhone(selectedCliente.telefone || '') || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cidade</Label>
                    <p className="font-medium">{selectedCliente.cidade || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    <p className="font-medium">{selectedCliente.estado || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Início</Label>
                    <p className="font-medium">{formatDate(selectedCliente.dataInicio)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Expiração</Label>
                    <p className={`font-medium ${isVencido(selectedCliente.validade) ? 'text-red-600' : isVencendoEmBreve(selectedCliente.validade) ? 'text-yellow-600' : ''}`}>
                      {formatDate(selectedCliente.validade)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor Mensal</Label>
                    <p className="font-medium text-green-700">
                      {formatCurrency(selectedCliente.valorMensal)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="font-medium">
                      <Badge className={statusCores[selectedCliente.status || ''] || 'bg-gray-500'}>
                        {(selectedCliente.status?.charAt(0).toUpperCase() || '') + (selectedCliente.status?.slice(1) || '') || 'Indefinido'}
                      </Badge>
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Administrador
                  </Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="font-medium">{selectedCliente.adminNome}</p>
                    <p className="text-sm text-muted-foreground">{selectedCliente.adminEmail}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Fechar
              </Button>
              <Button onClick={() => {
                setViewDialogOpen(false);
                if (selectedCliente) openEditDialog(selectedCliente);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Editar */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Cliente
              </DialogTitle>
              <DialogDescription>
                Altere os dados da empresa e do administrador
              </DialogDescription>
            </DialogHeader>
            {selectedCliente && (
              <form onSubmit={handleEditar}>
                <div className="space-y-6 py-4">
                  {/* Dados da Empresa */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Dados da Empresa
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_nome">Nome da Empresa *</Label>
                        <Input 
                          id="edit_nome" 
                          name="nome" 
                          defaultValue={selectedCliente.nome}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_cnpj">CNPJ</Label>
                        <Input 
                          id="edit_cnpj" 
                          name="cnpj" 
                          placeholder="00.000.000/0000-00"
                          value={editCnpjValue}
                          onChange={(e) => setEditCnpjValue(maskCNPJ(e.target.value))}
                          maxLength={18}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_email">Email da Empresa *</Label>
                        <Input 
                          id="edit_email" 
                          name="email" 
                          type="email" 
                          defaultValue={selectedCliente.email}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_telefone">Telefone</Label>
                        <Input 
                          id="edit_telefone" 
                          name="telefone" 
                          placeholder="(00) 00000-0000"
                          value={editTelefoneValue}
                          onChange={(e) => setEditTelefoneValue(maskPhone(e.target.value))}
                          maxLength={15}
                        />
                      </div>
                    </div>
                    
                    {/* Endereço */}
                    <div className="space-y-2">
                      <Label htmlFor="edit_logradouro">Logradouro</Label>
                      <Input id="edit_logradouro" name="logradouro" defaultValue={selectedCliente.logradouro} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_numero">Número</Label>
                        <Input id="edit_numero" name="numero" defaultValue={selectedCliente.numero} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_complemento">Complemento</Label>
                        <Input id="edit_complemento" name="complemento" defaultValue={selectedCliente.complemento} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_bairro">Bairro</Label>
                        <Input id="edit_bairro" name="bairro" defaultValue={selectedCliente.bairro} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_cep">CEP</Label>
                        <Input 
                          id="edit_cep" 
                          name="cep" 
                          value={editCepValue}
                          onChange={(e) => setEditCepValue(maskCEP(e.target.value))}
                          maxLength={9}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_cidade">Cidade</Label>
                        <Input id="edit_cidade" name="cidade" defaultValue={selectedCliente.cidade} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_estado">Estado</Label>
                        <Select name="estado" defaultValue={selectedCliente.estado}>
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SP">São Paulo</SelectItem>
                            <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                            <SelectItem value="MG">Minas Gerais</SelectItem>
                            <SelectItem value="PR">Paraná</SelectItem>
                            <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Datas e Valor */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_valorMensal">Valor Mensal (R$) *</Label>
                        <Input
                          id="edit_valorMensal"
                          name="valorMensal"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={editValorMensalValue}
                          onChange={(e) => setEditValorMensalValue(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_dataInicio">Data de Início</Label>
                        <Input
                          id="edit_dataInicio"
                          name="dataInicio"
                          type="date"
                          value={editDataInicioValue}
                          onChange={(e) => setEditDataInicioValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_validade">Data de Expiração *</Label>
                        <Input
                          id="edit_validade" 
                          name="validade" 
                          type="date"
                          value={editValidadeValue}
                          onChange={(e) => setEditValidadeValue(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Dados do Administrador */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Dados do Administrador
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_admin_nome">Nome do Administrador</Label>
                        <Input 
                          id="edit_admin_nome" 
                          name="admin_nome" 
                          value={editAdminNome}
                          onChange={(e) => setEditAdminNome(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_admin_email">Email do Administrador</Label>
                        <Input 
                          id="edit_admin_email" 
                          name="admin_email" 
                          type="email" 
                          value={editAdminEmail}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Para alterar a senha, use a opção &quot;Redefinir Senha&quot; no menu de ações do cliente.
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar Alterações
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog Resetar Senha */}
        <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Redefinir Senha
              </DialogTitle>
              <DialogDescription>
                Defina uma nova senha para o administrador {selectedCliente?.adminNome}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">Nova Senha</Label>
                <Input 
                  id="new_password" 
                  type="password" 
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar Senha</Label>
                <Input 
                  id="confirm_password" 
                  type="password" 
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleResetPassword} disabled={resettingPassword}>
                {resettingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Redefinir Senha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Excluir Cliente */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Excluir Cliente
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o cliente <strong>{selectedCliente?.nome}</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita. Todos os dados da empresa serão excluídos, incluindo:
                </p>
                <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                  <li>Dados da empresa</li>
                  <li>Usuários administradores</li>
                  <li>Produtos e categorias</li>
                  <li>Vendas e histórico</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  if (!selectedCliente) return;
                  setDeleting(true);
                  try {
                    await excluirEmpresa(selectedCliente.id);
                    toast({
                      title: 'Cliente excluído!',
                      description: `${selectedCliente.nome} foi removido do sistema.`,
                    });
                    setDeleteDialogOpen(false);
                    setSelectedCliente(null);
                  } catch (error) {
                    console.error('Erro ao excluir:', error);
                    toast({
                      variant: 'destructive',
                      title: 'Erro ao excluir',
                      description: 'Não foi possível excluir o cliente.',
                    });
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Excluir Cliente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Sincronizar Admin */}
        <Dialog open={syncAdminDialogOpen} onOpenChange={setSyncAdminDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Sincronizar Admin
              </DialogTitle>
              <DialogDescription>
                Crie credenciais de login para o administrador <strong>{selectedCliente?.adminNome}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Info:</strong> Use esta opção quando o admin foi cadastrado mas não consegue fazer login.
                  Isso cria as credenciais no Supabase Auth.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Email do Admin</Label>
                <Input value={selectedCliente?.adminEmail || ''} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sync_senha">Nova Senha *</Label>
                <Input
                  id="sync_senha"
                  type="password"
                  value={syncSenha}
                  onChange={(e) => setSyncSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Esta será a senha que o admin usará para fazer login.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSyncAdminDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSyncAdmin} disabled={syncingAdmin}>
                {syncingAdmin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sincronizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Configurar Seções */}
        <Dialog open={dialogSecoes} onOpenChange={setDialogSecoes}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Configurar Seções
              </DialogTitle>
              <DialogDescription>
                Escolha quais seções do sistema serão liberadas para esta empresa.
              </DialogDescription>
            </DialogHeader>

            {loadingSecoes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6 py-4">
                {/* Segmento */}
                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Select value={segmentoId || '__nenhum__'} onValueChange={(val) => {
                    if (val === '__nenhum__') {
                      setSegmentoId('');
                      setNomeMarca('');
                    } else {
                      setSegmentoId(val);
                      const seg = segmentos.find((s: any) => s.id === val);
                      if (seg) setNomeMarca(seg.nome_marca || '');
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__nenhum__">Nenhum segmento</SelectItem>
                      {segmentos.map((seg: any) => (
                        <SelectItem key={seg.id} value={seg.id}>
                          {seg.nome} — {seg.nome_marca}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nome da Marca */}
                <div className="space-y-2">
                  <Label>Nome da Marca (no menu do admin)</Label>
                  <Input
                    placeholder="Ex: Gestão Café"
                    value={nomeMarca}
                    onChange={(e) => setNomeMarca(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se deixar vazio, usará o nome do segmento. Se não houver segmento, usará o padrão.
                  </p>
                </div>

                <Separator />

                {/* Grid de Seções */}
                {['principal', 'atalho_rapido'].map((grupo) => {
                  const grupoSecoes = secoesDisponiveis.filter((s: any) => s.grupo === grupo);
                  if (grupoSecoes.length === 0) return null;

                  return (
                    <div key={grupo}>
                      <h4 className="text-sm font-semibold mb-3">
                        {grupo === 'principal' ? '📋 Menu Principal' : '⚡ Atalho Rápido'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {grupoSecoes.map((secao: any) => (
                          <div
                            key={secao.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                              secoesSelecionadas.has(secao.id) ? 'border-blue-300 bg-blue-50' : 'border-muted'
                            } ${secao.obrigatoria ? 'opacity-80' : 'cursor-pointer'}`}
                            onClick={() => !secao.obrigatoria && toggleSecao(secao.id)}
                          >
                            <Checkbox
                              checked={secoesSelecionadas.has(secao.id)}
                              disabled={secao.obrigatoria}
                              onCheckedChange={() => toggleSecao(secao.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{secao.nome}</span>
                                {secao.obrigatoria && (
                                  <Badge variant="secondary" className="text-[10px] px-1">Obrigatória</Badge>
                                )}
                              </div>
                              {secao.descricao && (
                                <p className="text-xs text-muted-foreground">{secao.descricao}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogSecoes(false)}>Cancelar</Button>
              <Button onClick={handleSalvarSecoes} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
