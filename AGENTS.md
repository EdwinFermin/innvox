# AGENTS.md — Project Knowledge Base

## Stack

- Next.js 16 App Router, React 19, TypeScript 5
- Supabase (PostgreSQL + Auth + RPC)
- NextAuth v5 (credentials, JWT with id/role/branchIds)
- React Query for reads, Server Actions for writes
- Zustand for client state
- shadcn/ui (new-york style) + Tailwind CSS 4 + Lucide icons

## Architecture

### Directory map

```
src/
├── app/              Route tree (App Router)
│   ├── dashboard/    Private routes (finance, admin)
│   ├── pay/          Public payment page (QR)
│   ├── accounts/     Public bank-account listing
│   └── login/        Auth entry
├── actions/          Server Actions (mutations)
├── components/
│   ├── ui/           shadcn/ui primitives
│   ├── dashboard/    Dashboard-specific components
│   └── print/        Print/export components
├── hooks/            React Query hooks + helpers
├── lib/
│   ├── auth/         Guards, permissions, role checks
│   └── supabase/     client.ts, server.ts, admin.ts
├── providers/        Client providers (Auth, Query, Theme)
├── store/            Zustand stores
├── types/            Table-aligned types (snake_case)
└── utils/            General utilities
supabase/
└── migrations/       SQL migrations (source of truth)
```

### Data flow pattern

Every business module follows:

1. **Page** → `src/app/dashboard/<domain>/page.tsx`
2. **Dialog/Form** → `src/app/dashboard/<domain>/components/...`
3. **Read hook** → `src/hooks/use-<domain>.ts` (React Query + Supabase `.from().select()`)
4. **Write action** → `src/actions/<domain>.ts` (Server Action)
5. **Type** → `src/types/<domain>.ts` (snake_case, aligned to Postgres columns)
6. **Complex ops** → PostgreSQL functions via `supabase.rpc()`

Reference implementations:
- CRUD: `payables/` (page, dialog, hook, action)
- Report: `reports/cuadre-del-dia/` (page + hook)

### Auth model

- Public routes live outside `/dashboard`
- `/dashboard/**` gated by middleware in `src/proxy.ts`
- Server guards in `src/lib/auth/guards.ts`
- Roles: `ADMIN | USER`, branch assignments in `user_branches`
- JWT stores `id`, `role`, `branchIds`

## Conventions

### Naming

| Thing | Convention | Example |
|---|---|---|
| Files/folders | kebab-case | `use-bank-accounts.ts` |
| React components | PascalCase | `NewPayableDialog` |
| DB columns & types | snake_case | `bank_account_id` |
| Server Actions | camelCase functions | `createIncome()` |
| Hooks | `use` prefix + camelCase | `usePayables()` |
| Routes | kebab-case segments | `/dashboard/bank-accounts` |

### Code style

- TypeScript strict mode — no `any`, no `@ts-ignore`
- Prefer `interface` over `type` for object shapes
- Use path aliases (`@/`) for all imports
- Co-locate page-specific components in `<route>/components/`
- Shared components go in `src/components/`
- No barrel files (`index.ts` re-exports) — import directly
- Spanish is allowed in domain terms (NCF, DGII, cuadre) and user-facing strings

### UI rules

- Use shadcn/ui components — never raw HTML for buttons, inputs, dialogs, etc.
- Tailwind utility classes only — no CSS files, no CSS modules
- Follow the new-york shadcn style variant
- Icons: Lucide only
- Toast for feedback, Dialog for forms, Sheet for side panels
- Responsive: mobile-first approach

### Supabase rules

- Browser client (`client.ts`) for client-side reads
- Server client (`server.ts`) for Server Actions and server components
- Admin client (`admin.ts`) for operations that bypass RLS
- Never expose the service role key to the client
- Schema changes go in numbered migration files under `supabase/migrations/`
- RPC functions for any operation that touches multiple tables atomically

## PR & commit rules

- Branch naming: `<type>/<short-description>` (e.g., `feat/payment-links`, `fix/balance-rls`)
- Commit messages: imperative, concise, English
- One logical change per commit
- PRs should target `main`
- PR title: short, under 70 chars
- PR body: summary bullets + test plan

## Testing

> No test framework is configured yet. When tests are added:
> - Use Vitest for unit/integration tests
> - Use Playwright for E2E tests
> - Test files live next to the code they test (`*.test.ts`)

## Boundaries

- This is an internal tool — no public API, no external integrations beyond Supabase
- All financial operations must go through Postgres RPC functions — never update balances from the client
- Auth decisions happen server-side only
- No direct DB writes from client components
- Migrations are append-only — never modify existing migration files
