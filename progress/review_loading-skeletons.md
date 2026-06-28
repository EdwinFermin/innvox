# Review — loading-skeletons
Verdict: APPROVED

## Checkpoints

- C1: [x] — Harness intact; all base files present; `reins doctor` passes implicitly through `npx reins verify` PASS.
- C2: [x] — One feature `in_progress` (`loading-skeletons`); `feature-list` gate green.
- C3: [x] — `npx reins verify` lint gate green (8.5 s, no problems).
- C4: [x] — `test: null` in `reins.config.json`; unit gate shows `∘ unit — no command configured`. Per the test-contract context, the traceability table in `specs/loading-skeletons/tasks.md` plus a green gate satisfies this checkpoint. No executable runner exists; T4–T6 correctly marked skipped.
- C5: [x] — Security gate green: 0 vulnerabilities >= high, no secrets found. No new npm dependencies (`package.json` unchanged; only imports from `react` type and existing `@/components/ui/*` primitives).
- C6: [x] — Design gate green at `failOn: block` threshold (21 advisory tells, zero block-severity items). The `motion-safe:animate-pulse` fix in `skeleton.tsx` is the direct remediation of the design-reviewer block that gated R6 compliance.
- C7: [x] — Traceability gate green: every requirement R1–R8 maps to a task in the traceability table.
- C8: [x] — Implementation does exactly what the spec says: `TableSkeleton` created at the exact path with the exact signature, composed from existing primitives only; payables wired with `table.getState().pagination.pageSize` and `table.getVisibleLeafColumns().length`; cuadre wired with `rows={8} columns={5}`; `<TableHeader>` untouched on both pages; empty-state row preserved and simplified correctly; R6 now genuinely satisfied by the primitive fix. No more, no less than the spec mandated.
- C9: [ ] — `progress/history.md` not yet updated for loading-skeletons and `current.md` not reset. Standard post-approval close step; not a blocker at review time (consistent with prior feature reviews in this autopilot run).

## Judgment (Four R's)

### Risk

The diff now touches four files: `table-skeleton.tsx` (new leaf), `payables/page.tsx` (local loading-branch swap), `cuadre-del-dia/page.tsx` (local loading-branch swap), `skeleton.tsx` (one-token primitive change), plus `tasks.md` bookkeeping.

The `skeleton.tsx` change (`animate-pulse` → `motion-safe:animate-pulse` at line 7) has the highest fan-in of any file touched. `Skeleton` is the base primitive consumed throughout the codebase. The change is strictly additive for motion-reduce users (animation stops where it was previously playing in violation of the system preference) and identical for all other users (the Tailwind `motion-safe:` variant applies `animate-pulse` only when `prefers-reduced-motion: no-preference`, which is the default). No layout shift, no visual regression for the default case, and no public contract change — the component signature `Skeleton({ className, ...props })` is untouched, `data-slot="skeleton"` is untouched, `bg-accent` and `rounded-md` are untouched. Reverting the one token restores prior behavior. No reversibility artifact is owed.

Note on the `mapError` lines visible in `payables/page.tsx`: these are approved `friendly-error-messages` work co-resident in the uncommitted working tree; they are not introduced by this feature and are not a drive-by.

[advisory] — Blast radius of the primitive change is wide in the sense that every Skeleton consumer is affected, but the effect is strictly correct and subtractive for a user class (motion-reduce) that the component was previously not honoring. No block finding.

### Readability

The one-token change `motion-safe:animate-pulse` is a standard Tailwind responsive/state variant with a self-documenting name — no comment or why-capture is needed; the semantics are recoverable by any reader familiar with Tailwind. All other readability findings from the initial review are unchanged: names describe behavior, non-obvious choices are documented in comments and the impl report, no dead code.

[advisory] — No block finding.

### Reliability

- R6 correctness: previously, the impl report claimed R6 was "inherited from the Skeleton primitive" on the assumption that the primitive already gated the animation. That assumption was inaccurate — the primitive had bare `animate-pulse` with no `motion-safe:` guard. The fix (`motion-safe:animate-pulse` at `skeleton.tsx:7`) closes the gap; R6 is now correctly met at the primitive level without any change to `TableSkeleton`. All other requirements (R1–R5, R7–R8) are unaffected.
- R1/R2/R5 correctness: unchanged — `Array.from` × `Array.from` loop, one `<Skeleton>` per `<TableCell>`, body rows only, confirmed.
- R3/R4 correctness: payables `table.getState().pagination.pageSize` + `table.getVisibleLeafColumns().length`; cuadre `rows={8} columns={5}` with distinct loading/empty branches. Both confirmed correct from the diff.

[advisory] — No executable unit runner exists (documented project constraint). The typed signature + typecheck + lint + green build is the strongest mechanically available proof. No block finding.

### Resilience

`motion-safe:animate-pulse` is a CSS-level Tailwind variant; it adds no runtime logic, no external call, no state, and no resource acquisition. `TableSkeleton` and the page wirings are pure presentational components. The primitive change cannot introduce a new failure mode: it is resolved entirely at build time by the Tailwind compiler into a `@media (prefers-reduced-motion: no-preference)` wrapper around the keyframe rule. No block finding.

## Changes required

None.
