import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const etapas: string[] = [];
  try {
    const { empresaId } = await request.json();

    if (!empresaId) {
      return NextResponse.json({ erro: 'empresaId é obrigatório' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    etapas.push('buscar_usuarios');
    const { data: usuarios, error: erroBusca } = await supabase
      .from('usuarios')
      .select('id, auth_user_id')
      .eq('empresa_id', empresaId);

    if (erroBusca) {
      return NextResponse.json({ erro: `Erro ao buscar usuários: ${erroBusca.message}` }, { status: 500 });
    }

    etapas.push('deletar_auth_users');
    if (usuarios && usuarios.length > 0) {
      for (const usuario of usuarios) {
        if (usuario.auth_user_id) {
          try {
            const admin = supabase.auth.admin;
            if (!admin || typeof admin.deleteUser !== 'function') {
              console.error('auth.admin.deleteUser não disponível');
              continue;
            }
            const { error: erroAuth } = await admin.deleteUser(usuario.auth_user_id);
            if (erroAuth && !erroAuth.message?.includes('User not found')) {
              console.error('Erro ao deletar auth user:', erroAuth.message);
            }
          } catch (authError: any) {
            if (!authError.message?.includes('User not found')) {
              console.error('Exceção ao deletar auth user:', authError.message);
            }
          }
        }
      }
    }

    etapas.push('limpar_storage');
    try {
      const buckets = ['produto-imagens', 'empresa-logos'];
      for (const bucket of buckets) {
        const { data: files, error: listError } = await supabase.storage.from(bucket).list(empresaId, { limit: 1000 });
        if (listError) {
          console.warn(`Storage list error (${bucket}):`, listError.message);
          continue;
        }
        if (files && files.length > 0) {
          const paths = files.map(f => `${empresaId}/${f.name}`);
          const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
          if (removeError) console.warn(`Storage remove error (${bucket}):`, removeError.message);
        }
      }
    } catch (storageError) {
      console.error('Erro ao limpar storage:', storageError);
    }

    etapas.push('limpar_tabelas_antigas');
    const tabelasParaLimpar = ['servicos', 'vendedores', 'funcionarios', 'servicos_categorias', 'unidades', 'condicoes_pagamento', 'segmentos'];
    for (const tabela of tabelasParaLimpar) {
      try {
        const { error: err } = await supabase.from(tabela).delete().eq('empresa_id', empresaId);
        if (err && !err.message?.includes('does not exist')) {
          console.warn(`Erro ao limpar ${tabela}:`, err.message);
        }
      } catch (tabelaError: any) {
        console.warn(`Exceção ao limpar ${tabela}:`, tabelaError?.message || tabelaError);
      }
    }

    etapas.push('deletar_usuarios_tabela');
    const { error: erroUsuarios } = await supabase
      .from('usuarios')
      .delete()
      .eq('empresa_id', empresaId);

    if (erroUsuarios) {
      return NextResponse.json({ erro: `Erro ao deletar usuarios: ${erroUsuarios.message}`, etapa: 'deletar_usuarios_tabela' }, { status: 500 });
    }

    etapas.push('deletar_empresa');
    const { error: erroEmpresa } = await supabase
      .from('empresas')
      .delete()
      .eq('id', empresaId);

    if (erroEmpresa) {
      return NextResponse.json({ erro: `Erro ao deletar empresa: ${erroEmpresa.message}`, etapa: 'deletar_empresa' }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (error: any) {
    console.error(`Erro ao excluir empresa (etapas: ${etapas.join(' -> ')}):`, error?.message || error);
    return NextResponse.json({
      erro: error?.message || 'Erro interno do servidor',
      etapa: etapas.join(' -> ') || 'inicio',
    }, { status: 500 });
  }
}
