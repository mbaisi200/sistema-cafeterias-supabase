import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

const IFOOD_API_BASE_URL = 'https://merchant-api.ifood.com.br';

interface ProductToSync {
  id: string;
  externalCode: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  categoryName: string;
}

// POST - Sincronizar produtos com iFood
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase não inicializado' }, { status: 500 });
    }

    const body = await request.json();
    const { produtos, empresaId } = body as { produtos: ProductToSync[]; empresaId?: string };

    if (!produtos || produtos.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto fornecido' }, { status: 400 });
    }

    // Buscar configuração iFood
    let configQuery = supabase
      .from('ifood_config')
      .select('*')
      .eq('ativo', true);

    if (empresaId) {
      configQuery = configQuery.eq('empresa_id', empresaId);
    }

    const { data: config, error: configError } = await configQuery.single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Configuração iFood não encontrada' }, { status: 400 });
    }

    if (!config.merchant_id) {
      return NextResponse.json({ error: 'Merchant ID não configurado' }, { status: 400 });
    }

    // Verificar/renovar token se necessário
    let accessToken = config.access_token;
    
    if (!accessToken || new Date(config.token_expires_at) < new Date()) {
      // Tentar obter novo token
      if (config.client_id && config.client_secret) {
        try {
          const tokenResponse = await fetch('https://merchant-api.ifood.com.br/authentication', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: config.client_id,
              client_secret: config.client_secret,
            }),
          });

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            accessToken = tokenData.access_token;

            // Atualizar token no banco
            await supabase
              .from('ifood_config')
              .update({
                access_token: accessToken,
                token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                status: 'connected',
                atualizado_em: new Date().toISOString(),
              })
              .eq('id', config.id);
          }
        } catch (tokenError) {
          console.error('Erro ao obter token:', tokenError);
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Token de acesso não disponível' }, { status: 401 });
    }

    let synced = 0;
    let errors = 0;
    const results: any[] = [];

    // Sincronizar cada produto
    for (const produto of produtos) {
      try {
        // Montar payload do produto para iFood
        const payload = {
          externalCode: produto.externalCode,
          name: produto.name,
          description: produto.description || produto.name,
          price: Math.round(produto.price * 100), // iFood usa centavos
          category: {
            id: produto.categoryId,
            name: produto.categoryName,
          },
          status: 'AVAILABLE',
          shipping: {
            deliveryTime: config.tempo_preparo_padrao || 30,
            unit: 'MINUTES',
          },
        };

        // Verificar se produto já existe no iFood
        const { data: existingSync } = await supabase
          .from('ifood_produtos_sync')
          .select('*')
          .eq('produto_id', produto.id)
          .single();

        let ifoodProductId = existingSync?.ifood_product_id;
        let response;

        if (ifoodProductId) {
          // Atualizar produto existente
          response = await fetch(
            `${IFOOD_API_BASE_URL}/catalog/v1.0/merchant/${config.merchant_id}/products/${ifoodProductId}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          );
        } else {
          // Criar novo produto
          response = await fetch(
            `${IFOOD_API_BASE_URL}/catalog/v1.0/merchant/${config.merchant_id}/products`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          );
        }

        if (response.ok) {
          const responseData = await response.json();
          ifoodProductId = responseData.id || ifoodProductId;

          // Salvar/atualizar registro de sincronização
          await supabase
            .from('ifood_produtos_sync')
            .upsert({
              empresa_id: config.empresa_id,
              produto_id: produto.id,
              ifood_product_id: ifoodProductId,
              ifood_external_code: produto.externalCode,
              status: 'synced',
              ifood_status: 'AVAILABLE',
              ultimo_sync_em: new Date().toISOString(),
              preco_sincronizado: produto.price,
              atualizado_em: new Date().toISOString(),
            }, { onConflict: 'empresa_id,ifood_external_code' });

          // Atualizar produto com status sincronizado
          await supabase
            .from('produtos')
            .update({
              ifood_product_id: ifoodProductId,
              ifood_external_code: produto.externalCode,
              ifood_sync_status: 'synced',
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', produto.id);

          synced++;
          results.push({ id: produto.id, status: 'success', ifoodProductId });
        } else {
          const errorText = await response.text();
          console.error(`Erro ao sincronizar produto ${produto.id}:`, errorText);

          // Registrar erro
          await supabase
            .from('ifood_produtos_sync')
            .upsert({
              empresa_id: config.empresa_id,
              produto_id: produto.id,
              ifood_external_code: produto.externalCode,
              status: 'error',
              erro_sync: errorText,
              ultimo_sync_em: new Date().toISOString(),
              atualizado_em: new Date().toISOString(),
            }, { onConflict: 'empresa_id,ifood_external_code' });

          await supabase
            .from('produtos')
            .update({
              ifood_sync_status: 'error',
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', produto.id);

          errors++;
          results.push({ id: produto.id, status: 'error', error: errorText });
        }
      } catch (productError: any) {
        console.error(`Erro ao processar produto ${produto.id}:`, productError);
        errors++;
        results.push({ id: produto.id, status: 'error', error: productError.message });
      }
    }

    // Registrar log de sincronização
    await supabase
      .from('ifood_logs')
      .insert({
        empresa_id: config.empresa_id,
        tipo: 'sync_product',
        detalhes: `Sincronização de ${produtos.length} produtos: ${synced} sucesso, ${errors} erros`,
        dados: { synced, errors, results },
        sucesso: errors === 0,
        criado_em: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      synced,
      errors,
      results,
    });
  } catch (error: any) {
    console.error('Erro na sincronização iFood:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

// GET - Verificar status de sincronização
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase não inicializado' }, { status: 500 });
    }

    const url = new URL(request.url);
    const empresaId = url.searchParams.get('empresa_id');

    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa ID é obrigatório' }, { status: 400 });
    }

    // Buscar produtos sincronizados
    const { data: syncData, error } = await supabase
      .from('ifood_produtos_sync')
      .select(`
        *,
        produtos (nome, preco)
      `)
      .eq('empresa_id', empresaId);

    if (error) {
      console.error('Erro ao buscar sync status:', error);
      return NextResponse.json({ error: 'Erro ao buscar status' }, { status: 500 });
    }

    return NextResponse.json({
      produtos: syncData || [],
    });
  } catch (error: any) {
    console.error('Erro ao buscar status de sincronização:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
