import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API para buscar configurações NFC-e
 * GET /api/nfce/config
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');

    if (!empresaId) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'empresa_id é obrigatório' } },
        { status: 400 }
      );
    }

    // Buscar configurações
    const { data: config, error: configError } = await supabase
      .from('nfce_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    // Buscar certificados
    const { data: certificados } = await supabase
      .from('nfce_certificados')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('criado_em', { ascending: false });

    // Certificado ativo
    const certificadoAtivo = certificados?.[0] || null;
    
    // Info do certificado
    let infoCertificado = null;
    if (certificadoAtivo) {
      const validadeFim = new Date(certificadoAtivo.validade_fim);
      const hoje = new Date();
      const diasRestantes = Math.ceil((validadeFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      
      infoCertificado = {
        razaoSocial: certificadoAtivo.razao_social,
        cnpj: certificadoAtivo.cnpj,
        validadeInicio: certificadoAtivo.validade_inicio,
        validadeFim: certificadoAtivo.validade_fim,
        emissor: certificadoAtivo.emissor,
        diasRestantes,
      };
    }

    return NextResponse.json({
      sucesso: true,
      config: config || null,
      certificados: certificados || [],
      certificadoAtivo,
      infoCertificado,
    });

  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nfce/config
 * Salva configurações NFC-e
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { empresa_id, ...dados } = body;

    if (!empresa_id) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '400', mensagem: 'empresa_id é obrigatório' } },
        { status: 400 }
      );
    }

    // Verificar se já existe
    const { data: existente } = await supabase
      .from('nfce_config')
      .select('id')
      .eq('empresa_id', empresa_id)
      .maybeSingle();

    let result;
    if (existente) {
      // Atualizar
      const { data, error } = await supabase
        .from('nfce_config')
        .update({
          ...dados,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', existente.id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      // Criar
      const { data, error } = await supabase
        .from('nfce_config')
        .insert({
          empresa_id,
          ...dados,
        })
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'DB001', mensagem: 'Erro ao salvar configurações' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      config: result.data,
    });

  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}
