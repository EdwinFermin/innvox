# Requirements — query-error-feedback

> EARS notation. Every requirement is numbered and objectively verifiable. Each must be covered by at least one test.

## R1

WHEN the `usePayables` hook returns `isError === true` on the payables page (`src/app/dashboard/payables/page.tsx`), the system SHALL replace the table region (the `div.dashboard-table-frame` element and its contents) with an `<ErrorState>` component whose `description` prop is the string returned by `mapError(error)` and whose `onRetry` prop is the `refetch` function from the hook.

## R2

WHEN the `usePayables` hook returns `isError === true` on the payables page, the system SHALL keep the `DashboardPageHeader`, the search `Input`, and the column-visibility `DropdownMenu` rendered and visible above the error region.

## R3

WHEN the `usePayables` hook returns `isError === true` on the payables page, the system SHALL NOT pass `showHomeLink` to `<ErrorState>` (it must be absent or `false`).

## R4

WHEN any of `useBranches`, `useIncomes`, or `useExpenses` returns `isError === true` on the cuadre-del-dia page (`src/app/dashboard/reports/cuadre-del-dia/page.tsx`), the system SHALL replace the `Card` containing the "Movimientos del día" table with an `<ErrorState>` component whose `description` is `mapError` applied to the first truthy `error` value among the three hooks, and whose `onRetry` calls `refetch` on all three hooks.

## R5

WHEN any of `useBranches`, `useIncomes`, or `useExpenses` returns `isError === true` on the cuadre-del-dia page, the system SHALL keep the `DashboardPageHeader`, the date/sucursal filter `Card`, and the `PrintContainer` rendered.

## R6

WHEN any of `useBranches`, `useIncomes`, or `useExpenses` returns `isError === true` on the cuadre-del-dia page, the system SHALL NOT pass `showHomeLink` to `<ErrorState>`.

## R7

WHEN the `DashboardHero` component has at least one of its queries (`useBankAccounts`, `useIncomes`, `useExpenses`, `useReceivables`, `usePayables`) return `isError === true`, the system SHALL render an `<ErrorState>` component in place of the card's normal content (`CardContent`), with `description` set to `mapError` applied to the first truthy error value and `onRetry` calling `refetch` on all five hooks.

## R8

WHEN `DashboardHero` renders `<ErrorState>`, the system SHALL wrap it inside the same outer `<Card>` element that would otherwise contain the loading skeleton or the data content, preserving the card's visual container.

## R9

WHEN the `SectionCards` component has at least one of its queries (`useInvoices`, `useIncomes`, `useExpenses`, `useReceivables`, `usePayables`) return `isError === true`, the system SHALL render a single `<ErrorState>` component in place of the four KPI cards, with `description` from `mapError` of the first truthy error and `onRetry` calling `refetch` on all five hooks.

## R10

WHEN the `ChartAreaInteractive` component has at least one of its queries (`useInvoices`, `useIncomes`, `useExpenses`) return `isError === true`, the system SHALL render an `<ErrorState>` component inside the `<Card>` container in place of the chart content, with `description` from `mapError` of the first truthy error and `onRetry` calling `refetch` on all three hooks.

## R11

WHEN the `BusinessWidgets` component has at least one of its queries (`useBranches`, `useClients`, `useInvoices`, `useIncomes`, `useExpenses`, `useReceivables`, `usePayables`, `useOperatingCostAlerts`) return `isError === true`, the system SHALL render a single `<ErrorState>` component in place of the full widgets grid, with `description` from `mapError` of the first truthy error and `onRetry` calling `refetch` on all eight hooks.

## R12

WHEN any dashboard widget (`DashboardHero`, `SectionCards`, `ChartAreaInteractive`, `BusinessWidgets`) renders `<ErrorState>`, the system SHALL NOT pass `showHomeLink` to `<ErrorState>`.

## R13

WHILE a page or widget is in a loading state (`isLoading === true`), the system SHALL continue to render the existing loading skeleton or loading indicator unchanged, and SHALL NOT render `<ErrorState>`.

## R14

IF React Query retries a failed query (up to the default 3 attempts), the system SHALL NOT render `<ErrorState>` until `isError` transitions to `true` (i.e., the default React Query retry behavior is preserved without modification).

## R15

WHEN any hook's `refetch` function is called via an `<ErrorState>` `onRetry` handler, the system SHALL trigger a new network request for that query without changing the hook's signature or adding new hook parameters.
