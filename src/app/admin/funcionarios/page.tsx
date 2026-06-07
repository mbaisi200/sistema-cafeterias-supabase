'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { useFuncionarios } from '@/hooks/useSupabase';
import { getSupabaseClient } from '@/lib/supabase';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  UserCheck,
  UserX,
  Key,
  Copy,
  Check,
  Download,
  ChevronLeft,
  Monitor,
  Smartphone,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { maskPhone, unmask } from '@/lib/masks';
import { useAuth } from '@/contexts/AuthContext';
import { exportToPDF, fetchEmpresaPDFData } from '@/lib/export-pdf';

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  email?: string;
  telefone?: string;
  pin: string;
  perm_pdv?: boolean;
  perm_pdv_garcom?: boolean;
  perm_estoque?: boolean;
  perm_financeiro?: boolean;
  perm_relatorios?: boolean;
  perm_cancelar_venda?: boolean;
  perm_dar_desconto?: boolean;
  ativo: boolean;
  usuario_id?: string;
}

interface Dispositivo {
  id: string;
  usuario_id: string | null;
  device_name: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export default function FuncionariosPage() {
  const { funcionarios, loading, adicionarFuncionario, atualizarFuncionario, excluirFuncionario, hardDeleteFuncionario } = useFuncionarios();
  const { user: currentUser, empresaId } = useAuth();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [telefoneValue, setTelefoneValue] = useState('');
  const [editandoFuncionario, setEditandoFuncionario] = useState<Funcionario | null>(null);
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [copied, setCopied] = useState(false);
  const [devices, setDevices] = useState<Dispositivo[]>([]);
  const { toast } = useToast();

  // CEP / Endereço states
  const [cepFunc, setCepFunc] = useState('');
  const [logradouroFunc, setLogradouroFunc] = useState('');
  const [numeroFunc, setNumeroFunc] = useState('');
  const [bairroFunc, setBairroFunc] = useState('');
  const [cidadeFunc, setCidadeFunc] = useState('');
  const [estadoFunc, setEstadoFunc] = useState('');
  const [buscandoCEPFunc, setBuscandoCEPFunc] = useState(false);
  const cepTimerFuncRef = useRef<NodeJS.Timeout | null>(null);

  const mascaraCEP = (valor: string) => valor.replace(/\D/g, '').replace(/(\d{5})(\d{0,3})/, '$1-$2');

  const buscarCEP = useCallback(async (cepLimpo: string) => {
    if (cepLimpo.length !== 8) return;
    setBuscandoCEPFunc(true);
    try {
      const res = await fetch(`/api/cep/${cepLimpo}`);
      const data = await res.json();
      if (!data.sucesso) {
        toast({ variant: 'destructive', title: 'CEP não encontrado' });
        return;
      }
      setLogradouroFunc(data.logradouro || '');
      setBairroFunc(data.bairro || '');
      setCidadeFunc(data.localidade || '');
      setEstadoFunc(data.uf || '');
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP' });
    } finally {
      setBuscandoCEPFunc(false);
    }
  }, [toast]);

  // Efeito para buscar CEP automaticamente
  useEffect(() => {
    if (cepTimerFuncRef.current) clearTimeout(cepTimerFuncRef.current);
    const cepLimpo = cepFunc.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      cepTimerFuncRef.current = setTimeout(() => buscarCEP(cepLimpo), 500);
    }
    return () => {
      if (cepTimerFuncRef.current) clearTimeout(cepTimerFuncRef.current);
    };
  }, [cepFunc, buscarCEP]);

  useEffect(() => {
    if (empresaId) {
      setCodigoEmpresa(empresaId.substring(0, 8).toUpperCase());
    }
  }, [empresaId]);

  useEffect(() => {
    const fetchDevices = async () => {
      if (!empresaId) return;
      try {
        const response = await fetch('/api/dispositivos');
        const data = await response.json();
        if (data.devices) setDevices(data.devices);
      } catch (error) {
        console.error('Erro ao buscar dispositivos:', error);
      }
    };
    fetchDevices();
  }, [empresaId]);

