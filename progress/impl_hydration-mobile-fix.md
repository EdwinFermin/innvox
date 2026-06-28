# Implementation — hydration-mobile-fix

## Summary

Rewrote the internals of `useIsMobile` to use `React.useSyncExternalStore`,
eliminating the `undefined → false → true` state flip the old `useState +
useEffect` implementation produced on mobile viewports after mount. The public
contract is unchanged: `useIsMobile(): boolean`. No consumer required changes.

## Files changed

| File | Change |
|------|--------|
| `src/hooks/use-mobile.ts` | Full internal rewrite to `useSyncExternalStore`; public API unchanged. |
| `specs/hydration-mobile-fix/tasks.md` | Checked off T1–T6. |

No other source file was touched (R10). `package.json` / `package-lock.json`
are unchanged — no new dependencies (R9).

## Key design decisions

- **Why `useSyncExternalStore` removes the flip / CLS.** The old hook seeded
  state with `undefined` (coerced to `false`) and only resolved the real
  viewport match inside a `useEffect` that runs *after* the first paint. On a
  mobile device that meant the first frame rendered the desktop layout, then a
  second render swapped to the mobile layout — a visible `false → true` flip and
  a measurable layout shift in the sidebar and every consuming page.
  `useSyncExternalStore` reads the live `mql.matches` value during the render
  pass itself via `getSnapshot`, so the very first client render after hydration
  already carries the correct value. There is no post-mount state transition, so
  no flip and no CLS.

- **Module-level `MediaQueryList` singleton.** `mql` is created once at module
  evaluation (`typeof window !== "undefined"` guard) rather than per-render or
  per-effect. This guarantees a single subscription target per document and a
  stable object identity, which is what `useSyncExternalStore` relies on for its
  `getSnapshot` / `subscribe` pair. On the server `window` is undefined, so `mql`
  is `null` and the SSR path falls back to `getServerSnapshot`.

- **`getServerSnapshot` returns `false` (R8).** React requires the server
  snapshot and the first client snapshot to be consistent during hydration.
  Returning a constant `false` (no browser API access) gives React a stable
  server value and prevents a hydration mismatch. The mobile/desktop branch is
  resolved entirely on the client via `getSnapshot`.

- **Query string and breakpoint preserved (R7).** `MOBILE_BREAKPOINT = 768` is
  unchanged and the media query is `"(max-width: 767px)"` (`MOBILE_BREAKPOINT - 1`),
  identical to the previous implementation, so the threshold behavior is byte-for-byte
  the same.

- **Explicit `boolean` return type (R6).** The signature is annotated
  `useIsMobile(): boolean`, never `boolean | undefined`. All 17 consumers use the
  value as a plain `boolean`; the project-wide typecheck confirms none needed
  modification.

## Requirement → coverage table

The project has no unit-test runner (`reins.config.json` → `"test": null`; no
Vitest/Jest config). Per the spec's `tasks.md`, the described
`src/hooks/__tests__/use-mobile.test.ts` is "skippable until a test runner is
configured" and was intentionally **not** created (no `npm install`, no new
deps). Coverage below is met by the source contract plus the static gate
(`npx reins verify`, `typecheck`, `lint`).

| Req | What guarantees it | Evidence |
|-----|--------------------|----------|
| R1  | `getServerSnapshot()` returns `false`, no browser API access. | `src/hooks/use-mobile.ts` `getServerSnapshot` |
| R2  | `getSnapshot` returns `mql.matches` when `mql` exists; `true` for width < 768px. | `getSnapshot` reading live `mql.matches` |
| R3  | Same path returns `false` when the query does not match (width ≥ 768px). | `getSnapshot` |
| R4  | `subscribe` attaches a `change` listener; React re-renders with the fresh `getSnapshot`. | `subscribe` + `useSyncExternalStore` |
| R5  | `subscribe` returns a cleanup calling `mql.removeEventListener("change", callback)`. | `subscribe` cleanup closure |
| R6  | Return type annotated `boolean`; project typecheck clean. | `useIsMobile(): boolean`; `npm run typecheck` exit 0 |
| R7  | `MOBILE_BREAKPOINT = 768`, query `"(max-width: 767px)"`. | module constant + `mql` template literal |
| R8  | `getServerSnapshot` returns `false` → consistent SSR/first-client snapshot. | `getServerSnapshot` |
| R9  | No new deps; `package.json`/lock unchanged. | `git diff --stat package.json package-lock.json` empty |
| R10 | Only `src/hooks/use-mobile.ts` (+ tasks checkbox) changed. | git diff scope |

## Self-review (Four R's)

- **Risk** — Blast radius is wide (17 consumers + sidebar), but the change is
  *reversible* and *behavior-preserving*: the public signature, the breakpoint
  constant, and the query string are byte-for-byte identical, so the only
  observable difference is the *removal* of a transient wrong frame. Scope held
  strictly to `src/hooks/use-mobile.ts` (R10) plus checking off tasks — no
  drive-by edits, no signature change, so no reversibility artifact is required.
  Proof is proportionate: the contract is unchanged and the full `npx reins
  verify --changed` tree is green.

- **Readability** — Names match behavior: `subscribe`, `getSnapshot`,
  `getServerSnapshot` are the canonical `useSyncExternalStore` roles. The two
  non-obvious decisions carry their *why* inline: the module-level singleton
  comment explains the `null`-on-server / single-subscription rationale, and the
  `getServerSnapshot` comment explains the stable-snapshot / no-hydration-mismatch
  intent. No dead code or commented-out blocks remain; the old `useState`/
  `useEffect` body was fully removed.

- **Reliability** — Correct for every in-contract input: server render → `false`
  (R1), client width < 768px → `true` (R2), client width ≥ 768px → `false` (R3),
  threshold crossing → live re-render (R4). The off-by-one boundary is preserved
  exactly (`767px` = `MOBILE_BREAKPOINT - 1`), so the 768px edge behaves as
  before. The return is always a concrete `boolean`, never `undefined` (R6) — the
  original "wrong value on first frame" defect is structurally impossible now
  because the value is read during render rather than seeded as `undefined`. No
  unit runner exists to host an executable regression test; the structural
  guarantee plus typecheck stand in for it, as the spec directs.

- **Resilience** — **R5 listener cleanup = no leak:** `subscribe` returns a
  cleanup that calls `mql.removeEventListener("change", callback)` with the exact
  callback reference React passed in; React invokes it on unmount and on
  resubscribe, so no `change` handler accumulates and there is no event-handler
  or memory leak. **R8 server snapshot = no hydration mismatch:** the SSR/`null`-
  `mql` path returns a constant `false` from `getServerSnapshot`, so the server
  HTML and the first client snapshot agree and React does not throw a hydration
  warning or discard the server tree. The `if (!mql) return () => {}` guard makes
  `subscribe` safe to call even when `window` is absent, so a non-browser
  environment cannot crash the hook.

## Final verify output

```
$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  9.0s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  835ms
  ✓ design        2 UI file(s) clean  37ms
  ✓ feature-list  8 feature(s), 1 active, 1 in progress  3ms
  ✓ traceability  every requirement maps to a task  1ms

Result: PASS
```

Supporting gates:
- `npm run typecheck` — exit 0 (return type resolves to `boolean`; all consumers compile).
- `npm run lint` — exit 0.
- `git diff --stat package.json package-lock.json` — empty (no new dependencies).

## Handoff

Ready for review. Not marking `done` — awaiting reviewer `APPROVED`.
