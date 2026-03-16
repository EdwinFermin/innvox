# Innvox

Innvox is a branch-aware finance and operations dashboard for managing branches, users, clients, invoices, incomes, expenses, receivables, payables, reports, bank accounts, and branch payment links.

## Stack

- Next.js App Router + React 19 + TypeScript
- Supabase for PostgreSQL data, auth-backed access, and RPC functions
- NextAuth credentials auth normalized into the app session/store
- React Query for client-side reads
- Server Actions in `src/actions/` for writes
- shadcn/ui + Tailwind CSS for UI primitives

## Start Here

- Product and architecture overview: `docs/app-overview.md`
- Agent workflow and context policy: `AGENTS.md`
- Generated context artifacts: `.cache/context/repo-map.json`, `.cache/context/repo-summary.json`, `.cache/context/last-pack.md`, `.cache/context/last-pack.json`

## Project Shape

- `src/app/` route tree for public pages, auth pages, and dashboard pages
- `src/actions/` server actions for mutations
- `src/hooks/` React Query hooks and print helpers
- `src/lib/` auth, Supabase clients, and domain helpers
- `src/types/` app and database-facing types
- `supabase/migrations/` schema and RPC definitions

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required Environment Variables

- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Check local auth and data access config before running privileged flows.

## Validation

```bash
npm run typecheck
npm run lint
```

## Agent Context Workflow

Use the scoped context flow instead of scanning the whole repo.

```bash
npm run context:map
npm run context:pack -- --query "your task here" --budget 12000 --max-files 10
npm run context:doctor
```

Read the generated pack first, then expand only if the task still needs more context.
