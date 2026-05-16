import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

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
];

const TABELAS_GLOBAIS = [
  { nome: 'empresas', descricao: 'Empresas' },
];

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const tipo = searchParams.get('tipo') || 'exportar';

    const dados: Record<string, any[]> = {};
    const erros: string[] = [];
    let totalRegistros = 0;

    if (tipo === 'backup') {
      for (const tabela of TABELAS_GLOBAIS) {
        const { data, error } = await supabase.from(tabela.nome).select('*');
        if (error) {
          erros.push(`${tabela.nome}: ${error.message}`);
        } else {
          dados[tabela.nome] = data || [];
          totalRegistros += (data || []).length;
        }
      }
    }

    for (const tabela of TABELAS_COM_EMPRESA) {
      let query = supabase.from(tabela.nome).select('*');

      if (empresaId && empresaId !== 'todas') {
        query = query.eq(tabela.colunaEmpresa, empresaId);
      }

      if (tabela.nome === 'vendas') {
        query = query.order('criado_em', { ascending: false }).limit(5000);
      } else if (tabela.nome === 'itens_venda') {
        query = query.order('criado_em', { ascending: false }).limit(10000);
      } else {
        query = query.limit(10000);
      }

      const { data, error } = await query;

      if (error) {
        erros.push(`${tabela.nome}: ${error.message}`);
      } else {
        dados[tabela.nome] = data || [];
        totalRegistros += (data || []).length;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const resultado = {
      metadados: {
        tipo,
        geradoEm: new Date().toISOString(),
        empresaId: empresaId || 'todas',
        totalTabelas: Object.keys(dados).length,
        totalRegistros,
        erros: erros.length > 0 ? erros : undefined,
      },
      dados,
    };

    const filename = tipo === 'backup'
      ? `backup-sistema-${timestamp}.json`
      : empresaId && empresaId !== 'todas'
        ? `exportar-dados-${empresaId}-${timestamp}.json`
        : `exportar-dados-completo-${timestamp}.json`;

    const body = JSON.stringify(resultado, null, 2);

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao exportar dados', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
