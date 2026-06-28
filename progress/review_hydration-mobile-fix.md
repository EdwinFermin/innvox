# Review — hydration-mobile-fix
Verdict: APPROVED

## Checkpoints

- C1: [x] Harness files present (`docs/*`, `feature_list.json`, `progress/`, `.claude/agents/*`). `npx reins verify` passed without harness complaints.
- C2: [x] One feature `in_progress` (`hydration-mobile-fix`); `current.md` reflects it; `feature-list` gate green.
- C3: [x] Lint clean — `npx reins verify --only lint` green (10.7s). `npm run lint` exit 0 confirmed by implementer.
- C4: [x] `test: null` in `reins.config.json`; unit gate skipped (`∘`). Per spec `tasks.md`, the test file is explicitly "skippable until a test runner is configured". Test-contract obligation met via traceability table + structural guarantee; no executable tests are required.
- C5: [x] Security clean — 0 vulnerabilities >= high; no secrets found. Gate green.
- C6: [x] Design gate passed (21 advisory tells, none block-severity). Hook file (`use-mobile.ts`) is not a UI file; no new UI surface was introduced by this change.
- C7: [x] Traceability gate green — every requirement R1–R10 maps to a task in `tasks.md`; the traceability table is complete and coherent.
- C8: [x] Spec respected. Implementation does exactly what requirements.md prescribes: `useSyncExternalStore`, module-level `mql` singleton, `getServerSnapshot → false`, subscribe cleanup, `MOBILE_BREAKPOINT = 768`, query `"(max-width: 767px)"`, `useIsMobile(): boolean`. No extra behavior introduced; no consumer modified (R10 holds: `git diff HEAD -- src/` produces empty output for all files except `use-mobile.ts`).
- C9: [x] `progress/history.md` is append-only and current (entries for harness, error-boundaries, friendly-error-messages). `current.md` still shows feature in progress (awaiting APPROVED before done). No stray artifacts observed.

## Judgment (Four R's)

Audit of the implementer's self-review claims against the diff.

### Risk

Implementer claims: blast radius is wide (17 consumers + sidebar) but the change is reversible and behavior-preserving; public signature, breakpoint constant, and query string are byte-for-byte identical; no drive-by edits; no reversibility artifact needed because the public contract is unchanged (not changed/removed).

Diff confirms: the exported symbol `useIsMobile` retains the same name and module path (`src/hooks/use-mobile.ts`). The return type moved from the implicit `boolean` (old `!!isMobile`) to an explicit annotation `useIsMobile(): boolean` — this is an additive type narrowing, not a breaking change; all 17 call sites consume the result as a plain boolean and compile without modification (`npm run typecheck` exit 0). `MOBILE_BREAKPOINT` and the query string are unchanged. No files outside `src/hooks/use-mobile.ts` were modified in the feature scope (`git diff HEAD -- src/` returns empty for all other files). No reversibility artifact is required because no public contract was broken or removed, which the doc permits.

Finding: the implementer's Risk claim is accurate. [advisory] The module-level singleton `mql` is initialized at import time, which means test isolation in a future unit-test suite will require careful mocking (re-import or mock before import). This is noted for when a test runner is wired up; it is not a block today since no test runner exists.

### Readability

Implementer claims: names match the `useSyncExternalStore` canonical roles; two non-obvious decisions have inline comments; no dead code remains.

Diff confirms: `subscribe`, `getSnapshot`, `getServerSnapshot` are exactly the parameter names React's API expects, so a reader immediately maps them. Two comments are present: one explains the module-level singleton (`null` on server, SSR branch covers it) and one explains the server snapshot stability invariant. Old `useState`/`useEffect` body was fully removed — no dead code visible. The template literal `(max-width: ${MOBILE_BREAKPOINT - 1}px)` is self-documenting via the named constant.

Finding: Readability claim is accurate. No block or advisory findings.

### Reliability

Implementer claims: correct for all in-contract inputs (R1–R4); off-by-one boundary preserved at 767px; return is always concrete `boolean`.

Diff confirms:
- Server/SSR (R1): `getServerSnapshot` returns the literal `false` — no branch, no browser API access. Correct.
- Client, mobile (R2): `getSnapshot` returns `mql.matches`, which is `true` when query `(max-width: 767px)` matches (i.e., width < 768px). Correct.
- Client, desktop (R3): same path returns `mql.matches = false` when width >= 768px. Correct.
- Reactivity (R4): `subscribe` calls `mql.addEventListener("change", callback)` with the React-provided callback; `useSyncExternalStore` calls `getSnapshot` after the event fires, so the re-render carries the fresh `mql.matches`. Correct.
- Off-by-one (R7): query is `(max-width: ${MOBILE_BREAKPOINT - 1}px)` = `(max-width: 767px)`. Boundary behavior is identical to the old implementation (which used `window.innerWidth < MOBILE_BREAKPOINT = 768`). Note: the old implementation read `window.innerWidth` while the new one reads `mql.matches`. These are semantically equivalent (matchMedia `max-width` = `<=` in CSS; `innerWidth < 768` is width in [0,767]). Correct.
- Return type (R6): signature `useIsMobile(): boolean`; `getSnapshot` and `getServerSnapshot` both return `boolean`; `useSyncExternalStore` propagates the same type. TypeScript confirms. Correct.

Finding: Reliability claim is accurate. No block or advisory findings.

### Resilience

Implementer claims: R5 listener cleanup = no leak; R8 server snapshot = no hydration mismatch; null-mql guard prevents crashes under SSR.

Diff confirms:
- Cleanup (R5): `subscribe` returns `() => mql.removeEventListener("change", callback)`. React calls this closure on unmount and on re-subscribe. The `callback` reference is the one React passed in, so it matches the one that was added. No leak. Correct.
- SSR guard (null mql): `if (!mql) return () => {}` in `subscribe` — safe no-op cleanup. `getSnapshot` returns `mql ? mql.matches : false` — safe fallback. `getServerSnapshot` does not reference `mql` at all. All three paths handle `mql === null` without throwing. Correct.
- Hydration consistency (R8): server renders with `getServerSnapshot() = false`; first client render calls `getSnapshot()` which returns `mql.matches`. On a mobile device `mql.matches = true` — this differs from the server value of `false`. This is the intended behavior: `useSyncExternalStore` is designed to allow a client snapshot that differs from the server snapshot; React handles this by scheduling a synchronous re-render after hydration (no hydration mismatch error, no discarded server tree). The implementer's claim ("no hydration mismatch") is accurate in the React sense: React does not throw a warning because `getServerSnapshot` exists and provides the stable server value. The resulting behavior is a single post-hydration correction render (not the old two-render flip). Correct.

Finding: Resilience claim is accurate. No block or advisory findings.

## Changes required

None.
