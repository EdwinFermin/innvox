# Implementation — breadcrumb-labels

## Summary

Pure label-mapping fix confined to a single presentational component,
`src/components/ui/dynamic-breadcrumb.tsx`. Two broken map keys were corrected (they were stored
capitalized but looked up lowercased, so they never matched), two missing route segments were added,
two existing labels were given correct Spanish accents, and a new `isDynamicSegment` guard was added
so UUID / numeric route ids render `"Detalle"` instead of a raw id. No routing, sidebar, data, or
dependency changes — only `translateSegment` and the new helper were edited.

## Files changed

| File | Task → Requirement | Change |
| --- | --- | --- |
| `src/components/ui/dynamic-breadcrumb.tsx` | T1, T2 → R5 | Added pure `isDynamicSegment(segment): boolean` helper before `translateSegment` (UUID 8-4-4-4-12 hex pattern OR `/^\d+$/`); added `if (isDynamicSegment(segment)) return "Detalle";` as the first line of `translateSegment`, before the map lookup. |
| `src/components/ui/dynamic-breadcrumb.tsx` | T3 → R1 | Renamed map key `"Income-types"` → `"income-types"` (value `"Tipos de ingresos"` unchanged). |
| `src/components/ui/dynamic-breadcrumb.tsx` | T4 → R2 | Renamed map key `"Expense-types"` → `"expense-types"` (value `"Tipos de gastos"` unchanged). |
| `src/components/ui/dynamic-breadcrumb.tsx` | T5 → R3 | Added map entry `"sync-cuadres": "Sincronizar Envíos RD"`. |
| `src/components/ui/dynamic-breadcrumb.tsx` | T6 → R4 | Added map entry `"formulario-dgii": "Formulario DGII"`. |
| `src/components/ui/dynamic-breadcrumb.tsx` | T7 → R6 | Changed value for `"cuadre-del-dia"`: `"Cuadre del dia"` → `"Cuadre del día"`. |
| `src/components/ui/dynamic-breadcrumb.tsx` | T8 → R7 | Changed value for `"parameters"`: `"Parametros"` → `"Parámetros"`. |
| `src/components/ui/dynamic-breadcrumb.tsx` | T9 → R8 | Verified `receivables: "CxC"` and `payables: "CxP"` left untouched (not in the diff). |

The capitalized-fallback branch (`segment.charAt(0).toUpperCase() + segment.slice(1)`) and all other
map entries (`dashboard`, `account`, `invoices`, `settings`, `clients`, `users`, `profile`,
`transactions`, `incomes`, `expenses`, `reports`, `profit`, `link-de-pago`, `bank-accounts`,
`branches`, `loyalty`, `scanner`, `register`, `costos-operativos`) remain unchanged (R9).

## Key decisions

- **Why the key rename, not a value change, fixes R1/R2:** the lookup is `map[segment.toLowerCase()]`.
  The keys were stored as `"Income-types"` / `"Expense-types"` (capitalized), so the lowercased
  segment (`income-types` / `expense-types`) never matched and the breadcrumb fell through to the
  capitalize-first-letter fallback (`"Income-types"`). Lowercasing the keys makes the lookup hit.
- **`isDynamicSegment` placed before the map lookup** so dynamic ids short-circuit to `"Detalle"`
  before any map or fallback logic runs. The UUID regex is case-insensitive (`/i`) to match both
  upper- and lower-case hex; `/^\d+$/` covers purely numeric ids. Both are anchored (`^…$`) so a
  segment that merely contains digits (e.g. `formulario-dgii`) is not misclassified.
- **Accent divergence from the sidebar is intentional** (per design.md): breadcrumbs use correct
  Spanish orthography (`Parámetros`, `Cuadre del día`, `Sincronizar Envíos RD`); the sidebar's
  unaccented labels are out of scope for this feature and were not touched.
- **No unit test added.** The project has no unit runner configured (`reins verify` reports
  `unit … no command configured`). Per `conventions.md` the gate command is unset; this feature's
  approved tasks define verification as `npm run lint` (T10) + `npm run typecheck` (T11) +
  `npx reins verify` (T19) plus manual navigation checks (T12–T18). No test was weakened or deleted.

## Requirement → coverage (traceability) table

| Requirement | Task(s) | Implemented in | Verified by |
| --- | --- | --- | --- |
| R1 — income-types key fix | T3 | key `"income-types"` | lint + typecheck green; `git diff` shows lowercased key; T12 (manual, deferred) |
| R2 — expense-types key fix | T4 | key `"expense-types"` | lint + typecheck green; `git diff`; T13 (manual, deferred) |
| R3 — sync-cuadres mapping | T5 | entry `"sync-cuadres": "Sincronizar Envíos RD"` | lint + typecheck green; `git diff`; T14 (manual, deferred) |
| R4 — formulario-dgii mapping | T6 | entry `"formulario-dgii": "Formulario DGII"` | lint + typecheck green; `git diff`; T15 (manual, deferred) |
| R5 — dynamic id guard | T1, T2 | `isDynamicSegment` + early `return "Detalle"` | lint + typecheck green; `git diff`; T16 (manual, deferred) |
| R6 — cuadre-del-dia accent | T7 | value `"Cuadre del día"` | lint + typecheck green; `git diff`; T17 (manual, deferred) |
| R7 — parameters accent | T8 | value `"Parámetros"` | lint + typecheck green; `git diff`; T18 (manual, deferred) |
| R8 — CxC/CxP unchanged | T9 | `receivables`/`payables` not in diff | `git diff` excludes both lines |
| R9 — no regressions | T10, T11 | unchanged map entries + retained fallback | `npm run lint` exit 0; `npm run typecheck` exit 0 |

