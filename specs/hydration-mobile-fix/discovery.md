# Discovery — hydration-mobile-fix

## Request

Fix the `useIsMobile` SSR/hydration mismatch so there's no first-paint layout shift (`undefined → boolean` flip) across the many pages that depend on it.

## Findings

- `src/hooks/use-mobile.ts`: state initializes to `undefined`, then a `useEffect` sets the real value from `window.matchMedia`/`innerWidth`; the hook returns `!!isMobile`. So **first render always yields `false` (desktop)**, and on a mobile viewport it flips to `true` only after mount → an extra render and visible layout shift / CLS.
- **17 consumers** depend on it, returning a plain `boolean`:
  - `src/components/ui/sidebar.tsx` (`isMobile` drives Sheet-vs-rail rendering — the most visible shift).
  - 14 dashboard pages (payables, receivables, invoices, clients, users, branches, bank-accounts, link-de-pago, loyalty, transactions/expenses, transactions/incomes, parameters/income-types, parameters/expense-types) use it for responsive table/layout decisions.
  - `src/components/dashboard/chart-area-interactive.tsx`, `invoices/components/clients-combobox.tsx`.
- Because every consumer reads a `boolean`, changing the return type to `boolean | undefined` would ripple into all 17 files.
- Root layout already sets `suppressHydrationWarning` on `<html>` (`src/app/layout.tsx:101`).

## Affected areas

- Primary: `src/hooks/use-mobile.ts` (rewrite internals).
- Consumers stay untouched **iff** the return type remains `boolean`.

## Approaches considered

- **Option A — `useSyncExternalStore` refactor, keep `boolean` return.** Subscribe to `matchMedia` change events; `getSnapshot` reads the live match on the client, `getServerSnapshot` returns `false`. Removes the `undefined` intermediate and the post-mount `useEffect` flip — the value is consistent from the first client render after hydration, eliminating the double-render jank. No consumer changes (still returns `boolean`). *Leaning toward this.*
- **Option B — Expose `boolean | undefined` and gate rendering in consumers.** Most "correct" (consumers can render a skeleton until known) but touches all 17 files and is a much bigger change than warranted.
- **Option C — Lazy `useState` initializer reading `window` when defined.** Smaller, but SSR still returns `false` and it keeps a redundant effect; less clean than `useSyncExternalStore`.

Leaning toward: **Option A**.

## Open questions ← a human must answer these

1. **Signature:** Confirm keeping the `boolean` return (Option A, zero consumer changes) rather than exposing `boolean | undefined` and updating all 17 consumers?
2. **Server snapshot default:** OK that SSR/first paint assumes **desktop (`false`)** — matching today's behavior and the desktop-majority of this internal tool — rather than mobile-first?

## Assumptions

- Breakpoint stays `768px` (`MOBILE_BREAKPOINT`).
- No new dependencies; `useSyncExternalStore` is from React (already on React 19).
- No visual/markup changes — purely the hook's internals.

## Resolution ← filled in after the human answers

- Q1 (signature) → **Keep `boolean` return** (Option A). Zero consumer changes.
- Q2 (server default) → **Desktop (`false`)** as the server snapshot, matching current behavior.
- Decision: **Option A** — rewrite `src/hooks/use-mobile.ts` to use `React.useSyncExternalStore` (subscribe to `matchMedia(max-width: 767px)` change events; client `getSnapshot` reads `mql.matches`; `getServerSnapshot` returns `false`). Returns plain `boolean`, breakpoint stays 768px, no consumer or markup changes.
