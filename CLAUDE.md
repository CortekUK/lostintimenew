# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start dev server at http://localhost:8080
npm run build        # Production build to ./dist/
npm run build:dev    # Debug build with source maps
npm run preview      # Preview production build locally
npm run lint         # ESLint checks (flat config in eslint.config.js)
```

No unit test framework is configured. Playwright is installed (`playwright.config.ts`) but no e2e tests exist yet in `e2e/`.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite (SWC plugin)
- **Styling**: Tailwind CSS 3 + shadcn/ui (Radix primitives)
- **State**: React Query v5 (server state) + Context (auth/settings) + React Hook Form
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Icons**: lucide-react
- **Validation**: Zod
- **Charts**: Recharts
- **PDF**: jsPDF + jspdf-autotable
- **Path alias**: `@` maps to `./src` (configured in vite.config.ts and tsconfig)

## Architecture Overview

### Provider Hierarchy (src/App.tsx)

```
ErrorBoundary > QueryClientProvider > ThemeProvider > AuthProvider > SettingsProvider > TooltipProvider
```

Components can depend on any provider above them. `useAuth()` is available inside `SettingsProvider`; `useSettings()` is available in all route components.

### Routing & Auth
- React Router v6 with lazy-loaded pages (all pages use `lazyWithPreload` wrapper)
- Core pages (Dashboard, Products, Customers, Sales) are preloaded 2s after mount
- Role-based access: `owner` > `manager` > `staff`
- Permission matrix in `src/lib/permissions.ts` controls module access (view/create/edit/delete)
- Two levels of permission checking:
  - **Route level**: `ProtectedRoute` component wraps routes with `module` prop
  - **Inline level**: `PermissionGate` component (`src/components/ui/PermissionGate.tsx`) for conditional UI rendering
- `usePermissions()` hook provides `can(module, action)` and `isAtLeast(role)` helpers
- Owner can customize manager/staff permissions via `rolePermissions` in settings

### Data Flow Pattern
1. Pages use React Query hooks from `src/hooks/` (e.g., `useProducts`, `useSales`, `useDashboardStats`)
2. All queries require `!!user && !!session` in `enabled` — data won't fetch without auth
3. Queries: 2-min stale time, 30-min GC time, no refetch on window focus, retry only on 5xx
4. Mutations invalidate related query keys on success (see Query Key Conventions below)
5. Toasts on mutation success/error via `src/hooks/use-toast`

### Key Directories
- `src/pages/` — Route target components (lazy-loaded)
- `src/components/` — Organized by domain: `pos/`, `products/`, `customers/`, `deposits/`, `consignments/`, `expenses/`, `reports/`, `analytics/`, `dashboard/`, `settings/`, `layout/`, `filters/`, `receipt/`, `chat/`, `search/`
- `src/components/ui/` — shadcn/ui primitives + custom UI components (PermissionGate, currency-input, image-upload, enhanced-table, etc.)
- `src/hooks/` — Custom hooks including all data fetching logic
- `src/contexts/` — AuthContext (user/session/role), SettingsContext (app config/permissions)
- `src/lib/` — Core utilities: `permissions.ts` (RBAC), `utils.ts` (cn helper, formatters)
- `src/utils/` — Export utilities (CSV, PDF receipt generation)
- `src/integrations/supabase/` — Supabase client and auto-generated types (do not edit `types.ts`)

### Important Files
- `src/App.tsx` — Router setup, provider hierarchy, route preload map
- `src/hooks/useDatabase.ts` — Primary CRUD hooks for products, sales, expenses, stock, suppliers
- `src/lib/permissions.ts` — RBAC permission matrix with `hasPermission()`, `canAccessModule()`, `isAtLeastRole()`
- `src/components/ProtectedRoute.tsx` — Route-level auth + permission guard
- `src/types/index.ts` — Centralized TypeScript types derived from Supabase schema
- `src/integrations/supabase/types.ts` — Auto-generated database types (do not edit manually)

### Settings System
App settings are stored as a JSON blob in the `app_settings` table (row id=1). Only owners can update settings. The `SettingsContext` loads settings on auth and merges with defaults. Key settings include: currency, tax, low stock threshold, commission rates, VIP tier thresholds, role permission overrides.

### Supabase Edge Functions
Located in `supabase/functions/`:
- `send-receipt-email` — Email receipts to customers
- `invite-user` — User invitation flow
- `create-demo-accounts` — Demo account provisioning
- `chat` / `rag-init` / `rag-sync` — AI chat with RAG
- `product-ai-suggestions` — AI-powered product suggestions

## Design System

See `DESIGN_SYSTEM.md` for complete styling guidelines. Key points:

- Use CSS variables from `index.css`, never hardcoded hex values
- Button variants: `premium` (primary CTA), `default`, `outline`, `ghost`, `destructive`
- Currency coloring: `text-success` (positive), `text-destructive` (negative), `text-foreground` (neutral)
- Icons in headers: `text-muted-foreground` with `h-5 w-5`
- All components must support dark mode via semantic tokens
- Two toast systems are mounted: shadcn `Toaster` and `Sonner` — use `use-toast` hook for data operations

## Business Domain

Jewellery POS and business management system with modules for:
- Products/Inventory with stock tracking (via `stock_movements` table, aggregated by `v_stock_on_hand` view)
- Customers with VIP tiers (Silver/Gold/Platinum based on spend thresholds)
- Sales/POS with commission tracking (configurable rate, basis: revenue or profit)
- Consignments (supplier-owned stock, tracked via `consignment_settlements` for payouts)
- Part Exchanges (trade-in items with serial numbers, allowance tracked via `part_exchanges` table)
- Deposit Orders (reservations that reduce available stock without reducing stock-on-hand)
- Expenses and Financial Reports

Key calculations use industry-standard markup formula: `(Price - Cost) / Cost * 100`

### Database Views
The Supabase database includes views for common calculations:
- `v_stock_on_hand` — Current stock quantities per product
- `v_stock_status` — Stock status classification
- `v_inventory_value` — Stock value at cost
- `v_weighted_cost` — Average weighted cost per product
- `v_sales_with_profit` — Sales with calculated profit margins
- `v_pnl_daily` — Daily profit and loss aggregates

### Query Key Conventions
React Query keys follow these patterns (important for cache invalidation):
- `['products-base']`, `['enhanced-products']` — Product data
- `['stock-data']`, `['inventory-values']` — Stock/inventory
- `['sales']`, `['transactions']`, `['sold-items-report']` — Sales data
- `['dashboard-stats']` — Dashboard KPIs
- `['suppliers']`, `['customers']`, `['expenses']` — Entity lists
- `['product-reservations']` — Active deposit order reservations
- `['consignment-products']`, `['consignment-stats']` — Consignment data
- `['filter-options']` — Product filter options (invalidated on product changes)

When adding mutations, invalidate all related keys. Product mutations typically invalidate: `products-base`, `enhanced-products`, `stock-data`, `inventory-values`, `filter-options`. Sale mutations additionally invalidate: `sales`, `transactions`, `sold-items-report`, `dashboard-stats`.

### Type System
Types are derived from the Supabase schema in `src/types/index.ts`:
- Row types extracted from `Database['public']['Tables']` (e.g., `Product`, `Sale`, `Expense`)
- View types from `Database['public']['Views']` (e.g., `StockOnHand`, `PnLDaily`)
- Insert/Update types for mutations (e.g., `ProductInsert`, `ProductUpdate`)
- Enhanced types like `ProductWithStock` combine base types with computed fields (`qty_on_hand`, `qty_available`, `qty_reserved`)
