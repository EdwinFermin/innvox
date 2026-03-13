# Innvox App Overview

## What the app does

Innvox is an internal finance and operations dashboard for managing branches, users, clients, invoices, income, expenses, receivables, payables, reports, and payment links.

## Stack

- Next.js App Router in `src/app`
- React 19 + TypeScript
- Supabase (PostgreSQL + Auth) for data and authentication
- Supabase client in `src/lib/supabase/` (client.ts, server.ts, admin.ts)
- NextAuth credentials auth backed by Supabase in `src/auth.ts`
- React Query for client-side data fetching
- Server Actions in `src/actions/` for all mutations
- PostgreSQL functions (RPC) for atomic operations
- shadcn/ui + Tailwind for UI primitives

## How auth works

- Public routes are outside `/dashboard`
- `/dashboard/**` and `/login` are gated in `src/proxy.ts`
- Server-side guards live in `src/lib/auth/guards.ts`
- Session shape is normalized in `src/store/auth.ts`
- Users have `type: ADMIN | USER` and branch assignments in `user_branches` junction table
- NextAuth JWT strategy stores `id`, `role`, `branchIds` in the session token

## Main route layout

- `src/app/dashboard/layout.tsx` wraps all private pages with the sidebar and breadcrumb
- `src/components/ui/app-sidebar.tsx` defines dashboard navigation
- `src/components/ui/dynamic-breadcrumb.tsx` translates route segments into labels
- `src/app/pay/[branchId]/page.tsx` is the public payment page for QR scans

## Data patterns

- Most modules follow a 4-file pattern:
  - page in `src/app/dashboard/.../page.tsx`
  - create dialog in `src/app/dashboard/.../components/...`
  - data hook in `src/hooks/...` (reads via Supabase browser client + React Query)
  - server action in `src/actions/...` (writes via Supabase server/admin client)
  - interface in `src/types/...`
- Reads are client-side with React Query and Supabase `.from().select()`
- Writes go through Server Actions (`"use server"` in `src/actions/`)
- Complex atomic operations use PostgreSQL functions via `supabase.rpc()`
- Row Level Security (RLS) handles per-role data visibility
- All types use `snake_case` field names matching PostgreSQL column names

## Key tables

- `users`, `user_branches` (junction)
- `branches`
- `clients`
- `invoices`
- `incomes`, `income_types`
- `expenses`, `expense_types`
- `receivables`
- `payables`
- `link_payments`
- `bank_accounts`, `bank_account_branches` (junction), `bank_transactions`
- `configs`, `ncf_released_numbers`

## PostgreSQL functions (RPC)

- `create_income` / `create_expense` — atomic balance update + bank tx + movement
- `transfer_funds` — atomic inter-account transfer
- `adjust_balance` — atomic balance adjustment
- `generate_ncf` / `generate_cf` — atomic sequential number generation
- `delete_financial_movement` — atomic reversal of income/expense
- `delete_invoice` — NCF release + deletion
- `repair_bank_transaction_balances` — recalculate running balances

## Existing module references

- `src/app/dashboard/payables/page.tsx` is a strong template for table-based CRUD modules
- `src/app/dashboard/payables/components/new-payable-dialog.tsx` is a strong template for form dialogs
- `src/hooks/use-payables.ts` shows the standard collection hook shape
- `src/actions/payables.ts` shows the standard server action shape
- `src/app/dashboard/branches/components/new-branch-dialog.tsx` shows that branch ids match branch codes

## Link de pago feature

- Admin/internal route: `src/app/dashboard/link-de-pago/page.tsx`
- Public route for QR scans: `src/app/pay/[branchId]/page.tsx`
- Table: `link_payments`
- Flow:
  - create a pending payment link by branch
  - share the public branch URL or QR
  - customer scans QR and sees amount + pay button
  - clicking pay calls `completeLinkPayment` server action, then redirects to the payment URL

## Recommended agent workflow

1. Read this file first for product and architecture context.
2. Refresh the repo map with `npm run context:map` when needed.
3. Build a task pack with `npm run context:pack -- --query "<task>"`.
4. Read only the files in the generated pack before expanding scope.
