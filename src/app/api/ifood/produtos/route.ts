/**
 * API iFood - Sincronização de Produtos
 * 
 * Endpoints para sincronizar produtos com o iFood:
 * - Listar produtos sincronizados
 * - Sincronizar produto individual
 * - Atualizar disponibilidade
 * - Atualizar preço
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Constants iFood API
const IFOOD_API_BASE_URL = 'https://merchant-api.ifood.com.br';
const IFOOD_AUTH_URL = 'https://merchant-api.ifood.com.br/authentication';

// ============================================
// Helper Functions (reutilizado do pedidos)
// ============================================

async function getIFoodConfig(empresaId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ifood_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    empresa_id: data.empresa_id,
    client_id: data.client_id,
    client_secret: data.client_secret,
    merchant_id: data.merchant_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: data.token_expires_at,
  };
}

async function ensureValidToken(config: any): Promise<string> {
  const supabase = createAdminClient();

  if (config.access_token && config.token_expires_at) {
    const expiresAt = new Date(config.token_expires_at);
    const now = new Date();

    if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
      return config.access_token;
    }
  }

  // Obter novo token
  const response = await fetch(IFOOD_AUTH_URL, {
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

  if (!response.ok) {
    throw new Error('Erro ao obter token iFood');
  }

  const tokenData = await response.json();
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  await supabase
    .from('ifood_config')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      status: 'connected',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', config.id);

  return tokenData.access_token;
}

async function callIFoodAPI(
  accessToken: string,
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(`${IFOOD_API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================
// API Handlers
// ============================================

/**
 * GET - Listar produtos e status de sincronização
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar produtos da empresa
    const { data: produtos, error: produtosError } = await supabase
      .from('produtos')
      .select(`
        id,
        nome,
        codigo,
        preco,
        estoque_atual,
        ativo,
        categoria:categorias(id, nome),
        ifood_sync:ifood_produtos_sync(
          id,
          ifood_product_id,
          ifood_external_code,
          status,
          ifood_status,
          ultimo_sync_em,
          erro_sync,
          preco_sincronizado
        )
      `)
      .eq('empresa_id', empresaId)
      .order('nome');

    if (produtosError) throw produtosError;

    // Buscar configuração iFood
    const { data: config } = await supabase
      .from('ifood_config')
      .select('ativo, status')
      .eq('empresa_id', empresaId)
      .single();

    return NextResponse.json({
      produtos: produtos || [],
      ifoodAtivo: config?.ativo && config?.status === 'connected',
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}

/**
 * POST - Sincronizar produto(s) com iFood
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, empresaId, produtoId, produtos, disponivel, preco } = body;

    if (!action || !empresaId) {
      return NextResponse.json({ error: 'action e empresaId são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar configuração iFood
    const config = await getIFoodConfig(empresaId);
    if (!config) {
      return NextResponse.json({ error: 'Integração iFood não configurada' }, { status: 400 });
    }

    // Obter token válido
    const accessToken = await ensureValidToken(config);

    switch (action) {
      case 'sync_product': {
        // Sincronizar produto individual
        if (!produtoId) {
          return NextResponse.json({ error: 'produtoId é obrigatório' }, { status: 400 });
        }

        // Buscar produto
        const { data: produto } = await supabase
          .from('produtos')
          .select('*, categoria:categorias(id, nome)')
          .eq('id', produtoId)
          .single();

        if (!produto) {
          return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
        }

        // Verificar se já existe sincronização
        const { data: existingSync } = await supabase
          .from('ifood_produtos_sync')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('produto_id', produtoId)
          .single();

        const externalCode = produto.codigo || produto.id;

        // Preparar payload
        const payload = {
          externalCode,
          name: produto.nome,
          description: produto.descricao || produto.nome,
          price: produto.preco,
          category: {
            id: produto.categoria?.id || 'default',
            name: produto.categoria?.nome || 'Geral',
          },
          status: produto.ativo ? 'AVAILABLE' : 'UNAVAILABLE',
        };

        let result;

        if (existingSync?.ifood_product_id) {
          // Atualizar produto existente
          result = await callIFoodAPI(
            accessToken,
            'PUT',
            `/catalog/v1.0/merchant/${config.merchant_id}/products/${existingSync.ifood_product_id}`,
            payload
          );
        } else {
          // Criar novo produto
          result = await callIFoodAPI(
            accessToken,
            'POST',
            `/catalog/v1.0/merchant/${config.merchant_id}/products`,
            payload
          );
        }

        if (result.success) {
          const syncData = result.data as any;

          // Salvar/atualizar registro de sincronização
          await supabase
            .from('ifood_produtos_sync')
            .upsert({
              empresa_id: empresaId,
              produto_id: produtoId,
              ifood_product_id: existingSync?.ifood_product_id || syncData?.id,
              ifood_external_code: externalCode,
              status: 'synced',
              ifood_status: produto.ativo ? 'AVAILABLE' : 'UNAVAILABLE',
              ultimo_sync_em: new Date().toISOString(),
              preco_sincronizado: produto.preco,
              estoque_sincronizado: produto.estoque_atual,
              atualizado_em: new Date().toISOString(),
            }, { onConflict: 'empresa_id,ifood_external_code' });

          // Registrar log
          await supabase.from('ifood_logs').insert({
            empresa_id: empresaId,
            tipo: 'sync_product',
            detalhes: `Produto "${produto.nome}" sincronizado com iFood`,
            produto_id: produtoId,
            sucesso: true,
            criado_em: new Date().toISOString(),
          });
        } else {
          // Salvar erro
          await supabase
            .from('ifood_produtos_sync')
            .upsert({
              empresa_id: empresaId,
              produto_id: produtoId,
              ifood_external_code: externalCode,
              status: 'error',
              erro_sync: result.error,
              atualizado_em: new Date().toISOString(),
            }, { onConflict: 'empresa_id,ifood_external_code' });
        }

        return NextResponse.json({
          success: result.success,
          error: result.error,
        });
      }

      case 'sync_multiple': {
        // Sincronizar múltiplos produtos
        if (!produtos || !Array.isArray(produtos)) {
          return NextResponse.json({ error: 'produtos (array) é obrigatório' }, { status: 400 });
        }

        const results = [];

        for (const prodId of produtos) {
          // Buscar produto
          const { data: produto } = await supabase
            .from('produtos')
            .select('*, categoria:categorias(id, nome)')
            .eq('id', prodId)
            .single();

          if (!produto) continue;

          // Verificar sincronização existente
          const { data: existingSync } = await supabase
            .from('ifood_produtos_sync')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('produto_id', prodId)
            .single();

          const externalCode = produto.codigo || produto.id;

          const payload = {
            externalCode,
            name: produto.nome,
            description: produto.descricao || produto.nome,
            price: produto.preco,
            category: {
              id: produto.categoria?.id || 'default',
              name: produto.categoria?.nome || 'Geral',
            },
            status: produto.ativo ? 'AVAILABLE' : 'UNAVAILABLE',
          };

          let result;
          if (existingSync?.ifood_product_id) {
            result = await callIFoodAPI(
              accessToken,
              'PUT',
              `/catalog/v1.0/merchant/${config.merchant_id}/products/${existingSync.ifood_product_id}`,
              payload
            );
          } else {
            result = await callIFoodAPI(
              accessToken,
              'POST',
              `/catalog/v1.0/merchant/${config.merchant_id}/products`,
              payload
            );
          }

          if (result.success) {
            const syncData = result.data as any;
            await supabase
              .from('ifood_produtos_sync')
              .upsert({
                empresa_id: empresaId,
                produto_id: prodId,
                ifood_product_id: existingSync?.ifood_product_id || syncData?.id,
                ifood_external_code: externalCode,
                status: 'synced',
                ifood_status: produto.ativo ? 'AVAILABLE' : 'UNAVAILABLE',
                ultimo_sync_em: new Date().toISOString(),
                preco_sincronizado: produto.preco,
                atualizado_em: new Date().toISOString(),
              }, { onConflict: 'empresa_id,ifood_external_code' });
          }

          results.push({
            produtoId: prodId,
            nome: produto.nome,
            success: result.success,
            error: result.error,
          });
        }

        return NextResponse.json({ results });
      }

      case 'update_availability': {
        // Atualizar disponibilidade
        if (!produtoId || disponivel === undefined) {
          return NextResponse.json({ error: 'produtoId e disponivel são obrigatórios' }, { status: 400 });
        }

        // Buscar sincronização
        const { data: sync } = await supabase
          .from('ifood_produtos_sync')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('produto_id', produtoId)
          .single();

        if (!sync?.ifood_product_id) {
          return NextResponse.json({ error: 'Produto não sincronizado' }, { status: 400 });
        }

        const status = disponivel ? 'AVAILABLE' : 'UNAVAILABLE';

        const result = await callIFoodAPI(
          accessToken,
          'PATCH',
          `/catalog/v1.0/merchant/${config.merchant_id}/products/${sync.ifood_product_id}/status`,
          { status }
        );

        if (result.success) {
          await supabase
            .from('ifood_produtos_sync')
            .update({
              ifood_status: status,
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', sync.id);
        }

        return NextResponse.json({
          success: result.success,
          error: result.error,
        });
      }

      case 'update_price': {
        // Atualizar preço
        if (!produtoId || preco === undefined) {
          return NextResponse.json({ error: 'produtoId e preco são obrigatórios' }, { status: 400 });
        }

        // Buscar sincronização
        const { data: sync } = await supabase
          .from('ifood_produtos_sync')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('produto_id', produtoId)
          .single();

        if (!sync?.ifood_product_id) {
          return NextResponse.json({ error: 'Produto não sincronizado' }, { status: 400 });
        }

        const result = await callIFoodAPI(
          accessToken,
          'PATCH',
          `/catalog/v1.0/merchant/${config.merchant_id}/products/${sync.ifood_product_id}/price`,
          { price: preco }
        );

        if (result.success) {
          await supabase
            .from('ifood_produtos_sync')
            .update({
              preco_sincronizado: preco,
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', sync.id);
        }

        return NextResponse.json({
          success: result.success,
          error: result.error,
        });
      }

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Erro na API iFood produtos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
