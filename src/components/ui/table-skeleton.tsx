import type { JSX } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  rows: number;
  columns: number;
}

/**
 * Renders `rows` body `<TableRow>` elements, each with `columns` `<TableCell>`
 * cells holding a single `<Skeleton>`. Body rows only — the caller's
 * `<TableHeader>` stays visible. Index keys are stable for this static
 * loading placeholder (the list never reorders).
 */
export function TableSkeleton({ rows, columns }: TableSkeletonProps): JSX.Element {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <TableCell key={columnIndex}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
