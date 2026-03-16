# Innvox App Overview

## What the app does

Innvox is an internal finance and operations dashboard for managing branches, users, clients, invoices, incomes, expenses, receivables, payables, reports, bank accounts, and payment links.

## Stack

- Next.js App Router in `src/app`
- React 19 + TypeScript
- Supabase (PostgreSQL + Auth) for data and authentication
- Supabase clients in `src/lib/supabase/` (`client.ts`, `server.ts`, `admin.ts`)
- NextAuth credentials auth backed by Supabase in `src/auth.ts`
- React Query for client-side reads
- Server Actions in `src/actions/` for mutations
- PostgreSQL functions (RPC) for atomic finance operations
- shadcn/ui + Tailwind for UI primitives

## Fast repo structure

- `src/app/`
  - `dashboard/` private finance and admin routes
  - `pay/[branchId]/` public branch payment page used by QR scans
  - `accounts/[branchId]/` public bank-account listing by branch
  - `login/` auth entry
- `src/actions/` server actions for create/delete/update flows
- `src/hooks/` React Query hooks for reads and print/export helpers
- `src/lib/`
  - `auth/` route guards, permissions, and role checks
  - `supabase/` browser, server, and admin clients
  - other domain helpers such as bank accounts, payment links, and movements
- `src/types/` shared table-aligned types
- `src/store/auth.ts` client auth/session shape
- `src/components/` shared dashboard, print, and UI primitives
- `supabase/migrations/001_initial_schema.sql` schema, tables, and RPC source of truth

## Main dashboard domains

- `src/app/dashboard/page.tsx` dashboard home
- `src/app/dashboard/users/` users and branch assignments
- `src/app/dashboard/branches/` branches
- `src/app/dashboard/clients/` clients
- `src/app/dashboard/invoices/` invoices
- `src/app/dashboard/transactions/incomes/` incomes
- `src/app/dashboard/transactions/expenses/` expenses
- `src/app/dashboard/receivables/` receivables
- `src/app/dashboard/payables/` payables
- `src/app/dashboard/bank-accounts/` bank accounts, transfers, balance adjustments, QR sheets
- `src/app/dashboard/link-de-pago/` internal payment-link management
- `src/app/dashboard/reports/profit/` profit report
- `src/app/dashboard/reports/cuadre-del-dia/` daily close report
- `src/app/dashboard/reports/formulario-dgii/` DGII invoice export helper
- `src/app/dashboard/parameters/` configurable catalog tables
- `src/app/dashboard/settings/` app-level settings
- `src/app/dashboard/account/` current-user account view

## How auth works

- Public routes are outside `/dashboard`
- `/dashboard/**` and `/login` are gated in `src/proxy.ts`
- Server-side guards live in `src/lib/auth/guards.ts`
- Session shape is normalized in `src/store/auth.ts`
- Users have `type: ADMIN | USER` and branch assignments in `user_branches`
- NextAuth JWT stores `id`, `role`, and `branchIds` in the session token

## Main route layout

- `src/app/dashboard/layout.tsx` wraps private pages with sidebar and breadcrumb
- `src/components/ui/app-sidebar.tsx` defines dashboard navigation
- `src/components/ui/dynamic-breadcrumb.tsx` maps route segments to labels
- `src/app/pay/[branchId]/page.tsx` is the public payment page for QR scans

## Data patterns

- Most business modules follow this pattern:
  - page in `src/app/dashboard/.../page.tsx`
  - create/edit dialog in `src/app/dashboard/.../components/...`
  - read hook in `src/hooks/...`
  - write action in `src/actions/...`
  - type in `src/types/...`
- Reads are usually client-side with React Query and Supabase `.from().select()`
- Writes go through Server Actions in `src/actions/`
- Complex atomic operations use PostgreSQL functions via `supabase.rpc()`
- Row Level Security handles per-role visibility
- Types use `snake_case` field names aligned to PostgreSQL column names

## Key tables

- `users`, `user_branches`
- `branches`
- `clients`
- `invoices`
- `incomes`, `income_types`
- `expenses`, `expense_types`
- `receivables`
- `payables`
- `link_payments`
- `bank_accounts`, `bank_account_branches`, `bank_transactions`
- `configs`, `ncf_released_numbers`

## PostgreSQL functions (RPC)

- `create_income` / `create_expense` - atomic balance update, bank transaction, and movement
- `transfer_funds` - atomic inter-account transfer
- `adjust_balance` - atomic balance adjustment
- `generate_ncf` / `generate_cf` - atomic sequential number generation
- `delete_financial_movement` - atomic reversal of income/expense
- `delete_invoice` - NCF release plus deletion
- `repair_bank_transaction_balances` - recalculate running balances

## Good reference files

- `src/app/dashboard/payables/page.tsx` table-based CRUD template
- `src/app/dashboard/payables/components/new-payable-dialog.tsx` form dialog template
- `src/hooks/use-payables.ts` standard collection hook shape
- `src/actions/payables.ts` standard server action shape
- `src/app/dashboard/reports/cuadre-del-dia/page.tsx` report page reference
- `src/hooks/use-daily-close-report.ts` cross-module report hook reference
- `src/app/dashboard/branches/components/new-branch-dialog.tsx` shows branch ids matching branch codes

## Link de pago feature

- Admin/internal route: `src/app/dashboard/link-de-pago/page.tsx`
- Public QR target: `src/app/pay/[branchId]/page.tsx`
- Public branch account list: `src/app/accounts/[branchId]/page.tsx`
- Table: `link_payments`
- Flow:
  - create a pending payment link by branch
  - share the public branch URL or QR
  - customer scans QR and sees amount plus pay button
  - clicking pay calls `completeLinkPayment` and redirects to the internal payment URL

## Agent workflow

1. Read this file first for product and structure context.
2. Read `AGENTS.md` for the context-selection rules.
3. Refresh the repo map with `npm run context:map` when needed.
4. Build a task pack with `npm run context:pack -- --query "<task>"`.
5. Read only the generated pack before expanding scope.
6. For schema or RPC tasks, inspect `supabase/migrations/001_initial_schema.sql` early.
