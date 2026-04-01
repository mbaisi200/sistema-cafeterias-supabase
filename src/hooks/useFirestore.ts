// Este arquivo mantém compatibilidade com o código existente
// Reexporta os hooks do Supabase com os nomes antigos

export {
  useProdutos,
  useCategorias,
  useMesas,
  useFuncionarios,
  useVendas,
  useEmpresas,
  useContas,
  useLogs,
  registrarLog,
  useCaixa,
  useComandas,
  useConfiguracoesCupom,
  configuracoesCupomPadrao,
  useMovimentacoesBI,
  useFornecedores,
  buscarFornecedorPorCNPJ,
  useCombos,
  type ConfiguracoesCupom,
} from './useSupabase';
