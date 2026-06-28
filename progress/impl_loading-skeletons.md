# Implementation — loading-skeletons

## Summary

Added a shared `TableSkeleton({ rows, columns })` body-only loading placeholder built solely
on the existing `Skeleton`, `TableRow`, and `TableCell` primitives, and wired it into the two
reference table pages (payables and cuadre-del-dia) in place of their ad-hoc loading rows. No
new dependencies; the only existing-file changes are the two page wirings and the `tasks.md`
bookkeeping.

## Files changed

| File | Change |
| --- | --- |
| `src/components/ui/table-skeleton.tsx` | Created — named export `TableSkeleton({ rows, columns }: { rows: number; columns: number }): JSX.Element`. Renders a fragment of exactly `rows` `<TableRow>`, each with exactly `columns` `<TableCell>`, each holding one `<Skeleton className="h-4 w-full" />`. Body rows only; no header. |
| `src/components/ui/skeleton.tsx` | Edited (post-review block fix) — base primitive class `animate-pulse` → `motion-safe:animate-pulse` so the pulse animation is gated behind `prefers-reduced-motion: no-preference`. This is what actually satisfies R6 (the spec's assumption that the primitive was already gated was inaccurate). One-token change; fixes `TableSkeleton` and every other `Skeleton` consumer. |
| `src/app/dashboard/payables/page.tsx` | Replaced the `isLoading` `SpinnerLabel` `<TableRow>` branch inside `<TableBody>` with `<TableSkeleton rows={table.getState().pagination.pageSize} columns={table.getVisibleLeafColumns().length} />`. Swapped the now-unused `SpinnerLabel` import for the `TableSkeleton` import. |
| `src/app/dashboard/reports/cuadre-del-dia/page.tsx` | Added an `isLoading` branch at the top of `<TableBody>` rendering `<TableSkeleton rows={8} columns={5} />`; simplified the trailing empty-state row to the static "Sin movimientos en la fecha seleccionada." message (the old `isLoading ? "Cargando…" : …` ternary inside it became unreachable). Added the `TableSkeleton` import. |
| `specs/loading-skeletons/tasks.md` | Checked off T1–T3, T7–T9; marked T4–T6 skipped with the no-unit-runner note; Traceability table left intact. |

## Key design decisions

- **`import type { JSX } from "react"`.** R7 mandates the return type `JSX.Element`. Under
  React 19 types (`@types/react@^19`) with `jsx: "react-jsx"`, the `JSX` namespace is no
  longer auto-declared globally, so an explicit type-only import is required for the
  annotation to resolve. This keeps the exact spec signature while staying type-clean — no
  runtime import, no new dependency.
- **Index keys for the rows/cells.** The skeleton is a static, never-reordering placeholder,
  so `Array.from({ length: n }).map((_, i) => …key={i})` is stable and correct here (the
  usual "don't use index keys" caveat only bites lists that reorder/insert). Rationale is in
  a component doc-comment so a future reader does not "fix" it.
- **`h-4 w-full` per Skeleton, matching the spec's data shape.** These are design-scale
  utilities (not arbitrary `[…px]` values), so the design slop scan stays clean. The base
  `Skeleton` supplies `bg-accent motion-safe:animate-pulse rounded-md`; `TableSkeleton` adds
  no color/radius/shadow/motion of its own.
- **Base-primitive motion gate (post-review block fix).** The design-reviewer correctly
  flagged that R6 was unmet: Tailwind v4 does **not** auto-gate `animate-*` utilities behind
  `prefers-reduced-motion`, so the primitive's original unconditional `animate-pulse` pulsed
  infinitely even for users who requested reduced motion (the spec's R6 rationale wrongly
  assumed the primitive was already gated). Fixed at the source — `src/components/ui/skeleton.tsx`
  now uses `motion-safe:animate-pulse`, the same pattern already used in
  `src/components/ui/error-state.tsx`. One token fixes `TableSkeleton` and every other
  `Skeleton` consumer; no new dependency and no behavior change for default (no-preference)
  users, who still see the pulse.
- **Cuadre empty-state simplification.** Once `isLoading` is handled by the skeleton at the
  top of `<TableBody>`, the trailing `else` row only renders when **not** loading, so its
  inner `isLoading ? "Cargando movimientos…" : "Sin movimientos…"` ternary had a dead branch
  ("Cargando…" was unreachable). I collapsed it to the single static empty message. This is
  the minimal edit that keeps lint clean and preserves R4's "keep the empty-and-not-loading
  row" requirement — not a drive-by refactor, but the direct consequence of moving the
  loading state out.
- **Payables: column count from `getVisibleLeafColumns()`, page size from table state.** Per
  the design doc — `getVisibleLeafColumns().length` respects any column-visibility toggles
  active before data loads, and `getState().pagination.pageSize` (default 10) sizes the
  skeleton to the same row count the populated table will show, so the swap is visually
  seamless.

## Requirement → coverage (no unit runner; verified by gates)

> This project sets `reins.config.json` `commands.test: null` (the `unit` check reports "no
> command configured"), and `CLAUDE.md` forbids adding test infrastructure. Per the
> `tasks.md` NOTE, the unit tasks T4–T6 are skippable; no `*.test.tsx` was added and no test
> runner was installed. Each requirement is covered by its implementing task and proven by the
> cited deterministic gate (typecheck, lint, design slop scan, traceability) and `npm run build`.

| Req | Task | Implemented in | Proven by |
| --- | --- | --- | --- |
| R1 — renders `rows × columns` skeleton cells | T1 | `table-skeleton.tsx`: nested `Array.from({length: rows})` × `Array.from({length: columns})` → `<TableRow>`/`<TableCell>` | typecheck + lint + build |
| R2 — each cell holds one `<Skeleton>` with `data-slot="skeleton"` + the pulse animation | T1 | `<TableCell><Skeleton className="h-4 w-full" /></TableCell>`; `Skeleton` carries `data-slot="skeleton" … motion-safe:animate-pulse` (the `motion-safe:` variant still emits `animate-pulse` for the default no-preference case, satisfying R2 while also fixing R6) | typecheck + lint |
| R3 — payables uses `pageSize` + visible column count | T2 | `<TableSkeleton rows={table.getState().pagination.pageSize} columns={table.getVisibleLeafColumns().length} />` | typecheck + lint + build |
| R4 — cuadre uses `rows={8} columns={5}`; empty row kept | T3 | `isLoading ? <TableSkeleton rows={8} columns={5} /> : …`; trailing static "Sin movimientos…" row | typecheck + lint + build |
| R5 — `<TableHeader>` stays visible; skeleton is body-only | T1, T2, T3 | `TableSkeleton` returns a fragment of `<TableRow>` only (no `<thead>`); both pages' `<TableHeader>` blocks untouched | code inspection + typecheck + lint |
| R6 — `prefers-reduced-motion` respected | T1 + base-primitive fix | corrected `src/components/ui/skeleton.tsx` to `motion-safe:animate-pulse` — Tailwind v4 does **not** auto-gate `animate-*` utilities, so the original unconditional `animate-pulse` pulsed even under `prefers-reduced-motion: reduce` (spec rationale was inaccurate). `motion-safe:` emits the animation only under `@media (prefers-reduced-motion: no-preference)`, matching the project's own `error-state.tsx` pattern. `TableSkeleton` adds no motion of its own | code inspection + lint (mirrors existing `motion-safe:` usage) |
| R7 — named export with exact TS signature | T1 | `export function TableSkeleton({ rows, columns }: { rows: number; columns: number }): JSX.Element` (via `import type { JSX } from "react"`) | typecheck |
| R8 — no new npm dependencies | T1 | imports only `react` (type), `@/components/ui/skeleton`, `@/components/ui/table` | security deps audit + unchanged `package.json` |

## Self-review (Four R's)

### Risk — blast radius + reversibility + scope fidelity
- **Scope:** one additive new file, two minimal in-place page wirings, the `tasks.md`
  bookkeeping, and — added in the post-review block fix — a **one-token** change to the shared
  `src/components/ui/skeleton.tsx` primitive (`animate-pulse` → `motion-safe:animate-pulse`).
  The primitive edit is the minimal change required to actually satisfy R6 and is justified by
  the design-reviewer block; it is not a drive-by refactor. No signature, prop contract, route,
  or serialized format was changed; `package.json` is untouched.
- **Blast radius of the primitive edit:** `Skeleton` is a shared, high-fan-in symbol, so the
  change reaches every skeleton consumer — but it is a **strict refinement** of behavior:
  default (no-preference) users see the identical pulse, and only `prefers-reduced-motion: reduce`
  users get the (correct) static variant. No consumer relied on the animation running under
  reduced motion, so no caller breaks.
- **Reversibility:** every change is a local, additive-or-token edit. Reverting restores the
  prior `SpinnerLabel` / "Cargando…" behavior and the unconditional pulse. No migration,
  version bump, or flag is needed because no public contract was changed or removed.

### Readability — recoverable intent for the next cold agent
- Names describe behavior: `TableSkeleton`, `TableSkeletonProps`, `rows`, `columns`,
  `rowIndex`, `columnIndex`.
- Non-obvious choices have their **why** captured: the index-key rationale lives in the
  component doc-comment; the `import type { JSX }` reason and the cuadre dead-branch collapse
  are documented above.
- No dead code, commented-out blocks, or vestigial params left behind — the unused
  `SpinnerLabel` import was removed, and the unreachable "Cargando…" ternary branch was
  collapsed rather than left dangling.

### Reliability — right answer for in-contract inputs
- The component is correct across its in-contract integer inputs: `rows=0`/`columns=0` →
  `Array.from({length: 0})` yields an empty fragment (no rows/cells, no crash); the wired
  call sites pass `pageSize` (default 10) / `getVisibleLeafColumns().length` and the fixed
  `8 × 5`, all producing exactly `rows × columns` cells (R1). Output is deterministic — no
  wall-clock, locale, map-order, or randomness; a re-render is idempotent.
- Each cell renders exactly one `<Skeleton>` carrying `data-slot="skeleton"` +
  `motion-safe:animate-pulse` from the primitive (R2 — the `motion-safe:` variant still emits
  `animate-pulse` for default users, while correctly skipping it under reduced motion for R6).
  The finite set of consumer branches (loading / populated / empty) is exhaustively handled on
  both pages.
- No executable unit runner exists (documented limitation, not a weakened test); the
  `rows × columns` invariant and the exact export signature are enforced by the typed
  signature, typecheck, lint, and the green build — none weakened or deleted.

### Resilience — fails safe when the world breaks
- `TableSkeleton` is a pure presentational component: no external call, file handle, lock,
  network/DB access, or multi-step on-disk write — so there is nothing to time out, leak, or
  leave half-written, and a re-mount resumes cleanly.
- It does not index into or trust any external response shape; it only iterates two numeric
  props, and `Array.from({length: n})` is safe for the `0`/empty boundary, so a degenerate
  prop can never throw.
- The pages' surrounding data-fetch error handling is unchanged; this change only swaps the
  *loading* visual, so it neither adds nor removes any failure path.

## Final verify output (after R6 block fix)

```
$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  10.9s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.9s
  ✓ design        4 UI file(s) clean  60ms
  ✓ feature-list  8 feature(s), 1 active, 1 in progress  6ms
  ✓ traceability  every requirement maps to a task  3ms
Result: PASS

$ npm run typecheck   → clean (tsc --noEmit, no output)
$ npm run lint        → clean (no problems)
```

## Post-review revision — R6 motion-gate block fix

The design-reviewer raised one block: R6 was **unmet**. The base `Skeleton` primitive
(`src/components/ui/skeleton.tsx:6`) emitted `animate-pulse` unconditionally, and Tailwind v4
does **not** auto-gate `animate-*` utilities behind `prefers-reduced-motion` (there is no
reduced-motion override in `globals.css`, and the project's own `error-state.tsx` uses the
explicit `motion-safe:` pattern). So users with `prefers-reduced-motion: reduce` saw an
infinite pulse on every skeleton — the spec's R6 rationale ("already gated by the primitive")
was inaccurate.

Fix: changed the primitive class `"bg-accent animate-pulse rounded-md"` →
`"bg-accent motion-safe:animate-pulse rounded-md"`. One token at the source fixes
`TableSkeleton` and every other `Skeleton` consumer; no new dependency and no behavior change
for default (no-preference) users. R6 and R2 coverage rows above were corrected accordingly.
Re-verified: `npx reins verify --changed` PASS (4 UI files clean), `npm run typecheck` clean,
`npm run lint` clean.

The two advisory findings (uniform `w-full` bar widths; the combined `isLoading` OR gate in
cuadre) are intentionally left as-is per the coordinator — they don't block and keep the diff
minimal.

## Handoff

Ready for review. Do not mark `done` until the reviewer returns `APPROVED`.
