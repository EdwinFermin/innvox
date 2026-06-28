# Design — dashboard-focus

## Before / After composition

### Before (`home-content.tsx` lines 22–34)

```
DashboardHero
OperatingCostAlertsBanner
SectionCards           ← removed
ChartAreaInteractive
BusinessWidgets
```

### After

```
DashboardHero          ← saldos + month KPIs (Facturación, Ingresos, Gastos) + trend badges
OperatingCostAlertsBanner
ChartAreaInteractive
BusinessWidgets        ← Actividad reciente + Pulso por sucursal only
```

## Files to touch

| File | Change |
| --- | --- |
| `src/components/dashboard/home-content.tsx` | Remove `SectionCards` import (line 9) and JSX (line 27); reorder `ChartAreaInteractive` before `BusinessWidgets` (currently chart is already before widgets — verify exact JSX ordering matches the new target). |
| `src/components/dashboard/dashboard-hero.tsx` | Drop `useReceivables` + `usePayables` imports and calls (lines 15–16, 56–68, 84–89, 95–106, 114–119, 128); add `useInvoices` import and call; replace the three-box KPI row (lines 193–214) with Facturación del mes / Ingresos / Gastos; add trend badges for Facturación and Flujo neto; remove the right-column payables panel (lines 217–254); add a `computeTrend` helper (see data shapes). |
| `src/components/dashboard/section-cards.tsx` | **Delete entire file.** |
| `src/components/dashboard/business-widgets.tsx` | Remove `useReceivables` import (line 34), `usePayables` import (line 33), `useOperatingCostAlerts` import (line 32); remove their hook calls (lines 119–133); remove derived state that feeds only the removed sub-card (`receivablesPending`, `payablesPending`, `receivablesPendingTotal`, `payablesPendingTotal`, `pendingOperatingCostAlerts`, `alerts`, `getDaysUntil`); remove the "Pendientes y alertas" Card JSX block (lines 393–452 including its grid wrapper adjustment); update `isError`, `firstError`, `retryAll`, and `isLoading` guards to no longer reference the removed hooks; remove unused imports (`CircleAlert` from lucide is still used in Pulso footer — keep it; `ArrowDownLeft`, `ArrowUpRight` are used in Actividad reciente — keep them). Verify `parseDateOnly` is no longer needed after removing `getDaysUntil` and remove if so. |
| `src/components/dashboard/dashboard-loading.tsx` | Remove `DashboardKpiCardsSkeleton` export (lines 4–22); remove its call inside `DashboardHomeLoading` (line 74). Update `DashboardHomeLoading` to omit the KPI skeleton row. Keep `DashboardChartSkeleton` and `DashboardWidgetsSkeleton` and `DashboardHomeLoading`. |

## Approach

### 1. Trend helper — `computeTrend`

Place a module-level helper in `dashboard-hero.tsx` (no new file needed — it is small and used only there).

```ts
type TrendResult =
  | { kind: "percent"; value: number }  // previous > 0 → signed %, 1 decimal
  | { kind: "new" }                     // previous === 0 && actual > 0
  | { kind: "none" };                   // previous === 0 && actual === 0

function computeTrend(actual: number, previous: number): TrendResult {
  if (previous > 0) {
    return {
      kind: "percent",
      value: Number((((actual - previous) / previous) * 100).toFixed(1)),
    };
  }
  if (actual > 0) {
    return { kind: "new" };
  }
  return { kind: "none" };
}
```

Rendering rule (inline in JSX):

- `kind === "percent"` → `<Badge>…{value > 0 ? "+" : ""}{value}%</Badge>`
- `kind === "new"` → `<Badge>Nuevo</Badge>`
- `kind === "none"` → render nothing

### 2. Month / previous-month key computation

Mirror the logic from `section-cards.tsx` lines 88–91, which already exists and is correct:

```ts
const currentMonthKey = getTodayDateKey().slice(0, 7);
const [currentYear, currentMonth] = currentMonthKey.split("-").map(Number);
const previousMonthDate = new Date(currentYear, currentMonth - 2, 1);
const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;
```

This will be added to `dashboard-hero.tsx`.

### 3. Hero KPI row — new three boxes

Replace lines 193–214 of `dashboard-hero.tsx` (the current `sm:grid-cols-3` grid containing Ingresos / Gastos / Pendiente neto) with:

| Box | Label | Value | Trend badge |
| --- | --- | --- | --- |
| 1 | Facturación del mes | `totals.facturacionMes` | `computeTrend(facturacionMes, facturacionPrev)` |
| 2 | Ingresos | `totals.monthIncome` | none |
| 3 | Gastos | `totals.monthExpense` | none |

Flujo neto stays in the pill at line 189 (unchanged text, no visual change to pill). Add trend badge for flujo neto pill using `computeTrend(totals.netFlow, prevNetFlow)`.

### 4. Hero right-column restructure

Remove the entire right-column `<div>` (lines 217–254) which contained "Presion operativa" panel and "Por cobrar / Por pagar" boxes. Keep only the CTA buttons. The CTA buttons (currently inside that panel at lines 232–238) must survive — move them into a standalone card or inline block that remains in the right column. The heading/description copy of the actions card is implementer's choice, but no cobros/pagos data may appear.

