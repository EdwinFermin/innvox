import type { JSX } from "react";

import { TableCell, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";

interface TableStateBodyProps {
  /** When true, render the loading skeleton instead of empty/children. */
  isLoading: boolean;
  /** When true (and not loading), render the `empty` node in a colSpan row. */
  isEmpty: boolean;
  /** Column span for the empty row and skeleton column count. */
  colSpan: number;
  /** Number of skeleton rows to render while loading. */
  loadingRows: number;
  /** A fully configured `<EmptyState>` instance shown when `isEmpty`. */
  empty: React.ReactNode;
  /** The mapped data rows shown when neither loading nor empty. */
  children: React.ReactNode;
}

/**
 * Body-layer state helper that lives inside the caller's `<TableBody>`. It owns
 * exactly three branches — loading skeleton, colSpan empty row, and passthrough
 * children — so each page keeps its own header, toolbar, and row markup intact.
 *
 * It renders body rows only and never its own `<TableBody>`: the caller is
 * responsible for the surrounding `<TableBody>` element.
 */
export function TableStateBody({
  isLoading,
  isEmpty,
  colSpan,
  loadingRows,
  empty,
  children,
}: TableStateBodyProps): JSX.Element {
  if (isLoading) {
    return <TableSkeleton rows={loadingRows} columns={colSpan} />;
  }

  if (isEmpty) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan}>{empty}</TableCell>
      </TableRow>
    );
  }

  return <>{children}</>;
}
