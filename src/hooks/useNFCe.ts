'use client';

import { useState, useCallback } from 'react';
import type { 
  NFCe, 
  NFCeConfig, 
  CertificadoDigital, 
  CertificadoDigitalInfo,
  EmissaoNFCeRequest,
  EmissaoNFCeResponse,
  CancelamentoNFCeRequest,
  CancelamentoNFCeResponse,
  ConsultaNFCeResponse
} from '@/types/nfce';

// Hook para gerenciar certificados digitais
export function useCertificados(empresaId: string | undefined) {
  const [certificados, setCertificados] = useState<CertificadoDigital[]>([]);
  const [certificadoAtivo, setCertificadoAtivo] = useState<CertificadoDigital | null>(null);
  const [infoCertificado, setInfoCertificado] = useState<CertificadoDigitalInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarCertificados = useCallback(async () => {
    if (!empresaId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/nfce/config?empresa_id=${empresaId}`);
      const data = await response.json();
      
      if (data.sucesso) {
        setCertificados(data.certificados || []);
        setCertificadoAtivo(data.certificadoAtivo || null);
        setInfoCertificado(data.infoCertificado || null);
      } else {
        setError(data.erro?.mensagem || 'Erro ao carregar certificados');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  const uploadCertificado = useCallback(async (arquivo: File, senha: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('senha', senha);
      
      const response = await fetch('/api/nfce/config/certificado', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.sucesso) {
        await carregarCertificados();
        return { sucesso: true };
      } else {
        setError(data.erro?.mensagem || 'Erro ao enviar certificado');
        return { sucesso: false, erro: data.erro?.mensagem };
      }
    } catch (err) {
      setError('Erro de conexão');
      return { sucesso: false, erro: 'Erro de conexão' };
    } finally {
      setLoading(false);
    }
  }, [carregarCertificados]);

  const excluirCertificado = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/nfce/config/certificado?id=${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.sucesso) {
        await carregarCertificados();
        return { sucesso: true };
      } else {
        setError(data.erro?.mensagem || 'Erro ao excluir certificado');
        return { sucesso: false, erro: data.erro?.mensagem };
      }
    } catch (err) {
      setError('Erro de conexão');
      return { sucesso: false, erro: 'Erro de conexão' };
    } finally {
      setLoading(false);
    }
  }, [carregarCertificados]);

  return {
    certificados,
    certificadoAtivo,
    infoCertificado,
    loading,
    error,
    carregarCertificados,
    uploadCertificado,
    excluirCertificado,
  };
}

// Hook para gerenciar configurações NFC-e
export function useNFCeConfig(empresaId: string | undefined) {
  const [config, setConfig] = useState<NFCeConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarConfig = useCallback(async () => {
    if (!empresaId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/nfce/config?empresa_id=${empresaId}`);
      const data = await response.json();
      
      if (data.sucesso) {
        setConfig(data.config || null);
      } else {
        setError(data.erro?.mensagem || 'Erro ao carregar configurações');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  const salvarConfig = useCallback(async (novaConfig: Partial<NFCeConfig>) => {
    if (!empresaId) return { sucesso: false, erro: 'Empresa não informada' };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/nfce/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaId,
          ...novaConfig,
        }),
      });
      
      const data = await response.json();
      
      if (data.sucesso) {
        setConfig(data.config);
        return { sucesso: true };
      } else {
        setError(data.erro?.mensagem || 'Erro ao salvar configurações');
        return { sucesso: false, erro: data.erro?.mensagem };
      }
    } catch (err) {
      setError('Erro de conexão');
      return { sucesso: false, erro: 'Erro de conexão' };
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  return {
    config,
    loading,
    error,
    carregarConfig,
    salvarConfig,
  };
}

// Hook para emitir NFC-e
export function useEmitirNFCe() {
  const [emitindo, setEmitindo] = useState(false);
  const [nfce, setNfce] = useState<NFCe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emitir = useCallback(async (dados: EmissaoNFCeRequest): Promise<EmissaoNFCeResponse> => {
    setEmitindo(true);
    setError(null);
    setNfce(null);
    
    try {
      const response = await fetch('/api/nfce/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      
      const data: EmissaoNFCeResponse = await response.json();
      
      if (data.sucesso && data.nfce) {
        setNfce(data.nfce);
        return data;
      } else {
        setError(data.erro?.mensagem || 'Erro ao emitir NFC-e');
        return data;
      }
    } catch (err) {
      const errorMsg = 'Erro de conexão';
      setError(errorMsg);
      return { sucesso: false, erro: { codigo: 'ERRO_CONEXAO', mensagem: errorMsg } };
    } finally {
      setEmitindo(false);
    }
  }, []);

  return {
    emitindo,
    nfce,
    error,
    emitir,
  };
}

// Hook para cancelar NFC-e
export function useCancelarNFCe() {
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelar = useCallback(async (dados: CancelamentoNFCeRequest): Promise<CancelamentoNFCeResponse> => {
    setCancelando(true);
    setError(null);
    
    try {
      const response = await fetch('/api/nfce/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      
      const data: CancelamentoNFCeResponse = await response.json();
      
      if (!data.sucesso) {
        setError(data.erro?.mensagem || 'Erro ao cancelar NFC-e');
      }
      
      return data;
    } catch (err) {
      const errorMsg = 'Erro de conexão';
      setError(errorMsg);
      return { sucesso: false, erro: { codigo: 'ERRO_CONEXAO', mensagem: errorMsg } };
    } finally {
      setCancelando(false);
    }
  }, []);

  return {
    cancelando,
    error,
    cancelar,
  };
}

// Hook para consultar NFC-e
export function useConsultarNFCe() {
  const [consultando, setConsultando] = useState(false);
  const [nfce, setNfce] = useState<NFCe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consultar = useCallback(async (nfceId?: string, chave?: string): Promise<ConsultaNFCeResponse> => {
    setConsultando(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (nfceId) params.append('nfce_id', nfceId);
      if (chave) params.append('chave', chave);
      
      const response = await fetch(`/api/nfce/consultar?${params.toString()}`);
      const data: ConsultaNFCeResponse = await response.json();
      
      if (data.sucesso && data.nfce) {
        setNfce(data.nfce);
        return data;
      } else {
        setError(data.erro?.mensagem || 'Erro ao consultar NFC-e');
        return data;
      }
    } catch (err) {
      const errorMsg = 'Erro de conexão';
      setError(errorMsg);
      return { sucesso: false, erro: { codigo: 'ERRO_CONEXAO', mensagem: errorMsg } };
    } finally {
      setConsultando(false);
    }
  }, []);

  return {
    consultando,
    nfce,
    error,
    consultar,
  };
}

// Hook para listar NFC-es
export function useNFCes(empresaId: string | undefined) {
  const [nfces, setNfces] = useState<NFCe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async (limite = 50, status?: string) => {
    if (!empresaId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('limite', limite.toString());
      if (status) params.append('status', status);
      
      const response = await fetch(`/api/nfce/emitir?${params.toString()}`);
      const data = await response.json();
      
      if (data.sucesso) {
        setNfces(data.nfces || []);
      } else {
        setError(data.erro?.mensagem || 'Erro ao carregar NFC-es');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  return {
    nfces,
    loading,
    error,
    carregar,
  };
}

// Aliases para compatibilidade com páginas existentes
export const useConfiguracoesNFCe = useNFCeConfig;
export const useCertificadoDigital = useCertificados;
