# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start dev server at http://localhost:8080
npm run build        # Production build to ./dist/
npm run build:dev    # Debug build with source maps
npm run preview      # Preview production build locally
npm run lint         # ESLint checks
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: React Query (server state) + Context (auth/settings) + React Hook Form
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Validation**: Zod schemas
- **Charts**: Recharts
- **PDF**: jsPDF + jspdf-autotable

## Architecture Overview

### Routing & Auth
- React Router v6 with lazy-loaded pages
- Role-based access: `owner` > `manager` > `staff`
- Permission matrix in `src/lib/permissions.ts` controls module access (view/create/edit/delete)
- `ProtectedRoute` component wraps routes requiring auth

### Data Flow Pattern
1. Pages use React Query hooks (e.g., `useDatabase`, `useDashboardData`)
2. Queries fetch from Supabase with 2-min stale time, 30-min cache
3. Mutations invalidate related query keys on success
4. Optimistic updates where appropriate

### Key Directories
- `src/pages/` - Route target components
- `src/components/` - Organized by domain (pos/, products/, customers/, etc.)
- `src/hooks/` - 56+ custom hooks including all data fetching logic
- `src/contexts/` - AuthContext (user/role), SettingsContext (permissions/config)
- `src/lib/` - Core utilities: `permissions.ts`, `utils.ts`
- `src/utils/` - Export utilities (CSV, PDF receipt generation)
- `src/integrations/supabase/` - Supabase client and generated types

### Important Files
- `src/App.tsx` - Router setup and provider hierarchy
- `src/hooks/useDatabase.ts` - Primary database operations hook (products, sales, expenses, stock)
- `src/lib/permissions.ts` - RBAC permission matrix
- `src/components/ProtectedRoute.tsx` - Route protection logic
- `src/types/index.ts` - Centralized TypeScript types derived from Supabase schema
- `src/integrations/supabase/types.ts` - Auto-generated database types

### Supabase Edge Functions
Located in `supabase/functions/`:
- `send-receipt-email` - Email receipts to customers
- `invite-user` - User invitation flow
- `create-demo-accounts` - Demo account provisioning
- `chat` / `rag-init` / `rag-sync` - AI chat with RAG
- `product-ai-suggestions` - AI-powered product suggestions

## Design System

See `DESIGN_SYSTEM.md` for complete styling guidelines. Key points:

- Use CSS variables from `index.css`, never hardcoded hex values
- Button variants: `premium` (primary CTA), `default`, `outline`, `ghost`, `destructive`
- Currency coloring: `text-success` (positive), `text-destructive` (negative), `text-foreground` (neutral)
- Icons in headers: `text-muted-foreground` with `h-5 w-5`
- All components must support dark mode via semantic tokens

## Business Domain

Jewellery POS and business management system with modules for:
- Products/Inventory with stock tracking
- Customers with VIP tiers
- Sales/POS with commission tracking
- Consignments and Deposit Orders
- Expenses and Financial Reports

Key calculations use industry-standard markup formula: `(Price - Cost) / Cost * 100`

### Database Views
The Supabase database includes materialized views for common calculations:
- `v_stock_on_hand` - Current stock quantities per product
- `v_inventory_value` - Stock value at cost
- `v_weighted_cost` - Average weighted cost per product
- `v_sales_with_profit` - Sales with calculated profit margins
- `v_pnl_daily` - Daily profit and loss aggregates

### Query Key Conventions
React Query keys follow these patterns (important for cache invalidation):
- `['products-base']`, `['enhanced-products']` - Product data
- `['stock-data']`, `['inventory-values']` - Stock/inventory
- `['sales']`, `['transactions']`, `['sold-items-report']` - Sales data
- `['dashboard-stats']` - Dashboard KPIs
- `['suppliers']`, `['customers']`, `['expenses']` - Entity lists
- `['product-reservations']` - Active deposit order reservations

### Type System
Types are derived from the Supabase schema in `src/types/index.ts`:
- Row types extracted from `Database['public']['Tables']`
- View types from `Database['public']['Views']`
- Insert/Update types for mutations
- Enhanced types like `ProductWithStock` combine base types with related data
