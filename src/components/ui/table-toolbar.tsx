"use client";

import * as React from "react";
import type { Table } from "@tanstack/react-table";

import { Input } from "@/components/ui/input";
import { TableColumnToggle } from "@/components/ui/table-column-toggle";

type TableToolbarProps<TData> = {
  table: Table<TData>;
  columnLabels: Record<string, string>;
  // Passed from the page's useIsMobile() instead of re-deriving here, so the
  // toolbar adds no hook that could cause a hydration mismatch.
  isMobile: boolean;
  searchValue: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  // Composition seam for the future `table-filters` feature; empty today.
  filters?: React.ReactNode;
};

/**
 * Grid toolbar shared by the 7 grid list pages: a controlled search input and
 * the column-visibility dropdown. Extracted verbatim from the inline toolbar
 * grid that lived in each page so the rendered markup is byte-for-byte
 * identical. Search is fully controlled by the caller (state-driven on some
 * pages, column-filter-driven on others).
 */
export function TableToolbar<TData>({
  table,
  columnLabels,
  isMobile,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filters,
}: TableToolbarProps<TData>) {
  return (
    <div
      className={`dashboard-panel grid w-full gap-4 p-4 ${isMobile ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_auto]"}`}
    >
      <Input
        aria-label={searchAriaLabel}
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={onSearchChange}
        className="h-11 rounded-2xl border-border/70 bg-background/80"
      />

      <TableColumnToggle table={table} columnLabels={columnLabels} />
      {filters}
    </div>
  );
}
