import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { pin, codigoEmpresa } = await request.json();

    if (!pin || !codigoEmpresa) {
      return NextResponse.json(
        { error: 'PIN e Código da Empresa são obrigatórios' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Usar service role para bypass de RLS (funcionário ainda não tem sessão auth)
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Buscar funcionários ativos com o PIN informado
    const { data: funcionarios, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('pin', pin)
      .eq('ativo', true);

    if (error) {
      console.error('Erro ao buscar funcionário por PIN:', error.message);
      return NextResponse.json(
        { error: 'Erro ao buscar funcionário' },
        { status: 500 }
      );
    }

    if (!funcionarios || funcionarios.length === 0) {
      return NextResponse.json(
        { error: 'PIN inválido' },
        { status: 404 }
      );
    }

    // Verificar se o código da empresa corresponde
    const codigoUpper = codigoEmpresa.toUpperCase();
    const funcionario = funcionarios.find((f: any) => {
      const funcEmpresaId = f.empresa_id || '';
      const funcCodigoEmpresa = funcEmpresaId.substring(0, 8).toUpperCase();
      return funcCodigoEmpresa === codigoUpper;
    });

    if (!funcionario) {
      return NextResponse.json(
        { error: 'Código da empresa inválido para este PIN' },
        { status: 404 }
      );
    }

    // Verificar se a empresa está ativa
    if (funcionario.empresa_id) {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('id, status, validade')
        .eq('id', funcionario.empresa_id)
        .single();

      if (empresa) {
        if (empresa.status === 'bloqueado') {
          return NextResponse.json(
            { error: 'Empresa bloqueada. Entre em contato com o administrador.' },
            { status: 403 }
          );
        }
        if (empresa.validade) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0);
          const validadeDate = new Date(empresa.validade);
          validadeDate.setHours(23, 59, 59);
          if (validadeDate < hoje) {
            return NextResponse.json(
              { error: 'Assinatura expirada. Entre em contato com o administrador.' },
              { status: 403 }
            );
          }
        }
      }
    }

    // Retornar dados do funcionário com cookie para o middleware
    const response = NextResponse.json({
      funcionario: {
        id: funcionario.id,
        nome: funcionario.nome,
        email: funcionario.email || '',
        cargo: funcionario.cargo,
        empresaId: funcionario.empresa_id,
        ativo: funcionario.ativo,
        criadoEm: funcionario.criado_em,
        atualizadoEm: funcionario.atualizado_em,
        permissoes: {
          pdv: funcionario.perm_pdv,
          pdv_garcom: funcionario.perm_pdv_garcom,
          estoque: funcionario.perm_estoque,
          financeiro: funcionario.perm_financeiro,
          relatorios: funcionario.perm_relatorios,
          cancelarVenda: funcionario.perm_cancelar_venda,
          darDesconto: funcionario.perm_dar_desconto,
        },
      },
    });

    // Definir cookie para o middleware reconhecer o funcionário autenticado
    // Cookie válido por 24 horas, NÃO HttpOnly para client poder verificar
    response.cookies.set('func_auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Erro no login de funcionário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE: Limpar cookie de autenticação do funcionário (logout)
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('func_auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
