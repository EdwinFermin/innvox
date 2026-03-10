# Innvox App Overview

## What the app does

Innvox is an internal finance and operations dashboard for managing branches, users, clients, invoices, income, expenses, receivables, payables, reports, and payment links.

## Stack

- Next.js App Router in `src/app`
- React 19 + TypeScript
- Firebase Firestore for app data in `src/lib/firebase.ts`
- NextAuth credentials auth backed by Firebase in `src/auth.ts`
- React Query for client-side data fetching
- shadcn/ui + Tailwind for UI primitives

## How auth works

- Public routes are outside `/dashboard`
- `/dashboard/**` and `/login` are gated in `src/proxy.ts`
- Server-side guards live in `src/lib/auth/guards.ts`
- Session shape is normalized in `src/store/auth.ts`
- Users have `type: ADMIN | USER` and optional `branchIds`

## Main route layout

- `src/app/dashboard/layout.tsx` wraps all private pages with the sidebar and breadcrumb
- `src/components/ui/app-sidebar.tsx` defines dashboard navigation
- `src/components/ui/dynamic-breadcrumb.tsx` translates route segments into labels
- `src/app/pay/[branchId]/page.tsx` is the public payment page for QR scans

## Firestore patterns

- Most modules follow a 4-file pattern:
  - page in `src/app/dashboard/.../page.tsx`
  - create dialog in `src/app/dashboard/.../components/...`
  - data hook in `src/hooks/...`
  - interface in `src/types/...`
- Reads are usually client-side with React Query and Firestore `getDocs`
- Writes are usually in dialogs/pages with `addDoc`, `setDoc`, `updateDoc`, or `deleteDoc`
- Branch documents use the branch code as the Firestore document id

## Key collections in use

- `users`
- `branches`
- `clients`
- `invoices`
- `incomes`
- `expenses`
- `receivables`
- `payables`
- `linkPayments`
- `configs`, `incomeTypes`, `expenseTypes`

## Existing module references

- `src/app/dashboard/payables/page.tsx` is a strong template for table-based CRUD modules
- `src/app/dashboard/payables/components/new-payable-dialog.tsx` is a strong template for form dialogs
- `src/hooks/use-payables.ts` shows the standard collection hook shape
- `src/app/dashboard/branches/components/new-branch-dialog.tsx` shows that branch ids match branch codes

## Link de pago feature

- Admin/internal route: `src/app/dashboard/link-de-pago/page.tsx`
- Public route for QR scans: `src/app/pay/[branchId]/page.tsx`
- Collection: `linkPayments`
- Flow:
  - create a pending payment link by branch
  - share the public branch URL or QR
  - customer scans QR and sees amount + pay button
  - clicking pay marks the latest pending payment for that branch as completed, then redirects to the internal payment URL

## Recommended agent workflow

1. Read this file first for product and architecture context.
2. Refresh the repo map with `npm run context:map` when needed.
3. Build a task pack with `npm run context:pack -- --query "<task>"`.
4. Read only the files in the generated pack before expanding scope.
