# Innvox

Innvox is a branch-aware finance and operations dashboard built with Next.js, Firebase, React Query, and shadcn/ui.

## Main areas

- Dashboard metrics and reports
- Income and expense tracking
- Receivables and payables
- Invoices and clients
- Users, branches, and settings
- `Link de pago` for branch-based QR payment links

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required environment variables

- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Auth and routing

- Login uses NextAuth credentials backed by Firebase
- Protected routes are enforced in `src/proxy.ts`
- Server guards live in `src/lib/auth/guards.ts`
- Public payment pages live outside `/dashboard`

## Fast architecture overview

Read `docs/app-overview.md` first. It is the shortest reliable way to understand the app structure, major collections, route layout, and module conventions.

## Context workflow for agents

This repository uses a scoped context workflow to avoid scanning the whole project.

```bash
npm run context:map
npm run context:pack -- --query "your task here" --budget 12000 --max-files 10
```

Generated files:

- `.cache/context/repo-map.json`
- `.cache/context/last-pack.md`
- `.cache/context/last-pack.json`
