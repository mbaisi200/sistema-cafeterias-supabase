'use client';

import { useState, useCallback } from 'react';
import type {
  NFe,
  NFeConfig,
  EmissaoNFeRequest,
  EmissaoNFeResponse,
  CancelamentoNFeRequest,
  CancelamentoNFeResponse,
  ConsultaNFeResponse,
  InutilizacaoNFeRequest,
  InutilizacaoNFeResponse,
  CartaCorrecaoNFeRequest,
  CartaCorrecaoNFeResponse,
} from '@/types/nfe';

// Hook para gerenciar configurações NF-e
export function useNFeConfig(empresaId: string | undefined) {
  const [config, setConfig] = useState<NFeConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarConfig = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/nfe/config?empresa_id=${empresaId}`);
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

  const salvarConfig = useCallback(async (novaConfig: Partial<NFeConfig>) => {
    if (!empresaId) return { sucesso: false, erro: 'Empresa não informada' };
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/nfe/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: empresaId, ...novaConfig }),
      });
      const data = await response.json();
      if (data.sucesso) {
        setConfig(data.config);
        return { sucesso: true };
      } else {
        setError(data.erro?.mensagem || 'Erro ao salvar');
        return { sucesso: false, erro: data.erro?.mensagem };
      }
    } catch (err) {
      setError('Erro de conexão');
      return { sucesso: false, erro: 'Erro de conexão' };
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  return { config, loading, error, carregarConfig, salvarConfig };
}

// Hook para emitir NF-e
export function useEmitirNFe() {
  const [emitindo, setEmitindo] = useState(false);
  const [nfe, setNfe] = useState<NFe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emitir = useCallback(async (dados: EmissaoNFeRequest): Promise<EmissaoNFeResponse> => {
    setEmitindo(true);
    setError(null);
    setNfe(null);
    try {
      const response = await fetch('/api/nfe/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      const data: EmissaoNFeResponse = await response.json();
      if (data.sucesso && data.nfe) {
        setNfe(data.nfe);
      } else {
        setError(data.erro?.mensagem || 'Erro ao emitir NF-e');
      }
      return data;
    } catch (err) {
      const errorMsg = 'Erro de conexão';
      setError(errorMsg);
      return { sucesso: false, erro: { codigo: 'ERRO_CONEXAO', mensagem: errorMsg } };
    } finally {
      setEmitindo(false);
    }
  }, []);

  return { emitindo, nfe, error, emitir };
}

// Hook para cancelar NF-e
export function useCancelarNFe() {
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelar = useCallback(async (dados: CancelamentoNFeRequest): Promise<CancelamentoNFeResponse> => {
    setCancelando(true);
    setError(null);
    try {
      const response = await fetch('/api/nfe/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      const data: CancelamentoNFeResponse = await response.json();
      if (!data.sucesso) {
        setError(data.erro?.mensagem || 'Erro ao cancelar NF-e');
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

  return { cancelando, error, cancelar };
}

// Hook para consultar NF-e
export function useConsultarNFe() {
  const [consultando, setConsultando] = useState(false);
  const [nfe, setNfe] = useState<NFe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consultar = useCallback(async (nfeId?: string, chave?: string, consultarSefaz?: boolean): Promise<ConsultaNFeResponse> => {
    setConsultando(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nfeId) params.append('nfe_id', nfeId);
      if (chave) params.append('chave', chave);
      if (consultarSefaz) params.append('sefaz', 'true');
      const response = await fetch(`/api/nfe/consultar?${params.toString()}`);
      const data: ConsultaNFeResponse = await response.json();
      if (data.sucesso && data.nfe) {
        setNfe(data.nfe);
      } else {
        setError(data.erro?.mensagem || 'Erro ao consultar NF-e');
      }
      return data;
    } catch (err) {
      const errorMsg = 'Erro de conexão';
      setError(errorMsg);
      return { sucesso: false, erro: { codigo: 'ERRO_CONEXAO', mensagem: errorMsg } };
    } finally {
      setConsultando(false);
    }
  }, []);

  return { consultando, nfe, error, consultar };
}

// Hook para listar NF-es
export function useNFEs(empresaId: string | undefined) {
  const [nfes, setNfes] = useState<NFe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const carregar = useCallback(async (filtros?: {
    limite?: number;
    pagina?: number;
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    numero?: string;
  }) => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('limite', (filtros?.limite || 50).toString());
      params.append('pagina', (filtros?.pagina || 1).toString());
      if (filtros?.status) params.append('status', filtros.status);
      if (filtros?.dataInicio) params.append('data_inicio', filtros.dataInicio);
      if (filtros?.dataFim) params.append('data_fim', filtros.dataFim);
      if (filtros?.numero) params.append('numero', filtros.numero);

      const response = await fetch(`/api/nfe/emitir?${params.toString()}`);
      const data = await response.json();
      if (data.sucesso) {
        setNfes(data.nfes || []);
        setTotal(data.total || 0);
      } else {
        setError(data.erro?.mensagem || 'Erro ao carregar NF-es');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  return { nfes, loading, error, total, carregar };
}

// Hook para inutilizar numeração NF-e
export function useInutilizarNFe() {
  const [inutilizando, setInutilizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inutilizar = useCallback(async (dados: InutilizacaoNFeRequest): Promise<InutilizacaoNFeResponse> => {
    setInutilizando(true);
    setError(null);
    try {
      const response = await fetch('/api/nfe/inutilizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      const data: InutilizacaoNFeResponse = await response.json();
      if (!data.sucesso) {
        setError(data.erro?.mensagem || 'Erro ao inutilizar');
      }
      return data;
    } catch (err) {
      const errorMsg = 'Erro de conexão';
      setError(errorMsg);
      return { sucesso: false, erro: { codigo: 'ERRO_CONEXAO', mensagem: errorMsg } };
    } finally {
      setInutilizando(false);
    }
  }, []);

  return { inutilizando, error, inutilizar };
}

// Hook para Carta de Correção
export function useCartaCorrecaoNFe() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = useCallback(async (dados: CartaCorrecaoNFeRequest): Promise<CartaCorrecaoNFeResponse> => {
    setEnviando(true);
    setError(null);
    try {
      const response = await fetch('/api/nfe/carta-correcao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      const data: CartaCorrecaoNFeResponse = await response.json();
      if (!data.sucesso) {
        setError(data.erro?.mensagem || 'Erro ao enviar CC-e');
      }
      return data;
    } catch (err) {
      const errorMsg = 'Erro de conexão';
      setError(errorMsg);
      return { sucesso: false, erro: { codigo: 'ERRO_CONEXAO', mensagem: errorMsg } };
    } finally {
      setEnviando(false);
    }
  }, []);

  return { enviando, error, enviar };
}
