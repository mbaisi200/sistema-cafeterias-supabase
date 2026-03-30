import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API para configuração de NF-e
 * GET /api/nfe/config - Buscar configurações
 * POST /api/nfe/config - Salvar configurações
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    const targetEmpresaId = empresaId || usuario?.empresa_id;

    if (!targetEmpresaId) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '403', mensagem: 'Empresa não encontrada' } },
        { status: 403 }
      );
    }

    const { data: config, error } = await supabase
      .from('nfe_config')
      .select('*')
      .eq('empresa_id', targetEmpresaId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Não encontrou - retorna config vazia
      return NextResponse.json({
        sucesso: true,
        config: null,
        mensagem: 'Nenhuma configuração de NF-e encontrada. Crie uma nova configuração.',
      });
    }

    return NextResponse.json({
      sucesso: true,
      config: config || null,
    });

  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '401', mensagem: 'Não autorizado' } },
        { status: 401 }
      );
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (!usuario?.empresa_id) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: '403', mensagem: 'Empresa não encontrada' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const empresaId = body.empresa_id || usuario.empresa_id;

    // Verificar se já existe config
    const { data: existingConfig } = await supabase
      .from('nfe_config')
      .select('id')
      .eq('empresa_id', empresaId)
      .single();

    let result;

    if (existingConfig) {
      // Atualizar
      result = await supabase
        .from('nfe_config')
        .update({
          ambiente: body.ambiente || 'homologacao',
          cnpj: body.cnpj,
          inscricao_estadual: body.inscricao_estadual,
          inscricao_municipal: body.inscricao_municipal,
          razao_social: body.razao_social,
          nome_fantasia: body.nome_fantasia,
          logradouro: body.logradouro,
          numero: body.numero,
          complemento: body.complemento,
          bairro: body.bairro,
          codigo_municipio: body.codigo_municipio,
          municipio: body.municipio,
          uf: body.uf,
          cep: body.cep,
          telefone: body.telefone,
          email: body.email,
          regime_tributario: body.regime_tributario || '1',
          serie_nfe: body.serie_nfe || '1',
          numero_inicial_nfe: body.numero_inicial_nfe || 1,
          cfop_saida_padrao: body.cfop_saida_padrao || '5102',
          cfop_entrada_padrao: body.cfop_entrada_padrao || '2102',
          cst_padrao: body.cst_padrao || '00',
          csosn_padrao: body.csosn_padrao || '102',
          ncm_padrao: body.ncm_padrao || '00000000',
          unidade_padrao: body.unidade_padrao || 'UN',
          icms_aliquota: body.icms_aliquota || 0,
          icms_situacao_tributaria: body.icms_situacao_tributaria,
          pis_aliquota: body.pis_aliquota || 0,
          pis_situacao_tributaria: body.pis_situacao_tributaria,
          cofins_aliquota: body.cofins_aliquota || 0,
          cofins_situacao_tributaria: body.cofins_situacao_tributaria,
          ipi_aliquota: body.ipi_aliquota || 0,
          ipi_situacao_tributaria: body.ipi_situacao_tributaria,
          certificado_id: body.certificado_id,
          informacoes_adicionais: body.informacoes_adicionais,
          informacoes_fisco: body.informacoes_fisco,
          natureza_operacao_padrao: body.natureza_operacao_padrao || 'VENDA DE MERCADORIA',
          em_contingencia: body.em_contingencia || false,
          tipo_contingencia: body.tipo_contingencia,
          motivo_contingencia: body.motivo_contingencia,
          data_hora_contingencia: body.data_hora_contingencia || (body.em_contingencia ? new Date().toISOString() : null),
          imprimir_danfe_automatico: body.imprimir_danfe_automatico || false,
          formato_danfe: body.formato_danfe || 'A4',
          impressora_danfe: body.impressora_danfe,
          ativo: body.ativo !== undefined ? body.ativo : true,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', existingConfig.id)
        .select()
        .single();
    } else {
      // Criar
      result = await supabase
        .from('nfe_config')
        .insert({
          empresa_id: empresaId,
          ambiente: body.ambiente || 'homologacao',
          cnpj: body.cnpj,
          inscricao_estadual: body.inscricao_estadual,
          inscricao_municipal: body.inscricao_municipal,
          razao_social: body.razao_social,
          nome_fantasia: body.nome_fantasia,
          logradouro: body.logradouro,
          numero: body.numero,
          complemento: body.complemento,
          bairro: body.bairro,
          codigo_municipio: body.codigo_municipio,
          municipio: body.municipio,
          uf: body.uf,
          cep: body.cep,
          telefone: body.telefone,
          email: body.email,
          regime_tributario: body.regime_tributario || '1',
          serie_nfe: body.serie_nfe || '1',
          numero_inicial_nfe: body.numero_inicial_nfe || 1,
          numero_atual_nfe: body.numero_atual_nfe || 0,
          cfop_saida_padrao: body.cfop_saida_padrao || '5102',
          cfop_entrada_padrao: body.cfop_entrada_padrao || '2102',
          cst_padrao: body.cst_padrao || '00',
          csosn_padrao: body.csosn_padrao || '102',
          ncm_padrao: body.ncm_padrao || '00000000',
          unidade_padrao: body.unidade_padrao || 'UN',
          icms_aliquota: body.icms_aliquota || 0,
          icms_situacao_tributaria: body.icms_situacao_tributaria,
          pis_aliquota: body.pis_aliquota || 0,
          pis_situacao_tributaria: body.pis_situacao_tributaria,
          cofins_aliquota: body.cofins_aliquota || 0,
          cofins_situacao_tributaria: body.cofins_situacao_tributaria,
          ipi_aliquota: body.ipi_aliquota || 0,
          ipi_situacao_tributaria: body.ipi_situacao_tributaria,
          certificado_id: body.certificado_id,
          informacoes_adicionais: body.informacoes_adicionais,
          informacoes_fisco: body.informacoes_fisco,
          natureza_operacao_padrao: body.natureza_operacao_padrao || 'VENDA DE MERCADORIA',
          em_contingencia: body.em_contingencia || false,
          tipo_contingencia: body.tipo_contingencia,
          motivo_contingencia: body.motivo_contingencia,
          imprimir_danfe_automatico: body.imprimir_danfe_automatico || false,
          formato_danfe: body.formato_danfe || 'A4',
          impressora_danfe: body.impressora_danfe,
          ativo: body.ativo !== undefined ? body.ativo : true,
        })
        .select()
        .single();
    }

    if (result.error) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'DB001', mensagem: 'Erro ao salvar configurações: ' + result.error.message } },
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
