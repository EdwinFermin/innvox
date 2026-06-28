# Review — breadcrumb-labels
Verdict: APPROVED

## Checkpoints

- C1: [x] Harness intact. All base files present (`.claude/agents/*`, `docs/*`, `feature_list.json`, `progress/`). `reins verify` PASS confirms harness is coherent.
- C2: [x] Coherent state. One feature `in_progress` (`breadcrumb-labels`); all states valid. `feature-list` gate green.
- C3: [x] Lint clean. `npm run lint` exits 0. Confirmed by `reins verify` lint gate (6.4 s, no errors, no warnings).
- C4: [x] No unit runner configured (`test: null` in `reins.config.json`). The `unit` gate emits `∘ no command configured` and does not fail. Per the project's established test contract (documented in `progress/current.md` and consistent with all prior reviews), the test obligation for a runner-less project is satisfied by the traceability table + green `npx reins verify`. No test was weakened or deleted.
- C5: [x] Security clean. No vulnerabilities >= high; no secrets found. No new npm dependencies introduced — `package.json` was not touched.
- C6: [x] Design scan passes at block severity (`failOn: "block"`). 21 advisory tells, all pre-existing (same count as previous features). Zero tells attributable to `dynamic-breadcrumb.tsx` — the diff adds no JSX, no Tailwind classes, and no UI rendering changes; it only modifies string values inside a lookup map.
- C7: [x] Traceability gate green. Every requirement R1–R9 maps to at least one task in `specs/breadcrumb-labels/tasks.md`. `npx reins verify --only traceability` PASS.
- C8: [x] Spec respected. Implementation matches `specs/breadcrumb-labels/design.md` exactly: `isDynamicSegment` helper added before `translateSegment` (design.md §1), map corrected and extended (design.md §2), dynamic-segment guard runs as the first line of `translateSegment` before the map lookup (design.md §3). No routing, sidebar, data-fetching, or dependency changes. All six broken/missing entries are fixed; two accent values corrected; `receivables`/`payables` left untouched. The capitalized-fallback branch is retained unchanged. No drive-by changes to any other map entry.
- C9: [x] `progress/history.md` is an append-only log; no past entries were rewritten. Note: the breadcrumb-labels session entry has not yet been appended to `history.md` (the log ends at the prior autopilot run). This is the same advisory condition observed in previous reviews; it is a leader/close-session task, not a block.

## Judgment (Four R's)

Audit of the implementer's self-review (`progress/impl_breadcrumb-labels.md` §Self-review) against the diff.

### Risk

Implementer claims: one file touched (`dynamic-breadcrumb.tsx`); no public signature, route, serialized format, or on-disk state changed; `isDynamicSegment` is module-local (not exported); `DynamicBreadcrumb` export keeps its signature; trivially reverted with `git revert`; no reversibility artifact required.

Verified against diff:

`git diff HEAD --name-only` shows 17 modified files in the working tree, but these are all from the previous autopilot run (8 features committed to working tree before the breadcrumb-labels session began). The diff for `dynamic-breadcrumb.tsx` is the only change attributable to this feature, matching `progress/impl_breadcrumb-labels.md §Files changed`. The design spec (`specs/breadcrumb-labels/design.md:9`) explicitly confirms only `dynamic-breadcrumb.tsx` should be touched — confirmed.

No export added or removed; `translateSegment` and `DynamicBreadcrumb` keep their existing signatures. `isDynamicSegment` is module-private (no `export` keyword). Blast radius is genuinely narrow: the only observable effect is which string is rendered in the breadcrumb trail.

No append-only history was rewritten. [clean]

### Readability

Implementer claims: `isDynamicSegment` name matches behavior; ordering dependency (guard-before-map) is documented; accent divergence from sidebar is documented in design.md; no dead code or vestigial parameters introduced.

Verified against diff:

- `dynamic-breadcrumb.tsx:15–20`: `isDynamicSegment` is a pure predicate — name exactly matches behavior. The two anchored regex constants are clearly named `uuidPattern` / `numericPattern` with no magic left unexplained. [clean]
- `dynamic-breadcrumb.tsx:23`: the guard-first ordering dependency (short-circuit before map lookup) is called out in `progress/impl_breadcrumb-labels.md §Key decisions` ("isDynamicSegment placed before the map lookup"). [clean]
- The intentional accent divergence from `app-sidebar.tsx` is explained in `specs/breadcrumb-labels/design.md §Accent normalization note` and restated in the impl report. [clean]
- No dead code, commented-out blocks, or vestigial parameters in the diff. All retained map entries and the capitalize-fallback branch are live. [clean]

### Reliability

Implementer claims: `isDynamicSegment` is correct for all boundary classes; `translateSegment` is total over any string input; map is a static literal (no locale/iteration-order/randomness dependency); re-runs are idempotent.

Verified against diff and live regex test:

The exact regex literals from `dynamic-breadcrumb.tsx:16–18` were extracted and exercised in Node.js against nine boundary cases:
- canonical lowercase UUID → `true` (R5 satisfied)
- uppercase UUID → `true` (`/i` flag, R5 satisfied)
- `"42"` and `"0"` (purely numeric) → `true` (R5 satisfied)
- `"income-types"`, `"formulario-dgii"`, `"cuadre-del-dia"` (hyphenated strings with digits) → `false` (anchoring prevents false-positive, routes reach the map correctly)
- empty string → `false` (`\d+` requires ≥1 digit, UUID requires fixed 32-hex length)
- `"abc123"` (alphanumeric, not all-numeric) → `false`
All nine cases pass. The anchoring claim in the impl report is verified correct.

Map values confirmed exact against requirements (accent check via `grep -P`):
- `"cuadre-del-dia"` → `"Cuadre del día"` (accent on `í`) [R6 satisfied]
- `parameters` → `"Parámetros"` (accent on `á`) [R7 satisfied]
- `"sync-cuadres"` → `"Sincronizar Envíos RD"` (accent on `í`) [R3 satisfied]
- `"income-types"` / `"expense-types"` keys are lowercase, matching the `segment.toLowerCase()` lookup [R1, R2 satisfied]
- `receivables: "CxC"` and `payables: "CxP"` present and unchanged [R8 satisfied]

The map is a static object literal — output is deterministic and idempotent. [clean]

One advisory observation: R9 ("no regressions on existing mappings") has no automated regression assertion — its coverage rests on `npm run lint` + `npm run typecheck` plus static inspection of the unchanged map entries. This is consistent with every prior feature in this project and with the runner-less contract. [advisory]

### Resilience

Implementer claims: no external call, FS, network, subprocess, DB, or resource acquisition introduced; `translateSegment` is total over any string; rendering is idempotent.

Verified against diff: confirmed. The diff adds one pure function and modifies a static lookup map. No I/O, no async, no lock, no resource handle. The component already consumed `usePathname()` (unchanged). `translateSegment` handles every possible string input through guard → map-hit → capitalize-fallback, so a malformed or unexpected segment renders a safe string rather than throwing. No Resilience findings. [clean]

## Changes required

None. All block-severity gates pass; all Four R's findings are clean or advisory.

Advisory (non-blocking):
1. [advisory] `progress/history.md` has not yet been appended with an entry for the breadcrumb-labels session. This is a close-session task for the leader, consistent with the advisory note in prior reviews (`review_error-boundaries.md:C9`).
2. [advisory] R9 (no regressions) has no automated test coverage — correctness of unchanged map entries is asserted only by static inspection and lint/typecheck. This is the established project-wide contract given the absence of a unit runner; no action required unless a unit runner is added in a future feature.