### 5. Hero data hook changes

Hooks removed from `dashboard-hero.tsx`:
- `useReceivables` (currently lines 55–61, feeding `receivablePending`)
- `usePayables` (currently lines 62–68, feeding `payablePending`)

Hook added:
- `useInvoices(userId)` — same pattern as existing hooks; returns `{ data: invoices, isLoading, isError, error, refetch }`

Updated `isLoading` guard (remove `receivablesLoading`, `payablesLoading`; add `invoicesLoading`):
```ts
const isLoading =
  !userId ||
  bankAccountsLoading ||
  incomesLoading ||
  expensesLoading ||
  invoicesLoading;
```

Updated `isError` guard (remove `receivablesError`, `payablesError`; add `invoicesError`):
```ts
const isError =
  bankAccountsError ||
  incomesError ||
  expensesError ||
  invoicesError;
```

Updated `retryAll` (remove `refetchReceivables`, `refetchPayables`; add `refetchInvoices`).

### 6. Hero `totals` useMemo update

Remove `receivablePending` and `payablePending` from the memo. Add `facturacionMes` and `facturacionPrev`:

```ts
const totals = React.useMemo(() => {
  const balance = bankAccounts.reduce(...);
  const monthIncome = /* same as before */;
  const monthExpense = /* same as before */;
  const facturacionMes = invoices.reduce((acc, inv) =>
    getTimestampMonthKey(inv.created_at) === currentMonthKey
      ? acc + Number(inv.amount || 0)
      : acc, 0);
  const facturacionPrev = invoices.reduce((acc, inv) =>
    getTimestampMonthKey(inv.created_at) === previousMonthKey
      ? acc + Number(inv.amount || 0)
      : acc, 0);
  const prevNetFlow = /* incomes prev month - expenses prev month, computed inline */;
  return {
    balance,
    monthIncome,
    monthExpense,
    netFlow: monthIncome - monthExpense,
    facturacionMes,
    facturacionPrev,
    prevNetFlow,
  };
}, [bankAccounts, currentMonthKey, previousMonthKey, expenses, incomes, invoices]);
```

### 7. business-widgets.tsx hook pruning

The three hooks being removed feed **exclusively** the "Pendientes y alertas" sub-card:

- `useReceivables` → `receivablesPending`, `receivablesPendingTotal`, `alerts` items (cobros) — all inside the removed sub-card or its footer.
- `usePayables` → `payablesPending`, `payablesPendingTotal`, `alerts` items (pagos) — same.
- `useOperatingCostAlerts` → `pendingOperatingCostAlerts`, `alerts` items (costos) — same.

`recentActivity` (lines 238–269) consumes only `invoices`, `incomes`, `expenses` — unaffected.
`branchPerformance` (lines 137–169) consumes only `branches`, `incomes`, `expenses` — unaffected.
`monthInvoices` / `averageTicket` (lines 189–196) consume only `invoices` — unaffected.

`getDaysUntil` (lines 59–71) is only referenced inside the `alerts` memo (line 212, 219) — remove it.
`parseDateOnly` import (line 36) is only used inside `getDaysUntil` — remove it.

After removal, `isLoading` / `isError` / `firstError` / `retryAll` in `business-widgets.tsx` drop references to `receivables*`, `payables*`, `operatingCostAlerts*`.

`DashboardWidgetsSkeleton` in `dashboard-loading.tsx` is used by `business-widgets.tsx` line 327 — keep it unchanged.

### 8. dashboard-loading.tsx cleanup

`DashboardKpiCardsSkeleton` (lines 4–22) is referenced in:
- `section-cards.tsx:216` — deleted along with that file.
- `dashboard-loading.tsx:74` (inside `DashboardHomeLoading`) — remove this call and the `DashboardKpiCardsSkeleton` component definition.

After removal `DashboardHomeLoading` no longer renders a KPI skeleton row. Its remaining content (chart skeleton + widgets skeleton) stays intact.

## Signatures / data shapes

```ts
// New helper inside dashboard-hero.tsx (module-level, not exported)
type TrendResult =
  | { kind: "percent"; value: number }
  | { kind: "new" }
  | { kind: "none" };

function computeTrend(actual: number, previous: number): TrendResult

// Updated totals shape inside DashboardHero useMemo
{
  balance: number;
  monthIncome: number;
  monthExpense: number;
  netFlow: number;
  facturacionMes: number;
  facturacionPrev: number;
  prevNetFlow: number;
}
// Removed from totals: receivablePending, payablePending
```

## Rejected alternative

**Option B — keep a slim two-card KPI row (SectionCards reduced to Facturación + Flujo neto, hero = saldos only)** — rejected because the human explicitly chose Option A (consolidate into the hero, drop SectionCards entirely). Keeping SectionCards adds a second KPI surface, contradicting the "simplificar fuerte" goal and leaving a vestigial component with its own hook set that duplicates the hero's data.
