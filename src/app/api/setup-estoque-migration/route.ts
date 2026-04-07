import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/server';

/**
 * POST /api/setup-estoque-migration
 *
 * Attempts to add migration columns to estoque_movimentos and vendas tables.
 * Uses the Supabase admin client to run SQL via the pg endpoint.
 * Falls back to returning the SQL for manual execution if the RPC fails.
 */
export async function POST() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase not configured',
          sql: MIGRATION_SQL,
        },
        { status: 503 }
      );
    }

    const supabase = createAdminClient();

    // Attempt to detect if migration columns exist by selecting with a limit
    const { data, error } = await supabase
      .from('estoque_movimentos')
      .select('produto_nome, tipo_entrada, quantidade_informada, estoque_anterior, estoque_novo, fornecedor, documento_ref, criado_por, criado_por_nome')
      .limit(1);

    if (!error) {
      // Columns already exist - migration not needed
      return NextResponse.json({
        success: true,
        message: 'Migration columns already exist. No action needed.',
        migrated: false,
      });
    }

    // If we get a 4xx error about missing columns, return SQL for manual execution
    const errorMsg = error?.message || '';
    if (
      errorMsg.includes('does not exist') ||
      errorMsg.includes('column') ||
      errorMsg.includes('not found')
    ) {
      return NextResponse.json({
        success: false,
        error: 'Migration columns not found. The code has been updated to work with the base schema.',
        sql: MIGRATION_SQL,
        instructions: [
          'The estoque page now uses only base schema columns and will work without this migration.',
          'To enable the extra columns (produto_nome, fornecedor, etc.), run the SQL below in the Supabase SQL Editor.',
        ],
      });
    }

    // Some other error
    return NextResponse.json(
      {
        success: false,
        error: `Detection failed: ${errorMsg}`,
        sql: MIGRATION_SQL,
      },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Unknown error',
        sql: MIGRATION_SQL,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setup-estoque-migration
 *
 * Returns the migration SQL and status information.
 */
export async function GET() {
  return NextResponse.json({
    message: 'Estoque migration setup',
    description:
      'This endpoint provides the migration SQL to add NFE-related columns to estoque_movimentos and vendas tables.',
    sql: MIGRATION_SQL,
    instructions: [
      'The application code has been updated to work with the base schema (id, empresa_id, produto_id, tipo, quantidade, preco_unitario, observacao, usuario_id, usuario_nome, criado_em).',
      'The migration below adds optional columns for richer tracking (produto_nome, fornecedor, etc.).',
      'Run the SQL in the Supabase SQL Editor if you want these extra columns.',
    ],
    endpoint: 'POST to this URL to auto-detect if migration is needed.',
  });
}

const MIGRATION_SQL = `-- =====================================================
-- Migration: Add missing columns to estoque_movimentos
-- These columns are used by NFE import and listing APIs
-- =====================================================

-- estoque_movimentos: columns for NFE tracking
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS produto_nome VARCHAR(255);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS tipo_entrada VARCHAR(20);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS quantidade_informada DECIMAL(10,2);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS estoque_anterior DECIMAL(10,2);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS estoque_novo DECIMAL(10,2);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS fornecedor VARCHAR(255);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS documento_ref VARCHAR(255);
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS criado_por UUID;
ALTER TABLE estoque_movimentos ADD COLUMN IF NOT EXISTS criado_por_nome VARCHAR(255);

-- vendas: columns for NFE emission tracking
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfe_emitida BOOLEAN DEFAULT false;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS nfe_id UUID;

-- Indexes for NFE listing performance
CREATE INDEX IF NOT EXISTS idx_estoque_movimentos_documento_ref ON estoque_movimentos(documento_ref);
CREATE INDEX IF NOT EXISTS idx_estoque_movimentos_tipo_entrada ON estoque_movimentos(tipo_entrada);`;
