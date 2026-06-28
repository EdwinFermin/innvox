# Design — page-header-consistency

## Files to touch

| File | Change |
| --- | --- |
| `src/app/dashboard/account/page.tsx` | Replace `<h3>` + `<p>` (lines 19–20) with `<DashboardPageHeader>`; add import; wrap outer div in `dashboard-grid` pattern |
| `src/app/dashboard/settings/page.tsx` | Replace bare `<h3>` + `<p>/<span>` in both the unauthorized branch (lines 139–143) and the authorized branch (lines 151–154) with `<DashboardPageHeader>`; add import |
| `src/app/dashboard/parameters/expense-types/page.tsx` | Add `<DashboardPageHeader>` with stat + `<NewExpenseTypeDialog>` in `actions`; remove `<NewExpenseTypeDialog>` from the filter toolbar; add import |
| `src/app/dashboard/parameters/income-types/page.tsx` | Add `<DashboardPageHeader>` with stat + `<NewIncomeTypeDialog>` in `actions`; remove `<NewIncomeTypeDialog>` from the filter toolbar; add import |

No other files are touched.

## Approach

### account/page.tsx

The page currently wraps its content in `<div className="mx-auto w-full max-w-2xl">`. Replace that wrapper with `<div className="dashboard-grid w-full">` (matching the pattern used in `users/page.tsx`) and insert `<DashboardPageHeader>` as the first child. Remove the `<h3>` and `<p>`. No `stats` or `actions` props.

```tsx
// Before (lines 18–21):
<div className="mx-auto w-full max-w-2xl">
  <h3 className="text-2xl font-semibold">Cuenta</h3>
  <p className="text-sm text-muted-foreground">Informacion basica de tu perfil.</p>

// After:
<div className="dashboard-grid w-full">
  <DashboardPageHeader
    eyebrow="Perfil"
    title="Cuenta"
    description="Información básica de tu perfil."
  />
```

The `<Card>` (profile) and `<ChangePasswordCard>` remain as direct children of the wrapper div.

### settings/page.tsx

Two branches must be converted consistently.

**Unauthorized branch** (lines 137–146):
```tsx
// Before:
<div className="w-full">
  <h3 className="text-2xl font-semibold">Configuraciones Generales</h3>
  <p className="text-sm text-muted-foreground mt-2">
    No tienes permisos para acceder a esta seccion.
  </p>
</div>

// After:
<div className="dashboard-grid w-full">
  <DashboardPageHeader
    eyebrow="Ajustes"
    title="Configuraciones Generales"
    description="No tienes permisos para acceder a esta sección."
  />
</div>
```

**Authorized (loaded) branch** (lines 148–155):
```tsx
// Before:
<div className="flex flex-1 flex-col gap-4 px-4 py-10">
  <div className="mx-auto w-full max-w-3xl">
    <h3 className="text-2xl font-semibold">Configuraciones Generales</h3>
    <span className="text-muted-foreground text-sm">
      Gestiona toda la configuracion de tu cuenta y preferencias del sistema
    </span>
  </div>

// After:
<div className="flex flex-1 flex-col gap-4 px-4 py-10">
  <DashboardPageHeader
    eyebrow="Ajustes"
    title="Configuraciones Generales"
    description="Gestiona toda la configuración de tu cuenta y preferencias del sistema."
  />
```

The inner `<div className="mx-auto w-full max-w-3xl">` wrapper that held the removed heading is deleted; the `<div className="mx-auto h-full w-full max-w-3xl">` that wraps the form (starting at line 157) is kept. The form, its section headings (`text-lg font-semibold`), and the submit button are left exactly as-is. No `stats` or `actions` are passed — the save button is a form submit element tightly coupled to `handleSubmit`; lifting it into the header `actions` slot would require extracting the form's submit handler to a separate callback reference, which is out of scope for a presentational conversion.

### parameters/expense-types/page.tsx and parameters/income-types/page.tsx

These two pages are structurally identical; the same approach applies to both.

```tsx
// Before (lines 218–268):
<div className="w-full">
  <h3 className="text-2xl font-semibold">Tipos de gastos</h3>
  <span className="text-muted-foreground text-sm">
    Gestiona las categorías de gastos
  </span>
  <div className={`grid w-full py-4 mt-2 gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
    <Input ... />
    <div className="grid grid-cols-2 gap-2">
      <DropdownMenu>...</DropdownMenu>
      <NewExpenseTypeDialog />
    </div>
  </div>

// After:
<div className="dashboard-grid w-full">
  <DashboardPageHeader
    eyebrow="Parámetros"
    title="Tipos de gastos"
    description="Gestiona las categorías de gastos."
    stats={[{ label: "Tipos", value: String(expenseTypes.length), tone: "neutral" }]}
    actions={<NewExpenseTypeDialog />}
  />
  <div className="dashboard-panel grid w-full gap-4 p-4 grid-cols-[minmax(0,1fr)_auto]">
    <Input ... />
    <DropdownMenu>...</DropdownMenu>
  </div>
```

**Stat source:** `expenseTypes` (resp. `incomeTypes`) is the array returned by `useExpenseTypes` / `useIncomeTypes` and is already in scope in the component body. `expenseTypes.length` (resp. `incomeTypes.length`) is the total row count in the loaded state; it is `0` during loading (the hook returns an empty array while loading, matching the existing default pattern in the codebase).

**Action button:** `<NewExpenseTypeDialog />` (resp. `<NewIncomeTypeDialog />`) moves from the filter toolbar into the header `actions` slot. The filter toolbar's inner `<div className="grid grid-cols-2 gap-2">` that previously held both the columns dropdown and the create dialog is simplified to a single element or removed if only the columns dropdown remains.

## Signatures / data shapes

No new types, hooks, or exported functions are introduced. The only API used is the existing `DashboardPageHeader` props:

```ts
// Existing, unchanged (src/components/ui/dashboard-page-header.tsx):
type DashboardPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  stats?: Array<{ label: string; value: string; tone?: "neutral" | "positive" | "warning" }>;
  actions?: React.ReactNode;
  className?: string;
};
```

The `stats` values used per page:

| Page | stat.label | stat.value | stat.tone | source |
| --- | --- | --- | --- | --- |
| expense-types | "Tipos" | `String(expenseTypes.length)` | "neutral" | `useExpenseTypes` return array |
| income-types | "Tipos" | `String(incomeTypes.length)` | "neutral" | `useIncomeTypes` return array |

## Rejected alternative

**Retrofit `stats` onto account and settings pages** — rejected because neither page has a natural, meaningful count-level KPI. Account displays the current user's own profile (always one user); settings displays system configuration fields (no countable entity). Adding artificial stats would pad the header without adding information value, working against the "intentional, cohesive" goal that motivates this feature.
