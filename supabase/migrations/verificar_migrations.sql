-- =====================================================
-- VERIFICAÇÃO DE MIGRATIONS iFood
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Verificar se as tabelas iFood existem
SELECT
  'Tabela ifood_config' as item,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ifood_config')
    THEN '✅ Existe'
    ELSE '❌ NÃO EXISTE - Execute ifood_tables.sql'
  END as status

UNION ALL

SELECT
  'Tabela ifood_logs' as item,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ifood_logs')
    THEN '✅ Existe'
    ELSE '❌ NÃO EXISTE - Execute ifood_tables.sql'
  END as status

UNION ALL

SELECT
  'Tabela ifood_produtos_sync' as item,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ifood_produtos_sync')
    THEN '✅ Existe'
    ELSE '❌ NÃO EXISTE - Execute ifood_tables.sql'
  END as status

UNION ALL

SELECT
  'Tabela ifood_pedidos' as item,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ifood_pedidos')
    THEN '✅ Existe'
    ELSE '❌ NÃO EXISTE - Execute ifood_tables.sql'
  END as status

UNION ALL

SELECT
  'Tabela empresa_delivery_config' as item,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'empresa_delivery_config')
    THEN '✅ Existe'
    ELSE '❌ NÃO EXISTE - Execute empresa_delivery_config.sql'
  END as status

UNION ALL

-- Verificar colunas de iFood na tabela produtos
SELECT
  'Coluna disponivel_ifood em produtos' as item,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'disponivel_ifood')
    THEN '✅ Existe'
    ELSE '❌ NÃO EXISTE - Execute add_ifood_to_produtos.sql'
  END as status

UNION ALL

SELECT
  'Coluna ifood_external_code em produtos' as item,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'ifood_external_code')
    THEN '✅ Existe'
    ELSE '❌ NÃO EXISTE - Execute add_ifood_to_produtos.sql'
  END as status

UNION ALL

SELECT
  'Coluna ifood_sync_status em produtos' as item,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'ifood_sync_status')
    THEN '✅ Existe'
    ELSE '❌ NÃO EXISTE - Execute add_ifood_to_produtos.sql'
  END as status

UNION ALL

SELECT
  'Coluna ifood_product_id em produtos' as item,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'ifood_product_id')
    THEN '✅ Existe'
    ELSE '❌ NÃO EXISTE - Execute add_ifood_to_produtos.sql'
  END as status;

-- =====================================================
-- Se todos os itens estiverem como '✅ Existe', as migrations foram executadas corretamente!
-- =====================================================
