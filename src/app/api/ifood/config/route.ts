import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

// GET - Buscar configuração iFood
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase não inicializado' }, { status: 500 });
    }

    // Buscar empresa_id do usuário logado
    const authHeader = request.headers.get('authorization');
    let empresaId = null;
    
    if (authHeader) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('auth_user_id', authHeader.replace('Bearer ', ''))
        .single();
      empresaId = userData?.empresa_id;
    }

    // Se não encontrou via auth, tentar via query param
    if (!empresaId) {
      const url = new URL(request.url);
      empresaId = url.searchParams.get('empresa_id');
    }

    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 });
    }

    const { data: config, error } = await supabase
      .from('ifood_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar config iFood:', error);
      return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 });
    }

    return NextResponse.json({ 
      config: config ? {
        id: config.id,
        empresaId: config.empresa_id,
        ativo: config.ativo,
        status: config.status,
        merchantId: config.merchant_id,
        clientId: config.client_id,
        sincronizarProdutos: config.sincronizar_produtos,
        sincronizarEstoque: config.sincronizar_estoque,
        sincronizarPrecos: config.sincronizar_precos,
        receberPedidosAutomatico: config.receber_pedidos_automatico,
        tempoPreparoPadrao: config.tempo_preparo_padrao,
        totalPedidosRecebidos: config.total_pedidos_recebidos,
        ultimoPedidoEm: config.ultimo_pedido_em,
        criadoEm: config.criado_em,
      } : null 
    });
  } catch (error) {
    console.error('Erro na API iFood config:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Salvar configuração iFood
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase não inicializado' }, { status: 500 });
    }

    const body = await request.json();
    const { empresaId, clientId, clientSecret, merchantId, ...otherConfig } = body;

    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa ID é obrigatório' }, { status: 400 });
    }

    // Verificar se já existe configuração
    const { data: existingConfig } = await supabase
      .from('ifood_config')
      .select('id')
      .eq('empresa_id', empresaId)
      .single();

    const configData = {
      empresa_id: empresaId,
      client_id: clientId,
      client_secret: clientSecret,
      merchant_id: merchantId,
      ativo: true,
      status: 'pending',
      sincronizar_produtos: otherConfig.sincronizarProdutos ?? true,
      sincronizar_estoque: otherConfig.sincronizarEstoque ?? true,
      sincronizar_precos: otherConfig.sincronizarPrecos ?? true,
      receber_pedidos_automatico: otherConfig.receberPedidosAutomatico ?? true,
      tempo_preparo_padrao: otherConfig.tempoPreparoPadrao ?? 30,
      atualizado_em: new Date().toISOString(),
    };

    let result;
    if (existingConfig?.id) {
      // Atualizar
      const { data, error } = await supabase
        .from('ifood_config')
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Criar
      const { data, error } = await supabase
        .from('ifood_config')
        .insert({
          ...configData,
          criado_em: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ 
      success: true, 
      config: {
        id: result.id,
        empresaId: result.empresa_id,
        ativo: result.ativo,
        status: result.status,
        merchantId: result.merchant_id,
      }
    });
  } catch (error) {
    console.error('Erro ao salvar config iFood:', error);
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
  }
}
