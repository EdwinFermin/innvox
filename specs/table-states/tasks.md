# Tasks — table-states

Tasks are ordered to minimize risk: build the shared component first, migrate the reference page, retrofit the six simpler pages, then tackle bank-accounts (highest structural risk) last.

---

## T1 — Create `<TableStateBody>` component ✅ DONE

**File:** `src/components/ui/table-state-body.tsx` (new file)

Implement the component exactly as specified in `design.md`:
- Props: `isLoading`, `isEmpty`, `colSpan`, `loadingRows`, `empty`, `children`
- Three render branches: loading → `<TableSkeleton>`, isEmpty → colSpan `<TableRow>/<TableCell>`, else → `children`
- Imports: `TableRow`, `TableCell` from `@/components/ui/table`; `TableSkeleton` from `@/components/ui/table-skeleton`
- No default export; named export only

**Covers:** R1, R2, R3, R4, R5

**Verification:** Render the component in isolation with each of the three prop combinations and confirm only the correct branch renders. `npm run typecheck` passes.

---

## T2 — Migrate payables onto `<TableStateBody>` ✅ DONE

**File:** `src/app/dashboard/payables/page.tsx`

- Replace the `isLoading ? <TableSkeleton …> : …` conditional in `<TableBody>` with `<TableStateBody>`, passing the existing dual-empty node as the `empty` prop.
- Preserve `payables.length === 0` as the discrimination for no-data vs no-results (R15).
- `loadingRows={table.getState().pagination.pageSize}`, `colSpan={table.getVisibleLeafColumns().length}` (already used in the pre-migration loading branch).
- The outer error guard (`{isError ? <ErrorState …> : <frame>}` at lines 377–382) is already correct — do not change it.
- No visual regression: icons, copy, and action buttons are unchanged.

**Covers:** R1, R2, R3, R8, R14, R15

**Verification:** Manual — open payables page, confirm: (a) skeleton renders on first load; (b) `Inbox` empty state appears on empty data; (c) `SearchX` empty state appears when search returns no rows; (d) `ErrorState` with retry appears on forced network failure. `npm run typecheck` passes.

---

## T3 — Retrofit receivables page ✅ DONE

**File:** `src/app/dashboard/receivables/page.tsx`

- Destructure `isError`, `error`, `refetch` from `useReceivables` (they are present via the `useQuery` spread — only `isLoading` is currently destructured at line 263).
- Add outer error guard: `{isError ? <ErrorState title="Algo salió mal" description={mapError(error)} onRetry={refetch} /> : <frame>}`.
- Replace the `SpinnerLabel` colSpan row (lines 420–427) with `<TableStateBody>`.
- Replace plain-text empty cell (lines 444–453) with dual `<EmptyState>`:
  - No-data (`receivables.length === 0`): `Inbox`, "Sin cuentas por cobrar", "Registra la primera para verla aquí.", action opens `NewReceivableDialog`.
  - No-results: `SearchX`, "Sin resultados", "Ajusta o limpia el filtro.", action calls `setSearchQuery("")`.
- Add imports: `EmptyState`, `ErrorState`, `TableStateBody`, `mapError`, `Inbox`, `SearchX`.
- Remove `SpinnerLabel` import if no longer used.

**Covers:** R6, R7, R8, R10, R11, R12

**Verification:** Manual — confirm skeleton, error+retry, no-data empty, no-results empty on receivables page.

---

## T4 — Retrofit branches page ✅ DONE

**File:** `src/app/dashboard/branches/page.tsx`

- Destructure `isError`, `error`, `refetch` from `useBranches` (currently only `data`, `isLoading` at line 220).
- Add outer error guard with `<ErrorState>`.
- Replace `SpinnerLabel` colSpan row (lines 359–366) with `<TableStateBody>`.
- Replace plain-text empty (lines 383–392) with dual `<EmptyState>`:
  - No-data (`branches.length === 0`): `Inbox`, "Sin sucursales", "Registra la primera para verla aquí.", action opens `NewBranchDialog`.
  - No-results (column filter on `name` is non-empty): `SearchX`, "Sin resultados", "Ajusta o limpia el filtro.", action calls `table.getColumn("name")?.setFilterValue("")`.
- Add imports; remove `SpinnerLabel` import if unused.

**Covers:** R6, R7, R8, R10, R11, R12

**Verification:** Manual — skeleton, error+retry, no-data empty, no-results empty on branches page.

---

## T5 — Retrofit clients page ✅ DONE

**File:** `src/app/dashboard/clients/page.tsx`

