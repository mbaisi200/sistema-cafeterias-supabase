/**
 * Hook para operações Uber Eats
 * 
 * Fornece funções para interagir com a API do Uber Eats:
 * - Confirmar pedido
 * - Iniciar/finalizar preparação
 * - Solicitar entregador
 * - Despachar pedido
 * - Cancelar pedido
 */

import { useState, useCallback } from 'react';

interface UseUberEatsOperationsOptions {
  empresaId: string;
  onSuccess?: (action: string, vendaId: string) => void;
  onError?: (error: string, action: string) => void;
}

interface UberEatsOperationResult {
  success: boolean;
  novoStatus?: string;
  error?: string;
}

export function useUberEatsOperations({ empresaId, onSuccess, onError }: UseUberEatsOperationsOptions) {
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  /**
   * Executar ação no pedido Uber Eats
   */
  const executeAction = useCallback(async (
    action: string,
    vendaId: string,
    orderId?: string,
    motivo?: string
  ): Promise<UberEatsOperationResult> => {
    setLoading(true);
    setLoadingAction(action);

    try {
      const response = await fetch('/api/uber-eats/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          empresaId,
          vendaId,
          orderId,
          motivo,
        }),
      });

      const json = await response.json();

      if (json.sucesso) {
        onSuccess?.(action, vendaId);
        return { success: true, novoStatus: json.data?.novoStatus };
      } else {
        const msg = json.erro?.mensagem || 'Erro desconhecido';
        onError?.(msg, action);
        return { success: false, error: msg };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro de conexão';
      onError?.(errorMessage, action);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }, [empresaId, onSuccess, onError]);

  /**
   * Aceitar pedido (fallback manual - webhook não respondeu)
   */
  const aceitarPedido = useCallback((vendaId: string, orderId?: string) => {
    return executeAction('accept', vendaId, orderId);
  }, [executeAction]);

  /**
   * Rejeitar pedido (fallback manual)
   */
  const rejeitarPedido = useCallback((vendaId: string, motivo: string, orderId?: string) => {
    return executeAction('deny', vendaId, orderId, motivo);
  }, [executeAction]);

  /**
   * Confirmar pedido
   */
  const confirmarPedido = useCallback((vendaId: string, orderId?: string) => {
    return executeAction('confirm', vendaId, orderId);
  }, [executeAction]);

  /**
   * Iniciar preparação
   */
  const iniciarPreparacao = useCallback((vendaId: string, orderId?: string) => {
    return executeAction('start_preparation', vendaId, orderId);
  }, [executeAction]);

  /**
   * Finalizar preparação
   */
  const finalizarPreparacao = useCallback((vendaId: string, orderId?: string) => {
    return executeAction('finish_preparation', vendaId, orderId);
  }, [executeAction]);

  /**
   * Solicitar entregador
   */
  const solicitarEntregador = useCallback((vendaId: string, orderId?: string) => {
    return executeAction('request_driver', vendaId, orderId);
  }, [executeAction]);

  /**
   * Despachar pedido
   */
  const despacharPedido = useCallback((vendaId: string, orderId?: string) => {
    return executeAction('dispatch', vendaId, orderId);
  }, [executeAction]);

  /**
   * Marcar como entregue
   */
  const marcarEntregue = useCallback((vendaId: string, orderId?: string) => {
    return executeAction('deliver', vendaId, orderId);
  }, [executeAction]);

  /**
   * Cancelar pedido
   */
  const cancelarPedido = useCallback((vendaId: string, motivo: string, orderId?: string) => {
    return executeAction('cancel', vendaId, orderId, motivo);
  }, [executeAction]);

  /**
   * Testar conexão com Uber Eats
   */
  const testarConexao = useCallback(async () => {
    setLoading(true);
    setLoadingAction('test_connection');

    try {
      const response = await fetch('/api/uber-eats/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_connection',
          empresaId,
        }),
      });

      const json = await response.json();
      return { success: json.sucesso, error: json.erro?.mensagem };
    } catch (error) {
      return { success: false, error: 'Erro de conexão' };
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }, [empresaId]);

  return {
    loading,
    loadingAction,
    aceitarPedido,
    rejeitarPedido,
    confirmarPedido,
    iniciarPreparacao,
    finalizarPreparacao,
    solicitarEntregador,
    despacharPedido,
    marcarEntregue,
    cancelarPedido,
    testarConexao,
  };
}

/**
 * Hook para buscar pedidos Uber Eats
 */
export function useUberEatsPedidos(empresaId: string | null) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarPedidos = useCallback(async () => {
    if (!empresaId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/uber-eats/pedidos?empresaId=${empresaId}`);
      const json = await response.json();

      if (!json.sucesso) {
        setError(json.erro?.mensagem || 'Erro ao carregar pedidos');
      } else {
        setPedidos(json.data || []);
      }
    } catch (err) {
      setError('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  return {
    pedidos,
    loading,
    error,
    carregarPedidos,
    setPedidos,
  };
}
