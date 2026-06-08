import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const USER_REF_FIELDS = [
  'criado_por', 'vendedor_id', 'cancelado_por', 'funcionario_id',
  'usuario_id', 'responsavel_id', 'atendente_id',
];

const ORDEM_DELETE = [
  'itens_venda', 'pagamentos', 'movimentacoes_caixa', 'comandas',
  'estoque_movimentos', 'nfe_eventos', 'nfe', 'vendas', 'pedidos',
  'ordens_servico', 'caixas', 'ifood_pedidos', 'ifood_logs',
  'ifood_produtos_sync', 'uber_eats_pedidos', 'uber_eats_logs',
  'uber_eats_produtos_sync', 'logs', 'dispositivos_usuario', 'contas',
  'fidelidade_transacoes', 'fidelidade_clientes', 'fidelidade_recompensas',
  'nfe_informacoes_padrao', 'nfe_config', 'empresa_delivery_config',
  'ifood_config', 'uber_eats_config', 'lavanderia_precos',
  'lavanderia_itens_catalogo', 'lavanderia_servicos_catalogo',
  'lavanderia_categorias', 'funcionarios', 'mesas',
  'condicoes_pagamento', 'servicos', 'servicos_categorias',
  'unidades', 'produtos', 'categorias', 'fornecedores', 'clientes',
];

const ORDEM_INSERT = [
  'clientes', 'fornecedores', 'categorias', 'produtos', 'unidades',
  'servicos', 'servicos_categorias', 'condicoes_pagamento', 'mesas',
  'funcionarios', 'lavanderia_categorias', 'lavanderia_itens_catalogo',
  'lavanderia_servicos_catalogo', 'lavanderia_precos',
  'ifood_config', 'uber_eats_config', 'empresa_delivery_config',
  'nfe_config', 'nfe_informacoes_padrao', 'contas',
  'fidelidade_recompensas', 'fidelidade_clientes', 'fidelidade_transacoes',
  'dispositivos_usuario', 'logs', 'uber_eats_produtos_sync',
  'uber_eats_logs', 'uber_eats_pedidos', 'ifood_produtos_sync',
  'ifood_logs', 'ifood_pedidos', 'caixas', 'ordens_servico', 'pedidos',
  'vendas', 'nfe', 'nfe_eventos', 'estoque_movimentos', 'comandas',
  'movimentacoes_caixa', 'pagamentos', 'itens_venda',
];

function remapEmpresaId(registros: any[], oldId: string, newId: string): any[] {
  return registros.map(r => {
    const novo = { ...r };
    for (const key of Object.keys(novo)) {
      if (key === 'empresa_id' && novo[key] === oldId) {
        novo[key] = newId;
      }
    }
    return novo;
  });
}

function buildUserMapping(backupUsuarios: any[], currentUsuarios: any[]): Map<string, string> {
  const map = new Map<string, string>();
  const currentByEmail = new Map<string, string>();
  for (const u of currentUsuarios) {
    if (u.email) currentByEmail.set(u.email.toLowerCase().trim(), u.id);
    if (u.auth_user_id) currentByEmail.set(u.auth_user_id, u.id);
  }
  for (const oldUser of backupUsuarios) {
    if (oldUser.email) {
      const match = currentByEmail.get(oldUser.email.toLowerCase().trim());
      if (match) {
        map.set(oldUser.id, match);
        if (oldUser.auth_user_id) map.set(oldUser.auth_user_id, match);
      }
    }
  }
  return map;
}

function remapUserRefs(registros: any[], userMap: Map<string, string>): any[] {
  return registros.map(r => {
    const novo = { ...r };
    for (const key of Object.keys(novo)) {
      if (USER_REF_FIELDS.includes(key) && typeof novo[key] === 'string' && userMap.has(novo[key])) {
        novo[key] = userMap.get(novo[key])!;
      }
    }
    return novo;
  });
}

