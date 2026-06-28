"use client";

import type { Table } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type TableColumnToggleProps<TData> = {
  table: Table<TData>;
  columnLabels: Record<string, string>;
  // Override the outer wrapper sizing. The grid pages rely on the default
  // `w-full sm:w-auto` (the toggle fills the `auto` grid column); bank-accounts
  // passes `w-auto` so the toggle sizes to content inside its flex-wrap header
  // instead of breaking to a full-width block on mobile.
  className?: string;
};

/**
 * Column-visibility dropdown shared by every list table. Extracted verbatim
 * from the inline "Columnas" dropdown that lived in all 8 pages so the rendered
 * markup is byte-for-byte identical. Column order, label resolution, and the
 * toggle callback mirror the original inline implementation exactly.
 */
export function TableColumnToggle<TData>({
  table,
  columnLabels,
  className,
}: TableColumnToggleProps<TData>) {
  return (
    <div className={cn("w-full sm:w-auto", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-11 w-full rounded-2xl border-border/70 bg-background/80">
            Columnas <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => {
              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {columnLabels[column.id] ?? column.id}
                </DropdownMenuCheckboxItem>
              );
            })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
