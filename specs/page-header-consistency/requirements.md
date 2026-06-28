# Requirements — page-header-consistency

> EARS notation. Every requirement is numbered and objectively verifiable.
> This feature is presentational (pure JSX restructuring). The project has no
> test runner (`"test": null` in package.json). Verification relies on
> `npm run typecheck`, `npm run lint`, and the leader's visual preview.

## R1 — Account page uses DashboardPageHeader

WHEN the account page (`src/app/dashboard/account/page.tsx`) is rendered,
the system SHALL display a `<DashboardPageHeader>` with
`eyebrow="Perfil"`, `title="Cuenta"`, and
`description="Información básica de tu perfil."` (accent-corrected),
replacing the bare `<h3>` + `<p>` at lines 19–20. The existing `<Card>` and
`<ChangePasswordCard>` content below the header SHALL remain unchanged. No
`stats` or `actions` props SHALL be passed.

## R2 — Settings unauthorized branch uses DashboardPageHeader

WHEN `SettingsPage` is rendered AND the current user does NOT have
`PERMISSIONS.settingsManage`, the system SHALL display a
`<DashboardPageHeader>` with `eyebrow="Ajustes"`,
`title="Configuraciones Generales"`, and
`description="No tienes permisos para acceder a esta sección."`,
replacing the bare `<h3>` + `<p>` at lines 139–143. No `stats` or
`actions` props SHALL be passed.

## R3 — Settings authorized (loaded) branch uses DashboardPageHeader

WHEN `SettingsPage` is rendered AND the current user has
`PERMISSIONS.settingsManage`, the system SHALL display a
`<DashboardPageHeader>` with `eyebrow="Ajustes"`,
`title="Configuraciones Generales"`, and
`description="Gestiona toda la configuración de tu cuenta y preferencias del sistema."` (accent-corrected),
replacing the bare `<h3>` + `<span>` at lines 151–154. No `stats` or
`actions` props SHALL be passed (the save button remains inside the `<form>`
because lifting it into `actions` would require extracting the submit
handler out of its form context, which is disproportionate for a
presentational change).

## R4 — In-form section headings in settings are not modified

WHEN `SettingsPage` is rendered, the system SHALL preserve the four
`<h3 className="text-lg font-semibold">` section headings inside the form
(NCF range, CF range, invoice percentages, transfer commissions) exactly as
they are. No `DashboardPageHeader` SHALL wrap them.

## R5 — Expense-types page uses DashboardPageHeader with stat and action

WHEN `ExpenseTypesPage` is rendered, the system SHALL display a
`<DashboardPageHeader>` with `eyebrow="Parámetros"`,
`title="Tipos de gastos"`,
`description="Gestiona las categorías de gastos."`,
one stat (`label="Tipos"`, `value` = `String(expenseTypes.length)`,
`tone="neutral"`), and `actions={<NewExpenseTypeDialog />}`,
replacing the bare `<h3>` + `<span>` at lines 220–222 and moving
`<NewExpenseTypeDialog />` out of the filter toolbar. The filter toolbar row
SHALL be updated to remove the `<NewExpenseTypeDialog />` slot (and its
surrounding grid), keeping only the search `<Input>` and columns
`<DropdownMenu>`.

## R6 — Income-types page uses DashboardPageHeader with stat and action

WHEN `IncomeTypesPage` is rendered, the system SHALL display a
`<DashboardPageHeader>` with `eyebrow="Parámetros"`,
`title="Tipos de ingresos"`,
`description="Gestiona las categorías de ingresos."`,
one stat (`label="Tipos"`, `value` = `String(incomeTypes.length)`,
`tone="neutral"`), and `actions={<NewIncomeTypeDialog />}`,
replacing the bare `<h3>` + `<span>` at lines 220–222 and moving
`<NewIncomeTypeDialog />` out of the filter toolbar. The filter toolbar row
SHALL be updated to remove the `<NewIncomeTypeDialog />` slot (and its
surrounding grid), keeping only the search `<Input>` and columns
`<DropdownMenu>`.

## R7 — DashboardPageHeader component is not modified

WHEN any of the 4 converted pages are implemented, the system SHALL make
zero changes to `src/components/ui/dashboard-page-header.tsx`. Its public
prop types (`eyebrow?`, `title`, `description`, `stats?`, `actions?`,
`className?`) SHALL remain identical.

## R8 — Dashboard home is not modified

WHEN any of the 4 converted pages are implemented, the system SHALL make
zero changes to `src/app/dashboard/page.tsx` or its `DashboardHero`
component.

## R9 — No new runtime dependencies are introduced

WHEN the feature is implemented, the system SHALL not add any new entries to
`package.json` `dependencies` or `devDependencies`.

## R10 — Build-time correctness: typecheck and lint pass

WHEN the implementation is complete, `npm run typecheck` and `npm run lint`
SHALL exit with code 0, with no TypeScript errors and no ESLint errors or
warnings introduced by this feature.
