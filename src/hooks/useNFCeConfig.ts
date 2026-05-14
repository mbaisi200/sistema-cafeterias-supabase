'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { NFCeConfig, CertificadoDigital, CertificadoDigitalInfo } from '@/types/nfce';

interface UseNFCeConfigReturn {
  config: NFCeConfig | null;
  certificados: CertificadoDigital[];
  certificadoAtivo: CertificadoDigital | null;
  infoCertificado: CertificadoDigitalInfo | null;
  loading: boolean;
  saving: boolean;
  salvarConfig: (dados: Partial<NFCeConfig>) => Promise<{ sucesso: boolean; erro?: string }>;
  uploadCertificado: (arquivo: File, senha: string) => Promise<{ sucesso: boolean; erro?: string }>;
  deletarCertificado: (id: string) => Promise<{ sucesso: boolean; erro?: string }>;
  ativarCertificado: (id: string) => Promise<{ sucesso: boolean; erro?: string }>;
  recarregar: () => Promise<void>;
}

export function useNFCeConfig(): UseNFCeConfigReturn {
  const [config, setConfig] = useState<NFCeConfig | null>(null);
  const [certificados, setCertificados] = useState<CertificadoDigital[]>([]);
  const [certificadoAtivo, setCertificadoAtivo] = useState<CertificadoDigital | null>(null);
  const [infoCertificado, setInfoCertificado] = useState<CertificadoDigitalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { empresaId, user } = useAuth();
  const supabase = getSupabaseClient();

  const carregarDados = useCallback(async () => {
    if (!user || !empresaId) {
      setConfig(null);
      setCertificados([]);
      setCertificadoAtivo(null);
      setInfoCertificado(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Buscar configurações
      const { data: configData, error: configError } = await supabase
        .from('nfce_config')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      if (configData) {
        setConfig({
          id: configData.id,
          empresa_id: configData.empresa_id,
          ambiente: configData.ambiente || 'homologacao',
          cnpj: configData.cnpj || '',
          inscricao_estadual: configData.inscricao_estadual || '',
          inscricao_municipal: configData.inscricao_municipal,
          razao_social: configData.razao_social || '',
          nome_fantasia: configData.nome_fantasia,
          logradouro: configData.logradouro || '',
          numero: configData.numero || '',
          complemento: configData.complemento,
          bairro: configData.bairro || '',
          codigo_municipio: configData.codigo_municipio || '',
          municipio: configData.municipio || '',
          uf: configData.uf || '',
          cep: configData.cep || '',
          telefone: configData.telefone,
          email: configData.email,
          regime_tributario: configData.regime_tributario || '1',
          serie: configData.serie || '1',
          numero_inicial: configData.numero_inicial || 1,
          numero_atual: configData.numero_atual || 0,
          certificado_id: configData.certificado_id,
          csosn_padrao: configData.csosn_padrao || '102',
          cfop_padrao: configData.cfop_padrao || '5102',
          ncm_padrao: configData.ncm_padrao,
          unidade_padrao: configData.unidade_padrao || 'UN',
          informacoes_adicionais: configData.informacoes_adicionais,
          informacoes_fisco: configData.informacoes_fisco,
          icms_situacao_tributaria: configData.icms_situacao_tributaria,
          icms_aliquota: configData.icms_aliquota,
          pis_aliquota: configData.pis_aliquota,
          cofins_aliquota: configData.cofins_aliquota,
          imprimir_danfe_automatico: configData.imprimir_danfe_automatico ?? true,
          mensagem_consumidor: configData.mensagem_consumidor,
          em_contingencia: configData.em_contingencia || false,
          motivo_contingencia: configData.motivo_contingencia,
          data_hora_contingencia: configData.data_hora_contingencia,
          ativo: configData.ativo ?? true,
          criado_em: configData.criado_em,
          atualizado_em: configData.atualizado_em,
        });
      }

      // Buscar certificados
      const { data: certificadosData, error: certError } = await supabase
        .from('nfce_certificados')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false });

      if (certError && certError.code !== 'PGRST116') {
        throw certError;
      }

      if (certificadosData && certificadosData.length > 0) {
        const certificadosMapeados: CertificadoDigital[] = certificadosData.map(c => ({
          id: c.id,
          empresa_id: c.empresa_id,
          nome_arquivo: c.nome_arquivo,
          arquivo_base64: c.arquivo_base64,
          senha: c.senha,
          cnpj: c.cnpj,
          razao_social: c.razao_social,
          validade_inicio: c.validade_inicio,
          validade_fim: c.validade_fim,
          emissor: c.emissor,
          ativo: c.ativo,
          criado_em: c.criado_em,
          atualizado_em: c.atualizado_em,
        }));

        setCertificados(certificadosMapeados);

        // Certificado ativo é o primeiro (mais recente) com ativo=true
        const ativo = certificadosMapeados.find(c => c.ativo) || certificadosMapeados[0];
        setCertificadoAtivo(ativo || null);

        // Info do certificado ativo
        if (ativo && ativo.validade_fim) {
          const validadeFim = new Date(ativo.validade_fim);
          const hoje = new Date();
          const diasRestantes = Math.ceil((validadeFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

          setInfoCertificado({
            razaoSocial: ativo.razao_social || '',
            cnpj: ativo.cnpj || '',
            validadeInicio: ativo.validade_inicio ? new Date(ativo.validade_inicio) : new Date(),
            validadeFim: validadeFim,
            emissor: ativo.emissor || '',
            diasRestantes,
          });
        }
      }

    } catch (error) {
      console.error('Erro ao carregar configurações NFC-e:', error);
    } finally {
      setLoading(false);
    }
  }, [empresaId, user, supabase]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const salvarConfig = async (dados: Partial<NFCeConfig>): Promise<{ sucesso: boolean; erro?: string }> => {
    if (!empresaId) {
      return { sucesso: false, erro: 'Empresa não definida' };
    }

    setSaving(true);
    try {
      // Verificar se já existe
      const { data: existente } = await supabase
        .from('nfce_config')
        .select('id')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      let resultado;
      if (existente) {
        // Atualizar
        const { error } = await supabase
          .from('nfce_config')
          .update({
            ...dados,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', existente.id);
        
        resultado = { error };
      } else {
        // Criar
        const { error } = await supabase
          .from('nfce_config')
          .insert({
            empresa_id: empresaId,
            ...dados,
          });
        
        resultado = { error };
      }

      if (resultado.error) {
        return { sucesso: false, erro: resultado.error.message };
      }

      await carregarDados();
      return { sucesso: true };

    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      return { sucesso: false, erro: error.message };
    } finally {
      setSaving(false);
    }
  };

  const uploadCertificado = async (arquivo: File, senha: string): Promise<{ sucesso: boolean; erro?: string }> => {
    if (!empresaId) {
      return { sucesso: false, erro: 'Empresa não definida' };
    }

    try {
      // Ler arquivo como base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(arquivo);
      });

      const arquivoBase64 = await base64Promise;

      // Simular extração de dados do certificado
      // Em produção, usar biblioteca como node-forge para extrair dados reais
      const certInfo = {
        razao_social: 'Empresa Exemplo',
        cnpj: '00000000000000',
        validade_inicio: new Date().toISOString(),
        validade_fim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        emissor: 'Autoridade Certificadora',
      };

      // Desativar certificados anteriores
      await supabase
        .from('nfce_certificados')
        .update({ ativo: false })
        .eq('empresa_id', empresaId);

      // Inserir novo certificado
      const { error } = await supabase
        .from('nfce_certificados')
        .insert({
          empresa_id: empresaId,
          nome_arquivo: arquivo.name,
          arquivo_base64: arquivoBase64,
          senha: senha,
          razao_social: certInfo.razao_social,
          cnpj: certInfo.cnpj,
          validade_inicio: certInfo.validade_inicio,
          validade_fim: certInfo.validade_fim,
          emissor: certInfo.emissor,
          ativo: true,
        });

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      await carregarDados();
      return { sucesso: true };

    } catch (error: any) {
      console.error('Erro ao upload certificado:', error);
      return { sucesso: false, erro: error.message };
    }
  };

  const deletarCertificado = async (id: string): Promise<{ sucesso: boolean; erro?: string }> => {
    try {
      const { error } = await supabase
        .from('nfce_certificados')
        .update({ ativo: false })
        .eq('id', id);

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      await carregarDados();
      return { sucesso: true };

    } catch (error: any) {
      console.error('Erro ao deletar certificado:', error);
      return { sucesso: false, erro: error.message };
    }
  };

  const ativarCertificado = async (id: string): Promise<{ sucesso: boolean; erro?: string }> => {
    if (!empresaId) {
      return { sucesso: false, erro: 'Empresa não definida' };
    }

    try {
      // Desativar todos
      await supabase
        .from('nfce_certificados')
        .update({ ativo: false })
        .eq('empresa_id', empresaId);

      // Ativar o selecionado
      const { error } = await supabase
        .from('nfce_certificados')
        .update({ ativo: true })
        .eq('id', id);

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      await carregarDados();
      return { sucesso: true };

    } catch (error: any) {
      console.error('Erro ao ativar certificado:', error);
      return { sucesso: false, erro: error.message };
    }
  };

  return {
    config,
    certificados,
    certificadoAtivo,
    infoCertificado,
    loading,
    saving,
    salvarConfig,
    uploadCertificado,
    deletarCertificado,
    ativarCertificado,
    recarregar: carregarDados,
  };
}