- Destructure `isError`, `error`, `refetch` from `useClients` (currently only `data`, `isLoading` at line 170).
- Add outer error guard with `<ErrorState>`.
- Replace `SpinnerLabel` colSpan row (lines 287–294) with `<TableStateBody>`.
- Replace plain-text empty (lines 311–319) with dual `<EmptyState>`:
  - No-data: `Inbox`, "Sin clientes", "Registra el primero para verlo aquí.", action is `<NewClientDialog />` guarded by `can(user?.type, PERMISSIONS.clientsCreate)`.
  - No-results: `SearchX`, "Sin resultados", "Ajusta o limpia el filtro.", action calls `table.getColumn("name")?.setFilterValue("")`.
- Add imports; remove `SpinnerLabel` import if unused.

**Covers:** R6, R7, R8, R10, R11, R12

**Verification:** Manual — skeleton, error+retry, no-data empty (with and without create permission), no-results empty on clients page.

---

## T6 — Retrofit invoices page ✅ DONE

**File:** `src/app/dashboard/invoices/page.tsx`

- Destructure `isError`, `error`, `refetch` from `useInvoices` (currently only `data`, `isLoading` at line 88).
- Add outer error guard with `<ErrorState>`.
- Replace `SpinnerLabel` colSpan row (lines 421–428) with `<TableStateBody>`.
- Replace plain-text empty (lines 445–454) with dual `<EmptyState>`:
  - No-data (`invoices.length === 0` — use the unfiltered `invoices` from the hook, not `filteredInvoices`): `Inbox`, "Sin facturas", "Registra la primera para verla aquí.", action opens `NewInvoiceDialog`.
  - No-results: `SearchX`, "Sin resultados", "Ajusta o limpia el filtro.", action calls `table.getColumn("id")?.setFilterValue("")`.
- Add imports; remove `SpinnerLabel` import if unused.

**Covers:** R6, R7, R8, R10, R11, R12

**Verification:** Manual — skeleton, error+retry, no-data empty, no-results empty on invoices page.

---

## T7 — Retrofit incomes page ✅ DONE

**File:** `src/app/dashboard/transactions/incomes/page.tsx`

- Destructure `isError`, `error`, `refetch` from `useIncomes` (currently only `data`, `isLoading` at line 307).
- Add outer error guard with `<ErrorState>`.
- Replace `SpinnerLabel` colSpan row (lines 651–658) with `<TableStateBody>`.
- Replace plain-text empty (lines 675–683) with dual `<EmptyState>`:
  - No-data (`incomes.length === 0`): `Inbox`, "Sin ingresos", "Registra el primero para verlo aquí.", action opens `NewIncomeDialog`.
  - No-results: `SearchX`, "Sin resultados", "Ajusta o limpia el filtro.", action calls `setSearchTerm("")`.
- Add imports; remove `SpinnerLabel` import if unused.

**Covers:** R6, R7, R8, R10, R11, R12

**Verification:** Manual — skeleton, error+retry, no-data empty, no-results empty on incomes page.

---

## T8 — Retrofit expenses page ✅ DONE

**File:** `src/app/dashboard/transactions/expenses/page.tsx`

- Destructure `isError`, `error`, `refetch` from `useExpenses` (currently only `data`, `isLoading` at line 299).
- Add outer error guard with `<ErrorState>`.
- Replace `SpinnerLabel` colSpan row (lines 640–647) with `<TableStateBody>`.
- Replace plain-text empty (lines 664–673) with dual `<EmptyState>`:
  - No-data (`expenses.length === 0`): `Inbox`, "Sin gastos", "Registra el primero para verlo aquí.", action opens `NewExpenseDialog`.
  - No-results: `SearchX`, "Sin resultados", "Ajusta o limpia el filtro.", action calls `setSearchTerm("")`.
- Add imports; remove `SpinnerLabel` import if unused.

**Covers:** R6, R7, R8, R10, R11, R12

**Verification:** Manual — skeleton, error+retry, no-data empty, no-results empty on expenses page.

---

## T9 — Align bank-accounts (constrained) ✅ DONE

**File:** `src/app/dashboard/bank-accounts/page.tsx`

This task has the highest structural risk. Complete T1–T8 first.

Steps:
1. **Replace `AccountsEmptyState`** (lines 204–234) with shared `<EmptyState>`:
   - `icon={Landmark}`
   - When `hasFilters` is true: title "No hay cuentas con esos filtros", description "Prueba ajustando la busqueda, sucursal o estado para ver mas resultados.", action `<Button variant="outline" onClick={onReset}>Limpiar filtros</Button>`.
   - When `hasFilters` is false: title "Todavia no hay cuentas financieras", description "Crea una cuenta bancaria o caja para empezar a gestionar balances, transferencias y cobertura por sucursal.", action `<NewBankAccountDialog />`.
   - The `AccountsEmptyState` component definition can be removed; its call site at line 909 is replaced.