  const getDispositivosFuncionario = (funcionarioId: string) => {
    return devices.filter(d => d.usuario_id === funcionarioId);
  };

  const filteredFuncionarios = funcionarios.filter(func => {
    const matchSearch = func.nome.toLowerCase().includes(search.toLowerCase()) ||
      (func.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      func.cargo.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = statusFilter === 'todos' || 
      (statusFilter === 'ativos' && func.ativo) ||
      (statusFilter === 'inativos' && !func.ativo);
    
    return matchSearch && matchStatus;
  });

  const contarPorStatus = {
    ativos: funcionarios.filter(f => f.ativo).length,
    inativos: funcionarios.filter(f => !f.ativo).length,
  };

  // Resetar formulário quando fechar dialog
  useEffect(() => {
    if (!dialogOpen) {
      setTelefoneValue('');
      setCepFunc('');
      setLogradouroFunc('');
      setNumeroFunc('');
      setBairroFunc('');
      setCidadeFunc('');
      setEstadoFunc('');
      setEditandoFuncionario(null);
    }
  }, [dialogOpen]);

  // Preencher formulário quando editar
  useEffect(() => {
    if (editandoFuncionario) {
      setTelefoneValue(editandoFuncionario.telefone || '');
      setCepFunc(editandoFuncionario.cep || '');
      setLogradouroFunc(editandoFuncionario.logradouro || '');
      setNumeroFunc(editandoFuncionario.numero || '');
      setBairroFunc(editandoFuncionario.bairro || '');
      setCidadeFunc(editandoFuncionario.cidade || '');
      setEstadoFunc(editandoFuncionario.estado || '');
    }
  }, [editandoFuncionario]);

  // Gerar PIN aleatório
  const gerarPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 4 dígitos
  };

