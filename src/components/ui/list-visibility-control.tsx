"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type VisibilityScope = "all" | "mine";

type ListVisibilityControlProps = {
  role?: "ADMIN" | "USER";
  value: VisibilityScope;
  onChange: (value: VisibilityScope) => void;
};

export function ListVisibilityControl({
  role,
  value,
  onChange,
}: ListVisibilityControlProps) {
  const isAdmin = role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Vista</span>
        <span className="text-sm">Creados por mi</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Vista</span>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as VisibilityScope)}
      >
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="mine">Creados por mi</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
