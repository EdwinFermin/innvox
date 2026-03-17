"use client";

import type { Table } from "@tanstack/react-table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TablePageSizeProps<TData> = {
  table: Table<TData>;
  options?: number[];
};

export function TablePageSize<TData>({
  table,
  options = [10, 15, 30, 50],
}: TablePageSizeProps<TData>) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Mostrar</span>
      <Select
        value={String(table.getState().pagination.pageSize)}
        onValueChange={(value) => table.setPageSize(Number(value))}
      >
        <SelectTrigger className="h-8 w-[84px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
