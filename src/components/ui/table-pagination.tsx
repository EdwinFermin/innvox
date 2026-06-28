"use client";

import * as React from "react";
import type { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { TablePageSize } from "@/components/ui/table-page-size";

type TablePaginationProps<TData> = {
  table: Table<TData>;
  totalFiltered: number;
  visibilityControl?: React.ReactNode;
  pageSizeOptions?: number[];
  rowCountNode?: React.ReactNode;
};

/**
 * Footer row shared by every list table: optional leading visibility-control
 * slot, the page-size selector, a row-count label, and the Anterior/Siguiente
 * pager. Extracted verbatim from the inline footer that lived in all 8 pages.
 *
 * `rowCountNode` overrides the default "{totalFiltered} filas" label so pages
 * with a bespoke label (branches' selection count, bank-accounts' page info)
 * keep their exact text while still reusing this footer's structure.
 */
export function TablePagination<TData>({
  table,
  totalFiltered,
  visibilityControl,
  pageSizeOptions,
  rowCountNode,
}: TablePaginationProps<TData>) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-end lg:gap-2">
      {visibilityControl}
      <TablePageSize table={table} options={pageSizeOptions} />
      {rowCountNode ?? (
        <div className="text-muted-foreground flex-1 text-sm">
          {totalFiltered} filas
        </div>
      )}
      <div className="space-x-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