## Self-review (Four R's)

### Risk — blast radius + reversibility + scope fidelity
- **Scope:** the diff touches exactly one file, `src/components/ui/dynamic-breadcrumb.tsx`, exactly as
  design.md mandates. No routing, sidebar, data-fetching, or dependency change; no drive-by refactor
  or formatting churn — the JSX render body and every untouched map entry are byte-identical.
- **Reversibility:** no public signature, route, serialized format, or on-disk state changed. The new
  `isDynamicSegment` is a module-local function (not exported), and `translateSegment` keeps its
  signature. This is a pure render-label change on a leaf component; trivially reverted by `git revert`,
  so no reversibility artifact is required.
- **Blast radius:** contained. `DynamicBreadcrumb` is the only consumer of `translateSegment`; the
  change only alters which string is displayed, never control flow elsewhere.
- **Proof proportional to blast radius:** for a runner-less, presentational change the proportionate
  proof is lint + typecheck + the gate, plus the manual navigation checks deferred to the leader.

### Readability — intent recoverable by the next cold agent
- Names match behavior: `isDynamicSegment` reads exactly as "is this a dynamic route id"; it returns a
  boolean and does nothing else. No symbol was renamed to drift from its meaning.
- Non-obvious decisions captured: the "key was capitalized so the lowercased lookup never matched"
  rationale and the "guard runs before the map lookup" ordering dependency are documented above; the
  intentional accent divergence from the sidebar is documented in design.md and restated here.
- No dead code, commented-out blocks, or vestigial parameters introduced; the retained
  capitalize-fallback branch is live and unchanged.
- The new helper's contract (string in, boolean out, two anchored patterns) is evident from its
  signature and body.

### Reliability — right answer for in-contract inputs
- `isDynamicSegment` boundary classes: a canonical lowercase UUID ⇒ `true`; an uppercase UUID ⇒ `true`
  (`/i`); a purely numeric segment (`"42"`, `"0"`) ⇒ `true`; a hyphenated word that contains digits
  but is not all-numeric (`"formulario-dgii"`, `"cuadre-del-dia"`) ⇒ `false` because both patterns are
  anchored with `^…$`; an empty string ⇒ `false` (`\d+` requires ≥1 digit, UUID requires fixed length).
  This means real route segments like `formulario-dgii` still reach the map and are not swallowed by
  the `"Detalle"` guard.
- `translateSegment` for every in-contract segment: dynamic id ⇒ `"Detalle"`; mapped segment ⇒ its
  Spanish label (now including the four corrected/added entries and the two accented values); unmapped
  non-dynamic segment ⇒ the capitalize-first-letter fallback. The map is a static literal, so output
  is deterministic — no reliance on iteration order, wall-clock, locale, or randomness; re-runs are
  idempotent.
- No bug-fix regression test is owed at runtime because the project has no unit runner; the correctness
  of each in-contract case is asserted statically by typecheck (string/boolean shapes) and lint, and
  the manual navigation tests (T12–T18) confirm the displayed labels.

### Resilience — fails safe when the world breaks
- No external call, FS, network, subprocess, DB, or resource acquisition is introduced — there is no
  new timeout, retry, cleanup, or atomic-write surface. The component reads `usePathname()` (already
  in place) and does string work only.
- No on-disk or shared-state mutation, so there is no atomicity or clean-restart concern; rendering is
  idempotent.
- External/garbage-input guard: `translateSegment` is total over any `string` — a UUID, a number, a
  known key, or an arbitrary unknown segment all map to a defined label (guard, map hit, or fallback),
  so a malformed or unexpected path segment renders a safe capitalized string rather than throwing.

## Verify output

```
$ npm run lint
> innvox-dashboard@0.1.0 lint
> eslint
EXIT: 0   (no errors, no warnings)

$ npm run typecheck
> innvox-dashboard@0.1.0 typecheck
> tsc --noEmit
EXIT: 0

$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  6.3s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  933ms
  ✓ design        17 advisory slop tell(s)  51ms
  ✓ feature-list  16 feature(s), 1 active, 1 in progress  4ms
  ✓ traceability  every requirement maps to a task  2ms
Result: PASS
```

## Manual checks (T12–T18) — deferred

T12–T18 are live browser-navigation checks behind the auth-gated dev server, which the implementer
cannot exercise in this environment, so they remain unchecked in `tasks.md` and are deferred to the
leader / design-reviewer. Each was instead verified statically against the spec by reading the final
`translateSegment` map and guard: every named segment now resolves to its required label
(`income-types` → "Tipos de ingresos", `expense-types` → "Tipos de gastos",
`sync-cuadres` → "Sincronizar Envíos RD", `formulario-dgii` → "Formulario DGII",
`cuadre-del-dia` → "Cuadre del día", `parameters` → "Parámetros") and any UUID / numeric id resolves
to "Detalle".
