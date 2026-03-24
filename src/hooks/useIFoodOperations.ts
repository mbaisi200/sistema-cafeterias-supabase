/**
 * Hook para operações iFood
 * 
 * Fornece funções para interagir com a API do iFood:
 * - Confirmar pedido
 * - Iniciar/finalizar preparação
 * - Solicitar entregador
 * - Despachar pedido
 * - Cancelar pedido
 */

import { useState, useCallback } from 'react';

interface UseIFoodOperationsOptions {
  empresaId: string;
  onSuccess?: (action: string, vendaId: string) => void;
  onError?: (error: string, action: string) => void;
}

interface IFoodOperationResult {
  success: boolean;
  novoStatus?: string;
  error?: string;
}

export function useIFoodOperations({ empresaId, onSuccess, onError }: UseIFoodOperationsOptions) {
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  /**
   * Executar ação no pedido iFood
   */
  const executeAction = useCallback(async (
    action: string,
    vendaId: string,
    orderId?: string,
    motivo?: string
  ): Promise<IFoodOperationResult> => {
    setLoading(true);
    setLoadingAction(action);

    try {
      const response = await fetch('/api/ifood/pedidos', {
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

      const data = await response.json();

      if (data.success) {
        onSuccess?.(action, vendaId);
        return { success: true, novoStatus: data.novoStatus };
      } else {
        onError?.(data.error || 'Erro desconhecido', action);
        return { success: false, error: data.error };
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
   * Testar conexão com iFood
   */
  const testarConexao = useCallback(async () => {
    setLoading(true);
    setLoadingAction('test_connection');

    try {
      const response = await fetch('/api/ifood/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_connection',
          empresaId,
        }),
      });

      const data = await response.json();
      return { success: data.success, error: data.error };
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
 * Hook para buscar pedidos iFood
 */
export function useIFoodPedidos(empresaId: string | null) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarPedidos = useCallback(async () => {
    if (!empresaId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ifood/pedidos?empresaId=${empresaId}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setPedidos(data.vendas || []);
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
