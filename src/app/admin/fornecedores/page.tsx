'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useFornecedores } from '@/hooks/useFirestore';
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  UserCheck,
  Hash,
  Globe,
  Tag,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportToPDF } from '@/lib/export-pdf';

interface Fornecedor {
  id: string;
  nome: string;
  razaoSocial?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  email?: string;
  telefone?: string;
  telefone2?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  contato?: string;
  cargo?: string;
  site?: string;
  observacoes?: string;
  categorias?: string[];
  ativo: boolean;
}

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const CATEGORIAS_PREDEFINIDAS = [
  'Bebidas', 'Alimentos', 'Limpeza', 'Descartáveis', 'Embalagens',
  'Equipamentos', 'Uniformes', 'Higiene', 'Outros',
];

function formatarCNPJ(cnpj?: string) {
  if (!cnpj) return '-';
  const nums = cnpj.replace(/\D/g, '');
  if (nums.length === 14) {
    return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
}

function formatarTelefone(telefone?: string) {
  if (!telefone) return '-';
  const nums = telefone.replace(/\D/g, '');
  if (nums.length === 11) {
    return nums.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (nums.length === 10) {
    return nums.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return telefone;
}

function formatarCEP(cep?: string) {
  if (!cep) return '-';
  const nums = cep.replace(/\D/g, '');
  if (nums.length === 8) {
    return nums.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }
  return cep;
}

export default function FornecedoresPage() {
  const { fornecedores, loading, adicionarFornecedor, atualizarFornecedor, excluirFornecedor } = useFornecedores();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editandoFornecedor, setEditandoFornecedor] = useState<Fornecedor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Fornecedor | null>(null);
  const [categoriaInput, setCategoriaInput] = useState('');
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('dados');
  const { toast } = useToast();

  // Filtrar fornecedores
  const filteredFornecedores = fornecedores.filter(f => {
    const searchLower = search.toLowerCase();
    return (
      f.nome.toLowerCase().includes(searchLower) ||
      (f.razaoSocial?.toLowerCase().includes(searchLower) ?? false) ||
      (f.cnpj?.includes(search) ?? false) ||
      (f.telefone?.includes(search) ?? false)
    );
  });

  // Estatísticas
  const totalFornecedores = fornecedores.length;
  const fornecedoresAtivos = fornecedores.filter(f => f.ativo).length;
  const fornecedoresComCNPJ = fornecedores.filter(f => f.cnpj).length;

  // Resetar formulário quando fechar dialog
  useEffect(() => {
    if (!dialogOpen) {
      setEditandoFornecedor(null);
      setCategoriasSelecionadas([]);
      setCategoriaInput('');
      setActiveTab('dados');
    }
  }, [dialogOpen]);

  // Preencher formulário quando editar
  useEffect(() => {
    if (editandoFornecedor) {
      setCategoriasSelecionadas(editandoFornecedor.categorias || []);
    }
  }, [editandoFornecedor]);

  const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);

    try {
      const dados: any = {
        nome: formData.get('nome') as string,
        razaoSocial: (formData.get('razaoSocial') as string) || null,
        cnpj: (formData.get('cnpj') as string) || null,
        inscricaoEstadual: (formData.get('inscricaoEstadual') as string) || null,
        email: (formData.get('email') as string) || null,
        telefone: (formData.get('telefone') as string) || null,
        telefone2: (formData.get('telefone2') as string) || null,
        logradouro: (formData.get('logradouro') as string) || null,
        numero: (formData.get('numero') as string) || null,
        complemento: (formData.get('complemento') as string) || null,
        bairro: (formData.get('bairro') as string) || null,
        cidade: (formData.get('cidade') as string) || null,
        estado: (formData.get('estado') as string) || null,
        cep: (formData.get('cep') as string) || null,
        contato: (formData.get('contato') as string) || null,
        cargo: (formData.get('cargo') as string) || null,
        site: (formData.get('site') as string) || null,
        observacoes: (formData.get('observacoes') as string) || null,
        categorias: categoriasSelecionadas,
      };

      if (editandoFornecedor) {
        await atualizarFornecedor(editandoFornecedor.id, dados);
        toast({
          title: 'Fornecedor atualizado!',
          description: `${dados.nome} foi atualizado com sucesso.`,
        });
      } else {
        await adicionarFornecedor(dados);
        toast({
          title: 'Fornecedor cadastrado!',
          description: `${dados.nome} foi adicionado com sucesso.`,
        });
      }

      setDialogOpen(false);
      setEditandoFornecedor(null);
      setCategoriasSelecionadas([]);
      setCategoriaInput('');
    } catch (error: unknown) {
      console.error('Erro ao salvar fornecedor:', error);
      let mensagem = 'Erro ao salvar fornecedor';
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

  const handleEditar = (fornecedor: Fornecedor) => {
    setEditandoFornecedor(fornecedor);
    setActiveTab('dados');
    setDialogOpen(true);
  };

  const handleNovo = () => {
    setEditandoFornecedor(null);
    setActiveTab('dados');
    setDialogOpen(true);
  };

  const handleDeleteClick = (fornecedor: Fornecedor) => {
    setDeleteTarget(fornecedor);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await excluirFornecedor(deleteTarget.id);
      toast({
        title: 'Fornecedor excluído!',
        description: `${deleteTarget.nome} foi removido com sucesso.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o fornecedor.',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: 'Relatório de Fornecedores',
      subtitle: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      orientation: 'landscape',
      columns: [
        { header: 'Nome', accessor: (row: any) => row.nome, width: 50 },
        { header: 'Razão Social', accessor: (row: any) => row.razaoSocial || '-', width: 50 },
        { header: 'CNPJ', accessor: (row: any) => row.cnpj || '-', width: 30 },
        { header: 'Telefone', accessor: (row: any) => row.telefone || '-', width: 25 },
        { header: 'Email', accessor: (row: any) => row.email || '-', width: 40 },
        { header: 'Cidade/UF', accessor: (row: any) => [row.cidade, row.estado].filter(Boolean).join('/') || '-', width: 30 },
        { header: 'Contato', accessor: (row: any) => row.contato || '-', width: 30 },
        { header: 'Status', accessor: (row: any) => row.ativo ? 'Ativo' : 'Inativo', width: 20 },
      ],
      data: filteredFornecedores,
      filename: `fornecedores-${new Date().toISOString().slice(0, 10)}`,
      totals: { label: 'TOTAL' },
      summary: [
        { label: 'Total de Fornecedores', value: filteredFornecedores.length },
        { label: 'Ativos', value: filteredFornecedores.filter((f: any) => f.ativo).length },
        { label: 'Com CNPJ', value: filteredFornecedores.filter((f: any) => f.cnpj).length },
      ],
    });
  };

  const handleAddCategoria = () => {
    const cat = categoriaInput.trim();
    if (cat && !categoriasSelecionadas.includes(cat)) {
      setCategoriasSelecionadas([...categoriasSelecionadas, cat]);
      setCategoriaInput('');
    }
  };

  const handleRemoveCategoria = (cat: string) => {
    setCategoriasSelecionadas(categoriasSelecionadas.filter(c => c !== cat));
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Fornecedores' }]}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
          { title: 'Fornecedores' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Fornecedores</h1>
              <p className="text-muted-foreground">
                Gerencie os fornecedores do seu estabelecimento
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button onClick={handleNovo} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Novo Fornecedor
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Fornecedores</p>
                  <p className="text-2xl font-bold">{totalFornecedores}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold text-green-600">{fornecedoresAtivos}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Hash className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Com CNPJ</p>
                  <p className="text-2xl font-bold text-purple-600">{fornecedoresComCNPJ}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dialog Create/Edit */}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditandoFornecedor(null);
              setCategoriasSelecionadas([]);
              setCategoriaInput('');
              setActiveTab('dados');
            }
          }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editandoFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                </DialogTitle>
                <DialogDescription>
                  {editandoFornecedor
                    ? 'Atualize os dados do fornecedor'
                    : 'Preencha os dados do novo fornecedor'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSalvar}>
                <div className="space-y-6 py-4">
                  {/* Tabs navigation */}
                  <div className="flex gap-2 border-b pb-2">
                    <Button
                      type="button"
                      variant={activeTab === 'dados' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('dados')}
                      className={activeTab === 'dados' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                      <Building2 className="h-4 w-4 mr-1" />
                      Dados
                    </Button>
                    <Button
                      type="button"
                      variant={activeTab === 'contato' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('contato')}
                      className={activeTab === 'contato' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Contato
                    </Button>
                    <Button
                      type="button"
                      variant={activeTab === 'endereco' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('endereco')}
                      className={activeTab === 'endereco' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Endereço
                    </Button>
                    <Button
                      type="button"
                      variant={activeTab === 'outros' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('outros')}
                      className={activeTab === 'outros' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                      <Tag className="h-4 w-4 mr-1" />
                      Outros
                    </Button>
                  </div>

                  {/* Tab: Dados */}
                  {activeTab === 'dados' && (
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nome">Nome *</Label>
                          <Input
                            id="nome"
                            name="nome"
                            placeholder="Nome do fornecedor"
                            required
                            defaultValue={editandoFornecedor?.nome || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="razaoSocial">Razão Social</Label>
                          <Input
                            id="razaoSocial"
                            name="razaoSocial"
                            placeholder="Razão social completa"
                            defaultValue={editandoFornecedor?.razaoSocial || ''}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cnpj">CNPJ</Label>
                          <Input
                            id="cnpj"
                            name="cnpj"
                            placeholder="00.000.000/0000-00"
                            defaultValue={editandoFornecedor?.cnpj || ''}
                            maxLength={20}
                          />
                          <p className="text-xs text-muted-foreground">Apenas números ou formato com pontuação</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                          <Input
                            id="inscricaoEstadual"
                            name="inscricaoEstadual"
                            placeholder="Inscrição estadual"
                            defaultValue={editandoFornecedor?.inscricaoEstadual || ''}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Contato */}
                  {activeTab === 'contato' && (
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            Email
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="email@fornecedor.com"
                            defaultValue={editandoFornecedor?.email || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="site" className="flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5" />
                            Site
                          </Label>
                          <Input
                            id="site"
                            name="site"
                            placeholder="www.fornecedor.com"
                            defaultValue={editandoFornecedor?.site || ''}
                          />
                        </div>
                      </div>
                      <Separator />
                      <p className="text-sm font-medium text-muted-foreground">Telefones</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="telefone">Telefone Principal</Label>
                          <Input
                            id="telefone"
                            name="telefone"
                            placeholder="(00) 00000-0000"
                            defaultValue={editandoFornecedor?.telefone || ''}
                            maxLength={20}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefone2">Telefone Secundário</Label>
                          <Input
                            id="telefone2"
                            name="telefone2"
                            placeholder="(00) 00000-0000"
                            defaultValue={editandoFornecedor?.telefone2 || ''}
                            maxLength={20}
                          />
                        </div>
                      </div>
                      <Separator />
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <UserCheck className="h-4 w-4" />
                        Pessoa de Contato
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contato">Nome do Contato</Label>
                          <Input
                            id="contato"
                            name="contato"
                            placeholder="Nome da pessoa de contato"
                            defaultValue={editandoFornecedor?.contato || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cargo">Cargo</Label>
                          <Input
                            id="cargo"
                            name="cargo"
                            placeholder="Ex: Gerente, Vendedor"
                            defaultValue={editandoFornecedor?.cargo || ''}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Endereço */}
                  {activeTab === 'endereco' && (
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="logradouro">Logradouro</Label>
                        <Input
                          id="logradouro"
                          name="logradouro"
                          placeholder="Rua, Avenida, etc."
                          defaultValue={editandoFornecedor?.logradouro || ''}
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="numero">Número</Label>
                          <Input
                            id="numero"
                            name="numero"
                            placeholder="Nº"
                            defaultValue={editandoFornecedor?.numero || ''}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="complemento">Complemento</Label>
                          <Input
                            id="complemento"
                            name="complemento"
                            placeholder="Sala, Bloco, etc."
                            defaultValue={editandoFornecedor?.complemento || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cep">CEP</Label>
                          <Input
                            id="cep"
                            name="cep"
                            placeholder="00000-000"
                            defaultValue={editandoFornecedor?.cep || ''}
                            maxLength={10}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bairro">Bairro</Label>
                          <Input
                            id="bairro"
                            name="bairro"
                            placeholder="Bairro"
                            defaultValue={editandoFornecedor?.bairro || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cidade">Cidade</Label>
                          <Input
                            id="cidade"
                            name="cidade"
                            placeholder="Cidade"
                            defaultValue={editandoFornecedor?.cidade || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="estado">Estado</Label>
                          <Select name="estado" defaultValue={editandoFornecedor?.estado || ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="UF" />
                            </SelectTrigger>
                            <SelectContent>
                              {ESTADOS_BR.map(est => (
                                <SelectItem key={est} value={est}>{est}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Outros */}
                  {activeTab === 'outros' && (
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          Categorias
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Adicionar categoria..."
                            value={categoriaInput}
                            onChange={(e) => setCategoriaInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCategoria();
                              }
                            }}
                          />
                          <Button type="button" variant="outline" onClick={handleAddCategoria}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Categorias pré-definidas */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {CATEGORIAS_PREDEFINIDAS
                            .filter(cat => !categoriasSelecionadas.includes(cat))
                            .map(cat => (
                              <Badge
                                key={cat}
                                variant="outline"
                                className="cursor-pointer hover:bg-blue-50 text-xs"
                                onClick={() => setCategoriasSelecionadas([...categoriasSelecionadas, cat])}
                              >
                                + {cat}
                              </Badge>
                            ))}
                        </div>
                        {/* Categorias selecionadas */}
                        {categoriasSelecionadas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {categoriasSelecionadas.map(cat => (
                              <Badge
                                key={cat}
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                                onClick={() => handleRemoveCategoria(cat)}
                              >
                                {cat} ×
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea
                          id="observacoes"
                          name="observacoes"
                          placeholder="Informações adicionais sobre o fornecedor..."
                          rows={4}
                          defaultValue={editandoFornecedor?.observacoes || ''}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditandoFornecedor(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editandoFornecedor ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Fornecedor</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>?
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {filteredFornecedores.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum fornecedor encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Clique em &quot;Novo Fornecedor&quot; para começar
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Fornecedores ({filteredFornecedores.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Nome/Razão Social</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead className="hidden md:table-cell">Telefone</TableHead>
                        <TableHead className="hidden lg:table-cell">Email</TableHead>
                        <TableHead className="hidden xl:table-cell">Cidade/UF</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-[80px] text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFornecedores.map((fornecedor) => (
                        <TableRow key={fornecedor.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-5 w-5 text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{fornecedor.nome}</p>
                                {fornecedor.razaoSocial && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {fornecedor.razaoSocial}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono">
                              {formatarCNPJ(fornecedor.cnpj)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm">{formatarTelefone(fornecedor.telefone)}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm truncate block max-w-[180px]">
                              {fornecedor.email || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <span className="text-sm">
                              {[fornecedor.cidade, fornecedor.estado].filter(Boolean).join('/') || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={fornecedor.ativo ? 'bg-green-500' : 'bg-gray-500'}>
                              {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEditar(fornecedor)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteClick(fornecedor)}
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
      </MainLayout>
    </ProtectedRoute>
  );
}
