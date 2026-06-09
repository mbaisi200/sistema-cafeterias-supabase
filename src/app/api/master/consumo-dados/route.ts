import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Tabelas que têm empresa_id e suas configurações
const TABELAS_COM_EMPRESA = [
  { nome: 'usuarios', colunaEmpresa: 'empresa_id', descricao: 'Usuários' },
  { nome: 'clientes', colunaEmpresa: 'empresa_id', descricao: 'Clientes' },
  { nome: 'fornecedores', colunaEmpresa: 'empresa_id', descricao: 'Fornecedores' },
  { nome: 'categorias', colunaEmpresa: 'empresa_id', descricao: 'Categorias' },
  { nome: 'produtos', colunaEmpresa: 'empresa_id', descricao: 'Produtos' },
  { nome: 'unidades', colunaEmpresa: 'empresa_id', descricao: 'Unidades' },
  { nome: 'servicos', colunaEmpresa: 'empresa_id', descricao: 'Serviços' },
  { nome: 'condicoes_pagamento', colunaEmpresa: 'empresa_id', descricao: 'Condições de Pagamento' },
  { nome: 'funcionarios', colunaEmpresa: 'empresa_id', descricao: 'Funcionários' },
  { nome: 'mesas', colunaEmpresa: 'empresa_id', descricao: 'Mesas' },
  { nome: 'pedidos', colunaEmpresa: 'empresa_id', descricao: 'Pedidos' },
  { nome: 'ordens_servico', colunaEmpresa: 'empresa_id', descricao: 'Ordens de Serviço' },
  { nome: 'vendas', colunaEmpresa: 'empresa_id', descricao: 'Vendas' },
  { nome: 'itens_venda', colunaEmpresa: 'empresa_id', descricao: 'Itens de Venda' },
  { nome: 'pagamentos', colunaEmpresa: 'empresa_id', descricao: 'Pagamentos' },
  { nome: 'caixas', colunaEmpresa: 'empresa_id', descricao: 'Caixas' },
  { nome: 'movimentacoes_caixa', colunaEmpresa: 'empresa_id', descricao: 'Movimentações de Caixa' },
  { nome: 'comandas', colunaEmpresa: 'empresa_id', descricao: 'Comandas' },
  { nome: 'contas', colunaEmpresa: 'empresa_id', descricao: 'Contas a Pagar/Receber' },
  { nome: 'estoque_movimentos', colunaEmpresa: 'empresa_id', descricao: 'Movimentos de Estoque' },
  { nome: 'nfe', colunaEmpresa: 'empresa_id', descricao: 'NF-e' },
  { nome: 'nfe_config', colunaEmpresa: 'empresa_id', descricao: 'Config NF-e' },
  { nome: 'nfe_informacoes_padrao', colunaEmpresa: 'empresa_id', descricao: 'Info. Adicionais NF-e' },
  { nome: 'logs', colunaEmpresa: 'empresa_id', descricao: 'Logs' },
  { nome: 'dispositivos_usuario', colunaEmpresa: 'empresa_id', descricao: 'Dispositivos' },
  { nome: 'ifood_config', colunaEmpresa: 'empresa_id', descricao: 'Config iFood' },
  { nome: 'ifood_logs', colunaEmpresa: 'empresa_id', descricao: 'Logs iFood' },
  { nome: 'ifood_produtos_sync', colunaEmpresa: 'empresa_id', descricao: 'Sync iFood' },
  { nome: 'ifood_pedidos', colunaEmpresa: 'empresa_id', descricao: 'Pedidos iFood' },
  { nome: 'empresa_delivery_config', colunaEmpresa: 'empresa_id', descricao: 'Config Delivery' },
  { nome: 'uber_eats_config', colunaEmpresa: 'empresa_id', descricao: 'Config Uber Eats' },
  { nome: 'uber_eats_logs', colunaEmpresa: 'empresa_id', descricao: 'Logs Uber Eats' },
  { nome: 'uber_eats_pedidos', colunaEmpresa: 'empresa_id', descricao: 'Pedidos Uber Eats' },
  { nome: 'uber_eats_produtos_sync', colunaEmpresa: 'empresa_id', descricao: 'Sync Uber Eats' },
  { nome: 'lavanderia_itens_catalogo', colunaEmpresa: 'empresa_id', descricao: 'Catálogo Peças Lav.' },
  { nome: 'lavanderia_servicos_catalogo', colunaEmpresa: 'empresa_id', descricao: 'Catálogo Serv. Lav.' },
  { nome: 'lavanderia_precos', colunaEmpresa: 'empresa_id', descricao: 'Preços Lavanderia' },
  { nome: 'lavanderia_categorias', colunaEmpresa: 'empresa_id', descricao: 'Categorias Lavanderia' },
  { nome: 'carrinhos_abandonados', colunaEmpresa: 'empresa_id', descricao: 'Carrinhos Abandonados' },
  { nome: 'entregadores', colunaEmpresa: 'empresa_id', descricao: 'Entregadores' },
  { nome: 'atendimento_conversas', colunaEmpresa: 'empresa_id', descricao: 'Conversas Atendimento' },
  { nome: 'atendimento_mensagens', colunaEmpresa: 'empresa_id', descricao: 'Mensagens Atendimento' },
  { nome: 'atendimento_auto_respostas', colunaEmpresa: 'empresa_id', descricao: 'Auto-Respostas Atendimento' },
  { nome: 'pedido_delivery', colunaEmpresa: 'empresa_id', descricao: 'Pedidos Delivery' },
  { nome: 'pedido_delivery_itens', colunaEmpresa: 'empresa_id', descricao: 'Itens Delivery' },
  { nome: 'pedido_delivery_historico', colunaEmpresa: 'empresa_id', descricao: 'Histórico Delivery' },
  { nome: 'pedido_delivery_avaliacoes', colunaEmpresa: 'empresa_id', descricao: 'Avaliações Delivery' },
  { nome: 'cupons_desconto', colunaEmpresa: 'empresa_id', descricao: 'Cupons de Desconto' },
  { nome: 'cliente_enderecos', colunaEmpresa: 'empresa_id', descricao: 'Endereços Clientes' },
  { nome: 'programas_fidelidade', colunaEmpresa: 'empresa_id', descricao: 'Programas Fidelidade' },
  { nome: 'fidelidade_clientes', colunaEmpresa: 'empresa_id', descricao: 'Clientes Fidelidade' },
  { nome: 'fidelidade_transacoes', colunaEmpresa: 'empresa_id', descricao: 'Transações Fidelidade' },
  { nome: 'fidelidade_recompensas', colunaEmpresa: 'empresa_id', descricao: 'Recompensas Fidelidade' },
  { nome: 'subscription_invoices', colunaEmpresa: 'empresa_id', descricao: 'Faturas Assinatura' },
  { nome: 'whatsapp_config', colunaEmpresa: 'empresa_id', descricao: 'Config WhatsApp' },
  { nome: 'whatsapp_logs', colunaEmpresa: 'empresa_id', descricao: 'Logs WhatsApp' },
  { nome: 'whatsapp_sessoes', colunaEmpresa: 'empresa_id', descricao: 'Sessões WhatsApp' },
];