2. **Replace inline error alert** (lines 896–907) with `<ErrorState title="Algo salió mal" description={mapError(error)} onRetry={refetch} />`.

3. **Desktop table body**: Apply `<TableStateBody>` to the desktop `<TableBody>` (line 1063). Because the bank-accounts page uses an early-return loading (`if (isLoading) return <AccountsPageSkeleton />` at line 713) and the empty/error checks occur at the Card level above the table, the desktop table body only ever renders when data is available and non-empty. Pass `isLoading={false}` `isEmpty={false}` to `<TableStateBody>` at this location so the existing row map flows through as `children` — this satisfies R18 structurally without changing behavior.

4. **Do NOT change:** `AccountsPageSkeleton`, the `if (isLoading)` early return, the `isMobile` branch logic, the mobile card-grid rendering, or the `hasActiveFilters` / `hasFilters` discrimination logic.

5. Add imports: `EmptyState`, `ErrorState`, `TableStateBody`, `mapError`. `Landmark` is already imported.

**Covers:** R16, R17, R18, R19, R20, R21

**Verification:** Manual — on bank-accounts page confirm:
- Mobile layout unchanged (card grid still renders).
- Desktop table rows still render correctly.
- `AccountsEmptyState` with no-filters and with-filters shows correct copy and actions.
- Error state shows `<ErrorState>` with "Reintentar" button that calls `refetch`.
- No TypeScript or lint errors.

---

## T10 — Build verification ✅ DONE

Run the full build chain and confirm all pass:

```
npm run lint
npm run typecheck
npm run build
```

Fix any type or lint errors introduced in T1–T9 before marking this task done.

**Covers:** R22, R23, R24

**Verification:** All three commands exit with code 0.

---

## Traceability table

| Requirement | Task(s) | Verification |
|---|---|---|
| R1 — TableStateBody renders skeleton when isLoading | T1 | Render `isLoading=true`: only skeleton rows visible |
| R2 — TableStateBody renders empty row when isEmpty | T1 | Render `isEmpty=true`: colSpan row with empty node |
| R3 — TableStateBody renders children otherwise | T1 | Render both false: only children visible |
| R4 — TableStateBody prop contract | T1 | TypeScript compile (`npm run typecheck`) |
| R5 — Lives inside TableBody, no own TableBody | T1, T2–T9 | Inspect rendered DOM: no nested `<tbody>` |
| R6 — ErrorState on all 8 pages | T2, T3, T4, T5, T6, T7, T8, T9 | Force network error; ErrorState appears |
| R7 — Retry calls refetch | T2, T3, T4, T5, T6, T7, T8, T9 | Click retry; observe refetch invocation |
| R8 — Skeleton with correct rows/columns | T2, T3, T4, T5, T6, T7, T8, T9 | Count skeleton rows = pageSize; columns = visible leaf count |
| R9 — Skeleton removed after load | T2, T3, T4, T5, T6, T7, T8, T9 | After data loads, no skeleton in DOM |
| R10 — No-data EmptyState (Inbox) | T2, T3, T4, T5, T6, T7, T8, T9 | Empty DB + no filter: Inbox empty state renders |
| R11 — No-data action opens create dialog | T2, T3, T4, T5, T6, T7, T8, T9 | Click action button; create dialog opens |
| R12 — No-results EmptyState (SearchX) | T2, T3, T4, T5, T6, T7, T8, T9 | Non-empty DB + search with no matches: SearchX renders |
| R13 — No search → no no-results variant | N/A (all eight pages have search) | N/A |
| R14 — Payables no visual regression | T2 | Side-by-side comparison of loading/empty/error states |
| R15 — Payables discrimination logic preserved | T2 | `payables.length === 0` check intact in migrated code |
| R16 — bank-accounts AccountsEmptyState replaced | T9 | `AccountsEmptyState` component removed; `EmptyState` with Landmark renders |
| R17 — bank-accounts error replaced | T9 | Error condition: `<ErrorState>` renders (not red div) |
| R18 — bank-accounts desktop TableBody uses TableStateBody | T9 | Desktop table body wrapped in `<TableStateBody>` |
| R19 — Mobile card grid unchanged | T9 | Mobile viewport: card grid still renders |
| R20 — Mobile/desktop split preserved | T9 | `isMobile` branch logic unchanged |
| R21 — Filter-aware empty preserved | T9 | With and without filters: correct copy and actions |
| R22 — lint passes | T10 | `npm run lint` exits 0 |
| R23 — typecheck passes | T10 | `npm run typecheck` exits 0 |
| R24 — build passes | T10 | `npm run build` exits 0 |
