'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  FileKey, 
  Building2, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Shield
} from 'lucide-react';
import { ConfiguracaoNFCeForm } from './ConfiguracaoNFCeForm';
import { UploadCertificado } from './UploadCertificado';
import type { NFCeConfig, CertificadoDigital, CertificadoDigitalInfo } from '@/types/nfce';

interface NFCeConfigTabProps {
  config: NFCeConfig | null;
  certificados: CertificadoDigital[];
  certificadoAtivo: CertificadoDigital | null;
  infoCertificado: CertificadoDigitalInfo | null;
  loading: boolean;
  saving: boolean;
  onSalvarConfig: (dados: Partial<NFCeConfig>) => Promise<{ sucesso: boolean; erro?: string }>;
  onUploadCertificado: (arquivo: File, senha: string) => Promise<{ sucesso: boolean; erro?: string }>;
  onDeletarCertificado: (id: string) => Promise<{ sucesso: boolean; erro?: string }>;
  onAtivarCertificado: (id: string) => Promise<{ sucesso: boolean; erro?: string }>;
}

export function NFCeConfigTab({
  config,
  certificados,
  certificadoAtivo,
  infoCertificado,
  loading,
  saving,
  onSalvarConfig,
  onUploadCertificado,
  onDeletarCertificado,
  onAtivarCertificado,
}: NFCeConfigTabProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (arquivo: File, senha: string) => {
    setUploading(true);
    try {
      const result = await onUploadCertificado(arquivo, senha);
      if (!result.sucesso) {
        throw new Error(result.erro);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await onDeletarCertificado(id);
  };

  const handleActivate = async (id: string) => {
    await onAtivarCertificado(id);
  };

  // Verificar se está configurado
  const configCompleta = config && 
    config.cnpj && 
    config.inscricao_estadual && 
    config.razao_social &&
    config.logradouro &&
    config.numero &&
    config.bairro &&
    config.municipio &&
    config.uf &&
    config.cep;

  const temCertificado = !!certificadoAtivo && !!infoCertificado;
  const certificadoValido = temCertificado && infoCertificado.diasRestantes > 0;

  return (
    <div className="space-y-6">
      {/* Status da Configuração */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Status da Configuração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              {configCompleta ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="font-medium">Dados do Emitente</p>
                <p className="text-sm text-muted-foreground">
                  {configCompleta ? 'Configurado' : 'Pendente'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              {temCertificado ? (
                certificadoValido ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="font-medium">Certificado Digital</p>
                <p className="text-sm text-muted-foreground">
                  {!temCertificado && 'Não configurado'}
                  {temCertificado && !certificadoValido && 'Expirado'}
                  {temCertificado && certificadoValido && 'Válido'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Badge variant={config?.ambiente === 'producao' ? 'default' : 'secondary'}>
                {config?.ambiente === 'producao' ? 'Produção' : 'Homologação'}
              </Badge>
              <div>
                <p className="font-medium">Ambiente</p>
                <p className="text-sm text-muted-foreground">
                  {config?.ambiente === 'producao' 
                    ? 'Notas válidas fiscalmente' 
                    : ' Ambiente de testes'}
                </p>
              </div>
            </div>
          </div>

          {configCompleta && certificadoValido && config?.ambiente === 'producao' && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Configuração completa! Você pode emitir NFC-e em produção.
              </AlertDescription>
            </Alert>
          )}

          {config?.ambiente === 'producao' && (!configCompleta || !certificadoValido) && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Configure todos os dados e certificado antes de emitir em produção.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tabs de Configuração */}
      <Tabs defaultValue="emitente" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="emitente" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Dados do Emitente
          </TabsTrigger>
          <TabsTrigger value="certificado" className="flex items-center gap-2">
            <FileKey className="h-4 w-4" />
            Certificado Digital
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emitente">
          <ConfiguracaoNFCeForm
            config={config}
            onSave={onSalvarConfig}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="certificado">
          <UploadCertificado
            onUpload={handleUpload}
            onDelete={handleDelete}
            onActivate={handleActivate}
            certificados={certificados}
            certificadoAtivo={certificadoAtivo}
            infoCertificado={infoCertificado}
            uploading={uploading}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