// Tamanho médio estimado por registro em bytes (valores aproximados)
const TAMANHO_MEDIO_REGISTRO: Record<string, number> = {
  usuarios: 500,
  clientes: 800,
  fornecedores: 600,
  categorias: 200,
  produtos: 800,
  unidades: 150,
  servicos: 400,
  condicoes_pagamento: 200,
  funcionarios: 600,
  mesas: 150,
  pedidos: 1500,
  ordens_servico: 2000,
  vendas: 1200,
  itens_venda: 400,
  pagamentos: 300,
  caixas: 500,
  movimentacoes_caixa: 400,
  comandas: 1000,
  contas: 500,
  estoque_movimentos: 400,
  nfe: 2000,
  nfe_config: 500,
  nfe_informacoes_padrao: 300,
  logs: 800,
  dispositivos_usuario: 300,
  ifood_config: 600,
  ifood_logs: 1000,
  ifood_produtos_sync: 500,
  ifood_pedidos: 1500,
  empresa_delivery_config: 400,
  uber_eats_config: 600,
  uber_eats_logs: 1000,
  uber_eats_pedidos: 1500,
  uber_eats_produtos_sync: 500,
  lavanderia_itens_catalogo: 200,
  lavanderia_servicos_catalogo: 200,
  lavanderia_precos: 150,
  lavanderia_categorias: 200,
  carrinhos_abandonados: 1000,
  entregadores: 300,
  pedido_delivery: 1000,
  pedido_delivery_itens: 400,
  pedido_delivery_historico: 200,
  pedido_delivery_avaliacoes: 300,
  cupons_desconto: 400,
  cliente_enderecos: 300,
  programas_fidelidade: 500,
  fidelidade_clientes: 300,
  fidelidade_transacoes: 200,
  fidelidade_recompensas: 300,
  subscription_invoices: 400,
  atendimento_conversas: 300,
  atendimento_mensagens: 400,
  atendimento_auto_respostas: 200,
  whatsapp_config: 600,
  whatsapp_logs: 500,
  whatsapp_sessoes: 300,
};

