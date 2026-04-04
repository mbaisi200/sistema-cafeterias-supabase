---
Task ID: 1
Agent: Super Z
Task: Implement Round 2 fixes - 9 items from user

Work Log:
- Analyzed all 9 items from the user's request
- Found that items 1, 3, 5, 6 were already implemented in the codebase
- Item 1: Estoque column already exists in produtos table (line 873-877, displays estoqueAtual with unit)
- Item 3: Markup per item already implemented in NFE import (precoVenda field, markupPercentual state)
- Item 5: Back buttons already exist in cupons-nfes and nfe pages (ChevronLeft linking to /admin)
- Item 6: Pedidos section already exists in sidebar and has full CRUD page at /admin/pedidos

- Item 4 (PDV garçom selects): Fixed search in pdv-garcom/page.tsx
  - Added optional chaining to prevent null crashes (p.nome?.toLowerCase())
  - Fixed case-sensitive barcode search (p.codigoBarras?.toLowerCase())
  - Added descricao search as additional filter

- Item 7 (Dashboard BI filter): Fixed product search priority in dashboard/page.tsx
  - Changed filter to prioritize nome matches (priority 0) > codigo (1) > descricao (2)
  - Results are now sorted by relevance, preventing "wrong products" from appearing first

- Item 8 (NFE listing performance): Created SQL migration with indexes
  - Composite index on estoque_movimentos (empresa_id, tipo, criado_em DESC)
  - GIN trgm index for ILIKE search on documento_ref
  - Composite index on vendas (empresa_id, status, criado_em DESC)
  - Partial index for vendas with nfe_emitida

- Item 9 (Fornecedores not showing): Created SQL migration fixing RLS
  - Recreated get_user_empresa_id() and is_master() functions
  - Dropped all old conflicting RLS policies
  - Created 4 new robust RLS policies using inline subqueries
  - Added index on fornecedores (empresa_id, ativo, nome)

Stage Summary:
- 4 items were already implemented (1, 3, 5, 6)
- 2 code fixes applied (items 4 and 7)
- 1 SQL migration created for items 8 and 9
- 1 item is informational only (item 2 - unidade tributável)
- Files modified: pdv-garcom/page.tsx, dashboard/page.tsx
- Files created: supabase/migrations/fix_round2_issues.sql
