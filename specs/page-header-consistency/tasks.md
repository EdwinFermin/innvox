# Tasks — page-header-consistency

> Discrete tasks that together cover every requirement.
> Note: the project has no test runner (`"test": null` in `package.json`).
> Header conversions are presentational-only changes. Correctness is verified
> by `npm run typecheck` (R10), `npm run lint` (R10), and the leader's visual
> preview of each converted page. There are no unit or integration test files
> to write for this feature.

## Implementation

- [x] T1 — Convert `account/page.tsx`: import `DashboardPageHeader`; replace outer wrapper `div` classNames with `dashboard-grid w-full`; remove `<h3>` + `<p>`; insert `<DashboardPageHeader eyebrow="Perfil" title="Cuenta" description="Información básica de tu perfil." />` (covers: R1, R7, R8, R9)

- [x] T2 — Convert `settings/page.tsx` unauthorized branch: import `DashboardPageHeader`; replace `<h3>` + `<p>` (lines 140–143) with `<DashboardPageHeader eyebrow="Ajustes" title="Configuraciones Generales" description="No tienes permisos para acceder a esta sección." />`; update wrapper div classNames to `dashboard-grid w-full` (covers: R2, R4, R7, R8, R9)

- [x] T3 — Convert `settings/page.tsx` authorized branch: replace `<h3>` + `<span>` (lines 151–154) with `<DashboardPageHeader eyebrow="Ajustes" title="Configuraciones Generales" description="Gestiona toda la configuración de tu cuenta y preferencias del sistema." />`; delete the now-empty inner `<div className="mx-auto w-full max-w-3xl">` wrapper that held the removed heading; leave the form, its four `text-lg font-semibold` section headings, and the submit button unchanged (covers: R3, R4, R7, R8, R9)

- [x] T4 — Convert `parameters/expense-types/page.tsx`: import `DashboardPageHeader`; replace outer `<div className="w-full">` with `<div className="dashboard-grid w-full">`; remove `<h3>` + `<span>`; insert `<DashboardPageHeader eyebrow="Parámetros" title="Tipos de gastos" description="Gestiona las categorías de gastos." stats={[{ label: "Tipos", value: String(expenseTypes.length), tone: "neutral" }]} actions={<NewExpenseTypeDialog />} />`; remove `<NewExpenseTypeDialog />` from the filter toolbar and simplify the toolbar row to a single search `<Input>` + columns `<DropdownMenu>` (covers: R5, R7, R8, R9)

- [x] T5 — Convert `parameters/income-types/page.tsx`: import `DashboardPageHeader`; replace outer `<div className="w-full">` with `<div className="dashboard-grid w-full">`; remove `<h3>` + `<span>`; insert `<DashboardPageHeader eyebrow="Parámetros" title="Tipos de ingresos" description="Gestiona las categorías de ingresos." stats={[{ label: "Tipos", value: String(incomeTypes.length), tone: "neutral" }]} actions={<NewIncomeTypeDialog />} />`; remove `<NewIncomeTypeDialog />` from the filter toolbar and simplify the toolbar row to a single search `<Input>` + columns `<DropdownMenu>` (covers: R6, R7, R8, R9)

## Verify gate

- [x] T6 — Run `npm run typecheck` and confirm exit code 0 with no new errors (covers: R10)
- [x] T7 — Run `npm run lint` and confirm exit code 0 with no new errors or warnings (covers: R10)
- [ ] T8 — Leader visual preview: navigate to `/dashboard/account`, `/dashboard/settings`, `/dashboard/parameters/expense-types`, `/dashboard/parameters/income-types` in the dev server; confirm each page shows the `DashboardPageHeader` gradient hairline, eyebrow badge, title, and description; confirm parameters pages show the stat card and the create dialog button in the header; confirm settings' four in-form section headings are unchanged (covers: R1–R6)

## Close

- [x] T9 — Traceability table written into `progress/impl_page-header-consistency.md`

## Traceability

| Requirement | Task(s) | Verification |
| --- | --- | --- |
| R1 — account uses DashboardPageHeader | T1 | T6, T7, T8 |
| R2 — settings unauthorized branch | T2 | T6, T7, T8 |
| R3 — settings authorized branch | T3 | T6, T7, T8 |
| R4 — in-form headings not modified | T3 | T8 |
| R5 — expense-types header + stat + action | T4 | T6, T7, T8 |
| R6 — income-types header + stat + action | T5 | T6, T7, T8 |
| R7 — DashboardPageHeader not modified | T1–T5 | T6, T7 |
| R8 — dashboard home not modified | T1–T5 | T6, T7 |
| R9 — no new dependencies | T1–T5 | T6 (package.json unchanged) |
| R10 — typecheck + lint pass | T6, T7 | T6, T7 |
