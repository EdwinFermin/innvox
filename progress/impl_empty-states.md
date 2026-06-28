# Implementation — empty-states

> Feature: `empty-states` — Designed reusable `EmptyState` on the reference pages
> (payables CRUD + cuadre-del-dia report). Implemented strictly to the approved
> spec in `specs/empty-states/`.

## Files changed

| File | Change |
| --- | --- |
| `src/components/ui/empty-state.tsx` | **New.** Presentational `EmptyState` component (T1). |
| `src/app/dashboard/payables/components/new-payable-dialog.tsx` | Made the dialog **controlled** — added `open` / `onOpenChange` props, removed internal `useState`, rewired `Dialog`/footer/cancel/onSuccess to the lifted state (T2). |
| `src/app/dashboard/payables/page.tsx` | Lifted `dialogOpen`/`setDialogOpen`; threaded it into the header `NewPayableDialog`; split the single no-rows `<TableCell>` text into two `EmptyState` cases (empty dataset / no results) (T2, T3). |
| `src/app/dashboard/reports/cuadre-del-dia/page.tsx` | Replaced the no-branches plain-text `<CardContent>` and the no-movements else-branch text with `EmptyState` renders (T4, T5). |
| `specs/empty-states/tasks.md` | Checked off T1–T7, T12–T13; annotated the Tests section (no unit runner). |

## Key design decisions

- **`icon` prop is a `LucideIcon` component, not a rendered node.** The spec's
  design.md sketch typed it as `React.ReactNode`, but the implementer note and
  the T4/T5 call shapes (`icon={Building2}`) require passing the component
  reference. I made the prop `icon: LucideIcon` and render it internally as
  `<Icon className="size-6" aria-hidden />`. This keeps **one consistent shape**
  across the component definition and all four call sites (`Inbox`, `SearchX`,
  `Building2`) and lets the container own icon sizing — so every empty state
  looks identical regardless of caller.
- **Controlled-dialog lift (R10).** `NewPayableDialog` previously owned its own
  `open`/`setOpen` and rendered its own `<DialogTrigger>`. I lifted a single
  `dialogOpen`/`setDialogOpen` into `PayablesPage` and pass it down as
  `open`/`onOpenChange`. The header still renders the visible trigger button; the
  in-table empty-state action is a plain `<Button onClick={() => setDialogOpen(true)}>`
  that flips the same state. **One dialog instance** lives in the tree (under the
  header), driven by one state — so there is no duplicate form/mutation state and
  no risk of double success toasts (the rejected alternative in design.md). All
  prior internal `setOpen(false)` sites (cancel button, mutation `onSuccess`) now
  call `onOpenChange(false)`, preserving existing close behavior exactly.
- **Two payables empty cases, loading branch untouched (R7/R8/R9).** The existing
  `isLoading ? <TableSkeleton/> : rows?.length ? <rows> : <empty>` structure is
  preserved; only the final `<empty>` arm was split. `payables.length === 0`
  (raw array empty) → `Inbox` empty-dataset state with the create action;
  otherwise (rows present but all filtered away, i.e. `filteredPayables.length === 0`)
  → `SearchX` no-results state with "Limpiar búsqueda". The else-arm is reached
  only when `table.getRowModel().rows?.length` is falsy, which — given the table
  is fed `filteredPayables` — is exactly the no-results condition when `payables`
  is non-empty.
- **`SearchX` not imported in the cuadre page.** tasks.md T5 mentioned importing
  `Inbox` and `SearchX` "in both page files", but the cuadre page has no
  search/no-results case (R11/R12 use only `Inbox`/`Building2`). An unused import
  fails `npm run lint`, so the cuadre page imports only `Building2`/`Inbox`;
  `SearchX` is imported where it is actually used (`payables/page.tsx`). Noted in
  the updated T5.
- **Motion mirrors the adjacent surfaces.** Entry animation reuses the exact
  `motion-safe:` token sequence already established in `error-state.tsx`
  (`animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ease-out`), and the
  `motion-safe:` prefix matches the gate just added to `skeleton.tsx`. Only
  `opacity` + `transform` animate (compositor-friendly), 200ms ease-out, inside
  the 150–250ms band.
- **Token-only, layout-neutral styling (R3/R6).** Icon container is
  `bg-muted text-muted-foreground rounded-xl p-3`; title `text-foreground font-semibold`;
  description `text-muted-foreground text-sm`. Root carries no outer margin and no
  fixed width — only `flex flex-col items-center justify-center gap-4 py-10
  text-center`, so it fills a `<TableCell>`/`<CardContent>` without fighting it.
  Verified: no hex literals, no arbitrary `[…px]` values (grep clean).

## Requirement → coverage table

> No unit runner exists (`reins.config.json` `test: null`), so coverage is by
> the structural location of each `EmptyState`/branch in the diff plus a green
> `npx reins verify` (lint + design slop scan) and `npm run typecheck`. T8–T11
> are deferred per tasks.md.

