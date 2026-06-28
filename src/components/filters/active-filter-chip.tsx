"use client";

import * as React from "react";
import { X } from "lucide-react";

type ActiveFilterChipProps = {
  label: string;
  onRemove: () => void;
};

/**
 * Removable pill describing one active filter. Clicking it clears that filter.
 * Promoted verbatim from the in-file ActiveFilterChip that lived in
 * `bank-accounts/page.tsx` so adoption there is a no-regression swap
 * (table-filters R2, R33, R37).
 */
export function ActiveFilterChip({
  label,
  onRemove,
}: ActiveFilterChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
      aria-label={`Quitar filtro ${label}`}
    >
      <span>{label}</span>
      <X className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}
