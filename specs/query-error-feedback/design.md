# Design — query-error-feedback

## Files to touch

| File | Change |
| --- | --- |
| `src/app/dashboard/payables/page.tsx` | Destructure `isError`, `error`, `refetch` from `usePayables`; add `isError` branch in the table region; import `ErrorState` and `mapError`. |
| `src/app/dashboard/reports/cuadre-del-dia/page.tsx` | Destructure `isError` and `refetch` from `useBranches`, `useIncomes`, `useExpenses`; derive combined `isError` and `retryAll`; replace the "Movimientos del día" Card with `<ErrorState>` on error; import `ErrorState` and `mapError`. |
| `src/components/dashboard/dashboard-hero.tsx` | Destructure `isError` and `refetch` from all five hooks; derive combined `isError` and first error; render `<ErrorState>` inside the `<Card>` in place of `<CardContent>`; import `ErrorState` and `mapError`. |
| `src/components/dashboard/section-cards.tsx` | Destructure `isError` and `refetch` from all five hooks; derive combined `isError` and first error; render a single `<ErrorState>` in place of the four-card grid; import `ErrorState` and `mapError`. |
| `src/components/dashboard/chart-area-interactive.tsx` | Destructure `isError` and `refetch` from `useInvoices`, `useIncomes`, `useExpenses`; derive combined `isError` and first error; render `<ErrorState>` inside the `<Card>` in place of chart content; import `ErrorState` and `mapError`. |
| `src/components/dashboard/business-widgets.tsx` | Destructure `isError` and `refetch` from all eight hooks; derive combined `isError` and first error; render a single `<ErrorState>` in place of the widgets grid; import `ErrorState` and `mapError`. |

No hook files are modified. No new dependencies are introduced.

## Approach

### Payables page

`usePayables` already spreads the full `useQuery` result, so `isError`, `error`, and `refetch` are available at the call site without any hook changes. Destructure them alongside the existing `data` and `isLoading`:

```tsx
const { data: payables, isLoading, isError, error, refetch } = usePayables(user?.id || "");
```

In the JSX, the table region (the `div.dashboard-table-frame` and everything inside it) is wrapped with a conditional:

```tsx
{isError ? (
  <ErrorState description={mapError(error)} onRetry={refetch} />
) : (
  <div className="dashboard-table-frame">
    ...existing table...
  </div>
)}
```

The `DashboardPageHeader`, search `Input`, and column `DropdownMenu` remain unconditionally rendered above this region.

### Cuadre-del-dia page

`useDailyCloseReport` is a pure `useMemo` derivation hook — it does no fetching and has no `isError`/`refetch`. The three data-fetching hooks are `useBranches`, `useIncomes`, and `useExpenses`. (`useBankAccounts` is also called but its data flows into `useDailyCloseReport` as accounts; its error is covered by the combined check below.)

Destructure `isError` and `refetch` from `useBranches`, `useIncomes`, `useExpenses`, and `useBankAccounts`:

```tsx
const { data: branches, isLoading: isBranchesLoading, isError: isBranchesError, error: branchesError, refetch: refetchBranches } = useBranches(user?.id || "", allowedBranchIds);
const { data: incomes, isLoading: isIncomesLoading, isError: isIncomesError, error: incomesError, refetch: refetchIncomes } = useIncomes(user?.id || "");
const { data: expenses, isLoading: isExpensesLoading, isError: isExpensesError, error: expensesError, refetch: refetchExpenses } = useExpenses(user?.id || "");
```

Derive:

```tsx
const isError = isBranchesError || isIncomesError || isExpensesError;
const firstError = branchesError ?? incomesError ?? expensesError;
const retryAll = () => { refetchBranches(); refetchIncomes(); refetchExpenses(); };
```

Replace the "Movimientos del día" `Card` with `<ErrorState>` when `isError` is true. The page header, filter card, and `PrintContainer` are always rendered.

### Dashboard widgets

All four widgets (`DashboardHero`, `SectionCards`, `ChartAreaInteractive`, `BusinessWidgets`) follow the same pattern:

1. For each `useXxx` call, destructure `isError` and `refetch` in addition to existing fields. The hooks all spread `useQuery`, so these are already present.
2. Derive a combined `isError` with a logical OR across all hooks in the widget.
3. Derive `firstError` as the first non-null error value: `hookAError ?? hookBError ?? ...`.
4. Derive `retryAll` as an arrow function that calls every hook's `refetch()`.
5. Guard the error branch before the loading guard (error wins over loading — React Query marks `isError` only after all retries, so by then `isLoading` is false anyway):

```tsx
if (isError) {
  return (
    <WrapperElement>
      <ErrorState description={mapError(firstError)} onRetry={retryAll} />
    </WrapperElement>
  );
}
if (isLoading) { ... }
```

The wrapper element differs by widget:
- `DashboardHero`: the outer `<Card>` with its gradient classes (same container used for the skeleton).
- `SectionCards`: a plain `<div>` equivalent to what the four-card grid occupies; or the four-card grid `<div className="grid ...">` itself replaced by the `ErrorState`.
- `ChartAreaInteractive`: the outer `<Card>`.
- `BusinessWidgets`: a `<div className="grid grid-cols-1 gap-4">` wrapping a single `<ErrorState>`.

**Widget query-hook inventory (grounded in file reads):**

| Widget | Data-fetching hooks |
| --- | --- |
| `DashboardHero` | `useBankAccounts`, `useIncomes`, `useExpenses`, `useReceivables`, `usePayables` |
| `SectionCards` | `useInvoices`, `useIncomes`, `useExpenses`, `useReceivables`, `usePayables` |
| `ChartAreaInteractive` | `useInvoices`, `useIncomes`, `useExpenses` |
| `BusinessWidgets` | `useBranches`, `useClients`, `useInvoices`, `useIncomes`, `useExpenses`, `useReceivables`, `usePayables`, `useOperatingCostAlerts` |

`useAuthStore` is not a query hook and has no `isError`. `useIsMobile` is a local hook with no fetch. `usePrintDailyClose` (cuadre page) is a print utility with no fetch. None of these require error handling.

## Signatures / data shapes

No new exported functions or types are introduced. The only surface change at each call site is the addition of these destructured fields from existing hooks:

```typescript
// Pattern repeated at each call site (hook already returns these from useQuery spread):
const {
  data: ...,
  isLoading: ...,
  isError: ...,   // added
  error: ...,     // added
  refetch: ...,   // added
} = useXxx(...);
```

`ErrorState` is consumed as-is from `src/components/ui/error-state.tsx` (implemented by `error-boundaries`):

```typescript
<ErrorState
  description={mapError(firstError)}  // string from src/lib/error-messages.ts
  onRetry={retryAll}                   // () => void
  // showHomeLink is NOT passed — this is an inline region, not a boundary
/>
```

## Rejected alternative

**Widget-level error boundary via React `<ErrorBoundary>` wrappers (Option B)** — wrapping each dashboard widget in an error boundary component would catch rendering errors but NOT React Query fetch failures. React Query surfaces fetch errors via `isError`; those never become thrown exceptions in the render tree, so an `<ErrorBoundary>` would silently pass them through. The chosen approach (reading `isError` from the hook directly in the component) is the correct React Query pattern and requires no new wrappers or libraries.
