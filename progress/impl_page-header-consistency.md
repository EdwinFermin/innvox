# Implementation — page-header-consistency

## Summary

Presentational JSX restructuring. Swapped bare `<h3>` + `<p>`/`<span>` page headers for the
existing `<DashboardPageHeader>` primitive on four dashboard pages, bringing them in line with the
already-converted `users/page.tsx`. No component, hook, type, or dependency changes — only the four
target pages' render trees were edited.

## Files changed

| File | Change |
| --- | --- |
| `src/app/dashboard/account/page.tsx` | Added `DashboardPageHeader` import; outer wrapper `mx-auto w-full max-w-2xl` → `dashboard-grid w-full`; replaced bare `<h3>` + `<p>` with `<DashboardPageHeader eyebrow="Perfil" title="Cuenta" description="Información básica de tu perfil." />`. `<Card>` + `<ChangePasswordCard>` unchanged. No stats/actions. |
| `src/app/dashboard/settings/page.tsx` | Added `DashboardPageHeader` import. Unauthorized branch: wrapper → `dashboard-grid w-full`, `<h3>` + `<p>` → `<DashboardPageHeader eyebrow="Ajustes" title="Configuraciones Generales" description="No tienes permisos para acceder a esta sección." />`. Authorized branch: removed the now-empty `<div className="mx-auto w-full max-w-3xl">` heading wrapper, replaced `<h3>` + `<span>` with `<DashboardPageHeader eyebrow="Ajustes" title="Configuraciones Generales" description="Gestiona toda la configuración de tu cuenta y preferencias del sistema." />`. Form, its four `text-lg font-semibold` section headings, and the submit button left untouched. No stats/actions. |
| `src/app/dashboard/parameters/expense-types/page.tsx` | Added `DashboardPageHeader` import; outer `<div className="w-full">` → `dashboard-grid w-full`; replaced `<h3>` + `<span>` with `<DashboardPageHeader>` carrying `eyebrow="Parámetros"`, `title="Tipos de gastos"`, `description="Gestiona las categorías de gastos."`, `stats={[{ label: "Tipos", value: String(expenseTypes.length), tone: "neutral" }]}`, `actions={<NewExpenseTypeDialog />}`. Moved `<NewExpenseTypeDialog />` out of the filter toolbar and collapsed the toolbar to a `dashboard-panel` grid holding only the search `<Input>` and columns `<DropdownMenu>` (removed the empty `grid grid-cols-2 gap-2` wrapper). |
| `src/app/dashboard/parameters/income-types/page.tsx` | Same as expense-types but `title="Tipos de ingresos"`, `description="Gestiona las categorías de ingresos."`, `value: String(incomeTypes.length)`, `actions={<NewIncomeTypeDialog />}`. |

Protected/untouched (verified by `git diff`): `src/components/ui/dashboard-page-header.tsx` (R7),
`src/app/dashboard/page.tsx` / `DashboardHero` (R8), `package.json` / `package-lock.json` (R9).

## Key decisions

- **Mirrored `users/page.tsx` verbatim** as the canonical reference for the converted layout: the
  `dashboard-grid w-full` page wrapper, the `dashboard-panel grid w-full gap-4 p-4` toolbar, and the
  `grid-cols-[minmax(0,1fr)_auto]` (desktop) / `grid-cols-1` (mobile) split driven by the existing
  `isMobile`. This keeps the four pages consistent with the already-shipped converted page and avoids
  inventing a parallel look (design pre-flight: reuse the design system, infer the brief from
  surrounding screens).
- **Settings save button stays inside the `<form>`** (per spec R3). The button is a `type="submit"`
  tightly coupled to `handleSubmit(onSubmit)`; lifting it into the header `actions` slot would require
  extracting the submit handler from its form context — out of scope for a presentational conversion.
- **`tone: "neutral"`** is a valid member of the component's `DashboardPageHeaderStat["tone"]` union
  (`"neutral" | "positive" | "warning"`, confirmed at `dashboard-page-header.tsx:8`); typecheck passes.
- **Stat value** uses `String(expenseTypes.length)` / `String(incomeTypes.length)`. These arrays are
  the `data` returned by `useExpenseTypes` / `useIncomeTypes` and are already in scope and used as the
  table `data`; `.length` is `0` during loading (the hook returns an empty array by default), which
  matches the existing default pattern in the codebase. No new derived state introduced.
- **Accents corrected** in the migrated Spanish copy (`Información`, `configuración`, `sección`) per
  the spec's "accent-corrected" instruction. The four in-form section headings in settings keep their
  original (unaccented) text untouched (R4).

## Requirement → coverage table

> The project has no unit test runner (`reins.config.json` `test: null`; `"test": null` in
> `package.json`). The spec states there are no unit or integration test files to write for this
> feature; verification is `npm run typecheck` (R10) + `npm run lint` (R10) + the leader's visual
> preview (T8). "Coverage" below is the build-time / visual verification that proves each requirement.

