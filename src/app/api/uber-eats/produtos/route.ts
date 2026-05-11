import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, empresaId, ...params } = body;

    if (!empresaId) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'EMPRESA_ID_REQUIRED', mensagem: 'empresaId é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();

    switch (action) {
      case 'sync_product': {
        const { produtoId, externalCode, nome, descricao, preco, disponivel } = params;

        const { data: sync, error: syncError } = await supabase
          .from('uber_eats_produtos_sync')
          .upsert({
            empresa_id: empresaId,
            produto_id: produtoId,
            uber_eats_external_code: externalCode,
            status: 'synced',
            uber_eats_status: disponivel ? 'AVAILABLE' : 'UNAVAILABLE',
            preco_sincronizado: preco,
            ultimo_sync_em: new Date().toISOString(),
          }, { onConflict: 'empresa_id, uber_eats_external_code' })
          .select()
          .single();

        if (syncError) throw syncError;

        await supabase.from('uber_eats_logs').insert({
          empresa_id: empresaId,
          tipo: 'sync_product',
          produto_id: produtoId,
          sucesso: true,
          detalhes: `Produto ${nome} sincronizado com Uber Eats`,
        });

        return NextResponse.json({ sucesso: true, data: sync });
      }

      case 'sync_multiple': {
        const { produtos } = params;
        const results = [];

        for (const prod of produtos) {
          const { data } = await supabase
            .from('uber_eats_produtos_sync')
            .upsert({
              empresa_id: empresaId,
              produto_id: prod.produtoId,
              uber_eats_external_code: prod.externalCode,
              status: 'synced',
              uber_eats_status: prod.disponivel ? 'AVAILABLE' : 'UNAVAILABLE',
              preco_sincronizado: prod.preco,
              ultimo_sync_em: new Date().toISOString(),
            }, { onConflict: 'empresa_id, uber_eats_external_code' })
            .select()
            .single();

          results.push(data);
        }

        await supabase.from('uber_eats_logs').insert({
          empresa_id: empresaId,
          tipo: 'sync_product',
          sucesso: true,
          detalhes: `${produtos.length} produtos sincronizados em lote`,
        });

        return NextResponse.json({ sucesso: true, data: results });
      }

      case 'update_availability': {
        const { produtoId, externalCode, disponivel } = params;

        const { data } = await supabase
          .from('uber_eats_produtos_sync')
          .update({
            uber_eats_status: disponivel ? 'AVAILABLE' : 'UNAVAILABLE',
            ultimo_sync_em: new Date().toISOString(),
          })
          .eq('empresa_id', empresaId)
          .eq('uber_eats_external_code', externalCode)
          .select()
          .single();

        return NextResponse.json({ sucesso: true, data });
      }

      case 'update_price': {
        const { externalCode, preco } = params;

        const { data } = await supabase
          .from('uber_eats_produtos_sync')
          .update({
            preco_sincronizado: preco,
            ultimo_sync_em: new Date().toISOString(),
          })
          .eq('empresa_id', empresaId)
          .eq('uber_eats_external_code', externalCode)
          .select()
          .single();

        return NextResponse.json({ sucesso: true, data });
      }

      default:
        return NextResponse.json({ sucesso: false, erro: { codigo: 'ACAO_INVALIDA', mensagem: `Ação ${action} não reconhecida` } }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: 'ERRO_INTERNO', mensagem: error.message } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    if (!empresaId) {
      return NextResponse.json({ sucesso: false, erro: { codigo: 'EMPRESA_ID_REQUIRED', mensagem: 'empresaId é obrigatório' } }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('uber_eats_produtos_sync')
      .select('*, produtos!inner(*)')
      .eq('empresa_id', empresaId)
      .order('ultimo_sync_em', { ascending: false, nullsFirst: false });

    if (error) throw error;

    return NextResponse.json({ sucesso: true, data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: { codigo: 'ERRO_INTERNO', mensagem: error.message } }, { status: 500 });
  }
}
