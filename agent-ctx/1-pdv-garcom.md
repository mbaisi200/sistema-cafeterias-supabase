---
## Task ID: 1 - pdv-garcom
### Work Task
Create a complete mobile-first PDV Garçon page at `/src/app/pdv-garcom/page.tsx` for the sistema-cafeterias-supabase project.

### Work Summary
Created a fully functional mobile-first PDV page optimized for waiters (garçons) with the following features:

**Architecture:**
- Single self-contained page component at `/src/app/pdv-garcom/page.tsx`
- Reuses all existing hooks from `@/hooks/useFirestore` (useProdutos, useCategorias, useMesas, useCaixa, registrarLog)
- Uses `CupomFiscalModal` from `@/components/pdv/CupomFiscal` for fiscal receipt
- Uses `getSupabaseClient` from `@/lib/supabase` for direct Supabase operations
- Protected with `<ProtectedRoute allowedRoles={['admin', 'funcionario']}>`
- No MainLayout dependency — fullscreen mobile experience

**Screens:**
1. **Mesa Selection Screen** — Grid of colored tiles showing table number and status (livre=green, ocupada=red), organized by status groups
2. **Product View** — Search bar, horizontal scrollable category tabs with color indicators, 2-column product grid with left border color from category, large touch targets

**Key Components:**
- `MesaSelectionView` — Renders mesas organized by livre/ocupada status in a 3-column grid
- `ProdutoView` — Category filter tabs + product grid with search
- `CartBottomSheet` — Slide-up bottom sheet showing items, +/- quantity buttons, Cozinha/Comanda/Finalizar actions
- `PaymentDialog` — Bottom sheet with auto-filled remaining amount, vertical payment method buttons (Dinheiro/Crédito/Débito/PIX), multi-payment support
- `CaixaDialog` — Bottom sheet for opening/viewing caixa status

**Payment Flow:**
- `valorPagamentoAtual` is auto-filled via `useEffect` when dialog opens or `totalPago` changes
- Supports multiple payments (split payments)
- Opens `CupomFiscalModal` for final confirmation with client identification
- Creates venda, itens_venda, pagamentos in Supabase
- Registers caixa movement if caixa is open
- Frees mesa after payment
- Handles combo stock reduction

**Visual Design:**
- Green (#16a34a) primary accent color
- Rounded corners (2xl), soft shadows
- Slide-up animation for bottom sheets
- Active state scale animations for tactile feedback
- Hidden scrollbar for category tabs
- Line-clamp for product names

**CSS additions to globals.css:**
- `.animate-slide-up` — Bottom sheet slide-up animation
- `.scrollbar-hide` — Hide scrollbar utility
- `.line-clamp-2` — 2-line text clamp utility

**Lint:** No new lint errors introduced (pre-existing error in admin/cupons-nfes/page.tsx is unrelated).