| Req | Covered by (file:location) |
| --- | --- |
| R1 — component renders icon/title/description in centered column | `src/components/ui/empty-state.tsx` (root flex-col, icon span, title+description block) |
| R2 — optional action slot below description | `empty-state.tsx` — `{action ? <div>{action}</div> : null}` |
| R3 — token-only styling | `empty-state.tsx` — only design tokens; grep confirms no hex / arbitrary px; passes lint (T7) + design scan (T12) |
| R4 — entry motion, opacity+translateY, 150–250ms ease-out | `empty-state.tsx` — `motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out` |
| R5 — reduced-motion gate (no animation) | `empty-state.tsx` — every motion class behind the `motion-safe:` variant; `prefers-reduced-motion: reduce` → static render |
| R6 — layout neutrality | `empty-state.tsx` — no outer margin / fixed width on root; verified renders inside `<TableCell>` and `<CardContent>` call sites |
| R7 — payables empty dataset | `payables/page.tsx` — `payables.length === 0` arm → `EmptyState` icon `Inbox`, "Sin cuentas por pagar", create action |
| R8 — payables no results | `payables/page.tsx` — else arm (rows all filtered away) → `EmptyState` icon `SearchX`, "Sin resultados", `setSearchQuery("")` action |
| R9 — payables loading unchanged | `payables/page.tsx:386` — `isLoading ? <TableSkeleton .../>` branch untouched |
| R10 — create-dialog action wiring (shared state) | `payables/page.tsx` — single `dialogOpen`/`setDialogOpen`; header `NewPayableDialog open=… onOpenChange=…`; in-table action sets same state; `new-payable-dialog.tsx` controlled props |
| R11 — cuadre no movements | `cuadre-del-dia/page.tsx` — movements else-arm → `EmptyState` icon `Inbox`, "Sin movimientos", no action |
| R12 — cuadre no branches | `cuadre-del-dia/page.tsx` — `!isLoading && !branches.length` → `CardContent className="py-10"` + `EmptyState` icon `Building2`, "Sin sucursales", no action |
| R13 — cuadre loading unchanged | `cuadre-del-dia/page.tsx:233` — `isLoading ? <TableSkeleton rows={8} columns={5}/>` branch untouched; no-branches block gated on `!isLoading` |
| R14 — no new deps | only `lucide-react` (already present) and existing UI primitives imported; no `package.json` change; passes lint/security audit |

## Self-review (Four R's)

### Risk — *blast radius + reversibility*
- Diff stayed inside scope: one new presentational component plus the three files
  named in design.md. No drive-by refactors, renames, or formatting churn.
- **Public-signature change:** `NewPayableDialog()` → `NewPayableDialog({ open, onOpenChange })`.
  Fan-in audited — the only caller is `payables/page.tsx` (the header `actions` slot),
  updated in the same diff. No other reference exists. The change is fully
  contained and reversible by reverting the same two files.
- Coverage is proportional to blast radius: the shared-dialog wiring is the
  highest-reach change and is exercised structurally by both trigger sites in the
  diff; the rest is leaf UI. `progress/history.md` is left untouched (append-only).

### Readability — *recover the why*
- The shared dialog state carries a comment at its declaration explaining the
  single-instance rationale (R10); the controlled-props interface in the dialog
  documents that the parent owns `open`. The non-obvious `SearchX`-not-imported
  decision and the `icon: LucideIcon`-vs-`ReactNode` deviation are recorded above.
- Names match behavior: `dialogOpen`/`setDialogOpen`, `onOpenChange`. No dead code,
  no commented-out blocks, no vestigial params (the removed `useState` import line
  is unused-free — `React` is still used for `useState` elsewhere in the dialog via
  the form hooks; verified by clean typecheck/lint).

### Reliability — *right answer for in-contract inputs*
- The payables empty branches partition the no-rows space exhaustively: loading →
  skeleton; rows present → table; raw `payables` empty → dataset empty state;
  rows-all-filtered (`filteredPayables` empty, payables non-empty) → no-results.
  No input falls through to a blank cell. The `setSearchQuery("")` action restores
  the full list deterministically.
- Cuadre branches: the no-branches block is gated on `!isLoading && !branches.length`;
  the movements else-arm only renders when not loading and `movementRows.length`
  is 0. Both loading branches are byte-for-byte unchanged (verified by grep), so
  no skeleton was replaced by an empty state mid-load.
- **R10 shared-state correctness (called out):** opening from the header trigger
  and from the in-table button both write the *same* `dialogOpen` state and the
  *same* single `NewPayableDialog` instance reads it — so the dialog can never be
  open twice, and `onSuccess`/cancel close it from either entry point. Submitting
  still invalidates `["payables"]` and toasts exactly once.

### Resilience — *fails safe when the world breaks*
- No new external calls, FS, locks, or on-disk state — `EmptyState` is pure
  presentation and the dialog rewiring only moves React state ownership. Existing
  mutation error handling (`onError` → `mapError` toast) is preserved unchanged.
- **R5 reduced-motion gate (called out):** every animation class is behind the
  `motion-safe:` variant, so a `prefers-reduced-motion: reduce` environment — the
  "world" the component must degrade gracefully for — gets a fully static render
  with zero transitions. There is no JS animation that could leave the component
  mid-state if interrupted; the entry animation is a one-shot CSS keyframe that
  never blocks interaction with the action button.

## Final verify output

```
$ npm run typecheck
> tsc --noEmit
(clean)

$ npm run lint
> eslint
(clean)

$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  8.8s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.5s
  ✓ design        4 UI file(s) clean  33ms
  ✓ feature-list  8 feature(s), 1 active, 1 in progress  1ms
  ✓ traceability  every requirement maps to a task  1ms

Result: PASS
```

## Handoff

Not marking `done`. Requesting the reviewer. After `APPROVED`, set `empty-states`
to `done` and move this summary into `progress/history.md`.
