# Requirements — loading-skeletons

> EARS notation. Every requirement is numbered and objectively verifiable. Each must be covered by at least one test.

## R1

WHEN `TableSkeleton` is rendered with props `rows={n}` and `columns={m}`, the system SHALL render exactly `n` `<TableRow>` elements each containing exactly `m` `<TableCell>` elements, for a total of `n × m` skeleton cells.

## R2

WHEN `TableSkeleton` is rendered, each `<TableCell>` SHALL contain exactly one `<Skeleton>` element that carries the `data-slot="skeleton"` attribute and the `animate-pulse` CSS class, matching the base Skeleton primitive.

## R3

WHILE `isLoading` is `true` on the payables page, the system SHALL render `<TableSkeleton>` inside `<TableBody>` in place of the `SpinnerLabel` block, with `rows` equal to `table.getState().pagination.pageSize` and `columns` equal to `table.getVisibleLeafColumns().length`.

## R4

WHILE `isLoading` is `true` on the cuadre-del-dia page, the system SHALL render `<TableSkeleton>` inside `<TableBody>` in place of the "Cargando movimientos..." text, with `rows={8}` (fixed fallback, as cuadre has no pagination control) and `columns={5}` (matching the five hardcoded `<TableHead>` columns: Hora, Tipo, Descripción, Cuenta / origen, Monto).

## R5

WHEN `TableSkeleton` is rendered on either page, the existing `<TableHeader>` (column headers) SHALL remain visible and structurally unchanged — `TableSkeleton` renders body rows only and does not wrap or replace the header.

## R6

WHEN a user's system preference is `prefers-reduced-motion: reduce`, the skeleton cells SHALL not animate, because the `animate-pulse` class is already conditioned on this preference by Tailwind's `motion-safe` variant used in the project's base Skeleton primitive.

## R7

WHEN `TableSkeleton` is imported, it SHALL be importable from `src/components/ui/table-skeleton.tsx` as a named export `TableSkeleton` with the TypeScript signature `TableSkeleton({ rows, columns }: { rows: number; columns: number }): JSX.Element`.

## R8

WHEN `TableSkeleton` is rendered, the system SHALL introduce no new npm dependencies — it SHALL use only the existing `Skeleton`, `TableRow`, and `TableCell` primitives from the project's UI library.
