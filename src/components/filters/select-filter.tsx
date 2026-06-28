"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SelectFilterOption = {
  value: string; // never "all"
  label: string;
};

type SelectFilterProps = {
  value: string; // "all" or one of the option values
  onValueChange: (value: string) => void;
  options: SelectFilterOption[];
  allLabel: string; // label for the implicit "all" option
  ariaLabel?: string;
  className?: string;
};

/**
 * Labeled `Select` wrapper with an implicit, always-first "all" option that
 * means "no filter". Wraps the design-system `Select` primitive; the default
 * trigger class matches the existing filter selects so adoption is visually
 * neutral (table-filters R3, R4).
 */
export function SelectFilter({
  value,
  onValueChange,
  options,
  allLabel,
  ariaLabel,
  className,
}: SelectFilterProps): React.JSX.Element {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "h-11 w-full rounded-2xl border-border/70 bg-muted data-[size=default]:h-11",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
