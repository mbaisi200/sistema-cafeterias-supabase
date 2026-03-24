'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileKey, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  Calendar,
  Building2,
  Shield
} from 'lucide-react';
import type { CertificadoDigital, CertificadoDigitalInfo } from '@/types/nfce';

interface UploadCertificadoProps {
  onUpload: (arquivo: File, senha: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onActivate?: (id: string) => Promise<void>;
  certificados: CertificadoDigital[];
  certificadoAtivo: CertificadoDigital | null;
  infoCertificado: CertificadoDigitalInfo | null;
  uploading: boolean;
  loading: boolean;
}

export function UploadCertificado({
  onUpload,
  onDelete,
  onActivate,
  certificados,
  certificadoAtivo,
  infoCertificado,
  uploading,
  loading,
}: UploadCertificadoProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extensao = file.name.toLowerCase().split('.').pop();
      if (!['pfx', 'p12'].includes(extensao || '')) {
        setErro('Arquivo inválido. Por favor, selecione um arquivo .pfx ou .p12');
        return;
      }
      setArquivo(file);
      setErro(null);
    }
  };

  const handleUpload = async () => {
    if (!arquivo || !senha) {
      setErro('Por favor, selecione o arquivo e informe a senha');
      return;
    }

    try {
      setErro(null);
      await onUpload(arquivo, senha);
      setArquivo(null);
      setSenha('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      setErro(error.message || 'Erro ao enviar certificado');
    }
  };

  const formatarData = (data: Date | string | undefined) => {
    if (!data) return '-';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (info: CertificadoDigitalInfo | null) => {
    if (!info) return null;

    if (info.diasRestantes <= 0) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (info.diasRestantes <= 30) {
      return <Badge variant="secondary" className="bg-amber-500 text-white">Vence em {info.diasRestantes} dias</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Válido</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Carregar Certificado Digital A1
          </CardTitle>
          <CardDescription>
            Faça upload do seu certificado digital modelo A1 (arquivo .pfx ou .p12)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {erro && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="certificado">Arquivo do Certificado (.pfx/.p12)</Label>
              <Input
                ref={fileInputRef}
                id="certificado"
                type="file"
                accept=".pfx,.p12"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {arquivo && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: <strong>{arquivo.name}</strong>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha do Certificado</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a senha"
                  disabled={uploading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!arquivo || !senha || uploading}
            className="w-full md:w-auto"
          >
            {uploading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Carregar Certificado
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {certificadoAtivo && infoCertificado && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Certificado Ativo
              </span>
              {getStatusBadge(infoCertificado)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Razão Social</p>
                    <p className="font-medium">{infoCertificado.razaoSocial}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileKey className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">CNPJ</p>
                    <p className="font-medium">{infoCertificado.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Validade</p>
                    <p className="font-medium">
                      {formatarData(infoCertificado.validadeInicio)} até {formatarData(infoCertificado.validadeFim)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Emissor</p>
                    <p className="font-medium">{infoCertificado.emissor}</p>
                  </div>
                </div>
              </div>
            </div>

            {infoCertificado.diasRestantes <= 30 && infoCertificado.diasRestantes > 0 && (
              <Alert className="mt-4 bg-amber-100 border-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Seu certificado expira em <strong>{infoCertificado.diasRestantes} dias</strong>. 
                  Renove-o para evitar interrupções na emissão de NFC-e.
                </AlertDescription>
              </Alert>
            )}

            {infoCertificado.diasRestantes <= 0 && (
              <Alert variant="destructive" className="mt-4">
                <X className="h-4 w-4" />
                <AlertDescription>
                  Este certificado está <strong>expirado</strong> e não pode ser utilizado para emissão de NFC-e. 
                  Faça upload de um novo certificado válido.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {certificados.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Certificados</CardTitle>
            <CardDescription>
              Certificados cadastrados anteriormente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {certificados
                .filter(c => c.id !== certificadoAtivo?.id)
                .map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <FileKey className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium">{cert.nome_arquivo}</p>
                        <p className="text-sm text-gray-500">
                          Válido até: {formatarData(cert.validade_fim)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onActivate?.(cert.id)}
                        title="Ativar este certificado"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete?.(cert.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Excluir certificado"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <div className="bg-blue-100 p-2 rounded h-fit">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-blue-800">Sobre o Certificado Digital A1</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• O certificado modelo A1 é um arquivo digital (.pfx ou .p12) válido por 1 a 3 anos</li>
                <li>• É necessário para assinar as NFC-e e garantir autenticidade fiscal</li>
                <li>• A senha é obrigatória para acessar o certificado</li>
                <li>• Mantenha seu certificado em local seguro e faça backup</li>
                <li>• O sistema criptografa e armazena o certificado com segurança</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