export async function POST(request: NextRequest) {
  const log: string[] = [];
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { backup, targetEmpresaId } = body;

    if (!backup || !backup.dados || !targetEmpresaId) {
      return NextResponse.json({ error: 'Campos obrigatórios: backup, targetEmpresaId' }, { status: 400 });
    }

    const dados = backup.dados;
    log.push(`Backup carregado: ${backup.metadados?.totalRegistros || '?'} registros`);

    const oldEmpresaId = (() => {
      for (const tabela of ORDEM_DELETE) {
        const registros = dados[tabela];
        if (registros && registros.length > 0 && registros[0].empresa_id) {
          return registros[0].empresa_id;
        }
      }
      return null;
    })();
    log.push(`empresa_id antigo: ${oldEmpresaId}, novo: ${targetEmpresaId}`);

    const backupUsuarios = dados['usuarios'] || [];
    const { data: currentUsuarios } = await supabase
      .from('usuarios')
      .select('id, email, auth_user_id')
      .eq('empresa_id', targetEmpresaId);

    const userMap = buildUserMapping(backupUsuarios, currentUsuarios || []);
    log.push(`Mapeamento de usuários: ${userMap.size} correspondências`);

    const errosDelete: string[] = [];
    const errosInsert: string[] = [];
    let totalInseridos = 0;

    // Limpar dados existentes da empresa alvo
    for (const tabela of ORDEM_DELETE) {
      if (!dados[tabela]) continue;
      try {
        const { error } = await supabase.from(tabela).delete().eq('empresa_id', targetEmpresaId);
        if (error && !error.message?.includes('does not exist') && !error.message?.includes('violates foreign key')) {
          errosDelete.push(`${tabela}: ${error.message}`);
        }
      } catch (e: any) {
        if (!e.message?.includes('does not exist')) {
          errosDelete.push(`${tabela}: ${e.message}`);
        }
      }
    }
    log.push(`Limpeza concluída. ${errosDelete.length} erros`);

    // Inserir dados restaurados (em lotes de 50 para evitar FK total failure)
    const BATCH_SIZE = 50;
    for (const tabela of ORDEM_INSERT) {
      const registros = dados[tabela];
      if (!registros || registros.length === 0) continue;

      let processados = registros;
      if (oldEmpresaId) {
        processados = remapEmpresaId(processados, oldEmpresaId, targetEmpresaId);
      }
      processados = remapUserRefs(processados, userMap);

      let inseridos = 0;
      for (let i = 0; i < processados.length; i += BATCH_SIZE) {
        const lote = processados.slice(i, i + BATCH_SIZE);
        try {
          const { error } = await supabase.from(tabela).insert(lote);
          if (error) {
            // Tenta inserir um por um se o lote falhou
            for (const item of lote) {
              try {
                const { error: e2 } = await supabase.from(tabela).insert(item);
                if (e2) {
                  if (!e2.message?.includes('duplicate key')) {
                    errosInsert.push(`${tabela}: ${e2.message.slice(0, 100)}`);
                  }
                } else {
                  inseridos++;
                }
              } catch (e2: any) {
                errosInsert.push(`${tabela}: ${e2.message}`);
              }
            }
          } else {
            inseridos += lote.length;
          }
        } catch (e: any) {
          errosInsert.push(`${tabela}: ${e.message}`);
        }
      }
      if (inseridos > 0) {
        totalInseridos += inseridos;
      }
    }
    log.push(`Inseridos ${totalInseridos} registros. ${errosInsert.length} erros`);

    return NextResponse.json({
      sucesso: true,
      totalInseridos,
      errosDelete: errosDelete.length > 0 ? errosDelete : undefined,
      errosInsert: errosInsert.length > 0 ? errosInsert : undefined,
      log,
      aviso: userMap.size === 0 && backupUsuarios.length > 0
        ? 'Nenhum usuário do backup encontrado no sistema atual. Referências (criado_por, vendedor_id, etc.) foram mantidas como estavam e podem estar quebradas.'
        : undefined,
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Erro ao restaurar backup',
      details: error?.message || 'Erro desconhecido',
      log,
    }, { status: 500 });
  }
}