const formatarTamanho = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// Buscar estatísticas do Storage (imagens, logos)
async function fetchStorageStats(supabaseUrl: string, serviceKey: string) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const storageClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const bucketsLista = ['produto-imagens', 'empresa-logos'];
    const nomesBuckets: Record<string, string> = {
      'produto-imagens': 'Imagens de Produtos',
      'empresa-logos': 'Logos das Empresas',
    };

    const bucketsMap: Record<string, { nome: string; arquivos: number; bytes: number }> = {};

    for (const bucketId of bucketsLista) {
      const storageApi = storageClient.storage.from(bucketId);
      const todosArquivos: { name: string; metadata: any }[] = [];

      // Lista recursiva: busca itens da raiz e depois dentro de cada pasta
      const listarRecursivo = async (prefix: string) => {
        const { data: items } = await storageApi.list(prefix, {
          limit: 10000,
          offset: 0,
        });
        if (!items) return;

        for (const item of items) {
          if (item.id === null) {
            // É uma pasta — lista recursivamente
            await listarRecursivo(item.name);
          } else {
            // É um arquivo
            const size = (item.metadata as any)?.size || 0;
            todosArquivos.push({ name: item.name, metadata: item.metadata });
          }
        }
      };

      await listarRecursivo('');

      const totalBytes = todosArquivos.reduce((acc, f) => acc + Number((f.metadata as any)?.size || 0), 0);

      bucketsMap[bucketId] = {
        nome: nomesBuckets[bucketId] || bucketId,
        arquivos: todosArquivos.length,
        bytes: totalBytes,
      };
    }

    const buckets = Object.values(bucketsMap).map(b => ({
      ...b,
      tamanhoFormatado: formatarTamanho(b.bytes),
    }));

    const totalBytes = buckets.reduce((acc, b) => acc + b.bytes, 0);
    const totalArquivos = buckets.reduce((acc, b) => acc + b.arquivos, 0);

    return {
      buckets,
      totalArquivos,
      totalBytes,
      totalFormatado: formatarTamanho(totalBytes),
    };
  } catch {
    return { buckets: [], totalArquivos: 0, totalBytes: 0, totalFormatado: '0 B' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const modo = searchParams.get('modo'); // 'todos' para visão consolidada

    // Buscar todas as empresas
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('id, nome, cnpj, status, email, telefone, cidade, estado')
      .order('nome');

    if (empresasError) {
      return NextResponse.json({ error: 'Erro ao buscar empresas' }, { status: 500 });
    }

    // MODO: Visão consolidada de todos os clientes
    if (modo === 'todos' || empresaId === 'todos') {
      // Buscar contagem total por tabela (sem filtro de empresa)
      const consumoPorTabela = await Promise.all(
        TABELAS_COM_EMPRESA.map(async (tabela) => {
          const { count, error } = await supabase
            .from(tabela.nome)
            .select('*', { count: 'exact', head: true });

          if (error) {
            return {
              tabela: tabela.nome,
              descricao: tabela.descricao,
              registros: 0,
              tamanhoEstimado: 0,
            };
          }

          const tamanhoEstimado = (count || 0) * (TAMANHO_MEDIO_REGISTRO[tabela.nome] || 500);

          return {
            tabela: tabela.nome,
            descricao: tabela.descricao,
            registros: count || 0,
            tamanhoEstimado,
          };
        })
      );

      // Calcular totais
      const totalRegistros = consumoPorTabela.reduce((acc, t) => acc + t.registros, 0);
      const totalTamanhoEstimado = consumoPorTabela.reduce((acc, t) => acc + t.tamanhoEstimado, 0);

      // Buscar consumo por empresa
      const consumoPorEmpresa = await Promise.all(
        (empresas || []).map(async (empresa) => {
          let registrosEmpresa = 0;
          let tamanhoEmpresa = 0;

          for (const tabela of TABELAS_COM_EMPRESA) {
            const { count } = await supabase
              .from(tabela.nome)
              .select('*', { count: 'exact', head: true })
              .eq(tabela.colunaEmpresa, empresa.id);

            const qtd = count || 0;
            registrosEmpresa += qtd;
            tamanhoEmpresa += qtd * (TAMANHO_MEDIO_REGISTRO[tabela.nome] || 500);
          }

          return {
            id: empresa.id,
            nome: empresa.nome,
            cnpj: empresa.cnpj,
            status: empresa.status,
            cidade: empresa.cidade,
            estado: empresa.estado,
            registros: registrosEmpresa,
            tamanhoEstimado: tamanhoEmpresa,
            tamanhoFormatado: formatarTamanho(tamanhoEmpresa),
            percentual: totalRegistros > 0 ? (registrosEmpresa / totalRegistros) * 100 : 0,
          };
        })
      );

      // Ordenar por consumo
      consumoPorEmpresa.sort((a, b) => b.registros - a.registros);

      // Buscar vendas totais 30 dias
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      const { data: vendasRecentes } = await supabase
        .from('vendas')
        .select('total, criado_em')
        .gte('criado_em', trintaDiasAtras.toISOString());

      const totalVendas30Dias = (vendasRecentes || []).reduce((acc, v) => acc + (Number(v.total) || 0), 0);

      const storageStats = await fetchStorageStats(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      return NextResponse.json({
        modo: 'todos',
        empresas: empresas || [],
        consumoPorEmpresa,
        consumoTotal: {
          porTabela: consumoPorTabela.sort((a, b) => b.registros - a.registros),
          total: {
            registros: totalRegistros,
            tamanhoEstimado: totalTamanhoEstimado,
            tamanhoFormatado: formatarTamanho(totalTamanhoEstimado),
          },
        },
        storage: storageStats,
        estatisticas: {
          totalEmpresas: (empresas || []).length,
          empresasAtivas: (empresas || []).filter(e => e.status === 'ativo').length,
          vendas30Dias: totalVendas30Dias,
        },
      });
    }

    // Se não especificou empresa, retornar lista de empresas com resumo
    if (!empresaId) {
      const empresasComResumo = await Promise.all(
        (empresas || []).map(async (empresa) => {
          const [{ count: totalVendas }, { count: totalProdutos }, { count: totalUsuarios }] = await Promise.all([
            supabase.from('vendas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresa.id),
            supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('empresa_id', empresa.id),
            supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('empresa_id', empresa.id),
          ]);

          return {
            id: empresa.id,
            nome: empresa.nome,
            cnpj: empresa.cnpj,
            status: empresa.status,
            resumo: {
              totalVendas: totalVendas || 0,
              totalProdutos: totalProdutos || 0,
              totalUsuarios: totalUsuarios || 0,
            },
          };
        })
      );

      return NextResponse.json({ empresas: empresasComResumo });
    }

    // Se especificou empresa, buscar detalhes completos
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome, cnpj, status, email, telefone, cidade, estado')
      .eq('id', empresaId)
      .single();

    if (empresaError || !empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // Buscar contagem de registros por tabela
    const consumoPorTabela = await Promise.all(
      TABELAS_COM_EMPRESA.map(async (tabela) => {
        const { count, error } = await supabase
          .from(tabela.nome)
          .select('*', { count: 'exact', head: true })
          .eq(tabela.colunaEmpresa, empresaId);

        if (error) {
          return {
            tabela: tabela.nome,
            descricao: tabela.descricao,
            registros: 0,
            tamanhoEstimado: 0,
          };
        }

        const tamanhoEstimado = (count || 0) * (TAMANHO_MEDIO_REGISTRO[tabela.nome] || 500);

        return {
          tabela: tabela.nome,
          descricao: tabela.descricao,
          registros: count || 0,
          tamanhoEstimado,
        };
      })
    );

    // Calcular totais
    const totalRegistros = consumoPorTabela.reduce((acc, t) => acc + t.registros, 0);
    const totalTamanhoEstimado = consumoPorTabela.reduce((acc, t) => acc + t.tamanhoEstimado, 0);

    // Buscar dados adicionais de vendas por período
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const { data: vendasRecentes, error: vendasError } = await supabase
      .from('vendas')
      .select('id, total, criado_em')
      .eq('empresa_id', empresaId)
      .gte('criado_em', trintaDiasAtras.toISOString())
      .order('criado_em', { ascending: false });

    // Agrupar vendas por dia
    const vendasPorDia: Record<string, { quantidade: number; total: number }> = {};
    (vendasRecentes || []).forEach((venda) => {
      const dia = new Date(venda.criado_em).toISOString().split('T')[0];
      if (!vendasPorDia[dia]) {
        vendasPorDia[dia] = { quantidade: 0, total: 0 };
      }
      vendasPorDia[dia].quantidade++;
      vendasPorDia[dia].total += Number(venda.total) || 0;
    });

    // Calcular estatísticas de vendas
    const totalVendas30Dias = (vendasRecentes || []).reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    const mediaVendasDiaria = Object.keys(vendasPorDia).length > 0
      ? totalVendas30Dias / Object.keys(vendasPorDia).length
      : 0;

    const storageStats = await fetchStorageStats(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const resultado = {
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        cnpj: empresa.cnpj,
        status: empresa.status,
        email: empresa.email,
        telefone: empresa.telefone,
        cidade: empresa.cidade,
        estado: empresa.estado,
      },
      consumo: {
        porTabela: consumoPorTabela.sort((a, b) => b.registros - a.registros),
        total: {
          registros: totalRegistros,
          tamanhoEstimado: totalTamanhoEstimado,
          tamanhoFormatado: formatarTamanho(totalTamanhoEstimado),
        },
      },
      storage: storageStats,
      estatisticas: {
        vendas30Dias: {
          total: totalVendas30Dias,
          mediaDiaria: mediaVendasDiaria,
          quantidade: (vendasRecentes || []).length,
          porDia: Object.entries(vendasPorDia)
            .map(([data, dados]) => ({ data, ...dados }))
            .sort((a, b) => a.data.localeCompare(b.data))
            .slice(-30),
        },
      },
    };

    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