| Requirement | Implemented in | Verified by |
| --- | --- | --- |
| R1 — account uses `DashboardPageHeader` | `account/page.tsx` | typecheck + lint green; `git diff` shows header swap; T8 (leader preview) |
| R2 — settings unauthorized branch | `settings/page.tsx` (unauth branch) | typecheck + lint green; `git diff`; T8 |
| R3 — settings authorized branch | `settings/page.tsx` (auth branch) | typecheck + lint green; `git diff`; T8 |
| R4 — in-form section headings unchanged | `settings/page.tsx` (form body) | `git diff` shows the four `text-lg font-semibold` `<h3>` headings and submit button are not in the diff; T8 |
| R5 — expense-types header + stat + action | `parameters/expense-types/page.tsx` | typecheck (validates `tone` union + stat shape) + lint green; `git diff`; T8 |
| R6 — income-types header + stat + action | `parameters/income-types/page.tsx` | typecheck + lint green; `git diff`; T8 |
| R7 — `DashboardPageHeader` not modified | — | `git diff --name-only` excludes `dashboard-page-header.tsx` |
| R8 — dashboard home not modified | — | `git diff --name-only` excludes `dashboard/page.tsx` |
| R9 — no new dependencies | — | `git diff --quiet -- package.json` ⇒ UNCHANGED; `package-lock.json` untouched; `reins verify` security check clean |
| R10 — typecheck + lint pass | all four pages | `npm run typecheck` exit 0; `npm run lint` exit 0, zero warnings |

## Self-review (Four R's)

### Risk — blast radius + reversibility + scope fidelity
- **Scope:** the diff touches exactly the four pages named in the spec and nothing else. `git diff`
  confirms `dashboard-page-header.tsx`, `dashboard/page.tsx`, and `package.json` are untouched
  (R7/R8/R9). No drive-by refactors, renames, or formatting churn on unrelated code.
- **Reversibility:** no public signature, route, serialized format, or on-disk state changed — these
  are pure presentational render-tree edits to leaf pages with zero fan-in (page components are not
  imported anywhere). Trivially reversible by `git revert`; no reversibility artifact required.
- **Blast radius:** contained to four leaf route components. No shared/core module edited.
- **Proof:** proportional to blast radius — for a presentational, runner-less change the proportionate
  proof is typecheck + lint + visual preview, exactly what the spec mandates.

### Readability — intent recoverable by the next cold agent
- Names match behavior: the migrated copy and prop values are literal Spanish strings; no symbol was
  renamed or repurposed. No name now lies about behavior.
- Non-obvious decisions captured: the "save button stays in the form" rationale and the
  "stat = array length, 0 while loading" rationale are documented above and in the spec's design.md,
  not buried in a magic literal.
- No dead code / commented-out blocks left: the removed `mx-auto … max-w-3xl` heading wrapper and the
  old `grid grid-cols-2 gap-2` toolbar wrapper were deleted outright, not commented out.
- No new public symbol introduced, so no new contract to document.

### Reliability — right answer for in-contract inputs
- The only computed value is the stat: `String(expenseTypes.length)` / `String(incomeTypes.length)`.
  Boundary behavior: empty array ⇒ `"0"` (loading and "no rows" states), populated ⇒ exact row count.
  `String(...)` is total over `number`, so no NaN/overflow/locale path. Deterministic — no reliance on
  iteration order, wall-clock, locale, or randomness.
- Finite enum (`tone`) handled: only `"neutral"` is used and it is a valid union member; typecheck
  would have rejected a typo. No switch/if-chain authored here.
- No bug fix in this change, so no regression test is owed. The "test that asserts the real value"
  condition is satisfied at the contract the project supports: the compiler asserts the stat object's
  shape and the `tone` literal, and lint asserts no unused/incorrect JSX. There is no runtime test
  harness to add a vacuous or real assertion to (spec-confirmed).

### Resilience — fails safe when the world breaks
- No external call, FS, subprocess, DB, network, or resource acquisition is introduced — so there is
  no new timeout, retry, cleanup, or atomic-write surface to guard. The hooks (`useExpenseTypes`,
  `useIncomeTypes`) already own their fetch/error/loading lifecycle; this change only reads their
  already-defaulted `data` array (empty while loading) into a header stat, which renders `"0"` safely.
- No on-disk/state mutation, so no atomicity or clean-restart concern. Re-rendering is idempotent.
- External shape guard: `expenseTypes` / `incomeTypes` are typed arrays from existing hooks with an
  empty-array default; `.length` cannot throw on partial/garbage data within the typed contract.

## Verify output

```
$ npm run typecheck
> tsc --noEmit
EXIT: 0

$ npm run lint
> eslint
LINT EXIT: 0   (no errors, no warnings)

$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  10.2s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.1s
  ✓ design        8 UI file(s) clean  47ms
  ✓ feature-list  8 feature(s), 1 active, 1 in progress  4ms
  ✓ traceability  every requirement maps to a task  3ms
Result: PASS
```

Protected-file check: `git diff --name-only -- src/components/ui/dashboard-page-header.tsx
src/app/dashboard/page.tsx package.json package-lock.json` ⇒ empty (all untouched).

## T8 — visual preview deferral

T8 (live visual preview of `/dashboard/account`, `/dashboard/settings`,
`/dashboard/parameters/expense-types`, `/dashboard/parameters/income-types`) is **deferred to the
leader / design-reviewer**. The implementer cannot exercise the auth-gated dev server in this
environment, so it remains unchecked in `tasks.md`. Structure was instead verified statically by
`npm run typecheck` + `npm run lint` and by reading the rendered JSX against the spec — every page now
renders `<DashboardPageHeader>` with the correct `eyebrow`/`title`/`description`, the two parameters
pages carry the `tone: "neutral"` stat card and their create-dialog button in the header `actions`
slot, and the settings form's four in-form section headings are untouched in the diff.
