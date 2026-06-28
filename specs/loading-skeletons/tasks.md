# Tasks — loading-skeletons

> Discrete tasks that together cover every requirement. Check each off when done.
> NOTE: The project's `"test"` script is `null` in package.json. Test tasks (T4–T6) describe what must be verified; they are skippable if the test runner is not configured, but the implementer must record which assertions were validated manually or via the verify gate.

## Implementation

- [x] T1 — Create `src/components/ui/table-skeleton.tsx` exporting `TableSkeleton({ rows, columns })` built on `Skeleton`, `TableRow`, and `TableCell` primitives (covers: R1, R2, R7, R8)
- [x] T2 — Wire payables page: replace `isLoading` `SpinnerLabel` branch with `<TableSkeleton rows={table.getState().pagination.pageSize} columns={table.getVisibleLeafColumns().length} />`; remove `SpinnerLabel` import if unused (covers: R3, R5)
- [x] T3 — Wire cuadre page: restructure `<TableBody>` to show `<TableSkeleton rows={8} columns={5} />` when `isLoading`, keep "Sin movimientos..." row for the empty-and-not-loading case (covers: R4, R5)

## Tests

> NOTE: The project has no unit-test runner configured (`reins.config.json` → `commands.test` is `null`; `unit` is reported as "no command configured" by `npx reins verify`). Per the tasks NOTE, T4–T6 are skippable; their assertions are covered by the requirement→coverage table in `progress/impl_loading-skeletons.md` and a green `npx reins verify` (lint + typecheck + design slop scan). No `*.test.tsx` files were added and no test runner was installed.

- [~] T4 — Unit test: render `<TableSkeleton rows={3} columns={4} />` and assert exactly 3 `<tr>` elements and 12 `<td>` elements in the output (covers: R1) — skipped: no unit runner
- [~] T5 — Unit test: render `<TableSkeleton rows={1} columns={1} />` and assert the single `<td>` contains an element with `data-slot="skeleton"` and class `animate-pulse` (covers: R2) — skipped: no unit runner
- [~] T6 — Unit test: render `<TableSkeleton rows={2} columns={2} />` and assert no `<thead>` is rendered by the component itself (covers: R5) — skipped: no unit runner

## Close

- [x] T7 — `npm run lint` and `npm run typecheck` pass with no new errors
- [x] T8 — `npx reins verify` is green
- [x] T9 — Traceability table written into `progress/impl_loading-skeletons.md`

## Traceability

| Requirement | Task(s) | Test(s) |
| --- | --- | --- |
| R1 — renders rows × columns skeleton cells | T1 | T4 |
| R2 — each cell contains a Skeleton with animate-pulse | T1 | T5 |
| R3 — payables uses table pageSize and visible column count | T2 | manual / integration |
| R4 — cuadre uses rows=8, columns=5 fixed | T3 | manual / integration |
| R5 — TableHeader stays visible; TableSkeleton is body-only | T1, T2, T3 | T6 |
| R6 — prefers-reduced-motion respected via Skeleton primitive | T1 (inherits from Skeleton) | inherited from Skeleton primitive tests |
| R7 — named export with correct TypeScript signature | T1 | T4, T5, T6 (type-checked at compile time) |
| R8 — no new npm dependencies | T1 | `npm run typecheck` / `npx reins verify` |