  // Copiar código da empresa
  const copiarCodigoEmpresa = () => {
    navigator.clipboard.writeText(codigoEmpresa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Código copiado!' });
  };

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      // Validar PIN
      const pin = formData.get('pin') as string;
      if (!/^\d{4,6}$/.test(pin)) {
        toast({
          variant: 'destructive',
          title: 'PIN inválido',
          description: 'O PIN deve ter entre 4 e 6 dígitos numéricos.',
        });
        setSaving(false);
        return;
      }

      if (editandoFuncionario) {
        // Modo edição - atualizar funcionário existente
        await atualizarFuncionario(editandoFuncionario.id, {
          nome: formData.get('nome') as string,
          cargo: formData.get('cargo') as string,
          telefone: unmask(telefoneValue),
          pin: pin,
          perm_pdv: formData.get('perm_pdv') === 'on',
          perm_pdv_garcom: formData.get('perm_pdv_garcom') === 'on',
          perm_estoque: formData.get('perm_estoque') === 'on',
          perm_financeiro: formData.get('perm_financeiro') === 'on',
          perm_relatorios: formData.get('perm_relatorios') === 'on',
          perm_cancelar_venda: formData.get('perm_cancelar') === 'on',
          perm_dar_desconto: formData.get('perm_desconto') === 'on',
          ativo: formData.get('ativo') === 'on',
          cep: cepFunc || null,
          logradouro: logradouroFunc || null,
          numero: (formData.get('numero') as string) || null,
          bairro: bairroFunc || null,
          cidade: cidadeFunc || null,
          estado: estadoFunc || null,
        });

        toast({
          title: 'Funcionário atualizado!',
          description: 'Os dados foram salvos com sucesso.',
        });
      } else {
        // Modo criação - criar novo funcionário SEM Firebase Auth
        if (!empresaId) {
          toast({
            variant: 'destructive',
            title: 'Erro de configuração',
            description: 'Seu usuário não está associado a uma empresa. Contate o administrador.',
          });
          setSaving(false);
          return;
        }

        // Criar documento do funcionário diretamente no Firestore
        await adicionarFuncionario({
          nome: formData.get('nome') as string,
          cargo: formData.get('cargo') as string,
          telefone: unmask(telefoneValue),
          pin: pin,
          perm_pdv: formData.get('perm_pdv') === 'on',
          perm_pdv_garcom: formData.get('perm_pdv_garcom') === 'on',
          perm_estoque: formData.get('perm_estoque') === 'on',
          perm_financeiro: formData.get('perm_financeiro') === 'on',
          perm_relatorios: formData.get('perm_relatorios') === 'on',
          perm_cancelar_venda: formData.get('perm_cancelar') === 'on',
          perm_dar_desconto: formData.get('perm_desconto') === 'on',
          ativo: formData.get('ativo') === 'on',
          cep: cepFunc || null,
          logradouro: logradouroFunc || null,
          numero: (formData.get('numero') as string) || null,
          bairro: bairroFunc || null,
          cidade: cidadeFunc || null,
          estado: estadoFunc || null,
        });

        toast({
          title: 'Funcionário cadastrado!',
          description: `PIN de acesso: ${pin}. Anote e entregue ao funcionário.`,
        });
      }

      setDialogOpen(false);
      setTelefoneValue('');
      setEditandoFuncionario(null);
    } catch (error: unknown) {
      console.error('Erro ao salvar funcionário:', error);
      let mensagem = 'Erro ao salvar funcionário';
      if (error instanceof Error) {
        mensagem = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: mensagem,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (funcionario: Funcionario) => {
    setEditandoFuncionario(funcionario);
    setDialogOpen(true);
  };

  const handleToggleAtivo = async (funcionario: Funcionario) => {
    try {
      await atualizarFuncionario(funcionario.id, { ativo: !funcionario.ativo });

      toast({
        title: funcionario.ativo ? 'Funcionário inativado' : 'Funcionário ativado',
        description: funcionario.ativo 
          ? 'O funcionário não poderá mais acessar o sistema.'
          : 'O funcionário pode acessar o sistema novamente.',
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
      });
    }
  };

  const [excluirTarget, setExcluirTarget] = useState<Funcionario | null>(null);
  const [vinculosCheckDialog, setVinculosCheckDialog] = useState(false);
  const [checkingVinculosFunc, setCheckingVinculosFunc] = useState(false);
  const [hasVinculosFunc, setHasVinculosFunc] = useState(false);

  const handleExcluirClick = async (funcionario: Funcionario) => {
    setExcluirTarget(funcionario);
    setCheckingVinculosFunc(true);
    setHasVinculosFunc(false);
    setVinculosCheckDialog(true);
    try {
      const supabase = getSupabaseClient();
      const atendenteId = funcionario.usuario_id;

      const [{ count: countVendas }, { count: countPedidosTemp }] = await Promise.all([
        supabase
          .from('vendas')
          .select('*', { count: 'exact', head: true })
          .eq('funcionario_id', funcionario.id)
          .not('status', 'eq', 'cancelada'),
        ...(atendenteId ? [supabase
          .from('pedidos_temp')
          .select('*', { count: 'exact', head: true })
          .eq('atendente_id', atendenteId)] : [{ count: 0 }]),
      ]);

      setHasVinculosFunc((countVendas || 0) > 0 || (countPedidosTemp || 0) > 0);
    } catch {
      setHasVinculosFunc(true);
    } finally {
      setCheckingVinculosFunc(false);
    }
  };

  const confirmExcluirFuncionario = async () => {
    if (!excluirTarget) return;
    try {
      if (hasVinculosFunc) {
        await excluirFuncionario(excluirTarget.id);
        toast({ title: 'Funcionário inativado', description: 'Funcionário possui registros vinculados. Inativado para preservar histórico.' });
      } else {
        await hardDeleteFuncionario(excluirTarget.id);
        toast({ title: 'Funcionário excluído', description: 'Registro removido permanentemente.' });
      }
      setVinculosCheckDialog(false);
      setExcluirTarget(null);
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir.' });
    }
  };

  // Função para formatar telefone para exibição
  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (numbers.length === 10) {
      return numbers.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return phone;
  };

  // Mascarar PIN para exibição
  const maskPin = (pin: string) => {
    return '•'.repeat(pin.length);
  };

  // Função para obter permissões como texto
  const getPermissoes = (func: Funcionario) => {
    const permissoes: string[] = [];
    if (func.perm_pdv) permissoes.push('PDV');
    if (func.perm_pdv_garcom) permissoes.push('PDV Garçom');
    if (func.perm_estoque) permissoes.push('Estoque');
    if (func.perm_financeiro) permissoes.push('Financeiro');
    if (func.perm_relatorios) permissoes.push('Relatórios');
    if (func.perm_cancelar_venda) permissoes.push('Cancelar Venda');
    if (func.perm_dar_desconto) permissoes.push('Dar Desconto');
    return permissoes.length > 0 ? permissoes.join(', ') : 'Nenhuma';
  };

  const handleExportPDF = async () => {
    const empresaInfo = await fetchEmpresaPDFData(empresaId);
    exportToPDF({

      title: 'Relatório de Funcionários',
      columns: [
        { header: 'Funcionário', accessor: (row) => row.nome, width: 40 },
        { header: 'Cargo', accessor: (row) => row.cargo, width: 30 },
        { header: 'Contato', accessor: (row) => row.telefone || row.email || '-', width: 35 },
        { header: 'Permissões', accessor: (row) => getPermissoes(row) },
        { header: 'Status', accessor: (row) => (row.ativo ? 'Ativo' : 'Inativo'), width: 20 },
      ],
      data: filteredFuncionarios,
      filename: 'funcionarios',
      orientation: 'landscape',
      summary: [
        { label: 'Total de funcionários', value: filteredFuncionarios.length },
        { label: 'Ativos', value: filteredFuncionarios.filter(f => f.ativo).length },
        { label: 'Inativos', value: filteredFuncionarios.filter(f => !f.ativo).length },
      ],
      ...empresaInfo,
    });
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Funcionários' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Admin' },
          { title: 'Funcionários' },
        ]}
      >
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
                <h1 className="text-3xl font-bold">Funcionários</h1>
                <p className="text-muted-foreground">
                  Gerencie a equipe do seu estabelecimento
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExportPDF} disabled={filteredFuncionarios.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setEditandoFuncionario(null);
                  setTelefoneValue('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Funcionário
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editandoFuncionario ? 'Editar Funcionário' : 'Cadastrar Funcionário'}
                </DialogTitle>
                <DialogDescription>
                  {editandoFuncionario 
                    ? 'Atualize os dados do funcionário'
                    : 'Cadastre um funcionário com PIN de acesso. Ele não precisa de email nem senha.'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSalvar}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome Completo</Label>
                      <Input 
                        id="nome" 
                        name="nome" 
                        placeholder="Nome do funcionário" 
                        required 
                        defaultValue={editandoFuncionario?.nome || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cargo">Cargo</Label>
                      <Input 
                        id="cargo" 
                        name="cargo" 
                        placeholder="Ex: Garçom, Atendente" 
                        required 
                        defaultValue={editandoFuncionario?.cargo || ''}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone (opcional)</Label>
                      <Input 
                        id="telefone" 
                        name="telefone" 
                        placeholder="(00) 00000-0000"
                        value={telefoneValue}
                        onChange={(e) => setTelefoneValue(maskPhone(e.target.value))}
                        maxLength={15}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (opcional)</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        placeholder="Para contato apenas" 
                        defaultValue={editandoFuncionario?.email || ''}
                      />
                    </div>
                  </div>

                  {/* Endereço (opcional) */}
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <Label className="flex items-center gap-2 text-sm font-medium mb-3">
                      Endereço <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cep-func" className="text-xs">CEP</Label>
                        <div className="relative">
                          <Input
                            id="cep-func"
                            placeholder="00000-000"
                            value={cepFunc}
                            onChange={(e) => setCepFunc(mascaraCEP(e.target.value))}
                            maxLength={9}
                          />
                          {buscandoCEPFunc && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div className="space-y-2">
                        <Label htmlFor="logradouro-func" className="text-xs">Logradouro</Label>
                        <Input
                          id="logradouro-func"
                          placeholder="Rua, Avenida..."
                          value={logradouroFunc}
                          onChange={(e) => setLogradouroFunc(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numero-func" className="text-xs">Número</Label>
                        <Input
                          id="numero-func"
                          name="numero"
                          placeholder="Nº"
                          defaultValue={editandoFuncionario?.numero || ''}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div className="space-y-2">
                        <Label htmlFor="bairro-func" className="text-xs">Bairro</Label>
                        <Input
                          id="bairro-func"
                          placeholder="Bairro"
                          value={bairroFunc}
                          onChange={(e) => setBairroFunc(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cidade-func" className="text-xs">Cidade</Label>
                        <Input
                          id="cidade-func"
                          placeholder="Cidade"
                          value={cidadeFunc}
                          onChange={(e) => setCidadeFunc(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estado-func" className="text-xs">Estado</Label>
                        <Input
                          id="estado-func"
                          placeholder="UF"
                          maxLength={2}
                          value={estadoFunc}
                          onChange={(e) => setEstadoFunc(e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campo de PIN */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="pin" className="flex items-center gap-2 text-green-800">
                        <Key className="h-4 w-4" />
                        PIN de Acesso *
                      </Label>
                      {!editandoFuncionario && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const pinInput = document.getElementById('pin') as HTMLInputElement;
                            if (pinInput) {
                              pinInput.value = gerarPin();
                            }
                          }}
                        >
                          Gerar PIN
                        </Button>
                      )}
                    </div>
                    <Input 
                      id="pin" 
                      name="pin" 
                      type="text"
                      inputMode="numeric"
                      placeholder="4 a 6 dígitos" 
                      required 
                      minLength={4}
                      maxLength={6}
                      defaultValue={editandoFuncionario?.pin || ''}
                      className="text-center text-2xl tracking-widest bg-white"
                      onChange={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      }}
                    />
                    <p className="text-xs text-green-600 mt-2">
                      {editandoFuncionario 
                        ? 'Deixe o PIN atual para manter, ou altere para um novo.'
                        : 'Este PIN será usado pelo funcionário para fazer login no sistema.'
                      }
                    </p>
                  </div>
                    
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Permissões de Acesso
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_pdv" className="text-sm font-medium">Acesso ao PDV</Label>
                          <p className="text-[11px] text-muted-foreground">Ponto de venda completo (balcão, mesa, delivery)</p>
                        </div>
                        <Switch 
                          id="perm_pdv" 
                          name="perm_pdv" 
                          defaultChecked={editandoFuncionario?.perm_pdv ?? true}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_pdv_garcom" className="text-sm font-medium">PDV Garçom (Mobile)</Label>
                          <p className="text-[11px] text-muted-foreground">App mobile para garçons tirarem pedidos</p>
                        </div>
                        <Switch 
                          id="perm_pdv_garcom" 
                          name="perm_pdv_garcom"
                          defaultChecked={editandoFuncionario?.perm_pdv_garcom ?? false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_estoque" className="text-sm font-medium">Controle de Estoque</Label>
                          <p className="text-[11px] text-muted-foreground">Gerenciar entradas, saídas e saldos</p>
                        </div>
                        <Switch 
                          id="perm_estoque" 
                          name="perm_estoque"
                          defaultChecked={editandoFuncionario?.perm_estoque ?? false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_financeiro" className="text-sm font-medium">Área Financeira</Label>
                          <p className="text-[11px] text-muted-foreground">Contas a pagar/receber e fluxo de caixa</p>
                        </div>
                        <Switch 
                          id="perm_financeiro" 
                          name="perm_financeiro"
                          defaultChecked={editandoFuncionario?.perm_financeiro ?? false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_relatorios" className="text-sm font-medium">Relatórios</Label>
                          <p className="text-[11px] text-muted-foreground">Acessar relatórios de vendas e BI</p>
                        </div>
                        <Switch 
                          id="perm_relatorios" 
                          name="perm_relatorios"
                          defaultChecked={editandoFuncionario?.perm_relatorios ?? false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_cancelar" className="text-sm font-medium">Cancelar Vendas</Label>
                          <p className="text-[11px] text-muted-foreground">Permite cancelar vendas já realizadas</p>
                        </div>
                        <Switch 
                          id="perm_cancelar" 
                          name="perm_cancelar"
                          defaultChecked={editandoFuncionario?.perm_cancelar_venda ?? false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="perm_desconto" className="text-sm font-medium">Dar Descontos</Label>
                          <p className="text-[11px] text-muted-foreground">Aplicar descontos em itens do pedido</p>
                        </div>
                        <Switch 
                          id="perm_desconto" 
                          name="perm_desconto"
                          defaultChecked={editandoFuncionario?.perm_dar_desconto ?? false}
                        />
                      </div>
                    </div>
                  </div>
                    
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="ativo" 
                      name="ativo" 
                      defaultChecked={editandoFuncionario?.ativo ?? true}
                    />
                    <Label htmlFor="ativo">Funcionário Ativo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => {
                    setDialogOpen(false);
                    setEditandoFuncionario(null);
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editandoFuncionario ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
            </div>
          </div>

          {/* Código da Empresa */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Código da Empresa</p>
                  <p className="text-xl font-bold text-blue-800 tracking-wider">{codigoEmpresa}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copiarCodigoEmpresa}
                  className="border-blue-300 hover:bg-blue-100"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-blue-500 mt-2">
                Compartilhe este código com seus funcionários para login
              </p>
            </CardContent>
          </Card>

          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, cargo..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={statusFilter === 'todos' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('todos')}
                    className={statusFilter === 'todos' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  >
                    Todos ({funcionarios.length})
                  </Button>
                  <Button
                    variant={statusFilter === 'ativos' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('ativos')}
                    className={statusFilter === 'ativos' ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Ativos ({contarPorStatus.ativos})
                  </Button>
                  <Button
                    variant={statusFilter === 'inativos' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('inativos')}
                    className={statusFilter === 'inativos' ? 'bg-gray-500 hover:bg-gray-600' : ''}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Inativos ({contarPorStatus.inativos})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {filteredFuncionarios.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Shield className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum funcionário encontrado</p>
                <p className="text-sm text-muted-foreground">Clique em "Novo Funcionário" para começar</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Funcionários ({filteredFuncionarios.length})</CardTitle>
                <CardDescription>
                  Funcionários acessam o sistema com código da empresa + PIN
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Funcionário</TableHead>
                        <TableHead className="w-32">Cargo</TableHead>
                        <TableHead className="w-36 hidden md:table-cell whitespace-nowrap">Contato</TableHead>
                        <TableHead className="w-28 whitespace-nowrap">Dispositivos</TableHead>
                          <TableHead className="hidden md:table-cell whitespace-nowrap">Permissões</TableHead>
                        <TableHead className="w-24 whitespace-nowrap">Status</TableHead>
                        <TableHead className="w-24 text-right whitespace-nowrap">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFuncionarios.map((func) => (
                        <TableRow key={func.id} className={!func.ativo ? 'opacity-60' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold">
                                {func.nome.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium truncate" title={func.nome}>{func.nome}</p>
                                {func.email && (
                                  <p className="text-sm text-muted-foreground truncate" title={func.email}>{func.email}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="truncate max-w-[120px]" title={func.cargo}>{func.cargo}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{formatPhone(func.telefone || '')}</TableCell>
                          <TableCell>
                            {(() => {
                              const funcDevices = getDispositivosFuncionario(func.id);
                              const ativosCount = funcDevices.filter(d => d.ativo).length;
                              const pendentesCount = funcDevices.filter(d => !d.ativo && d.criado_em === d.atualizado_em).length;
                              return (
                                <div className="flex items-center gap-2">
                                  <Link href="/admin/dispositivos">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Gerenciar dispositivos">
                                      <Monitor className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  {funcDevices.length > 0 ? (
                                    <div className="flex items-center gap-1">
                                      {ativosCount > 0 && (
                                        <Badge className="bg-green-500 text-xs gap-1">
                                          <Check className="h-3 w-3" />
                                          {ativosCount}
                                        </Badge>
                                      )}
                                      {pendentesCount > 0 && (
                                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs gap-1">
                                          <AlertTriangle className="h-3 w-3" />
                                          {pendentesCount}
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Sem acesso</span>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const perms: { key: string; label: string; color: string }[] = [
                                  { key: 'perm_pdv', label: 'PDV', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
                                  { key: 'perm_pdv_garcom', label: 'PDV Garçom', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
                                  { key: 'perm_estoque', label: 'Estoque', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
                                  { key: 'perm_financeiro', label: 'Financeiro', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
                                  { key: 'perm_cancelar_venda', label: 'Cancelar Venda', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
                                  { key: 'perm_dar_desconto', label: 'Dar Desconto', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
                                  { key: 'perm_relatorios', label: 'Relatórios', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
                                ];
                                const activePerms = perms.filter(p => (func as Record<string, boolean>)[p.key]);
                                return activePerms.length > 0 ? activePerms.map((perm, i) => (
                                  <span
                                    key={i}
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${perm.color}`}
                                  >
                                    {perm.label}
                                  </span>
                                )) : (
                                  <span className="text-xs text-muted-foreground">Nenhuma</span>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={func.ativo ? 'bg-green-500' : 'bg-gray-500'}>
                              {func.ativo ? 'Ativo' : 'Inativo'}
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
                                <DropdownMenuItem onClick={() => handleEditar(func)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleAtivo(func)}>
                                  {func.ativo ? (
                                    <>
                                      <UserX className="mr-2 h-4 w-4" />
                                      Inativar
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Ativar
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href="/admin/dispositivos">
                                    <Monitor className="mr-2 h-4 w-4" />
                                    Dispositivos
                                    <ExternalLink className="ml-2 h-3 w-3" />
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleExcluirClick(func)}
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog Excluir Funcionário */}
        <AlertDialog open={vinculosCheckDialog} onOpenChange={setVinculosCheckDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {checkingVinculosFunc ? 'Verificando vínculos...' : hasVinculosFunc ? 'Funcionário possui vendas' : 'Excluir Funcionário'}
              </AlertDialogTitle>
            </AlertDialogHeader>
            {checkingVinculosFunc ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : hasVinculosFunc ? (
              <>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Funcionário possui vendas vinculadas</p>
                    <p className="mt-1">
                      O funcionário <strong>{excluirTarget?.nome}</strong> possui vendas registradas no sistema.
                    </p>
                    <p className="mt-2">
                      Para <strong>preservar o histórico</strong>, ele será <strong>inativado</strong> — não poderá acessar o sistema, mas os relatórios continuarão exibindo os dados corretamente.
                    </p>
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmExcluirFuncionario} className="bg-amber-600 hover:bg-amber-700">
                    Inativar Funcionário
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-800">
                    <p>Confirma a exclusão permanente de <strong>{excluirTarget?.nome}</strong>?</p>
                    <p className="mt-1">Esta ação não pode ser desfeita.</p>
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmExcluirFuncionario} className="bg-red-600 hover:bg-red-700">
                    Excluir Permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
