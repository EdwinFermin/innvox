# Discovery — page-header-consistency

## Request

Make every page use the shared `DashboardPageHeader` with a consistent eyebrow/title/description rhythm, fixing the pages that still use a bare `<h3>`. Drives the "intentional, cohesive" feel.

## Findings

- `src/components/ui/dashboard-page-header.tsx` is the standard: `eyebrow?` (Badge), `title`, `description`, `stats?` (toned mini-cards), `actions?` slot. It renders the `dashboard-panel` section with a top gradient hairline — the established page-header look.
- **18 of 23 dashboard pages already use it** (payables, receivables, clients, invoices, users, branches, bank-accounts, transactions/*, reports/*, loyalty/*, link-de-pago, costos-operativos, sync-cuadres).
- **4 pages deviate** with a bare `<h3 className="text-2xl font-semibold">` + `<p>`:
  - `src/app/dashboard/account/page.tsx:19-20` → "Cuenta" / "Informacion basica de tu perfil."
  - `src/app/dashboard/settings/page.tsx:140` (and a duplicate at :151, likely a loading vs loaded branch) → "Configuraciones Generales". Note: the `text-lg font-semibold` headings inside settings (lines 161, 211, 261, 338) are **section/card titles within the form**, not page headers — leave them.
  - `src/app/dashboard/parameters/expense-types/page.tsx:220` → "Tipos de gastos".
  - `src/app/dashboard/parameters/income-types/page.tsx:220` → "Tipos de ingresos".
- `src/app/dashboard/page.tsx` (home) intentionally uses `DashboardHero` (no `DashboardPageHeader`) — out of scope, leave as-is.
- Minor: a couple of the existing-but-bare titles have un-accented copy ("Informacion", "basica") — opportunity to fix while converting.

## Affected areas

- Convert 4 pages to `DashboardPageHeader`: `account`, `settings`, `parameters/expense-types`, `parameters/income-types`.
- For each, preserve any existing top-of-page action button by moving it into the header `actions` slot (the parameters pages have create buttons / the settings page a save button — to confirm during authoring).

## Approaches considered

- **Option A — Convert the 4 outliers to `DashboardPageHeader`, no component change.** Add eyebrow + title + description; move existing top action buttons into `actions`; leave in-form section headings alone. *Leaning toward this — small, surgical, achieves full parity.*
- **Option B — Also retrofit stats into each header.** Richer, but stats aren't always meaningful (account/settings have no natural KPI) and risks padding — only add stats where a natural metric exists.

Leaning toward: **Option A** (eyebrow + description always; stats only where natural).

## Open questions ← a human must answer these

1. **Scope confirmation:** Convert exactly these 4 pages (account, settings, parameters/expense-types, parameters/income-types) and leave dashboard home (`DashboardHero`) untouched — correct?
2. **Depth:** Add an `eyebrow` + `description` to each for parity (no forced stats), or keep them title+description only? Should I add `stats` where a natural count exists (e.g. parameters pages → "N tipos")?
3. **Copy/eyebrows:** OK to set eyebrows like "Perfil" (account), "Ajustes" (settings), "Parámetros" (parameters), and fix the missing accents in the existing descriptions?

## Assumptions

- No change to `DashboardPageHeader` itself.
- Existing top action buttons move into the header `actions` slot; in-card/section headings stay as-is.
- Settings' duplicate header (loading vs loaded branch) both get converted consistently.

## Resolution ← filled in after the human answers

- Q1 (scope) → **The 4 outliers**: account, settings, parameters/expense-types, parameters/income-types. Dashboard home (`DashboardHero`) untouched.
- Q2 (depth) → **Eyebrow + description** on each for parity. Add `stats` only where a natural count exists (parameters pages → e.g. "N tipos"); account/settings get no forced stats. Move existing top-of-page action buttons into the header `actions` slot. Fix the missing accents in existing copy.
- Q3 (copy) → Eyebrows accepted: "Perfil" (account), "Ajustes" (settings), "Parámetros" (parameters/*). Fix accents (e.g. "Información básica de tu perfil.").
- Decision: **Option A** — convert the 4 pages to `DashboardPageHeader` (eyebrow + title + description; stats where natural; existing actions into `actions`). No change to `DashboardPageHeader` itself; in-card/section headings stay; settings' loading+loaded header branches both converted.
