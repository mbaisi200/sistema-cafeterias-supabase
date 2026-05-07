import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Tabelas que têm empresa_id e suas configurações
const TABELAS_COM_EMPRESA = [
  { nome: 'usuarios', colunaEmpresa: 'empresa_id', descricao: 'Usuários' },
  { nome: 'categorias', colunaEmpresa: 'empresa_id', descricao: 'Categorias' },
  { nome: 'produtos', colunaEmpresa: 'empresa_id', descricao: 'Produtos' },
  { nome: 'funcionarios', colunaEmpresa: 'empresa_id', descricao: 'Funcionários' },
  { nome: 'mesas', colunaEmpresa: 'empresa_id', descricao: 'Mesas' },
  { nome: 'vendas', colunaEmpresa: 'empresa_id', descricao: 'Vendas' },
  { nome: 'itens_venda', colunaEmpresa: 'empresa_id', descricao: 'Itens de Venda' },
  { nome: 'pagamentos', colunaEmpresa: 'empresa_id', descricao: 'Pagamentos' },
  { nome: 'caixas', colunaEmpresa: 'empresa_id', descricao: 'Caixas' },
  { nome: 'movimentacoes_caixa', colunaEmpresa: 'empresa_id', descricao: 'Movimentações de Caixa' },
  { nome: 'comandas', colunaEmpresa: 'empresa_id', descricao: 'Comandas' },
  { nome: 'contas', colunaEmpresa: 'empresa_id', descricao: 'Contas a Pagar/Receber' },
  { nome: 'estoque_movimentos', colunaEmpresa: 'empresa_id', descricao: 'Movimentos de Estoque' },
  { nome: 'logs', colunaEmpresa: 'empresa_id', descricao: 'Logs' },
  { nome: 'ifood_config', colunaEmpresa: 'empresa_id', descricao: 'Config iFood' },
  { nome: 'ifood_logs', colunaEmpresa: 'empresa_id', descricao: 'Logs iFood' },
  { nome: 'ifood_produtos_sync', colunaEmpresa: 'empresa_id', descricao: 'Sync iFood' },
  { nome: 'ifood_pedidos', colunaEmpresa: 'empresa_id', descricao: 'Pedidos iFood' },
  { nome: 'empresa_delivery_config', colunaEmpresa: 'empresa_id', descricao: 'Config Delivery' },
];

// Tamanho médio estimado por registro em bytes (valores aproximados)
const TAMANHO_MEDIO_REGISTRO: Record<string, number> = {
  usuarios: 500,
  categorias: 200,
  produtos: 800,
  funcionarios: 600,
  mesas: 150,
  vendas: 1200,
  itens_venda: 400,
  pagamentos: 300,
  caixas: 500,
  movimentacoes_caixa: 400,
  comandas: 1000,
  contas: 500,
  estoque_movimentos: 400,
  logs: 800,
  ifood_config: 600,
  ifood_logs: 1000,
  ifood_produtos_sync: 500,
  ifood_pedidos: 1500,
  empresa_delivery_config: 400,
};

const formatarTamanho = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

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

          for (const tabela of TABELAS_COM_EMPRESA.slice(0, 10)) { // Apenas principais tabelas
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
