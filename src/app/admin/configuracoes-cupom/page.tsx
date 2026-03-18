'use client';

import { useState, useMemo, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { useConfiguracoesCupom, configuracoesCupomPadrao, ConfiguracoesCupom } from '@/hooks/useFirestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Printer, 
  Save, 
  RotateCcw, 
  Eye, 
  Ruler, 
  Palette,
  Building2,
  FileText
} from 'lucide-react';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de pré-visualização
function PreviaCupom({ formData }: { formData: ConfiguracoesCupom }) {
  const larguraPx = formData.larguraPapel * 3.78;
  const fontSize = formData.tamanhoFonte;
  const fontWeight = formData.intensidadeImpressao === 'normal' ? 400 : 
                     formData.intensidadeImpressao === 'escura' ? 600 : 700;
  const lineHeight = formData.espacamentoLinhas;

  return (
    <div 
      className="bg-white border-2 border-dashed border-gray-300 mx-auto shadow-lg"
      style={{ 
        width: `${Math.min(larguraPx, 400)}px`,
        fontSize: `${fontSize}px`,
        fontWeight,
        lineHeight,
        padding: `${formData.margemSuperior}mm ${formData.margemSuperior}mm ${formData.margemInferior}mm`,
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div className="text-center font-bold mb-2">
        {formData.nomeEmpresa || 'NOME DA EMPRESA'}
      </div>
      {formData.cnpjEmpresa && (
        <div className="text-center text-xs mb-1">CNPJ: {formData.cnpjEmpresa}</div>
      )}
      {formData.enderecoEmpresa && (
        <div className="text-center text-xs mb-2">{formData.enderecoEmpresa}</div>
      )}
      <div className="border-t border-b border-gray-400 py-1 my-1 text-center">
        CUPOM FISCAL
      </div>
      <div className="text-xs my-2">
        <div>Data: {new Date().toLocaleDateString('pt-BR')} Hora: {new Date().toLocaleTimeString('pt-BR')}</div>
      </div>
      <div className="border-t border-gray-300 my-1"></div>
      <div className="text-xs">
        <div className="font-bold">ITENS:</div>
        <div className="flex justify-between">
          <span>Produto Exemplo</span>
          <span>R$ 25,00</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>  1 x R$ 25,00</span>
          <span>R$ 25,00</span>
        </div>
      </div>
      <div className="border-t border-gray-300 my-1"></div>
      <div className="flex justify-between font-bold">
        <span>TOTAL:</span>
        <span>R$ 25,00</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Forma Pgto:</span>
        <span>Dinheiro</span>
      </div>
      <div className="border-t border-b border-gray-400 my-2"></div>
      <div className="text-center text-xs whitespace-pre-line">
        {formData.mensagemRodape || 'Obrigado pela preferência!'}
      </div>
    </div>
  );
}

export default function ConfiguracoesCupomPage() {
  const { configuracoes, loading, saving, salvarConfiguracoes } = useConfiguracoesCupom();
  const { toast } = useToast();
  
  // Estado local para edição
  const [localData, setLocalData] = useState<ConfiguracoesCupom | null>(null);

  // Dados atuais (local ou do servidor)
  const formData = localData ?? configuracoes ?? configuracoesCupomPadrao;

  // Verificar mudanças
  const hasChanges = useMemo(() => {
    if (!localData || !configuracoes) return false;
    return JSON.stringify(localData) !== JSON.stringify(configuracoes);
  }, [localData, configuracoes]);

  const handleInputChange = useCallback((field: keyof ConfiguracoesCupom, value: string | number) => {
    setLocalData(prev => ({
      ...(prev ?? configuracoes ?? configuracoesCupomPadrao),
      [field]: value,
    }));
  }, [configuracoes]);

  const handleSalvar = async () => {
    if (!localData) return;
    try {
      await salvarConfiguracoes(localData);
      setLocalData(null);
      toast({
        title: 'Configurações salvas!',
        description: 'As configurações do cupom foram salvas com sucesso.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
      });
    }
  };

  const handleRestaurarPadrao = () => {
    setLocalData(configuracoesCupomPadrao);
    toast({
      title: 'Valores restaurados',
      description: 'Os valores padrão foram restaurados. Clique em Salvar para confirmar.',
    });
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Configurações Cupom' }]}>
          <LoadingSkeleton />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Configurações Cupom' }]}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Printer className="h-8 w-8 text-blue-600" />
                Configurações do Cupom Fiscal
              </h1>
              <p className="text-muted-foreground">
                Configure o tamanho do papel, intensidade de impressão e dados da empresa
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleRestaurarPadrao}
                disabled={saving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrão
              </Button>
              <Button 
                onClick={handleSalvar} 
                disabled={saving || !hasChanges}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </div>

          {hasChanges && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm">
              Você tem alterações não salvas.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário de Configurações */}
            <Tabs defaultValue="papel" className="space-y-4">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="papel" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  <span className="hidden sm:inline">Papel</span>
                </TabsTrigger>
                <TabsTrigger value="empresa" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Empresa</span>
                </TabsTrigger>
                <TabsTrigger value="impressao" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Impressão</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab: Configurações do Papel */}
              <TabsContent value="papel">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Ruler className="h-5 w-5 text-blue-600" />
                      Tamanho do Papel
                    </CardTitle>
                    <CardDescription>
                      Configure as dimensões do cupom em milímetros
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="larguraPapel">Largura do Papel (mm)</Label>
                      <Select
                        value={formData.larguraPapel.toString()}
                        onValueChange={(value) => handleInputChange('larguraPapel', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="58">58mm - Impressora térmica pequena</SelectItem>
                          <SelectItem value="80">80mm - Impressora térmica padrão</SelectItem>
                          <SelectItem value="110">110mm - Impressora A4 estreito</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Selecione a largura do papel da sua impressora térmica
                      </p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="margemSuperior">Margem Superior (mm)</Label>
                        <Input
                          id="margemSuperior"
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={formData.margemSuperior}
                          onChange={(e) => handleInputChange('margemSuperior', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="margemInferior">Margem Inferior (mm)</Label>
                        <Input
                          id="margemInferior"
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={formData.margemInferior}
                          onChange={(e) => handleInputChange('margemInferior', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Dados da Empresa */}
              <TabsContent value="empresa">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      Dados da Empresa
                    </CardTitle>
                    <CardDescription>
                      Informações que aparecerão no cabeçalho do cupom
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                      <Input
                        id="nomeEmpresa"
                        placeholder="Nome que aparecerá no cupom"
                        value={formData.nomeEmpresa}
                        onChange={(e) => handleInputChange('nomeEmpresa', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnpjEmpresa">CNPJ</Label>
                      <Input
                        id="cnpjEmpresa"
                        placeholder="00.000.000/0000-00"
                        value={formData.cnpjEmpresa}
                        onChange={(e) => handleInputChange('cnpjEmpresa', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="enderecoEmpresa">Endereço</Label>
                      <Input
                        id="enderecoEmpresa"
                        placeholder="Rua, número, bairro, cidade"
                        value={formData.enderecoEmpresa}
                        onChange={(e) => handleInputChange('enderecoEmpresa', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefoneEmpresa">Telefone</Label>
                      <Input
                        id="telefoneEmpresa"
                        placeholder="(00) 00000-0000"
                        value={formData.telefoneEmpresa}
                        onChange={(e) => handleInputChange('telefoneEmpresa', e.target.value)}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="mensagemRodape">Mensagem de Rodapé</Label>
                      <Textarea
                        id="mensagemRodape"
                        placeholder="Obrigado pela preferência!&#10;Volte sempre!"
                        value={formData.mensagemRodape}
                        onChange={(e) => handleInputChange('mensagemRodape', e.target.value)}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use Enter para quebrar linha
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Configurações de Impressão */}
              <TabsContent value="impressao">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Palette className="h-5 w-5 text-blue-600" />
                      Qualidade de Impressão
                    </CardTitle>
                    <CardDescription>
                      Ajuste a intensidade e tamanho da fonte para impressão mais escura
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="intensidadeImpressao">Intensidade da Impressão</Label>
                      <Select
                        value={formData.intensidadeImpressao}
                        onValueChange={(value: ConfiguracoesCupom['intensidadeImpressao']) => 
                          handleInputChange('intensidadeImpressao', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal - Impressão padrão</SelectItem>
                          <SelectItem value="escura">Escura - Impressão mais forte (recomendado)</SelectItem>
                          <SelectItem value="muito-escura">Muito Escura - Impressão intensa</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Selecione &quot;Escura&quot; para uma impressão mais forte e legível
                      </p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tamanhoFonte">Tamanho da Fonte (pt)</Label>
                        <Select
                          value={formData.tamanhoFonte.toString()}
                          onValueChange={(value) => handleInputChange('tamanhoFonte', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="9">9pt - Muito pequena</SelectItem>
                            <SelectItem value="10">10pt - Pequena</SelectItem>
                            <SelectItem value="11">11pt - Média</SelectItem>
                            <SelectItem value="12">12pt - Normal (recomendado)</SelectItem>
                            <SelectItem value="14">14pt - Grande</SelectItem>
                            <SelectItem value="16">16pt - Muito grande</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="espacamentoLinhas">Espaçamento entre Linhas</Label>
                        <Select
                          value={formData.espacamentoLinhas.toString()}
                          onValueChange={(value) => handleInputChange('espacamentoLinhas', parseFloat(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1.0 - Compacto</SelectItem>
                            <SelectItem value="1.2">1.2 - Menor</SelectItem>
                            <SelectItem value="1.4">1.4 - Normal</SelectItem>
                            <SelectItem value="1.6">1.6 - Maior</SelectItem>
                            <SelectItem value="1.8">1.8 - Espaçado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">Dica de Impressão</p>
                          <p className="text-sm text-blue-700">
                            Para impressoras térmicas mais antigas, use intensidade &quot;Muito Escura&quot; 
                            e tamanho de fonte 14pt para melhor legibilidade.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Pré-visualização */}
            <div className="space-y-4">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-600" />
                    Pré-visualização do Cupom
                  </CardTitle>
                  <CardDescription>
                    Visualize como o cupom será impresso
                  </CardDescription>
                </CardHeader>
                <CardContent className="bg-gray-100 rounded-lg p-4 flex justify-center">
                  <PreviaCupom formData={formData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Resumo das Configurações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Largura:</div>
                    <div className="font-medium">{formData.larguraPapel}mm</div>
                    <div className="text-muted-foreground">Fonte:</div>
                    <div className="font-medium">{formData.tamanhoFonte}pt</div>
                    <div className="text-muted-foreground">Intensidade:</div>
                    <div className="font-medium capitalize">{formData.intensidadeImpressao.replace('-', ' ')}</div>
                    <div className="text-muted-foreground">Margens:</div>
                    <div className="font-medium">{formData.margemSuperior}mm / {formData.margemInferior}mm</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
